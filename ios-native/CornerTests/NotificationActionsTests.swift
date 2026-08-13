// NotificationActionsTests.swift — Corner native iOS tests
// corner:native-ios R18 smoothness pass, round N6
//
// Actionable needs-you notifications: the reply category's anatomy, the
// registration of BOTH categories, and the tolerant tap fallback for payloads
// that carry no room at all.

import XCTest
import UserNotifications
@testable import Corner

final class NotificationActionsTests: XCTestCase {

    // MARK: - Category anatomy

    func testReplyCategoryCarriesInlineReplyAndOpenRoom() {
        let category = PushService.replyCategory
        XCTAssertEqual(category.identifier, "CORNER_REPLY")

        let reply = category.actions.first { $0.identifier == PushService.replyActionID }
        let open = category.actions.first { $0.identifier == PushService.openRoomActionID }

        XCTAssertNotNil(reply, "the whole point is answering from the banner")
        XCTAssertTrue(reply is UNTextInputNotificationAction, "Reply is a TEXT INPUT action — Messages-style")
        XCTAssertTrue(reply?.options.contains(.authenticationRequired) == true,
                      "a reply posts under the user's name; the lock screen is the first surface a pocket reaches")
        XCTAssertEqual((reply as? UNTextInputNotificationAction)?.textInputButtonTitle, "Send")

        XCTAssertNotNil(open)
        XCTAssertTrue(open?.options.contains(.foreground) == true, "open means LOOK — the app must come up")
    }

    func testDeliveryCategoryUnchanged() {
        let category = PushService.deliveryCategory
        XCTAssertEqual(category.identifier, "CORNER_DELIVERY")
        XCTAssertEqual(Set(category.actions.map(\.identifier)),
                       [PushService.approveActionID, PushService.openActionID])
    }

    @MainActor
    func testBothCategoriesAreRegisteredWithTheCenter() async {
        _ = PushService.shared // init registers the set
        let categories = await UNUserNotificationCenter.current().notificationCategories()
        let ids = Set(categories.map(\.identifier))
        XCTAssertTrue(ids.contains("CORNER_REPLY"), "registered ids: \(ids)")
        XCTAssertTrue(ids.contains("CORNER_DELIVERY"), "registered ids: \(ids)")
    }

    // MARK: - Tolerant tap routing

    func testRoutablePayloadLandsInItsRoom() {
        let target = PushService.targetForTap(userInfo: [
            "room_id": "aom:agent:rex",
            "deep_link": "corner://room/aom%3Aagent%3Arex",
        ])
        guard case .room(let link) = target else {
            return XCTFail("expected a room target, got \(target)")
        }
        XCTAssertEqual(link.roomID, "aom:agent:rex")
    }

    /// The lean webhook lane sends payloads with NO custom keys at all. A tap
    /// must still go somewhere — the rail — because a tap that appears to do
    /// nothing trains people to stop tapping.
    func testPayloadWithNoRoomKeysFallsBackToTheRail() {
        XCTAssertEqual(PushService.targetForTap(userInfo: [:]), .rail)
        XCTAssertEqual(PushService.targetForTap(userInfo: ["aps": ["alert": "hi"]]), .rail)
    }

    /// Non-room destinations arrive as `deep_link` URL strings — the payload
    /// contract's actual route lane.
    func testDeepLinkRoutePayloadStillRoutes() {
        XCTAssertEqual(PushService.targetForTap(userInfo: ["deep_link": "corner://review"]),
                       .route(.review))
        XCTAssertEqual(PushService.targetForTap(userInfo: ["deep_link": "corner://rooms"]),
                       .rail)
    }
}
