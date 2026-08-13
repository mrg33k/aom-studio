// StreamTests.swift — Corner native iOS tests
// corner:native-ios R18 smoothness pass, round N3
//
// The live-reply stream against a scripted transport. The laws under test:
// chunk deltas APPEND, done.text is IGNORED, the durable row is the only
// renderable reply, the draft dies in the same engine pass the row lands,
// interim progress rows do not kill it, and every failure is a silent no-op
// with the step poll as the fallback lane.

import XCTest
@testable import Corner

@MainActor
final class StreamTests: XCTestCase {

    private let room = Room(world: "aom", kind: .agent(slug: "rex"), title: "Assistant", subtitle: "")

    private func model(
        _ transport: FakeTransport,
        revealInterval: TimeInterval = 0
    ) -> ChatViewModel {
        ChatViewModel(
            room: room,
            transport: transport,
            backstop: 60,
            stepInterval: 0.01,
            reconcileInterval: 3600,
            stewardInterval: 3600,
            repairAfter: 3600,
            stopTimeout: 3600,
            revealInterval: revealInterval,
            onFirstReply: {}
        )
    }

    private func settleRunLoop(_ times: Int = 6) async {
        for _ in 0..<times {
            try? await Task.sleep(for: .milliseconds(20))
        }
    }

    private func openTurn(_ vm: ChatViewModel) async {
        vm.draft = "stream me a story"
        vm.send()
        await settleRunLoop()
    }

    // MARK: - Consumption

    func testChunkDeltasAccumulateAndStatusReadsWriting() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        transport.streamContinuation?.yield(.typing)
        transport.streamContinuation?.yield(.chunk("Chapter one"))
        transport.streamContinuation?.yield(.chunk(" begins here."))
        await settleRunLoop()

