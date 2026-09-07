// R32WiringUITests.swift — Corner native iOS
// corner:corner-v2 R32 — the phone uses the backend it now has.
//
// Fixture mode throughout (deterministic, no backend). Each test launches
// its own app on General's thread (-v2ResetEntry pins it) and drives the
// R32 wiring like a person: the P081 working line + nav dot + quiet
// notice, server clear (+ failure retry), staged uploads opening tabs
// (+ per-file retry), and the pending-image render.

import XCTest

final class R32WiringUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - launchers

    private static let base = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]

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

    private func field(_ scope: XCUIApplication) -> XCUIElement {
        scope.textFields.matching(identifier: "v2-composer-field").firstMatch
    }

    private func waitForText(_ scope: XCUIApplication, _ text: String, timeout: TimeInterval = 15) -> Bool {
        let query = scope.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", text))
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if query.count > 0 { return true }
            Thread.sleep(forTimeInterval: 0.5)
        }
        return query.count > 0
    }

    private func waitForTextGone(_ scope: XCUIApplication, _ text: String, timeout: TimeInterval = 10) -> Bool {
        let query = scope.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", text))
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if query.count == 0 { return true }
            Thread.sleep(forTimeInterval: 0.5)
        }
        return query.count == 0
    }

    private func waitForID(_ scope: XCUIApplication, _ id: String, timeout: TimeInterval = 15) -> XCUIElement {
        let el = scope.descendants(matching: .any).matching(identifier: id).firstMatch
        XCTAssertTrue(el.waitForExistence(timeout: timeout), "never appeared: \(id)")
        return el
    }

    private func clearField(_ scope: XCUIApplication) {
        let f = field(scope)
        guard f.waitForExistence(timeout: 10) else { return }
        f.tap()
        let delete = scope.keyboards.keys["delete"].firstMatch
        for _ in 0..<240 {
            guard let value = f.value as? String, !value.isEmpty else { return }
            if delete.waitForExistence(timeout: 2) {
                delete.tap()
            } else {
                return
            }
        }
    }

    private func statusDotLabel(_ scope: XCUIApplication) -> String? {
        let dot = scope.descendants(matching: .any).matching(identifier: "v2-status-dot").firstMatch
        guard dot.waitForExistence(timeout: 10) else { return nil }
        return dot.label
    }

    private func evidence(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attach = XCTAttachment(screenshot: shot)
        attach.name = name
        attach.lifetime = .keepAlways
        add(attach)
        let dir = ProcessInfo.processInfo.environment["R14_EVIDENCE_DIR"] ?? "/tmp/r32-evidence"
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/R32-native-\(name).png"))
    }

    // MARK: - P081: working line + nav dot

    /// A stalled send shows "<driver> is on it…" plus a Working nav dot;
    /// the first agent block ends both.
    func testWorkingLineAndNavDot() throws {
        let app = launch(Self.base + ["-v2SlowSend=4"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("working r32")
        f.typeText("\n")
        // The line goes up with the send (the 4 s stall holds the flight).
        let line = waitForID(app, "v2-working-line", timeout: 10)
        XCTAssertTrue(line.label.contains("is on it…"), "no working line, got: \(line.label)")
        XCTAssertEqual(statusDotLabel(app), "Working", "the nav dot does not read Working mid-send")
        evidence("working-line")
        // The agent reply lands: the line comes down, the dot settles.
        XCTAssertTrue(waitForTextGone(app, "is on it…", timeout: 20), "the working line survived the reply")
        XCTAssertTrue(waitForText(app, "On it — anything else?"), "the fixture reply never landed")
    }

    /// Past the quiet bound with no reply, the line goes still — never
    /// silent. The bound is shortened by flag; the timer path is the same.
    func testQuietNotice() throws {
        let app = launch(Self.base + ["-v2SlowSend=30", "-v2QuietAfter=2"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("quiet r32")
        f.typeText("\n")
        _ = waitForID(app, "v2-working-line", timeout: 10)
        XCTAssertTrue(
            waitForText(app, "is taking a while — the reply will land here.", timeout: 15),
            "no quiet notice past the bound"
        )
        evidence("working-quiet")
        // Stop ends the wait deliberately: the line comes down, no failure.
        app.buttons.matching(identifier: "v2-composer-stop").firstMatch.tap()
        XCTAssertTrue(waitForTextGone(app, "is taking a while", timeout: 10), "Stop left the quiet notice up")
    }

    // MARK: - clear chat

    /// `/clear` confirms with the every-device copy; clearing General lands
    /// on the welcome home (R41) — never the old empty-state bubble.
    func testClearEmptiesThread() throws {
        let app = launch(Self.base)
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("clear me r32")
        f.typeText("\n")
        XCTAssertTrue(waitForText(app, "clear me r32"), "the message never landed")
        f.tap()
        f.typeText("/clear")
        f.typeText("\n")
        let alert = app.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10), "no clear confirm")
        XCTAssertTrue(
            alert.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "every device")).count > 0,
            "the confirm does not say every device"
        )
        evidence("clear-confirm")
        alert.buttons["Clear chat"].tap()
        let welcome = app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch
        XCTAssertTrue(welcome.waitForExistence(timeout: 15), "clearing did not land on home")
        XCTAssertEqual(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "No messages yet")).count, 0,
            "the empty-state bubble survived clear"
        )
        evidence("clear-empty")
    }

    /// A failed server clear changes nothing and offers a retry.
    func testClearFailureRetries() throws {
        let app = launch(Self.base + ["-v2FailClear"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("stays r32")
        f.typeText("\n")
        XCTAssertTrue(waitForText(app, "stays r32"), "the message never landed")
        f.tap()
        f.typeText("/clear")
        f.typeText("\n")
        let alert = app.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10), "no clear confirm")
        alert.buttons["Clear chat"].tap()
        _ = waitForID(app, "v2-clear-failed", timeout: 10)
        XCTAssertTrue(waitForText(app, "stays r32"), "the failed clear took the thread down")
        XCTAssertTrue(
            app.buttons.matching(identifier: "v2-clear-retry").firstMatch.waitForExistence(timeout: 5),
            "no clear retry"
        )
        evidence("clear-failed")
    }

    // MARK: - staged uploads

    /// A staged file uploads at stage time and its tab opens (the peek bar
    /// is the confirmation); the chip goes away.
    func testStagedUploadOpensTab() throws {
        let app = launch(Self.base + ["-v2SeedStaged", "-v2SeedVisual", "-v2ResetVisual"])
        openThread(app)
        // The seeded file uploads through the fixture backend on its own.
        let peek = app.descendants(matching: .any).matching(identifier: "visual-peek").firstMatch
        XCTAssertTrue(peek.waitForExistence(timeout: 20), "no peek bar: the upload never opened its tab")
        evidence("upload-peek")
        // The chip goes away (the peek bar keeps showing the file's name
        // as the open tab, so the row's absence — not the name — is the
        // dismissal proof).
        let row = app.descendants(matching: .any).matching(identifier: "v2-staged-row").firstMatch
        let deadline = Date().addingTimeInterval(10)
        while Date() < deadline {
            if !row.exists { break }
            Thread.sleep(forTimeInterval: 0.5)
        }
        XCTAssertFalse(row.exists, "the uploaded chip never dismissed")
    }

    /// A failed upload parks its chip with a per-file Retry; the retry
    /// finishes the file alone and the send never waited.
    func testFailedUploadRetriesAlone() throws {
        let app = launch(Self.base + ["-v2SeedStaged", "-v2FailUploads=1", "-v2SeedVisual", "-v2ResetVisual"])
        openThread(app)
        let retry = app.buttons.matching(identifier: "v2-staged-retry-0").firstMatch
        XCTAssertTrue(retry.waitForExistence(timeout: 20), "no per-file retry on the failed upload")
        evidence("upload-retry")
        // The outbox never blocks: a send goes out mid-failure.
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("sends anyway r32")
        f.typeText("\n")
        XCTAssertTrue(waitForText(app, "sends anyway r32", timeout: 15), "the send waited on the failed upload")
        retry.tap()
        let peek = app.descendants(matching: .any).matching(identifier: "visual-peek").firstMatch
        XCTAssertTrue(peek.waitForExistence(timeout: 20), "the retried upload never opened its tab")
    }

    // MARK: - pending image

    /// Generate runs the pending-artifact path: the Generating… run shows,
    /// the tab opens, and the photo paints once the upgrade lands.
    func testImagePendingThenPaints() throws {
        let app = launch(Self.base + ["-v2SeedVisual", "-v2ResetVisual"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("a lighthouse r32")
        app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch.tap()
        XCTAssertTrue(app.buttons["Generate an image"].waitForExistence(timeout: 10), "no Generate row")
        app.buttons["Generate an image"].firstMatch.tap()
        // The fixture upgrade lands on the next poll, so the run is too
        // fast to catch mid-flight here (the slow path pins the card in
        // testImageStop; the pending render in the test below). The proof
        // is the painted photo in the opened tab.
        let photo = app.descendants(matching: .any).matching(identifier: "visual-stage-photo").firstMatch
        XCTAssertTrue(photo.waitForExistence(timeout: 30), "the upgraded photo never painted")
        XCTAssertTrue(waitForTextGone(app, "Generating…", timeout: 10), "the finished run never dismissed")
        evidence("image-painted")
    }

    /// While the upgrade has not landed, the tab shows Generating — never
    /// the broken-link card.
    func testImagePendingRendersWhileWaiting() throws {
        let app = launch(Self.base + ["-v2SeedVisual", "-v2ResetVisual", "-v2ImageUpgradePolls=100000"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("a slow lighthouse r32")
        app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch.tap()
        XCTAssertTrue(app.buttons["Generate an image"].waitForExistence(timeout: 10), "no Generate row")
        app.buttons["Generate an image"].firstMatch.tap()
        let pending = app.descendants(matching: .any).matching(identifier: "visual-stage-generating").firstMatch
        XCTAssertTrue(pending.waitForExistence(timeout: 20), "no Generating stage while the upgrade is out")
        evidence("image-pending")
        XCTAssertFalse(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "carried no link")).count > 0,
            "the pending photo rendered as a broken link"
        )
        // Close the sheet when one covers the thread (iPhone); on iPad the
        // window is a column and the run card stays reachable. Either way
        // Stop parks the run with its dismiss.
        let close = app.descendants(matching: .any).matching(identifier: "visual-sheet-close").firstMatch
        if close.waitForExistence(timeout: 5) {
            close.tap()
            Thread.sleep(forTimeInterval: 1)
        }
        app.buttons.matching(identifier: "v2-image-stop").firstMatch.tap()
        XCTAssertTrue(
            app.buttons.matching(identifier: "v2-image-dismiss").firstMatch.waitForExistence(timeout: 10),
            "the stopped run offers no dismiss"
        )
    }
}
