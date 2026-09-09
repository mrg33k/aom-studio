import XCTest

/// Native plan Task 7, Step 1: durable Visual Window UI tests. Fixture mode
/// only (`-v2FixtureUITest -v2SeedVisual [-v2ResetVisual]`): the stub serves
/// seeded artifacts (pdf, site, video, photo, code, broken) plus an event
/// carrying tappable file cards, and an open echo backed by UserDefaults so a
/// relaunch restores like the real server session. Every test is
/// device-adaptive: on iPhone the window is a sheet, on iPad a column beside
/// the same chat — the same tab state either way.
final class VisualWindowUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // R23: -v2ResetEntry pins the entry to General's thread, so every
        // test starts on the same thread with the shared seeded cards.
        app.launchArguments += ["-v2FixtureUITest", "-v2SeedVisual", "-v2ResetVisual", "-v2ResetEntry"]
        addUIInterruptionMonitor(withDescription: "System dialog") { alert in
            for label in ["Allow", "OK", "Not Now", "Don't Allow", "Continue"] {
                let b = alert.buttons[label]
                if b.exists { b.tap(); return true }
            }
            return false
        }
    }

    // MARK: - helpers

    private func evidence(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attach = XCTAttachment(screenshot: shot)
        attach.name = name
        attach.lifetime = .keepAlways
        add(attach)
        let dir = "/tmp/r11-evidence"
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/R11-native-\(name).png"))
    }

    /// R23: the entry IS General's thread — the launch lands on it, no tree,
    /// no taps. (The seeded file cards ride the shared event buffer, so they
    /// render on whatever thread is showing.)
    private func openGeneralChat(_ scope: XCUIApplication) {
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
            .waitForExistence(timeout: 30), "the entry thread never appeared")
    }

    private func openCard(_ scope: XCUIApplication, artifactID: String, file: StaticString = #file, line: UInt = #line) {
        let card = scope.buttons.matching(identifier: "visual-open-\(artifactID)").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 30),
                      "no file card for \(artifactID) in the thread", file: file, line: line)
        card.tap()
    }

    private func chips(_ scope: XCUIApplication) -> XCUIElementQuery {
        scope.buttons.matching(identifier: "visual-tab")
    }

    /// P082: tabs carry no × at rest — close by long-press → Close menu
    /// (swipe-to-delete is the same path for a person; the menu is the
    /// deterministic one for the runner).
    private func closeChip(_ scope: XCUIApplication, title: String, file: StaticString = #file, line: UInt = #line) {
        let chip = chips(scope).matching(NSPredicate(format: "label == '\(title)'")).firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 10), "no tab chip for \(title)", file: file, line: line)
        chip.press(forDuration: 1.2)
        let close = scope.buttons.matching(identifier: "visual-close").firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 10), "no Close menu for \(title)", file: file, line: line)
        close.tap()
    }

    /// The window is up and showing the tab: sheet on iPhone, column beside
    /// the still-visible chat on iPad. Same state, different host.
    private func expectWindow(_ scope: XCUIApplication, showing title: String, file: StaticString = #file, line: UInt = #line) {
        let chip = chips(scope).matching(NSPredicate(format: "label == '\(title)'")).firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 30),
                      "no tab chip for \(title)", file: file, line: line)
        let column = scope.otherElements.matching(identifier: "visual-column").firstMatch
        if column.waitForExistence(timeout: 5) {
            XCTAssertTrue(scope.staticTexts.matching(identifier: "chat-title").firstMatch.exists,
                          "iPad column covers the chat instead of sitting beside it")
        } else {
            XCTAssertTrue(scope.otherElements.matching(identifier: "visual-sheet").firstMatch
                .waitForExistence(timeout: 15), "iPhone opened no sheet for \(title)")
        }
    }

    private func dismissSheetIfAny(_ scope: XCUIApplication) {
        let close = scope.buttons.matching(identifier: "visual-sheet-close").firstMatch
        if close.waitForExistence(timeout: 5) { close.tap() }
    }

    // MARK: - Task 7 flows

    /// Open pdf, open site, both tabs present; reopen pdf (no duplicate);
    /// close pdf, site remains and stays selected.
    func testVisualTabsOpenCloseKeepsOtherTab() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openGeneralChat(app)

        openCard(app, artifactID: "artifact-pdf-1")
        expectWindow(app, showing: "Aster brief")
        evidence("R15-native-tabs")
        dismissSheetIfAny(app)

        openCard(app, artifactID: "artifact-site-1")
        expectWindow(app, showing: "Launch site")
        XCTAssertEqual(chips(app).count, 2, "opening the site lost the pdf tab")

        // Reopen the pdf: the server dedupes by target — still two tabs.
        dismissSheetIfAny(app)
        openCard(app, artifactID: "artifact-pdf-1")
        expectWindow(app, showing: "Aster brief")
        XCTAssertEqual(chips(app).count, 2, "reopening the pdf duplicated its tab")

        closeChip(app, title: "Aster brief")
        XCTAssertEqual(chips(app).count, 1, "closing the pdf took the site with it")
        XCTAssertTrue(chips(app).matching(NSPredicate(format: "label == 'Launch site'")).firstMatch
            .waitForExistence(timeout: 10), "the surviving tab is not the site")
    }

    /// P082: a resting tab shows icon + label only — no × anywhere on the
    /// strip — and the tab still closes through the long-press menu.
    func testTabStripShowsNoCloseAtRest() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openGeneralChat(app)
        openCard(app, artifactID: "artifact-pdf-1")
        expectWindow(app, showing: "Aster brief")
        XCTAssertEqual(
            app.buttons.matching(identifier: "visual-close").count, 0,
            "a resting tab shows close chrome (the design draws icon + label only)"
        )
        XCTAssertEqual(
            app.buttons.matching(identifier: "visual-close-swipe").count, 0,
            "swipe actions leak into the resting strip"
        )
        closeChip(app, title: "Aster brief")
        let deadline = Date().addingTimeInterval(10)
        while Date() < deadline, chips(app).count != 0 { Thread.sleep(forTimeInterval: 0.5) }
        XCTAssertEqual(chips(app).count, 0, "the long-press Close menu did not close the tab")
    }

    /// A relaunch restores the server session's tabs: terminate with one tab
    /// open, relaunch without the reset flag, the tab is still there.
    func testVisualRelaunchRestoresTabs() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openGeneralChat(app)
        openCard(app, artifactID: "artifact-pdf-1")
        expectWindow(app, showing: "Aster brief")
        app.terminate()

        let back = XCUIApplication()
        // R43: -v2ResetEntry clears the eye (the terminated launch left it
        // full, which would auto-raise the sheet over the card tap below)
        // but NOT the tabs — the session restore is what this proves.
        back.launchArguments += ["-v2FixtureUITest", "-v2SeedVisual", "-v2ResetEntry"]
        back.launch()
        XCTAssertTrue(back.wait(for: .runningForeground, timeout: 30), "app did not relaunch")
        openGeneralChat(back)
        // The session kept the tab; tapping its card reselects, never dupes.
        openCard(back, artifactID: "artifact-pdf-1")
        expectWindow(back, showing: "Aster brief")
        XCTAssertEqual(chips(back).count, 1, "relaunch duplicated or dropped the tab")
    }

    /// An artifact with a dead source shows the recoverable-error tab with a
    /// retry control — never a spinner, never a crash.
    func testBrokenArtifactShowsRetryTab() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openGeneralChat(app)
        openCard(app, artifactID: "artifact-broken-1")
        expectWindow(app, showing: "Broken file")
        let retry = app.buttons.matching(identifier: "visual-retry").firstMatch
        XCTAssertTrue(retry.waitForExistence(timeout: 15), "the broken tab offers no retry")
        evidence("R15-native-broken")
    }

    // MARK: - Task 8 review flows

    private func reviewNote(_ scope: XCUIApplication) -> XCUIElement {
        let field = scope.textFields.matching(identifier: "review-note").firstMatch
        if field.waitForExistence(timeout: 10) { return field }
        return scope.textViews.matching(identifier: "review-note").firstMatch
    }

    private func reviewSend(_ scope: XCUIApplication) -> XCUIElement {
        scope.buttons.matching(identifier: "review-send").firstMatch
    }

    private func reviewPins(_ scope: XCUIApplication) -> XCUIElementQuery {
        scope.buttons.matching(identifier: "review-pin")
    }

    /// Fresh query per tap: an element captured before the keyboard appears
    /// goes stale when the sheet shifts, and the tap silently misses.
    private func tapPinMoment(_ scope: XCUIApplication, file: StaticString = #file, line: UInt = #line) {
        let moment = scope.buttons.matching(identifier: "visual-pin-moment").firstMatch
        XCTAssertTrue(moment.waitForExistence(timeout: 30), "the video offers no Pin moment", file: file, line: line)
        moment.tap()
    }

    @discardableResult
    private func waitForPinCount(_ scope: XCUIApplication, _ count: Int, timeout: TimeInterval = 20) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if reviewPins(scope).count == count { return true }
            Thread.sleep(forTimeInterval: 1.0)
        }
        return reviewPins(scope).count == count
    }

    /// A point pin on the PDF, two moment pins on the video (one blank):
    /// "Send 2 changes" excludes the blank, submits, and clears; the peek
    /// bar shows the active tab's count.
    func testReviewPinFlowSendsOnceAndPeekShowsCount() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openGeneralChat(app)

        // A point pin on the PDF.
        openCard(app, artifactID: "artifact-pdf-1")
        expectWindow(app, showing: "Aster brief")
        let pdfStage = app.descendants(matching: .any).matching(identifier: "visual-stage-pdf").firstMatch
        XCTAssertTrue(pdfStage.waitForExistence(timeout: 30), "the pdf stage never rendered")
        evidence("R15-native-sheet-half")
        pdfStage.tap()
        let note = reviewNote(app)
        XCTAssertTrue(note.waitForExistence(timeout: 15), "tapping the pdf added no pin to note")
        note.tap()
        note.typeText("Increase contrast")
        // Half -> full through the handle, pins on the page. iPad has no
        // sheet — the column already shows everything.
        let sheetMarker = app.descendants(matching: .any).matching(identifier: "visual-sheet").firstMatch
        if sheetMarker.waitForExistence(timeout: 5) { sheetMarker.swipeUp() }
        evidence("R15-native-sheet-full-pins")
        dismissSheetIfAny(app)

        // Two moment pins on the video, the second left blank.
        openCard(app, artifactID: "artifact-video-1")
        expectWindow(app, showing: "Teaser")
        tapPinMoment(app)
        XCTAssertTrue(waitForPinCount(app, 1), "the first moment added no pin")
        let videoNote = reviewNote(app)
        XCTAssertTrue(videoNote.waitForExistence(timeout: 15), "pinning the moment opened no note")
        videoNote.tap()
        videoNote.typeText("Trim the end")
        tapPinMoment(app)
        XCTAssertTrue(waitForPinCount(app, 2), "the second moment added no pin")
        let videoNote2 = reviewNote(app)
        XCTAssertTrue(videoNote2.waitForExistence(timeout: 15), "the second moment opened no note")
        videoNote2.tap()
        videoNote2.typeText("Louder mix")
        // A third moment left blank.
        tapPinMoment(app)
        XCTAssertTrue(waitForPinCount(app, 3), "the third moment added no pin")

        // The blank note does not send: 3 pins, "Send 2 changes".
        let send = reviewSend(app)
        XCTAssertTrue(send.waitForExistence(timeout: 10), "no review Send")
        XCTAssertEqual(send.label, "Send 2 changes")

        // The peek bar shows the active tab's count; tapping it reopens.
        dismissSheetIfAny(app)
        let peekCount = app.staticTexts.matching(identifier: "visual-peek-count").firstMatch
        XCTAssertTrue(peekCount.waitForExistence(timeout: 15), "no artifact peek above the composer")
        XCTAssertEqual(peekCount.label, "2 changes")
        evidence("R15-native-peek")
        app.buttons.matching(identifier: "visual-peek").firstMatch.tap()
        expectWindow(app, showing: "Teaser")

        // Send once: the pins clear and Send stands down (no re-fire).
        // Review auto-expands to full, but the Send row may still sit below
        // the fold with three pins — scroll it into view first. The swipe
        // starts on the screen, not on the note: the note itself may already
        // be the thing below the fold.
        for _ in 0..<4 {
            if reviewSend(app).isHittable { break }
            app.swipeUp()
        }
        evidence("R15-native-review-pins")
        XCTAssertTrue(reviewSend(app).isEnabled, "Send 2 changes is disabled before the tap")
        reviewSend(app).tap()
        // Send once: submit clears the pins and review mode stands down, so
        // the panel (and its Send) leaves — there is nothing to tap twice.
        // R59: on the phone, standing down brings the "Leave a review" entry
        // back into the content (it replaced the header's review-toggle).
        let entry = app.buttons.matching(
            NSPredicate(format: "identifier == 'leave-a-review' OR identifier == 'review-toggle'")
        ).firstMatch
        let sent = expectation(for: NSPredicate(format: "exists == true"), evaluatedWith: entry, handler: nil)
        wait(for: [sent], timeout: 30)
        XCTAssertEqual(app.buttons.matching(identifier: "review-send").count, 0, "Send stayed live after submitting")
        // Let the cleared counts commit before the evidence frame.
        Thread.sleep(forTimeInterval: 2.0)
        evidence("R15-native-review-send")
    }

    // MARK: - P022 / P023

    /// P022: a mission chat shows the PROJECT name as the line above the
    /// title; a project chat shows the title only.
    func testMissionChatShowsProjectSubtitle() throws {
        app.launchArguments += ["-v2RouteMode=confirm"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        // A project chat: title only, no subtitle line. (-v2SeedVisual
        // seeds file cards on this thread, so General is NOT empty here —
        // the R41 welcome only replaces the empty General thread.)
        openGeneralChat(app)
        XCTAssertEqual(
            app.staticTexts.matching(identifier: "chat-title").firstMatch.label, "General"
        )
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "chat-subtitle").firstMatch.exists,
            "a project chat shows no subtitle line"
        )
        // R24 P079: thread sends stay in-thread, so reach the seeded mission
        // through the drawer: mission name + project above (P071).
        app.buttons.matching(identifier: "v2-drawer-button").firstMatch.tap()
        XCTAssertTrue(
            app.descendants(matching: .any).matching(identifier: "v2-drawer").firstMatch
                .waitForExistence(timeout: 10), "the drawer never opened"
        )
        let expand = app.buttons.matching(identifier: "v2-drawer-project-expand")
            .matching(NSPredicate(format: "label == 'Expand Aster'")).firstMatch
        if expand.waitForExistence(timeout: 10) { expand.tap() }
        let rows = app.buttons.matching(identifier: "v2-drawer-mission-row")
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 15), "no mission rows in the drawer")
        var tapped = false
        for i in 0..<rows.count {
            let row = rows.element(boundBy: i)
            if row.label.localizedCaseInsensitiveContains("Ship home page") {
                row.tap()
                tapped = true
                break
            }
        }
        XCTAssertTrue(tapped, "no mission row for Ship home page")
        // R23 P071: the title is the mission name only, the project above it.
        let missionTitle = app.staticTexts.matching(identifier: "chat-title")
            .matching(NSPredicate(format: "label == 'Ship home page'")).firstMatch
        XCTAssertTrue(missionTitle.waitForExistence(timeout: 30), "the drawer did not open the mission chat")
        let subtitle = app.staticTexts.matching(identifier: "chat-subtitle").firstMatch
        XCTAssertTrue(subtitle.waitForExistence(timeout: 10), "a mission chat shows no project line")
        XCTAssertEqual(subtitle.label, "Aster")
    }

    /// P023: the composer is a pill with Record inside plus a round send;
    /// with no tabs there is no peek bar.
    func testComposerHasRecordPillAndRoundSend() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openGeneralChat(app)
        XCTAssertTrue(
            app.textFields.matching(identifier: "v2-composer-field").firstMatch.waitForExistence(timeout: 15),
            "no v2 composer field"
        )
        XCTAssertTrue(
            app.buttons.matching(identifier: "v2-record").firstMatch.waitForExistence(timeout: 10),
            "no Record chip inside the pill"
        )
        XCTAssertTrue(
            app.buttons.matching(identifier: "v2-composer-send").firstMatch.exists,
            "no round send beside the pill"
        )
        XCTAssertEqual(
            app.buttons.matching(identifier: "visual-peek").count, 0,
            "the peek bar shows with no tabs open"
        )
    }

    /// "Nothing to change, carry on" sends the plain thread text, not a
    /// checklist submission.
    func testReviewCarryOnSendsPlainText() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openGeneralChat(app)
        openCard(app, artifactID: "artifact-pdf-1")
        expectWindow(app, showing: "Aster brief")
        // R59: review entry is "Leave a review" in content (phone) or the
        // iPad column's "review-toggle".
        let toggle = app.buttons.matching(
            NSPredicate(format: "identifier == 'leave-a-review' OR identifier == 'review-toggle'")
        ).firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 15), "no review entry on the sheet")
        toggle.tap()
        let carry = app.buttons.matching(identifier: "review-carry-on").firstMatch
        XCTAssertTrue(carry.waitForExistence(timeout: 15), "no carry-on control in review mode")
        carry.tap()
        XCTAssertTrue(app.staticTexts["Looks right. Carry on."].waitForExistence(timeout: 60),
                      "carry-on never sent the plain thread text")
    }
}
