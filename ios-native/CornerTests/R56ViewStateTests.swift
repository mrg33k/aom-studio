// R56ViewStateTests.swift — Corner native iOS
// corner:corner-v2 R56 (P094/P095/C016) — the phone publishes what it is
// showing and follows the agent's window.
//
// Pins:
// - publish: the four wire shapes (mode tap → {mode}, tab select → {tabId},
//   page turn → {page}, scroll → {scroll}), field-level diffs (no stale
//   re-asserts), debounce coalescing, and the endpoint shapes
//   (`v2Visual:setViewState` / `v2Visual:getSession`, unset fields omitted).
// - consume: the agent's active tab raises + focuses (FaceTime when
//   hidden); the agent's `mode=hidden` minimizes with no tap; adoptions
//   never echo a write back; last-writer-wins inside the conflict window.
// - geometry: the website-as-video band is 16:9 full-bleed, capped at a
//   third of the screen (V2SiteBandMetrics).

import XCTest
@testable import Corner

@MainActor
final class R56ViewStateTests: XCTestCase {
    private var eyeKeys: [String] = []

    override func tearDown() {
        for key in eyeKeys { UserDefaults.standard.removeObject(forKey: key) }
        eyeKeys.removeAll()
        super.tearDown()
    }

    private func threadID() -> String {
        let id = "thread-r56-\(UUID().uuidString)"
        eyeKeys.append(V2EyeModeStore.key(threadID: id))
        return id
    }

    private func tab(id: String, kind: VisualTabKind = .pdf, title: String = "T") -> VisualWindowTab {
        VisualWindowTab(
            id: id, visualSessionID: "session-r56", threadID: "thread-r56",
            kind: kind, artifactID: nil, title: title,
            openedBy: .agent, agentLabel: "Corner", state: [:], createdAt: Date()
        )
    }

    /// A sync on a two-tab store, clock frozen. Debounce parked (an hour) so
    /// every write happens through an explicit `flush()` — deterministic,
    /// never sleeping.
    private func synced(
        tabs: [VisualWindowTab], file: StaticString = #filePath, line: UInt = #line
    ) async throws -> (V2ViewStateSync, CornerV2APIFake, V2EyeModeStore, VisualWindowStore, String) {
        let tid = threadID()
        let api = CornerV2APIFake()
        api.visualTabsHandler = { _ in tabs }
        api.artifactsHandler = { _ in [] }
        api.setViewStateHandler = { _, _ in }
        let eye = V2EyeModeStore(threadID: tid)
        let window = VisualWindowStore(api: api, visualSessionID: "session-r56-\(UUID().uuidString)")
        try await window.load()
        let sync = V2ViewStateSync(api: api)
        sync.debounce = .seconds(3600)
        var t = Date()
        sync.now = { t }
        sync.attach(threadID: tid, eye: eye, window: window)
        return (sync, api, eye, window, tid)
    }

    // MARK: - endpoint shapes (the wire contract, no backend)

    func testSetViewStateEndpointShape() {
        let modeOnly = ConvexEndpoint.v2SetViewState(
            threadID: "thread-1", diff: V2ViewStateDiff(mode: .facetime, tabId: nil, page: nil, scroll: nil))
        XCTAssertEqual(modeOnly.path, "v2Visual:setViewState")
        XCTAssertEqual(modeOnly.args["threadId"] as? String, "thread-1")
        XCTAssertEqual(modeOnly.args["mode"] as? String, "facetime")
        XCTAssertNil(modeOnly.args["tabId"], "unset fields ride omitted, never null")
        XCTAssertNil(modeOnly.args["page"])
        XCTAssertNil(modeOnly.args["scroll"])

        let full = ConvexEndpoint.v2SetViewState(
            threadID: "t", diff: V2ViewStateDiff(mode: .full, tabId: "tab-9", page: 3, scroll: 120))
        XCTAssertEqual(full.args["mode"] as? String, "full")
        XCTAssertEqual(full.args["tabId"] as? String, "tab-9")
        XCTAssertEqual(full.args["page"] as? Int, 3)
        XCTAssertEqual(full.args["scroll"] as? Double, 120)
    }

