// R42NativeCV6UITests.swift — Corner native iOS
// corner:corner-v2 R42 — the phone wears the CV6 design, not iOS defaults.
//
// Fixture mode throughout (deterministic, no backend). One test per brief
// item: the command card (P090), the composer pill + glow (P091/P093), the
// thread rows + bubbles (P092), the living loader (P089). Each test leaves
// its thread exactly as it found it (mode Work, model Auto).

import XCTest

final class R42NativeCV6UITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - launchers

    private static let base = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]
    private static let comp = base + ["-v2SeedCompMatch"]

    @discardableResult
    private func launch(_ args: [String]) -> XCUIApplication {
        app = XCUIApplication()
        app.launchArguments += args
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        return app
    }

    private func openThread(_ scope: XCUIApplication, timeout: TimeInterval = 20) {
        let marker = scope.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
        XCTAssertTrue(marker.waitForExistence(timeout: timeout), "the entry thread never appeared")
    }

    private func chip(_ scope: XCUIApplication) -> XCUIElement {
        scope.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
    }

    private func openCard(_ scope: XCUIApplication) {
        let c = chip(scope)
        XCTAssertTrue(c.waitForExistence(timeout: 15), "no commands chip in the pill")
        c.tap()
        XCTAssertTrue(scope.buttons["Work"].waitForExistence(timeout: 8), "the command card never opened")
    }

    private func evidence(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attach = XCTAttachment(screenshot: shot)
        attach.name = "R42-\(name)"
        attach.lifetime = .keepAlways
        add(attach)
        // File twin for the round report (the R32 evidence() convention):
        // xcresult attachments are pruned, files survive.
        let dir = ProcessInfo.processInfo.environment["R14_EVIDENCE_DIR"] ?? "/tmp/r42-evidence"
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/R42-native-\(name).png"))
    }

    // MARK: - P090 the command card

    /// The chip raises the CV6 card: Work/Plan check rows with the web's
    /// caption, Model with its sub-line, Files, Generate, Talk — 44pt rows.
    func testCommandsCardRows() throws {
        let app = launch(Self.base)
        openThread(app)
        openCard(app)
        for label in ["Work", "Plan", "Files in this conversation", "Generate an image",
                      "Talk aloud", "Read checklist aloud"] {
            XCTAssertTrue(app.buttons[label].firstMatch.exists, "card has no \(label)")
        }
        XCTAssertTrue(
            app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Model'")).firstMatch.exists,
            "card has no Model row"
        )
        XCTAssertTrue(
            app.staticTexts["Auto (Claude → Codex)"].firstMatch.exists,
            "card has no model sub-line"
        )
        XCTAssertTrue(
            app.staticTexts["Corner gets to work directly"].firstMatch.exists,
            "card has no mode caption"
        )
        XCTAssertEqualWithAccuracy(
            app.buttons["Work"].firstMatch.frame.height, 44, accuracy: 2,
            "card row is not 44pt"
        )
        evidence("commands-card")
        // Leave no trace: outside tap dismisses.
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.3)).tap()
        XCTAssertFalse(
            app.buttons["Work"].waitForExistence(timeout: 3), "outside tap did not dismiss the card"
        )
    }

    /// Plan applies through the card (the caption flips to the plan copy);
    /// the test restores Work before leaving.
    func testCommandsCardPlanApplies() throws {
        let app = launch(Self.base)
        openThread(app)
        openCard(app)
        app.buttons["Plan"].firstMatch.tap()
        openCard(app)
        XCTAssertTrue(
            app.staticTexts["Corner will propose a plan first"].waitForExistence(timeout: 8),
            "Plan did not apply through the card"
        )
        app.buttons["Work"].firstMatch.tap()
        openCard(app)
        XCTAssertTrue(
            app.staticTexts["Corner gets to work directly"].waitForExistence(timeout: 8),
            "Work did not restore"
        )
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.3)).tap()
    }

    /// The Model row opens its picker inside the card; picking applies and
    /// the card closes. Auto is restored before leaving.
    func testCommandsCardModelPicker() throws {
        let app = launch(Self.base)
        openThread(app)
        openCard(app)
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Model'")).firstMatch.tap()
        XCTAssertTrue(
            app.buttons["Claude Haiku"].waitForExistence(timeout: 8),
            "the model picker never opened in the card"
        )
        XCTAssertTrue(
            app.buttons["Back to commands"].firstMatch.exists, "the picker has no way back"
        )
        app.buttons["Claude Haiku"].firstMatch.tap()
        XCTAssertFalse(
            app.buttons["Work"].waitForExistence(timeout: 3), "picking a model did not close the card"
        )
        // Restore Auto so later suites inherit the default thread.
        openCard(app)
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Model'")).firstMatch.tap()
        app.buttons["Auto (Claude → Codex)"].firstMatch.tap()
        XCTAssertFalse(
            app.buttons["Work"].waitForExistence(timeout: 3), "restoring Auto did not close the card"
        )
    }

    // MARK: - P092 rows and bubbles

    /// 16pt gutters, name + time on one line, the user bubble capped at
    /// 74 % and right-aligned with its stamp under it.
    func testThreadRowsMatchDesign() throws {
        let app = launch(Self.comp)
        openThread(app)
        let name = app.staticTexts.matching(identifier: "v2-agent-label").firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 15), "no agent line")
        XCTAssertEqualWithAccuracy(name.frame.minX, 16, accuracy: 1.5, "the thread gutter is not 16pt")
        let stamps = app.staticTexts.matching(identifier: "v2-event-time")
        XCTAssertTrue(stamps.firstMatch.waitForExistence(timeout: 10), "no timestamps")
        let agentStamp = stamps.element(boundBy: 1)
        XCTAssertLessThanOrEqual(
            abs(name.frame.minY - agentStamp.frame.minY), 3,
            "name and time are not on one line"
        )
        let bubble = app.staticTexts[
            "Build the Aster spring launch deck. Eight slides, their brand kit, first pass tonight."
        ].firstMatch
        XCTAssertTrue(bubble.waitForExistence(timeout: 10), "no seeded user bubble")
        XCTAssertLessThanOrEqual(bubble.frame.width, 290, "the user bubble exceeds 74 % of the thread")
        XCTAssertEqualWithAccuracy(bubble.frame.maxX, 390 - 16, accuracy: 4,
                                   "the user bubble is not right-aligned to the gutter")
        let userStamp = stamps.element(boundBy: 0)
        XCTAssertEqualWithAccuracy(userStamp.frame.maxX, bubble.frame.maxX, accuracy: 6,
                                   "the user stamp is not right-aligned under the bubble")
        evidence("thread-rows")
    }

    // MARK: - P091/P093 composer pill + glow

    /// The glow rides behind the pill — present, while the send stays the
    /// 50pt accent round and the pill/send gap stays flat ground.
    func testComposerGlowBehindPill() throws {
        let app = launch(Self.base)
        openThread(app)
        let glow = app.descendants(matching: .any).matching(identifier: "v2-composer-glow").firstMatch
        XCTAssertTrue(glow.waitForExistence(timeout: 10), "no composer glow behind the pill")
        evidence("composer-glow")
    }

    // MARK: - P089 the living loader

    /// The stalled entry shows the Corner mark — never the old spinner copy —
    /// and the thread still lands afterwards (no fake wait, no wedge).
    func testLoaderMarkReplacesSpinner() throws {
        let app = launch(Self.base + ["-v2SeedLoader"])
        let mark = app.descendants(matching: .any).matching(identifier: "v2-loading-mark").firstMatch
        XCTAssertTrue(mark.waitForExistence(timeout: 15), "no Corner loading mark")
        XCTAssertEqual(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'Opening'")).count, 0,
            "the old Opening spinner copy is still on screen"
        )
        evidence("loader-mark")
        openThread(app, timeout: 25)
    }
}
