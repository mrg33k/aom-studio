// RoomStore.swift — Corner native iOS
// corner:native-ios Stage 1
//
// The rooms rail's data: agents (roster doctrine, local), plus projects and missions
// from the live APIs.
//
// A NOTE ON THE TWO SOURCES. `missions-tree` is the richer endpoint — it returns the
// Project > Mission tree in one call — but it is fed by a registry snapshot, and a
// real working room can be absent from that registry entirely (proven 2026-07-27:
// the carousels room was live, with messages, and missing from the registry). So
// `projects` is fetched too and any project the tree did not mention is added from
// it. A room the registry forgot is still a room the user can walk into.
//
// Failure is visible, not silent: if the tree call fails the agents still render and
// the rail says the project list could not load, rather than quietly showing an
// agents-only app and letting the user conclude their projects are gone.

import Combine
import Foundation

@MainActor
final class RoomStore: ObservableObject {

    struct ProjectGroup: Identifiable, Hashable {
        let room: Room
        let missions: [Room]
        var id: String { room.roomID }
    }

    /// One room on the home timeline (room-row contract §2). `ts` is the room's newest
    /// message time in ms since epoch (0 = no known recent activity); `preview` is the
    /// hygiene-cleaned last human line (empty collapses — never a placeholder).
    struct RecentRoom: Identifiable, Hashable {
        let room: Room
        let ts: Double
        let preview: String
        /// Visible author of the preview. Empty only when the hygiene gate removed the
        /// preview too; a line with words never appears to have spoken itself.
        var author: String = ""
        /// The SERVER's unread count for this room, when it sends one. nil means the
        /// backend has no read-state yet and the row falls back to the device-local dot.
        /// nil and 0 are different answers: "nobody knows" and "nothing new".
        var unreadCount: Int?
        /// Server-authored unread state even when the count was outside its bounded
        /// scan. Lets the app badge remain an honest lower bound instead of clearing.
        var hasUnread: Bool?
        var id: String { room.roomID }
        var hasActivity: Bool { ts > 0 }
    }

    @Published private(set) var agents: [Room] = []
    @Published private(set) var projects: [ProjectGroup] = []
    /// The home timeline: rooms with real activity, strict-descending by newest ts.
    @Published private(set) var recent: [RecentRoom] = []
    @Published private(set) var isLoading = false
    /// Non-nil when the project/mission half of the rail could not be fetched.
    @Published private(set) var railError: String?
    @Published private(set) var hasLoadedOnce = false

    private let api = CornerAPI.shared
    private var loadTask: Task<Void, Never>?

    func refresh() {
        loadTask?.cancel()
        loadTask = Task { await load() }
    }

    /// Convex-backed room loader (BRIEF 04). Replaces Supabase REST when `useConvex` is true.
    /// Response format matches what the web uses. Brief example:
    /// `ConvexService.shared.query("rooms:listRooms", args: ["worldId": worldId])`
    func loadRooms() async throws -> [Room] {
        guard let world = api.world else { return [] }
        let convexRooms: [ConvexRoom] = try await ConvexService.shared.query("rooms:listRooms", args: convexListArgs(world: world))
        // Same resolver as the rail and the timeline — see `room(from:world:)`.
        return convexRooms.compactMap { Self.room(from: $0, world: world) }
    }

    func load() async {
        guard let world = api.world else {
            agents = []
            projects = []
            recent = []
            PushService.shared.reconcileUnread([])
            railError = nil
            hasLoadedOnce = true
            return
        }

        // Tenant-scoped roster (mirrors web 750feda9): aom keeps the hardcoded
        // AgentRoster; every other world populates from the live agent_status
        // endpoint so Apple's demo reviewer sees only their own agents.
        if world == "aom" {
            AgentRoster.configure(world: world, liveAgents: nil)
        } else {
            let liveAgents = try? await api.roomAgents().agents
            AgentRoster.configure(world: world, liveAgents: liveAgents)
        }
        agents = AgentRoster.rooms(world: world)
        isLoading = true
        defer { isLoading = false; hasLoadedOnce = true }

        // Convex path (BRIEF 04): when enabled, Convex is the ONLY source for the
        // rail. Falling through to the Supabase rail on a Convex miss renders
        // hours-old rooms that look perfectly healthy — a dead backend must show
        // as a failure, and an empty world must show as empty.
        // In unit tests the Convex endpoint is not mocked — skip to keep tests fast and deterministic.
        if Config.useConvex && !Config.suppressLiveBackendsForTests {
            do {
                let convexRooms: [ConvexRoom] = try await ConvexService.shared.query("rooms:listRooms", args: convexListArgs(world: world))
                let groups = convexRoomsToProjectGroups(convexRooms, world: world)
                projects = groups
                // buildRecent(activity:) is the Supabase feed's shape and returns []
                // when activity is nil — the timeline must come from the rows' own
                // lastMessage instead, or the home screen renders "No rooms yet"
                // over 600 healthy rooms.
                recent = convexRecent(convexRooms)
                PushService.shared.reconcileUnread(recent)
                AppRouter.shared.recencyOrder = recent.map(\.room)
                railError = nil
            } catch {
                // Keep whatever is already on screen; only an empty rail shows the error.
                if projects.isEmpty {
                    railError = "Rooms could not be loaded. Pull to try again."
                }
            }
            return
        }

        async let treeResult = fetchTree()
        async let listResult = fetchProjectList()
        async let activityResult = fetchActivity()
        let (tree, list, activity) = await (treeResult, listResult, activityResult)

        // Both halves failed: say so. One half failing still produces a usable rail.
        if tree == nil && list == nil {
            railError = "Projects could not be loaded. Pull to try again."
            return
        }
        railError = nil

        var groups: [ProjectGroup] = []
        var seen = Set<String>()

        for node in tree ?? [] {
            guard let slug = node.slug?.trimmingCharacters(in: .whitespaces), !slug.isEmpty else { continue }
            seen.insert(slug)
            let projectRoom = Room(
                world: world,
                kind: .project(slug: slug),
                title: node.name?.isEmpty == false ? node.name! : Room.prettify(slug),
                subtitle: "Project"
            )
            let missionRooms: [Room] = (node.missions ?? []).compactMap { mission in
                guard let raw = mission.slug?.trimmingCharacters(in: .whitespaces), !raw.isEmpty else { return nil }
                // The registry may hand back a bare mission slug or an already-canonical
                // "<project>:<mission>". Sending the bare form drops the mission into the
                // server's first-wins slug lottery, so canonicalize before it can.
                let canonical = raw.contains(":") ? raw : "\(slug):\(raw)"
                let leaf = canonical.split(separator: ":").last.map(String.init) ?? canonical
                return Room(
                    world: world,
                    kind: .mission(slug: canonical, project: slug),
                    title: mission.name?.isEmpty == false ? mission.name! : Room.prettify(leaf),
                    subtitle: projectRoom.title
                )
            }
            groups.append(ProjectGroup(room: projectRoom, missions: missionRooms))
        }

        // Projects the registry never heard of. They have no missions here — but the
        // project room itself is real and reachable, which is the point.
        for row in list ?? [] {
            guard let slug = row.slug?.trimmingCharacters(in: .whitespaces),
                  !slug.isEmpty, !seen.contains(slug) else { continue }
            seen.insert(slug)
            groups.append(ProjectGroup(
                room: Room(
                    world: world,
                    kind: .project(slug: slug),
                    title: row.name?.isEmpty == false ? row.name! : Room.prettify(slug),
                    subtitle: "Project"
                ),
                missions: []
            ))
        }

        groups.sort { $0.room.title.localizedCaseInsensitiveCompare($1.room.title) == .orderedAscending }
        projects = groups
        recent = buildRecent(groups: groups, activity: activity)
        PushService.shared.reconcileUnread(recent)
        // The chat swipe carousel navigates this exact order; the router holds it so
        // ChatView never needs its own copy of the rail.
        AppRouter.shared.recencyOrder = recent.map(\.room)
    }

