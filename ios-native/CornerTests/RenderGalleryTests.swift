// RenderGalleryTests.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Renders the REAL views with REAL row shapes to PNGs, so the pieces that only appear
// under failure — a send that did not land, a turn that stopped, a block kind this
// build does not know — can be LOOKED AT on purpose instead of being seen for the
// first time by a user.
//
// This is not a snapshot-comparison suite; there are no golden files to churn. It is a
// gallery: it fails if a view cannot render at all, and it leaves images behind for a
// human (or an agent) to judge. `CORNER_RENDER_DIR` overrides where they land.

import XCTest
import SwiftUI
@testable import Corner

@MainActor
final class RenderGalleryTests: XCTestCase {

    private var outputDirectory: URL {
        let path = ProcessInfo.processInfo.environment["CORNER_RENDER_DIR"]
            ?? NSTemporaryDirectory().appending("corner-render")
        let url = URL(fileURLWithPath: path, isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    @discardableResult
    private func render<V: View>(_ name: String, width: CGFloat = 390, height: CGFloat? = nil, _ view: V) throws -> URL {
        let renderer = ImageRenderer(
            content: view
                .frame(width: width, height: height, alignment: .leading)
                .padding(16)
                .background(Theme.ground)
                // The same environment CornerApp installs. Without the tint the gallery
                // would render system-blue controls the real app never shows, which
                // makes it useless for judging exactly the thing it exists to judge.
                .tint(Theme.accent)
                .environment(\.colorScheme, .dark)
        )
        renderer.scale = 2
        let image = try XCTUnwrap(renderer.uiImage, "\(name) produced no image — the view failed to render")
        XCTAssertGreaterThan(image.size.height, 8, "\(name) rendered with no height")
        // A HEIGHT CHECK IS NOT A RENDER CHECK. The review sheet passed the height
        // assertion while drawing a featureless black bar — a NavigationStack given no
        // height collapses, produces a valid image, and every assertion here was happy
        // with it. So the gate is now "did any ink land", which is the thing the
        // gallery is actually for.
        assertHasInk(image, name: name)
        let data = try XCTUnwrap(image.pngData())
        let url = outputDirectory.appendingPathComponent("\(name).png")
        try data.write(to: url)
        return url
    }

    /// Fails when every pixel is effectively the same colour — an empty frame wearing
    /// the ground colour, which is what a collapsed layout looks like.
    private func assertHasInk(_ image: UIImage, name: String, file: StaticString = #filePath, line: UInt = #line) {
        guard let cgImage = image.cgImage else {
            return XCTFail("\(name) has no bitmap to inspect", file: file, line: line)
        }
        let side = 48
        var pixels = [UInt8](repeating: 0, count: side * side)
        guard let context = CGContext(
            data: &pixels,
            width: side, height: side,
            bitsPerComponent: 8, bytesPerRow: side,
            space: CGColorSpaceCreateDeviceGray(),
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
            return XCTFail("\(name) could not be sampled", file: file, line: line)
        }
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: side, height: side))
        let spread = Int(pixels.max() ?? 0) - Int(pixels.min() ?? 0)
        XCTAssertGreaterThan(
            spread, 12,
            "\(name) rendered as a flat field — the view drew nothing. Layout collapsed, not a styling issue.",
            file: file, line: line
        )
    }

    // MARK: - Fixtures

    private func row(_ json: String) throws -> MessageRow {
        try JSONDecoder().decode(MessageRow.self, from: Data(json.utf8))
    }

    /// Blocks built through the REAL metadata pipeline rather than constructed
    /// directly, so the gallery exercises parsing as well as rendering.
    ///
    /// All of them come from ONE row on purpose — which is how they actually arrive,
    /// and which is what makes their ids distinct. Building them one row at a time gave
    /// every block the id "b-block-0", and ForEach then rendered the first one N times:
    /// five different fallback cards all drew "TABLE / Phoenix leads". The gallery
    /// caught it; a list of assertions would not have.
    private func blocks(_ jsons: [String]) throws -> [MessageBlock] {
        let content = MessageContent.build(from: try row("""
        {"id":"b","role":"assistant","text":"","metadata":{"blocks":[\(jsons.joined(separator: ","))]}}
        """))
        XCTAssertEqual(content.blocks.count, jsons.count, "every fixture block must survive parsing")
        XCTAssertEqual(
            Set(content.blocks.map(\.id)).count, jsons.count,
            "block ids must be unique or ForEach silently collapses them"
        )
        return content.blocks
    }

    // MARK: - Gallery

