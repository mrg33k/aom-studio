// ChatViewModelTests.swift — Corner native iOS
// corner:native-ios Stage 1
//
// The three promises of Stage 1, run against failures on purpose.

import XCTest
@testable import Corner

@MainActor
final class ChatViewModelTests: XCTestCase {

    private let room = Room(world: "aom", kind: .agent(slug: "rex"), title: "Assistant", subtitle: "")

    private func model(
        _ transport: FakeTransport,
        backstop: TimeInterval = 60
    ) -> ChatViewModel {
        ChatViewModel(
            room: room,
            transport: transport,
            backstop: backstop,
            stepInterval: 0.01,
            reconcileInterval: 3600,   // the poll must not fire during a test
            onFirstReply: {}           // never prompt for notifications in a test
        )
    }

    /// The step poll runs on its own task; give it a beat to observe the state it was
    /// scripted to see.
    private func settleRunLoop(_ times: Int = 6) async {
        for _ in 0..<times {
            try? await Task.sleep(for: .milliseconds(20))
        }
    }

    // MARK: - 1. A failed send stays retryable

    func testFailedSendKeepsTheMessageOnScreenWithAFailureReason() async {
        let transport = FakeTransport()
        transport.sendError = CornerAPI.APIError.badResponse(status: 500, message: "server exploded")
        let vm = model(transport)

        vm.draft = "this must not vanish"
        vm.send()
        await settleRunLoop()

        XCTAssertEqual(vm.outbox.count, 1, "the message the user typed must still be there")
        XCTAssertEqual(vm.outbox.first?.text, "this must not vanish")
        XCTAssertTrue(vm.outbox.first?.isFailed == true)
        XCTAssertEqual(vm.outbox.first?.failureMessage, "server exploded")
        XCTAssertEqual(vm.turn, .idle, "a send that never landed must not show a working bar")
    }

    func testRetryAfterAFailureActuallySendsAndReconcilesTheEcho() async {
        let transport = FakeTransport()
        transport.sendError = CornerAPI.APIError.badResponse(status: 503, message: "down")
        let vm = model(transport)

        vm.draft = "hello"
        vm.send()
        await settleRunLoop()
        XCTAssertTrue(vm.outbox.first?.isFailed == true)
        XCTAssertTrue(transport.sentTexts.isEmpty)

        // Network comes back.
        transport.sendError = nil
        vm.retry(vm.outbox[0])
        await settleRunLoop()

        XCTAssertEqual(transport.sentTexts, ["hello"])
        XCTAssertTrue(vm.outbox.isEmpty, "once the real row lands the echo must be reconciled away")
        XCTAssertEqual(vm.rows.last?.text, "hello")
    }

    /// A failed item must survive a reload. The whole point is that the user still has
    /// what they typed — a reconcile that swept it away would be the web's bug wearing
    /// a different hat.
    func testFailedItemSurvivesAReload() async {
        let transport = FakeTransport()
        transport.sendError = CornerAPI.APIError.notSignedIn
        let vm = model(transport)
        vm.draft = "keep me"
        vm.send()
        await settleRunLoop()

        transport.rows = [.fake(id: "r1", role: "assistant", text: "unrelated", epoch: 1000)]
        await vm.load()

        XCTAssertEqual(vm.outbox.count, 1)
        XCTAssertTrue(vm.outbox.first?.isFailed == true)
    }

    func testDiscardRemovesIt() async {
        let transport = FakeTransport()
        transport.sendError = CornerAPI.APIError.notSignedIn
        let vm = model(transport)
        vm.draft = "oops"
        vm.send()
        await settleRunLoop()

        vm.discard(vm.outbox[0])
        XCTAssertTrue(vm.outbox.isEmpty)
    }

    func testSendingIsNotAllowedToLoseWhitespaceOnlyDrafts() {
        let vm = model(FakeTransport())
        vm.draft = "   \n  "
        vm.send()
        XCTAssertTrue(vm.outbox.isEmpty)
        XCTAssertEqual(vm.draft, "   \n  ", "an ignored send must not clear the composer")
    }

    // MARK: - 2. A dead turn looks dead