    func testGetSessionEndpointShape() {
        let endpoint = ConvexEndpoint.v2VisualSession(threadID: "thread-1")
        XCTAssertEqual(endpoint.path, "v2Visual:getSession")
        XCTAssertEqual(endpoint.args["threadId"] as? String, "thread-1")
    }

    // MARK: - diff math (pure)

    func testDiffSendsOnlyChangedFields() {
        let base = V2ViewSnapshot(mode: .full, tabId: "a", page: 2, scroll: 40)
        XCTAssertNil(base.diff(since: base), "no change means no write")
        XCTAssertEqual(
            V2ViewSnapshot(mode: .facetime, tabId: "a", page: 2, scroll: 40).diff(since: base),
            V2ViewStateDiff(mode: .facetime, tabId: nil, page: nil, scroll: nil),
            "a mode tap sends {mode} only")
        XCTAssertEqual(
            V2ViewSnapshot(mode: .full, tabId: "b", page: 2, scroll: 40).diff(since: base),
            V2ViewStateDiff(mode: nil, tabId: "b", page: nil, scroll: nil),
            "a tab select sends {tabId} only — the server resets that tab's scroll")
        XCTAssertEqual(
            V2ViewSnapshot(mode: .full, tabId: "a", page: 3, scroll: 40).diff(since: base),
            V2ViewStateDiff(mode: nil, tabId: nil, page: 3, scroll: nil),
            "a page turn sends {page} only")
        XCTAssertEqual(
            V2ViewSnapshot(mode: .full, tabId: "a", page: 2, scroll: 400).diff(since: base),
            V2ViewStateDiff(mode: nil, tabId: nil, page: nil, scroll: 400),
            "a scroll sends {scroll} only")
    }

    func testDiffAgainstNothingSendsTheSnapshot() {
        let diff = V2ViewSnapshot(mode: .hidden, tabId: "a", page: nil, scroll: nil).diff(since: nil)
        XCTAssertEqual(diff, V2ViewStateDiff(mode: .hidden, tabId: "a", page: nil, scroll: nil))
    }

    func testDeselectSendsNothing() {
        // The last tab closed: naming nothing is not a write the server can
        // take — the next select carries the tab.
        let base = V2ViewSnapshot(mode: .full, tabId: "a", page: 1, scroll: nil)
        XCTAssertNil(
            V2ViewSnapshot(mode: .full, tabId: nil, page: nil, scroll: nil).diff(since: base))
    }

    // MARK: - session decode (lenient)

    func testSessionDecodesTheBackendShape() throws {
        let json = """
        {"threadId":"t","view":"preview","activeTabId":"tab-2","tabs":[],
        "mode":"hidden","scroll":12.5,
        "activeTab":{"tabId":"tab-2","title":"Launch site","kind":"site","page":null,"scroll":12.5}}
        """.data(using: .utf8)!
        let session = try JSONDecoder().decode(V2VisualSession.self, from: json)
        XCTAssertEqual(session.mode, "hidden")
        XCTAssertEqual(session.eyeMode, .hidden)
        XCTAssertEqual(session.activeTabId, "tab-2")
        XCTAssertEqual(session.activeTab?.title, "Launch site")
        XCTAssertEqual(session.scroll, 12.5)
    }

    func testSessionDefaultsWhenKeysAreMissing() throws {
        let session = try JSONDecoder().decode(V2VisualSession.self, from: "{}".data(using: .utf8)!)
        XCTAssertEqual(session.mode, "full", "pre-view-state sessions read as today's drawer")
        XCTAssertEqual(session.eyeMode, .full)
        XCTAssertNil(session.activeTabId)
    }

    func testUnknownModeNeverMinimizes() {
        XCTAssertEqual(V2VisualSession(mode: "picture-in-picture").eyeMode, .full,
                       "an unrecognised string must never minimise the window")
    }

    // MARK: - publish: the four changes

