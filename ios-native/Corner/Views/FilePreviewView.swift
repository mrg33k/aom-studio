// FilePreviewView.swift — Corner native iOS
// corner:native-ios Stage 2
//
// Tapping a file opens the file. QuickLook renders images, PDFs, video, audio and
// office documents with the system's own viewer — pinch-zoom, page scrub, playback
// controls — which is the whole argument for a native app over a web view here: the
// web's preview layer is four hand-built renderers (pdf.js canvases, a mammoth docx
// converter, an HTML srcdoc shell, a custom video scrub bar) and iOS ships all of it.
//
// THE STATES ARE THE DESIGN. A file panel that shows a spinner forever is the bug this
// screen exists to avoid, so every non-success path terminates in words:
//   - downloading   → progress, with the size when the server declared one
//   - no source     → "the message named it but carried no link" (a real shape:
//                      a multi-file announcement whose extra names had no URL)
//   - failed        → the server's own status, because 404 and offline are different
//                      problems with different next steps, and Retry
//   - unpreviewable → QuickLook's own "no preview" screen, with Share still live, since
//                      another app on the phone may well open it
//
// SHARE IS THE EXPORT. UIActivityViewController on the real cached file exports under
// its true filename to Files, Mail, AirDrop, anywhere. That is why FileStore downloads
// to a path ending in the real name instead of a uuid.

import SwiftUI
import QuickLook
import UIKit

struct FilePreviewView: View {
    let attachment: Attachment
    /// Present when this file can carry a review verdict — an agent hand-off. Absent for
    /// your own uploads, which the server never puts in the waiting set.
    var reviewContext: ReviewContext?
    /// Set by surfaces that can hand this file to an agent (Files). The sheet closes
    /// first and the caller presents the picker, because two sheets stacked on a phone is
    /// a dead end with no visible way back.
    var onAssign: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @StateObject private var download = FileDownloadModel()
    @State private var showingShare = false
    @State private var showingDecision = false

    struct ReviewContext: Equatable {
        let project: String
        let mission: String
        /// Whether the queue currently says this file is waiting on a verdict.
        let isWaiting: Bool
    }

    var body: some View {
        NavigationStack {
            content
                .background(Theme.ground)
                .navigationTitle(attachment.name)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Done") { dismiss() }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showingShare = true
                        } label: {
                            Image(systemName: "square.and.arrow.up")
                        }
                        .disabled(download.localURL == nil)
                        .accessibilityLabel("Share \(attachment.name)")
                    }
                    if let onAssign {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button {
                                dismiss()
                                onAssign()
                            } label: {
                                Image(systemName: "person.crop.circle.badge.plus")
                            }
                            .accessibilityLabel("Assign \(attachment.name) to an agent")
                        }
                    }
                }
                .safeAreaInset(edge: .bottom) { reviewBar }
        }
        .task { await download.start(attachment) }
        .sheet(isPresented: $showingShare) {
            if let url = download.localURL {
                ShareSheet(items: [url])
            }
        }
        .sheet(isPresented: $showingDecision) {
            if let context = reviewContext {
                ReviewDecisionSheet(
                    attachment: attachment,
                    project: context.project,
                    mission: context.mission
                )
            }
        }
    }

    // MARK: - Body states

    @ViewBuilder
    private var content: some View {
        switch download.state {
        case .idle, .downloading:
            VStack(spacing: Theme.s3) {
                if let fraction = download.fraction {
                    ProgressView(value: fraction)
                        .frame(maxWidth: 220)
                    Text("\(Int(fraction * 100))%")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(Theme.inkFaint)
                } else {
                    ProgressView()
                }
                Text(sizeHint)
                    .font(.caption)
                    .foregroundStyle(Theme.inkSoft)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .failed(let message):
            VStack(spacing: Theme.s3) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.title)
                    .foregroundStyle(Theme.warning)
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.s5)
                if download.canRetry {
                    Button("Try again") {
                        Task { await download.start(attachment, force: true) }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                }
                if attachment.isAbsolute, let url = FileStore.encodedURL(attachment.url) {
                    // The last resort that always exists for a store URL: hand it to
                    // Safari. Better than a dead end inside our own sheet.
                    Link("Open in Safari", destination: url)
                        .font(.caption)
                        .foregroundStyle(Theme.accent)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .ready(let url):
            // PLAIN TEXT READS AS TEXT, not through QuickLook. Corner's files are
            // overwhelmingly .md / .json / .jsonl — the disk mirror is 18,545 rows and
            // most of them are prose or data — and QuickLook has no preview generator
            // for extensions it does not know, so a research note would open on "No
            // preview available". The web renders these files' text; so does this.
            if TextFileReader.canRead(name: attachment.name) {
                TextFileReader(url: url, name: attachment.name)
            } else {
                QuickLookView(url: url)
                    .ignoresSafeArea(edges: .bottom)
            }
        }
    }

    private var sizeHint: String {
        if let label = attachment.sizeLabel { return "Loading \(label)…" }
        return "Loading…"
    }

    // MARK: - Review bar

    /// Review happens IN PLACE, over the file you are looking at — the One Page rule.
    /// It is not a separate destination you navigate to and then have to find the file
    /// in again.
    @ViewBuilder
    private var reviewBar: some View {
        if let context = reviewContext, context.isWaiting {
            HStack(spacing: Theme.s3) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Waiting on you")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Theme.warning)
                    Text("Your verdict goes back to the room.")
                        .font(.caption2)
                        .foregroundStyle(Theme.inkFaint)
                }
                Spacer(minLength: 0)
                Button("Review") { showingDecision = true }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
            }
            .padding(.horizontal, Theme.s4)
            .padding(.vertical, Theme.s3)
            .background(.ultraThinMaterial)
            .overlay(alignment: .top) { Rectangle().fill(Theme.hairline).frame(height: 1) }
        }
    }
}

