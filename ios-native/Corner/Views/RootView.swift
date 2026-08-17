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

    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if api.session != nil {
                NavigationStack(path: $router.path) {
                    RoomListView()
                        .navigationDestination(for: Route.self) { route in
                            switch route {
                            case .room(let room): ChatView(room: room)
                            case .review:         ReviewQueueView()
                            case .organize:       OrganizeView()
                            case .tracker:        TrackerView()
                            case .email:          EmailView()
                            }
                        }
                }
            } else {
                SignInView()
            }
        }
        .groundBackground()
        .task(id: api.session?.user.id) {
            guard api.session != nil else { return }
            router.restoreLastRoom(for: api.world)
        }
        .onChange(of: api.session?.user.id) { _, newValue in
            if newValue == nil {
                router.closeAll()
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
}