        XCTAssertEqual(vm.liveDraft, "Chapter one begins here.", "chunks are DELTAS — append, never replace")
        XCTAssertEqual(vm.roomStatus, .streaming, "a live draft is the one thing that may say Writing")
    }

    func testStreamIsKeyedToTheDurableRow() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        XCTAssertEqual(transport.streamOpens, ["server-1"],
                       "the stream key is the server's row id, never a client invention")
    }

    func testMidTurnFollowUpDoesNotRekeyTheStream() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        vm.draft = "also do this"
        vm.send()
        await settleRunLoop()

        XCTAssertEqual(transport.streamOpens.count, 1,
                       "the bridge folds a follow-up INTO the running turn — the original stream keeps narrating")
    }

    // MARK: - The no-duplicate contract

    func testDoneTextIsIgnoredAndTheRowClearsTheDraftInTheSamePass() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        transport.streamContinuation?.yield(.chunk("The full answer"))
        await settleRunLoop()
        XCTAssertNotNil(vm.liveDraft)

        // The bridge finishes: the durable row lands, done fires. done.text is
        // deliberately NOT part of this fixture's thread — only the row is.
        transport.rows.append(.fake(id: "reply-1", role: "assistant",
                                    text: "The full answer, rendered properly.",
                                    epoch: Date().timeIntervalSince1970 + 1))
        transport.streamContinuation?.yield(.done)
        await settleRunLoop()

        XCTAssertNil(vm.liveDraft, "the draft died in the pass that rendered the row")
        let copies = vm.rows.filter { $0.text?.contains("The full answer") == true }.count
        XCTAssertEqual(copies, 1, "the reply renders exactly once — no duplicate, no flash")
    }

    func testInterimProgressRowDoesNotClearTheDraft() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        transport.streamContinuation?.yield(.chunk("Halfway through a thought"))
        await settleRunLoop()

        // The bridge posts its mid-turn "Still working on this" row.
        transport.rows.append(.fake(id: "interim-1", role: "assistant",
                                    text: "Still working on this. 5 minutes in.",
                                    epoch: Date().timeIntervalSince1970 + 1,
                                    metadata: ["interim": true]))
        await vm.load()

        XCTAssertEqual(vm.liveDraft, "Halfway through a thought",
                       "an interim row is not the answer — the draft survives it (the web's flicker, fixed)")
        XCTAssertTrue(vm.turnIsOpen)
    }

    func testSettleSentinelClearsTheDraft() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        transport.streamContinuation?.yield(.chunk("Words in flight"))
        await settleRunLoop()
        XCTAssertNotNil(vm.liveDraft)

        transport.steps = [.fake(id: "s-end", parent: "server-1", index: 9999, text: "settled", phase: "done")]
        await settleRunLoop()

        XCTAssertNil(vm.liveDraft, "a settled turn shows no draft, whatever internal state remains")
        XCTAssertEqual(vm.roomStatus, .idle)
    }

    // MARK: - Degradation

    func testNoStreamLaneChangesNothing() async {
        let transport = FakeTransport()
        transport.provideStream = false
        let vm = model(transport)
        await openTurn(vm)

        XCTAssertNil(vm.liveDraft)
        XCTAssertEqual(vm.roomStatus, .thinking, "no lane, no draft — steps own the story exactly as before")

        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Picking this up", phase: "thinking")]
        await settleRunLoop()
        XCTAssertEqual(vm.roomStatus, .working)
    }

    func testStreamErrorIsASilentNoOp() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        transport.streamContinuation?.yield(.chunk("Partial narr"))
        transport.streamContinuation?.yield(.error("timeout"))
        await settleRunLoop()

        XCTAssertEqual(vm.liveDraft, "Partial narr", "what was revealed stays until the turn resolves")
        XCTAssertTrue(vm.turnIsOpen, "an errored stream never touches the turn — the poll lanes finish the job")
    }

    func testLeavingTheRoomTearsTheStreamDown() async {
        let transport = FakeTransport()
        let vm = model(transport)
        await openTurn(vm)

        transport.streamContinuation?.yield(.chunk("Some text"))
        await settleRunLoop()
        XCTAssertNotNil(vm.liveDraft)

        vm.stop()
        XCTAssertNil(vm.liveDraft)
    }

    // MARK: - Reveal cadence

    func testTimedRevealDrainsTheWholeBuffer() async {
        let transport = FakeTransport()
        let vm = model(transport, revealInterval: 0.005)
        await openTurn(vm)

        let long = String(repeating: "abcdefghij", count: 30) // 300 chars
        transport.streamContinuation?.yield(.chunk(long))

        var revealed = ""
        for _ in 0..<80 { // up to ~1.6s
            await settleRunLoop(1)
            revealed = vm.liveDraft ?? ""
            if revealed.count == long.count { break }
        }
        XCTAssertEqual(revealed, long, "the drain must reveal everything the wire sent, in order")
    }

    // MARK: - Wire parsing

    func testEventParsing() {
        XCTAssertEqual(TurnStreamEvent.parse(line: #"data: {"type":"typing","room":"r"}"#), .typing)
        XCTAssertEqual(TurnStreamEvent.parse(line: #"data: {"type":"chunk","text":"hi","room":"r"}"#), .chunk("hi"))
        XCTAssertEqual(TurnStreamEvent.parse(line: #"data: {"type":"done","room":"r","text":"full"}"#), .done)
        XCTAssertEqual(TurnStreamEvent.parse(line: #"data: {"type":"fallback"}"#), .done)
        XCTAssertEqual(TurnStreamEvent.parse(line: #"data: {"type":"superseded","to":"x"}"#), .superseded)
        XCTAssertEqual(TurnStreamEvent.parse(line: #"data: {"type":"error","error":"timeout"}"#), .error("timeout"))
        XCTAssertNil(TurnStreamEvent.parse(line: ""), "blank lines are skipped, never fatal")
        XCTAssertNil(TurnStreamEvent.parse(line: "event: something"), "non-data lines are skipped")
        XCTAssertNil(TurnStreamEvent.parse(line: "data: not json"), "garbage is skipped, never fatal")
        XCTAssertNil(TurnStreamEvent.parse(line: #"data: {"type":"mystery"}"#), "unknown types are skipped")
    }
}
