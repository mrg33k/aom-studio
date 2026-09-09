// V2FaceTimeWindow.swift — Corner native iOS
// corner:corner-v2 R43 (P094/P095) — the eye's FaceTime mode; R56 adds the
// website-as-video band (P094/P095).
//
// A small floating window top-right (~110×160pt) showing the current tab
// live, draggable within the safe area — EXCEPT a website tab, which docks
// as the full-width 16:9 site band under the nav (a desktop page squeezed
// into the portrait box reads as nothing; the band is the spec's
// horizontal video in both modes). A tap on either opens the full drawer
// context window.

import SwiftUI
import WebKit

/// The PiP box metrics: the brief's ~110×160, top-right, under the nav.
enum V2FaceTimeMetrics {
    static let width: CGFloat = 110
    static let height: CGFloat = 160
    static let margin: CGFloat = 12
    /// Below the 52pt nav bar with room to breathe (added to the
    /// container's top safe-area inset).
    static let topBelowNav: CGFloat = 64
    static let cornerRadius: CGFloat = 12

    static func defaultTop(safeAreaTop: CGFloat) -> CGFloat {
        safeAreaTop + topBelowNav
    }

    static func minTop(safeAreaTop: CGFloat) -> CGFloat {
        safeAreaTop + topBelowNav - 4
    }
}

/// R56 P094/P095: the website-as-video band — the desktop page as a
/// scrollable horizontal 16:9 view on the vertical phone (Patrik's spec:
/// "about a third of the screen, scrollable inside").
///
/// The two numbers are geometrically irreconcilable on a 19.5:9 phone: a
/// true 16:9 full-bleed band is ~26% of the height (390 → 219.5), while a
/// true third would be 12.4:9 — not a video shape. The ratio is the bare
/// spec and wins; the third is the cap ("about"): height is 16:9 of the
/// width, at most a third of the screen. In portrait the ratio binds
/// (390×844 → 390×219); in landscape the third binds instead of a band
/// taller than the screen. The desktop width scales to fit; the person
/// scrolls the page vertically inside the band. Never a full-screen
/// browser.
enum V2SiteBandMetrics {
    /// The video ratio. Views derive their height from their own width via
    /// `.aspectRatio(ratio)` — never from the screen (the sheet's content
    /// column is narrower than the phone).
    static let ratio: CGFloat = 16 / 9

    /// The band height for a measured width, capped at a third of the
    /// screen (landscape: uncapped 16:9 would exceed the screen).
    static func bandHeight(
        forWidth width: CGFloat,
        screenHeight: CGFloat = UIScreen.main.bounds.height
    ) -> CGFloat {
        min((width / ratio).rounded(), (screenHeight / 3).rounded())
    }
}

/// The floating FaceTime window. Rendered when the eye mode is facetime
/// and a tab is selected; hidden (not empty) otherwise.
struct V2FaceTimeWindow: View {
    @EnvironmentObject private var window: VisualWindowStore
    @ObservedObject var eye: V2EyeModeStore
    var review: V2ReviewStore? = nil

    /// Drag offset from the default top-right seat, clamped to the safe
    /// area by the geometry below.
    @State private var offset = CGSize.zero

    var body: some View {
        GeometryReader { geo in
            if eye.mode == .facetime, let tab = window.selectedTab {
                if tab.kind == .web,
                   let artifact = window.artifact(for: tab),
                   let url = artifact.sourceURL {
                    // R56: the site tab docks as the horizontal-video band,
                    // never the portrait box.
                    faceTimeSiteBand(tab: tab, url: url, in: geo)
                } else {
                    faceTimeBox(tab: tab, in: geo)
                }
            }
        }
    }

