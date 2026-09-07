// V2DrawerView.swift — Corner native iOS
// corner:corner-v2 R17 (P055–P058).
//
// The design's phone drawer (§4 Mobile layout): an 84%-width slide-over with
// the logo + close up top, a New / Project + row, Recent,
// Projects with missions, and identity + bell + gear at the bottom.
//
// Every action does its real thing:
// - New raises the intake sheet; Project + calls v2Projects:createProject
//   (the web's `onNewProject` creates `New Project` the same way).
// - Notifications raise their sheet via the entry (which
//   owns them since the home tree retired, R23 P070).
// - Recent is the device's own last-opened threads (UserDefaults) — the
//   server exposes no recency signal, so recency is honestly local.
// - Search filters projects + missions in place, like the tree's search did.
// - Rows navigate with router.open, which replaces rather than stacks.
// Identifiers live on leaf buttons only (the R14 container finding).

import SwiftUI

// MARK: - Recent threads (this device)

/// One recently opened thread. Status rides along so the dot is truthful
/// without a network read.
struct V2RecentThread: Codable, Equatable {
    var kind: String // "project" or "mission"
    var id: String
    var title: String
    var projectName: String
    var status: String // mission status, or "attention" / "plain"
}

/// Last-opened v2 threads, newest first, capped. Local recency: v2Native has
/// no last-activity read, so the drawer never pretends otherwise.
@MainActor
final class V2RecentStore: ObservableObject {
    static let shared = V2RecentStore()

    private static let key = "corner.v2.recent-threads"
    private static let cap = 8

    @Published private(set) var recents: [V2RecentThread] = []

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.key),
           let rows = try? JSONDecoder().decode([V2RecentThread].self, from: data) {
            recents = rows
        }
    }

    func record(project: ProjectSummary, mission: MissionSummary?) {
        let entry: V2RecentThread
        if let mission {
            entry = V2RecentThread(
                kind: "mission", id: mission.id, title: mission.title,
                projectName: project.name, status: mission.status.rawValue
            )
        } else {
            entry = V2RecentThread(
                kind: "project", id: project.id, title: project.name,
                projectName: project.name,
                status: project.needsAttention ? "attention" : "plain"
            )
        }
        recents.removeAll { $0.kind == entry.kind && $0.id == entry.id }
        recents.insert(entry, at: 0)
        recents = Array(recents.prefix(Self.cap))
        if let data = try? JSONEncoder().encode(recents) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }

    /// Test + sign-out reset.
    func clear() {
        recents = []
        UserDefaults.standard.removeObject(forKey: Self.key)
    }
}

extension Notification.Name {
    /// The entry raises the intake sheet (userInfo: projectID or omitted).
    /// Kept for compatibility senders; the drawer opens V2IntakeStore itself.
    static let v2FocusIntake = Notification.Name("corner.v2.focus-intake")
    /// The entry raises the voice sheet.
    static let v2RecordCall = Notification.Name("corner.v2.record-call")
    /// The entry raises notifications.
    static let v2ShowNotifications = Notification.Name("corner.v2.show-notifications")
}

// MARK: - The drawer

struct V2DrawerView: View {
    @EnvironmentObject private var router: AppRouter
    @EnvironmentObject private var api: CornerAPI
    @ObservedObject private var v2 = WorkspaceStore.shared
    @ObservedObject private var review = ReviewStore.shared
    @ObservedObject private var recents = V2RecentStore.shared

    @Binding var isPresented: Bool
    /// The open thread's project: expanded, the rest collapsed (per §4).
    var currentThreadID: String? = nil
    @State private var expandedProjectIDs: Set<String> = []
    @State private var errorText: String?
    @State private var busy = false
    /// R23 P070: the tree's search, in the design's rows.
    @State private var searchQuery = ""

