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

    @Published private(set) var agents: [Room] = []
    @Published private(set) var projects: [ProjectGroup] = []
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

    func load() async {
        guard let world = api.world else {
            agents = []
            projects = []
            railError = nil
            hasLoadedOnce = true
            return
        }

        agents = AgentRoster.rooms(world: world)
        isLoading = true
        defer { isLoading = false; hasLoadedOnce = true }

        async let treeResult = fetchTree()
        async let listResult = fetchProjectList()
        let (tree, list) = await (treeResult, listResult)

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
    }

    private func fetchTree() async -> [CornerAPI.ProjectNode]? {
        do { return try await api.fetchMissionsTree() } catch { return nil }
    }

    private func fetchProjectList() async -> [CornerAPI.ProjectRow]? {
        do { return try await api.fetchProjects() } catch { return nil }
    }

    /// Every room the rail knows, flattened — what the search field filters.
    var allRooms: [Room] {
        agents + projects.flatMap { [$0.room] + $0.missions }
    }
}
