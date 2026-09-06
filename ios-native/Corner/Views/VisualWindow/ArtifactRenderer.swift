// ArtifactRenderer.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// One dispatch from `VisualTabKind` to a native renderer. Platform
// frameworks do the work (PDFKit, QuickLook, AVKit, WKWebView): the web
// hand-builds these layers, iOS ships them. Photo + code + the
// error/unsupported tabs live here so the plan's file list stays exact;
// deck/document/genericFile share the QuickLook adapter, email/tracker stay
// `unsupported` until Task 9 (no primary-navigation route for them).

import SwiftUI

/// The native renderer for a tab kind. Unknown backend kinds never reach
/// here as cases: `VisualTabKind` is a closed Codable enum matching the
/// backend's KNOWN_TAB_KINDS, so a genuinely new wire kind fails the tabs
/// decode loudly instead of rendering the wrong viewer.
enum ArtifactViewType: String, Equatable {
    case pdf
    case quickLook
    case video
    case web
    case photo
    case youtube
    case code
    case unsupported
}

struct ArtifactRenderer {
    static func viewType(for kind: VisualTabKind) -> ArtifactViewType {
        switch kind {
        case .pdf: .pdf
        case .deck, .document, .genericFile: .quickLook
        case .video: .video
        case .web: .web
        case .photo: .photo
        case .youtube: .youtube
        case .code: .code
        case .email, .tracker: .unsupported
        }
    }

    @ViewBuilder
    static func view(
        tab: VisualWindowTab, artifact: Artifact?,
        state: [String: String] = [:],
        updateState: @escaping (String, String) -> Void = { _, _ in },
        review: V2ReviewStore? = nil
    ) -> some View {
        if let artifact, let url = artifact.sourceURL {
            switch viewType(for: tab.kind) {
        case .pdf:
            PDFArtifactView(
                url: url, page: Int(state["page"] ?? "") ?? 1,
                onPage: { updateState("page", String($0)) },
                review: review, artifactID: artifact.id
            )
        case .quickLook:
            QuickLookArtifactView(url: url)
        case .video:
            VideoArtifactView(url: url, review: review)
        case .web:
            WebArtifactView(url: url, viewport: state["siteViewport"], onViewport: { updateState("siteViewport", $0) })
        case .photo:
            PhotoArtifactView(url: url, review: review)
        case .youtube:
            YouTubeArtifactView(url: url)
        case .code:
            CodeArtifactView(url: url, review: review)
        case .unsupported:
            UnsupportedArtifactView(kind: tab.kind)
        }
        } else {
            ErrorArtifactView(
                title: tab.title,
                message: "The message named it but carried no link.",
                onRetry: {}
            )
        }
    }
}

// MARK: - photo

/// File URLs read off disk; remote URLs go through AsyncImage. Either
/// failure is the recoverable-error tab, never a spinner.
struct PhotoArtifactView: View {
    let url: URL
    /// Present when the host supports review (Task 8): taps drop point pins.
    var review: V2ReviewStore?

    /// A tap offset as a 0–100 % pin coordinate. Explicit Doubles: CGFloat
    /// and Double `*` overloads collide on the bare literal (measured).
    static func percent(_ value: CGFloat, of total: CGFloat) -> Double {
        guard total > 0 else { return 0 }
        return min(max(Double(value / total) * 100.0, 0.0), 100.0)
    }

    var body: some View {
        Group {
            if url.isFileURL, let image = UIImage(contentsOfFile: url.path) {
                GeometryReader { stage in
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .accessibilityIdentifier("visual-stage-photo")
                        .overlay {
                            if review != nil {
                                Color.clear
                                    .contentShape(Rectangle())
                                    .onTapGesture(coordinateSpace: .local) { location in
                                        let size = stage.size
                                        guard size.width > 0, size.height > 0 else { return }
                                        review?.addPin(
                                            .point(
                                                page: nil,
                                                x: PhotoArtifactView.percent(location.x, of: size.width),
                                                y: PhotoArtifactView.percent(location.y, of: size.height)
                                            ),
                                            text: ""
                                        )
                                    }
                            }
                        }
                        .overlay(alignment: .topLeading) {
                            if let review {
                                ForEach(Array(review.pins.enumerated()), id: \.element.clientID) { index, pin in
                                    if case .point(_, let x, let y) = pin.anchor {
                                        PinMarkerButton(
                                            number: index + 1,
                                            selected: review.selectedPinID == pin.clientID,
                                            done: pin.isDone
                                        ) {
                                            review.selectedPinID = pin.clientID
                                        }
                                        .position(
                                            x: CGFloat(x) / 100 * stage.size.width,
                                            y: CGFloat(y) / 100 * stage.size.height
                                        )
                                    }
                                }
                            }
                        }
                }
            } else if !url.isFileURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fit)
                    case .failure:
                        ErrorArtifactView(title: "", message: "This photo could not be loaded.", onRetry: {})
                    case .empty:
                        ProgressView()
                    @unknown default:
                        ProgressView()
                    }
                }
                .accessibilityIdentifier("visual-stage-photo")
            } else {
                ErrorArtifactView(title: "", message: "This photo could not be loaded.", onRetry: {})
            }
        }
    }
}