    private var searchText: String {
        searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var isSearching: Bool { !searchText.isEmpty }

    /// Projects matching the search (by project or mission title), or all of
    /// them when the field is empty.
    private var visibleProjects: [ProjectSummary] {
        guard let workspace = v2.workspace else { return [] }
        guard isSearching else { return workspace.projects }
        return workspace.projects.filter { project in
            project.name.localizedCaseInsensitiveContains(searchText)
                || project.missions.contains {
                    $0.title.localizedCaseInsensitiveContains(searchText)
                }
        }
    }

    private func visibleMissions(of project: ProjectSummary) -> [MissionSummary] {
        guard isSearching else { return project.missions }
        if project.name.localizedCaseInsensitiveContains(searchText) { return project.missions }
        return project.missions.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }

    /// Searching expands every match; otherwise the open thread's project.
    private func isExpanded(_ project: ProjectSummary) -> Bool {
        isSearching || expandedProjectIDs.contains(project.id)
    }

    /// Raise the intake sheet once the drawer is gone — presenting into the
    /// same update as the overlay dismissal is swallowed, the same failure
    /// the tree's 350ms focus delay worked around.
    private func raiseIntake(projectID: String? = nil) {
        isPresented = false
        router.path = []
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 350_000_000)
            V2IntakeStore.shared.open(projectID: projectID)
        }
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Color(cv6: 0x040609).opacity(0.55)
                    .ignoresSafeArea()
                    .onTapGesture { isPresented = false }
                VStack(alignment: .leading, spacing: 0) {
                    header
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            newRow
                            searchRow
                            if !recents.recents.isEmpty, !isSearching {
                                drawerLabel("Recent")
                                ForEach(Array(recents.recents.enumerated()), id: \.offset) { _, recent in
                                    recentRow(recent)
                                }
                            }
                            projectsHeader
                            ForEach(visibleProjects) { project in
                                projectRow(project)
                                if isExpanded(project) {
                                    ForEach(visibleMissions(of: project)) { mission in
                                        missionRow(project: project, mission: mission)
                                    }
                                    filesRow(project: project)
                                    newMissionRow(project: project)
                                }
                            }
                            if isSearching, visibleProjects.isEmpty {
                                drawerLabel("No projects or missions match")
                            }
                            if let error = errorText {
                                Text(error)
                                    .font(.hanken(12))
                                    .foregroundStyle(Theme.warning)
                                    .padding(.vertical, 8)
                            }
                        }
                        .padding(.horizontal, 12)
                    }
                    footer
                }
                .frame(width: geo.size.width * 0.8356, alignment: .leading)
                .frame(maxHeight: .infinity)
                // The current theme's `raised` is 55% translucent; the drawer
                // is a solid panel in the design, so it sits on `ground`
                // (P084: chat rows showed through it, Patrik 2026-09-07).
                .background(Theme.raised)
                .background(Theme.ground)
            }
        }
        .transition(.move(edge: .leading))
        .animation(.easeOut(duration: 0.3), value: isPresented)
        // NOTE: the marker is a 1pt leaf, never on this container — a
        // container identifier overwrites every identified control below it
        // (the chat-screen finding). Tests address the leaves directly.
        .overlay {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("v2-drawer")
        }
        .onAppear {
            // The open thread's project starts expanded; the rest collapsed.
            if let id = currentThreadID,
               let found = v2.workspace?.projects.first(where: {
                   $0.threadID == id || $0.missions.contains(where: { $0.threadID == id })
               }) {
                expandedProjectIDs = [found.id]
            }
            // File counts for the Files rows (absent, never zero, on failure).
            Task { await v2.refreshFileCounts() }
        }
    }

    // MARK: header

    private var header: some View {
        HStack(spacing: 0) {
            Image("CornerLogo")
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .frame(height: 16)
                .foregroundStyle(Theme.ink)
                .accessibilityLabel("Corner")
                .padding(.leading, 20)
            Spacer(minLength: 0)
            Button { isPresented = false } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-close")
            .accessibilityLabel("Close menu")
            .padding(.trailing, 8)
        }
        .frame(height: 52)
    }

    // MARK: New / Project +

    /// R23 P070: the tree's search as a drawer row — magnifier, field,
    /// clear. Filters projects + missions in place.
    private var searchRow: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(Theme.inkFaint)
                .frame(width: 24)
            TextField("Search projects & missions", text: $searchQuery)
                .font(.hanken(14.5))
                .foregroundStyle(Theme.ink)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .accessibilityIdentifier("v2-drawer-search")
                .accessibilityLabel("Search projects and missions")
            if !searchQuery.isEmpty {
                Button { searchQuery = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15, weight: .regular))
                        .foregroundStyle(Theme.inkFaint)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("v2-drawer-search-clear")
                .accessibilityLabel("Clear search")
            }
            Spacer(minLength: 0)
        }
        .frame(height: 44)
        .padding(.top, 4)
    }

    private var newRow: some View {
        HStack(spacing: 8) {
            Button {
                raiseIntake()
            } label: {
                Text("New")
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Theme.accent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-new")
            .accessibilityLabel("New mission")
            Button {
                Task { await createProject() }
            } label: {
                Text("Project +")
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(busy)
            .accessibilityIdentifier("v2-drawer-new-project")
            .accessibilityLabel("New project")
        }
        .padding(.top, 12)
    }

    /// The web's onNewProject, over the native transport.
    private func createProject() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            guard let workspaceID = v2.workspace?.id else { return }
            struct Created: Decodable { var projectId: String }
            let created: Created = try await ConvexService.shared.mutationWithResult(
                "v2Projects:createProject",
                args: ["workspaceId": workspaceID, "name": "New Project"]
            )
            await v2.refresh()
            isPresented = false
            router.open(.project(projectID: created.projectId))
        } catch {
            errorText = "Couldn't create the project."
        }
    }


    /// L027 on the phone: a stored name that is really the account's email
    /// (or its local part, the sign-up default) is not a name — show "You".
    static func accountLabel(_ name: String?, email: String?) -> String {
        let n = (name ?? "").trimmingCharacters(in: .whitespaces)
        if n.isEmpty { return "You" }
        if n.contains("@") || n.contains("+") { return "You" }
        if let e = email?.lowercased(), let local = e.split(separator: "@").first, n.lowercased() == local { return "You" }
        return n
    }

    // MARK: sections

    private func drawerLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.hanken(10.5).weight(.semibold))
            .foregroundStyle(Theme.inkFaint)
            .frame(height: 34, alignment: .bottomLeading)
            .padding(.bottom, 2)
            .accessibilityIdentifier("v2-drawer-section")
    }

    private var projectsHeader: some View {
        HStack(spacing: 0) {
            Text("PROJECTS")
                .font(.hanken(10.5).weight(.semibold))
                .foregroundStyle(Theme.inkFaint)
            Spacer(minLength: 0)
            Button {
                Task { await createProject() }
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Theme.inkFaint)
                    .frame(width: 24, height: 24)
            }
            .buttonStyle(.plain)
            .disabled(busy)
            .accessibilityIdentifier("v2-drawer-add-project")
            .accessibilityLabel("New project")
        }
        .frame(height: 46)
    }

    // MARK: rows

    private func recentRow(_ recent: V2RecentThread) -> some View {
        Button {
            isPresented = false
            if recent.kind == "mission" {
                router.open(.mission(missionID: recent.id))
            } else {
                router.open(.project(projectID: recent.id))
            }
        } label: {
            HStack(spacing: 10) {
                Circle()
                    .fill(V2DrawerView.dot(for: recent.status))
                    .frame(width: 7, height: 7)
                Text(recent.title)
                    .font(.hanken(15).weight(.medium))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Spacer(minLength: 0)
                if recent.status == "attention" || recent.status == "blocked" {
                    Circle().fill(Theme.warning).frame(width: 7, height: 7)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(height: 46)
        .padding(.horizontal, 10)
        .background(
            recent.id == currentThreadID || recents.recents.first?.id == recent.id
                ? Theme.divider : Color.clear,
            in: RoundedRectangle(cornerRadius: 11, style: .continuous)
        )
        .accessibilityIdentifier("v2-drawer-recent-row")
        .accessibilityLabel(recent.title)
    }

    private func projectRow(_ project: ProjectSummary) -> some View {
        let expanded = isExpanded(project)
        return HStack(spacing: 0) {
            Button { openProject(project) } label: {
                HStack(spacing: 10) {
                    Text(String(project.name.prefix(1)).uppercased())
                        .font(.hanken(10).weight(.bold))
                        .foregroundStyle(Color.white)
                        .frame(width: 22, height: 22)
                        .background(
                            Color(hexString: project.tintHex) ?? Theme.accent,
                            in: RoundedRectangle(cornerRadius: 6, style: .continuous)
                        )
                    Text(project.name)
                        .font(.hanken(15).weight(.medium))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .accessibilityIdentifier("v2-drawer-project-name")
                    Spacer(minLength: 0)
                    if project.needsAttention {
                        Circle().fill(Theme.warning).frame(width: 7, height: 7)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-project-row")
            .accessibilityLabel(project.name)
            // NOTE: the explicit label stays (exact-match row lookup, clean
            // VoiceOver) — unlike the mission row, the project title Text
            // surfaces its identifier beside it (measured: 47/47 at scale).
            // R23 P070: the per-project `+` — a mission scoped to this
            // project, like the tree's per-project New-mission row.
            Button { raiseIntake(projectID: project.id) } label: {
                Image(systemName: "plus")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Theme.inkFaint)
                    .frame(width: 32, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-project-add")
            .accessibilityLabel("New mission in \(project.name)")
            Button {
                withAnimation(.easeOut(duration: 0.15)) {
                    if expandedProjectIDs.contains(project.id) { expandedProjectIDs.remove(project.id) }
                    else {
                        expandedProjectIDs.insert(project.id)
                        Task { await v2.refreshFileCounts() }
                    }
                }
            } label: {
                Image(systemName: expanded ? "chevron.down" : "chevron.right")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(Theme.inkFaint)
                    .frame(width: 32, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-project-expand")
            .accessibilityLabel(expanded ? "Collapse \(project.name)" : "Expand \(project.name)")
        }
        .frame(height: 46)
    }

    private func openProject(_ project: ProjectSummary) {
        isPresented = false
        router.open(.project(projectID: project.id))
    }

    private func missionRow(project: ProjectSummary, mission: MissionSummary) -> some View {
        Button {
            isPresented = false
            router.open(.mission(missionID: mission.id))
        } label: {
            HStack(spacing: 10) {
                Circle()
                    .fill(V2DrawerView.dot(for: mission.status.rawValue))
                    .frame(width: 6, height: 6)
                Text(mission.title)
                    .font(.hanken(14))
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
                    .accessibilityIdentifier("v2-drawer-mission-name")
                Spacer(minLength: 0)
            }
            // The tree's recipe: no explicit label plus exposed children, or
            // the title Text below never surfaces its identifier (measured).
            .accessibilityElement(children: .contain)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(height: 40)
        .padding(.leading, 26)
        .accessibilityIdentifier("v2-drawer-mission-row")
    }

    /// R23 P070: the tree's `Files · N` row — the thread's artifact count,
    /// opening the files browser. Hidden until the count loads (the tree's
    /// rule: absent, never zero, on failure).
    @ViewBuilder
    private func filesRow(project: ProjectSummary) -> some View {
        if let count = v2.fileCounts[project.threadID], count > 0 {
            Button {
                isPresented = false
                router.open(.organize)
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "folder")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(width: 24)
                    Text("Files · \(count)")
                        .font(.hanken(14))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .frame(height: 40)
            .padding(.leading, 26)
            .accessibilityIdentifier("v2-drawer-files-row")
            .accessibilityLabel("Files, \(count)")
        }
    }

    private func newMissionRow(project: ProjectSummary) -> some View {
        Button {
            raiseIntake(projectID: project.id)
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Theme.inkFaint)
                Text("New mission")
                    .font(.hanken(14))
                    .foregroundStyle(Theme.inkFaint)
                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(height: 40)
        .padding(.leading, 26)
        .accessibilityIdentifier("v2-drawer-new-mission")
        .accessibilityLabel("New mission in \(project.name)")
    }

    /// Status dots: live green, blocked/attention amber, everything else grey.
    static func dot(for status: String) -> Color {
        switch status {
        case "live": Theme.success
        case "blocked", "attention": Theme.warning
        default: Theme.inkFaint
        }
    }

    // MARK: footer

    private var footer: some View {
        HStack(spacing: 0) {
            Text(api.userDisplayName?.prefix(1).uppercased() ?? "C")
                .font(.hanken(12).weight(.bold))
                .foregroundStyle(Color.white)
                .frame(width: 32, height: 32)
                .background(Theme.avatarGradient, in: Circle())
                .accessibilityHidden(true)
            Text(V2DrawerView.accountLabel(api.userDisplayName, email: api.userEmail))
                .font(.hanken(14.5).weight(.semibold))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
                .padding(.leading, 10)
            Spacer(minLength: 0)
            Button {
                isPresented = false
                NotificationCenter.default.post(name: .v2ShowNotifications, object: nil)
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bell")
                        .font(.system(size: 17, weight: .regular))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(width: 44, height: 44)
                    if review.waitingCount > 0 {
                        Circle()
                            .fill(Theme.accent)
                            .frame(width: 7, height: 7)
                            .offset(x: -11, y: 11)
                    }
                }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-bell")
            .accessibilityLabel("Notifications")
            Button {
                isPresented = false
                router.showingSettings = true
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 17, weight: .regular))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-settings")
            .accessibilityLabel("Settings")
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
        .frame(height: 62)
    }
}
