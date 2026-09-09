import XCTest
@testable import Corner

/// Native plan Task 7, Step 1: durable Visual Window tab tests. Tabs live in
/// the Thread's shared visual session on the server; the store mirrors them,
/// appends on open, removes only the closed id, and never opens on select.
/// Backend wins over the plan's snippets (see the R15 report table): `open`
/// dedupes server-side by target, `state` keys are page/timecodeMs/codeLine/
/// siteViewport/reviewing, and there is no update-state mutation — state rides
/// the open call and is cached locally after.
@MainActor
final class VisualWindowStoreTests: XCTestCase {

    // MARK: - helpers

    private func tab(
        id: String, kind: VisualTabKind, artifactID: String? = nil,
        title: String, state: [String: String] = [:]
    ) -> VisualWindowTab {
        VisualWindowTab(
            id: id, visualSessionID: "session-1", threadID: "mission-thread-1",
            kind: kind, artifactID: artifactID, title: title,
            openedBy: .agent, agentLabel: "Corner", state: state, createdAt: Date()
        )
    }

    /// Each test gets its own session id: selection persists per session in
    /// UserDefaults (even across runs on one simulator), so a shared id
    /// would leak one test's selection into the next.
    private func store(tabs: [VisualWindowTab], session: String = "session-\(UUID().uuidString)", fake: CornerV2APIFake? = nil) -> (VisualWindowStore, CornerV2APIFake) {
        let api = fake ?? CornerV2APIFake()
        api.visualTabsHandler = { _ in tabs }
        return (VisualWindowStore(api: api, visualSessionID: session), api)
    }

    // MARK: - plan's tests

    func testOpeningAgentArtifactAppendsATabAndDoesNotChangeExistingTabState() async throws {
        let (store, api) = store(tabs: [
            tab(id: "tab-pdf", kind: .pdf, artifactID: "artifact-1", title: "Brief", state: ["page": "4"]),
            tab(id: "tab-web", kind: .web, title: "Site"),
        ])
        api.openTabHandler = { kind, _, artifactID, title, _ in
            self.tab(id: "tab-video", kind: kind, artifactID: artifactID, title: title, state: ["timecodeMs": "2000"])
        }
        try await store.load()
        try await store.open(.video, threadID: "mission-thread-1", artifactID: "artifact-9", title: "Teaser", state: ["timecodeMs": "2000"])
        XCTAssertEqual(store.tabs.map(\.kind), [.pdf, .web, .video])
        XCTAssertEqual(store.tabs.first?.state["page"], "4")
        XCTAssertEqual(store.selectedTabID, "tab-video")
    }

    func testRendererSelectsSuppliedFileAndMediaKinds() {
        XCTAssertEqual(ArtifactRenderer.viewType(for: .pdf), .pdf)
        XCTAssertEqual(ArtifactRenderer.viewType(for: .video), .video)
        XCTAssertEqual(ArtifactRenderer.viewType(for: .web), .web)
        XCTAssertEqual(ArtifactRenderer.viewType(for: .photo), .photo)
        XCTAssertEqual(ArtifactRenderer.viewType(for: .code), .code)
        XCTAssertEqual(ArtifactRenderer.viewType(for: .deck), .quickLook)
        // R59 (Patrik phone review): documents route to the native reader,
        // not QuickLook (QuickLook showed the id over "data").
        XCTAssertEqual(ArtifactRenderer.viewType(for: .document), .document)
        XCTAssertEqual(ArtifactRenderer.viewType(for: .genericFile), .quickLook)
        XCTAssertEqual(ArtifactRenderer.viewType(for: .youtube), .youtube)
    }

    // MARK: - brief's tests

    /// Only `close(id:)` removes a tab: the closed id leaves, order of the
    /// rest is untouched, and selection falls to a surviving tab.
    func testCloseRemovesOnlyThatTabAndKeepsOrder() async throws {
        let (store, api) = store(tabs: [
            tab(id: "tab-1", kind: .pdf, title: "Brief"),
            tab(id: "tab-2", kind: .web, title: "Site"),
            tab(id: "tab-3", kind: .video, title: "Teaser"),
        ])
        api.closeTabHandler = { _ in }
        try await store.load()
        store.select(id: "tab-2")
        try await store.close(id: "tab-2")
        XCTAssertEqual(store.tabs.map(\.id), ["tab-1", "tab-3"])
        XCTAssertNotEqual(store.selectedTabID, "tab-2")
    }

