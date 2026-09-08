// RootView.swift — Corner native iOS
// corner:native-ios Stages 1 + 3
//
// Auth gate plus the navigation stack every deep link lands in.
//
// ONE STACK, FOUR DESTINATIONS. Rooms, Review, Files and Tracker are all pushed onto the
// same path, so `corner://organize` and a tap on the rail's Files row arrive at exactly
// the same screen in exactly the same state. A second navigation mechanism for "tools"
// would be a second set of bugs.
//
// EVERY SURFACE IS SwiftUI. No WKWebView, no SFSafariViewController, no embedded web
// content anywhere in this target — the last of the wrap is gone. External links (a
// client's ticket pointing at their live site, a store URL that failed to download) leave
// for Safari on purpose: the open web is not a Corner surface and should never wear
// Corner's chrome.

import SwiftUI

struct RootView: View {
    @EnvironmentObject private var api: CornerAPI
    @EnvironmentObject private var push: PushService
    @EnvironmentObject private var router: AppRouter
    /// R17 P061: the setup flow covers the signed-in app until done.
    @State private var showSetup = false
    @State private var setupInitialStep = 0
    @StateObject private var v2home = WorkspaceStore.shared
    /// R23 P070: drawer-raised sheets, hosted at the entry above the stack.
    @ObservedObject private var intake = V2IntakeStore.shared
    @State private var showingVoice = false
    @State private var showingNotifications = false
    /// Legacy rail data for the notifications sheet (read-only since the
    /// tree retired; the tree used to own this fetch).
    @StateObject private var legacy = RoomStore()

