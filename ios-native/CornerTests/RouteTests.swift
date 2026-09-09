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

    /// Replacing the screen already open is a POP THEN PUSH — a single assignment that
    /// leaves the count at 1 is folded away by SwiftUI and never reaches the screen.
    /// `applyDeferredPush()` is the second phase, run here without racing a sleep.
    @MainActor
    func testRouterOpensEachSurface() {
        let router = AppRouter()
        router.handle(.route(.organize))
        XCTAssertEqual(router.path, [.organize])
        router.handle(.route(.tracker))
        router.applyDeferredPush()
        XCTAssertEqual(router.path, [.tracker])
        router.handle(.route(.review))
        router.applyDeferredPush()
        XCTAssertEqual(router.path, [.review])
    }

    /// Replace, don't stack — across route KINDS too. Three taps should leave one screen
    /// open, not a three-deep back stack the user has to unwind.
    @MainActor
    func testMixedTapsLeaveOneScreenOpen() {
        let router = AppRouter()
        router.open(DeepLink(roomID: "aom:agent:rex"))
        router.handle(.route(.organize))
        router.applyDeferredPush()
        router.open(DeepLink(roomID: "aom:project:corner"))
        router.applyDeferredPush()
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

    // MARK: - Replacing the room already on screen

    /// THE bigger half of the swallow, and it needs no alert at all. `path = [other]`
    /// on a non-empty stack leaves the count at 1, SwiftUI folds it away, and the screen
    /// never moves — measured on the simulator, where opening any room while another
    /// room was open did nothing. That is most notification taps.
    @MainActor
    func testOpeningARoomWhileAnotherIsOpenPopsThenPushes() throws {
        let router = AppRouter()
        router.handle(url: try XCTUnwrap(URL(string: "corner://room/aom%3Aagent%3Arex")))
        XCTAssertEqual(router.openRoom?.roomID, "aom:agent:rex")

        router.handle(url: try XCTUnwrap(URL(string: "corner://room/aom%3Amission%3Acorner%3Anative-ios")))
        XCTAssertTrue(router.path.isEmpty, "popped first, so the count actually changes")
        XCTAssertNotNil(router.deferredPush, "and the push is armed, not lost")

        router.applyDeferredPush()
        XCTAssertEqual(router.openRoom?.roomID, "aom:mission:corner:native-ios")
        XCTAssertNil(router.deferredPush)
    }

    /// Re-opening the room already on screen is still a no-op — the two-phase replace
    /// must not make a redundant tap flash the rail.
    @MainActor
    func testOpeningTheRoomAlreadyOpenDoesNotPop() throws {
        let router = AppRouter()
        router.handle(url: try XCTUnwrap(URL(string: "corner://room/aom%3Aagent%3Arex")))
        router.handle(url: try XCTUnwrap(URL(string: "corner://room/aom%3Aagent%3Arex")))
        XCTAssertEqual(router.openRoom?.roomID, "aom:agent:rex")
        XCTAssertNil(router.deferredPush)
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

    // MARK: - R23 P070 entry (the stack root is a thread)

    @MainActor
    private func entryRouter() -> (AppRouter, UserDefaults) {
        let defaults = UserDefaults(suiteName: "r23-entry-\(UUID().uuidString)")!
        return (AppRouter(defaults: defaults), defaults)
    }

    private func entryWorkspace() -> WorkspaceSummary {
        let general = ProjectSummary(
            id: "proj-general-1", workspaceID: "world-1", name: "General",
            kind: .general, tintHex: "#8B5CF6", needsAttention: false,
            threadID: "thread-general-1", missions: []
        )
        let aster = ProjectSummary(
            id: "proj-aster-1", workspaceID: "world-1", name: "Aster",
            kind: .standard, tintHex: "#5B9BFF", needsAttention: false,
            threadID: "thread-aster-1",
            missions: [MissionSummary(
                id: "mission-ship-1", projectID: "proj-aster-1",
                title: "Ship home page", status: .live, threadID: "thread-ship-1"
            )]
        )
        return WorkspaceSummary(
            id: "world-1", name: "test",
            generalProjectID: general.id, projects: [general, aster]
        )
    }

    /// R43 P097: the entry is ALWAYS home — General's thread, never an
    /// error, never the last thread (R23's rule is replaced).
    @MainActor
    func testEntryIsAlwaysGeneral() {
        let (router, _) = entryRouter()
        XCTAssertEqual(
            router.resolveEntryRoute(in: entryWorkspace()),
            .project(projectID: "proj-general-1")
        )
    }

    /// General wins even when it does not ride first.
    @MainActor
    func testEntryPrefersGeneralOverFirstProject() {
        let (router, _) = entryRouter()
        var workspace = entryWorkspace()
        workspace = WorkspaceSummary(
            id: workspace.id, name: workspace.name,
            generalProjectID: workspace.generalProjectID,
            projects: Array(workspace.projects.reversed())
        )
        XCTAssertEqual(
            router.resolveEntryRoute(in: workspace),
            .project(projectID: "proj-general-1")
        )
    }

    /// No General in the tree: the first project is the entry — never an
    /// error, never a blank root.
    @MainActor
    func testEntryWithoutGeneralFallsBackToFirstProject() {
        let (router, _) = entryRouter()
        let workspace = entryWorkspace()
        let nongeneral = WorkspaceSummary(
            id: workspace.id, name: workspace.name,
            generalProjectID: workspace.generalProjectID,
            projects: workspace.projects.filter { $0.kind != .general }
        )
        XCTAssertEqual(
            router.resolveEntryRoute(in: nongeneral),
            .project(projectID: "proj-aster-1")
        )
    }

    /// Thread destinations replace the entry root instead of stacking; opening
    /// the visible thread is a no-op; legacy screens still push over it; the
    /// rail (closeAll) keeps the entry. The replace lands a beat after the
    /// open (the drawer-dismissal swallow), so this test waits it out.
    @MainActor
    func testThreadRoutesReplaceEntryRoot() async throws {
        let (router, _) = entryRouter()
        router.entryRoute = .project(projectID: "proj-general-1")

        router.open(.mission(missionID: "mission-ship-1"))
        XCTAssertTrue(router.path.isEmpty, "a thread replace must not stack")
        try await Task.sleep(nanoseconds: 200_000_000)
        XCTAssertEqual(router.entryRoute, .mission(missionID: "mission-ship-1"))

        router.open(.mission(missionID: "mission-ship-1"))
        XCTAssertEqual(router.entryRoute, .mission(missionID: "mission-ship-1"))
        XCTAssertTrue(router.path.isEmpty, "re-opening the visible thread stacks a copy")

        router.open(.organize)
        XCTAssertEqual(router.path, [.organize], "a legacy screen pushes over the entry")
        XCTAssertEqual(router.entryRoute, .mission(missionID: "mission-ship-1"))

        router.closeAll()
        XCTAssertTrue(router.path.isEmpty)
        XCTAssertEqual(router.entryRoute, .mission(missionID: "mission-ship-1"),
                       "the rail is the entry, not a cleared root")
    }

    /// A thread route with nothing pushed is showing when it is the entry.
    @MainActor
    func testIsShowingThreadRouteAtEntry() {
        let (router, _) = entryRouter()
        router.entryRoute = .project(projectID: "proj-general-1")
        XCTAssertTrue(router.isShowing(.route(.project(projectID: "proj-general-1"))))
        XCTAssertFalse(router.isShowing(.route(.project(projectID: "proj-aster-1"))))
    }

    /// R43 P097: sign-out forgets the rendered entry; the next sign-in
    /// re-resolves home — never the last thread.
    @MainActor
    func testForgetEntryResolvesHomeAgain() {
        let (router, _) = entryRouter()
        router.entryRoute = .mission(missionID: "mission-ship-1")
        router.closeAll()
        router.forgetEntry()
        XCTAssertNil(router.entryRoute)
        XCTAssertEqual(
            router.resolveEntryRoute(in: entryWorkspace()),
            .project(projectID: "proj-general-1")
        )
    }

    /// R43 P097: a deep link still opens its thread over the home entry —
    /// the entry rule never swallows an outside arrival. The replace lands
    /// a beat after the open (the drawer-dismissal swallow), so this test
    /// waits it out.
    @MainActor
    func testDeepLinkOpensThreadOverHomeEntry() async throws {
        let (router, _) = entryRouter()
        router.entryRoute = .project(projectID: "proj-general-1")
        router.open(.mission(missionID: "mission-ship-1"))
        try await Task.sleep(nanoseconds: 200_000_000)
        XCTAssertEqual(router.entryRoute, .mission(missionID: "mission-ship-1"))
        XCTAssertTrue(router.path.isEmpty, "a thread replace must not stack")
    }

    /// R43 P097: goHome pops everything and shows the home entry — the
    /// long-background return. A pushed screen does not survive it.
    @MainActor
    func testGoHomePopsToTheHomeEntry() {
        let (router, _) = entryRouter()
        router.entryRoute = .mission(missionID: "mission-ship-1")
        router.open(.organize)
        XCTAssertEqual(router.path, [.organize])
        router.goHome(generalProjectID: "proj-general-1")
        XCTAssertTrue(router.path.isEmpty)
        XCTAssertEqual(router.entryRoute, .project(projectID: "proj-general-1"))
    }

    /// R23 P071: the displayed title is the mission name only — the project
    /// rides the line above, never twice.
    @MainActor
    func testV2ChatContextTitleIsMissionNameOnly() {
        let workspace = entryWorkspace()
        let aster = workspace.projects[1]
        let ship = aster.missions[0]
        let mission = V2ChatContext(
            thread: Thread(id: ship.threadID, ownerType: .mission,
                           projectID: aster.id, missionID: ship.id, visualSessionID: "s"),
            project: aster, mission: ship
        )
        XCTAssertEqual(mission.title, "Ship home page")
        let project = V2ChatContext(
            thread: Thread(id: aster.threadID, ownerType: .project,
                           projectID: aster.id, missionID: nil, visualSessionID: "s"),
            project: aster, mission: nil
        )
        XCTAssertEqual(project.title, "Aster")
    }
}
