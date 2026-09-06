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
    /// Sends a plain thread text (the carry-on line). The panel dismisses.
    var onCarryOn: (String) -> Void = { _ in }

    var body: some View {
        GeometryReader { proxy in
            if proxy.size.width >= 768 {
                HStack(spacing: 0) {
                    main().frame(maxWidth: .infinity)
                    if window.isPresented && window.selectedTab != nil {
                        VisualWindowColumn(onCarryOn: onCarryOn)
                            .frame(width: min(440, proxy.size.width * 0.45))
                    }
                }
            } else {
                main()
                    .sheet(isPresented: $window.isPresented) {
                        if window.selectedTab != nil {
                            VisualWindowSheet(onCarryOn: onCarryOn)
                        }
                    }
            }
        }
    }
}

/// The Review toggle: "Review" off, "Review · N" with the pin count on.
/// Checklist and Send live in the panel, only in review mode (HANDOFF §4).
private struct ReviewToggleButton: View {
    @EnvironmentObject private var review: V2ReviewStore

    var body: some View {
        Button(review.reviewing ? "Review · \(review.pins.count)" : "Review") {
            review.reviewing.toggle()
        }
        .font(.hanken(13).weight(.semibold))
        .foregroundStyle(review.reviewing ? Color.white : Theme.accent)
        .padding(.horizontal, 12)
        .frame(height: 32)
        .background(
            review.reviewing ? Theme.accent : Theme.accentWeak,
            in: RoundedRectangle(cornerRadius: 9, style: .continuous)
        )
        .accessibilityIdentifier("review-toggle")
    }
}

/// The iPhone sheet: handle-driven half/full, tab strip, stage, close.
/// Stage height follows the design's media heights (240 half / 400 full).
/// Checklist and Send live here only in review mode (HANDOFF §4).
struct VisualWindowSheet: View {
    @EnvironmentObject private var window: VisualWindowStore
    @EnvironmentObject private var review: V2ReviewStore
    @Environment(\.dismiss) private var dismiss
    @State private var detent: PresentationDetent = .medium
    var onCarryOn: (String) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                HStack {
                    Text(window.selectedTab?.title ?? "Preview")
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    ReviewToggleButton()
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
                        updateState: { key, value in window.updateState(tabID: tab.id, key: key, value: value) },
                        review: review
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: detent == .large ? 400 : 240)
                    .padding(.top, Theme.s2)
                    if review.reviewing, let artifactID = tab.artifactID {
                        ReviewPanelView(artifactID: artifactID) {
                            onCarryOn("Looks right. Carry on.")
                            window.isPresented = false
                        }
                        .padding(.horizontal, Theme.s4)
                        .padding(.top, Theme.s3)
                    }
                }
                Spacer(minLength: 0)
            }
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
            review.context(artifactID: window.tabs.first { $0.id == next }?.artifactID)
        }
        .onChange(of: review.reviewing) { _, on in
            // Review needs the room: notes + Send don't fit half. The handle
            // still drives half/full by hand afterwards.
            if on { detent = .large }
        }
        .onAppear {
            review.context(artifactID: window.selectedTab?.artifactID)
            // A reopened sheet resets to half, but review may already be on
            // (pins parked on another tab): still needs the room.
            if review.reviewing { detent = .large }
        }
    }
}

/// The iPad column: the same tabs beside the same chat, no sheet involved.
struct VisualWindowColumn: View {
    @EnvironmentObject private var window: VisualWindowStore
    @EnvironmentObject private var review: V2ReviewStore
    var onCarryOn: (String) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                HStack {
                    Text(window.selectedTab?.title ?? "Preview")
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    ReviewToggleButton()
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
                        updateState: { key, value in window.updateState(tabID: tab.id, key: key, value: value) },
                        review: review
                    )
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 400, maxHeight: .infinity)
                    .padding(.top, Theme.s2)
                    if review.reviewing, let artifactID = tab.artifactID {
                        ReviewPanelView(artifactID: artifactID) {
                            onCarryOn("Looks right. Carry on.")
                            window.isPresented = false
                        }
                        .padding(.horizontal, Theme.s3)
                        .padding(.top, Theme.s3)
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .overlay(alignment: .top) {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("visual-column")
        }
        .background(Theme.raised)
        .onChange(of: window.selectedTabID) { _, next in
            review.context(artifactID: window.tabs.first { $0.id == next }?.artifactID)
        }
        .onAppear {
            review.context(artifactID: window.selectedTab?.artifactID)
        }
    }
}
