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

    var body: some View {
        Group {
            if failed {
                ErrorArtifactView(title: url.lastPathComponent, message: "This PDF could not be opened.", onRetry: load)
            } else if let document {
                VStack(spacing: 0) {
                    GeometryReader { stage in
                        PDFKitView(document: document, page: currentPage, onPage: { currentPage = $0; onPage($0) })
                            .accessibilityIdentifier("visual-stage-pdf")
                            .overlay {
                                if review != nil {
                                    Color.clear
                                        .contentShape(Rectangle())
                                        .onTapGesture(coordinateSpace: .local) { location in
                                            let size = stage.size
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
                                    ForEach(Array(review.pins.enumerated()), id: \.element.clientID) { index, pin in
                                        if case .point(let page, let x, let y) = pin.anchor,
                                           page == nil || page == currentPage {
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
                    .task { load() }
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

    private func load() {
        failed = false
        guard let loaded = PDFDocument(url: url), loaded.pageCount > 0 else {
            failed = true
            return
        }
        document = loaded
        pageCount = loaded.pageCount
        currentPage = min(max(1, page), loaded.pageCount)
    }

    private func go(_ next: Int, in document: PDFDocument) {
        let clamped = min(max(1, next), document.pageCount)
        currentPage = clamped
        onPage(clamped)
    }
}

/// PDFView with page-change callbacks. The delegate posts
/// `PDFViewPageChanged` on every navigation (arrows, scrub, programmatic).
private struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument
    let page: Int
    let onPage: (Int) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPage: onPage) }

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.document = document
        view.autoScales = true
        view.displayMode = .singlePageContinuous
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
