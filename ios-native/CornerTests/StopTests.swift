// StopTests.swift — Corner native iOS tests
// corner:native-ios R18 smoothness pass, round N2
//
// Stop + restart, run against scripted verdicts. The one law under every case:
// STOP NEVER LOCALLY SETTLES A TURN. `awaiting` flips only on the server's row or
// sentinel; everything else is optimistic paint that must revert honestly.

import XCTest
@testable import Corner

@MainActor
final class StopTests: XCTestCase {

    private let room = Room(world: "aom", kind: .agent(slug: "rex"), title: "Assistant", subtitle: "")

    private func model(
        _ transport: FakeTransport,
        stewardInterval: TimeInterval = 3600,
        stopTimeout: TimeInterval = 3600
    ) -> ChatViewModel {
        ChatViewModel(
            room: room,
            transport: transport,
            backstop: 60,
            stepInterval: 0.01,
            reconcileInterval: 3600,
            stewardInterval: stewardInterval,
            repairAfter: 3600,
            stopTimeout: stopTimeout,
            onFirstReply: {}
        )
    }

    private func settleRunLoop(_ times: Int = 6) async {
        for _ in 0..<times {
            try? await Task.sleep(for: .milliseconds(20))
        }
    }

    private func openTurn(_ transport: FakeTransport, _ vm: ChatViewModel) async {
        vm.draft = "long job"
        vm.send()
        await settleRunLoop()
    }

    // MARK: - Guards

    func testStopWithoutATurnMakesNoRequest() async {
        let transport = FakeTransport()
        let vm = model(transport)
        let ok = await vm.stopTurn()
        XCTAssertFalse(ok)
        XCTAssertTrue(transport.stopRequests.isEmpty, "no turn, no request")
    }

    // MARK: - Accepted stop

    func testAcceptedStopHoldsStoppingUntilTheSentinel() async {
        let transport = FakeTransport()
        transport.stopResult = StopResult(stopped: true)
        let vm = model(transport)
        await openTurn(transport, vm)

        let ok = await vm.stopTurn()
        XCTAssertTrue(ok)
        XCTAssertEqual(transport.stopRequests, ["server-1"], "the ask names the durable parent row")
        XCTAssertEqual(vm.roomStatus, .stopping, "the user's stop is acknowledged on the spot")
        XCTAssertTrue(vm.turnIsOpen, "STOP NEVER LOCALLY SETTLES — the server's row ends the turn")

        // The bridge's watcher writes the stopped row and stamps the sentinel.
        transport.steps = [ .fake(id: "sent", parent: "server-1", index: 9999, text: "settled", phase: "stopped") ]
        await settleRunLoop()

        XCTAssertFalse(vm.turnIsOpen, "the sentinel ends the turn — knowing, not guessing")
        XCTAssertEqual(vm.roomStatus, .idle)
        XCTAssertNil(vm.stopNotice)
    }

    func testStopControlStates() async {
        let transport = FakeTransport()
        transport.stopResult = StopResult(stopped: true)
        let vm = model(transport)
        XCTAssertEqual(vm.stopControl, .hidden, "no turn, no control")

        await openTurn(transport, vm)
        XCTAssertEqual(vm.stopControl, .ready)

        await vm.stopTurn()
        XCTAssertEqual(vm.stopControl, .stopping)
    }

    // MARK: - Refusals

    func testFeatureOffLatchesForTheSession() async {
        let transport = FakeTransport()
        transport.stopResult = StopResult(stopped: false, reason: "disabled", featureOff: true)
        let vm = model(transport)
        await openTurn(transport, vm)

        let ok = await vm.stopTurn()
        XCTAssertFalse(ok)
        XCTAssertTrue(vm.stopUnavailable)
        XCTAssertEqual(vm.stopControl, .hidden, "a control the bridge will refuse is a lie in button form")
        XCTAssertEqual(vm.roomStatus, .thinking, "the optimistic stopping reverted — the turn runs on")

        let again = await vm.stopTurn()
        XCTAssertFalse(again)
        XCTAssertEqual(transport.stopRequests.count, 1, "latched: no second ask this session")
    }

    func testRefusedStopRevertsToTheTurnsRealState() async {
        let transport = FakeTransport()
        transport.stopResult = StopResult(stopped: false, reason: "turn_finishing")
        let vm = model(transport)
        await openTurn(transport, vm)

        let ok = await vm.stopTurn()
        XCTAssertFalse(ok)
        XCTAssertFalse(vm.stopUnavailable, "turn_finishing is not feature-off")
        XCTAssertEqual(vm.stopControl, .ready, "the user may ask again")
        XCTAssertEqual(vm.roomStatus, .thinking)
    }

    func testThrownStopReverts() async {
        let transport = FakeTransport()
        transport.stopError = CornerAPI.APIError.badResponse(status: 500, message: "boom")
        let vm = model(transport)
        await openTurn(transport, vm)

        let ok = await vm.stopTurn()
        XCTAssertFalse(ok)
        XCTAssertEqual(vm.roomStatus, .thinking)
        XCTAssertEqual(vm.stopControl, .ready)
    }

    // MARK: - The honesty timeout