    /// The home timeline (contract §2): strict recency, descending, no other key.
    ///
    /// Recency + preview come from `/api/dashboard/room-activity` — the same wide window
    /// the web home reads. Only rooms that actually appear in that feed are on the
    /// timeline; a dormant room is absent, which is the correct ranking rather than a lie
    /// about it. R9: agent 1:1 threads are now included via the `agents` bucket.
    private func buildRecent(groups: [ProjectGroup], activity: CornerAPI.RoomActivity?) -> [RecentRoom] {
        guard let activity else { return [] }
        var rows: [RecentRoom] = []
        var order = 0

        func consider(_ room: Room) {
            guard let ref = room.activityKey else { return }
            let entry: CornerAPI.RoomActivity.Entry?
            switch ref.bucket {
            case .project: entry = activity.projects?[ref.key]
            case .mission: entry = activity.missions?[ref.key]
            case .agent:   entry = activity.agents?[ref.key]
            }
            guard let entry, let ts = RoomStore.epochMillis(entry.last_message_at), ts > 0 else { return }
            rows.append(RecentRoom(room: room, ts: ts, preview: RoomPreview.clean(entry.last_message_text ?? "")))
            order += 1
        }

        for group in groups {
            consider(group.room)
            for mission in group.missions { consider(mission) }
        }
        // Agent 1:1 rooms — walk the roster; only agents with real activity in the feed
        // (keyed by slug in activity.agents) land on the timeline.
        for agentRoom in agents { consider(agentRoom) }

        // Strict recency, descending. Ties (same ms) fall back to discovery order so the
        // sort is deterministic — that is a tie-break, not a competing sort key.
        return rows.enumerated()
            .sorted { l, r in l.element.ts != r.element.ts ? l.element.ts > r.element.ts : l.offset < r.offset }
            .map(\.element)
            .prefix(30)
            .map { $0 }
    }

    /// ISO-8601 (with or without fractional seconds) → ms since epoch, or nil.
    private static let isoFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f
    }()
    private static let isoPlain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime]; return f
    }()
    static func epochMillis(_ raw: String?) -> Double? {
        guard let raw, !raw.isEmpty else { return nil }
        if let d = isoFrac.date(from: raw) ?? isoPlain.date(from: raw) {
            return d.timeIntervalSince1970 * 1000
        }
        // Postgres sometimes hands back a space instead of the "T", and no zone. Coerce.
        let coerced = raw.replacingOccurrences(of: " ", with: "T")
        if let d = isoFrac.date(from: coerced) ?? isoPlain.date(from: coerced) {
            return d.timeIntervalSince1970 * 1000
        }
        return nil
    }

    private func fetchTree() async -> [CornerAPI.ProjectNode]? {
        do { return try await api.fetchMissionsTree() } catch { return nil }
    }

    private func fetchProjectList() async -> [CornerAPI.ProjectRow]? {
        do { return try await api.fetchProjects() } catch { return nil }
    }

    private func fetchActivity() async -> CornerAPI.RoomActivity? {
        do { return try await api.fetchRoomActivity() } catch { return nil }
    }

    /// Every room the rail knows, flattened — what the search field filters.
    var allRooms: [Room] {
        agents + projects.flatMap { [$0.room] + $0.missions }
    }

    // MARK: - Convex helpers (BRIEF 04)

    private func convexListArgs(world: String) -> [String: Any] {
        var args: [String: Any] = ["worldId": world]
        // Email is how the users table is indexed; the Convex id is the fallback.
        if let email = api.session?.user.email, !email.isEmpty {
            args["userId"] = email
        } else if let id = api.session?.user.id, !id.isEmpty {
            args["userId"] = id
        }
        return args
    }

    /// Raw room shape as Convex may return it (matches web response).
    struct ConvexRoom: Decodable {
        let _id: String?           // Convex document ID (primary key)
        /// Canonical room key ("aom:project:wolfpack") carried by imported rooms.
        /// This is what Room.parse understands AND what messages:list keys on —
        /// without it every room fails the parse and the rail renders empty.
        let legacyRoomId: String?
        /// Newest message, straight off the room row. The home timeline is built
        /// from this — without it every room has activity 0 and the timeline
        /// (which is what the phone's home screen renders) shows "No rooms yet".
        struct LastMessage: Decodable {
            let agentSlug: String?
            let createdAt: Double?
            let text: String?
        }
        let lastMessage: LastMessage?
        /// Room creation time is the fallback for rooms whose first message has not
        /// arrived yet. Such rooms stay reachable at the bottom of the timeline.
        let createdAt: Double?
        /// Server-computed unread count, once `rooms:listRooms` returns it. Optional on
        /// purpose: absent means the backend has not shipped read-state yet, and the
        /// client falls back to its own device-local dot rather than inventing a number.
        let unreadCount: Int?
        let hasUnread: Bool?
        let roomId: String?
        let room_id: String?
        let name: String?
        let title: String?
        let type: String?
        let kind: String?
        let slug: String?
        let project: String?
        let mission: String?
        let specialist: String?
        let subtitle: String?
        let tint: String?
        let clientId: String?
        let worldId: String?

        enum CodingKeys: String, CodingKey {
            case _id, legacyRoomId, lastMessage, unreadCount, hasUnread, createdAt, roomId, name, type, kind, slug, project, mission, specialist, subtitle, tint
            case room_id = "room_id"
            case title
            case clientId = "clientId"
            case worldId = "worldId"
        }

        /// Convex returns `_id` as the document ID — prefer it over all others
        var resolvedID: String { _id ?? roomId ?? room_id ?? slug ?? name ?? "" }
        var resolvedTitle: String { title ?? name ?? Room.prettify(slug ?? resolvedID) }
    }

    // MARK: - Resolving a Convex row into a Room

    /// The room key for a Convex row, or nil when one cannot be built from its fields.
    ///
    /// `legacyRoomId` ALWAYS wins. The backend is minting canonical keys for the rows
    /// that lack one, and this reader must converge on that work rather than race it —
    /// the moment a row carries a real key, that key is the answer and nothing here
    /// gets a vote.
    ///
    /// Everything below is the fallback for a row the backend has not reached yet. The
    /// shapes mirror what the writer produces (`<world>:<kind>:<project|specialist>`),
    /// so a room resolved here and the same room after the backfill land on the SAME
    /// key — verified against the live deployment: every derived key in this shape
    /// returns the room's real thread from `messages:list`.
    nonisolated static func canonicalKey(for cr: ConvexRoom, world: String) -> String? {
        if let legacy = cr.legacyRoomId?.trimmingCharacters(in: .whitespaces), !legacy.isEmpty {
            return legacy
        }
        func clean(_ s: String?) -> String? {
            guard let t = s?.trimmingCharacters(in: .whitespaces), !t.isEmpty else { return nil }
            return t
        }
        let project = clean(cr.project)
        switch (cr.kind ?? cr.type ?? "project").lowercased() {
        case "agent":
            guard let slug = clean(cr.specialist) ?? clean(cr.slug) else { return nil }
            return "\(world):agent:\(slug)"
        case "mission":
            // A mission key is "<world>:mission:<project>:<mission>" — the canonical
            // mission slug is itself two parts, which is why Room.parse splits on only
            // the first two colons.
            if let slug = clean(cr.slug) {
                if slug.contains(":") { return "\(world):mission:\(slug)" }
                guard let project else { return nil }
                return "\(world):mission:\(project):\(slug)"
            }
            guard let project else { return nil }
            let leaf = Room.slugify(clean(cr.title) ?? clean(cr.name) ?? "")
            guard !leaf.isEmpty else { return nil }
            return "\(world):mission:\(project):\(leaf)"
        default:
            guard let slug = project ?? clean(cr.slug) else { return nil }
            return "\(world):project:\(slug)"
        }
    }

    /// One Convex row → one Room, for every reader. The rail and the timeline calling
    /// two different resolvers is how a room came to exist on one and not the other.
    ///
    /// A row that resolves no key at all still becomes a room, keyed by its bare Convex
    /// id: a regression here must degrade to a room the user can see and open, never to
    /// a room that silently does not exist.
    nonisolated static func room(from cr: ConvexRoom, world: String) -> Room? {
        let subtitle = cr.subtitle ?? ""
        if let key = canonicalKey(for: cr, world: world),
           var room = Room.parse(roomID: key, title: cr.resolvedTitle, subtitle: subtitle) {
            room.convexID = cr._id
            return room
        }
        guard let id = cr._id?.trimmingCharacters(in: .whitespaces), !id.isEmpty else { return nil }
        let kind: Room.Kind
        switch (cr.kind ?? cr.type ?? "project").lowercased() {
        case "agent":   kind = .agent(slug: id)
        case "mission": kind = .mission(slug: id, project: cr.project ?? "")
        default:        kind = .project(slug: id)
        }
        var room = Room(world: world, kind: kind, title: cr.resolvedTitle, subtitle: subtitle)
        room.convexID = id
        room.keyOverride = id
        return room
    }

    /// The home timeline, straight from Convex room rows: rooms ranked by their newest
    /// message. Machine rooms whose keys don't parse (terminal/task) stay off the
    /// timeline by construction.
    ///
    /// Deduped by room key, newest wins. Collapsing a key-less row onto an existing
    /// canonical key is the CORRECT outcome (they are the same room, one imported and
    /// one seeded) — but only if the timeline then shows it once.
    private func convexRecent(_ convexRooms: [ConvexRoom]) -> [RecentRoom] {
        guard let world = api.world else { return [] }
        var rows: [RecentRoom] = []
        var indexByID: [String: Int] = [:]
        for cr in convexRooms {
            guard let room = Self.room(from: cr, world: world) else { continue }
            let ts = cr.lastMessage?.createdAt ?? cr.createdAt ?? 0
            let preview = RoomPreview.clean(cr.lastMessage?.text ?? "")
            let author = preview.isEmpty
                ? ""
                : cr.lastMessage?.agentSlug.map { AgentRoster.title(for: $0) } ?? "Teammate"
            let entry = RecentRoom(
                room: room,
                ts: ts,
                preview: preview,
                author: author,
                unreadCount: cr.unreadCount,
                hasUnread: cr.hasUnread
            )
            if let existing = indexByID[room.roomID] {
                if ts > rows[existing].ts { rows[existing] = entry }
            } else {
                indexByID[room.roomID] = rows.count
                rows.append(entry)
            }
        }
        return rows.enumerated()
            .sorted { l, r in l.element.ts != r.element.ts ? l.element.ts > r.element.ts : l.offset < r.offset }
            .map(\.element)
    }

    private func convexRoomsToProjectGroups(_ convexRooms: [ConvexRoom], world: String) -> [ProjectGroup] {
        var groups: [ProjectGroup] = []
        var seen = Set<String>()
        for cr in convexRooms {
            // ONE resolver for the grid and the timeline. The old code parsed
            // `legacyRoomId` here and fell back to `cr.slug` — a field this deployment
            // never returns — so a room without a canonical key was dropped from both
            // surfaces at once and could never appear on the phone at all.
            guard let room = Self.room(from: cr, world: world) else { continue }
            switch room.kind {
            case .project(let slug):
                if seen.contains(slug) { continue }
                seen.insert(slug)
                groups.append(ProjectGroup(room: room, missions: []))
            case .mission(_, let project):
                // Find existing project group or create one
                if let idx = groups.firstIndex(where: { $0.room.kind == .project(slug: project) }) {
                    var missions = groups[idx].missions
                    if !missions.contains(where: { $0.roomID == room.roomID }) {
                        missions.append(room)
                        groups[idx] = ProjectGroup(room: groups[idx].room, missions: missions)
                    }
                } else {
                    let projRoom = Room(world: world, kind: .project(slug: project), title: Room.prettify(project), subtitle: "Project")
                    groups.append(ProjectGroup(room: projRoom, missions: [room]))
                    seen.insert(project)
                }
            case .agent:
                // Agent rooms are handled via AgentRoster, not ProjectGroup
                continue
            }
        }
        groups.sort { $0.room.title.localizedCaseInsensitiveCompare($1.room.title) == .orderedAscending }
        return groups
    }
}

