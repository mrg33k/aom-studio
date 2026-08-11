// CornerApp.swift — Corner native iOS
// corner:native-ios Stage 1
//
// App entry. The AppDelegate exists for exactly one reason: APNs device tokens are
// delivered through UIApplicationDelegate and there is no SwiftUI equivalent.
// Everything else routes through SwiftUI.

import SwiftUI
import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Touch the shared services on the main actor so the notification-center
        // delegate is installed before any notification can be delivered.
        Task { @MainActor in
            _ = PushService.shared
            await PushService.shared.refreshAuthorizationAndRegisterIfAllowed()
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in PushService.shared.didRegister(deviceToken: deviceToken) }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in PushService.shared.didFailToRegister(error: error) }
    }
}

@main
struct CornerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    @StateObject private var api = CornerAPI.shared
    @StateObject private var push = PushService.shared
    @StateObject private var router = AppRouter.shared
    @StateObject private var theme = ThemeManager.shared

    init() {
        CornerTypography.install()
    }

    var body: some Scene {
        WindowGroup {
            rootContent
                // Theme.* members resolve through ThemeManager lazily; re-identifying
                // the tree on a change is what repaints every screen at once — the
                // web's "updates the shell and every screen immediately", natively.
                .id(theme.kind)
                .environmentObject(api)
                .environmentObject(push)
                .environmentObject(router)
                .tint(Theme.accent)
                // Unstyled text (button labels, alerts) rides the brand face too.
                .environment(\.font, .hkBody)
                .preferredColorScheme(theme.colorScheme)
        }
    }

    @ViewBuilder
    private var rootContent: some View {
        #if DEBUG
        // No-network, no-auth design proofs, used only by the simctl design captures
        // (`-homePreview`, `-chatPreview`, `-composerPreview`). Synthetic data, Debug
        // builds only, no production data touched.
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-chatPreview") {
            ChatPreviewHarness()
        } else if args.contains("-settingsPreview") {
            // The Settings sheet's own render, no auth: identity rows show their
            // signed-out placeholders, the workspace list shows its failure row.
            AccountView()
                .environmentObject(api)
                .environmentObject(push)
        } else if args.contains("-composerPreview") {
            HomeComposerPreviewHarness()
        } else if args.contains("-confirmPreview") {
            ConfirmPreviewHarness()
        } else if args.contains("-homePreview") {
            HomePreviewHarness()
        } else {
            RootView()
        }
        #else
        RootView()
        #endif
    }
}
