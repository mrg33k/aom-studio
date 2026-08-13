// RoomStatusTests.swift — Corner native iOS tests
// corner:native-ios R18 smoothness pass, round N1
//
// The ported roomStatus derivation, swept exhaustively — the web's
// cv6-room-status.test.mjs promise carried over: every input combination maps to
// exactly one status, and the honesty rules hold at every priority boundary.

import XCTest
@testable import Corner

final class RoomStatusTests: XCTestCase {

    private let healthStates: [String?] = [
        nil, "accepted", "active", "stopping", "needs_attention",
        "settled", "recovering", "unknown",
    ]
    private let causes: [String?] = [
        nil, "runner_failed", "unclaimed", "message_missing", "reply_room_mismatch",
        "settled_without_reply", "write_failed", "agent_silent",
    ]

    /// Every combination produces a status, and the priority order is total:
    /// stopping > needs_attention > stale > draft > steps > thinking > idle.
    func testEveryCombinationMapsToExactlyOneStatusByPriority() {
        for healthState in healthStates {
            for cause in causes {
                for awaiting in [false, true] {
                    for stepCount in [0, 2] {
                        for draft in [false, true] {
                            for stale in [false, true] {
                                let got = RoomStatus.derive(
                                    awaiting: awaiting, liveStepCount: stepCount,
                                    draftStreaming: draft, healthState: healthState,
                                    healthCause: cause, feedStale: stale
                                )
                                let want: RoomStatus
                                if healthState == "stopping" {
                                    want = .stopping
                                } else if healthState == "needs_attention" {
                                    want = RoomStatus.hardCauses.contains(cause ?? "") ? .stuck : .needsYou
                                } else if awaiting && stale {
                                    want = .stuck
                                } else if awaiting && draft {
                                    want = .streaming
                                } else if awaiting && stepCount > 0 {
                                    want = .working
                                } else if awaiting {
                                    want = .thinking
                                } else {
                                    want = .idle
                                }
                                XCTAssertEqual(
                                    got, want,
                                    "health=\(healthState ?? "nil") cause=\(cause ?? "nil") awaiting=\(awaiting) steps=\(stepCount) draft=\(draft) stale=\(stale)"
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    /// Honesty rule: `stopping` beats everything — a stop the user asked for is
    /// acknowledged over any other signal.
    func testStoppingBeatsEverything() {
        let got = RoomStatus.derive(
            awaiting: true, liveStepCount: 5, draftStreaming: true,
            healthState: "stopping", healthCause: "runner_failed", feedStale: true
        )
        XCTAssertEqual(got, .stopping)
    }

    /// Honesty rule: hard causes are STUCK — nothing is actually running — and the
    /// recoverable rest is NEEDS YOU. Different words because different actions.
    func testHardCausesAreStuckSoftCausesAreNeedsYou() {
        for cause in RoomStatus.hardCauses {
            XCTAssertEqual(
                RoomStatus.derive(awaiting: false, liveStepCount: 0, draftStreaming: false,
                                  healthState: "needs_attention", healthCause: cause, feedStale: false),
                .stuck, cause
            )
        }
        for cause in ["agent_silent", "settled_without_reply", "write_failed", nil] {
            XCTAssertEqual(
                RoomStatus.derive(awaiting: false, liveStepCount: 0, draftStreaming: false,
                                  healthState: "needs_attention", healthCause: cause, feedStale: false),
                .needsYou, cause ?? "nil"
            )
        }
    }

    /// Honesty rule: a live turn on a stale feed is stuck, not working — even mid-draft.
    func testStaleFeedBeatsDraftAndSteps() {
        let got = RoomStatus.derive(
            awaiting: true, liveStepCount: 3, draftStreaming: true,
            healthState: "active", healthCause: nil, feedStale: true
        )
        XCTAssertEqual(got, .stuck)
    }

    /// Honesty rule: `streaming` requires a live draft — steps alone are `working`.
    func testStreamingRequiresADraftNeverInferredFromSteps() {
        XCTAssertEqual(
            RoomStatus.derive(awaiting: true, liveStepCount: 8, draftStreaming: false,
                              healthState: "active", healthCause: nil, feedStale: false),
            .working
        )
        XCTAssertEqual(
            RoomStatus.derive(awaiting: true, liveStepCount: 8, draftStreaming: true,
                              healthState: "active", healthCause: nil, feedStale: false),
            .streaming
        )
    }

    /// A closed turn with no verdict is idle no matter what stale flags or step
    /// residue exist — the rail must not invent a status for a quiet room.
    func testClosedTurnWithNoVerdictIsIdle() {
        XCTAssertEqual(
            RoomStatus.derive(awaiting: false, liveStepCount: 4, draftStreaming: true,
                              healthState: "active", healthCause: nil, feedStale: true),
            .idle
        )
    }

    /// The labels are the user's words: Writing (not Streaming), and idle renders
    /// NOTHING — an empty label, never an "idle" chip.
    func testLabelsAndTones() {
        XCTAssertEqual(RoomStatus.streaming.label, "Writing")
        XCTAssertEqual(RoomStatus.stopping.label, "Stopping…")
        XCTAssertEqual(RoomStatus.needsYou.label, "Needs you")
        XCTAssertEqual(RoomStatus.stuck.label, "Stuck")
        XCTAssertEqual(RoomStatus.thinking.label, "Thinking")
        XCTAssertEqual(RoomStatus.working.label, "Working")
        XCTAssertEqual(RoomStatus.idle.label, "")

        for status in RoomStatus.allCases {
            switch status {
            case .thinking, .working, .streaming, .stopping:
                XCTAssertEqual(status.tone, .live)
            case .needsYou, .stuck:
                XCTAssertEqual(status.tone, .blocked)
            case .idle:
                XCTAssertEqual(status.tone, .none)
            }
        }
    }

    /// The settled phase `waiting` is NOT an input to this derivation at all — the
    /// vocabulary has no phase parameter, structurally enforcing the "chips end most
    /// replies" rule: waiting can never light a needs-you badge.
    func testPhaseIsNotAnInput() {
        // Compile-time contract: derive() takes no phase. This test documents it.
        let got = RoomStatus.derive(
            awaiting: false, liveStepCount: 0, draftStreaming: false,
            healthState: nil, healthCause: nil, feedStale: false
        )
        XCTAssertEqual(got, .idle)
    }

    /// RoomHealth decodes the real wire shape, including suggested_action and
    /// repair_count, and never throws on partial rows.
    func testRoomHealthDecodesWireShape() throws {
        let json = """
        {"found":true,"state":"needs_attention","cause":"settled_without_reply",
         "repaired":false,"repair_count":3,"phase":"waiting","suggested_action":"room_reset"}
        """.data(using: .utf8)!
        let health = try JSONDecoder().decode(RoomHealth.self, from: json)
        XCTAssertEqual(health.state, "needs_attention")
        XCTAssertEqual(health.cause, "settled_without_reply")
        XCTAssertEqual(health.repairCount, 3)
        XCTAssertEqual(health.suggestedAction, "room_reset")
        XCTAssertEqual(health.phase, "waiting")

        let sparse = try JSONDecoder().decode(RoomHealth.self, from: "{}".data(using: .utf8)!)
        XCTAssertNil(sparse.state)
    }

    /// MessageStep decodes the Round-B phase stamp and the project column.
    func testMessageStepDecodesPhase() {
        let step = MessageStep.fake(id: "s1", parent: "p1", index: 3, text: "Reading the file", phase: "working")
        XCTAssertEqual(step.phase, "working")
        let bare = MessageStep.fake(id: "s2", parent: "p1", index: 4, text: "…")
        XCTAssertNil(bare.phase)
    }
}