// MARK: - Corner v2 workspace store (native Task 4)
//
// Replaces RoomStore's LIST role: the rail is the workspace tree
// (Workspace → Project → Mission), not flat rooms. RoomStore stays for the
// legacy archive behind `Route.legacyArchive` and keeps its own behavior.
// Lives in this file so the Task 4 commit stages no new production files;
// Task 5+ may move it to `Corner/Services/WorkspaceStore.swift`.

/// A thread's owning summaries, resolved from the loaded tree.
struct V2ThreadContext: Equatable {
    let thread: Thread
    let project: ProjectSummary
    let mission: MissionSummary?
}

@MainActor
final class WorkspaceStore: ObservableObject {
    /// Shared instance for views. Tests inject `CornerV2APIFake`.
    static let shared: WorkspaceStore = WorkspaceStore.makeShared()

    private static func makeShared() -> WorkspaceStore {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-v2FixtureUITest") {
            return WorkspaceStore(api: PreviewV2API())
        }
        #endif
        let store = WorkspaceStore()
        // A session the backend no longer accepts (a token minted by another
        // deployment, a revoked refresh) must land on sign-in, never on an
        // error tree behind a signed-in shell (R19 finding, 2026-09-06).
        store.onSessionRejected = { Task { await CornerAPI.shared.signOut() } }
        return store
    }

    @Published private(set) var workspace: WorkspaceSummary?
    @Published private(set) var isLoading = false
    @Published private(set) var errorText: String?
    /// Artifact counts by thread id, loaded on demand for the Files rows.
    @Published private(set) var fileCounts: [String: Int] = [:]

    private let api: any CornerV2API
    private var ensuredWorkspaceID: String?
    private var treePoll: (any Cancellable)?
    /// Called once when the backend rejects the stored session; the app signs out.
    var onSessionRejected: (() -> Void)?
    private(set) var sessionRejected = false

    init(api: (any CornerV2API)? = nil) {
        self.api = api ?? DefaultCornerV2API()
    }

    /// True for the errors that mean "this session is not accepted", as opposed
    /// to a network blip or a server fault the person can retry.
    static func isSessionRejection(_ error: Error) -> Bool {
        if error is AuthError { return true }
        if let e = error as? ConvexServiceError {
            switch e {
            case .notSignedIn: return true
            case .http(let code, _): return code == 401 || code == 403
            case .server(let message): return message.localizedCaseInsensitiveContains("not signed in")
            }
        }
        return String(describing: error).localizedCaseInsensitiveContains("not signed in")
    }

    /// The v2 API behind this store, so chat screens share the store's backend
    /// (the `-v2FixtureUITest` stub in UI tests, the live client in prod)
    /// instead of each screen constructing — and diverging from — its own.
    var v2api: any CornerV2API { api }

    var generalProject: ProjectSummary? {
        workspace?.projects.first { $0.kind == .general }
    }

    func project(id: String) -> ProjectSummary? {
        workspace?.projects.first { $0.id == id }
    }

    func projectName(id: String?) -> String? {
        guard let id else { return nil }
        return project(id: id)?.name
    }

    /// A mission anywhere in the tree, with its project.
    func mission(id: String) -> (project: ProjectSummary, mission: MissionSummary)? {
        guard let workspace else { return nil }
        for project in workspace.projects {
            if let mission = project.missions.first(where: { $0.id == id }) {
                return (project, mission)
            }
        }
        return nil
    }

    /// The project (and mission, when it is one) that owns a thread id.
    func context(threadID: String) -> V2ThreadContext? {
        guard let workspace else { return nil }
        for project in workspace.projects {
            if project.threadID == threadID {
                return V2ThreadContext(
                    thread: Thread(
                        id: threadID, ownerType: .project, projectID: project.id,
                        missionID: nil, visualSessionID: ""
                    ),
                    project: project,
                    mission: nil
                )
            }
            for mission in project.missions where mission.threadID == threadID {
                return V2ThreadContext(
                    thread: Thread(
                        id: threadID, ownerType: .mission, projectID: project.id,
                        missionID: mission.id, visualSessionID: ""
                    ),
                    project: project,
                    mission: mission
                )
            }
        }
        return nil
    }

    /// `ensureWorkspace` once per sign-in, then (re)subscribe to the
    /// subscribable `workspaceTree` query.
    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            if ensuredWorkspaceID == nil {
                let ensured = try await api.ensureWorkspace()
                ensuredWorkspaceID = ensured.workspaceId
            }
            workspace = try await api.workspaceTree()
            errorText = nil
            subscribeTree()
        } catch {
            if Self.isSessionRejection(error) {
                errorText = nil
                if !sessionRejected {
                    sessionRejected = true
                    onSessionRejected?()
                }
                return
            }
            errorText = (error as? LocalizedError)?.errorDescription ?? "The workspace could not be loaded."
        }
    }

    private func subscribeTree() {
        treePoll?.cancel()
        treePoll = api.subscribeWorkspace { [weak self] workspace in
            Task { @MainActor [weak self] in
                if let workspace { self?.workspace = workspace }
            }
        }
    }

    /// Global intake: route a room-less message. `@brain` slugs ride as
    /// routing metadata; the caller passes an explicit project only from the
    /// per-project "+ New mission" row.
    func sendIntake(_ text: String, preferredProjectID: String? = nil) async throws -> RouteDecision {
        try await api.send(
            text: text,
            mentioning: BrainMention.parse(text),
            preferredProjectID: preferredProjectID
        )
    }

    /// Confirm a proposed creation, then reload the tree so the new
    /// project/mission row appears.
    func confirmCreation(_ decision: RouteDecision) async throws -> ConfirmProposalResult {
        let result = try await api.confirmProposal(decisionId: decision.decisionId)
        await refresh()
        return result
    }

    func threadForProject(_ projectID: String) async throws -> Thread? {
        try await api.thread(projectID: projectID)
    }

    func threadForMission(_ missionID: String) async throws -> Thread? {
        try await api.thread(missionID: missionID)
    }

    /// Artifact counts for the Files rows, fetched on demand and cached by
    /// thread id. Failures leave the count absent rather than wrong.
    func refreshFileCounts() async {
        guard let workspace else { return }
        var threads: [String] = []
        for project in workspace.projects {
            threads.append(project.threadID)
            threads += project.missions.map(\.threadID)
        }
        for threadID in threads where fileCounts[threadID] == nil {
            do {
                fileCounts[threadID] = try await api.artifacts(threadID: threadID).count
            } catch {
                // Absent count, not a zero: the row hides instead of lying.
            }
        }
    }

    /// Sign-out invalidation: the next sign-in re-ensures and resubscribes,
    /// and no stale tree survives the account switch.
    func signOutCleanup() {
        treePoll?.cancel()
        treePoll = nil
        ensuredWorkspaceID = nil
        sessionRejected = false
        workspace = nil
        errorText = nil
        fileCounts = [:]
    }
}

