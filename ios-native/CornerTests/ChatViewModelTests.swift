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
        XCTAssertEqual(transport.clientMessageIDs.count, 2)
        XCTAssertEqual(Set(transport.clientMessageIDs).count, 1, "retry must reuse the original idempotency key")
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

    func testAnOlderIdenticalMessageDoesNotEraseANewPendingSend() async {
        let transport = FakeTransport()
        transport.rows = [
            .fake(
                id: "old-yes", role: "user", text: "yes",
                epoch: Date().timeIntervalSince1970 - 120
            )
        ]
        // Model an older deploy that accepted POST but returned no created row, and
        // a delayed history replica that has not exposed the new row yet.
        transport.sendReturnsRow = false
        transport.sendLandsInThread = false
        let vm = model(transport)

        vm.draft = "yes"
        vm.send()
        await settleRunLoop()

        XCTAssertEqual(vm.outbox.count, 1)
        XCTAssertEqual(vm.outbox.first?.text, "yes")
        XCTAssertFalse(vm.outbox.first?.isFailed == true)
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

    // MARK: - 2b. The false-death fixes (R7)

    /// THE GUARANTEED FALSE-DEATH PATH, closed. A follow-up sent mid-turn is folded
    /// into the in-flight turn by the bridge, so its steps stay keyed to the ORIGINAL
    /// parent id. A poll that re-keys to the newest user row and forgets the original
    /// goes blind — every mid-turn follow-up then dies at the backstop.
    func testFollowUpMidTurnKeepsCountingTheOriginalParentsSteps() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "first ask"
        vm.send()
        await settleRunLoop(2)
        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Working the first ask")]
        await settleRunLoop()
        XCTAssertEqual(vm.turn, .working(detail: "Working the first ask"))

        // Follow-up mid-turn — the display re-keys to server-2, but the bridge keeps
        // stepping against server-1.
        vm.draft = "also do this"
        vm.send()
        await settleRunLoop(2)
        transport.steps.append(.fake(id: "s2", parent: "server-1", index: 1, text: "Folding in the follow-up"))
        await settleRunLoop()

        XCTAssertEqual(vm.turn, .working(detail: "Folding in the follow-up"),
                       "steps on the original parent must still count after a follow-up re-keys the turn")
    }

    /// The settle sentinel can land on ANY parent folded into the turn — the folded
    /// follow-up row may never get its own sentinel (live proof: 10de6d7a).
    func testSettleOnTheOriginalParentSettlesAFoldedTurn() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "first"
        vm.send()
        await settleRunLoop(2)
        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Going")]
        await settleRunLoop()

        vm.draft = "second"
        vm.send()
        await settleRunLoop(2)

        transport.steps.append(.fake(id: "s9", parent: "server-1", index: 9999, text: "settled"))
        await settleRunLoop()
        XCTAssertEqual(vm.turn, .idle, "the sentinel on the original parent ends the whole folded turn")
    }

    /// The bridge posts interim "Still working on this. N minutes in" assistant rows
    /// mid-turn. Those must reset the silence clock — the lastTurnActivity comment
    /// always promised "a new step, or a reply", and this is the reply half.
    func testInterimAssistantRowResetsTheSilenceClock() async {
        let transport = FakeTransport()
        let vm = model(transport, backstop: 0.3)
        vm.draft = "long job"
        vm.send()
        await settleRunLoop(2)
        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Deep in it")]
        await settleRunLoop(2)

        // Steps go quiet for most of the backstop…
        try? await Task.sleep(for: .milliseconds(200))
        // …then an interim row lands, which must buy the turn a fresh window.
        transport.rows.append(.fake(id: "interim", role: "assistant", text: "Still working on this. 6 minutes in.", epoch: Date().timeIntervalSince1970))
        await vm.load()
        try? await Task.sleep(for: .milliseconds(200))

        guard case .working = vm.turn else {
            return XCTFail("an interim assistant row must reset the silence clock, got \(vm.turn)")
        }
    }

    /// A reply landing on a turn already called quiet clears the notice on the spot —
    /// the conversation continues; it never reads as a resurrection.
    func testStalledAutoClearsTheInstantAReplyLands() async {
        let transport = FakeTransport()
        let vm = model(transport, backstop: 0.05)
        vm.draft = "went quiet"
        vm.send()
        await settleRunLoop(12)
        guard case .stalled = vm.turn else { return XCTFail("expected .stalled first") }

        transport.rows.append(.fake(id: "late", role: "assistant", text: "here it is", epoch: Date().timeIntervalSince1970))
        await vm.load()
        XCTAssertEqual(vm.turn, .idle, "a reply must clear the quiet notice immediately")
    }

    /// Steps resuming after the notice recover the turn — quiet is a notice, not a
    /// verdict, so the poll keeps running underneath it.
    func testStepsResumingWhileStalledRecoverTheTurn() async {
        let transport = FakeTransport()
        let vm = model(transport, backstop: 0.2)
        vm.draft = "slow burner"
        vm.send()
        await settleRunLoop(20)
        guard case .stalled = vm.turn else { return XCTFail("expected .stalled first") }

        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Back at it")]
        await settleRunLoop(4)
        XCTAssertEqual(vm.turn, .working(detail: "Back at it"),
                       "steps resuming must pull the turn out of the quiet state")
    }

    /// The steps feed is shared by every room in the world; 40 was provably losable.
    func testStepPollAsksForTheWebsWindowOf100() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "go"
        vm.send()
        await settleRunLoop(2)
        XCTAssertEqual(transport.stepLimits.first, 100)
    }

    /// The progress card's data: renderable steps publish oldest-first, and the
    /// elapsed clock has a start the moment the turn opens.
    func testLiveStepsPublishForTheProgressCard() async {
        let transport = FakeTransport()
        let vm = model(transport)
        vm.draft = "show steps"
        vm.send()
        await settleRunLoop(2)
        XCTAssertNotNil(vm.turnStartedAt, "the elapsed clock needs the turn's open time")
        transport.steps = [
            .fake(id: "s2", parent: "server-1", index: 1, text: "Second"),
            .fake(id: "s1", parent: "server-1", index: 0, text: "First"),
        ]
        await settleRunLoop()
        XCTAssertEqual(vm.liveSteps.map(\.text), ["First", "Second"])

        transport.steps.append(.fake(id: "s9", parent: "server-1", index: 9999, text: "settled"))
        await settleRunLoop()
        XCTAssertTrue(vm.liveSteps.isEmpty, "a settled turn leaves no progress card behind")
        XCTAssertNil(vm.turnStartedAt)
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

    // MARK: - Follow-up trigger rows (R7)

    /// The scheduler's self-check-in rows render as a quiet chip in the thread and
    /// must NEVER surface as a home preview line.
    func testFollowupTriggerRowsAreDetectedAndBannedFromPreviews() {
        let trigger = "[FOLLOWUP TRIGGER — do not repeat this prefix in your reply] The scheduled check-in time has arrived (was: 2026-08-11T14:00:00Z)."
        XCTAssertTrue(RoomPreview.isFollowupTrigger(trigger))
        XCTAssertTrue(RoomPreview.isMachine(trigger), "a trigger row is machine text, not a preview")
        XCTAssertEqual(RoomPreview.clean(trigger), "", "the preview line must collapse, never substitute")
        XCTAssertFalse(RoomPreview.isFollowupTrigger("Follow up with the client tomorrow"),
                       "ordinary prose about follow-ups is not a trigger")
    }

    // MARK: - R20 Bug C: duplicate file card deduplication

    /// THE REGRESSION: an agent re-delivers the same file (same room, same filename,
    /// same URL) and the thread shows two identical file cards. After R20 the older
    /// delivery is suppressed and only the newest card renders.
    func testRedeliveredFileCardIsDeduplicatedInThread() throws {
        let delivery1 = try row("""
        {"id":"d1","timestamp":"2026-08-13T10:00:00Z","role":"assistant","agent":"rex",
         "text":"Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/report.pdf","name":"report.pdf"}}}
        """)
        let delivery2 = try row("""
        {"id":"d2","timestamp":"2026-08-13T10:05:00Z","role":"assistant","agent":"rex",
         "text":"Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/report.pdf","name":"report.pdf"}}}
        """)
        let result = ChatViewModel.deduplicateFileDeliveries([delivery1, delivery2])
        XCTAssertEqual(result.count, 1, "two deliveries of the same file should collapse to one")
        XCTAssertEqual(result.first?.id, "d2", "the NEWEST delivery survives")
    }

    /// Different files with the same name but different URLs must NOT be deduped.
    func testDifferentFilesWithSameNameAreKept() throws {
        let file1 = try row("""
        {"id":"f1","timestamp":"2026-08-13T10:00:00Z","role":"assistant","agent":"rex",
         "text":"Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/v1/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/v1/report.pdf","name":"report.pdf"}}}
        """)
        let file2 = try row("""
        {"id":"f2","timestamp":"2026-08-13T10:05:00Z","role":"assistant","agent":"rex",
         "text":"Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/v2/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/v2/report.pdf","name":"report.pdf"}}}
        """)
        let result = ChatViewModel.deduplicateFileDeliveries([file1, file2])
        XCTAssertEqual(result.count, 2, "different URLs = different files, both kept")
    }

    /// A message with real prose (isPure == false) is never suppressed, even if
    /// it carries a file that was later re-delivered.
    func testHandoffWithProseIsNeverSuppressed() throws {
        let handoff = try row("""
        {"id":"h1","timestamp":"2026-08-13T10:00:00Z","role":"assistant","agent":"rex",
         "text":"Here are the changes you asked for.",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/report.pdf","name":"report.pdf"}}}
        """)
        let redelivery = try row("""
        {"id":"h2","timestamp":"2026-08-13T10:05:00Z","role":"assistant","agent":"rex",
         "text":"Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/report.pdf","name":"report.pdf"}}}
        """)
        let result = ChatViewModel.deduplicateFileDeliveries([handoff, redelivery])
        XCTAssertEqual(result.count, 2,
                       "the hand-off with real prose stays even though the file was re-delivered")
        XCTAssertTrue(result.contains { $0.id == "h1" })
    }

    /// User-uploaded files and agent-delivered files with the same URL are kept
    /// because they are different directions.
    func testUserAndAgentDeliveriesOfSameFileAreKept() throws {
        let userUpload = try row("""
        {"id":"u1","timestamp":"2026-08-13T10:00:00Z","role":"user",
         "text":"Attached file: doc.pdf\\nhttps://rag.aheadofmarket.com/files/aom/doc.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/doc.pdf","name":"doc.pdf"}}}
        """)
        let agentShare = try row("""
        {"id":"a1","timestamp":"2026-08-13T10:05:00Z","role":"assistant","agent":"rex",
         "text":"Attached file: doc.pdf\\nhttps://rag.aheadofmarket.com/files/aom/doc.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/doc.pdf","name":"doc.pdf"}}}
        """)
        let result = ChatViewModel.deduplicateFileDeliveries([userUpload, agentShare])
        XCTAssertEqual(result.count, 2,
                       "user upload and agent delivery are different events")
    }

    /// Ordinary messages (no attachments) pass through untouched.
    func testNonFileMessagesAreUnaffectedByDedup() throws {
        let msg1 = try row(#"{"id":"m1","role":"assistant","text":"Working on it."}"#)
        let msg2 = try row(#"{"id":"m2","role":"assistant","text":"Done."}"#)
        let result = ChatViewModel.deduplicateFileDeliveries([msg1, msg2])
        XCTAssertEqual(result.count, 2)
    }

    private func row(_ json: String) throws -> MessageRow {
        try JSONDecoder().decode(MessageRow.self, from: Data(json.utf8))
    }
}
