// PDFArtifactView.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// PDFKit renders the file: pinch-zoom and scrub come free, which is the
// argument for a native renderer over the web's canvas layer. Page arrows +
// `Page N of M` footer per the design's PDF stage (no thumbnails — P016 was
// the web's empty-box strip). Pages are 1-based in tab `state.page`.
// (Task 8 adds tap-to-pin at x/y % on the tapped page.)

import PDFKit
import SwiftUI

/// R24 P074: aspect-fit geometry for one PDF page inside the stage. The
/// whole page stays visible, letterboxed on `--surface`; the full detent
/// shows it larger, never cropped. Pure, so the unit test pins the math.
enum PDFPageFit {
    /// The fitted page rect, centered in the stage. Zero-safe: an unknown
    /// page or stage fills nothing (`.zero`), never a NaN frame.
    static func fittedRect(pageSize: CGSize, in stage: CGSize) -> CGRect {
        guard pageSize.width > 0, pageSize.height > 0,
              stage.width > 0, stage.height > 0 else { return .zero }
        let scale = min(stage.width / pageSize.width, stage.height / pageSize.height)
        let size = CGSize(width: pageSize.width * scale, height: pageSize.height * scale)
        return CGRect(
            x: (stage.width - size.width) / 2,
            y: (stage.height - size.height) / 2,
            width: size.width, height: size.height
        )
    }
}

/// R24 P074, testable seam for the arrow turns: 1-based page to `PDFPage`,
/// clamped (out of range is nil, never a crash). The view compares indices
/// so echoing the delegate cannot loop.
enum PDFPageTurn {
    static func target(document: PDFDocument, page: Int) -> PDFPage? {
        let index = page - 1
        guard index >= 0, index < document.pageCount else { return nil }
        return document.page(at: index)
    }
}

struct PDFArtifactView: View {
    let url: URL
    /// 1-based page from tab state.
    let page: Int
    let onPage: (Int) -> Void
    /// Present when the host supports review (Task 8): taps drop point pins,
    /// markers select them. Nil keeps the pure Task 7 viewer.
    var review: V2ReviewStore?
    var artifactID: String?

    @State private var document: PDFDocument?
    @State private var failed = false
    @State private var currentPage: Int = 1
    @State private var pageCount: Int = 0
    /// The current page's media size: the fitted rect (and the pin/marker
    /// mapping) follows the page, not the stage.
    @State private var pageSize: CGSize = .zero

