// ComposerParityUITests.swift — Corner native iOS
// corner:corner-v2 R28 — one UI test per composer control, in the v2 pill.
//
// Fixture mode throughout (deterministic, no backend). Each test launches
// its own app on General's thread (-v2ResetEntry pins it) and drives the
// pill like a person: attach menu, commands chip + Talk aloud, slash sheet,
// /clear confirm, reply quote, dictation meter, Stop, drafts across a
// relaunch, @mention chips, image generation, Return-to-send, and the
// accessibility labels of every control.

import XCTest

final class ComposerParityUITests: XCTestCase {
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

    /// Empty the composer field through the delete key (bounded loop —
    /// select-all is flaky across iOS versions).
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

    private func waitForTextGone(_ scope: XCUIApplication, _ text: String, timeout: TimeInterval = 10) -> Bool {
        let query = scope.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", text))
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if query.count == 0 { return true }
            Thread.sleep(forTimeInterval: 0.5)
        }
        return query.count == 0
    }

    private func evidence(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attach = XCTAttachment(screenshot: shot)
        attach.name = name
        attach.lifetime = .keepAlways
        add(attach)
        let dir = ProcessInfo.processInfo.environment["R14_EVIDENCE_DIR"] ?? "/tmp/r28-evidence"
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/R28-native-\(name).png"))
    }

    // MARK: - paperclip

    /// R59 (Patrik phone review): the paperclip is a permanent control in the
    /// row above the pill (Plan/Work · Model · Attach), ALWAYS visible — not
    /// hidden until composing. Patrik's #1: the full composer row is back.
    /// Regression guard: this fails if attach disappears again.
    func testAttachMenu() throws {
        let app = launch(Self.base)
        openThread(app)
        let clip = app.descendants(matching: .any).matching(identifier: "v2-attach").firstMatch
        XCTAssertTrue(clip.waitForExistence(timeout: 15),
                      "the attach control is missing from the composer row (it must always show)")
        XCTAssertEqual(clip.label, "Attach and upload files")
        clip.tap()
        XCTAssertTrue(app.buttons["Photo Library"].waitForExistence(timeout: 10), "no Photo Library row")
        XCTAssertTrue(app.buttons["Choose Files"].exists, "no Choose Files row")
        XCTAssertTrue(app.buttons["Camera"].exists, "no Camera row")
        evidence("attach-menu")
        // Dismiss the menu without picking (a pick would leave the app).
        clip.tap()
    }

    /// R59 regression guard (Patrik's zoom-out — "stop running in circles"):
    /// the composer's visible control row is Plan/Work + Model + Attach, all
    /// present without typing a character, plus the sparkle command chip and
    /// send in the pill. These regressed into the sparkle menu before; this
    /// test fails the moment any piece disappears again.
    func testComposerControlRowPresent() throws {
        let app = launch(Self.base)
        openThread(app)
        for id in ["v2-mode-toggle", "v2-model-button", "v2-attach", "v2-commands", "v2-composer-send"] {
            let el = app.descendants(matching: .any).matching(identifier: id).firstMatch
            XCTAssertTrue(el.waitForExistence(timeout: 15), "composer control '\(id)' is missing from the row")
        }
        // The Plan/Work toggle flips between the two modes on tap.
        let mode = app.buttons.matching(identifier: "v2-mode-toggle").firstMatch
        let before = mode.label
        mode.tap()
        let flipped = expectation(for: NSPredicate(format: "label != %@", before), evaluatedWith: mode, handler: nil)
        wait(for: [flipped], timeout: 10)
        evidence("composer-control-row")
    }

    /// Seeded staged chips render above the pill and remove cleanly.
    func testStagedRow() throws {
        let app = launch(Self.base + ["-v2SeedStaged"])
        openThread(app)
        let row = app.descendants(matching: .any).matching(identifier: "v2-staged-row").firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 15), "no staged row")
        XCTAssertTrue(waitForText(app, "seed-deck.pdf"), "no staged file name")
        evidence("staged-row")
        app.buttons.matching(identifier: "v2-staged-remove-0").firstMatch.tap()
        XCTAssertFalse(waitForText(app, "seed-deck.pdf", timeout: 5), "the staged chip did not remove")
    }

    // MARK: - commands chip + Talk aloud

    /// The chip menu carries the Talk aloud toggle and checklist playback.
    func testCommandsChipTalkRows() throws {
        let app = launch(Self.base)
        openThread(app)
        let chip = app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "no commands chip in the pill")
        XCTAssertFalse(chip.label.isEmpty, "the chip has no accessibility label")
        chip.tap()
        XCTAssertTrue(app.buttons["Talk aloud"].waitForExistence(timeout: 10), "no Talk aloud toggle")
        XCTAssertTrue(app.buttons["Read checklist aloud"].exists, "no checklist playback row")
        // The toggle flips without leaving the thread (flipped back when
        // the menu stays open, so reruns inherit a silent thread).
        app.buttons["Talk aloud"].tap()
        evidence("commands-talk")
        if app.buttons["Talk aloud"].waitForExistence(timeout: 3) {
            app.buttons["Talk aloud"].tap()
        }
        app.tap()
        openThread(app)
    }

    // MARK: - slash commands

    /// `/` hints the palette inline; Return opens the commands as a sheet
    /// with the full row set.
    func testSlashSheet() throws {
        let app = launch(Self.base)
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("/")
        // Inline hints first (typing keeps focus — no focus theft).
        let quick = app.buttons.matching(identifier: "v2-slashquick-plan").firstMatch
        XCTAssertTrue(quick.waitForExistence(timeout: 10), "no inline slash hints")
        // Return submits to the sheet.
        f.typeText("\n")
        let sheet = app.descendants(matching: .any).matching(identifier: "v2-slash-sheet").firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 10), "no slash sheet")
        for id in ["plan", "work", "model", "files", "image", "talk", "integrations", "clear"] {
            XCTAssertTrue(
                app.buttons.matching(identifier: "v2-slash-\(id)").firstMatch.exists,
                "no slash row /\(id)"
            )
        }
        evidence("slash-sheet")
        // Clear confirms inline — the pick alone clears nothing.
        app.buttons.matching(identifier: "v2-slash-clear").firstMatch.tap()
        XCTAssertTrue(waitForText(app, "Messages stay in this thread"), "no inline clear confirm")
        app.buttons["Cancel"].firstMatch.tap()
        app.buttons["Done"].firstMatch.tap()
        XCTAssertTrue(sheet.waitForNonExistence(timeout: 10), "the slash sheet did not close")
    }

    /// `/clear` + Return confirms (alert) and clears view-local state only.
    /// R32: `/clear` confirms with the server-clear copy; Clear empties
    /// the thread on the backend and drops the view-local staged files.
    func testSlashClearConfirm() throws {
        let app = launch(Self.base + ["-v2SeedStaged"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("/clear")
        f.typeText("\n")
        let alert = app.alerts["Clear this chat?"].firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10), "no /clear confirm alert")
        evidence("slash-clear")
        alert.buttons["Clear chat"].tap()
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "v2-staged-row").firstMatch.exists,
                       "clear left staged files behind")
    }

    // MARK: - reply-to

    /// Long-press a message → Reply arms the quote chip; × cancels; a send
    /// carries the bare text while the quote renders as a card from the
    /// block payload (R32: no `> sender:` line in the text anymore).
    func testReplyQuote() throws {
        let app = launch(Self.base)
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("quotable r28")
        f.typeText("\n")
        XCTAssertTrue(waitForText(app, "quotable r28"), "the sent text never echoed")
        let bubble = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "quotable r28")).firstMatch
        bubble.press(forDuration: 1.2)
        let reply = app.buttons.matching(identifier: "v2-reply-action").firstMatch
        if !reply.waitForExistence(timeout: 5) {
            // The system menu hosts the row under its visible title instead.
            XCTAssertTrue(app.buttons["Reply"].waitForExistence(timeout: 5), "no Reply row on long-press")
            app.buttons["Reply"].firstMatch.tap()
        } else {
            reply.tap()
        }
        XCTAssertTrue(waitForText(app, "Replying to"), "no reply quote chip")
        XCTAssertTrue(waitForText(app, "quotable r28"), "the chip shows no snippet")
        evidence("reply-chip")
        // Cancel arms nothing…
        app.buttons.matching(identifier: "v2-reply-cancel").firstMatch.tap()
        XCTAssertTrue(waitForTextGone(app, "Replying to"), "the quote chip did not cancel")
        // …and a re-armed reply rides the next send as a quote line.
        bubble.press(forDuration: 1.2)
        if app.buttons.matching(identifier: "v2-reply-action").firstMatch.waitForExistence(timeout: 5) {
            app.buttons.matching(identifier: "v2-reply-action").firstMatch.tap()
        } else {
            app.buttons["Reply"].firstMatch.tap()
        }
        XCTAssertTrue(waitForText(app, "Replying to"), "no reply quote chip on re-arm")
        f.tap()
        f.typeText("answer r28")
        app.buttons.matching(identifier: "v2-composer-send").firstMatch.tap()
        // The text lands bare; the quote renders as a card on the message.
        XCTAssertTrue(waitForText(app, "answer r28"), "the reply never landed")
        XCTAssertTrue(waitForTextGone(app, "> You:"), "the quote leaked into the text")
        let quote = app.descendants(matching: .any).matching(identifier: "v2-event-quote").firstMatch
        XCTAssertTrue(quote.waitForExistence(timeout: 10), "no rendered quote card on the reply")
        evidence("reply-quote")
        XCTAssertTrue(waitForTextGone(app, "Replying to"), "the quote survived its send")
        // Tap-to-jump: the quoted message is in this thread, so the jump
        // lands without leaving it.
        quote.tap()
        XCTAssertTrue(
            app.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch.waitForExistence(timeout: 5),
            "the quote jump left the thread"
        )
    }

    // MARK: - dictation meter

    /// While dictating, the pill shows the live level meter beside Record.
    func testDictationMeter() throws {
        let app = launch(Self.base + ["-v2PreviewDictation"])
        openThread(app)
        let meter = app.descendants(matching: .any).matching(identifier: "v2-dictation-meter").firstMatch
        XCTAssertTrue(meter.waitForExistence(timeout: 15), "no dictation level meter")
        let record = app.buttons.matching(identifier: "v2-record").firstMatch
        XCTAssertTrue(record.exists, "no Record while dictating")
        XCTAssertEqual(record.label, "Stop dictation")
        evidence("dictation-meter")
    }

    // MARK: - stop while generating

    /// A slow send swaps Send for Stop; Stop parks the flight quietly.
    func testStopWhileSending() throws {
        let app = launch(Self.base + ["-v2SlowSend=4"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("slow r28")
        app.buttons.matching(identifier: "v2-composer-send").firstMatch.tap()
        let stop = app.buttons.matching(identifier: "v2-composer-stop").firstMatch
        XCTAssertTrue(stop.waitForExistence(timeout: 10), "no Stop while generating")
        XCTAssertEqual(stop.label, "Stop generating")
        evidence("stop-generating")
        stop.tap()
        XCTAssertTrue(app.buttons.matching(identifier: "v2-composer-send").firstMatch.waitForExistence(timeout: 10),
                      "Send did not return after Stop")
        // A deliberate stop stamps no failure: no Not-sent banner follows.
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "v2-notsent-banner").firstMatch.exists,
                       "Stop painted a Not-sent banner")
    }

    // MARK: - drafts per thread

    /// A typed draft survives a relaunch on the same thread.
    func testDraftSurvivesRelaunch() throws {
        var app = launch(Self.base)
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("r28 draft xyz")
        app.terminate()
        // Relaunch WITHOUT -v2ResetEntry: the entry restores General's
        // thread (the draft's thread) with the disk draft intact.
        app = XCUIApplication()
        app.launchArguments += ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "relaunch never foregrounded")
        openThread(app)
        let reopened = field(app)
        XCTAssertTrue(reopened.waitForExistence(timeout: 15), "no composer field after relaunch")
        XCTAssertEqual(reopened.value as? String, "r28 draft xyz", "the disk draft did not survive relaunch")
        evidence("draft-relaunch")
        // Leave no trace for later suites: send it away.
        reopened.tap()
        app.buttons.matching(identifier: "v2-composer-send").firstMatch.tap()
    }

    // MARK: - @mentions

    /// `@b` suggests @brain; the pick commits a removable chip.
    func testMentionSuggestionAndChip() throws {
        let app = launch(Self.base)
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("ask @b")
        let suggestion = app.buttons.matching(identifier: "v2-mention-brain").firstMatch
        XCTAssertTrue(suggestion.waitForExistence(timeout: 10), "no @brain suggestion")
        suggestion.tap()
        let chip = app.descendants(matching: .any).matching(identifier: "v2-mention-chip-brain").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 10), "no committed @brain chip")
        evidence("mention-chip")
        app.buttons["Remove @brain mention"].firstMatch.tap()
        XCTAssertTrue(chip.waitForNonExistence(timeout: 10), "the mention chip did not remove")
    }

    // MARK: - generate an image

    /// Generate an image (prompt in the field) opens a real artifact tab.
    func testImageGenerateOpensTab() throws {
        let app = launch(Self.base + ["-v2SeedVisual", "-v2ResetVisual"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("a lighthouse at dusk")
        app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch.tap()
        XCTAssertTrue(app.buttons["Generate an image"].waitForExistence(timeout: 10), "no Generate row")
        app.buttons["Generate an image"].firstMatch.tap()
        let peek = app.descendants(matching: .any).matching(identifier: "visual-peek").firstMatch
        XCTAssertTrue(peek.waitForExistence(timeout: 15), "no artifact tab after Generate")
        evidence("image-tab")
    }

    /// A slow visual open shows Generating… with a Stop that parks the run.
    func testImageStop() throws {
        let app = launch(Self.base + ["-v2SeedVisual", "-v2ResetVisual", "-v2SlowSend=30"])
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("a slow harbor")
        app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch.tap()
        XCTAssertTrue(app.buttons["Generate an image"].waitForExistence(timeout: 10), "no Generate row")
        app.buttons["Generate an image"].firstMatch.tap()
        XCTAssertTrue(waitForText(app, "Generating…"), "no Generating… run")
        evidence("image-generating")
        app.buttons.matching(identifier: "v2-image-stop").firstMatch.tap()
        XCTAssertTrue(app.buttons.matching(identifier: "v2-image-dismiss").firstMatch.waitForExistence(timeout: 10),
                      "the stopped run offers no dismiss")
    }

    // MARK: - return sends + labels

    /// The Return key sends (Slack-style); the sent text echoes in-thread.
    func testReturnSends() throws {
        let app = launch(Self.base)
        openThread(app)
        clearField(app)
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 15), "no composer field")
        f.tap()
        f.typeText("return r28")
        f.typeText("\n")
        XCTAssertTrue(waitForText(app, "return r28"), "Return did not send")
        XCTAssertEqual((field(app).value as? String) ?? "", "", "the field kept its text after send")
        evidence("return-send")
    }

    // MARK: - checklist panel (iPhone item 3)

    /// The v2 Checklist chip opens the room checklist panel above the pill;
    /// tapping Close removes it. (The chip used to toggle state nothing
    /// rendered, so the button was dead.)
    func testChecklistChipOpensPanel() throws {
        let app = launch(Self.base)
        openThread(app)
        let chip = app.buttons.matching(identifier: "v2-composer-checklist").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "no Checklist chip under the pill")
        XCTAssertFalse(waitForText(app, "Room lists", timeout: 3), "panel visible before tap")
        chip.tap()
        XCTAssertTrue(waitForText(app, "Room lists"), "panel did not open")
        app.buttons["Close checklists"].tap()
        XCTAssertFalse(waitForText(app, "Room lists", timeout: 5), "panel did not close")
    }

    /// The whole checklist job, seeded: build a list, add an item, Play it
    /// to the agent and see it land in the thread.
    func testChecklistFullFlow() throws {
        let app = launch(Self.base + ["-v2SeedChecklists"])
        openThread(app)
        app.buttons.matching(identifier: "v2-composer-checklist").firstMatch.tap()
        sleep(2)
        evidence("checklist-seed-state")
        // List titles render as editable text fields, not static text.
        let seedTitle = app.textFields["Seed list"].firstMatch
        XCTAssertTrue(seedTitle.waitForExistence(timeout: 15), "seeded list never rendered")
        // Build: new list.
        app.buttons["Create a new list"].tap()
        let titleField = app.textFields["List title…"]
        XCTAssertTrue(titleField.waitForExistence(timeout: 10), "no list title field")
        titleField.tap()
        titleField.typeText("Driver list")
        app.buttons["Create"].tap()
        let driverTitle = app.textFields["Driver list"].firstMatch
        XCTAssertTrue(driverTitle.waitForExistence(timeout: 15), "new list never rendered")
        // Add: an item on the new list, then Play it to the agent.
        let itemField = app.textFields["Add a note or next step…"].firstMatch
        XCTAssertTrue(itemField.waitForExistence(timeout: 10), "no add-item field")
        itemField.tap()
        itemField.typeText("Driver step")
        app.keyboards.buttons["return"].tap()
        XCTAssertTrue(waitForText(app, "Driver step"), "new item never rendered")
        evidence("checklist-built")
        app.buttons["Send Driver step to agent"].tap()
        XCTAssertTrue(waitForText(app, "Sent to the agent."), "no Play confirmation")
        XCTAssertTrue(waitForText(app, "Driver step"), "played text never echoed in the thread")
        evidence("checklist-played")
    }

    // MARK: - model change indicator (iPhone item 9b)

    /// Picking a model from the commands card announces the change above
    /// the pill ("Model is now …").
    func testModelPickAnnouncesChange() throws {
        let app = launch(Self.base)
        openThread(app)
        let chip = app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "no commands chip in the pill")
        chip.tap()
        let modelRow = app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Model —")).firstMatch
        XCTAssertTrue(modelRow.waitForExistence(timeout: 10), "no Model row in the card")
        modelRow.tap()
        let sonnet = app.buttons["Claude Sonnet"]
        XCTAssertTrue(sonnet.waitForExistence(timeout: 10), "no Sonnet option")
        sonnet.tap()
        let notice = app.descendants(matching: .any).matching(identifier: "v2-model-notice").firstMatch
        XCTAssertTrue(notice.waitForExistence(timeout: 10), "no model-change notice")
        XCTAssertTrue(notice.label.contains("Claude Sonnet"), "notice names the wrong model: \(notice.label)")
        evidence("model-notice")
        // The caption under the command circle now names the model (exact
        // text match — the transient notice also contains the word).
        let caption = app.staticTexts.matching(NSPredicate(format: "label == %@", "Sonnet")).firstMatch
        XCTAssertTrue(caption.waitForExistence(timeout: 10), "no Sonnet caption under the circle")
        // …and the notice clears itself.
        sleep(6)
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "v2-model-notice").firstMatch.exists, "notice never cleared")
        // The pick survives a relaunch.
        app.terminate()
        let app2 = launch(Self.base)
        openThread(app2)
        let caption2 = app2.staticTexts.matching(NSPredicate(format: "label == %@", "Sonnet")).firstMatch
        XCTAssertTrue(caption2.waitForExistence(timeout: 15), "pick did not persist")
    }

    // MARK: - options row overlap (R77)

    /// Attach, Context, and Checklist never overlap: the old ZStack build
    /// let the centred pair slide over Attach on iPhone widths.
    func testOptionsRowNeverOverlaps() throws {
        let app = launch(Self.base)
        openThread(app)
        let attach = app.descendants(matching: .any).matching(identifier: "v2-attach").firstMatch
        let eye = app.descendants(matching: .any).matching(identifier: "v2-composer-eye").firstMatch
        let check = app.descendants(matching: .any).matching(identifier: "v2-composer-checklist").firstMatch
        XCTAssertTrue(attach.waitForExistence(timeout: 15), "no Attach chip")
        XCTAssertTrue(eye.exists && check.exists, "options row incomplete")
        XCTAssertFalse(attach.frame.intersects(eye.frame), "Attach overlaps Context: \(attach.frame) vs \(eye.frame)")
        XCTAssertFalse(eye.frame.intersects(check.frame), "Context overlaps Checklist: \(eye.frame) vs \(check.frame)")
        evidence("options-row")
    }

    // MARK: - purple circle card audit

    /// Every row of the commands card does its job: mode toggles stick,
    /// Files opens the files view, Image opens the prompt sheet, Talk
    /// toggles, Read-checklist (no pins) dismisses silently.
    func testCommandsCardEveryRowActs() throws {
        let app = launch(Self.base)
        openThread(app)
        func openCard() {
            // Re-resolve every tap: sheet presentations rebuild the
            // hierarchy and stale references tap thin air.
            func chip() -> XCUIElement {
                app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
            }
            XCTAssertTrue(chip().waitForExistence(timeout: 15), "no commands circle")
            chip().tap()
            if !app.buttons["Generate an image"].waitForExistence(timeout: 4) {
                chip().tap()
            }
            XCTAssertTrue(app.buttons["Generate an image"].waitForExistence(timeout: 10), "card never opened")
        }
        // Plan, then back to Work.
        openCard()
        app.buttons["Plan"].tap()
        openCard()
        XCTAssertTrue(waitForText(app, "Corner will propose a plan first"), "Plan mode never applied")
        app.buttons["Work"].tap()
        openCard()
        XCTAssertTrue(waitForText(app, "Corner gets to work directly"), "Work mode never restored")
        // Files.
        app.buttons["Files in this conversation"].tap()
        sleep(2)
        evidence("commands-files-state")
        XCTAssertTrue(waitForText(app, "Files"), "Files view never opened")
        XCTAssertTrue(app.buttons["Done"].exists, "no Done on Files sheet")
        app.buttons["Done"].tap()
        XCTAssertFalse(app.buttons["Done"].waitForExistence(timeout: 5), "Files sheet never dismissed")
        // Image (empty draft asks for a prompt).
        openCard()
        app.buttons["Generate an image"].tap()
        sleep(2)
        evidence("commands-image-state")
        XCTAssertTrue(app.buttons["Cancel"].exists, "no Cancel on image prompt")
        app.buttons["Cancel"].tap()
        // Talk toggles on and back off.
        openCard()
        app.buttons["Talk aloud"].tap()
        openCard()
        app.buttons["Talk aloud"].tap()
        // Read checklist with no pins: silent dismiss, no crash.
        openCard()
        app.buttons["Read checklist aloud"].tap()
        XCTAssertFalse(waitForText(app, "Corner gets to work directly", timeout: 3), "card never dismissed")
        evidence("commands-card-audit")
    }

    /// Every pill control names itself for VoiceOver.
    func testAccessibilityLabels() throws {
        let app = launch(Self.base)
        openThread(app)
        XCTAssertEqual(
            app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch.label,
            "Commands — specialist, mode, model, files, image generation"
        )
        XCTAssertEqual(app.buttons.matching(identifier: "v2-record").firstMatch.label, "Speak your message")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-composer-send").firstMatch.label, "Send message")
        XCTAssertFalse(field(app).label.isEmpty, "the field has no accessibility label")
        // The clip names itself once composing begins.
        field(app).tap()
        field(app).typeText("x")
        XCTAssertEqual(
            app.descendants(matching: .any).matching(identifier: "v2-attach").firstMatch.label,
            "Attach and upload files"
        )
    }
}
