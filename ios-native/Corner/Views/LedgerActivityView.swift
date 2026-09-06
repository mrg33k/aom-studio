// LedgerActivityView.swift — Corner native iOS
// corner:corner-v2 native plan Task 6.
//
// The Activity surface: meaningful server records only (started, did,
// decided, asked, learned, finished, sent, spent — plus the route and
// artifact changes those descriptions carry). It never writes, edits, or
// locally manufactures ledger history. Reachable from the workspace tree's
// menu, never from a room.

import SwiftUI

struct LedgerActivityView: View {
    @StateObject private var store: LedgerStore
    @Environment(\.dismiss) private var dismiss

    init(api: (any CornerV2API)? = nil) {
        _store = StateObject(wrappedValue: LedgerStore(api: api))
    }

    var body: some View {
        NavigationStack {
            Group {
                if let error = store.errorText, store.items.isEmpty {
                    VStack(spacing: Theme.s3) {
                        Image(systemName: "wifi.exclamationmark")
                            .font(.system(size: 22))
                            .foregroundStyle(Theme.inkSoft)
                        Text(error)
                            .font(.hkFootnote)
                            .foregroundStyle(Theme.inkSoft)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if store.items.isEmpty {
                    VStack(spacing: Theme.s3) {
                        ProgressView()
                        Text("Loading activity…")
                            .font(.hkFootnote)
                            .foregroundStyle(Theme.inkSoft)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(store.items) { entry in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.kind.uppercased())
                                .font(.hanken(11).weight(.semibold))
                                .foregroundStyle(Theme.accent)
                            Text(entry.description)
                                .font(.hanken(14))
                                .foregroundStyle(Theme.ink)
                            Text("\(entry.actor) · \(entry.surface)")
                                .font(.hanken(11))
                                .foregroundStyle(Theme.inkSoft)
                        }
                        .padding(.vertical, 4)
                        .accessibilityIdentifier("ledger-item")
                    }
                    .listStyle(.plain)
                }
            }
            .groundBackground()
            .navigationTitle("Activity")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .accessibilityIdentifier("ledger-close")
                }
            }
            .task { await load() }
        }
    }

    @MainActor
    private func load() async {
        guard let workspaceID = WorkspaceStore.shared.workspace?.id else {
            return
        }
        try? await store.refresh(workspaceID: workspaceID, after: nil)
    }
}
