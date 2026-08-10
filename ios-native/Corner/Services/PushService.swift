// PushService.swift — Corner native iOS
// corner:native-ios Stage 1
//
// THE REASON THIS APP EXISTS. A WKWebView's realtime socket dies the moment iOS
// suspends the app, so a reply that lands while the phone is in a pocket is invisible
// until the user reopens the app and the socket reconnects. No amount of native code
// keeps a socket alive in the background — iOS suspends every app. The correct
// architecture is push-driven delivery: APNs carries the fact that something arrived,
// the socket is a foreground accelerator, and on foreground the client reconciles.
//
// PERMISSION IS ASKED AFTER THE FIRST REPLY, NOT AT LAUNCH. A launch-time prompt is
// asked before the user knows what they would be allowing, so it gets denied, and iOS
// gives you exactly one shot. `requestAuthorizationAfterFirstReply()` is called from
// the thread when an agent answers — the one moment the value is self-evident.
//
// PUSH IS AN ENHANCEMENT, NEVER A REQUIREMENT (guideline 4.5.4). Everything in this
// app works with notifications refused: the thread still loads, the reconcile poll
// still runs, foreground catch-up still fills gaps. Denial costs a banner, not a
// feature.

import Foundation
import UIKit
import UserNotifications

@MainActor
final class PushService: NSObject, ObservableObject {

    static let shared = PushService()

    /// The APNs device token this launch produced, hex-encoded. Nil until the system
    /// hands one over (or forever, if the user refused).
    @Published private(set) var deviceToken: String?
    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    /// Set when registration with our own server failed, so the account screen can say
    /// "notifications are off because the server never got this device" instead of
    /// leaving the user to wonder why a granted permission produces no banners.
    @Published private(set) var registrationError: String?

    /// Set from a notification tap; RootView routes on it and clears it.
    @Published var pendingDeepLink: DeepLink?

    private var hasAskedThisLaunch = false

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    // MARK: - Lifecycle

    /// Called at launch. Registers with APNs only if the user ALREADY authorized —
    /// this must never be the thing that shows a prompt.
    func refreshAuthorizationAndRegisterIfAllowed() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
        if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    /// The moment worth asking at: an agent just replied, so what a notification is FOR
    /// is now obvious. Asks once per launch and only while undetermined — re-asking a
    /// denial does nothing but burn a system call.
    func requestAuthorizationAfterFirstReply() async {
        guard !hasAskedThisLaunch else { return }
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
        guard settings.authorizationStatus == .notDetermined else { return }
        hasAskedThisLaunch = true
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
            authorizationStatus = granted ? .authorized : .denied
            if granted { UIApplication.shared.registerForRemoteNotifications() }
        } catch {
            authorizationStatus = .denied
        }
    }

    /// Explicit opt-in from the account screen, for someone who said no earlier or
    /// wants to turn it on before ever chatting.
    func requestAuthorizationExplicitly() async -> Bool {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        if settings.authorizationStatus == .denied {
            // iOS will not re-prompt; Settings is the only road back and saying so is
            // more useful than a button that appears to do nothing.
            authorizationStatus = .denied
            return false
        }
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
            authorizationStatus = granted ? .authorized : .denied
            if granted { UIApplication.shared.registerForRemoteNotifications() }
            return granted
        } catch {
            return false
        }
    }

    // MARK: - Token plumbing

    func didRegister(deviceToken raw: Data) {
        let hex = raw.map { String(format: "%02x", $0) }.joined()
        deviceToken = hex
        Task { await sendTokenToServer(hex) }
    }

    func didFailToRegister(error: Error) {
        registrationError = error.localizedDescription
    }

    /// iOS re-issues a token on every launch and we re-register every time; the server
    /// upserts on the unique token, so this is idempotent by design and a second row
    /// (which would mean two banners on one phone) cannot happen.
    private func sendTokenToServer(_ token: String) async {
        guard CornerAPI.shared.session != nil else { return }
        do {
            try await CornerAPI.shared.registerDevice(token: token)
            registrationError = nil
        } catch {
            registrationError = error.localizedDescription
        }
    }

    /// Re-send the token after a sign-in, so signing in on a device that already has a
    /// token does not silently leave that phone unreachable until the next cold launch.
    func registerCurrentTokenIfAny() async {
        guard let deviceToken else { return }
        await sendTokenToServer(deviceToken)
    }

    /// Sign-out: drop this device's row. Without it the row keeps pointing at the world
    /// the previous user belonged to, and the next person holding the phone gets that
    /// world's room names on their lock screen.
    func unregisterCurrentDevice() async {
        guard let deviceToken else { return }
        try? await CornerAPI.shared.unregisterDevice(token: deviceToken)
    }

    func clearBadge() {
        UNUserNotificationCenter.current().setBadgeCount(0) { _ in }
    }
}

// MARK: - Notification delegate

extension PushService: UNUserNotificationCenterDelegate {

    /// A banner for the room already on screen is noise; every other room's is not.
    /// The check is done in the router because it holds the open room.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        let info = notification.request.content.userInfo
        let link = DeepLink(userInfo: info)
        let isOpenRoom = await MainActor.run { AppRouter.shared.isShowing(link) }
        return isOpenRoom ? [] : [.banner, .sound, .list]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let info = response.notification.request.content.userInfo
        guard let link = DeepLink(userInfo: info) else { return }
        await MainActor.run {
            PushService.shared.pendingDeepLink = link
            PushService.shared.clearBadge()
        }
    }
}
