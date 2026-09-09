// R43NativeHomeFirstAndEyeTests.swift — Corner native iOS
// corner:corner-v2 R43 — home-first entry, distinct cards, the eye cycle.
//
// Pins: P096 (three DISTINCT projects — same-destination subjects collapse
// to their freshest, onboarding pads the rest), P097 (the entry rule lives
// in RouteTests; here: the long-background return predicate), P094/P095
// (the eye cycle order + per-thread persistence, the agent-arrival detector
// baselining, the FaceTime box clamp, the website-as-video stage height).

import XCTest
@testable import Corner

@MainActor
final class R43NativeHomeFirstAndEyeTests: XCTestCase {
    private var eyeKeys: [String] = []

    override func tearDown() {
        for key in eyeKeys { UserDefaults.standard.removeObject(forKey: key) }
        eyeKeys.removeAll()
        super.tearDown()
    }

    private func eyeKey(_ threadID: String) -> String {
        let key = V2EyeModeStore.key(threadID: threadID)
        eyeKeys.append(key)
        return key
    }

    // MARK: - helpers (ledger/nav)

    private func item(
        _ id: String, what: String, subjects: [String], atSeconds: TimeInterval
    ) -> WorldLedgerItem {
        WorldLedgerItem(id: id, what: what, subjects: subjects, atMs: atSeconds * 1000)
    }

    private func projectNode(_ title: String, id: String? = nil) -> V2NavNode {
        let slug = V2NavNode(
            id: "x", threadId: "x", kind: "project", title: title, projectId: "x"
        ).slugifiedTitle
        let pid = id ?? "proj-\(slug)"
        return V2NavNode(
            id: pid, threadId: "thread-\(slug)", kind: "project",
            title: title, projectId: pid
        )
    }

    private func missionNode(_ title: String, parent: V2NavNode) -> V2NavNode {
        let slug = V2NavNode(
            id: "x", threadId: "x", kind: "project", title: title, projectId: "x"
        ).slugifiedTitle
        return V2NavNode(
            id: "mission-\(slug)", threadId: "thread-\(slug)", kind: "mission",
            title: title, projectId: parent.id, parentProjectId: parent.id
        )
    }

    // MARK: - P096 distinct cards

    /// The live R41 failure: three subjects, one project (Aster ×3). Now
    /// one Aster card (the freshest sentence) + two onboarding fills.
    func testSameProjectSubjectsCollapseToOneCard() {
        let aster = projectNode("Aster")
        let deck = missionNode("Spring launch deck", parent: aster)
        let plan = missionNode("Release plan", parent: aster)
        let items = [
            item("a1", what: "Old Aster note.", subjects: ["aster"], atSeconds: 100),
            item("d1", what: "Reviewed the deck.", subjects: ["spring-launch-deck"], atSeconds: 300),
            item("p1", what: "Cut the release plan.", subjects: ["release-plan"], atSeconds: 200),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: [aster, deck, plan])
        XCTAssertEqual(cards.count, 3)
        let ledger = cards.filter { !$0.isOnboarding }
        XCTAssertEqual(ledger.count, 1, "three same-project subjects must take one card")
        XCTAssertEqual(ledger[0].projectTitle, "Aster")
        XCTAssertEqual(ledger[0].subline, "Reviewed the deck.", "the freshest subject wins the card")
        XCTAssertEqual(Set(cards.map(\.projectTitle)).count, 3, "never the same project twice")
    }

    /// A mission and its parent project in the same window: one card, not two.
    func testMissionAndParentProjectShareOneCard() {
        let aster = projectNode("Aster")
        let deck = missionNode("Spring launch deck", parent: aster)
        let northwind = projectNode("Northwind")
        let items = [
            item("d1", what: "Reviewed the deck.", subjects: ["spring-launch-deck"], atSeconds: 300),
            item("a1", what: "Shipped the hero.", subjects: ["aster"], atSeconds: 200),
            item("n1", what: "Scoped Northwind.", subjects: ["northwind"], atSeconds: 100),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: [aster, deck, northwind])
        let ledger = cards.filter { !$0.isOnboarding }
        XCTAssertEqual(ledger.map(\.projectTitle), ["Aster", "Northwind"])
        XCTAssertEqual(ledger[0].subline, "Reviewed the deck.")
    }