#if DEBUG
/// Hermetic v2 backend for `-v2FixtureUITest` (see CornerV2FlowUITests).
/// Serves fixture-shaped data — General + Aster, no missions, mirroring
/// `v2.native.fixture.json` — with real intake → confirm → mission-appears
/// behavior. No network, no account, no Keychain session needed. Debug only.
@MainActor
final class PreviewV2API: CornerV2API {
    private var missions: [MissionSummary] = []
    private var createdCount = 0
    private var pendingTitle = ""
    private var pendingProjectID = "proj-general-1"

    private var general: ProjectSummary {
        ProjectSummary(
            id: "proj-general-1", workspaceID: "world-preview-1", name: "General",
            kind: .general, tintHex: "#8B5CF6", needsAttention: false,
            threadID: "thread-general-1", missions: missions.filter { $0.projectID == "proj-general-1" }
        )
    }

    private var aster: ProjectSummary {
        ProjectSummary(
            id: "proj-aster-1", workspaceID: "world-preview-1", name: "Aster",
            kind: .standard, tintHex: "#5B9BFF", needsAttention: false,
            threadID: "thread-aster-1", missions: missions.filter { $0.projectID == "proj-aster-1" }
        )
    }

    private var workspace: WorkspaceSummary {
        // R17: density (-v2SeedScale) and bare (-v2SeedEmpty) fixtures.
        if PreviewV2API.launchHasFlag("-v2SeedEmpty") {
            let bare = ProjectSummary(
                id: general.id, workspaceID: general.workspaceID, name: general.name,
                kind: .general, tintHex: general.tintHex, needsAttention: false,
                threadID: general.threadID, missions: []
            )
            return WorkspaceSummary(
                id: "world-preview-1", name: "preview",
                generalProjectID: bare.id, projects: [bare]
            )
        }
        if PreviewV2API.launchHasFlag("-v2SeedScale") {
            return Self.seedScaleWorkspace(general: general)
        }
        return WorkspaceSummary(
            id: "world-preview-1", name: "preview", generalProjectID: general.id,
            projects: [general, aster]
        )
    }

    private func threadFor(id: String, owner: ThreadOwnerType, projectID: String, missionID: String?) -> Thread {
        Thread(id: id, ownerType: owner, projectID: projectID, missionID: missionID, visualSessionID: "session-\(id)")
    }

    /// R24 P080: resolve a thread id to its owning project + mission, the
    /// way the backend's `threadId` branch names the thread it is already
    /// in. Nil when the id names nothing (a stale thread, like prod).
    private func contextForThread(_ threadID: String) -> (ProjectSummary, MissionSummary?)? {
        seedShipIfNeeded()
        for project in workspace.projects {
            if project.threadID == threadID { return (project, nil) }
            if let mission = project.missions.first(where: { $0.threadID == threadID }) {
                return (project, mission)
            }
        }
        return nil
    }

    func workspaceTree() async throws -> WorkspaceSummary? {
        seedShipIfNeeded()
        return workspace
    }

    func ensureWorkspace() async throws -> EnsureWorkspaceResult {
        EnsureWorkspaceResult(workspaceId: workspace.id, generalProjectId: general.id, generalThreadId: general.threadID)
    }

    func thread(projectID: String) async throws -> Thread? {
        seedShipIfNeeded()
        guard let project = workspace.projects.first(where: { $0.id == projectID }) else { return nil }
        return threadFor(id: project.threadID, owner: .project, projectID: project.id, missionID: nil)
    }

    func thread(missionID: String) async throws -> Thread? {
        seedShipIfNeeded()
        for project in workspace.projects {
            if let mission = project.missions.first(where: { $0.id == missionID }) {
                return threadFor(id: mission.threadID, owner: .mission, projectID: project.id, missionID: mission.id)
            }
        }
        return nil
    }

