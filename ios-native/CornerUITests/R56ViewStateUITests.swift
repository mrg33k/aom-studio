// R56ViewStateUITests.swift — Corner native iOS
// corner:corner-v2 R56 (P094/P095/C016) — publish, the agent's window
// events, and the website-as-video band, through the visible interface.
//
// Fixture mode throughout (deterministic, no backend). The agent's events
// ride the `-v2AgentSession=<mode>` + `-v2AgentTab=<artifactID>` rig: the
// fixture answers `getSession` with the agent's window event, and the
// phone's consume path runs for real — no taps stand in for the agent.
// Publish proof itself runs at the unit level (the test process cannot see
// the app process's wire); here the UI proves the states publish drives:
// the band geometry, the agent raise + focus, the agent minimize, and
// Patrik's zoom-out regression guard (the composer command menu + Plan
// button must fail loudly if they ever vanish again).

import XCTest

final class R56ViewStateUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - launchers

    private static let base = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]
    private static let visual = base + ["-v2SeedVisual", "-v2ResetVisual"]

    @discardableResult
    private func launch(_ args: [String]) -> XCUIApplication {
        app = XCUIApplication()
        app.launchArguments += args
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        return app
    }

    private func openEntryThread(_ scope: XCUIApplication) {
        // The seeded visual event keeps General non-empty: entry is the
        // thread, never home.
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
            .waitForExistence(timeout: 30), "the entry thread never appeared")
    }

    private func openCard(_ scope: XCUIApplication, artifactID: String) {
        let card = scope.buttons.matching(identifier: "visual-open-\(artifactID)").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 30), "no file card for \(artifactID) in the thread")
        card.tap()
    }

    private func sheet(_ scope: XCUIApplication) -> XCUIElement {
        scope.otherElements.matching(identifier: "visual-sheet").firstMatch
    }

    private func expectSheet(_ scope: XCUIApplication, timeout: TimeInterval = 15) {
        XCTAssertTrue(sheet(scope).waitForExistence(timeout: timeout), "the sheet never raised")
    }

    private func dismissSheet(_ scope: XCUIApplication) {
        let close = scope.buttons.matching(identifier: "visual-sheet-close").firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 10), "no sheet close")
        close.tap()
        XCTAssertTrue(sheet(scope).waitForNonExistence(timeout: 10), "the sheet never closed")
    }

    private func eye(_ scope: XCUIApplication) -> XCUIElement {
        scope.buttons.matching(identifier: "v2-eye").firstMatch
    }

    /// Report evidence: a screenshot attachment plus a PNG under
    /// /tmp/r56-evidence for the round report.
    private func evidence(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attach = XCTAttachment(screenshot: shot)
        attach.name = name
        attach.lifetime = .keepAlways
        add(attach)
        let dir = "/tmp/r56-evidence"
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/R56-native-\(name)-sim-390.png"))
    }

    // MARK: - P094/P095 the website-as-video band

    /// The site tab in full mode: the desktop page as a full-bleed
    /// horizontal 16:9 band — about a third of the screen tall, the page
    /// scrolling inside it. Never a full-screen browser, never the old
    /// portrait-web stage.
    func testSiteBandGeometryInFullMode() throws {
        let app = launch(Self.visual)
        openEntryThread(app)
        openCard(app, artifactID: "artifact-site-1")
        expectSheet(app)
        let stage = app.descendants(matching: .any).matching(identifier: "visual-stage-web").firstMatch
        XCTAssertTrue(stage.waitForExistence(timeout: 15), "the site tab shows no website stage")
        let frame = stage.frame
        // 374 is the sheet's content width on the 390 phone (measured —
        // the band spans it edge to edge, like every sibling row).
        XCTAssertEqual(frame.width, 374, accuracy: 3, "the band spans the sheet content")
        XCTAssertEqual(frame.width / frame.height, 16 / 9, accuracy: 0.03, "the band is a horizontal video")
        XCTAssertLessThanOrEqual(frame.height, 844 / 3 + 2, "about a third of the screen, never more")
        XCTAssertFalse(
            app.descendants(matching: .any).matching(identifier: "v2-facetime").firstMatch.exists,
            "full mode shows no portrait box")
        evidence("website-band-full")
    }

    /// The site tab in FaceTime mode: the same band docked under the nav —
    /// the portrait box is for document tabs only.
    func testSiteBandDocksInFaceTimeMode() throws {
        let app = launch(Self.visual)
        openEntryThread(app)
        openCard(app, artifactID: "artifact-site-1")
        expectSheet(app)
        dismissSheet(app)
        eye(app).tap() // hidden → FaceTime, site still selected
        let band = app.descendants(matching: .any).matching(identifier: "v2-facetime-site").firstMatch
        XCTAssertTrue(band.waitForExistence(timeout: 10), "FaceTime raised no site band")
        XCTAssertFalse(sheet(app).exists, "FaceTime mode raised the sheet")
        XCTAssertFalse(
            app.descendants(matching: .any).matching(identifier: "v2-facetime").firstMatch.exists,
            "the site tab must not use the portrait box")
        let stage = app.descendants(matching: .any).matching(identifier: "visual-stage-web").firstMatch
        XCTAssertTrue(stage.exists, "the docked band carries no website stage")
        XCTAssertEqual(stage.frame.width / stage.frame.height, 16 / 9, accuracy: 0.05)
        evidence("website-band-facetime")
    }

    // MARK: - P095 the agent's window events (rigged session, real path)

    /// The agent turns to the site while the person reads the pdf: the site
    /// tab takes focus in the persisted full mode — with the person tapping
    /// nothing after going back to the pdf.
    func testAgentActiveTabRaisesAndFocuses() throws {
        let app = launch(Self.visual + ["-v2AgentSession=full", "-v2AgentTab=artifact-site-1"])
        openEntryThread(app)
        // Both tabs exist (the person opened them); the person is back on
        // the pdf when the agent's active tab lands.
        openCard(app, artifactID: "artifact-pdf-1")
        expectSheet(app)
        dismissSheet(app)
        openCard(app, artifactID: "artifact-site-1")
        expectSheet(app)
        let pdfChip = app.buttons.matching(identifier: "visual-tab")
            .matching(NSPredicate(format: "label CONTAINS 'Aster brief'")).firstMatch
        XCTAssertTrue(pdfChip.waitForExistence(timeout: 10), "no pdf tab chip to go back to")
        pdfChip.tap()
        XCTAssertTrue(
            app.descendants(matching: .any).matching(identifier: "visual-stage-pdf").firstMatch
                .waitForExistence(timeout: 15), "going back to the pdf never painted it")
        // The agent's active tab arrives on the session mirror (≤ 5 s
        // tick): the sheet switches to the site band by itself.
        let stage = app.descendants(matching: .any).matching(identifier: "visual-stage-web").firstMatch
        XCTAssertTrue(stage.waitForExistence(timeout: 25),
                      "the agent's tab never took focus — no raise, no band")
        XCTAssertTrue(sheet(app).exists, "the raise dropped the sheet (mode is full)")
        evidence("agent-raise")
    }

    /// The agent moves on (`mode=hidden`) while the person reads the pdf:
    /// the window minimizes with nobody tapping the eye or the close.
    func testAgentHiddenMinimizesWithNoTap() throws {
        let app = launch(Self.visual + ["-v2AgentSession=hidden"])
        openEntryThread(app)
        openCard(app, artifactID: "artifact-pdf-1")
        expectSheet(app)
        // Nobody taps anything from here: the move-on minimize arrives on
        // the session mirror (≤ 5 s tick, plus one grace tick for the
        // last-writer-wins window when the tap lands just before a poll).
        XCTAssertTrue(sheet(app).waitForNonExistence(timeout: 25),
                      "the sheet never minimized — the agent's hidden did not land")
        let eyeLabel = eye(app).label
        XCTAssertTrue(eye(app).exists, "the eye icon must stay (it pulls the window back up)")
        XCTAssertEqual(eyeLabel, "Visual window: hidden")
        evidence("agent-minimize")
    }

    // MARK: - the zoom-out regression guard (Patrik, 2026-09-08)

    /// Standing guard: the composer command menu (sparkles chip) and the
    /// Plan button must fail loudly if they ever vanish again — the front
    /// end has silently lost them twice. This test names them explicitly so
    /// a round that drops them goes red here, not on Patrik's phone.
    func testComposerCommandMenuAndPlanSurvive() throws {
        let app = launch(Self.visual)
        openEntryThread(app)
        let chip = app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "REGRESSION: no commands chip in the v2 pill")
        XCTAssertEqual(chip.frame.height, 32, accuracy: 1.5, "REGRESSION: the chip lost its 32pt shape")
        chip.tap()
        XCTAssertTrue(
            app.buttons["Plan"].firstMatch.waitForExistence(timeout: 8),
            "REGRESSION: the command card lost the Plan button")
        XCTAssertTrue(
            app.buttons["Work"].firstMatch.exists,
            "REGRESSION: the command card lost the Work button")
        // The eye is the other half of this round's surface: still there.
        XCTAssertTrue(eye(app).exists, "REGRESSION: no eye icon top-right on the chat")
        chip.tap() // dismiss the card
    }
}

private extension XCUIElement {
    func waitForNonExistence(timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !exists { return true }
            Thread.sleep(forTimeInterval: 0.5)
        }
        return !exists
    }
}