    /// Distinct projects still take distinct cards, freshest first.
    func testDistinctProjectsKeepDistinctCards() {
        let aster = projectNode("Aster")
        let northwind = projectNode("Northwind")
        let general = projectNode("General")
        let items = [
            item("a1", what: "Aster note.", subjects: ["aster"], atSeconds: 100),
            item("n1", what: "Scoped Northwind.", subjects: ["northwind"], atSeconds: 200),
            item("g1", what: "Tidied General.", subjects: ["general"], atSeconds: 150),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: [general, aster, northwind])
        XCTAssertEqual(cards.map(\.subject), ["northwind", "general", "aster"])
        XCTAssertTrue(cards.allSatisfy { !$0.isOnboarding })
    }

    // MARK: - P097 long-background return

    func testNoBackgroundRecordNeverReturnsHome() {
        XCTAssertFalse(AppRouter.shouldReturnHome(
            backgroundedAt: nil, now: Date(), debugForce: false))
    }

    func testShortAbsenceStaysPut() {
        let now = Date()
        XCTAssertFalse(AppRouter.shouldReturnHome(
            backgroundedAt: now.addingTimeInterval(-60), now: now))
    }

    func testLongAbsenceReturnsHome() {
        let now = Date()
        XCTAssertTrue(AppRouter.shouldReturnHome(
            backgroundedAt: now.addingTimeInterval(-301), now: now))
        XCTAssertTrue(AppRouter.shouldReturnHome(
            backgroundedAt: now.addingTimeInterval(-3600), now: now))
    }

    func testNoteBackgroundedStartsTheClock() {
        let router = AppRouter(defaults: UserDefaults(suiteName: "r43-bg-\(UUID().uuidString)")!)
        XCTAssertNil(router.lastBackgroundedAt)
        let then = Date().addingTimeInterval(-600)
        router.noteBackgrounded(at: then)
        XCTAssertTrue(AppRouter.shouldReturnHome(
            backgroundedAt: router.lastBackgroundedAt, now: Date()))
    }

    // MARK: - P094/P095 eye cycle + persistence

    func testFreshThreadStartsHidden() {
        let id = "thread-r43-fresh-\(UUID().uuidString)"
        _ = eyeKey(id)
        XCTAssertEqual(V2EyeModeStore(threadID: id).mode, .hidden)
    }

    func testEyeCyclesHiddenFacetimeFullHidden() {
        let id = "thread-r43-cycle-\(UUID().uuidString)"
        _ = eyeKey(id)
        let eye = V2EyeModeStore(threadID: id)
        XCTAssertEqual(eye.mode, .hidden)
        eye.cycle()
        XCTAssertEqual(eye.mode, .facetime, "tap 1 → FaceTime mode")
        eye.cycle()
        XCTAssertEqual(eye.mode, .full, "tap 2 → the full drawer context window")
        eye.cycle()
        XCTAssertEqual(eye.mode, .hidden, "tap 3 → hidden (the icon stays)")
    }

    func testEyeIconNamesTheMode() {
        XCTAssertEqual(V2EyeMode.hidden.next, .facetime)
        XCTAssertEqual(V2EyeMode.facetime.next, .full)
        XCTAssertEqual(V2EyeMode.full.next, .hidden)
        let id = "thread-r43-icon-\(UUID().uuidString)"
        _ = eyeKey(id)
        let eye = V2EyeModeStore(threadID: id)
        XCTAssertEqual(eye.iconName, "eye.slash")
        eye.set(.facetime)
        XCTAssertEqual(eye.iconName, "eye")
        XCTAssertEqual(eye.accessibilityLabel, "Visual window: FaceTime")
        eye.set(.full)
        XCTAssertEqual(eye.iconName, "eye.fill")
    }

    func testEyeModePersistsPerThread() {
        let id = "thread-r43-persist-\(UUID().uuidString)"
        _ = eyeKey(id)
        let other = "thread-r43-other-\(UUID().uuidString)"
        _ = eyeKey(other)
        V2EyeModeStore(threadID: id).set(.facetime)
        XCTAssertEqual(V2EyeModeStore(threadID: id).mode, .facetime, "a revisit keeps the mode")
        XCTAssertEqual(V2EyeModeStore(threadID: other).mode, .hidden, "another thread is unaffected")
    }

    func testEyeIgnoresUnknownStoredValues() {
        let id = "thread-r43-unknown-\(UUID().uuidString)"
        let key = eyeKey(id)
        UserDefaults.standard.set("picture-in-picture", forKey: key)
        XCTAssertEqual(V2EyeModeStore(threadID: id).mode, .hidden)
    }

    // MARK: - P095 agent arrivals