    /// Chat events served to every thread (single shared buffer: the stub
    /// drives one chat at a time, and per-thread partitioning would only hide
    /// the replay the offline UI test relaunches for).
    private var chatEvents: [ThreadEvent] = []
    /// `-v2FailNextSends=N`: the next N sends throw `.notConnectedToInternet`
    /// (the offline UI test's airplane mode). Default: connected.
    private var failSendsLeft: Int = PreviewV2API.launchIntFlag("-v2FailNextSends")
    /// `-v2RejectNextSends=N`: the next N sends throw a masked server
    /// rejection (R24 P075: the clone hides every reason as "Server Error").
    /// Default: the server takes everything.
    private var rejectSendsLeft: Int = PreviewV2API.launchIntFlag("-v2RejectNextSends")
    /// `-v2RouteMode=confirm`: sends return a confident Project > Mission
    /// route (the route-block UI test). Default: every send proposes a new
    /// mission, preserving the intake creation flow.
    private var routeMode: String = PreviewV2API.launchStringFlag("-v2RouteMode")
    /// `-v2SeedLedger`: `ledger` serves two real-kind items (Task 6).
    private var seedLedger: Bool = PreviewV2API.launchHasFlag("-v2SeedLedger")
    /// `-v2SeedConfirmation`: one live cross-Project write confirmation from
    /// the Aster thread, consumed by `confirmCrossProjectWrite` (Task 6).
    private var seedConfirmation: Bool = PreviewV2API.launchHasFlag("-v2SeedConfirmation")
    /// R28 `-v2SlowSend=N`: stall every send and visual open N seconds, so
    /// the Stop-while-generating UI tests can catch a flight in progress.
    /// Default 0 (instant, like every other fixture op).
    private var slowSendSeconds: Int = PreviewV2API.launchIntFlag("-v2SlowSend")

    private func stallForSlowSend() async {
        guard slowSendSeconds > 0 else { return }
        try? await Task.sleep(nanoseconds: UInt64(slowSendSeconds) * 1_000_000_000)
    }
    private var confirmationConsumed = false
    private var compMatchSeeded = false
    private var shipSeeded = false

    // R17 scale seed: 47 projects / 121 missions with real-length titles
    // from the AOM audit perRoom titles. Test-only fixture density.
    private static let scaleProjectTitles: [String] = [
        "First Paying Customer",
        "Elmo",
        "Site Walk",
        "G Soak4",
        "Router",
        "Brand",
        "Google Ads Launch",
        "Billing June 15",
        "Corner",
        "Lab Elon",
        "Embeddable Agents",
        "Moguls",
        "Proj Tool Smoke 7",
        "Agent Chrome",
        "Dashboard Speed",
        "Brand Deck",
        "Management",
        "Social Legacy",
        "Onboarding",
        "Chat Files Panel",
        "Establish Core Ui Standard",
        "Mail Room",
        "Ambition EA",
        "Mail Room",
        "Corner",
        "Billing June 15",
        "Holistic Balance",
        "Reports Page",
        "Rainbow Sherbert",
        "Mission Rooms",
        "Project:ambition",
        "First Paying Customer",
        "Course Preview Tab",
        "Aom Ea",
        "Course Mapping",
        "Blackstar Orbital",
        "Blacknight",
        "Ahead of Market",
        "Project:higher Orbits",
        "Studio",
        "Deck Vibe Overhaul",
        "Cleo",
        "Podcast Page",
        "Corner EA",
        "Qa Composer Fix R2 706 Verify Mission Create",
        "New Users"
    ]
    private static let scaleMissionTitles: [String] = [
        "Website",
        "Left Menu",
        "Notifications",
        "Live Conversation",
        "Website Rebuild",
        "Dropbox Video Feedback",
        "Gemini Workers",
        "G Soak6",
        "Pala",
        "Elon",
        "What Project Does Live In",
        "Chat Reliability",
        "Aerospace Booth Flyer",
        "Ben EA",
        "Aztc Post Behind The Scene Storytelling",
        "Project:included Health",
        "April 29 Event",
        "Director",
        "Mini Doc Series Pitch",
        "Theme And Density",
        "Summit Highlight Reel",
        "/Users/aom Inhouse/Documents/Dev/aom Studio Transfer/aom Studio",
        "Multi Tenant",
        "Rpg Mechanics",
        "Loop Test Project",
        "Space Adventure 3",
        "Room Organizer",
        "Aerospace Booth Flyer",
        "Business Ops",
        "Integrations",
        "convex-multi-agent",
        "Agent Hooks",
        "New Projects",
        "Crunch Mesa Titles",
        "Wolfpack KFB",
        "Mission Water Game",
        "Corner Ui Cv5",
        "Kraken Corps",
        "Deal Bank",
        "Wolfpack",
        "Design Feedback Loop",
        "June Footage",
        "Deck",
        "Support",
        "Summerschool",
        "Support",
        "Portfolio Showcase",
        "Website Rebuild",
        "Skylar EA",
        "Chat Quality Loop",
        "C Memtest",
        "Higher Orbits",
        "Parent Teacher Council",
        "Website V2",
        "Project:isa Energy",
        "Probe Test 1779737560",
        "Tenant Isolation",
        "G Soak2",
        "Open Design Eval",
        "Kraken Corps",
        "Barbara O Neill",
        "Organize Files Files In App",
        "G Memtest",
        "Bridge",
        "Feed",
        "Home Screen Polishing",
        "Cg Kitchen",
        "Favicon System",
        "Proj Tool Smoke 6",
        "Keygroups Wavetables",
        "Agent Recovery Logic",
        "Masterclass Proposal",
        "Masterclass Pitch Deck",
        "Brands",
        "Files In App",
        "Master Loop",
        "Ambition Social Clips",
        "Elon",
        "Claude Motion Videos",
        "Ambition Mechanical",
        "Design Foundations",
        "Elon",
        "Gut Pruning Ship",
        "Linkedin Flood",
        "Brand Identity",
        "Corner Design Standards",
        "Coding Hook",
        "Home All Rooms",
        "Rpg Mechanics",
        "Trading Agent",
        "Director",
        "Cvg Redesign",
        "Included Health",
        "Jacob",
        "Cv4 Redesign",
        "Rules Consolidation",
        "Space Os",
        "Aztc Event Prize Cards",
        "Holistic Balance Page",
        "Az Tech Council",
        "Bobby",
        "Saved 38429",
        "Corner Proposal",
        "Master Loop",
        "AOM Summerschool",
        "Daily Research",
        "Notifications Catchup",
        "System Map For Family",
        "Routines",
        "Files In App",
        "Drive Mirror",
        "Older Versions",
        "Batch02 Culture Videos",
        "Smoke Test Project 6",
        "Wolfpack",
        "Intelliplay",
        "Project:aom Business",
        "Masterclass Proposal",
        "Feed",
        "Wolfpack",
        "Marketing"
    ]

    /// R17 scale density: 47 projects (General + 46) and 121 missions.
    /// Titles are real-length AOM room titles from the reconciliation audit.
    private static func seedScaleWorkspace(general: ProjectSummary) -> WorkspaceSummary {
        let tints = ["#5B9BFF", "#8B5CF6", "#2F9E6E", "#E5484D", "#F5A524", "#3B82F6", "#7C5CFF"]
        var rest = scaleMissionTitles[...]
        var projects: [ProjectSummary] = [general]
        for (i, title) in scaleProjectTitles.enumerated() {
            let take = i < 29 ? 3 : 2
            var rows: [MissionSummary] = []
            for _ in 0..<take {
                guard let mt = rest.popLast() else { break }
                let n = projects.count * 10 + rows.count
                let status: MissionStatus = (n % 11 == 0) ? .blocked : (n % 7 == 0) ? .live : (n % 5 == 0) ? .done : .ready
                rows.append(MissionSummary(
                    id: "v2scale-mis-\(n)", projectID: "v2scale-proj-\(i)",
                    title: String(mt), status: status, threadID: "v2scale-thread-\(n)"
                ))
            }
            projects.append(ProjectSummary(
                id: "v2scale-proj-\(i)", workspaceID: general.workspaceID,
                name: String(title), kind: .standard, tintHex: tints[i % tints.count],
                needsAttention: i % 8 == 3, threadID: "v2scale-projthread-\(i)",
                missions: rows
            ))
        }
        return WorkspaceSummary(
            id: general.workspaceID, name: "AOM",
            generalProjectID: general.id, projects: projects
        )
    }

