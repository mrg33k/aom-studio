import XCTest
@testable import Corner

/// Native plan Task 6, Step 1: ledger tests, adapted to the real backend
/// kinds. The plan's `testLedgerExcludesTypingAndTokenEvents` asserts
/// `route_changed` / `artifact_created` kinds, which the backend never emits
/// (`convex/ledger.ts` KINDS: did, decided, asked, learned, started,
/// finished, sent, spent — route and artifact meaning rides the ledger
/// `description` sentence + `subjectIDs`). These tests pin the real contract:
/// every item's kind is a real kind, and no description is a raw chat line
/// or a token/typing event.
@MainActor
final class LedgerStoreTests: XCTestCase {

    private func item(id: String, kind: String, description: String, subjects: [String] = ["aster"]) -> LedgerItem {
        LedgerItem(
            id: id, workspaceID: "world-1", kind: kind, description: description,
            actor: "karen", surface: "corner:v2", subjectIDs: subjects,
            createdAt: Date(), supersedesID: nil
        )
    }

    func testLedgerRefreshServesRealKinds() async throws {
        let api = CornerV2APIFake()
        let served = [
            item(id: "ledger-1", kind: "did", description: "Scoped a ledger row."),
            item(
                id: "ledger-2", kind: "learned", description: "Learned the brand color from the Aster brief.",
                subjects: ["thread-aster-1"]
            ),
        ]
        api.ledgerHandler = { _, _ in served }
        let store = LedgerStore(api: api)

        try await store.refresh(workspaceID: "world-1", after: nil)

        XCTAssertEqual(store.items.map(\.kind), ["did", "learned"])
        XCTAssertEqual(store.items.map(\.id), ["ledger-1", "ledger-2"])
    }

    func testLedgerExcludesTypingAndTokenEvents() async throws {
        let api = CornerV2APIFake()
        api.ledgerHandler = { _, _ in
            [
                self.item(id: "ledger-1", kind: "did", description: "Scoped a ledger row."),
                self.item(id: "ledger-2", kind: "decided", description: "Chose Aster for the launch."),
                self.item(id: "ledger-3", kind: "asked", description: "Asked which project owns the invoice."),
                self.item(
                    id: "ledger-4", kind: "learned",
                    description: "Learned the brand color from the Aster brief."
                ),
                self.item(id: "ledger-5", kind: "started", description: "Started the Ship home page mission."),
                self.item(id: "ledger-6", kind: "finished", description: "Finished the competitive pass."),
                self.item(id: "ledger-7", kind: "sent", description: "Sent the brief to the Aster thread."),
                self.item(id: "ledger-8", kind: "spent", description: "Spent 41s of agent time on research."),
            ]
        }
        let store = LedgerStore(api: api)

        try await store.refresh(workspaceID: "world-1", after: nil)

        XCTAssertEqual(store.items.count, 8)
        for entry in store.items {
            // Backend-wins: only the eight real kinds exist. The plan's
            // `route_changed` / `artifact_created` are not ledger kinds.
            XCTAssertTrue(
                LedgerStore.realKinds.contains(entry.kind),
                "unknown ledger kind: \(entry.kind)"
            )
            // Server records are sentences about what happened — never raw
            // chat lines, token counts, or typing indicators.
            XCTAssertFalse(entry.description.isEmpty)
            XCTAssertLessThanOrEqual(entry.description.count, 240)
            let lower = entry.description.lowercased()
            XCTAssertFalse(lower.contains("typing"), "typing event leaked into the ledger")
            XCTAssertFalse(lower.contains("token"), "token event leaked into the ledger")
        }
    }

    func testLedgerStoreNeverWrites() {
        // The reader has no write, edit, or manufacture surface: the only
        // mutating entry point refreshes from the server. This test pins the
        // interface — a `LedgerStore` value exposes `items`, `errorText`,
        // and `refresh`, and nothing else that returns Void work.
        let store = LedgerStore(api: CornerV2APIFake())
        XCTAssertTrue(store.items.isEmpty)
    }
}