// MARK: - Download model

@MainActor
final class FileDownloadModel: ObservableObject {

    enum State: Equatable {
        case idle
        case downloading
        case failed(String)
        case ready(URL)
    }

    @Published private(set) var state: State = .idle
    @Published private(set) var fraction: Double?

    var localURL: URL? {
        if case .ready(let url) = state { return url }
        return nil
    }

    /// A file with no address will never succeed no matter how many times it is tried,
    /// and a Retry button that cannot work is a lie in the shape of a control.
    private(set) var canRetry = true

    private var task: Task<Void, Never>?

    func start(_ attachment: Attachment, force: Bool = false) async {
        if case .ready = state, !force { return }
        if case .downloading = state, !force { return }
        task?.cancel()
        state = .downloading
        fraction = nil

        let handle = Task { @MainActor in
            do {
                let url = try await FileStore.download(attachment) { value in
                    Task { @MainActor in self.fraction = value }
                }
                guard !Task.isCancelled else { return }
                self.state = .ready(url)
                self.fraction = nil
            } catch {
                guard !Task.isCancelled else { return }
                if case FileStoreError.noSource = error { self.canRetry = false }
                self.state = .failed(
                    (error as? LocalizedError)?.errorDescription ?? "This file could not be opened."
                )
                self.fraction = nil
            }
        }
        task = handle
        await handle.value
    }

    func cancel() {
        task?.cancel()
        task = nil
    }
}

// MARK: - Plain text

/// A reader for the file types Corner actually produces. Monospaced, selectable, and
/// horizontally scrollable so a log line or a JSON blob is not reflowed into soup.
///
/// SIZE HAS A CEILING. Some mirrored files are megabytes of JSONL (the biggest live row
/// is a 3.4MB decision log); handing that to one Text view janks the main thread for
/// seconds. The head is shown and the truncation is STATED — a reader that silently
/// shows the first part of a file is a reader that lies about what is in it.
struct TextFileReader: View {
    let url: URL
    let name: String

    @State private var text: String?
    @State private var truncated = false
    @State private var failure: String?

    /// The extensions whose bytes are text. Everything else goes to QuickLook, which is
    /// better at real documents than anything hand-built here.
    private static let readable: Set<String> = [
        "md", "markdown", "txt", "text", "log",
        "json", "jsonl", "ndjson", "yml", "yaml", "toml", "ini", "env",
        "csv", "tsv",
        "js", "jsx", "ts", "tsx", "swift", "py", "rb", "go", "rs", "sh", "zsh", "css", "scss", "sql",
    ]

    private static let maximumBytes = 400_000

    static func canRead(name: String) -> Bool {
        let head = name.split(whereSeparator: { $0 == "?" || $0 == "#" }).first.map(String.init) ?? name
        guard let dot = head.lastIndex(of: "."), dot != head.index(before: head.endIndex) else { return false }
        return readable.contains(String(head[head.index(after: dot)...]).lowercased())
    }

    var body: some View {
        Group {
            if let failure {
                VStack(spacing: Theme.s2) {
                    Image(systemName: "doc.questionmark").font(.title).foregroundStyle(Theme.warning)
                    Text(failure)
                        .font(.footnote)
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                }
                .padding(Theme.s5)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let text {
                ScrollView([.vertical, .horizontal]) {
                    VStack(alignment: .leading, spacing: Theme.s3) {
                        if truncated {
                            Text("Showing the first \(TextFileReader.maximumBytes / 1000)KB of a longer file. Share it to open the whole thing elsewhere.")
                                .font(.caption2)
                                .foregroundStyle(Theme.warning)
                                .padding(.bottom, Theme.s1)
                        }
                        Text(text)
                            .font(.system(.footnote, design: .monospaced))
                            .foregroundStyle(Theme.ink)
                            .textSelection(.enabled)
                    }
                    .padding(Theme.s4)
                }
            } else {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task(id: url) { await load() }
    }

    private func load() async {
        let target = url
        let limit = TextFileReader.maximumBytes
        let result: (String, Bool)? = await Task.detached(priority: .userInitiated) {
            guard let data = try? Data(contentsOf: target, options: .mappedIfSafe) else { return nil }
            let clipped = data.count > limit
            let slice = clipped ? data.prefix(limit) : data.prefix(data.count)
            // A file the mirror calls text can still hold bytes that are not UTF-8.
            // Latin-1 decodes any byte sequence, so the fallback always produces
            // something readable rather than an empty screen.
            let decoded = String(data: slice, encoding: .utf8) ?? String(data: slice, encoding: .isoLatin1)
            guard let decoded else { return nil }
            return (decoded, clipped)
        }.value

        guard let result else {
            failure = "\(name) is on the phone but its text could not be read. Share it to open it in another app."
            return
        }
        text = result.0
        truncated = result.1
    }
}

// MARK: - QuickLook

struct QuickLookView: UIViewControllerRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator(url: url) }

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: QLPreviewController, context: Context) {
        // The url is per-file and the sheet is rebuilt per file, so a reload only
        // matters when a retry replaced the bytes underneath the same view.
        if context.coordinator.url != url {
            context.coordinator.url = url
            controller.reloadData()
        }
    }

    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        var url: URL

        init(url: URL) { self.url = url }

        func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }

        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
            url as NSURL
        }
    }
}

// MARK: - Share sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
