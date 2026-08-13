// ScrollBrainTests.swift — Corner native iOS tests
// corner:native-ios R18 smoothness pass, round N4
//
// The one scroll brain, pinned rule by rule. The web extracted this hook after
// three drifting copies; the tests are what keep the native copy from becoming
// the fourth.

import XCTest
@testable import Corner

final class ScrollBrainTests: XCTestCase {

    // MARK: - Rule 1: count changes

    func testIdenticalCountNeverMoves() {
        var brain = ScrollBrain()
        _ = brain.onCountChange(count: 12, awaiting: false, distanceFromBottom: 0)
        let action = brain.onCountChange(count: 12, awaiting: false, distanceFromBottom: 0)
        XCTAssertEqual(action, .none,
                       "the poll returns a fresh array every few seconds — an identical count must never move the reader")
    }

    func testFirstLoadSnapsInstantly() {
        var brain = ScrollBrain()
        XCTAssertEqual(brain.onCountChange(count: 40, awaiting: false, distanceFromBottom: 9999),
                       .snapInstant, "landing in a room means landing at the bottom, no animation")
    }

    func testLiveTurnAlwaysFollows() {
        var brain = ScrollBrain()
        _ = brain.onCountChange(count: 5, awaiting: false, distanceFromBottom: 0)
        XCTAssertEqual(brain.onCountChange(count: 6, awaiting: true, distanceFromBottom: 5000),
                       .followSmooth, "a live turn follows even from deep scrollback")
    }

    func testNearBottomFollowsWhenIdle() {
        var brain = ScrollBrain()
        _ = brain.onCountChange(count: 5, awaiting: false, distanceFromBottom: 0)
        XCTAssertEqual(brain.onCountChange(count: 6, awaiting: false, distanceFromBottom: 120),
                       .followSmooth)
    }

    func testFarFromBottomNeverYanksWhenIdle() {
        var brain = ScrollBrain()
        _ = brain.onCountChange(count: 5, awaiting: false, distanceFromBottom: 0)
        XCTAssertEqual(brain.onCountChange(count: 6, awaiting: false, distanceFromBottom: 900),
                       .none, "a new message must not yank someone reading history — that is what the pill is for")
    }

    func testRoomChangeResnaps() {
        var brain = ScrollBrain()
        _ = brain.onCountChange(count: 30, awaiting: false, distanceFromBottom: 0)
        brain.resetForRoomChange()
        XCTAssertEqual(brain.onCountChange(count: 8, awaiting: false, distanceFromBottom: 3000),
                       .snapInstant, "entering a room always lands at the tail")
    }

    // MARK: - Rule 2: growth

    func testGrowthRepinsOnlyWhileAwaitingAndNearTheTail() {
        let brain = ScrollBrain()
        XCTAssertEqual(brain.onContentGrowth(awaiting: true, distanceFromBottom: 40), .snapInstant,
                       "the follower at the tail stays pinned through draft growth")
        XCTAssertEqual(brain.onContentGrowth(awaiting: false, distanceFromBottom: 40), .none,
                       "no live turn, no growth to chase")
        XCTAssertEqual(brain.onContentGrowth(awaiting: true, distanceFromBottom: 800), .none,
                       "a reader who scrolled up mid-turn is reading — the pin is not a leash")
    }

    // MARK: - Rule 3: the pill

    func testPillShowsOnlyWhenIdleAndFar() {
        let brain = ScrollBrain()
        XCTAssertTrue(brain.showJump(awaiting: false, distanceFromBottom: 500))
        XCTAssertFalse(brain.showJump(awaiting: false, distanceFromBottom: 100),
                       "near the tail there is nothing to jump to")
        XCTAssertFalse(brain.showJump(awaiting: true, distanceFromBottom: 500),
                       "a live turn auto-follows — the pill would flicker")
    }

    func testThresholdsMatchTheWebContract() {
        let brain = ScrollBrain()
        XCTAssertEqual(brain.followThreshold, 200)
        XCTAssertEqual(brain.pillThreshold, 240)
    }
}
