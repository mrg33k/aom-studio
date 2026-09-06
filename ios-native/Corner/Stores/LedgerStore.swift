// LedgerStore.swift — Corner native iOS
// corner:corner-v2 native plan Task 6.
//
// The append-only native ledger reader. It READS server records and nothing
// else: no write, edit, or locally manufactured history exists on this type.
// Every item shown anywhere comes from `v2Native:ledger`, whose kinds are the
// backend's (`did decided asked learned started finished sent spent`); route
// and artifact meaning rides the `description` sentence + `subjectIDs`.

import Combine
import Foundation

@MainActor
final class LedgerStore: ObservableObject {
    /// The only kinds the backend emits (`convex/ledger.ts` KINDS). The
    /// plan's `route_changed` / `artifact_created` are not ledger kinds.
    static let realKinds: Set<String> = [
        "did", "decided", "asked", "learned", "started", "finished", "sent", "spent",
    ]

    @Published private(set) var items: [LedgerItem] = []
    @Published private(set) var errorText: String?

    private let api: any CornerV2API

    init(api: (any CornerV2API)? = nil) {
        self.api = api ?? DefaultCornerV2API()
    }

    func refresh(workspaceID: String, after: String? = nil) async throws {
        do {
            items = try await api.ledger(workspaceID: workspaceID, after: after)
            errorText = nil
        } catch {
            errorText = "The activity could not be loaded."
            throw error
        }
    }
}
