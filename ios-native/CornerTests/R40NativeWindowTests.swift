// R40NativeWindowTests.swift — Corner native iOS
// corner:corner-v2 R40 — the phone loads the newest 200 rows, lands at the
// bottom, and renders web-made quotes.
//
// Pins: the `limit: 200` first load (+200 "Earlier messages" expansion),
// the identity-keyed follow (V2FollowState — the web's R41 root cause:
// count-keyed follow starves on a sliding window), the send pin signal,
// and the server-field quote (no client re-attach).

import XCTest
@testable import Corner

@MainActor
final class R40NativeWindowTests: XCTestCase {
    private var prefsKeys: [String] = []

    override func tearDown() {
        for key in prefsKeys { UserDefaults.standard.removeObject(forKey: key) }
        prefsKeys.removeAll()
        super.tearDown()
    }

    private func context(threadID: String = "thread-r40-test") throws
        -> (thread: Corner.Thread, project: ProjectSummary, mission: MissionSummary?)
    {
        let fixture = try Fixture.loadNativeFixture()
        guard let aster = fixture.workspace.projects.first(where: { $0.name == "Aster" }) else {
            throw FakeRouteError.expectedAsterProject
        }
        prefsKeys.append("v2ThreadPrefs.\(threadID)")
        let thread = Corner.Thread(
            id: threadID, ownerType: .project, projectID: aster.id,
            missionID: nil, visualSessionID: "session-r40"
        )
        return (thread, aster, nil)
    }

    private func routeDecision(project: ProjectSummary, threadID: String) -> RouteDecision {
        RouteDecision(
            decisionId: "decision-r40", destinationThreadID: threadID,
            project: project, mission: nil, confidence: 1, alternatives: [],
            reason: "Already in \(project.name).", needsClarification: false,
            needsCreationConfirmation: false, actor: "tester", createdAt: Date()
        )
    }

