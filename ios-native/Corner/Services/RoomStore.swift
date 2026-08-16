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
        guard let world = api.world, let email = api.session?.user.email else { return [] }
        let identity = try await ConvexService.shared.identity(email: email, name: sessionName)
        let convexRooms: [ConvexRoom] = try await ConvexService.shared.query("rooms:listRooms", args: ["worldId": identity.worldId])
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

        // Convex path (BRIEF 04): when enabled, load rooms from Convex first.
        // In unit tests the Convex endpoint is not mocked — skip to keep tests fast and deterministic.
        let isTesting = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
        if Config.useConvex && !isTesting {
            do {
                guard let email = api.session?.user.email else { throw ConvexService.ConvexError.missingIdentity }
                let identity = try await ConvexService.shared.identity(email: email, name: sessionName)
                let convexRooms: [ConvexRoom] = try await ConvexService.shared.query("rooms:listRooms", args: ["worldId": identity.worldId])
                if !convexRooms.isEmpty {
                    let convexAgents = convexRooms.compactMap { convexAgentRoom($0, world: world) }
                    if !convexAgents.isEmpty { agents = convexAgents }
                    let groups = convexRoomsToProjectGroups(convexRooms, world: world)
                    projects = groups
                    recent = buildRecentFromConvex(groups: groups, agentRooms: agents, rows: convexRooms)
                    AppRouter.shared.recencyOrder = recent.map(\.room)
                    railError = nil
                    return
                }
            } catch {
                railError = "Convex rooms could not be loaded. Pull to try again."
                return
            }
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
        let createdAt: Double?
        let lastMessage: ConvexLastMessage?

        struct ConvexLastMessage: Decodable {
            let text: String?
            let createdAt: Double?
            let agentSlug: String?
        }

        enum CodingKeys: String, CodingKey {
            case _id, roomId, name, type, kind, slug, project, mission, specialist, subtitle, tint
            case room_id = "room_id"
            case title
            case clientId = "clientId"
            case worldId = "worldId", createdAt, lastMessage
        }

        /// Convex returns `_id` as the document ID — prefer it over all others
        var resolvedID: String { _id ?? roomId ?? room_id ?? slug ?? name ?? "" }
        var resolvedTitle: String { title ?? name ?? Room.prettify(slug ?? resolvedID) }
    }

    private func convexRoomsToProjectGroups(_ convexRooms: [ConvexRoom], world: String) -> [ProjectGroup] {
        var groups: [ProjectGroup] = []
        for cr in convexRooms where (cr.kind ?? cr.type) == "project" {
            let rid = cr.resolvedID
            guard !rid.isEmpty else { continue }
            let explicit = cr.project ?? cr.slug
            let slug = explicit?.isEmpty == false ? explicit! : "\(slugify(cr.resolvedTitle))-\(rid.suffix(6))"
            var room = Room(world: world, kind: .project(slug: slug), title: cr.resolvedTitle, subtitle: cr.subtitle ?? "Project")
            room.convexID = rid
            groups.append(ProjectGroup(room: room, missions: []))
        }
        for cr in convexRooms where (cr.kind ?? cr.type) == "mission" {
            let rid = cr.resolvedID
            guard !rid.isEmpty, let project = cr.project, !project.isEmpty else { continue }
            let bare = cr.mission ?? cr.slug ?? slugify(cr.resolvedTitle)
            var room = Room(world: world, kind: .mission(slug: "\(project):\(bare)", project: project), title: cr.resolvedTitle, subtitle: cr.subtitle ?? Room.prettify(project))
            room.convexID = rid
            if let index = groups.firstIndex(where: { $0.room.kind == .project(slug: project) }) {
                groups[index] = ProjectGroup(room: groups[index].room, missions: groups[index].missions + [room])
            } else {
                var parent = Room(world: world, kind: .project(slug: project), title: Room.prettify(project), subtitle: "Project")
                parent.convexID = nil
                groups.append(ProjectGroup(room: parent, missions: [room]))
            }
        }
        groups.sort { $0.room.title.localizedCaseInsensitiveCompare($1.room.title) == .orderedAscending }
        return groups
    }

    private var sessionName: String? {
        guard let metadata = api.session?.user.userMetadata else { return nil }
        return metadata["name"] as? String ?? metadata["full_name"] as? String
    }

    private func convexAgentRoom(_ cr: ConvexRoom, world: String) -> Room? {
        guard (cr.kind ?? cr.type) == "agent", let slug = cr.specialist ?? cr.slug, !slug.isEmpty else { return nil }
        var room = Room(world: world, kind: .agent(slug: slug), title: cr.resolvedTitle, subtitle: cr.subtitle ?? "Agent")
        room.convexID = cr.resolvedID
        return room
    }

    private func buildRecentFromConvex(groups: [ProjectGroup], agentRooms: [Room], rows: [ConvexRoom]) -> [RecentRoom] {
        let all = groups.flatMap { [$0.room] + $0.missions } + agentRooms
        let byID = Dictionary(uniqueKeysWithValues: all.compactMap { room in room.convexID.map { ($0, room) } })
        return rows.compactMap { row -> RecentRoom? in
            guard let room = byID[row.resolvedID], let last = row.lastMessage, let ts = last.createdAt else { return nil }
            return RecentRoom(room: room, ts: ts, preview: RoomPreview.clean(last.text ?? ""))
        }.sorted { $0.ts > $1.ts }.prefix(30).map { $0 }
    }

    private func slugify(_ value: String) -> String {
        value.lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }
}
