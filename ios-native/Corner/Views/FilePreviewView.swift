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
            QuickLookView(url: url)
                .ignoresSafeArea(edges: .bottom)
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