// MARK: - code

/// A monospaced text view with line numbers, read from the file (Task 8 pins
/// lines against these numbers). Capped like the legacy text reader; the cap
/// is stated, never silent.
struct CodeArtifactView: View {
    let url: URL
    /// Present when the host supports review (Task 8): line numbers pin.
    var review: V2ReviewStore?

    @State private var lines: [String]?
    @State private var truncated = false
    @State private var failed = false

    private static let maximumBytes = 400_000

    /// Lines carrying pins, highlighted in the gutter.
    private var pinnedLines: Set<Int> {
        guard let review else { return [] }
        return Set(review.pins.compactMap {
            if case .line(let number) = $0.anchor { return number }
            return nil
        })
    }

    var body: some View {
        Group {
            if failed {
                ErrorArtifactView(title: url.lastPathComponent, message: "This file's text could not be read.", onRetry: { Task { await load() } })
            } else if let lines {
                ScrollView([.vertical, .horizontal]) {
                    VStack(alignment: .leading, spacing: 2) {
                        if truncated {
                            Text("Showing the first \(Self.maximumBytes / 1000)KB of a longer file.")
                                .font(.hanken(11))
                                .foregroundStyle(Theme.warning)
                        }
                        ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                            HStack(alignment: .top, spacing: 12) {
                                Group {
                                    if review != nil {
                                        Button("\(index + 1)") {
                                            review?.addPin(.line(number: index + 1), text: "")
                                        }
                                        .accessibilityIdentifier("visual-code-line")
                                        .accessibilityLabel("Pin line \(index + 1)")
                                    } else {
                                        Text("\(index + 1)")
                                    }
                                }
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(pinnedLines.contains(index + 1) ? Theme.accent : Theme.inkFaint)
                                .frame(minWidth: 28, alignment: .trailing)
                                Text(line.isEmpty ? " " : line)
                                    .font(.system(.footnote, design: .monospaced))
                                    .foregroundStyle(Theme.ink)
                                    .textSelection(.enabled)
                            }
                        }
                    }
                    .padding(Theme.s3)
                }
                .accessibilityIdentifier("visual-stage-code")
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .task { await load() }
            }
        }
    }

    private func load() async {
        failed = false
        let target = url
        let limit = Self.maximumBytes
        let result: (String, Bool)? = await Task.detached(priority: .userInitiated) {
            let data: Data
            if target.isFileURL {
                guard let read = try? Data(contentsOf: target, options: .mappedIfSafe) else { return nil }
                data = read
            } else {
                guard let (fetched, _) = try? await URLSession.shared.data(from: target) else { return nil }
                data = fetched
            }
            let clipped = data.count > limit
            let slice = clipped ? data.prefix(limit) : data.prefix(data.count)
            guard let decoded = String(data: slice, encoding: .utf8) ?? String(data: slice, encoding: .isoLatin1) else { return nil }
            return (decoded, clipped)
        }.value
        guard let result else {
            failed = true
            return
        }
        // Keep line endings out of the rows: split, don't filter — blank
        // lines keep their numbers so pins stay aligned.
        lines = result.0.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        truncated = result.1
    }
}

// MARK: - unsupported (Task 9 owns email/tracker)

/// A typed unsupported-artifact state: names the kind, promises nothing.
/// Never an approval button, never a dead end without words.
struct UnsupportedArtifactView: View {
    let kind: VisualTabKind

    var body: some View {
        VStack(spacing: Theme.s3) {
            Image(systemName: "rectangle.on.rectangle.slash")
                .font(.hkTitle)
                .foregroundStyle(Theme.inkFaint)
            Text("This preview opens \(kind.rawValue) on the web for now.")
                .font(.hkFootnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.s5)
                .accessibilityIdentifier("visual-stage-unsupported")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - recoverable error

/// Every non-success path terminates in words plus a retry that re-runs the
/// resolution. A missing source retries the load; a dead file stays here
/// honestly instead of spinning.
struct ErrorArtifactView: View {
    let title: String
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: Theme.s3) {
            Image(systemName: "exclamationmark.triangle")
                .font(.hkTitle)
                .foregroundStyle(Theme.warning)
            if !title.isEmpty {
                Text(title)
                    .font(.hkBody.weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.center)
            }
            Text(message)
                .font(.hkFootnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.s5)
            Button("Try again") { onRetry() }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .accessibilityIdentifier("visual-retry")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