    func testUnconfirmedStopRevertsWithAnHonestNotice() async {
        let transport = FakeTransport()
        transport.stopResult = StopResult(stopped: true)
        let vm = model(transport, stopTimeout: 0.05)
        await openTurn(transport, vm)

        await vm.stopTurn()
        XCTAssertEqual(vm.roomStatus, .stopping)

        await settleRunLoop(6) // > timeout; no sentinel ever arrives
        XCTAssertNotNil(vm.stopNotice, "an unconfirmed stop says so instead of a forever-disabled button")
        XCTAssertTrue(vm.turnIsOpen, "the turn was never faked closed")
        XCTAssertEqual(vm.roomStatus, .thinking, "back to the turn's real state")
    }

    // MARK: - Steward interplay

    func testRoutineStewardReadCannotUnsayStopping() async {
        let transport = FakeTransport()
        transport.stopResult = StopResult(stopped: true)
        transport.healthDefault = RoomHealth(state: "active")
        let vm = model(transport, stewardInterval: 0.02)
        await openTurn(transport, vm)

        await vm.stopTurn()
        await settleRunLoop(6)
        XCTAssertEqual(vm.roomStatus, .stopping,
                       "an 'active' read 10s later must not un-say the user's stop")
    }

    // MARK: - Repair resumes

    func testRepairResumesTheTurnAsRecovering() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: false)
        let vm = model(transport, stewardInterval: 0.02)
        await openTurn(transport, vm)
        await settleRunLoop(8)
        XCTAssertEqual(vm.roomStatus, .stuck)
        XCTAssertFalse(vm.turnIsOpen)

        // The human taps Restart; the repair POST succeeds. Steward goes quiet so
        // the scripted verdict is consumed only by the repair ask.
        transport.healthDefault = nil
        transport.healthScript = [RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: true)]
        let ok = await vm.repairTurn()

        XCTAssertTrue(ok)
        XCTAssertTrue(vm.turnIsOpen, "a successful repair re-runs the turn — watch it again")
        XCTAssertEqual(vm.turnHealth?.state, "recovering")
        XCTAssertEqual(transport.healthRequests.last?.repair, true)
    }

    func testFailedRepairKeepsTheVerdict() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: false)
        let vm = model(transport, stewardInterval: 0.02)
        await openTurn(transport, vm)
        await settleRunLoop(8)

        transport.healthDefault = nil
        transport.healthScript = [RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: false)]
        let ok = await vm.repairTurn()

        XCTAssertFalse(ok)
        XCTAssertFalse(vm.turnIsOpen)
        XCTAssertEqual(vm.roomStatus, .stuck, "a repair that did nothing changes nothing")
    }

    // MARK: - agent_silent actions

    func testAskForStatusSendsTheLiteralLine() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "agent_silent", repaired: false)
        let vm = model(transport, stewardInterval: 0.02)
        await openTurn(transport, vm)
        await settleRunLoop(8)
        XCTAssertEqual(vm.roomStatus, .needsYou)

        transport.healthDefault = nil
        vm.askForStatus()
        await settleRunLoop()

        XCTAssertEqual(transport.sentTexts.last,
                       "Are you still on this? Give me a quick status on my last message.")
        XCTAssertTrue(vm.turnIsOpen, "the status ask is a genuinely new turn")
    }

    func testResendAfterRecoverySendsTheSameWords() async {
        let transport = FakeTransport()
        transport.healthDefault = RoomHealth(state: "needs_attention", cause: "agent_silent", repaired: false)
        let vm = model(transport, stewardInterval: 0.02)
        vm.draft = "the original ask"
        vm.send()
        await settleRunLoop(8)

        transport.healthDefault = nil
        vm.resendAfterRecovery()
        await settleRunLoop()

        XCTAssertEqual(transport.sentTexts, ["the original ask", "the original ask"])
    }
}

// MARK: - Recovery rules (pure)

final class RoomRecoveryRulesTests: XCTestCase {

    func testRestartAllowlistIsExact() {
        for cause in ["runner_failed", "unclaimed", "settled_without_reply", "message_missing"] {
            XCTAssertTrue(RoomRecovery.showsRestart(cause: cause), cause)
        }
        for cause in ["agent_silent", "write_failed", "reply_room_mismatch", nil] {
            XCTAssertFalse(RoomRecovery.showsRestart(cause: cause), cause ?? "nil")
        }
    }

    func testHeaders() {
        XCTAssertEqual(RoomRecovery.header(state: "recovering"), "Self-repairing")
        XCTAssertEqual(RoomRecovery.header(state: "needs_attention"), "Needs a look")
        XCTAssertEqual(RoomRecovery.header(state: nil), "Needs a look")
    }

    func testEveryCauseHasPlainWords() {
        let causes = ["runner_failed", "unclaimed", "message_missing", "reply_room_mismatch",
                      "settled_without_reply", "write_failed", "agent_silent", "anything_else"]
        for cause in causes {
            let msg = RoomRecovery.message(cause: cause)
            XCTAssertFalse(msg.isEmpty, cause)
            XCTAssertFalse(msg.contains("_"), "\(cause): copy must be words, not identifiers")
        }
    }

    func testStopResultDecodesTheWireShape() throws {
        let json = """
        {"stopped":false,"reason":"disabled","already":false,"pre_send":false,"feature_off":true}
        """.data(using: .utf8)!
        let result = try JSONDecoder().decode(StopResult.self, from: json)
        XCTAssertEqual(result.featureOff, true)
        XCTAssertEqual(result.reason, "disabled")

        let ok = try JSONDecoder().decode(StopResult.self, from: #"{"stopped":true}"#.data(using: .utf8)!)
        XCTAssertEqual(ok.stopped, true)
        XCTAssertNil(ok.featureOff)
    }
}