    /// R17 P062: the workspace is loaded and holds no real projects and no
    /// missions. (General alone, fresh from ensureWorkspace, counts as empty.)
    private var homeIsEmpty: Bool {
        guard let workspace = v2home.workspace else { return false }
        let real = workspace.projects.filter { $0.kind != .general }
        let missions = workspace.projects.flatMap(\.missions)
        return real.isEmpty && missions.isEmpty
    }

    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if api.session != nil, api.mustChangePassword {
                SetPasswordView()
            } else if api.session != nil {
                NavigationStack(path: $router.path) {
                    // R23 P070: the entry IS a thread — the last one open, or
                    // General's. The home tree is retired: no route leads to
                    // RoomListView anymore (it stays compiled for the archive
                    // types it defines). R17 P062: no real projects yet → the
                    // empty home, with its CTAs jumping into setup.
                    Group {
                        if homeIsEmpty {
                            V2EmptyHomeView(
                                onStartProject: {
                                    setupInitialStep = 5
                                    showSetup = true
                                },
                                onBringContext: {
                                    setupInitialStep = 0
                                    showSetup = true
                                }
                            )
                        } else {
                            V2EntryRoot()
                        }
                    }
                        .navigationDestination(for: Route.self) { route in
                            switch route {
                            case .room(let room): ChatView(room: room)
                            case .review:         ReviewQueueView()
                            case .organize:       OrganizeView()
                            case .tracker:        TrackerView()
                            case .email:          EmailView()
                            case .workspace:      V2EntryRoot()
                            case .project(let id): V2ProjectChatView(projectID: id)
                            case .mission(let id): V2MissionChatView(missionID: id)
                            case .visualTab(let id): V2VisualTabView(tabID: id)
                            case .legacyArchive:  LegacyArchiveView()
                            }
                        }
                }
                // R23 P070: the drawer owns no sheets, so the entry raises
                // them — intake, voice, notifications, and settings live here,
                // above the stack, reachable from every thread.
                .sheet(isPresented: $router.showingSettings) {
                    V2SettingsView()
                        .environmentObject(api)
                        .environmentObject(router)
                }
                .sheet(isPresented: $intake.isPresented) {
                    V2IntakeSheetView()
                }
                .sheet(isPresented: $showingVoice) { AirPodsVoiceView() }
                .sheet(isPresented: $showingNotifications) {
                    NotificationsView(recent: legacy.recent)
                        .environmentObject(router)
                }
                .onReceive(NotificationCenter.default.publisher(for: .v2FocusIntake)) { note in
                    V2IntakeStore.shared.open(projectID: note.userInfo?["projectID"] as? String)
                }
                .onReceive(NotificationCenter.default.publisher(for: .v2RecordCall)) { _ in
                    showingVoice = true
                }
                .onReceive(NotificationCenter.default.publisher(for: .v2ShowNotifications)) { _ in
                    showingNotifications = true
                }
                // R17 P061: first run lands in setup, over the home.
                .fullScreenCover(isPresented: $showSetup) {
                    V2SetupView(initialStep: setupInitialStep) {
                        showSetup = false
                        Task { await v2home.refresh() }
                    }
                }
                .task(id: api.session?.user.id) {
                    guard api.session != nil else { return }
                    await v2home.refresh()
                    resolveEntry()
                    if !legacy.hasLoadedOnce { await legacy.load() }
                    if V2SetupStore.needsSetup { showSetup = true }
                }
                // The subscription can deliver a workspace after the refresh
                // above resolved nothing (or after setup creates the first
                // project): resolve into the entry, never over navigation.
                .onChange(of: v2home.workspace) { _, _ in resolveEntry() }
                .onReceive(NotificationCenter.default.publisher(for: .v2RerunSetup)) { _ in
                    setupInitialStep = 0
                    showSetup = true
                }
            } else {
                SignInView()
            }
        }
        .groundBackground()
        .task {
            #if DEBUG
            // Hermetic v2 flow tests: synthetic session before anything reads auth.
            if ProcessInfo.processInfo.arguments.contains("-v2FixtureUITest") {
                api.installFixtureSession()
            }
            #endif
        }
        .task(id: api.session?.user.id) {
            guard api.session != nil else { return }
            router.restoreLastRoom(for: api.world)
        }
        .onChange(of: api.session?.user.id) { _, newValue in
            if newValue == nil {
                router.closeAll()
                // The next sign-in re-resolves from the stored last thread.
                router.forgetEntry()
            } else {
                // Signing in on a device that already holds a token would otherwise
                // leave that phone unreachable until the next cold launch.
                Task {
                    await push.refreshAuthorizationAndRegisterIfAllowed()
                    await push.registerCurrentTokenIfAny()
                }
            }
        }
        .onChange(of: push.pendingTarget) { _, target in
            guard let target else { return }
            router.handle(target)
            push.pendingTarget = nil
        }
        // The alert has gone: anything the alert was standing in front of can run now.
        // A deep link that arrives while a modal is up is queued rather than applied,
        // because a navigation made in the same update as a dismissal is swallowed —
        // the alert closes and the stack never moves, which is a tap that did nothing.
        .onChange(of: router.unresolvedLink) { _, newValue in
            if newValue == nil { router.flushPendingTarget() }
        }
        .onChange(of: router.showingSettings) { _, isShowing in
            if !isShowing { router.flushPendingTarget() }
        }
        // "Open file" from a delivery notification opens the file, over the room it
        // arrived in. Routing to the room alone would leave the user hunting a thread
        // for the thing the notification was about, which is the tap doing half its job.
        .sheet(item: $push.pendingFile) { file in
            FilePreviewView(
                attachment: file.attachment,
                reviewContext: FilePreviewView.ReviewContext(
                    project: file.project,
                    mission: file.missionLeaf,
                    isWaiting: true
                )
            )
        }
        .onOpenURL { url in
            #if DEBUG
            // Walk-rig session hand-off (Debug builds only; see DebugAuth.swift).
            if DebugAuth.handle(url) { return }
            #endif
            // Refuses rather than guesses: a `corner://` URL naming a route this build
            // has no screen for raises the alert below instead of doing nothing.
            router.handle(url: url)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                // A user who enables notifications in Settings returns to an app
                // that was already running. Refreshing only at cold launch left that
                // phone with permission granted but no APNs token row until restart.
                Task {
                    await push.refreshAuthorizationAndRegisterIfAllowed()
                    await push.registerCurrentTokenIfAny()
                }
            }
        }
        .alert(
            "That link could not be opened",
            isPresented: Binding(
                get: { router.unresolvedLink != nil },
                set: { if !$0 { router.unresolvedLink = nil } }
            )
        ) {
            Button("OK", role: .cancel) {
                router.unresolvedLink = nil
                // A link that arrived while this alert was up is waiting behind it.
                router.flushPendingTarget()
            }
        } message: {
            // A tap that appears to do nothing is the worst possible answer to a
            // notification. Say what happened, even when it is unflattering.
            Text("It points somewhere this version of Corner does not know how to open. It is still there on the web.")
        }
    }

    /// R23 P070: resolve the entry thread once per workspace arrival. A set
    /// entry is navigation and is never clobbered by a tree refresh.
    private func resolveEntry() {
        guard router.entryRoute == nil, let workspace = v2home.workspace else { return }
        router.entryRoute = router.resolveEntryRoute(in: workspace)
    }
}