    /// R17 comp-match: a deterministic rich General thread (user text, agent
    /// text + question, user text, agent text + steps) so every row shape
    /// renders without a backend.
    private func seedCompMatchIfNeeded() {
        guard PreviewV2API.launchHasFlag("-v2SeedCompMatch"), !compMatchSeeded else { return }
        compMatchSeeded = true
        let base = Date().addingTimeInterval(-3600)
        chatEvents.append(contentsOf: [
            ThreadEvent(
                id: "event-comp-user-1", threadID: general.threadID,
                author: .user, agentLabel: nil,
                blocks: [.text("Build the Aster spring launch deck. Eight slides, their brand kit, first pass tonight.")],
                createdAt: base
            ),
            ThreadEvent(
                id: "event-comp-agent-1", threadID: general.threadID,
                author: .agent, agentLabel: "Corner",
                blocks: [
                    .text("Before I start, two things I cannot guess from the brand kit."),
                    .question(id: "q-lane", text: "Pick a lane", options: [
                        QuestionOption(id: "q-retail", title: "Retail buyers", detail: "Range, margins, timing", recommended: true),
                        QuestionOption(id: "q-press", title: "Press and partners", detail: "Story, atmosphere, the line as a moment", recommended: false),
                    ]),
                ],
                createdAt: base.addingTimeInterval(60)
            ),
            ThreadEvent(
                id: "event-comp-user-2", threadID: general.threadID,
                author: .user, agentLabel: nil,
                blocks: [.text("Buyers. Keep the film for press.")],
                createdAt: base.addingTimeInterval(120)
            ),
            ThreadEvent(
                id: "event-comp-agent-2", threadID: general.threadID,
                author: .agent, agentLabel: "Corner",
                blocks: [
                    .text("I read the playbook you dropped in. Page 4 has the three priorities."),
                    .steps([
                        StepState(id: "st-read", label: "Read the playbook", state: "done"),
                        StepState(id: "st-outline", label: "Outline from the priorities", state: "done"),
                    ]),
                ],
                createdAt: base.addingTimeInterval(180)
            ),
        ])
    }

    private static func launchHasFlag(_ name: String) -> Bool {
        ProcessInfo.processInfo.arguments.contains(name)
    }

    /// In confirm mode the destination mission exists in the tree, so Move
    /// resolves it through `WorkspaceStore.context(threadID:)` like prod.
    private func seedShipIfNeeded() {
        guard routeMode == "confirm", !shipSeeded else { return }
        shipSeeded = true
        missions.append(MissionSummary(
            id: "mission-ship-1", projectID: "proj-aster-1", title: "Ship home page",
            status: .live, threadID: "thread-ship-1"
        ))
    }

    private static func launchStringFlag(_ name: String) -> String {
        let prefix = "\(name)="
        for arg in ProcessInfo.processInfo.arguments where arg.hasPrefix(prefix) {
            return String(arg.dropFirst(prefix.count))
        }
        return ""
    }

    private static func launchIntFlag(_ name: String) -> Int {
        Int(launchStringFlag(name)) ?? 0
    }

    func threadEvents(threadID: String, limit: Int? = nil) async throws -> [ThreadEvent] {
        seedCompMatchIfNeeded()
        // R23 P070: the visual card event seeds here, not only behind the
        // window's first load. The entry opens the thread directly, so the
        // first fetch must already carry the cards — winning or losing a
        // task race against window.start is not a seeding strategy.
        seedVisualIfNeeded()
        seedStepOnlyIfNeeded()
        seedLongThreadIfNeeded()
        // R40: the fixture windows like the server — the newest N by
        // (createdAt, id), so the "Earlier messages" row and its +200
        // expansion run the real path in fixture UI tests.
        let ordered = chatEvents.sorted {
            $0.createdAt != $1.createdAt ? $0.createdAt < $1.createdAt : $0.id < $1.id
        }
        guard let limit else { return ordered }
        return Array(ordered.suffix(limit))
    }

    /// R40: `-v2SeedLongThread` fills the entry thread with exactly 200
    /// generated rows (one per minute, oldest first), so the first load
    /// fills the window and the "Earlier messages" row shows in fixture
    /// UI tests. Newest-first ids keep the sort stable.
    private var longThreadSeeded = false

    private func seedLongThreadIfNeeded() {
        guard PreviewV2API.launchHasFlag("-v2SeedLongThread"), !longThreadSeeded else { return }
        longThreadSeeded = true
        let base = Date().addingTimeInterval(-200 * 60)
        for i in 1...V2ReadWindow.firstPage {
            let userTurn = i % 2 == 1
            chatEvents.append(ThreadEvent(
                id: String(format: "event-long-%03d", i), threadID: general.threadID,
                author: userTurn ? .user : .agent, agentLabel: userTurn ? nil : "Corner",
                blocks: [.text("Seeded history row \(i) of \(V2ReadWindow.firstPage)")],
                createdAt: base.addingTimeInterval(Double(i) * 60)
            ))
        }
    }

    /// R24 P078: one step-only agent event (label, no text) on the General
    /// thread — the live bridge's `step_ev` shape, where a label-only turn
    /// used to render as a blank row.
    private var stepOnlySeeded = false

    private func seedStepOnlyIfNeeded() {
        guard PreviewV2API.launchHasFlag("-v2SeedStepOnly"), !stepOnlySeeded else { return }
        stepOnlySeeded = true
        chatEvents.append(ThreadEvent(
            id: "event-steponly-1", threadID: general.threadID,
            author: .agent, agentLabel: "Corner",
            blocks: [.steps([
                StepState(id: "st-gather", label: "Gathering the latest numbers", state: "done"),
            ])],
            createdAt: Date()
        ))
    }

