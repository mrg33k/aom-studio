// WebArtifactView.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// A sandboxed WKWebView (ephemeral data store: no cookies, no cache persist)
// for site tabs. The Interact toggle passes pointer events through to the
// page or holds them for pin taps; the desktop/mobile viewport toggle swaps
// the user agent and writes back `state.siteViewport`.

import SwiftUI
import WebKit

struct WebArtifactView: View {
    let url: URL
    /// `desktop` or `mobile`, from tab state.
    let viewport: String?
    let onViewport: (String) -> Void

    @State private var interact = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: Theme.s2) {
                Button(interact ? "Done" : "Interact") { interact.toggle() }
                    .font(.hanken(12).weight(.semibold))
                    .foregroundStyle(interact ? Theme.accent : Theme.inkSoft)
                    .accessibilityIdentifier("visual-web-interact")
                Spacer(minLength: 0)
                Picker("Viewport", selection: Binding(
                    get: { viewport == "mobile" ? "mobile" : "desktop" },
                    set: { onViewport($0) }
                )) {
                    Text("Desktop").tag("desktop")
                    Text("Mobile").tag("mobile")
                }
                .pickerStyle(.segmented)
                .frame(width: 180)
                .accessibilityIdentifier("visual-web-viewport")
            }
            .padding(.horizontal, Theme.s3)
            .padding(.vertical, Theme.s2)
            SandboxWebView(url: url, viewport: viewport == "mobile" ? "mobile" : "desktop", interact: interact)
                .accessibilityIdentifier("visual-stage-web")
        }
    }
}

private struct SandboxWebView: UIViewRepresentable {
    let url: URL
    let viewport: String
    let interact: Bool

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Sandboxed: nothing persists between tabs or launches.
        config.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        load(into: view)
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        view.isUserInteractionEnabled = interact
        let agent = viewport == "mobile"
            ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
            : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
        if view.customUserAgent != agent { view.customUserAgent = agent }
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