// MARK: - Corner v2 entry (R23 P070)

// The stack root: the last open thread, or General's. While the workspace is
// still loading the root is plain ground — no intermediate page, never the
// retired tree, never an error. Stale or foreign stored threads already fell
// back to General inside resolveEntryRoute.
struct V2EntryRoot: View {
    @EnvironmentObject private var router: AppRouter
    @ObservedObject private var v2 = WorkspaceStore.shared

    var body: some View {
        Group {
            // The `.id` keys are the whole trick: a thread replace renders the
            // same loader TYPE at the same position, and without a new
            // identity SwiftUI updates it in place — stale thread, `.task`
            // never re-fires. Keyed by thread, every replace is a fresh load.
            switch effectiveRoute {
            case .project(let id):
                V2ProjectChatView(projectID: id)
                    .id("entry-project-\(id)")
            case .mission(let id):
                V2MissionChatView(missionID: id)
                    .id("entry-mission-\(id)")
            case .visualTab(let id):
                V2VisualTabView(tabID: id)
                    .id("entry-tab-\(id)")
            default:
                // R42 P089: the living Corner mark — cold start shows the
                // logo breathing on the ground, never a spinner, never text.
                V2LoadingMark(tint: Theme.accent)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .groundBackground()
                .overlay(alignment: .top) {
                    Color.clear.frame(width: 1, height: 1)
                        .accessibilityIdentifier("v2-entry-loading")
                }
            }
        }
    }

    /// The stored entry when it is a thread route; the fresh resolution while
    /// RootView's stored resolve is still in flight; nil (loading) until the
    /// workspace arrives.
    private var effectiveRoute: Route? {
        if let entry = router.entryRoute, AppRouter.isEntryRoute(entry) { return entry }
        if let workspace = v2.workspace { return router.resolveEntryRoute(in: workspace) }
        return nil
    }
}

// MARK: - Corner v2 route loaders (native Task 4)
//
// A project/mission route carries only an id; the thread plus its owning
// summaries load here, then the shared `ChatView(thread:project:mission:)`
// surface renders. One surface for both — never a specialist chat screen.

struct V2ProjectChatView: View {
    let projectID: String
    @State private var thread: Thread?
    @State private var project: ProjectSummary?
    @State private var errorText: String?

    var body: some View {
        Group {
            if let thread, let project {
                ChatView(thread: thread, project: project, mission: nil)
            } else if let errorText {
                VStack(spacing: Theme.s3) {
                    Text(errorText)
                        .font(.hkFootnote)
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                    Button("Try again") { Task { await load() } }
                        .font(.hkBody.weight(.semibold))
                        .foregroundStyle(Theme.accent)
                }
                .padding(Theme.s4)
                .groundBackground()
            } else {
                // R42 P089: project switches breathe the same mark.
                V2LoadingMark(tint: Theme.accent)
                    .groundBackground()
                    .task { await load() }
            }
        }
    }

    @MainActor
    private func load() async {
        errorText = nil
        #if DEBUG
        // R42 UI-test seed: hold the loader on screen so the mark (and the
        // absence of the old spinner copy) is assertable, not a race.
        if ProcessInfo.processInfo.arguments.contains("-v2SeedLoader") {
            try? await Task.sleep(for: .seconds(6))
        }
        #endif
        let store = WorkspaceStore.shared
        await store.refresh()
        guard let found = store.project(id: projectID) else {
            errorText = "This project is not in the workspace."
            return
        }
        do {
            if let loaded = try await store.threadForProject(projectID) {
                project = found
                thread = loaded
            } else {
                errorText = "This project has no conversation yet."
            }
        } catch {
            errorText = "The conversation could not be loaded."
        }
    }
}