    func send(
        text: String, mentioning: [String], preferredProjectID: String?,
        mode: String? = nil, threadId: String? = nil,
        model: String? = nil, clientEventId: String? = nil,
        imageTool: String? = nil, replyTo: V2ReplyTo? = nil
    ) async throws -> RouteDecision {
        _ = mode // the fixture preview answers every mode the same way.
        _ = model
        _ = clientEventId
        _ = imageTool
        // R40: the fixture echoes `replyTo` on the sent block the way
        // production does (`v2Native:send` stores it on the block payload
        // and `threadEvents` passes it through since `a4fc532`). The
        // quote card renders from this server field alone — the local
        // re-attach is gone. Same non-empty guard as the wire decode.
        let sentQuote: V2ReplyQuote? = {
            guard let replyTo, !replyTo.messageId.isEmpty, !replyTo.sender.isEmpty else { return nil }
            return V2ReplyQuote(messageID: replyTo.messageId, sender: replyTo.sender, snippet: replyTo.snippet)
        }()
        // R32 P081: the run opens with the send and closes when the agent
        // reply lands below, so the working line and nav dot run live.
        fixtureRunOpen = true
        defer { fixtureRunOpen = false }
        await stallForSlowSend()
        try Task.checkCancellation()
        if failSendsLeft > 0 {
            failSendsLeft -= 1
            throw URLError(.notConnectedToInternet)
        }
        if rejectSendsLeft > 0 {
            rejectSendsLeft -= 1
            // A masked clone rejection (R24 P075): no usable reason crosses
            // the wire, exactly like production hides it today.
            throw ConvexServiceError.server("[Request ID: test-reject] Server Error")
        }
        pendingTitle = text
        // R24 P080: a thread id answers INTO the thread, like the backend's
        // `threadId` branch — the text lands there, the decision names the
        // thread it is already in, and no routing card follows.
        if let threadId, let (project, mission) = contextForThread(threadId) {
            let stamp = Date()
            chatEvents.append(ThreadEvent(
                id: "event-preview-user-\(chatEvents.count + 1)", threadID: threadId,
                author: .user, agentLabel: nil, blocks: [.text(text)], createdAt: stamp,
                replyQuote: sentQuote
            ))
            // @brain routing metadata still steers the reply, like the
            // global path's research branch below.
            if mentioning.contains("research") {
                chatEvents.append(ThreadEvent(
                    id: "event-preview-agent-\(chatEvents.count + 1)", threadID: threadId,
                    author: .agent, agentLabel: "Research",
                    blocks: [.text("I found three competitors.")], createdAt: stamp
                ))
            } else {
                chatEvents.append(ThreadEvent(
                    id: "event-preview-agent-\(chatEvents.count + 1)", threadID: threadId,
                    author: .agent, agentLabel: "Corner",
                    blocks: [.text("On it — anything else?")], createdAt: stamp
                ))
            }
            let path = mission.map { "\(project.name) > \($0.title)" } ?? project.name
            return RouteDecision(
                decisionId: "decision-preview-inthread-\(chatEvents.count)", destinationThreadID: threadId,
                project: project, mission: mission, confidence: 1, alternatives: [],
                reason: "Already in \(path).",
                needsClarification: false, needsCreationConfirmation: false,
                actor: "uitest", createdAt: Date()
            )
        }
        let targetID = preferredProjectID ?? general.id
        pendingProjectID = targetID
        let target = workspace.projects.first(where: { $0.id == targetID }) ?? general
        // The chat echo + agent reply, so send/reply renders with a label.
        let stamp = Date()
        chatEvents.append(ThreadEvent(
            id: "event-preview-user-\(chatEvents.count + 1)", threadID: target.threadID,
            author: .user, agentLabel: nil, blocks: [.text(text)], createdAt: stamp,
            replyQuote: sentQuote
        ))
        if mentioning.contains("research") {
            chatEvents.append(ThreadEvent(
                id: "event-preview-agent-\(chatEvents.count + 1)", threadID: target.threadID,
                author: .agent, agentLabel: "Research",
                blocks: [.text("I found three competitors.")], createdAt: stamp
            ))
        } else {
            chatEvents.append(ThreadEvent(
                id: "event-preview-agent-\(chatEvents.count + 1)", threadID: target.threadID,
                author: .agent, agentLabel: "Corner",
                blocks: [.text("On it — anything else?")], createdAt: stamp
            ))
        }
        if routeMode == "confirm" {
            let ship = MissionSummary(
                id: "mission-ship-1", projectID: aster.id, title: "Ship home page",
                status: .live, threadID: "thread-ship-1"
            )
            return RouteDecision(
                decisionId: "decision-preview-confirm-1", destinationThreadID: ship.threadID,
                project: aster, mission: ship, confidence: 0.78, alternatives: [],
                reason: "Strongest match for Aster > Ship home page.",
                needsClarification: false, needsCreationConfirmation: false,
                actor: "uitest", createdAt: Date()
            )
        }
        let reason = target.kind == .general ? "Create mission in General." : "Create in \(target.name)."
        return RouteDecision(
            decisionId: "decision-preview-1", destinationThreadID: "", project: target,
            mission: nil, confidence: 0.7, alternatives: [], reason: reason,
            needsClarification: false, needsCreationConfirmation: true,
            actor: "uitest", createdAt: Date()
        )
    }

    func confirmProposal(decisionId: String) async throws -> ConfirmProposalResult {
        createdCount += 1
        let mission = MissionSummary(
            id: "mission-preview-\(createdCount)", projectID: pendingProjectID,
            title: pendingTitle.isEmpty ? "Untitled mission" : pendingTitle,
            status: .live, threadID: "thread-preview-\(createdCount)"
        )
        missions.append(mission)
        return ConfirmProposalResult(projectID: mission.projectID, missionID: mission.id, threadID: mission.threadID)
    }

    func subscribeThread(threadID: String, receive: @escaping ([ThreadEvent]) -> Void) -> any Cancellable {
        Task<Void, Never> {}
    }

    func subscribeWorkspace(receive: @escaping (WorkspaceSummary?) -> Void) -> any Cancellable {
        receive(workspace)
        return Task<Void, Never> {}
    }

    /// `-v2SeedVisual`: seeded artifacts + an event carrying file cards, and an
    /// `openVisualTab` echo (Task 7). `-v2ResetVisual` clears the persisted
    /// tab rows first; without it a relaunch restores them, like the server
    /// session would.
    private var seedVisual: Bool = PreviewV2API.launchHasFlag("-v2SeedVisual")
    private var visualSeeded = false
    private var visualTabsByID: [String: VisualWindowTab] = [:]
    private var visualCounter = 0

    private static func visualTabsKey() -> String { "preview-visual-tabs" }

    private func loadPersistedVisualTabs() {
        visualTabsByID = [:]
        guard seedVisual,
              let data = UserDefaults.standard.data(forKey: Self.visualTabsKey()),
              let rows = try? JSONDecoder().decode([VisualWindowTab].self, from: data) else { return }
        for row in rows { visualTabsByID[row.id] = row }
        visualCounter = rows.count
    }

    private func persistVisualTabs() {
        let rows = visualTabsByID.values.sorted { $0.createdAt < $1.createdAt }
        visualTabsByID = Dictionary(uniqueKeysWithValues: rows.map { ($0.id, $0) })
        if let data = try? JSONEncoder().encode(rows) {
            UserDefaults.standard.set(data, forKey: Self.visualTabsKey())
        }
    }

