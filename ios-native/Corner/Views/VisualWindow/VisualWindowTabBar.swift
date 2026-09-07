// VisualWindowTabBar.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// The design's file strip as chips: horizontally scrolling, selected chip in
// surface-2 with a hairline on every chip (never an underline — that belongs
// to the Preview/Context header tabs), icon + label only at rest. The design
// draws no close chrome on a resting tab (P082, the web's L028 twin), so a
// tab closes the iOS way: swipe-to-delete on the tab, or the long-press
// menu — never a visible ×. Identifiers live on the leaf buttons only —
// never on the strip (a container identifier overwrites its children; R14).
// Only `close(id:)` removes a tab; tapping a chip selects.

import SwiftUI

struct VisualWindowTabBar: View {
    @EnvironmentObject private var window: VisualWindowStore

    // P051: the file strip — 36px r9 chips with the kind icon, 13.5/500.
    // The selected chip is surface-2; the underline belongs to the
    // Preview/Context header tabs (P024), never to these chips.
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.s2) {
                ForEach(window.tabs) { tab in
                    let selected = window.selectedTabID == tab.id
                    Button { window.select(id: tab.id) } label: {
                        HStack(spacing: 6) {
                            Image(systemName: V2ArtifactCards.icon(for: tab.kind))
                                .font(.system(size: 15, weight: .regular))
                                .foregroundStyle(Theme.inkSoft)
                            Text(tab.title)
                                .font(.hanken(13.5).weight(.medium))
                                .foregroundStyle(selected ? Theme.ink : Theme.inkSoft)
                                .lineLimit(1)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("visual-tab")
                    .accessibilityLabel(tab.title)
                    .padding(.horizontal, 11)
                    .frame(height: 36)
                    .background(
                        selected ? Theme.raised2 : Theme.raised,
                        in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                    )
                    // R19: the design draws a hairline around every chip;
                    // without it an unselected chip melts into the sheet.
                    .overlay(
                        RoundedRectangle(cornerRadius: 9, style: .continuous)
                            .strokeBorder(Theme.hairline, lineWidth: 1)
                    )
                    // P082: no × at rest — close by swipe-to-delete or the
                    // long-press menu (the iOS idiom), like the design.
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task { try? await window.close(id: tab.id) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        .accessibilityIdentifier("visual-close-swipe")
                        .accessibilityLabel("Close \(tab.title)")
                    }
                    .contextMenu {
                        Button(role: .destructive) {
                            Task { try? await window.close(id: tab.id) }
                        } label: {
                            Label("Close Tab", systemImage: "xmark")
                        }
                        .accessibilityIdentifier("visual-close")
                    }
                }
            }
            .padding(.horizontal, 21)
        }
    }
}
