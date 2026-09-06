import XCTest
@testable import Corner

/// Native plan Task 8, Step 1: checklist-only review tests. `V2ReviewStore`
/// (appended to ReviewStore.swift per the plan's file list — the legacy
/// queue `ReviewStore` keeps its contract and its tests) collects pins per
/// artifact, caps at four per HANDOFF §6, and submits once with client ids
/// the server echoes back as server ids.
@MainActor
final class ReviewStoreTests: XCTestCase {

    private func store() -> (V2ReviewStore, CornerV2APIFake) {
        let api = CornerV2APIFake()
        return (V2ReviewStore(api: api), api)
    }

    // MARK: - plan's test

    func testSubmitSendsOnlyNonEmptyPinsInAnchorOrder() async throws {
        let (store, api) = store()
        api.submitReviewHandler = { _, pins in
            SubmitReviewResult(checklistId: "checklist-1", pins: pins.enumerated().map { index, pin in
                SubmitReviewResult.PinID(clientID: pin.clientID, id: "pin-server-\(index + 1)")
            })
        }
        store.addPin(.point(page: 3, x: 20, y: 40), text: "Increase contrast")
        store.addPin(.time(seconds: 2.0, x: nil, y: nil), text: "")
        let result = try await store.submit(artifactID: "artifact-1")
        XCTAssertEqual(api.submittedPins.count, 1, "Send submits once, not once per pin")
        XCTAssertEqual(api.submittedPins.first?.map(\.text), ["Increase contrast"])
        XCTAssertEqual(result.checklistId, "checklist-1")
    }

    // MARK: - brief's tests

    /// HANDOFF §6: max 4 pins per artifact. The fifth is refused with a toast
    /// signal, never silently dropped into a fifth pin.
    func testMaxFourPinsPerArtifactVersion() {
        let (store, _) = store()
        XCTAssertTrue(store.addPin(.point(page: 1, x: 1, y: 1), text: "one"))
        XCTAssertTrue(store.addPin(.point(page: 1, x: 2, y: 2), text: "two"))
        XCTAssertTrue(store.addPin(.point(page: 1, x: 3, y: 3), text: "three"))
        XCTAssertTrue(store.addPin(.point(page: 1, x: 4, y: 4), text: "four"))
        XCTAssertFalse(store.addPin(.point(page: 1, x: 5, y: 5), text: "five"))
        XCTAssertEqual(store.pins.count, 4)
        XCTAssertTrue(store.limitHit)
    }

    /// After submit, local pins carry the server ids keyed by the client ids
    /// they were sent with (`submitReview` echoes clientId → id).
    func testIDsMapFromClientIDToServerIDAfterSubmit() async throws {
        let (store, api) = store()
        api.submitReviewHandler = { _, pins in
            SubmitReviewResult(checklistId: "checklist-9", pins: pins.map { pin in
                SubmitReviewResult.PinID(clientID: pin.clientID, id: "server-for-\(pin.clientID ?? "?")")
            })
        }
        store.addPin(.line(number: 7), text: "rename this")
        let before = store.pins.compactMap(\.clientID)
        XCTAssertEqual(before.count, 1)
        try await store.submit(artifactID: "artifact-1")
        XCTAssertEqual(store.pins.count, 1)
        XCTAssertEqual(store.pins.first?.id, "server-for-\(before.first ?? "")")
    }

    /// Removing a pin keeps the rest in anchor order; blank-only submits make
    /// no network call at all.
    func testRemovePinAndBlankOnlySubmitMakesNoCall() async throws {
        let (store, api) = store()
        api.submitReviewHandler = { _, _ in
            XCTFail("blank-only submit must not reach the network")
            return SubmitReviewResult(checklistId: "never", pins: [])
        }
        store.addPin(.point(page: 1, x: 1, y: 1), text: "keep")
        store.addPin(.point(page: 1, x: 2, y: 2), text: "   ")
        let doomed = store.pins.last(where: { $0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
        XCTAssertNotNil(doomed)
        store.removePin(id: doomed?.clientID ?? "")
        XCTAssertEqual(store.pins.map(\.text), ["keep"])
        store.updateText(id: store.pins.first?.clientID ?? "", text: "  ")
        try await store.submit(artifactID: "artifact-1")
        XCTAssertTrue(api.submittedPins.isEmpty)
    }
}