    var body: some View {
        Group {
            if failed {
                ErrorArtifactView(title: url.lastPathComponent, message: "This PDF could not be opened.", onRetry: { Task { await load() } })
            } else if let document {
                VStack(spacing: 0) {
                    GeometryReader { stage in
                        // R24 P074: the page aspect-fits inside the stage —
                        // the view IS the fitted rect, so the AX frame the
                        // UI test reads proves whole-page-visible (letterbox
                        // around it is the sheet's `--surface`).
                        let fit = PDFPageFit.fittedRect(pageSize: pageSize, in: stage.size)
                        let rect = fit == .zero
                            ? CGRect(origin: .zero, size: stage.size)
                            : fit
                        Color.clear
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .overlay {
                                PDFKitView(document: document, page: currentPage, onPage: { currentPage = $0; onPage($0); readPageSize(in: document, page: $0) })
                                    .frame(width: rect.width, height: rect.height)
                                    .accessibilityIdentifier("visual-stage-pdf")
                                    .overlay {
                                        if review != nil {
                                            Color.clear
                                                .contentShape(Rectangle())
                                                .onTapGesture(coordinateSpace: .local) { location in
                                                    let size = rect.size
                                                    guard size.width > 0, size.height > 0 else { return }
                                                    review?.addPin(
                                                        .point(
                                                            page: currentPage,
                                                            x: Self.percent(location.x, of: size.width),
                                                            y: Self.percent(location.y, of: size.height)
                                                        ),
                                                        text: ""
                                                    )
                                                }
                                        }
                                    }
                                    .overlay(alignment: .topLeading) {
                                        if let review {
                                            ObservedStageMarkers(review: review, size: rect.size, page: currentPage)
                                        }
                                    }
                            }
                    }
                    HStack(spacing: Theme.s4) {
                        Button {
                            go(currentPage - 1, in: document)
                        } label: {
                            Image(systemName: "chevron.left")
                        }
                        .disabled(currentPage <= 1)
                        .accessibilityIdentifier("visual-pdf-prev")
                        Text("Page \(currentPage) of \(pageCount)")
                            .font(.hanken(12))
                            .foregroundStyle(Theme.inkSoft)
                            .accessibilityIdentifier("visual-pdf-page")
                        Button {
                            go(currentPage + 1, in: document)
                        } label: {
                            Image(systemName: "chevron.right")
                        }
                        .disabled(currentPage >= pageCount)
                        .accessibilityIdentifier("visual-pdf-next")
                    }
                    .padding(.vertical, Theme.s2)
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .task { await load() }
            }
        }
        .onAppear { currentPage = max(1, page) }
    }

    /// A tap offset as a 0–100 % pin coordinate. Explicit Doubles: CGFloat
    /// and Double `*` overloads collide on the bare literal (measured).
    private static func percent(_ value: CGFloat, of total: CGFloat) -> Double {
        guard total > 0 else { return 0 }
        return min(max(Double(value / total) * 100.0, 0.0), 100.0)
    }

    /// R23 P072: the bytes load off the main thread. `PDFDocument(url:)`
    /// fetches a remote URL synchronously — on the main actor that stalls the
    /// sheet's rise (uncomposited white below the stage, a stale AX tree),
    /// which is exactly the 6:37 PM sheet-half state. The in-memory parse
    /// stays on the main actor; pages still render lazily.
    private func load() async {
        failed = false
        let target = url
        let bytes = await Task.detached(priority: .userInitiated) { () -> Data? in
            try? Data(contentsOf: target)
        }.value
        guard let bytes,
              let loaded = PDFDocument(data: bytes),
              loaded.pageCount > 0 else {
            failed = true
            return
        }
        document = loaded
        pageCount = loaded.pageCount
        currentPage = min(max(1, page), loaded.pageCount)
        readPageSize(in: loaded, page: currentPage)
    }

    /// The fitted rect follows the page being shown (mixed-size documents
    /// refit on every turn, arrows included).
    private func readPageSize(in document: PDFDocument, page: Int) {
        guard page >= 1, page <= document.pageCount,
              let size = document.page(at: page - 1)?.bounds(for: .mediaBox).size,
              size.width > 0, size.height > 0 else { return }
        pageSize = size
    }

    private func go(_ next: Int, in document: PDFDocument) {
        let clamped = min(max(1, next), document.pageCount)
        currentPage = clamped
        onPage(clamped)
    }
}

/// PDFView with page-change callbacks. The delegate posts
/// `PDFViewPageChanged` on every navigation (arrows, scrub, programmatic).
/// R24 P074: one page at a time, aspect-fit (`singlePage` + `autoScales`
/// shows the whole page, never a cropped scroll window), and the arrows
/// actually turn the view — the old `updateUIView` moved the label but
/// never the page.
private struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument
    let page: Int
    let onPage: (Int) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPage: onPage) }

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.document = document
        view.autoScales = true
        view.displayMode = .singlePage
        view.backgroundColor = .clear
        if let target = document.page(at: page - 1) { view.go(to: target) }
        NotificationCenter.default.addObserver(
            context.coordinator, selector: #selector(Coordinator.changed(_:)),
            name: .PDFViewPageChanged, object: view
        )
        return view
    }

    func updateUIView(_ view: PDFView, context: Context) {
        if view.document !== document { view.document = document }
        // Index-compared, never identity-compared: turning to the page
        // already shown is a no-op, so the delegate echo cannot loop.
        if let target = PDFPageTurn.target(document: view.document ?? document, page: page) {
            let index = (view.document ?? document).index(for: target)
            let current = view.currentPage.flatMap { (view.document ?? document).index(for: $0) }
            if current != index { view.go(to: target) }
        }
    }

    final class Coordinator: NSObject {
        let onPage: (Int) -> Void
        init(onPage: @escaping (Int) -> Void) { self.onPage = onPage }

        @objc func changed(_ note: Notification) {
            guard let view = note.object as? PDFView,
                  let current = view.currentPage,
                  let index = view.document?.index(for: current) else { return }
            onPage(index + 1)
        }
    }
}
