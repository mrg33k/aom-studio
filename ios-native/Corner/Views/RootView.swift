// RootView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Auth gate plus the navigation stack every deep link lands in.

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
                        .navigationDestination(for: Room.self) { room in
                            ChatView(room: room)
                        }
                }
            } else {
                SignInView()
            }
        }
        .background(Theme.ground)
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
        .onChange(of: push.pendingDeepLink) { _, link in
            guard let link else { return }
            router.open(link)
            push.pendingDeepLink = nil
        }
        .onOpenURL { url in
            guard let link = DeepLink(url: url) else { return }
            router.open(link)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { push.clearBadge() }
        }
        .alert(
            "That room could not be opened",
            isPresented: Binding(
                get: { router.unresolvedLink != nil },
                set: { if !$0 { router.unresolvedLink = nil } }
            )
        ) {
            Button("OK", role: .cancel) { router.unresolvedLink = nil }
        } message: {
            // A tap that appears to do nothing is the worst possible answer to a
            // notification. Say what happened, even when it is unflattering.
            Text("The notification points at a room this version of Corner does not know how to open. It is still there on the web.")
        }
    }
}
