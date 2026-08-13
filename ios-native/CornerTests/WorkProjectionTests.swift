// WorkProjectionTests.swift — Corner native iOS tests
// corner:native-ios R18 smoothness pass, round N5
//
// The work card's label pipeline, pinned: dedup keeps the newest re-emission,
// adjacent repeats collapse, the fallback ladder never leaves the card empty,
// and progress is determinate only when a REAL count exists.

import XCTest
@testable import Corner

final class WorkProjectionTests: XCTestCase {

    private func step(_ id: String, index: Int, text: String, at epoch: TimeInterval) -> MessageStep {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let data = try! JSONSerialization.data(withJSONObject: [
            "id": id, "parent_message_id": "p", "step_index": index, "text": text,
            "timestamp": iso.string(from: Date(timeIntervalSince1970: epoch)),
        ])
        return try! JSONDecoder().decode(MessageStep.self, from: data)
    }

    func testReEmittedStepReplacesItsOlderSelf() {
        let steps = [
            step("a", index: 0, text: "Picking this up", at: 100),
            step("b", index: 1, text: "Keeping the room warm", at: 110),
            step("c", index: 1, text: "Keeping the room warm", at: 170), // keep-alive re-emit
        ]
        let projected = WorkProjection.projected(steps)
        XCTAssertEqual(projected.count, 2, "a re-emitted keep-alive replaces its older self, never stacks")
        XCTAssertEqual(projected.last?.id, "c", "the newest emission wins")
    }

    func testAdjacentIdenticalLabelsCollapse() {
        let steps = [
            step("a", index: 0, text: "Reading the file", at: 100),
            step("b", index: 1, text: "Reading the file", at: 110),
            step("c", index: 2, text: "Writing the reply", at: 120),
        ]
        let labels = WorkProjection.projected(steps).map(\.text)
        XCTAssertEqual(labels, ["Reading the file", "Writing the reply"],
                       "one thought, one line — repeats collapse")
    }

    func testOrderIsByStepIndexNotArrival() {
        let steps = [
            step("late", index: 2, text: "Third", at: 100),
            step("early", index: 0, text: "First", at: 130),
            step("mid", index: 1, text: "Second", at: 120),
        ]
        XCTAssertEqual(WorkProjection.projected(steps).map(\.text), ["First", "Second", "Third"])
    }

    func testFallbackLadderNeverLeavesTheCardEmpty() {
        XCTAssertEqual(
            WorkProjection.currentLabel(steps: [], ask: "tighten the composer spacing"),
            "Responding to: tighten the composer spacing"
        )
        XCTAssertEqual(WorkProjection.currentLabel(steps: [], ask: "   "), "Preparing a response")
        XCTAssertEqual(WorkProjection.currentLabel(steps: [], ask: nil), "Preparing a response")
    }

    func testLongAskIsClipped() {
        let ask = String(repeating: "word ", count: 40)
        let label = WorkProjection.currentLabel(steps: [], ask: ask)
        XCTAssertTrue(label.hasSuffix("…"))
        XCTAssertLessThan(label.count, 100)
    }

    func testGlyphVocabulary() {
        XCTAssertEqual(WorkProjection.glyph(for: "Searching the codebase"), "magnifyingglass")
        XCTAssertEqual(WorkProjection.glyph(for: "Reading the room's canon"), "book")
        XCTAssertEqual(WorkProjection.glyph(for: "Writing the reply"), "square.and.pencil")
        XCTAssertEqual(WorkProjection.glyph(for: "Running the test suite"), "play")
        XCTAssertEqual(WorkProjection.glyph(for: "Sending the file over"), "paperplane")
        XCTAssertEqual(WorkProjection.glyph(for: "Pushing the commit"), "shippingbox")
        XCTAssertEqual(WorkProjection.glyph(for: "Need anything else?"), "questionmark.circle")
        XCTAssertEqual(WorkProjection.glyph(for: "Mysterious activity"), "circle")
    }

    func testProgressIsDeterminateOnlyWithARealCount() {
        XCTAssertEqual(WorkProjection.checklistProgress(in: "Step 3 of 8"), 3.0 / 8.0)
        XCTAssertEqual(WorkProjection.checklistProgress(in: "Checklist 2/4 done"), 0.5)
        XCTAssertNil(WorkProjection.checklistProgress(in: "Working on it"),
                     "no count, no fraction — an invented percentage is fake UI")
        XCTAssertNil(WorkProjection.checklistProgress(in: "Step 9 of 4"),
                     "an impossible count is not a count")
        XCTAssertNil(WorkProjection.checklistProgress(in: "Step 0 of 4"))
    }
}
