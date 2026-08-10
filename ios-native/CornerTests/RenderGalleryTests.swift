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
    private func render<V: View>(_ name: String, width: CGFloat = 390, _ view: V) throws -> URL {
        let renderer = ImageRenderer(
            content: view
                .frame(width: width, alignment: .leading)
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
        let data = try XCTUnwrap(image.pngData())
        let url = outputDirectory.appendingPathComponent("\(name).png")
        try data.write(to: url)
        return url
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
}
