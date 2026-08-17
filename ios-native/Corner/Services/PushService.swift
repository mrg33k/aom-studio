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
    @Published private(set) var badgeCount = 0

    /// Set from a notification tap; RootView routes on it and clears it. A target rather
    /// than a room since Stage 3: the app has four addressable surfaces and a push that
    /// can only ever open a room can only ever be about a room.
    @Published var pendingTarget: DeepLinkTarget?
    /// Set when a notification tap should open a specific delivered file, not just its
    /// room. Cleared by whoever presents it.
    @Published var pendingFile: DeliveredFile?

    private var hasAskedThisLaunch = false
    private var unreadByRoom: [String: Int] = [:]

    private override init() {
        super.init()
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        // Registered at init, not at authorization time: iOS matches a payload's
        // `category` against the categories registered RIGHT NOW, and a push that
        // arrives before registration shows as a plain banner with the actions
        // silently missing. Registering costs nothing when push is refused.
        center.setNotificationCategories([PushService.deliveryCategory, PushService.replyCategory])
    }

    // MARK: - Actionable categories

    /// The category the server stamps on a push about a file an agent just delivered.
    /// `nonisolated` because the notification-center delegate callbacks are nonisolated
    /// and comparing an action identifier must not require a hop to the main actor.
    nonisolated static let deliveryCategoryID = "CORNER_DELIVERY"
    nonisolated static let approveActionID = "CORNER_REVIEW_APPROVE"
    nonisolated static let openActionID = "CORNER_OPEN_FILE"

    nonisolated static var deliveryCategory: UNNotificationCategory {
        // APPROVE REQUIRES UNLOCKING THE PHONE. `authenticationRequired` is not
        // ceremony here: an approval cannot be undone (review-decision.js accepts its
        // undo action for dismiss rows only), it is posted under the user's name, and a
        // lock-screen button is exactly the surface a pocket or a curious kid reaches
        // first. One deliberate unlock is the cheapest guard that matches the stakes.
        let approve = UNNotificationAction(
            identifier: approveActionID,
            title: "Approve",
            options: [.authenticationRequired]
        )
        // Foreground, because "open" means look at the thing — the app has to come up.
        let open = UNNotificationAction(
            identifier: openActionID,
            title: "Open file",
            options: [.foreground]
        )
        return UNNotificationCategory(
            identifier: deliveryCategoryID,
            actions: [open, approve],
            intentIdentifiers: [],
            options: []
        )
    }

    /// The category on a plain agent reply / needs-you push (R18 N6): answer from
    /// the banner without opening the app — the Messages inline-reply treatment.
    nonisolated static let replyCategoryID = "CORNER_REPLY"
    nonisolated static let replyActionID = "CORNER_SEND_REPLY"
    nonisolated static let openRoomActionID = "CORNER_OPEN_ROOM"

    nonisolated static var replyCategory: UNNotificationCategory {
        // REPLY REQUIRES UNLOCKING THE PHONE — same reasoning as Approve: the
        // message posts under the user's name, and the lock screen is the first
        // surface a pocket reaches.
        let reply = UNTextInputNotificationAction(
            identifier: replyActionID,
            title: "Reply",
            options: [.authenticationRequired],
            textInputButtonTitle: "Send",
            textInputPlaceholder: "Message…"
        )
        let open = UNNotificationAction(
            identifier: openRoomActionID,
            title: "Open room",
            options: [.foreground]
        )
        return UNNotificationCategory(
            identifier: replyCategoryID,
            actions: [reply, open],
            intentIdentifiers: [],
            options: []
        )
    }

    /// Where a notification tap lands. Payloads from the lean webhook lane carry
    /// NO room keys at all — a tap must still go somewhere, and the rooms rail is
    /// the honest somewhere. Never a silent swallow.
    nonisolated static func targetForTap(userInfo: [AnyHashable: Any]) -> DeepLinkTarget {
        DeepLinkTarget(userInfo: userInfo) ?? .rail
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
        unreadByRoom = [:]
        applyBadgeCount()
    }

    /// Reconcile the icon against the same room rows the rail renders. Exact server
    /// counts win; an unscanned `hasUnread` contributes one (an honest lower bound),
    /// and device-local receipts suppress stale server rows immediately.
    func reconcileUnread(_ rooms: [RoomStore.RecentRoom]) {
        var next: [String: Int] = [:]
        for entry in rooms {
            let roomID = entry.room.roomID
            if ReadStateStore.shared.lastRead(for: roomID) >= entry.ts {
                next[roomID] = 0
            } else if let count = entry.unreadCount {
                next[roomID] = max(0, count)
            } else if entry.hasUnread == true {
                next[roomID] = 1
            } else if entry.hasUnread == false {
                next[roomID] = 0
            } else {
                next[roomID] = entry.ts > 0 ? 1 : 0
            }
        }
        unreadByRoom = next
        applyBadgeCount()
    }

    /// Opening one room clears one room — never the whole app's unread state.
    func markRoomRead(_ roomID: String) {
        unreadByRoom[roomID] = 0
        applyBadgeCount()
    }

    private func applyBadgeCount() {
        badgeCount = min(999, unreadByRoom.values.reduce(0, +))
        UNUserNotificationCenter.current().setBadgeCount(badgeCount) { _ in }
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
        let file = DeliveredFile(userInfo: info)

        // The approve action does its work WITHOUT opening the app — that is the whole
        // point of an actionable notification. Which means nothing on screen can report
        // the result, so this path reports it itself, either way. A silent tap is the
        // failure mode this app exists to end, and it is worse here than anywhere else
        // because the user has been told a decision was made.
        if response.actionIdentifier == PushService.approveActionID, let file {
            await PushService.shared.approveFromNotification(file)
            return
        }

        // Inline reply (R18 N6): send from the banner without ever opening the
        // app, then SAY what happened — same doctrine as approve.
        if response.actionIdentifier == PushService.replyActionID,
           let textResponse = response as? UNTextInputNotificationResponse {
            await PushService.shared.replyFromNotification(text: textResponse.userText, userInfo: info)
            return
        }

        // Stage 3: a push may name any of the four routes, not only a room. The flat
        // room fields still win when they are there — they carry more than the URL
        // can. A payload with NO room keys (the lean webhook lane) opens the rail —
        // a tap that appears to do nothing trains people to stop tapping.
        let target = PushService.targetForTap(userInfo: info)
        await MainActor.run {
            PushService.shared.pendingTarget = target
            // Both the default tap and the explicit "Open file" action land in the room;
            // the file action additionally opens the file itself.
            if response.actionIdentifier == PushService.openActionID {
                PushService.shared.pendingFile = file
            }
            if case .room(let link) = target {
                PushService.shared.markRoomRead(link.roomID)
            }
        }
    }
}