    /// Selecting never hits the network: no tab is created, closed, or
    /// reordered by a select.
    func testSelectNeverCallsOpen() async throws {
        let (store, api) = store(tabs: [
            tab(id: "tab-1", kind: .pdf, title: "Brief"),
            tab(id: "tab-2", kind: .web, title: "Site"),
        ])
        var opens = 0
        api.openTabHandler = { kind, _, _, title, _ in opens += 1; return self.tab(id: "tab-x", kind: kind, title: title) }
        try await store.load()
        store.select(id: "tab-1")
        store.select(id: "tab-2")
        store.select(id: "no-such-tab")
        XCTAssertEqual(opens, 0)
        XCTAssertEqual(store.tabs.map(\.id), ["tab-1", "tab-2"])
        XCTAssertEqual(store.selectedTabID, "tab-2")
    }

    /// A fresh store on the same server session restores the tabs, the
    /// selection, and the renderer state (page) — durability is server-side,
    /// the selection rides a per-session default and survives only while the
    /// tab is still open.
    func testRelaunchRestoresTabsSelectionAndPageFromServerSession() async throws {
        let tabs = [
            tab(id: "tab-pdf", kind: .pdf, artifactID: "artifact-1", title: "Brief", state: ["page": "4"]),
            tab(id: "tab-web", kind: .web, title: "Site"),
        ]
        let api = CornerV2APIFake()
        api.visualTabsHandler = { _ in tabs }
        let first = VisualWindowStore(api: api, visualSessionID: "session-restore")
        try await first.load()
        first.select(id: "tab-pdf")
        // A relaunch is a new store instance against the same session.
        let second = VisualWindowStore(api: api, visualSessionID: "session-restore")
        try await second.load()
        XCTAssertEqual(second.tabs.map(\.id), ["tab-pdf", "tab-web"])
        XCTAssertEqual(second.selectedTabID, "tab-pdf")
        XCTAssertEqual(second.tabs.first?.state["page"], "4")
    }

    /// Reopening an already-open artifact selects it without duplicating it
    /// (the server dedupes open by target; the client never holds two rows
    /// for one tab id).
    func testReopenSelectsWithoutDuplicating() async throws {
        let (store, api) = store(tabs: [tab(id: "tab-pdf", kind: .pdf, artifactID: "artifact-1", title: "Brief")])
        api.openTabHandler = { _, _, _, _, _ in self.tab(id: "tab-pdf", kind: .pdf, artifactID: "artifact-1", title: "Brief") }
        try await store.load()
        try await store.open(.pdf, threadID: "mission-thread-1", artifactID: "artifact-1", title: "Brief", state: [:])
        XCTAssertEqual(store.tabs.map(\.id), ["tab-pdf"])
        XCTAssertEqual(store.selectedTabID, "tab-pdf")
    }
}

/// R59 (Patrik phone review 2026-09-08): the native document reader parses
/// markdown and sniffs HTML — pure, so these pin the rendering decision
/// without a view. The gate that shipped the "artifact id over data" break
/// had no such check; this is the standing anchor for "documents render."
final class DocumentReaderParsingTests: XCTestCase {

    func testHeadingsBulletsAndParagraphs() {
        let md = """
        # Title

        A paragraph of prose that wraps
        across two source lines.

        ## Section
        - first
        - second

        1. one
        2. two
        """
        let blocks = DocumentMarkdown.blocks(from: md)
        XCTAssertEqual(blocks.first, .heading(level: 1, text: "Title"))
        XCTAssertTrue(blocks.contains(.paragraph("A paragraph of prose that wraps across two source lines.")))
        XCTAssertTrue(blocks.contains(.heading(level: 2, text: "Section")))
        XCTAssertTrue(blocks.contains(.bullet("first")))
        XCTAssertTrue(blocks.contains(.bullet("second")))
        XCTAssertTrue(blocks.contains(.numbered(1, "one")))
        XCTAssertTrue(blocks.contains(.numbered(2, "two")))
    }

    func testFencedCodeAndRule() {
        let md = """
        Intro

        ```
        let x = 1
        let y = 2
        ```

        ---

        > a quote
        """
        let blocks = DocumentMarkdown.blocks(from: md)
        XCTAssertTrue(blocks.contains(.code("let x = 1\nlet y = 2")))
        XCTAssertTrue(blocks.contains(.rule))
        XCTAssertTrue(blocks.contains(.quote("a quote")))
    }

    func testMarkdownIsNotMistakenForHTML() {
        let md = "# Brand Guidelines\n\nThe monogram is the logo. Use <br> sparingly."
        XCTAssertFalse(DocumentText.looksLikeHTML(md), "a stray inline tag must not trip the HTML path")
    }

    func testRealHTMLTakesTheWebPath() {
        XCTAssertTrue(DocumentText.looksLikeHTML("<!DOCTYPE html><html><body>Hi</body></html>"))
        XCTAssertTrue(DocumentText.looksLikeHTML("<div class=\"page\"><section>content</section></div>"))
    }
}