    func testRenderThread() throws {
        let conversation = [
            try row("""
            {"id":"1","role":"user","text":"Can you put the audit somewhere I can read it?",
             "user_name":"Patrik","timestamp":"2026-08-10T16:04:11.221844+00:00"}
            """),
            try row("""
            {"id":"2","role":"assistant","agent":"elon",
             "text":"Done — the audit is up, with the four findings ranked. https://www.aheadofmarket.com/audit",
             "timestamp":"2026-08-10T16:06:02.910233+00:00",
             "metadata":{"result_payload":{"type":"link","payload":"https://www.aheadofmarket.com/audit","summary":"App Store & architecture audit"}}}
            """),
        ]
        try render("01-reply-with-link-card", VStack(alignment: .leading, spacing: 12) {
            ForEach(conversation) { MessageBubbleView(row: $0) }
        })
    }

    /// The failure the web hides: a send that did not land.
    func testRenderFailedSend() throws {
        try render("02-failed-send-retryable", VStack(alignment: .leading, spacing: 12) {
            OutboxBubbleView(
                item: OutboxItem(id: "o1", text: "Pull the Q3 numbers.", state: .sending, createdAt: Date()),
                retry: {}, discard: {}
            )
            OutboxBubbleView(
                item: OutboxItem(
                    id: "o2",
                    text: "Ship the reel to the client folder before 5.",
                    state: .failed("The server returned 503."),
                    createdAt: Date()
                ),
                retry: {}, discard: {}
            )
        })
    }

    /// KNOWN HARNESS LIMITATION, not a bug in the app: ImageRenderer cannot snapshot
    /// animating content, so the indeterminate ProgressView in the two `working` rows
    /// draws as a yellow prohibition glyph in this PNG. It spins normally on device.
    /// Judge the capsule, the type and the copy here; judge the spinner on a simulator.
    func testRenderTurnStates() throws {
        try render("03-turn-states", VStack(alignment: .leading, spacing: 16) {
            TurnIndicatorView(turn: .working(detail: nil))
            TurnIndicatorView(turn: .working(detail: "Checking the live page"))
            TurnIndicatorView(turn: .stalled(sentText: "Ship the reel to the client folder."))
        })
    }

    func testRenderKnownBlocks() throws {
        let known = try blocks([
            #"{"type":"step","title":"Read the audit","state":"done"}"#,
            #"{"type":"step","title":"Rebuild the rail","state":"working"}"#,
            #"{"type":"step","title":"Ship it","state":"pending"}"#,
            #"{"type":"success","title":"Shipped","detail":"Live on production, verified."}"#,
            #"{"type":"snag","title":"APNs key missing","detail":"No packet has reached Apple yet."}"#,
            #"{"type":"summary","title":"Where this stands","bullets":["Build passes clean","75 tests green","Push wiring is env-gated"]}"#,
        ])
        try render("04-known-blocks", VStack(alignment: .leading, spacing: 12) {
            ForEach(known) { BlockView(block: $0) }
        })
    }

    /// THE FALLBACK. Kinds this build has no screen for, including one invented after
    /// it shipped, must still say what they are and show what they carry.
    func testRenderBlockFallbacks() throws {
        let unknown = try blocks([
            #"{"type":"data","title":"Phoenix leads","columns":["a"],"rows":[[1],[2],[3],[4]]}"#,
            #"{"type":"email","subject":"Re: the proposal","quote":"Looks good — send the invoice."}"#,
            #"{"type":"hologram","title":"Q3 forecast","detail":"A kind invented after this binary shipped."}"#,
            #"{"type":"gallery"}"#,
            #"{"type":"choice","prompt":"Which one ships first?","choices":[{"id":"1","title":"The reel"},{"id":"2","title":"The carousel"}]}"#,
        ])
        try render("05-block-fallbacks", VStack(alignment: .leading, spacing: 12) {
            ForEach(unknown) { BlockView(block: $0) }
        })
    }

    /// A row with nothing renderable must not draw an empty box.
    func testRenderUndisplayableRow() throws {
        try render("06-undisplayable-row", MessageBubbleView(row: try row("""
        {"id":"e","role":"assistant","agent":"corner","text":"","timestamp":"2026-08-10T16:06:02.910233+00:00"}
        """)))
    }

    // MARK: - Stage 2
    //
    // NOTE ON WHAT THESE PNGs CAN AND CANNOT SHOW. ImageRenderer does not run `.task`
    // and does not fetch remote images, so every AsyncImage here draws its PLACEHOLDER.
    // That is the honest limit of the harness — but it also means these images are
    // exactly the "still loading" state a user on a slow connection sees, which is the
    // state nobody normally looks at on purpose. Judge the frame, the metrics and the
    // copy here; judge a loaded photograph on a simulator.