    private func tab(id: String, kind: VisualTabKind = .pdf, title: String = "T") -> VisualWindowTab {
        VisualWindowTab(
            id: id, visualSessionID: "session-r43", threadID: "thread-r43",
            kind: kind, artifactID: nil, title: title,
            openedBy: .agent, agentLabel: "Corner", state: [:], createdAt: Date()
        )
    }

    private func arrivalStore(
        rows: @escaping () -> [VisualWindowTab]
    ) -> (VisualWindowStore, CornerV2APIFake) {
        let api = CornerV2APIFake()
        api.visualTabsHandler = { _ in rows() }
        api.artifactsHandler = { _ in [] }
        let store = VisualWindowStore(api: api, visualSessionID: "session-r43-\(UUID().uuidString)")
        return (store, api)
    }

    /// The first mirror is history: starting on a thread with open tabs
    /// fires nothing.
    func testStartBaselinesSilently() async {
        var current = [tab(id: "tab-1")]
        let (store, _) = arrivalStore(rows: { current })
        var fired = 0
        store.onExternalTabs = { fired += 1 }
        await store.start(threadID: "thread-r43")
        XCTAssertEqual(fired, 0, "history is not an arrival")
        store.stop()
    }

    /// A tab the agent opens after the baseline fires exactly once.
    func testAgentOpenedTabFires() async throws {
        var current = [tab(id: "tab-1")]
        let (store, _) = arrivalStore(rows: { current })
        var fired = 0
        store.onExternalTabs = { fired += 1 }
        await store.start(threadID: "thread-r43")
        current = [tab(id: "tab-1"), tab(id: "tab-2")]
        try await store.load()
        XCTAssertEqual(fired, 1, "the agent's tab is an arrival")
        try await store.load()
        XCTAssertEqual(fired, 1, "a re-mirror of the same tabs fires nothing")
        store.stop()
    }

    /// The person's own opens never count as agent arrivals.
    func testLocallyAdoptedTabNeverFires() async throws {
        var current = [tab(id: "tab-1")]
        let (store, api) = arrivalStore(rows: { current })
        api.openTabHandler = { kind, _, artifactID, title, _ in
            self.tab(id: "tab-mine", kind: kind, title: title)
        }
        var fired = 0
        store.onExternalTabs = { fired += 1 }
        await store.start(threadID: "thread-r43")
        try await store.open(.pdf, threadID: "thread-r43", artifactID: "a1", title: "Mine", state: [:])
        current = [tab(id: "tab-1"), tab(id: "tab-mine")]
        try await store.load()
        XCTAssertEqual(fired, 0, "the person's own open is not an arrival")
        store.stop()
    }

    // MARK: - FaceTime box + web stage geometry

    /// The default seat on the 390 phone: top-right, under the nav.
    func testFaceTimeDefaultSeatIsTopRight() {
        let frame = V2FaceTimeWindow.settledFrame(
            container: CGSize(width: 390, height: 844), offset: .zero, safeAreaTop: 47)
        XCTAssertEqual(frame.width, 110, accuracy: 0.001)
        XCTAssertEqual(frame.height, 160, accuracy: 0.001)
        XCTAssertEqual(frame.minX, 390 - 12 - 110, accuracy: 0.001)
        XCTAssertEqual(frame.minY, 47 + 64, accuracy: 0.001, "below the 52pt nav with room to breathe")
    }

    /// A drag that would leave the screen clamps inside the margins.
    func testFaceTimeDragClampsToTheSafeArea() {
        let container = CGSize(width: 390, height: 844)
        let flung = V2FaceTimeWindow.settledFrame(
            container: container, offset: CGSize(width: 500, height: 900), safeAreaTop: 47)
        XCTAssertEqual(flung.maxX, 390 - 12, accuracy: 0.001)
        XCTAssertEqual(flung.maxY, 844 - 12, accuracy: 0.001)
        let escaped = V2FaceTimeWindow.settledFrame(
            container: container, offset: CGSize(width: -500, height: -900), safeAreaTop: 47)
        XCTAssertEqual(escaped.minX, 12, accuracy: 0.001)
        XCTAssertGreaterThanOrEqual(escaped.minY, 47 + 60)
    }

    /// Website tabs: about a third of the screen tall (844 → 281).
    func testWebStageIsAThirdOfTheScreen() {
        XCTAssertEqual(V2EyeWebMetrics.stageHeight(screenHeight: 844), 281, accuracy: 1)
        XCTAssertEqual(V2EyeWebMetrics.stageHeight(screenHeight: 956), 319, accuracy: 1)
    }
}