    func testTurnStartsWorkingOnSend() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "do the thing"
        vm.send()
        await settleRunLoop()
        XCTAssertEqual(vm.turn, .working(detail: nil))
    }

    func testLiveStepBecomesTheWorkingDetail() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "go"
        vm.send()
        await settleRunLoop(2)
        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Reading the details")]
        await settleRunLoop()
        XCTAssertEqual(vm.turn, .working(detail: "Reading the details"))
    }

    /// The bridge's `settled` sentinel is the agent's own end-of-turn signal. Stopping
    /// on it is knowing; stopping on a countdown is guessing.
    func testSettledSentinelStopsTheIndicator() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "go"
        vm.send()
        await settleRunLoop(2)
        transport.steps = [
            .fake(id: "s1", parent: "server-1", index: 0, text: "Working"),
            .fake(id: "s2", parent: "server-1", index: 9999, text: "settled"),
        ]
        await settleRunLoop()
        XCTAssertEqual(vm.turn, .idle)
    }

    /// THE HEADLINE. Total silence past the backstop must produce a NAMED stalled
    /// state, not a spinner that quietly vanishes and reads as "finished".
    func testSilenceBecomesAVisibleStalledState() async {
        let transport = FakeTransport()
        let vm = model(transport, backstop: 0.05)
        vm.draft = "the turn that dies"
        vm.send()
        await settleRunLoop(12)

        guard case .stalled(let text) = vm.turn else {
            return XCTFail("expected .stalled, got \(vm.turn)")
        }
        XCTAssertEqual(text, "the turn that dies", "the stalled row must offer to send the same message again")
    }

    func testResendingAStalledTurnQueuesTheSameTextAgain() async {
        let transport = FakeTransport()
        let vm = model(transport, backstop: 0.05)
        vm.draft = "retry me"
        vm.send()
        await settleRunLoop(12)
        guard case .stalled = vm.turn else { return XCTFail("expected .stalled") }

        vm.resendStalled()
        await settleRunLoop()
        XCTAssertEqual(transport.sentTexts, ["retry me", "retry me"])
    }

    func testDismissingAStalledTurnReturnsToIdle() async {
        let transport = FakeTransport()
        let vm = model(transport, backstop: 0.05)
        vm.draft = "x"
        vm.send()
        await settleRunLoop(12)
        vm.dismissStalled()
        XCTAssertEqual(vm.turn, .idle)
    }

    /// Once real steps are flowing the bridge OWNS the stop signal. Agents flush
    /// in-progress thoughts as interim reply rows mid-turn; settling on one of those is
    /// the exact "bar stops while it is still working" bug the web fixed 2026-06-27.
    func testInterimReplyDoesNotSettleATurnThatIsStreamingSteps() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "long job"
        vm.send()
        await settleRunLoop(2)
        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Still going")]
        await settleRunLoop()

        // The agent flushes a thought as a chat row while still working.
        transport.rows.append(.fake(id: "interim", role: "assistant", text: "thinking out loud", epoch: Date().timeIntervalSince1970 + 1))
        await vm.load()

        guard case .working = vm.turn else {
            return XCTFail("an interim reply must not settle a turn that is streaming steps")
        }
    }

    /// With NO steps flowing, a reply is the honest stop signal.
    func testReplySettlesTheTurnWhenNoStepsAreStreaming() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "quick one"
        vm.send()
        await settleRunLoop(2)

        transport.rows.append(.fake(id: "reply", role: "assistant", text: "done", epoch: Date().timeIntervalSince1970 + 1))
        await vm.load()
        XCTAssertEqual(vm.turn, .idle)
    }

    /// Walking into a room mid-turn should read as busy — consistent whether you sent
    /// the message or just arrived.
    func testOpeningARoomMidTurnShowsWorkingImmediately() async {
        let transport = FakeTransport()
        let now = Date().timeIntervalSince1970
        transport.rows = [
            .fake(id: "u1", role: "user", text: "asked something", epoch: now - 5),
        ]
        let vm = model(transport)
        await vm.load()
        guard case .working = vm.turn else {
            return XCTFail("an unanswered recent user message means the agent is on it")
        }
    }

    /// A thread that merely ENDS on an old user message is not a live turn.
    func testOpeningARoomThatEndsOnAnOldUserMessageIsNotWorking() async {
        let transport = FakeTransport()
        transport.rows = [.fake(id: "u1", role: "user", text: "ancient", epoch: 1000)]
        let vm = model(transport)
        await vm.load()
        XCTAssertEqual(vm.turn, .idle)
    }

    /// A message sent from the web or another device must light this device up too.
    func testUserMessageArrivingFromAnotherDeviceStartsTheTurn() async {
        let transport = FakeTransport()
        transport.rows = [.fake(id: "old", role: "assistant", text: "hi", epoch: 1000)]
        let vm = model(transport)
        await vm.load()
        XCTAssertEqual(vm.turn, .idle)

        transport.rows.append(.fake(id: "elsewhere", role: "user", text: "sent from the web", epoch: Date().timeIntervalSince1970))
        await vm.load()
        guard case .working = vm.turn else { return XCTFail("expected .working") }
    }

    // MARK: - 3. Foreground catch-up loses nothing

    func testCatchUpReportsWhatArrivedWhileAway() async {
        let transport = FakeTransport()
        transport.rows = [.fake(id: "a", role: "user", text: "hi", epoch: 1000)]
        let vm = model(transport)
        await vm.load()
        XCTAssertNil(vm.catchUpNotice)

        transport.rows.append(.fake(id: "b", role: "assistant", text: "one", epoch: 2000))
        transport.rows.append(.fake(id: "c", role: "assistant", text: "two", epoch: 3000))
        await vm.catchUp()

        XCTAssertEqual(vm.catchUpNotice, "2 new messages while you were away")
        XCTAssertEqual(vm.rows.count, 3)
    }

    func testCatchUpIsSilentWhenNothingArrived() async {
        let transport = FakeTransport()
        transport.rows = [.fake(id: "a", role: "assistant", text: "hi", epoch: 1000)]
        let vm = model(transport)
        await vm.load()
        await vm.catchUp()
        XCTAssertNil(vm.catchUpNotice)
    }

    /// THE GAP CASE. If the newest row we already hold is not in the standard window,
    /// more than a window's worth landed while we were away — widen before concluding
    /// anything, or the thread silently begins in the middle.
    func testCatchUpWidensTheWindowWhenTheAnchorIsMissing() async {
        let transport = FakeTransport()
        let anchor = MessageRow.fake(id: "anchor", role: "user", text: "before", epoch: 1000)
        transport.rows = [anchor]
        let vm = model(transport)
        await vm.load()

        // The server has moved on so far that the standard window no longer contains
        // the row this device last saw.
        transport.rows = (0..<100).map { .fake(id: "new-\($0)", role: "assistant", text: "m\($0)", epoch: 2000 + Double($0)) }
        transport.wideRows = [anchor] + transport.rows

        transport.fetchLimitsReset()
        await vm.catchUp()

        XCTAssertEqual(transport.fetchLimits, [100, 400], "a missing anchor must trigger the wider fetch")
        XCTAssertEqual(vm.rows.first?.id, "anchor", "the widened fetch is what closes the gap")
        XCTAssertEqual(vm.rows.count, 101)
    }

    /// A transient reconcile failure must NOT blank a thread that is already rendering.
    func testFailedReloadDoesNotBlankALiveThread() async {
        let transport = FakeTransport()
        transport.rows = [.fake(id: "a", role: "assistant", text: "hello", epoch: 1000)]
        let vm = model(transport)
        await vm.load()
        XCTAssertEqual(vm.loadState, .ready)

        transport.failNextFetch = CornerAPI.APIError.badResponse(status: 502, message: "gateway")
        await vm.load()

        XCTAssertEqual(vm.loadState, .ready, "a poll error must never wipe the room")
        XCTAssertEqual(vm.rows.count, 1)
    }

    func testFailedFirstLoadWithNothingOnScreenShowsTheError() async {
        let transport = FakeTransport()
        transport.failNextFetch = CornerAPI.APIError.badResponse(status: 500, message: "boom")
        let vm = model(transport)
        await vm.load()
        guard case .error = vm.loadState else {
            return XCTFail("a first load with nothing to show must surface the failure")
        }
    }

    // MARK: - Lifecycle

    func testForegroundRebuildsTheSubscription() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.start()
        await settleRunLoop(2)
        XCTAssertEqual(transport.subscriptions.count, 1)

        vm.handleForeground()
        await settleRunLoop(2)
        XCTAssertEqual(transport.subscriptions.count, 2, "a suspended app's socket is dead; rebuild it")
        XCTAssertTrue(transport.subscriptions[0].stopped)
        vm.stop()
    }

    func testStopTearsEverythingDown() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.start()
        await settleRunLoop(2)
        vm.stop()
        XCTAssertTrue(transport.subscriptions.allSatisfy(\.stopped))
    }

    // MARK: - Composer

    func testTappingABlockOptionDraftsItRatherThanSendingIt() {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draftOption("Ship it")
        XCTAssertEqual(vm.draft, "Ship it")
        XCTAssertTrue(transport.sentTexts.isEmpty, "a chip must never send on its own")
    }
}
