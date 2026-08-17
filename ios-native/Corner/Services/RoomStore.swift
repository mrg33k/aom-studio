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
        let convexRooms: [ConvexRoom] = try await ConvexService.shared.query("rooms:listRooms", args: ["worldId": world])
        return convexRooms.compactMap { cr -> Room? in
            let id = cr.resolvedID
            guard !id.isEmpty else { return nil }
            let title = cr.resolvedTitle
            // Build Room directly from Convex fields instead of parsing the ID format
            let kind: Room.Kind
            switch cr.kind ?? cr.type ?? "project" {
            case "agent": kind = .agent(slug: cr.specialist ?? cr.slug ?? id)
            case "mission": kind = .mission(slug: cr.slug ?? id, project: cr.project ?? "")
            default: kind = .project(slug: cr.project ?? cr.slug ?? id)
            }
            var room = Room(world: world, kind: kind, title: title, subtitle: cr.subtitle ?? "")
            room.convexID = id  // Store the Convex _id for queries
            return room
        }
    }

    func load() async {
        guard let world = api.world else {
            agents = []
            projects = []
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
        let isTesting = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
        if Config.useConvex && !isTesting {
            do {
                let convexRooms: [ConvexRoom] = try await ConvexService.shared.query("rooms:listRooms", args: ["worldId": world])
                let groups = convexRoomsToProjectGroups(convexRooms, world: world)
                projects = groups
                // buildRecent(activity:) is the Supabase feed's shape and returns []
                // when activity is nil — the timeline must come from the rows' own
                // lastMessage instead, or the home screen renders "No rooms yet"
                // over 600 healthy rooms.
                recent = convexRecent(convexRooms)
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
            case _id, legacyRoomId, lastMessage, roomId, name, type, kind, slug, project, mission, specialist, subtitle, tint
            case room_id = "room_id"
            case title
            case clientId = "clientId"
            case worldId = "worldId"
        }

        /// Convex returns `_id` as the document ID — prefer it over all others
        var resolvedID: String { _id ?? roomId ?? room_id ?? slug ?? name ?? "" }
        var resolvedTitle: String { title ?? name ?? Room.prettify(slug ?? resolvedID) }
    }

    /// The home timeline, straight from Convex room rows: canonical-parsed rooms
    /// (agents included) ranked by their newest message. Machine rooms whose keys
    /// don't parse (terminal/task) stay off the timeline by construction.
    private func convexRecent(_ convexRooms: [ConvexRoom]) -> [RecentRoom] {
        var rows: [RecentRoom] = []
        for cr in convexRooms {
            guard let key = cr.legacyRoomId,
                  let room = Room.parse(roomID: key, title: cr.resolvedTitle),
                  let ts = cr.lastMessage?.createdAt, ts > 0 else { continue }
            rows.append(RecentRoom(room: room, ts: ts, preview: RoomPreview.clean(cr.lastMessage?.text ?? "")))
        }
        return rows.enumerated()
            .sorted { l, r in l.element.ts != r.element.ts ? l.element.ts > r.element.ts : l.offset < r.offset }
            .map(\.element)
    }

    private func convexRoomsToProjectGroups(_ convexRooms: [ConvexRoom], world: String) -> [ProjectGroup] {
        var groups: [ProjectGroup] = []
        var seen = Set<String>()
        for cr in convexRooms {
            let rid = cr.resolvedID
            guard !rid.isEmpty else { continue }
            // Parse the CANONICAL key (legacyRoomId) first — resolvedID is usually the
            // Convex document _id ("jn7..."), which Room.parse can never understand.
            if let room = Room.parse(roomID: cr.legacyRoomId ?? rid, title: cr.resolvedTitle) {
                switch room.kind {
                case .project(let slug):
                    if seen.contains(slug) { continue }
                    seen.insert(slug)
                    groups.append(ProjectGroup(room: room, missions: []))
                case .mission(let slug, let project):
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
                    _ = slug
                case .agent:
                    // Agent rooms are handled via AgentRoster, not ProjectGroup
                    continue
                }
            } else if let slug = cr.slug, !slug.isEmpty, !seen.contains(slug) {
                seen.insert(slug)
                let room = Room(world: world, kind: .project(slug: slug), title: cr.resolvedTitle, subtitle: "Project")
                groups.append(ProjectGroup(room: room, missions: []))
            }
        }
        groups.sort { $0.room.title.localizedCaseInsensitiveCompare($1.room.title) == .orderedAscending }
        return groups
    }
}
