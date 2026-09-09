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
    /// The latest agent line, for the sheet's looking card. Nil hides it.
    var statusText: String? = nil
    /// The owning project name, for the Context pane's file section.
    var projectName: String = ""

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
                            VisualWindowSheet(statusText: statusText, projectName: projectName, onCarryOn: onCarryOn)
                        }
                    }
            }
        }
    }
}

/// R17 P050: fractions resolve against the container below the status bar
/// (measured: 0.73 lands 267, not 228). Half 0.785 lands 229 (design 228,
/// within the bar); full 0.962 landed 100 (design 89), so 0.978.
extension PresentationDetent {
    static let v2Half = PresentationDetent.fraction(0.785)
    static let v2Full = PresentationDetent.fraction(0.978)
}

/// The Review toggle: "Review" off, "Review · N" with the pin count on.
/// Checklist and Send live in the panel, only in review mode (HANDOFF §4).
/// P046: 14/600, 36pt — transparent + muted off, accent + white on.
private struct ReviewToggleButton: View {
    @EnvironmentObject private var review: V2ReviewStore

    var body: some View {
        Button(review.reviewing ? "Review · \(review.pins.count)" : "Review") {
            review.reviewing.toggle()
        }
        .font(.hanken(14).weight(.semibold))
        .foregroundStyle(review.reviewing ? Color.white : Theme.inkSoft)
        .padding(.horizontal, 14)
        .frame(height: 36)
        .background(
            review.reviewing ? Theme.accent : Color.clear,
            in: RoundedRectangle(cornerRadius: 10, style: .continuous)
        )
        .accessibilityIdentifier("review-toggle")
    }
}

/// R59 (Patrik phone review 2026-09-08): the review affordance as a button
/// UNDER the file, not a top tab. Full-width, pencil + "Leave a review";
/// tapping opens the review panel (pins + notes + Send) in place.
struct LeaveAReviewButton: View {
    var onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 15, weight: .semibold))
                Text("Leave a review")
                    .font(.hanken(15).weight(.semibold))
            }
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity)
            .frame(height: 46)
            .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("leave-a-review")
        .accessibilityLabel("Leave a review of this file")
    }
}

/// P024: the sheet header's Preview / Context tabs — 16/600, the active tab
/// carrying the 2px fg underline. The file strip below keeps its own chips.
private struct SheetViewTabs: View {
    @Binding var view: VisualWindowSheetView

    // NOTE: no identifier on this container — it would overwrite the tab
    // buttons' own identifiers (same finding as chat-screen).
    var body: some View {
        HStack(spacing: 20) {
            sheetTab("Preview", .preview)
            sheetTab("Context", .context)
        }
    }

