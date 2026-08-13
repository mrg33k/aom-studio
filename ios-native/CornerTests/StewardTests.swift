// StewardTests.swift — Corner native iOS tests
// corner:native-ios R18 smoothness pass, round N1
//
// The steward loop (room-health) run against scripted verdicts: settled settles,
// needs_attention halts but keeps the WHY, repair is asked exactly once, a stale
// feed reads as stuck, and a continuing conversation clears a stale verdict.

import XCTest
@testable import Corner

@MainActor
final class StewardTests: XCTestCase {

    private let room = Room(world: "aom", kind: .agent(slug: "rex"), title: "Assistant", subtitle: "")

    private func model(
        _ transport: FakeTransport,
        stewardInterval: TimeInterval = 0.02,
        repairAfter: TimeInterval = 3600
    ) -> ChatViewModel {
        ChatViewModel(
            room: room,
            transport: transport,
            backstop: 60,
            stepInterval: 0.01,
            reconcileInterval: 3600,
            stewardInterval: stewardInterval,
            repairAfter: repairAfter,
            onFirstReply: {}
        )
    }

    private func settleRunLoop(_ times: Int = 6) async {
        for _ in 0..<times {
            try? await Task.sleep(for: .milliseconds(20))
        }
    }

    // MARK: - Optimistic accepted + the vocabulary

    func testSendOpensTurnAsAcceptedAndThinking() async {
        let transport = FakeTransport()
        let vm = model(transport, stewardInterval: 3600) // steward must not overwrite
        vm.draft = "hello"
        vm.send()
        await settleRunLoop()

        XCTAssertEqual(vm.turnHealth?.state, "accepted",
                       "a fresh send is optimistically accepted — the waking state keys off it")
        XCTAssertEqual(vm.roomStatus, .thinking, "no steps yet: the honest word is Thinking")
    }

    func testStepsFlipThinkingToWorking() async {
        let transport = FakeTransport()
        let vm = model(transport, stewardInterval: 3600)
        vm.draft = "go"
        vm.send()
        await settleRunLoop()
        transport.steps = [.fake(id: "s1", parent: "server-1", index: 0, text: "Picking this up", phase: "thinking")]
        await settleRunLoop()

        XCTAssertEqual(vm.roomStatus, .working)
    }

    // MARK: - Settled verdict

    func testStewardSettledSettlesTheTurn() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "settled")
        let vm = model(transport)
        vm.draft = "wrap it up"
        vm.send()
        await settleRunLoop(10)

        XCTAssertEqual(vm.turn, .idle, "the steward's settled is the same server fact as the 9999 sentinel")
        XCTAssertEqual(vm.roomStatus, .idle)
        XCTAssertNil(vm.turnHealth, "a settled turn carries no verdict")
    }

    // MARK: - needs_attention verdicts

    func testHardCauseHaltsTheTurnAndReadsStuck() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: false)
        let vm = model(transport)
        vm.draft = "do the thing"
        vm.send()
        await settleRunLoop(10)

        XCTAssertEqual(vm.turn, .idle, "needs_attention ends the awaiting state — the web flips awaiting=false on exactly this")
        XCTAssertEqual(vm.roomStatus, .stuck, "runner_failed is a hard cause: nothing is running")
        XCTAssertEqual(vm.turnHealth?.cause, "runner_failed", "the verdict must SURVIVE the halt — the room keeps saying why")
    }

    func testSoftCauseReadsNeedsYou() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "agent_silent", repaired: false)
        let vm = model(transport)
        vm.draft = "still there?"
        vm.send()
        await settleRunLoop(10)

        XCTAssertEqual(vm.roomStatus, .needsYou)
    }

    /// A repaired needs_attention is the steward fixing things itself — the turn
    /// stays open and polling continues.
    func testRepairedVerdictDoesNotHalt() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: true)
        let vm = model(transport)
        vm.draft = "carry on"
        vm.send()
        await settleRunLoop(10)

        XCTAssertTrue(vm.turnIsOpen, "a repaired turn is a running turn")
    }

    // MARK: - Repair is asked exactly once

    func testRepairIsAskedExactlyOncePerTurn() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "active")
        let vm = model(transport, repairAfter: 0) // eligible immediately
        vm.draft = "fix it"
        vm.send()
        await settleRunLoop(12)

        let repairs = transport.healthRequests.filter(\.repair).count
        XCTAssertEqual(repairs, 1, "GET until eligible, then ONE POST — repair is not a retry loop")
        XCTAssertGreaterThan(transport.healthRequests.count, 1, "the read poll keeps running after the ask")
    }

    /// The steward asks about the turn's parent row — a server id, never invented.
    func testStewardAsksAboutTheParentRow() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "active")
        let vm = model(transport)
        vm.draft = "who am I"
        vm.send()
        await settleRunLoop(8)

        XCTAssertEqual(transport.healthRequests.first?.messageID, "server-1")
    }

    /// No verdict (nil) changes nothing — health is advisory.
    func testNoVerdictChangesNothing() async {
        let transport = FakeTransport()
        transport.healthDefault = nil
        let vm = model(transport)
        vm.draft = "quiet steward"
        vm.send()
        await settleRunLoop(8)

        XCTAssertTrue(vm.turnIsOpen)
        XCTAssertEqual(vm.turnHealth?.state, "accepted", "the optimistic accepted stands until a real verdict")
    }

    // MARK: - Stale feed

    func testFailedFetchWhileAwaitingReadsStuckAndRecovers() async {
        let transport = FakeTransport()
        let vm = model(transport, stewardInterval: 3600)
        vm.draft = "hold the line"
        vm.send()
        await settleRunLoop()
        XCTAssertEqual(vm.roomStatus, .thinking)

        transport.failNextFetch = CornerAPI.APIError.badResponse(status: 500, message: "boom")
        await vm.load()
        XCTAssertEqual(vm.roomStatus, .stuck, "a live turn on a stale feed is stuck — working would be a guess")

        await vm.load() // transport recovered (failNextFetch consumed)
        XCTAssertEqual(vm.roomStatus, .thinking, "the feed recovering clears the stuck call on the spot")
    }

    // MARK: - The conversation continuing clears a stale verdict

    func testReplyAfterHaltClearsTheVerdict() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: false)
        let vm = model(transport)
        vm.draft = "first ask"
        vm.send()
        await settleRunLoop(10)
        XCTAssertEqual(vm.roomStatus, .stuck)

        // The agent answers after all — the verdict is history, not the present.
        transport.healthDefault = nil
        transport.rows.append(.fake(id: "late-reply", role: "assistant",
                                    text: "here it is", epoch: Date().timeIntervalSince1970 + 1))
        await vm.load()

        XCTAssertEqual(vm.roomStatus, .idle, "a Stuck chip over a fresh answer is the lie in the other direction")
        XCTAssertNil(vm.turnHealth)
    }
}
