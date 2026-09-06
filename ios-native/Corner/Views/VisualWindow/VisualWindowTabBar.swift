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

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.s2) {
                ForEach(window.tabs) { tab in
                    HStack(spacing: 2) {
                        Button(tab.title) { window.select(id: tab.id) }
                            .font(.hanken(13).weight(window.selectedTabID == tab.id ? .semibold : .medium))
                            .foregroundStyle(window.selectedTabID == tab.id ? Theme.ink : Theme.inkSoft)
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
                    .padding(.leading, Theme.s3)
                    .padding(.trailing, Theme.s1)
                    .padding(.vertical, Theme.s1)
                    .background(
                        window.selectedTabID == tab.id ? Theme.raised2 : Color.clear,
                        in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                    )
                    .overlay(alignment: .bottom) {
                        // The design's underlined tabs: the selected chip
                        // carries the accent line.
                        if window.selectedTabID == tab.id {
                            Rectangle()
                                .fill(Theme.accent)
                                .frame(height: 2)
                                .padding(.horizontal, Theme.s3)
                        }
                    }
                }
            }
            .padding(.horizontal, Theme.s2)
        }
    }
}