    private func sheetTab(_ title: String, _ tag: VisualWindowSheetView) -> some View {
        Button { view = tag } label: {
            VStack(spacing: 4) {
                Text(title)
                    .font(.hanken(16).weight(.semibold))
                    .foregroundStyle(view == tag ? Theme.ink : Theme.inkSoft)
                Rectangle()
                    .fill(view == tag ? Theme.ink : Color.clear)
                    .frame(height: 2)
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("sheet-tab-\(title.lowercased())")
        .accessibilityLabel(title)
        .accessibilityAddTraits(view == tag ? [.isSelected] : [])
    }
}

/// Which pane the sheet shows: the artifact stage or the thread context.
enum VisualWindowSheetView {
    case preview, context
}

/// The iPhone sheet: handle-driven half/full, tab strip, stage, close.
/// P052: stage = media + chrome — timed media (video) 400 half / 560 full,
/// everything else 290 half / 450 full.
/// Checklist and Send live here only in review mode (HANDOFF §4).
struct VisualWindowSheet: View {
    @EnvironmentObject private var window: VisualWindowStore
    @EnvironmentObject private var review: V2ReviewStore
    @Environment(\.dismiss) private var dismiss
    // P050: the export's tops are 228 (half) and 89 (full) on 844 —
    // fractions keep the proportion on every phone.
    @State private var detent: PresentationDetent = .v2Half
    @State private var sheetView: VisualWindowSheetView = .preview
    /// The latest agent line, for the looking card (P054). Nil hides it.
    var statusText: String? = nil
    /// The owning project name, for the Context pane's file section.
    var projectName: String = ""
    var onCarryOn: (String) -> Void = { _ in }

    /// Context file tap: select the open tab, or open one and flip back to
    /// Preview so the stage shows it.
    private func openArtifact(_ artifact: Artifact) {
        if let existing = window.tabs.first(where: { $0.artifactID == artifact.id }) {
            window.select(id: existing.id)
            sheetView = .preview
            return
        }
        guard let threadID = window.threadID else { return }
        sheetView = .preview
        Task {
            try? await window.open(
                artifact.kind, threadID: threadID,
                artifactID: artifact.id, title: artifact.title, state: [:]
            )
        }
    }

    /// P052: timed media carries the 160pt control chrome, static media 50.
    private var stageHeight: CGFloat {
        let timed = window.selectedTab.map { $0.kind == .video || $0.kind == .youtube } ?? false
        let full = detent == .v2Full
        if timed { return full ? 560 : 400 }
        return full ? 450 : 290
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // P049: the 40×4 handle, drawn by hand.
                Capsule()
                    .fill(Color.white.opacity(0.22))
                    .frame(width: 40, height: 4)
                    .padding(.top, 9)
                    .accessibilityHidden(true)
                HStack {
                    SheetViewTabs(view: $sheetView)
                    Spacer(minLength: 0)
                    // R59 (Patrik phone review 2026-09-08): the top row is
                    // ONLY Preview · Context · ✕. "Review" moved DOWN to the
                    // content as a "Leave a review" button (his arrow + note).
                    // P047: the 36px close circle, not a text button.
                    Button { window.isPresented = false } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                            .frame(width: 36, height: 36)
                            .background(Color.white.opacity(0.08), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("visual-sheet-close")
                    .accessibilityLabel("Close preview")
                }
                .padding(.horizontal, 21)
                .padding(.top, 6)
                if sheetView == .preview {
                    VisualWindowTabBar()
                        .padding(.top, Theme.s2)
                    if let tab = window.selectedTab {
                        // R56 P094/P095: website tabs render the desktop page
                        // as the 16:9 site band (V2SiteBandMetrics) — the
                        // spec's horizontal video, scrollable inside. The
                        // band's frame reads off `visual-stage-web`.
                        if tab.kind == .web,
                           let artifact = window.artifact(for: tab),
                           let url = artifact.sourceURL {
                            V2SiteBand(tab: tab, url: url)
                                .frame(maxWidth: .infinity)
                                .padding(.top, Theme.s2)
                        } else {
                            ArtifactRenderer.view(
                                tab: tab,
                                artifact: window.artifact(for: tab),
                                state: window.effectiveState(for: tab),
                                updateState: { key, value in window.updateState(tabID: tab.id, key: key, value: value) },
                                review: review
                            )
                            .frame(maxWidth: .infinity)
                            .frame(height: stageHeight)
                            .padding(.top, Theme.s2)
                        }
                        if review.reviewing, let artifactID = tab.artifactID {
                            if let status = statusText, review.pins.isEmpty {
                                // P054: the green-dot status card above Send.
                                SheetStatusCard(text: status)
                                    .padding(.horizontal, 21)
                                    .padding(.top, Theme.s3)
                            }
                            ReviewPanelView(artifactID: artifactID) {
                                onCarryOn("Looks right. Carry on.")
                                window.isPresented = false
                            }
                            .padding(.horizontal, 21)
                            .padding(.top, Theme.s3)
                        } else {
                            if let status = statusText {
                                SheetStatusCard(text: status)
                                    .padding(.horizontal, 21)
                                    .padding(.top, Theme.s3)
                            }
                            // R59: "Leave a review" lives HERE, under the file
                            // (Patrik's arrow), not as a top tab. Tapping it
                            // opens the review panel (pins + notes + Send).
                            if tab.artifactID != nil {
                                LeaveAReviewButton { review.reviewing = true }
                                    .padding(.horizontal, 21)
                                    .padding(.top, Theme.s3)
                            }
                        }
                    }
                } else {
                    VisualWindowContextView(projectName: projectName, onOpenFile: openArtifact)
                        .padding(.top, Theme.s2)
                }
                Spacer(minLength: 0)
            }
        }
        .overlay(alignment: .top) {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("visual-sheet")
                .accessibilityValue(detent == .v2Full ? "full" : "half")
        }
        .presentationDetents([.v2Half, .v2Full], selection: $detent)
        .presentationDragIndicator(.hidden)
        .presentationCornerRadius(20)
        .presentationBackground(Theme.raised)
        .onChange(of: window.selectedTabID) { _, next in
            if next == nil { dismiss() }
            review.context(artifactID: window.tabs.first { $0.id == next }?.artifactID)
        }
        .onChange(of: review.reviewing) { _, on in
            // Review needs the room: notes + Send don't fit half. The handle
            // still drives half/full by hand afterwards.
            if on { detent = .v2Full }
        }
        .onAppear {
            review.context(artifactID: window.selectedTab?.artifactID)
            // A reopened sheet resets to half, but review may already be on
            // (pins parked on another tab): still needs the room.
            if review.reviewing { detent = .v2Full }
        }
    }
}

/// P054: the green-dot status card — surface-2, 12px radius, 14px text.
/// The text is always real (the latest agent line); never a mock.
private struct SheetStatusCard: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Circle()
                .fill(Theme.success)
                .frame(width: 8, height: 8)
                .padding(.top, 5)
            Text(text)
                .font(.hanken(14))
                .foregroundStyle(Theme.ink)
                .lineLimit(3)
                .accessibilityIdentifier("sheet-status-text")
            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
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
