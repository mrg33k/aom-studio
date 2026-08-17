// RouteTests.swift — Corner native iOS
// corner:native-ios Stage 3
//
// The four addressable surfaces, and the rule that a link this build cannot honour says
// so out loud. A tap that appears to do nothing is what trains people to stop tapping.

import XCTest
@testable import Corner

final class RouteTests: XCTestCase {

    // MARK: - Parsing

    func testEverySurfaceHasAURL() throws {
        XCTAssertEqual(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://review"))), .route(.review))
        XCTAssertEqual(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://organize"))), .route(.organize))
        XCTAssertEqual(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://tracker"))), .route(.tracker))
        XCTAssertEqual(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://email"))), .route(.email))
    }

    /// The surface is called Files on screen and `organize` in the web's `?view=` params.
    /// Both spellings resolve, because whoever writes the push should not have to know
    /// which vocabulary this build happened to pick.
    func testFilesAndOrganizeAreTheSameSurface() throws {
        XCTAssertEqual(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://files"))), .route(.organize))
    }

    func testHostIsCaseInsensitive() throws {
        XCTAssertEqual(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://Tracker"))), .route(.tracker))
    }

    func testRoomStillParsesWithItsEncodedID() throws {
        let target = DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://room/aom%3Amission%3Acorner%3Anative-ios")))
        guard case .room(let link) = try XCTUnwrap(target) else { return XCTFail("expected a room") }
        XCTAssertEqual(link.roomID, "aom:mission:corner:native-ios")
    }

    /// Every route can produce the URL that reaches it, and that URL parses back to the
    /// same route. Kept as one test on purpose: a route added in one direction only is
    /// exactly how a push starts silently doing nothing.
    func testRouteURLsRoundTrip() throws {
        let room = Room(world: "aom", kind: .mission(slug: "corner:native-ios", project: "corner"), title: "Native iOS", subtitle: "Corner")
        let routes: [Route] = [.review, .organize, .tracker, .email, .room(room)]
        for route in routes {
            let url = try XCTUnwrap(route.url, "\(route) has no URL — nothing can target it")
            let parsed = try XCTUnwrap(DeepLinkTarget(url: url), "\(url) did not parse back")
            switch (route, parsed) {
            case (.room(let expected), .room(let link)):
                XCTAssertEqual(link.roomID, expected.roomID)
            case (.review, .route(.review)), (.organize, .route(.organize)), (.tracker, .route(.tracker)), (.email, .route(.email)):
                break
            default:
                XCTFail("\(url) resolved to \(parsed), not \(route)")
            }
        }
    }

    /// `corner://rooms` is what api/_lib/apns.js sends when a row carried no room_id. It
    /// means "the rail" — a real answer, and better than the tap doing nothing.
    func testRoomsFallbackMeansTheRail() throws {
        XCTAssertEqual(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://rooms"))), .rail)
    }

    func testUnknownRouteAndForeignSchemeAreBothRefused() throws {
        XCTAssertNil(DeepLinkTarget(url: try XCTUnwrap(URL(string: "corner://settings"))))
        XCTAssertNil(DeepLinkTarget(url: try XCTUnwrap(URL(string: "https://www.aheadofmarket.com/dashboard"))))
    }

    // MARK: - Payloads

    /// The flat room fields carry more than the URL can (project, mission, message id),
    /// so they win when both are present.
    func testPushWithARoomStillResolvesToThatRoom() throws {
        let target = DeepLinkTarget(userInfo: [
            "room_id": "aom:agent:rex",
            "deep_link": "corner://room/aom%3Aagent%3Arex",
            "message_id": "11111111-2222-3333-4444-555555555555",
        ])
        guard case .room(let link) = try XCTUnwrap(target) else { return XCTFail("expected a room") }
        XCTAssertEqual(link.roomID, "aom:agent:rex")
        XCTAssertEqual(link.messageID, "11111111-2222-3333-4444-555555555555")
    }

    /// A push about the queue rather than one room. Nothing sends this yet — the server's
    /// only deep link today is a room — but the client half exists so turning it on is a
    /// server change alone.
    func testPushCanTargetASurfaceThatIsNotARoom() throws {
        let target = DeepLinkTarget(userInfo: ["deep_link": "corner://review"])
        XCTAssertEqual(target, .route(.review))
    }

    func testPushWithNothingToOpenIsRefusedRatherThanGuessed() {
        XCTAssertNil(DeepLinkTarget(userInfo: ["agent": "corner", "world_id": "aom"]))
    }

    // MARK: - Router

    @MainActor
    func testRouterOpensEachSurface() {
        let router = AppRouter()
        router.handle(.route(.organize))
        XCTAssertEqual(router.path, [.organize])
        router.handle(.route(.tracker))
        XCTAssertEqual(router.path, [.tracker])
        router.handle(.route(.review))
        XCTAssertEqual(router.path, [.review])
    }

    /// Replace, don't stack — across route KINDS too. Three taps should leave one screen
    /// open, not a three-deep back stack the user has to unwind.
    @MainActor
    func testMixedTapsLeaveOneScreenOpen() {
        let router = AppRouter()
        router.open(DeepLink(roomID: "aom:agent:rex"))
        router.handle(.route(.organize))
        router.open(DeepLink(roomID: "aom:project:corner"))
        XCTAssertEqual(router.path.count, 1)
        XCTAssertEqual(router.path.first?.roomID, "aom:project:corner")
    }

    @MainActor
    func testOpenRoomOnlyReportsARoom() {
        let router = AppRouter()
        router.handle(.route(.tracker))
        XCTAssertNil(router.openRoom, "a tool screen is not a room, and a banner must not be suppressed as if it were")
        XCTAssertFalse(router.isShowing(DeepLink(roomID: "aom:agent:rex")))
    }

    @MainActor
    func testRailFallbackClosesEverything() {
        let router = AppRouter()
        router.handle(.route(.tracker))
        router.handle(.rail)
        XCTAssertTrue(router.path.isEmpty)
    }

    /// A URL naming a route this build has no screen for must SURFACE, not vanish.
    @MainActor
    func testUnknownCornerURLSurfacesInsteadOfSilentlyDoingNothing() throws {
        let router = AppRouter()
        let handled = router.handle(url: try XCTUnwrap(URL(string: "corner://scribe")))
        XCTAssertFalse(handled)
        XCTAssertEqual(router.unresolvedLink, "corner://scribe")
        XCTAssertTrue(router.path.isEmpty)
    }

    /// A link that is not ours at all is not our error to report — it is simply not for
    /// this app, and raising an alert about someone else's URL would be noise.
    @MainActor
    func testForeignURLIsIgnoredWithoutAnAlert() throws {
        let router = AppRouter()
        let handled = router.handle(url: try XCTUnwrap(URL(string: "https://example.com/room/aom%3Aagent%3Arex")))
        XCTAssertFalse(handled)
        XCTAssertNil(router.unresolvedLink)
    }

    @MainActor
    func testHandlingAGoodURLOpensIt() throws {
        let router = AppRouter()
        XCTAssertTrue(router.handle(url: try XCTUnwrap(URL(string: "corner://organize"))))
        XCTAssertEqual(router.path, [.organize])
        XCTAssertNil(router.unresolvedLink)
    }

    // MARK: - A link that arrives while a modal is up

    /// THE regression. With the "could not be opened" alert presented, a room link used
    /// to dismiss the alert (proving it was consumed) and leave the navigation stack
    /// exactly where it was — the notification tap that appears to do nothing.
    /// The link must be HELD, not eaten.
    @MainActor
    func testLinkArrivingUnderAnAlertIsQueuedNotSwallowed() throws {
        let router = AppRouter()
        // A route this build has no screen for raises the alert.
        XCTAssertFalse(router.handle(url: try XCTUnwrap(URL(string: "corner://settings"))))
        XCTAssertNotNil(router.unresolvedLink)

        // Now a good room link arrives while that alert is still on screen.
        router.handle(url: try XCTUnwrap(URL(string: "corner://room/aom%3Aagent%3Arex")))
        XCTAssertNil(router.unresolvedLink, "the alert is asked to close")
        XCTAssertNotNil(router.pendingTarget, "and the link is held, not consumed")

        // Once nothing is in the way, it lands.
        router.flushPendingTarget()
        XCTAssertNil(router.pendingTarget)
        XCTAssertEqual(router.openRoom?.roomID, "aom:agent:rex")
    }

    /// The flush is idempotent — the alert button, the dismissal observer and the
    /// backstop timer all call it, and two of them must be no-ops.
    @MainActor
    func testFlushingTwiceIsHarmless() throws {
        let router = AppRouter()
        XCTAssertFalse(router.handle(url: try XCTUnwrap(URL(string: "corner://settings"))))
        router.handle(url: try XCTUnwrap(URL(string: "corner://tracker")))
        router.flushPendingTarget()
        XCTAssertEqual(router.path, [.tracker])
        router.flushPendingTarget()
        XCTAssertEqual(router.path, [.tracker])
    }

    /// With nothing presented the link applies immediately — the queue must not add a
    /// beat to the ordinary path.
    @MainActor
    func testLinkWithNoModalAppliesImmediately() throws {
        let router = AppRouter()
        router.handle(url: try XCTUnwrap(URL(string: "corner://room/aom%3Aagent%3Arex")))
        XCTAssertNil(router.pendingTarget)
        XCTAssertEqual(router.openRoom?.roomID, "aom:agent:rex")
    }

    /// Signing out must not leave a link armed for the next session.
    @MainActor
    func testCloseAllDropsAQueuedLink() throws {
        let router = AppRouter()
        XCTAssertFalse(router.handle(url: try XCTUnwrap(URL(string: "corner://settings"))))
        router.handle(url: try XCTUnwrap(URL(string: "corner://room/aom%3Aagent%3Arex")))
        XCTAssertNotNil(router.pendingTarget)
        router.closeAll()
        XCTAssertNil(router.pendingTarget)
    }
}