    /// R56 P094/P095: the FaceTime site band — full-width 16:9 under the
    /// nav, the desktop page scrollable inside. Docked, not draggable (it
    /// spans the width); a tap pulls the window up to full, like the box.
    private func faceTimeSiteBand(tab: VisualWindowTab, url: URL, in geo: GeometryProxy) -> some View {
        let bandH = V2SiteBandMetrics.bandHeight(forWidth: geo.size.width, screenHeight: geo.size.height)
        let titleH: CGFloat = 22
        return VStack(spacing: 0) {
            Text(tab.title)
                .font(.hanken(9).weight(.semibold))
                .foregroundStyle(Theme.inkSoft)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .frame(height: titleH)
            Divider().background(Theme.hairline)
            V2SiteBand(tab: tab, url: url)
                .frame(height: bandH)
        }
        .frame(width: geo.size.width, height: titleH + bandH)
        .background(Theme.raised)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.hairline).frame(height: 1)
        }
        .shadow(color: Color.black.opacity(0.35), radius: 8, y: 2)
        // The gate leaf: a 1pt marker carrying the docked band's presence
        // (R14 — never an identifier on the container itself). The band's
        // own frame reads off `visual-stage-web` inside.
        .overlay(alignment: .top) {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("v2-facetime-site")
                .accessibilityLabel("Visual window preview: \(tab.title)")
        }
        .position(
            x: geo.size.width / 2,
            y: V2FaceTimeMetrics.defaultTop(safeAreaTop: geo.safeAreaInsets.top) + (titleH + bandH) / 2
        )
        .onTapGesture { eye.set(.full) }
    }

    private func faceTimeBox(tab: VisualWindowTab, in geo: GeometryProxy) -> some View {
        let seat = defaultOrigin(in: geo)
        return VStack(spacing: 0) {
            Text(tab.title)
                .font(.hanken(9).weight(.semibold))
                .foregroundStyle(Theme.inkSoft)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 8)
                .frame(height: 22)
            Divider().background(Theme.hairline)
            faceTimeStage(tab: tab)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
        }
        .frame(width: V2FaceTimeMetrics.width, height: V2FaceTimeMetrics.height)
        .background(Theme.raised)
        .clipShape(RoundedRectangle(cornerRadius: V2FaceTimeMetrics.cornerRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: V2FaceTimeMetrics.cornerRadius, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        }
        .shadow(color: Color.black.opacity(0.35), radius: 8, y: 2)
        // The gate leaf: a same-size clear marker carrying the box frame
        // (R14 — never an identifier on the container itself).
        .overlay {
            Color.clear
                .frame(width: V2FaceTimeMetrics.width, height: V2FaceTimeMetrics.height)
                .accessibilityIdentifier("v2-facetime")
                .accessibilityLabel("Visual window preview: \(tab.title)")
        }
        .position(x: seat.x + offset.width, y: seat.y + offset.height)
        .gesture(drag(in: geo, seat: seat))
        // A tap pulls the window back up to full — the spec's "pull it
        // back up" without hunting the eye.
        .onTapGesture { eye.set(.full) }
    }

    @ViewBuilder
    private func faceTimeStage(tab: VisualWindowTab) -> some View {
        // Web tabs with a URL never reach here (the docked band takes
        // them); a URL-less web tab renders its pending/error state.
        ArtifactRenderer.view(
            tab: tab,
            artifact: window.artifact(for: tab),
            state: window.effectiveState(for: tab),
            updateState: { key, value in window.updateState(tabID: tab.id, key: key, value: value) },
            review: review
        )
    }

    /// The centre of the default top-right seat.
    private func defaultOrigin(in geo: GeometryProxy) -> CGPoint {
        CGPoint(
            x: geo.size.width - V2FaceTimeMetrics.margin - V2FaceTimeMetrics.width / 2,
            y: V2FaceTimeMetrics.defaultTop(safeAreaTop: geo.safeAreaInsets.top) + V2FaceTimeMetrics.height / 2
        )
    }

    /// Clamp the centre so the whole box stays inside the margins and
    /// below the nav.
    private func clamped(_ centre: CGPoint, in geo: GeometryProxy) -> CGPoint {
        let halfW = V2FaceTimeMetrics.width / 2
        let halfH = V2FaceTimeMetrics.height / 2
        let minX = V2FaceTimeMetrics.margin + halfW
        let maxX = max(minX, geo.size.width - V2FaceTimeMetrics.margin - halfW)
        let minY = V2FaceTimeMetrics.minTop(safeAreaTop: geo.safeAreaInsets.top) + halfH
        let maxY = max(minY, geo.size.height - V2FaceTimeMetrics.margin - halfH)
        return CGPoint(
            x: min(max(centre.x, minX), maxX),
            y: min(max(centre.y, minY), maxY)
        )
    }

    private func drag(in geo: GeometryProxy, seat: CGPoint) -> some Gesture {
        DragGesture()
            .onChanged { value in
                let want = CGPoint(x: seat.x + value.translation.width, y: seat.y + value.translation.height)
                let fixed = clamped(want, in: geo)
                offset = CGSize(width: fixed.x - seat.x, height: fixed.y - seat.y)
            }
    }

    /// The settled frame for a given container size and offset — the pure
    /// half of the clamp, unit-pinned.
    static func settledFrame(
        container: CGSize, offset: CGSize, safeAreaTop: CGFloat
    ) -> CGRect {
        let seat = CGPoint(
            x: container.width - V2FaceTimeMetrics.margin - V2FaceTimeMetrics.width / 2,
            y: V2FaceTimeMetrics.defaultTop(safeAreaTop: safeAreaTop) + V2FaceTimeMetrics.height / 2
        )
        let halfW = V2FaceTimeMetrics.width / 2
        let halfH = V2FaceTimeMetrics.height / 2
        let minX = V2FaceTimeMetrics.margin + halfW
        let maxX = max(minX, container.width - V2FaceTimeMetrics.margin - halfW)
        let minY = V2FaceTimeMetrics.minTop(safeAreaTop: safeAreaTop) + halfH
        let maxY = max(minY, container.height - V2FaceTimeMetrics.margin - halfH)
        let cx = min(max(seat.x + offset.width, minX), maxX)
        let cy = min(max(seat.y + offset.height, minY), maxY)
        return CGRect(
            x: cx - halfW, y: cy - halfH,
            width: V2FaceTimeMetrics.width, height: V2FaceTimeMetrics.height
        )
    }
}