// MARK: - Delivered file (the actionable payload)

/// The file a `CORNER_DELIVERY` push is about. Built from the flat data keys the server
/// puts beside the aps dictionary — never from the alert text, which is a truncated
/// human preview and not an identifier.
struct DeliveredFile: Equatable, Identifiable {
    var id: String { url }

    let url: String
    let name: String
    let project: String
    let mission: String
    let sourcePath: String
    let sha256: String

    init?(userInfo: [AnyHashable: Any]) {
        let raw = (userInfo["file_url"] as? String)?.trimmingCharacters(in: .whitespaces) ?? ""
        guard !raw.isEmpty else { return nil }
        url = raw
        let declared = (userInfo["file_name"] as? String) ?? ""
        name = declared.isEmpty ? Attachment.displayName(from: raw) : declared
        project = (userInfo["project"] as? String) ?? ""
        mission = (userInfo["mission_slug"] as? String) ?? ""
        sourcePath = (userInfo["file_source_path"] as? String) ?? ""
        sha256 = (userInfo["file_sha256"] as? String) ?? ""
    }

    var attachment: Attachment {
        Attachment(
            url: url,
            name: name,
            mime: "",
            size: 0,
            gateStatus: "",
            sha256: sha256,
            sourcePath: sourcePath
        )
    }

    /// The bare mission leaf — review-decision.js canonicalises "<project>:<mission>"
    /// itself and double-prefixes a composite slug handed to it whole.
    var missionLeaf: String {
        mission.split(separator: ":").last.map(String.init) ?? mission
    }
}

extension PushService {

    /// Approve straight from the lock screen, and then SAY what happened.
    ///
    /// A local notification is the only surface available: the app was never brought
    /// forward, so there is no view to update and no toast to show. Both outcomes are
    /// posted — success names the file, failure says plainly that nothing was recorded
    /// and the file is still waiting, because a user who tapped Approve and heard
    /// nothing will assume it worked.
    /// Send an inline reply from the banner, and then SAY what happened. The app
    /// was never brought forward, so a local notification is the only surface —
    /// and a failure must carry the typed words back, because text that vanishes
    /// into a failed send is the worst outcome a reply button can produce.
    func replyFromNotification(text: String, userInfo: [AnyHashable: Any]) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let room = DeepLink(userInfo: userInfo)?.resolveRoom()

        let content = UNMutableNotificationContent()
        if let room {
            do {
                _ = try await CornerAPI.shared.send(text: trimmed, room: room, interactionMode: "work")
                content.title = "Sent to \(room.title)"
                content.body = trimmed.count > 80 ? String(trimmed.prefix(77)) + "…" : trimmed
            } catch {
                content.title = "Not sent"
                content.body = "Your reply to \(room.title) didn't go through. It was: \u{201C}\(trimmed)\u{201D} — open the room to send it."
            }
        } else {
            content.title = "Not sent"
            content.body = "This notification didn't say which room to reply into. Your reply was: \u{201C}\(trimmed)\u{201D}."
        }
        content.sound = nil
        try? await UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        )
    }

    func approveFromNotification(_ file: DeliveredFile) async {
        let ok = await ReviewStore.shared.decide(
            attachment: file.attachment,
            action: .approve,
            project: file.project,
            mission: file.missionLeaf
        )
        let content = UNMutableNotificationContent()
        if ok {
            content.title = "Approved"
            content.body = "\(file.name) — the room has been told."
        } else {
            content.title = "Not approved"
            content.body = "\(file.name) could not be approved just now. Nothing was recorded — it is still waiting for you."
        }
        content.sound = nil
        try? await UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        )
    }
}