struct V2MissionChatView: View {
    let missionID: String
    @State private var thread: Thread?
    @State private var project: ProjectSummary?
    @State private var mission: MissionSummary?
    @State private var errorText: String?

    var body: some View {
        Group {
            if let thread, let project, let mission {
                ChatView(thread: thread, project: project, mission: mission)
            } else if let errorText {
                VStack(spacing: Theme.s3) {
                    Text(errorText)
                        .font(.hkFootnote)
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                    Button("Try again") { Task { await load() } }
                        .font(.hkBody.weight(.semibold))
                        .foregroundStyle(Theme.accent)
                }
                .padding(Theme.s4)
                .groundBackground()
            } else {
                // R42 P089: mission switches breathe the same mark.
                V2LoadingMark(tint: Theme.accent)
                    .groundBackground()
                    .task { await load() }
            }
        }
    }

    @MainActor
    private func load() async {
        errorText = nil
        let store = WorkspaceStore.shared
        await store.refresh()
        guard let found = store.mission(id: missionID) else {
            errorText = "This mission is not in the workspace."
            return
        }
        do {
            if let loaded = try await store.threadForMission(missionID) {
                project = found.project
                mission = found.mission
                thread = loaded
            } else {
                errorText = "This mission has no conversation yet."
            }
        } catch {
            errorText = "The conversation could not be loaded."
        }
    }
}

/// A Visual Window deep link resolves to the tab's owning thread (Task 6 owns
/// the window itself; until then the conversation is the destination, never a
/// dead end).
struct V2VisualTabView: View {
    let tabID: String
    @State private var thread: Thread?
    @State private var project: ProjectSummary?
    @State private var mission: MissionSummary?
    @State private var errorText: String?

    var body: some View {
        Group {
            if let thread, let project {
                ChatView(thread: thread, project: project, mission: mission)
            } else if let errorText {
                VStack(spacing: Theme.s3) {
                    Text(errorText)
                        .font(.hkFootnote)
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                    Button("Back to workspace") { AppRouter.shared.closeAll() }
                        .font(.hkBody.weight(.semibold))
                        .foregroundStyle(Theme.accent)
                }
                .padding(Theme.s4)
                .groundBackground()
            } else {
                // R42 P089: tab switches breathe the same mark.
                V2LoadingMark(tint: Theme.accent)
                    .groundBackground()
                    .task { await load() }
            }
        }
    }

    @MainActor
    private func load() async {
        errorText = nil
        let store = WorkspaceStore.shared
        await store.refresh()
        guard let workspace = store.workspace else {
            errorText = "The workspace could not be loaded."
            return
        }
        let api = DefaultCornerV2API()
        var threads: [(threadID: String, sessionID: String, project: ProjectSummary, mission: MissionSummary?)] = []
        for project in workspace.projects {
            if let session = try? await api.thread(projectID: project.id) {
                threads.append((project.threadID, session.visualSessionID, project, nil))
            }
            for mission in project.missions {
                if let session = try? await api.thread(missionID: mission.id) {
                    threads.append((mission.threadID, session.visualSessionID, project, mission))
                }
            }
        }
        for candidate in threads {
            if let tabs = try? await api.visualTabs(visualSessionID: candidate.sessionID),
               tabs.contains(where: { $0.id == tabID }) {
                if let owningMission = candidate.mission {
                    thread = Thread(
                        id: candidate.threadID, ownerType: .mission,
                        projectID: candidate.project.id, missionID: owningMission.id,
                        visualSessionID: candidate.sessionID
                    )
                } else {
                    thread = Thread(
                        id: candidate.threadID, ownerType: .project,
                        projectID: candidate.project.id, missionID: nil,
                        visualSessionID: candidate.sessionID
                    )
                }
                project = candidate.project
                mission = candidate.mission
                return
            }
        }
        errorText = "This tab is no longer open."
    }
}