/// R56 P094/P095: the website-as-video band — the DESKTOP page (desktop
/// user agent, wide layout) in a 16:9 frame, scrollable inside. One view
/// for both eye modes: the sheet stage and the docked FaceTime band. No
/// viewport picker, no Interact toggle: in the eye's modes the page is for
/// watching and scrolling, not for pinning.
///
/// The scroll offset reports back through the window store into the
/// view-state publish path (R56 P094), throttled by the sync object. The
/// gate reads the band's frame off `visual-stage-web` (the representable
/// fills the band exactly).
struct V2SiteBand: View {
    @EnvironmentObject private var window: VisualWindowStore
    let tab: VisualWindowTab
    let url: URL

    var body: some View {
        // The height derives from the ACTUAL width (aspectRatio), never the
        // screen: the sheet's content column is 374 wide on the 390 phone
        // (measured — R43's 374×269.5), so a screen-derived height would
        // break the ratio (measured red: 374×219 is 1.71:1, not a video).
        EyeSandboxWebView(
            url: url,
            onScroll: { y in window.noteScroll(tabID: tab.id, scroll: y) }
        )
        .frame(maxWidth: .infinity)
        .aspectRatio(V2SiteBandMetrics.ratio, contentMode: .fit)
        .accessibilityIdentifier("visual-stage-web")
    }
}

private struct EyeSandboxWebView: UIViewRepresentable {
    let url: URL
    var onScroll: (Double) -> Void = { _ in }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Sandboxed like the full web stage: nothing persists.
        config.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        // Desktop, always: the phone shows the computer version.
        view.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
        context.coordinator.observe(view.scrollView)
        load(into: view)
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        // Scrollable inside — the page moves, the frame never does.
        view.scrollView.isScrollEnabled = true
        context.coordinator.onScroll = onScroll
        if context.coordinator.loadedURL != url {
            load(into: view)
        }
    }

    private func load(into view: WKWebView) {
        if url.isFileURL {
            view.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else {
            view.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var loadedURL: URL?
        var onScroll: ((Double) -> Void)?
        private var offsetObservation: NSKeyValueObservation?
        private var lastReportedY: Double?
        private var lastReportAt = Date.distantPast

        /// Watch the page move. A 2pt floor plus a 100 ms gate keep a long
        /// scroll from flooding the publish path; the sync object coalesces
        /// the rest into its ~300 ms window.
        func observe(_ scrollView: UIScrollView) {
            offsetObservation = scrollView.observe(\.contentOffset, options: [.new]) { [weak self] view, _ in
                self?.scrolled(view.contentOffset.y)
            }
        }

        private func scrolled(_ y: Double) {
            let now = Date()
            if let last = lastReportedY,
               abs(y - last) < 2 || now.timeIntervalSince(lastReportAt) < 0.1 {
                return
            }
            lastReportedY = y
            lastReportAt = now
            onScroll?(y)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            loadedURL = webView.url
        }
    }
}
