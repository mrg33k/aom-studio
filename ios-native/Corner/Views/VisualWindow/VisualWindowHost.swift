// VisualWindowHost.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// One state model, two hosts. iPhone (< 768pt) presents the window as a
// sheet with medium/large detents (half/full through the handle); iPad lays
// the same store out as a column beside the same chat. Both bind the same
// `VisualWindowStore` and `selectedTabID`.
//
// Identifiers: the sheet/column markers are 1pt clear leaves overlaid on the
// chrome — never on a container (R14: a container identifier overwrites every
// identified control below it).

import SwiftUI

struct VisualWindowHost<Main: View>: View {
    @EnvironmentObject private var window: VisualWindowStore
    @ViewBuilder let main: () -> Main

    var body: some View {
        GeometryReader { proxy in
            if proxy.size.width >= 768 {
                HStack(spacing: 0) {
                    main().frame(maxWidth: .infinity)
                    if window.isPresented && window.selectedTab != nil {
                        VisualWindowColumn()
                            .frame(width: min(440, proxy.size.width * 0.45))
                    }
                }
            } else {
                main()
                    .sheet(isPresented: $window.isPresented) {
                        if window.selectedTab != nil {
                            VisualWindowSheet()
                        }
                    }
            }
        }
    }
}

/// The iPhone sheet: handle-driven half/full, tab strip, stage, close.
/// Stage height follows the design's media heights (240 half / 400 full).
struct VisualWindowSheet: View {
    @EnvironmentObject private var window: VisualWindowStore
    @Environment(\.dismiss) private var dismiss
    @State private var detent: PresentationDetent = .medium

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(window.selectedTab?.title ?? "Preview")
                    .font(.hanken(15).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Button("Close") { window.isPresented = false }
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.accent)
                    .accessibilityIdentifier("visual-sheet-close")
            }
            .padding(.horizontal, Theme.s4)
            .padding(.top, Theme.s3)
            VisualWindowTabBar()
                .padding(.top, Theme.s2)
            if let tab = window.selectedTab {
                ArtifactRenderer.view(
                    tab: tab,
                    artifact: window.artifact(for: tab),
                    state: window.effectiveState(for: tab),
                    updateState: { key, value in window.updateState(tabID: tab.id, key: key, value: value) }
                )
                .frame(maxWidth: .infinity)
                .frame(height: detent == .large ? 400 : 240)
                .padding(.top, Theme.s2)
            }
            Spacer(minLength: 0)
        }
        .overlay(alignment: .top) {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("visual-sheet")
        }
        .presentationDetents([.medium, .large], selection: $detent)
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.ground)
        .onChange(of: window.selectedTabID) { _, next in
            if next == nil { dismiss() }
        }
    }
}

/// The iPad column: the same tabs beside the same chat, no sheet involved.
struct VisualWindowColumn: View {
    @EnvironmentObject private var window: VisualWindowStore

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(window.selectedTab?.title ?? "Preview")
                    .font(.hanken(15).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Button {
                    window.isPresented = false
                } label: {
                    Image(systemName: "sidebar.right")
                }
                .foregroundStyle(Theme.inkSoft)
                .accessibilityIdentifier("visual-column-close")
            }
            .padding(.horizontal, Theme.s3)
            .padding(.top, Theme.s3)
            VisualWindowTabBar()
                .padding(.top, Theme.s2)
            if let tab = window.selectedTab {
                ArtifactRenderer.view(
                    tab: tab,
                    artifact: window.artifact(for: tab),
                    state: window.effectiveState(for: tab),
                    updateState: { key, value in window.updateState(tabID: tab.id, key: key, value: value) }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.top, Theme.s2)
            }
            Spacer(minLength: 0)
        }
        .overlay(alignment: .top) {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("visual-column")
        }
        .background(Theme.raised)
    }
}