    private func bundleURL(_ name: String, ext: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: ext)
    }

    private func seedVisualIfNeeded() {
        guard seedVisual, !visualSeeded else { return }
        visualSeeded = true
        if PreviewV2API.launchHasFlag("-v2ResetVisual") {
            UserDefaults.standard.removeObject(forKey: Self.visualTabsKey())
        }
        loadPersistedVisualTabs()
        let stamp = Date()
        chatEvents.append(ThreadEvent(
            id: "event-preview-visual-1", threadID: general.threadID,
            author: .agent, agentLabel: "Corner",
            blocks: [.artifact(artifactIDs: [
                "artifact-pdf-1", "artifact-site-1", "artifact-video-1",
                "artifact-photo-1", "artifact-code-1", "artifact-broken-1",
            ])],
            createdAt: stamp
        ))
    }

    private func seedArtifact(
        id: String, title: String, kind: VisualTabKind, version: Int = 1,
        file name: String? = nil, ext: String? = nil, dead: Bool = false
    ) -> Artifact {
        let url: URL?
        if dead {
            url = URL(fileURLWithPath: "/nonexistent/broken.pdf")
        } else if let name, let ext {
            url = bundleURL(name, ext: ext)
        } else {
            url = nil
        }
        return Artifact(
            id: id, threadID: general.threadID, title: title, kind: kind,
            version: version, sourceURL: url, metadata: [:]
        )
    }

    func visualTabs(visualSessionID: String) async throws -> [VisualWindowTab] {
        seedVisualIfNeeded()
        return visualTabsByID.values
            .filter { $0.visualSessionID == visualSessionID }
            .sorted { $0.createdAt < $1.createdAt }
    }

    func openVisualTab(kind: VisualTabKind, threadID: String, artifactID: String?, title: String, state: [String: String]) async throws -> VisualWindowTab {
        seedVisualIfNeeded()
        guard seedVisual else { throw CornerV2APIError.unconfiguredFakeOperation }
        await stallForSlowSend()
        try Task.checkCancellation()
        let sessionID = "session-\(threadID)"
        let artifacts = try await artifacts(threadID: threadID)
        // The server dedupes open by target: reopening reselects, never dupes.
        if let artifactID,
           let same = visualTabsByID.values.first(where: {
               $0.visualSessionID == sessionID && $0.artifactID == artifactID
           }) {
            visualTabsByID[same.id] = same
            persistVisualTabs()
            return same
        }
        visualCounter += 1
        let resolvedTitle = artifactID.flatMap { id in artifacts.first { $0.id == id }?.title } ?? title
        let resolvedKind = artifactID.flatMap { id in artifacts.first { $0.id == id }?.kind } ?? kind
        let tab = VisualWindowTab(
            id: "vtab-preview-\(visualCounter)", visualSessionID: sessionID,
            threadID: threadID, kind: resolvedKind, artifactID: artifactID,
            title: resolvedTitle, openedBy: .user, agentLabel: nil,
            state: state, createdAt: Date()
        )
        visualTabsByID[tab.id] = tab
        persistVisualTabs()
        return tab
    }

    func closeVisualTab(id: String) async throws {
        seedVisualIfNeeded()
        visualTabsByID.removeValue(forKey: id)
        persistVisualTabs()
    }

    func submitReview(artifactID: String, pins: [ReviewPin]) async throws -> SubmitReviewResult {
        SubmitReviewResult(
            checklistId: "checklist-preview-1",
            pins: pins.enumerated().map { index, pin in
                SubmitReviewResult.PinID(clientID: pin.clientID, id: "pin-preview-\(index + 1)")
            }
        )
    }

    func ledger(workspaceID: String, after: String?) async throws -> [LedgerItem] {
        guard seedLedger else { return [] }
        let stamp = Date()
        return [
            LedgerItem(
                id: "ledger-preview-1", workspaceID: workspaceID, kind: "did",
                description: "Scoped the Ship home page mission.", actor: "uitest",
                surface: "corner:v2", subjectIDs: ["mission-ship-1"],
                createdAt: stamp, supersedesID: nil
            ),
            LedgerItem(
                id: "ledger-preview-2", workspaceID: workspaceID, kind: "learned",
                description: "Learned the brand color from the Aster brief.", actor: "uitest",
                surface: "corner:v2", subjectIDs: ["thread-aster-1"],
                createdAt: stamp, supersedesID: nil
            ),
        ]
    }

    func confirmCrossProjectWrite(id: String) async throws {
        confirmationConsumed = true
    }

    func artifacts(threadID: String) async throws -> [Artifact] {
        seedVisualIfNeeded()
        artifactPolls += 1
        var rows: [Artifact] = createdArtifacts.map { created in
            Artifact(
                id: created.id, threadID: threadID, title: created.title,
                kind: created.kind, version: 1,
                sourceURL: fixtureSourceURL(
                    kind: created.kind, storageId: created.storageId,
                    meta: created.meta, pollsSinceCreate: artifactPolls - created.pollsAtCreate
                ),
                metadata: created.meta
            )
        }
        guard seedVisual, threadID == general.threadID else { return rows }
        rows += [
            seedArtifact(id: "artifact-pdf-1", title: "Aster brief", kind: .pdf, file: "aster-brief", ext: "pdf"),
            seedArtifact(id: "artifact-site-1", title: "Launch site", kind: .web, file: "site", ext: "html"),
            seedArtifact(id: "artifact-video-1", title: "Teaser", kind: .video, file: "walkthrough", ext: "mp4"),
            seedArtifact(id: "artifact-photo-1", title: "Hero photo", kind: .photo, file: "hero", ext: "png"),
            seedArtifact(id: "artifact-code-1", title: "Hero code", kind: .code, file: "brief", ext: "tsx"),
            seedArtifact(id: "artifact-broken-1", title: "Broken file", kind: .pdf, dead: true),
        ]
        return rows
    }

    func pendingConfirmations() async throws -> [CrossProjectWriteConfirmation] {
        guard seedConfirmation, !confirmationConsumed else { return [] }
        return [CrossProjectWriteConfirmation(
            id: "confirm-preview-1", sourceThreadID: "thread-aster-1",
            destinationThreadID: "thread-north-1",
            summary: "update brief: Set primary to #5B9BFF",
            expiresAt: Date().addingTimeInterval(600)
        )]
    }

    // MARK: - R32 wiring (fixture)

    /// R32 P081: an open run spans each fixture send — set when the send
    /// starts, cleared when the agent reply lands — so the working line
    /// and the nav dot run the real lifecycle in UI tests (including the
    /// `-v2SlowSend` stall, where the line is visible mid-flight).
    private var fixtureRunOpen = false

    func runsForThread(threadID: String) async throws -> V2ThreadRuns {
        if fixtureRunOpen {
            return V2ThreadRuns(
                open: [V2ThreadRun(
                    id: "run-preview-1", status: "running", brain: "corner",
                    provider: "fixture", createdAt: Date()
                )],
                lastDone: nil
            )
        }
        return V2ThreadRuns(open: [], lastDone: nil)
    }

    /// R32 clear: `-v2FailClear` throws (the retry UI test); otherwise the
    /// shared chat buffer empties like the server's `clearedAt` surface.
    private(set) var didClearThread = false

    func clearThread(threadID: String) async throws {
        if PreviewV2API.launchHasFlag("-v2FailClear") {
            throw ConvexServiceError.server("[Request ID: test-clear] Server Error")
        }
        chatEvents.removeAll()
        didClearThread = true
    }

    /// R32 upload: `-v2FailUploads=N` fails the next N uploads with a
    /// network error (the per-file retry UI test); otherwise mints a
    /// fixture storage id. Counts every attempt, failed or not.
    private var failUploadsLeft: Int = PreviewV2API.launchIntFlag("-v2FailUploads")
    private var uploadCounter = 0

    func uploadFile(data: Data, mimeType: String) async throws -> String {
        if failUploadsLeft > 0 {
            failUploadsLeft -= 1
            throw URLError(.notConnectedToInternet)
        }
        uploadCounter += 1
        return "storage-fixture-\(uploadCounter)"
    }

    /// R32 artifacts created in fixture: uploads (with storage) resolve to
    /// a bundled file of the same kind so their tabs paint; pending image
    /// artifacts (no storage, `status: "generating"`) resolve only after
    /// `-v2ImageUpgradePolls` `artifacts` reads (default 0: ready on the
    /// next read), mirroring the bridge's upgrade.
    private struct FixtureCreatedArtifact {
        let id: String
        let kind: VisualTabKind
        let title: String
        let storageId: String?
        let meta: [String: String]
        let pollsAtCreate: Int
    }

    private var createdArtifacts: [FixtureCreatedArtifact] = []
    private var artifactPolls = 0
    private var imageUpgradePolls: Int = PreviewV2API.launchIntFlag("-v2ImageUpgradePolls")

    func createArtifact(
        threadID: String, kind: VisualTabKind, title: String,
        storageId: String?, meta: [String: String], createdBy: String
    ) async throws -> V2CreatedArtifact {
        _ = createdBy
        _ = threadID
        let id = "artifact-created-\(createdArtifacts.count + 1)"
        createdArtifacts.append(FixtureCreatedArtifact(
            id: id, kind: kind, title: title, storageId: storageId,
            meta: meta, pollsAtCreate: artifactPolls
        ))
        return V2CreatedArtifact(id: id)
    }

    private func fixtureSourceURL(kind: VisualTabKind, storageId: String?, meta: [String: String], pollsSinceCreate: Int) -> URL? {
        // A pending image resolves only once the "bridge upgrade" lands.
        if storageId == nil, meta["status"] == "generating" {
            guard pollsSinceCreate > imageUpgradePolls else { return nil }
            return bundleURL("hero", ext: "png")
        }
        guard storageId != nil else { return nil }
        switch kind {
        case .pdf: return bundleURL("aster-brief", ext: "pdf")
        case .photo: return bundleURL("hero", ext: "png")
        case .video: return bundleURL("walkthrough", ext: "mp4")
        case .web: return bundleURL("site", ext: "html")
        case .code: return bundleURL("brief", ext: "tsx")
        default: return nil
        }
    }
}
#endif