    /// File cards in the thread: the real delivery shapes, including the amber mark on
    /// one that is waiting on a verdict.
    func testRenderFileCards() throws {
        let image = Attachment(url: "https://rag.aheadofmarket.com/files/aom/render-0118.png", name: "render-0118.png", mime: "image/png", size: 842_133, gateStatus: "")
        let doc = Attachment(url: "https://rag.aheadofmarket.com/files/aom/Q3 report final.pdf", name: "Q3 report final.pdf", mime: "application/pdf", size: 1_204_882, gateStatus: "")
        let waiting = Attachment(url: "https://rag.aheadofmarket.com/files/aom/rooms-2026-08-09.md", name: "rooms-2026-08-09.md", mime: "", size: 6284, gateStatus: "not_applicable")
        try render("07-file-cards", VStack(alignment: .leading, spacing: 12) {
            AttachmentCardView(attachment: image) {}
            AttachmentCardView(attachment: doc) {}
            AttachmentCardView(attachment: waiting, isWaiting: true) {}
        })
    }

    /// A hand-off that says something: the file card AND the agent's sentence. The web
    /// blanks the sentence here (useRoomThread.js:486) — this render is where you can
    /// see that it survived.
    func testRenderHandoffKeepsItsSentence() throws {
        try render("08-handoff-with-prose", MessageBubbleView(row: try row("""
        {"id":"53894d66","role":"assistant","agent":"corner","source":"auto-share",
         "text":"Disk count finished — 15GB of last year's Adobe is the biggest win.",
         "timestamp":"2026-08-10T16:06:02.910233+00:00",
         "metadata":{"handoff":true,
          "attachment":{"url":"https://rag.aheadofmarket.com/files/aom/rooms-2026-08-09.md",
            "name":"rooms-2026-08-09.md","mime":"text/markdown","size":6284}}}
        """)))
    }

    /// The gallery: several images tile, one image is full width.
    func testRenderGalleryBlocks() throws {
        let gallery = try blocks([
            #"{"type":"gallery","images":[{"url":"https://x/a.png"},{"url":"https://x/b.png"},{"url":"https://x/c.png"},{"url":"https://x/d.png"},{"url":"https://x/e.png"}],"caption":"Five frames from the shoot"}"#,
            #"{"type":"artifact","name":"home-hero.png","url":"https://x/home-hero.png","kind":"screenshot"}"#,
            #"{"type":"artifact","name":"ambition-mechanical.com","url":"https://ambition-mechanical.com","kind":"live"}"#,
        ])
        try render("09-image-blocks", VStack(alignment: .leading, spacing: 12) {
            ForEach(gallery) { BlockView(block: $0) }
        })
    }

    /// The verdict sheet. Approve says out loud that it cannot be taken back, because
    /// the endpoint's undo really does refuse everything except a dismiss.
    /// Every step of the verdict, drawn on purpose — including the failure card, which
    /// in production only appears when the server refuses a decision and would otherwise
    /// never be looked at before a user hit it.
    ///
    /// The FORM is rendered rather than the sheet: ImageRenderer cannot draw a
    /// NavigationStack (it produced a featureless black bar, then an
    /// unsupported-content glyph), which is exactly why the form was split out of the
    /// chrome.
    func testRenderReviewDecisionStates() throws {
        let deck = Attachment(
            url: "https://rag.aheadofmarket.com/files/aom/deck.pdf",
            name: "Ambition — Q3 deck.pdf",
            mime: "application/pdf",
            size: 1_204_882,
            gateStatus: ""
        )
        func form(_ mode: ReviewDecisionMode, notes: String = "", failure: String? = nil) -> some View {
            ReviewDecisionForm(
                attachment: deck,
                locationLabel: "ambition / website",
                mode: mode,
                notes: .constant(notes),
                busy: false,
                failure: failure
            )
        }
        try render("10-review-choices", height: 380, form(.choosing))
        try render("11-review-approve-confirm", height: 260, form(.confirmingApprove))
        // HARNESS LIMIT, not a bug: TextEditor is UIKit-backed and ImageRenderer draws
        // an unsupported-content glyph in its place. Judge the labels, the ranked gaps
        // and the button row here; judge the field itself on a simulator.
        try render("12-review-request-changes", height: 380,
                   form(.writingChanges, notes: "The third slide's headline is the old positioning. Use the one from the brief."))
        // The card is titled "Nothing was recorded", so it receives the CAUSE, not the
        // store's full self-contained sentence — which printed the same fact twice.
        try render("13-review-decision-failed", height: 420,
                   form(.choosing, failure: "You do not have access to that."))
    }
}
