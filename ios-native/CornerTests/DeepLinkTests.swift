// DeepLinkTests.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Exercises the deep-link contract against the EXACT payload api/_lib/apns.js sends.
// A notification that opens the wrong room, or opens nothing, is the failure that
// makes people stop tapping notifications altogether.

import XCTest
@testable import Corner

final class DeepLinkTests: XCTestCase {

    /// Copy of the `data` dictionary built in api/_lib/apns.js.
    private func apnsPayload(
        roomID: String?,
        project: String? = nil,
        missionSlug: String? = nil,
        deepLink: String? = nil
    ) -> [AnyHashable: Any] {
        var info: [AnyHashable: Any] = [
            "message_id": "11111111-2222-3333-4444-555555555555",
            "agent": "corner",
            "world_id": "aom",
            "url": "/dashboard",
        ]
        if let roomID { info["room_id"] = roomID }
        if let project { info["project"] = project }
        if let missionSlug { info["mission_slug"] = missionSlug }
        if let deepLink { info["deep_link"] = deepLink }
        return info
    }

    func testAgentPushOpensTheAgentRoom() throws {
        let link = try XCTUnwrap(DeepLink(userInfo: apnsPayload(
            roomID: "aom:agent:rex",
            deepLink: "corner://room/aom%3Aagent%3Arex"
        )))
        let room = try XCTUnwrap(link.resolveRoom())
        XCTAssertEqual(room.roomID, "aom:agent:rex")
        XCTAssertEqual(link.messageID, "11111111-2222-3333-4444-555555555555")
    }

    func testMissionPushResolvesProjectFromThePayload() throws {
        let link = try XCTUnwrap(DeepLink(userInfo: apnsPayload(
            roomID: "aom:mission:corner:native-ios",
            project: "corner",
            missionSlug: "corner:native-ios",
            deepLink: "corner://room/aom%3Amission%3Acorner%3Anative-ios"
        )))
        let room = try XCTUnwrap(link.resolveRoom())
        guard case .mission(let slug, let project) = room.kind else {
            return XCTFail("expected a mission room")
        }
        XCTAssertEqual(slug, "corner:native-ios")
        XCTAssertEqual(project, "corner")
        XCTAssertEqual(room.roomID, "aom:mission:corner:native-ios")
    }

    /// The flat `room_id` field and the encoded `deep_link` URL must agree. If the
    /// server ever sends only one of them, the app still routes.
    func testDeepLinkURLAloneIsEnough() throws {
        var info = apnsPayload(roomID: nil, deepLink: "corner://room/aom%3Aagent%3Aelon")
        info.removeValue(forKey: "room_id")
        let link = try XCTUnwrap(DeepLink(userInfo: info))
        XCTAssertEqual(link.roomID, "aom:agent:elon")
    }

    func testFlatRoomIDAloneIsEnough() throws {
        let link = try XCTUnwrap(DeepLink(userInfo: apnsPayload(roomID: "aom:agent:elon")))
        XCTAssertEqual(link.roomID, "aom:agent:elon")
    }

    func testPayloadWithNoRoomIsRejectedRatherThanGuessed() {
        XCTAssertNil(DeepLink(userInfo: apnsPayload(roomID: nil)))
        // `corner://rooms` is the server's fallback when a row had no room_id. It is
        // not a room, so it must not resolve to one.
        XCTAssertNil(DeepLink(userInfo: apnsPayload(roomID: nil, deepLink: "corner://rooms")))
    }

    func testURLSchemeOpen() throws {
        let url = try XCTUnwrap(URL(string: "corner://room/aom%3Aproject%3Acorner"))
        let link = try XCTUnwrap(DeepLink(url: url))
        XCTAssertEqual(link.roomID, "aom:project:corner")
        XCTAssertEqual(try XCTUnwrap(link.resolveRoom()).roomID, "aom:project:corner")
    }

    func testForeignSchemeIsRefused() {
        XCTAssertNil(DeepLink(url: URL(string: "https://example.com/room/aom%3Aagent%3Arex")!))
        XCTAssertNil(DeepLink(url: URL(string: "corner://settings")!))
    }

    /// A room this build cannot construct must fail LOUDLY (unresolvedLink), never
    /// silently — a notification tap that does nothing is the worst possible answer.
    @MainActor
    func testUnresolvableRoomSurfacesInsteadOfSilentlyDoingNothing() {
        let router = AppRouter()
        router.open(DeepLink(roomID: "aom:teleport:somewhere"))
        XCTAssertTrue(router.path.isEmpty)
        XCTAssertEqual(router.unresolvedLink, "aom:teleport:somewhere")
    }

    /// Three banners for three rooms should leave ONE room open, not a three-deep
    /// back stack the user has to unwind.
    @MainActor
    func testRepeatedDeepLinksReplaceRatherThanStack() {
        let router = AppRouter()
        router.open(DeepLink(roomID: "aom:agent:rex"))
        router.open(DeepLink(roomID: "aom:agent:elon"))
        router.open(DeepLink(roomID: "aom:project:corner"))
        XCTAssertEqual(router.path.count, 1)
        XCTAssertEqual(router.path.first?.roomID, "aom:project:corner")
    }

    @MainActor
    func testBannerIsSuppressedOnlyForTheRoomAlreadyOpen() {
        let router = AppRouter()
        router.open(DeepLink(roomID: "aom:agent:rex"))
        XCTAssertTrue(router.isShowing(DeepLink(roomID: "aom:agent:rex")))
        XCTAssertFalse(router.isShowing(DeepLink(roomID: "aom:agent:elon")))
        XCTAssertFalse(router.isShowing(DeepLink?.none))
    }
}