    func testAttachPublishesTheBaselineOnce() async throws {
        let (sync, api, _, window, tid) = try await synced(tabs: [tab(id: "tab-1"), tab(id: "tab-2")])
        defer { sync.detach() }
        XCTAssertEqual(window.selectedTabID, "tab-1")
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 1, "attaching publishes what the person opened on")
        XCTAssertEqual(api.viewStateWrites[0].threadID, tid)
        XCTAssertEqual(api.viewStateWrites[0].diff.mode, .hidden, "a fresh thread starts hidden")
        XCTAssertEqual(api.viewStateWrites[0].diff.tabId, "tab-1")
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 1, "no change means no second write")
    }

    func testEyeTapPublishesModeOnly() async throws {
        let (sync, api, eye, _, _) = try await synced(tabs: [tab(id: "tab-1")])
        defer { sync.detach() }
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 1)
        eye.cycle() // hidden → facetime
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 2)
        XCTAssertEqual(api.viewStateWrites[1].diff,
                       V2ViewStateDiff(mode: .facetime, tabId: nil, page: nil, scroll: nil))
    }

    func testTabSelectPublishesTabIdOnly() async throws {
        let (sync, api, _, window, _) = try await synced(tabs: [tab(id: "tab-1"), tab(id: "tab-2")])
        defer { sync.detach() }
        await sync.flush()
        window.select(id: "tab-2")
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 2)
        XCTAssertEqual(api.viewStateWrites[1].diff,
                       V2ViewStateDiff(mode: nil, tabId: "tab-2", page: nil, scroll: nil))
    }

    func testPageTurnPublishesPageOnly() async throws {
        let (sync, api, _, window, _) = try await synced(tabs: [tab(id: "tab-1")])
        defer { sync.detach() }
        await sync.flush()
        window.updateState(tabID: "tab-1", key: "page", value: "4")
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 2)
        XCTAssertEqual(api.viewStateWrites[1].diff,
                       V2ViewStateDiff(mode: nil, tabId: nil, page: 4, scroll: nil))
    }

    func testScrollPublishesScrollOnly() async throws {
        let (sync, api, _, window, _) = try await synced(tabs: [tab(id: "tab-1", kind: .web)])
        defer { sync.detach() }
        await sync.flush()
        window.noteScroll(tabID: "tab-1", scroll: 320)
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 2)
        XCTAssertEqual(api.viewStateWrites[1].diff,
                       V2ViewStateDiff(mode: nil, tabId: nil, page: nil, scroll: 320))
    }

    func testRapidNotesCoalesceIntoOneWrite() async throws {
        let (sync, api, _, window, _) = try await synced(tabs: [tab(id: "tab-1")])
        defer { sync.detach() }
        await sync.flush()
        // A burst inside one window: a scroll, another scroll, a page turn.
        window.noteScroll(tabID: "tab-1", scroll: 100)
        window.noteScroll(tabID: "tab-1", scroll: 200)
        window.updateState(tabID: "tab-1", key: "page", value: "2")
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 2, "the burst coalesces")
        XCTAssertEqual(api.viewStateWrites[1].diff.page, 2)
        XCTAssertEqual(api.viewStateWrites[1].diff.scroll, 200, "the latest value wins")
    }

    func testFailedWriteRetriesOnTheNextChange() async throws {
        let (sync, api, eye, _, _) = try await synced(tabs: [tab(id: "tab-1")])
        defer { sync.detach() }
        api.setViewStateHandler = { _, _ in throw URLError(.notConnectedToInternet) }
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 1, "the attempt went out")
        api.setViewStateHandler = { _, _ in }
        eye.cycle()
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, 2, "the next change re-sends (baseline kept)")
        // The retry carries the newest snapshot: the failed baseline's tab
        // rides again alongside the new mode.
        XCTAssertEqual(api.viewStateWrites[1].diff.mode, .facetime)
        XCTAssertEqual(api.viewStateWrites[1].diff.tabId, "tab-1")
    }

    // MARK: - consume: the agent's window events

    /// Move `t` forward past the conflict window: the person's actions are
    /// settled, so the remote wins.
    private func settle(_ sync: V2ViewStateSync, from t: Date, by seconds: TimeInterval = 5) {
        sync.now = { t.addingTimeInterval(seconds) }
    }

    func testAgentHiddenMinimizesWithNoTap() async throws {
        let (sync, api, eye, _, _) = try await synced(tabs: [tab(id: "tab-1")])
        defer { sync.detach() }
        await sync.flush()
        eye.set(.full)
        await sync.flush()
        XCTAssertEqual(eye.mode, .full)
        let t = Date()
        settle(sync, from: t)
        sync.applyRemote(V2VisualSession(mode: "hidden"))
        XCTAssertEqual(eye.mode, .hidden, "the move-on minimize needs no tap")
        let writes = api.viewStateWrites.count
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, writes, "adopting never echoes a write back")
    }

    func testAgentActiveTabRaisesAndFocuses() async throws {
        let (sync, _, eye, window, _) = try await synced(
            tabs: [tab(id: "tab-1", title: "Brief"), tab(id: "tab-2", kind: .web, title: "Launch site")])
        defer { sync.detach() }
        await sync.flush()
        XCTAssertEqual(eye.mode, .hidden)
        XCTAssertEqual(window.selectedTabID, "tab-1")
        let t = Date()
        settle(sync, from: t)
        // The agent's open names the tab; the mode is still hidden (an open
        // is not a mode write) — the window returns as FaceTime.
        sync.applyRemote(V2VisualSession(mode: "hidden", activeTabId: "tab-2"))
        XCTAssertEqual(window.selectedTabID, "tab-2", "the agent's tab takes focus")
        XCTAssertEqual(eye.mode, .facetime, "a hidden window returns as FaceTime (R43's rule)")
    }

    func testAgentActiveTabKeepsAPersistedMode() async throws {
        let (sync, _, eye, window, _) = try await synced(
            tabs: [tab(id: "tab-1", title: "Brief"), tab(id: "tab-2", title: "Site")])
        defer { sync.detach() }
        await sync.flush()
        eye.set(.full)
        await sync.flush()
        let t = Date()
        settle(sync, from: t)
        sync.applyRemote(V2VisualSession(mode: "full", activeTabId: "tab-2"))
        XCTAssertEqual(window.selectedTabID, "tab-2")
        XCTAssertEqual(eye.mode, .full, "full stays full — the overlay raises the sheet")
    }

    func testUnknownRemoteTabIsIgnored() async throws {
        let (sync, _, eye, window, _) = try await synced(tabs: [tab(id: "tab-1")])
        defer { sync.detach() }
        await sync.flush()
        let t = Date()
        settle(sync, from: t)
        sync.applyRemote(V2VisualSession(mode: "full", activeTabId: "tab-gone"))
        XCTAssertEqual(window.selectedTabID, "tab-1", "a tab we do not hold is never selected")
        XCTAssertEqual(eye.mode, .full, "the mode write still applies — it names no tab")
    }

    func testLocalActionInsideTheWindowWins() async throws {
        let (sync, api, eye, window, _) = try await synced(
            tabs: [tab(id: "tab-1", title: "Brief"), tab(id: "tab-2", title: "Site")])
        defer { sync.detach() }
        await sync.flush()
        let writes = api.viewStateWrites.count
        // The person taps to full; 100 ms later the agent's stale hidden
        // lands mid-flight.
        eye.set(.full)
        sync.now = { Date().addingTimeInterval(0.1) }
        sync.applyRemote(V2VisualSession(mode: "hidden", activeTabId: "tab-1"))
        XCTAssertEqual(eye.mode, .full, "the person's tap stands — no flicker")
        XCTAssertEqual(window.selectedTabID, "tab-1")
        await sync.flush()
        XCTAssertEqual(api.viewStateWrites.count, writes + 1, "the local snapshot is re-asserted")
        XCTAssertEqual(api.viewStateWrites.last?.diff.mode, .full, "last-writer-wins: the person")
    }

    func testTickReseenSelectionDoesNotBlockConsume() async throws {
        // The mirror tick re-sets the selection to its current value on
        // every poll — a plain @Published fires on every set. That re-set
        // must NOT count as the person acting, or the consume path would
        // never adopt (measured red end-to-end: both agent UI tests).
        let (sync, _, eye, window, _) = try await synced(tabs: [tab(id: "tab-1")])
        defer { sync.detach() }
        await sync.flush()
        eye.set(.full)
        await sync.flush()
        window.select(id: "tab-1") // same value, like the tick's re-set
        let t = Date()
        settle(sync, from: t)
        sync.applyRemote(V2VisualSession(mode: "hidden"))
        XCTAssertEqual(eye.mode, .hidden, "a re-seen selection is not a local action")
    }

    // MARK: - store forwarding (the renderer funnels)

    func testPageWriteForwardsToThePublishPath() async throws {
        let api = CornerV2APIFake()
        api.visualTabsHandler = { _ in [self.tab(id: "tab-1")] }
        api.artifactsHandler = { _ in [] }
        let window = VisualWindowStore(api: api, visualSessionID: "session-r56-\(UUID().uuidString)")
        try await window.load()
        var seen: [(String, Int?, Double?)] = []
        window.onPosition = { seen.append(($0, $1, $2)) }
        window.updateState(tabID: "tab-1", key: "page", value: "5")
        XCTAssertEqual(seen.count, 1)
        XCTAssertEqual(seen[0].0, "tab-1")
        XCTAssertEqual(seen[0].1, 5)
        window.updateState(tabID: "tab-1", key: "siteViewport", value: "desktop")
        XCTAssertEqual(seen.count, 1, "non-position keys stay local-only")
    }

    func testScrollNoteForwardsToThePublishPath() async throws {
        let api = CornerV2APIFake()
        api.visualTabsHandler = { _ in [self.tab(id: "tab-1")] }
        api.artifactsHandler = { _ in [] }
        let window = VisualWindowStore(api: api, visualSessionID: "session-r56-\(UUID().uuidString)")
        try await window.load()
        var seen: [(String, Int?, Double?)] = []
        window.onPosition = { seen.append(($0, $1, $2)) }
        window.noteScroll(tabID: "tab-1", scroll: 88.5)
        XCTAssertEqual(seen.count, 1)
        XCTAssertEqual(seen[0].0, "tab-1")
        XCTAssertEqual(seen[0].2, 88.5)
    }

    // MARK: - geometry: the website-as-video band

    func testSiteBandIsSixteenByNineFullBleed() {
        let height = V2SiteBandMetrics.bandHeight(forWidth: 390, screenHeight: 844)
        XCTAssertEqual(height, 219, accuracy: 0.5)
        XCTAssertEqual(390 / height, 16 / 9, accuracy: 0.02, "the band is a horizontal video")
        // The sheet's content column is 374 wide on the 390 phone
        // (measured) — the ratio holds at the real width too.
        let sheetHeight = V2SiteBandMetrics.bandHeight(forWidth: 374, screenHeight: 844)
        XCTAssertEqual(sheetHeight, 210, accuracy: 0.5)
        XCTAssertEqual(374 / sheetHeight, 16 / 9, accuracy: 0.02)
    }

    func testSiteBandStaysAboutAThird() {
        // 219 of 844 ≈ 26%: the ratio binds in portrait, the third caps.
        let height = V2SiteBandMetrics.bandHeight(forWidth: 390, screenHeight: 844)
        XCTAssertLessThanOrEqual(height, 844 / 3, "never taller than a third of the screen")
        XCTAssertGreaterThan(height, 844 / 4, "still a band, not a strip")
        XCTAssertEqual(
            V2SiteBandMetrics.bandHeight(forWidth: 402, screenHeight: 874), 226, accuracy: 1)
    }

    func testSiteBandCapsInLandscape() {
        // 844 wide in landscape: uncapped 16:9 would be 475 tall on a 390
        // screen — the third binds instead.
        XCTAssertEqual(
            V2SiteBandMetrics.bandHeight(forWidth: 844, screenHeight: 390), 130, accuracy: 0.5)
    }
}
