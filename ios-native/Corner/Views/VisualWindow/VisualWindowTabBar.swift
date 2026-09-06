// VisualWindowTabBar.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// The design's file strip as chips: horizontally scrolling, selected tab
// underlined, every chip with its own close. Identifiers live on the leaf
// buttons only — never on the strip (a container identifier overwrites its
// children; R14). Only `close(id:)` removes a tab; tapping a chip selects.

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
                    HStack(spacing: 6) {
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
                        Button {
                            Task { try? await window.close(id: tab.id) }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(Theme.inkFaint)
                                .frame(width: 24, height: 24)
                        }
                        .accessibilityIdentifier("visual-close")
                        .accessibilityLabel("Close \(tab.title)")
                    }
                    .padding(.leading, 11)
                    .padding(.trailing, Theme.s1)
                    .frame(height: 36)
                    .background(
                        selected ? Theme.raised2 : Theme.raised,
                        in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                    )
                }
            }
            .padding(.horizontal, 21)
        }
    }
}
