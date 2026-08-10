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

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(api)
                .environmentObject(push)
                .environmentObject(router)
                .tint(Theme.accent)
                // Corner is an ink-ground product; the phone app does not offer a light
                // mode it has not been designed for.
                .preferredColorScheme(.dark)
        }
    }
}
