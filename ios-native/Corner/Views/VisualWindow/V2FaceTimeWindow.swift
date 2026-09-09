// V2FaceTimeWindow.swift — Corner native iOS
// corner:corner-v2 R43 (P094/P095) — the eye's FaceTime mode.
//
// A small floating window top-right (~110×160pt) showing the current tab
// live, draggable within the safe area. A tap on it opens the full drawer
// context window. Website tabs render the DESKTOP page (like a horizontal
// video on the vertical phone — about a third of the screen tall in full
// mode, the PiP box here — scrollable inside).

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

/// The website-as-video stage height in full mode: about a third of the
/// screen tall (844 → ~281), scrollable inside.
enum V2EyeWebMetrics {
    static func stageHeight(screenHeight: CGFloat = UIScreen.main.bounds.height) -> CGFloat {
        (screenHeight / 3).rounded()
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
                faceTimeBox(tab: tab, in: geo)
            }
        }
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
        if tab.kind == .web,
           let artifact = window.artifact(for: tab),
           let url = artifact.sourceURL {
            V2EyeWebView(url: url)
        } else {
            ArtifactRenderer.view(
                tab: tab,
                artifact: window.artifact(for: tab),
                state: window.effectiveState(for: tab),
                updateState: { key, value in window.updateState(tabID: tab.id, key: key, value: value) },
                review: review
            )
        }
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

/// The website-as-video renderer: the DESKTOP page (desktop user agent,
/// wide layout) in a short scrollable frame — a horizontal video on the
/// vertical phone. No viewport picker, no Interact toggle: in the eye's
/// modes the page is for watching and scrolling, not for pinning.
struct V2EyeWebView: View {
    let url: URL

    var body: some View {
        EyeSandboxWebView(url: url)
            .accessibilityIdentifier("visual-stage-web")
    }
}

private struct EyeSandboxWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Sandboxed like the full web stage: nothing persists.
        config.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        // Desktop, always: the phone shows the computer version.
        view.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
        load(into: view)
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        // Scrollable inside — the page moves, the frame never does.
        view.scrollView.isScrollEnabled = true
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
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            loadedURL = webView.url
        }
    }
}