    private func startedModel(
        threadID: String = "thread-r40-test",
        rows: [ThreadEvent]? = nil
    ) async throws -> (V2ChatModel, CornerV2APIFake, Corner.Thread, ProjectSummary) {
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in rows ?? [] }
        api.runsHandler = { _ in V2ThreadRuns(open: [], lastDone: nil) }
        api.clearThreadHandler = { _ in }
        let model = V2ChatModel(api: api, outbox: .memory)
        let (thread, project, mission) = try context(threadID: threadID)
        await model.start(thread: thread, project: project, mission: mission)
        return (model, api, thread, project)
    }

    /// N generated rows, oldest first, one minute apart.
    private func manyEvents(_ n: Int, threadID: String = "thread-r40-test") -> [ThreadEvent] {
        let base = Date().addingTimeInterval(Double(-n) * 60)
        var rows: [ThreadEvent] = []
        rows.reserveCapacity(n)
        for i in 1...n {
            let userTurn = i % 2 == 1
            let event = ThreadEvent(
                id: String(format: "r40-%04d", i), threadID: threadID,
                author: userTurn ? .user : .agent, agentLabel: userTurn ? nil : "Corner",
                blocks: [.text("history row \(i)")],
                createdAt: base.addingTimeInterval(Double(i) * 60)
            )
            rows.append(event)
        }
        return rows
    }

    // MARK: - limit plumbing (the endpoint)

    func testFirstLoadAsksForNewest200() {
        let args = ConvexEndpoint.v2ThreadEvents(threadID: "t").args
        XCTAssertEqual(args["limit"] as? Int, 200, "no `after` means the newest-200 window")
        XCTAssertNil(args["after"])
    }

    func testExplicitWindowRidesAsGiven() {
        let args = ConvexEndpoint.v2ThreadEvents(threadID: "t", limit: 400).args
        XCTAssertEqual(args["limit"] as? Int, 400, "Earlier messages +200 rides through")
    }

    func testPollKeepsAfterWithoutLimit() {
        let args = ConvexEndpoint.v2ThreadEvents(threadID: "t", after: "2026-09-07T00:00:00.000Z").args
        XCTAssertEqual(args["after"] as? String, "2026-09-07T00:00:00.000Z")
        XCTAssertNil(args["limit"], "polls keep the cursor, never a window")
    }

    // MARK: - the model reads windowed

    func testStartPassesLimit200() async throws {
        let (_, api, _, _) = try await startedModel(rows: [])
        XCTAssertEqual(api.threadEventsLimits, [200], "first load asks for the newest 200")
    }

    func testFullWindowShowsEarlierRow() async throws {
        let (model, _, _, _) = try await startedModel(rows: manyEvents(200))
        XCTAssertEqual(model.events.count, 200)
        XCTAssertTrue(model.hasEarlierPage, "exactly 200 back means older rows may exist")
    }

    func testPartialWindowHidesEarlierRow() async throws {
        let (model, _, _, _) = try await startedModel(rows: manyEvents(3))
        XCTAssertFalse(model.hasEarlierPage, "a short thread has no earlier page")
    }

    func testLoadEarlierGrowsWindowAndMerges() async throws {
        let all = manyEvents(250)
        let api = CornerV2APIFake()
        var calls = 0
        api.threadEventsHandler = { _ in
            calls += 1
            return calls == 1 ? Array(all.suffix(200)) : all
        }
        api.runsHandler = { _ in V2ThreadRuns(open: [], lastDone: nil) }
        api.clearThreadHandler = { _ in }
        let model = V2ChatModel(api: api, outbox: .memory)
        let (thread, project, mission) = try context()
        await model.start(thread: thread, project: project, mission: mission)
        XCTAssertTrue(model.hasEarlierPage)
        XCTAssertEqual(model.events.first?.id, "r40-0051", "first load holds the newest 200")

        await model.loadEarlier()
        XCTAssertEqual(api.threadEventsLimits, [200, 400], "Earlier messages asks +200")
        XCTAssertEqual(model.events.count, 250, "the wider window merges older rows in")
        XCTAssertEqual(model.events.first?.id, "r40-0001", "older rows prepend, newest stay")
        XCTAssertFalse(model.hasEarlierPage, "250 < 400: the window is exhausted")
    }

    func testLoadEarlierFailureRevertsWindow() async throws {
        let (model, api, _, _) = try await startedModel(rows: manyEvents(200))
        XCTAssertTrue(model.hasEarlierPage)
        api.threadEventsHandler = { _ in throw URLError(.notConnectedToInternet) }
        await model.loadEarlier()
        XCTAssertEqual(model.windowLimit, 200, "a failed expansion reverts, so a retry re-asks it")
        XCTAssertTrue(model.hasEarlierPage, "the row stays for the retry")
        XCTAssertEqual(model.events.count, 200, "a failed expansion changes nothing on screen")
    }

    func testStartResetsGrownWindow() async throws {
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in self.manyEvents(200) }
        api.runsHandler = { _ in V2ThreadRuns(open: [], lastDone: nil) }
        api.clearThreadHandler = { _ in }
        let model = V2ChatModel(api: api, outbox: .memory)
        let (thread, project, mission) = try context()
        await model.start(thread: thread, project: project, mission: mission)
        await model.loadEarlier()
        XCTAssertEqual(api.threadEventsLimits, [200, 400])
        await model.start(thread: thread, project: project, mission: mission)
        XCTAssertEqual(api.threadEventsLimits, [200, 400, 200], "re-opening starts on the first page")
    }

    func testRefreshCarriesCurrentWindow() async throws {
        let (model, api, _, _) = try await startedModel(rows: manyEvents(200))
        await model.loadEarlier()
        api.threadEventsHandler = { _ in self.manyEvents(200) }
        await model.foreground()
        XCTAssertEqual(api.threadEventsLimits.last, 400, "re-reads keep the grown window")
    }

    func testSendBumpsSendSequence() async throws {
        let (model, api, thread, project) = try await startedModel(rows: [])
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        XCTAssertEqual(model.sendSequence, 0)
        await model.send("hello")
        XCTAssertEqual(model.sendSequence, 1, "the view pins to the bottom on this")
        await model.send("again")
        XCTAssertEqual(model.sendSequence, 2)
    }

    // MARK: - follow by identity, not by count (V2FollowState)

    func testFirstArrivalSnapsToBottom() {
        var follow = V2FollowState()
        XCTAssertEqual(
            follow.arrivals(newestID: "e3", firstID: "e1", nearBottom: true),
            .snapInstant, "first paint lands at the bottom"
        )
    }

    func testEmptyFirstPaintMovesNothing() {
        var follow = V2FollowState()
        XCTAssertEqual(follow.arrivals(newestID: nil, firstID: nil, nearBottom: true), .none)
        XCTAssertFalse(follow.showsNewMessages)
    }

    func testSameCountNewNewestFollows() {
        // The R41 trap, unit-pinned: a sliding 200-row window holds the
        // count constant while the newest id turns over — follow fires on
        // the identity, never the count.
        var follow = V2FollowState()
        _ = follow.arrivals(newestID: "e200", firstID: "e1", nearBottom: true)
        XCTAssertEqual(
            follow.arrivals(newestID: "e201", firstID: "e2", nearBottom: true),
            .followSmooth, "new newest id at the tail follows at constant count"
        )
        XCTAssertFalse(follow.showsNewMessages)
    }

    func testSameNewestNeverMoves() {
        var follow = V2FollowState()
        _ = follow.arrivals(newestID: "e200", firstID: "e1", nearBottom: true)
        // An earlier page prepending grows the count with the same newest.
        XCTAssertEqual(
            follow.arrivals(newestID: "e200", firstID: "e0", nearBottom: true),
            .none, "same newest id never moves, however the count shifts"
        )
        XCTAssertFalse(follow.showsNewMessages)
    }

    func testScrolledUpArrivalRaisesPill() {
        var follow = V2FollowState()
        _ = follow.arrivals(newestID: "e200", firstID: "e1", nearBottom: true)
        XCTAssertEqual(
            follow.arrivals(newestID: "e201", firstID: "e1", nearBottom: false),
            .none, "reading elsewhere never yanks the scroll"
        )
        XCTAssertTrue(follow.showsNewMessages, "the pill carries the arrival instead")
        // A second arrival while away deepens the wait, still no move.
        XCTAssertEqual(follow.arrivals(newestID: "e202", firstID: "e1", nearBottom: false), .none)
        XCTAssertEqual(follow.unseenCount, 2)
    }

    func testSendPinsScrolledUpReader() {
        var follow = V2FollowState()
        _ = follow.arrivals(newestID: "e200", firstID: "e1", nearBottom: false)
        follow.noteSend()
        XCTAssertFalse(follow.showsNewMessages, "a send clears a waiting pill")
        XCTAssertEqual(
            follow.arrivals(newestID: "local-1", firstID: "e1", nearBottom: false),
            .followSmooth, "a send pins to the bottom even from up-thread"
        )
    }

    func testScrollUpReleasesSendPin() {
        var follow = V2FollowState()
        _ = follow.arrivals(newestID: "e200", firstID: "e1", nearBottom: true)
        follow.noteSend()
        follow.noteUserScrolledUp()
        XCTAssertEqual(
            follow.arrivals(newestID: "e201", firstID: "e1", nearBottom: false),
            .none, "a deliberate scroll up unpins: the pill, not a yank"
        )
        XCTAssertTrue(follow.showsNewMessages)
    }

    func testPillTapClears() {
        var follow = V2FollowState()
        _ = follow.arrivals(newestID: "e200", firstID: "e1", nearBottom: true)
        _ = follow.arrivals(newestID: "e201", firstID: "e1", nearBottom: false)
        XCTAssertTrue(follow.showsNewMessages)
        follow.notePillTapped()
        XCTAssertFalse(follow.showsNewMessages)
    }

    func testReopenResets() {
        var follow = V2FollowState()
        _ = follow.arrivals(newestID: "e200", firstID: "e1", nearBottom: true)
        follow.noteSend()
        follow.noteOpened()
        XCTAssertEqual(
            follow.arrivals(newestID: "e9", firstID: "e7", nearBottom: true),
            .snapInstant, "a new visit lands at the bottom again"
        )
        XCTAssertFalse(follow.pinnedBySend)
    }
}
