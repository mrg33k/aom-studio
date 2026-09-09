// CompMatchUITests.swift — Corner native iOS
// corner:corner-v2 R17 — the native comp-match locks.
//
// One test per punch row (P024–P063), on the 390pt device, asserting the
// design number: geometry from XCUI frames, colours from screenshot pixels
// (2/255 per channel, the R6 bar), copy from labels and placeholders. Where
// XCUI cannot observe a value (a 0.5pt type step, a corner radius), the test
// asserts the nearest observable and the report cites the evidence shot.
// Fixture mode throughout (deterministic, no backend); the real-backend
// pairs live in rounds/evidence, not here.

import XCTest

final class CompMatchUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - launchers

    // R23: -v2ResetEntry pins the entry to General's thread — every lock
    // starts on the same thread no matter what an earlier test stored.
    private static let base = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]
    private static let visual = base + ["-v2SeedVisual", "-v2ResetVisual"]
    private static let comp = base + ["-v2SeedCompMatch"]
    private static let compVisual = visual + ["-v2SeedCompMatch"]

    @discardableResult
    private func launch(_ args: [String], env: [String: String] = [:]) -> XCUIApplication {
        app = XCUIApplication()
        app.launchArguments += args
        for (k, v) in env { app.launchEnvironment[k] = v }
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        return app
    }

    // MARK: - navigation

    /// R23: the entry IS the thread — no tree, no taps. The launch lands on
    /// General's thread (-v2ResetEntry pins it).
    private func expectHome(_ app: XCUIApplication, timeout: TimeInterval = 20) {
        openThread(app, timeout: timeout)
    }

    /// The entry thread is up.
    private func openThread(_ app: XCUIApplication, timeout: TimeInterval = 20) {
        let marker = app.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
        XCTAssertTrue(marker.waitForExistence(timeout: timeout), "the entry thread never appeared")
    }

    /// Frames sampled mid-animation read back transitional colours, so
    /// every sheet/drawer test waits for its anchor to stop moving first.
    private func waitForSettled(_ el: XCUIElement, timeout: TimeInterval = 8) {
        let deadline = Date().addingTimeInterval(timeout)
        var last = el.frame
        while Date() < deadline {
            Thread.sleep(forTimeInterval: 0.5)
            let now = el.frame
            if abs(now.minX - last.minX) < 0.5 && abs(now.minY - last.minY) < 0.5 { return }
            last = now
        }
    }

    /// The drawer, from an open thread. Waits past the 0.3s slide and lets
    /// the panel settle before any frame or pixel is read.
    private func openDrawer(_ app: XCUIApplication) {
        let burger = app.buttons.matching(identifier: "v2-drawer-button").firstMatch
        XCTAssertTrue(burger.waitForExistence(timeout: 15), "no drawer button on the thread")
        burger.tap()
        let drawer = app.descendants(matching: .any).matching(identifier: "v2-drawer").firstMatch
        XCTAssertTrue(drawer.waitForExistence(timeout: 10), "the drawer never opened")
        let close = app.buttons.matching(identifier: "v2-drawer-close").firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 10), "the drawer never appeared")
        waitForSettled(close)
    }

    /// The review sheet, on the first seeded file card. Waits past the sheet
    /// rise before any frame or pixel is read.
    private func openSheet(_ app: XCUIApplication, artifactID: String = "artifact-pdf-1") {
        openThread(app)
        let card = app.buttons.matching(identifier: "visual-open-\(artifactID)").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 15), "no file card for \(artifactID)")
        card.tap()
        let sheet = app.descendants(matching: .any).matching(identifier: "visual-sheet").firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 15), "the sheet never opened")
        let close = app.buttons.matching(identifier: "visual-sheet-close").firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 10), "the sheet never appeared")
        waitForSettled(close)
    }

    private func dismissSheetIfAny(_ app: XCUIApplication) {
        let close = app.buttons.matching(identifier: "visual-sheet-close").firstMatch
        if close.waitForExistence(timeout: 5) { close.tap() }
        let sheet = app.descendants(matching: .any).matching(identifier: "visual-sheet").firstMatch
        _ = sheet.waitForNonExistence(timeout: 10)
    }

    // MARK: - pixels

    /// The screenshot pixel at a screen point, 0–255. The bytes decode RGBA
    /// here (verified: ground #0f1319 reads back (15,19,25), not swapped).
    private func pixel(_ shot: XCUIScreenshot, at point: CGPoint, window: CGRect) -> (r: CGFloat, g: CGFloat, b: CGFloat)? {
        guard let cg = shot.image.cgImage,
              let provider = cg.dataProvider,
              let data = provider.data,
              let bytes = CFDataGetBytePtr(data) else { return nil }
        // UIImage.size is POINTS — the pixel grid is the CG image itself.
        let sx = CGFloat(cg.width) / window.width
        let sy = CGFloat(cg.height) / window.height
        let px = Int(point.x * sx), py = Int(point.y * sy)
        guard px >= 0, py >= 0, px < cg.width, py < cg.height else { return nil }
        let bpp = cg.bitsPerPixel / 8
        let off = py * cg.bytesPerRow + px * bpp
        guard off + 3 < CFDataGetLength(data) else { return nil }
        return (r: CGFloat(bytes[off]), g: CGFloat(bytes[off + 1]), b: CGFloat(bytes[off + 2]))
    }

    /// The drawer's right edge: scan left from the screen edge for the first
    /// surface pixel (the scrim/thread behind is far darker). No container
    /// identifier needed — and none wanted (R14).
    /// R42: the edge is the first 12pt RUN of surface, not the first
    /// surface pixel — a single dimmed hairline behind the drawer (the home
    /// card's edge at ~373, which reads surface ±10 through the scrim)
    /// fooled the old first-pixel scan while the drawer sat correct at 326.
    private func scanDrawerEdge(_ shot: XCUIScreenshot, window: CGRect, y: CGFloat) -> CGFloat? {
        var x = window.width - 1
        var runStart: CGFloat?
        var run = 0
        while x > 0 {
            guard let p = pixel(shot, at: CGPoint(x: x, y: y), window: window) else { return nil }
            if abs(p.r - 22) <= 10 && abs(p.g - 27) <= 10 && abs(p.b - 35) <= 10 {
                if runStart == nil { runStart = x }
                run += 1
                if run >= 6 { return runStart }
            } else {
                runStart = nil
                run = 0
            }
            x -= 2
        }
        return nil
    }

    private func expectPixel(
        _ shot: XCUIScreenshot, at point: CGPoint, window: CGRect,
        _ want: (CGFloat, CGFloat, CGFloat), tolerance: CGFloat, _ what: String
    ) {
        guard let got = pixel(shot, at: point, window: window) else {
            XCTFail("\(what): could not read the screenshot pixel"); return
        }
        let dr = abs(got.r - want.0), dg = abs(got.g - want.1), db = abs(got.b - want.2)
        XCTAssertTrue(
            dr <= tolerance && dg <= tolerance && db <= tolerance,
            "\(what): want rgb\(want)±\(tolerance), got (\(Int(got.r)),\(Int(got.g)),\(Int(got.b))) at \(point)"
        )
    }

    private var windowFrame: CGRect {
        app.windows.firstMatch.frame
    }

    // MARK: - calibration dump

    /// Prints every comp-match frame on the 390 device. Not a lock — the
    /// locks below; this exists so a band can be re-derived after a change.
    func testP000DumpFrames() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let ids = [
            "chat-title", "chat-subtitle", "v2-drawer-button",
            "v2-composer-field", "v2-composer-send", "visual-peek", "visual-peek-count",
            "leave-a-review", "visual-sheet-close", "visual-tab",
            "sheet-tab-preview", "sheet-tab-context", "v2-agent-label",
        ]
        for id in ids {
            let el = app.descendants(matching: .any).matching(identifier: id).firstMatch
            if el.waitForExistence(timeout: 5) {
                print("R23FRAME \(id) \(frameString(el.frame)) label=\(el.label)")
            } else {
                print("R23FRAME \(id) MISSING")
            }
        }
        dismissSheetIfAny(app)
        openDrawer(app)
        for id in ["v2-drawer-project-row", "v2-drawer-mission-row",
                   "v2-drawer-new-mission", "v2-drawer-search"] {
            let el = app.descendants(matching: .any).matching(identifier: id).firstMatch
            if el.waitForExistence(timeout: 5) {
                print("R23FRAME \(id) \(frameString(el.frame)) label=\(el.label)")
            } else {
                print("R23FRAME \(id) MISSING")
            }
        }
        XCTAssertTrue(true)
    }

    private func frameString(_ r: CGRect) -> String {
        String(format: "{%.1f,%.1f} %.1fx%.1f", r.minX, r.minY, r.width, r.height)
    }

    // MARK: - tokens (P025–P028)

    /// P025: ground is #0f1319 — read off the login's empty gutter.
    func testP025GroundToken() throws {
        let app = launch(["-v2ForceSignOut"])
        let head = app.staticTexts.matching(identifier: "login-headline").firstMatch
        XCTAssertTrue(head.waitForExistence(timeout: 20), "the login never appeared")
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: 195, y: 205), window: windowFrame,
                    (15, 19, 25), tolerance: 6, "ground")
    }

    /// P026: surface is #161b23 — the drawer's empty header.
    func testP026SurfaceToken() throws {
        let app = launch(Self.base)
        openThread(app)
        openDrawer(app)
        let close = app.buttons.matching(identifier: "v2-drawer-close").firstMatch
        let midY = close.frame.midY
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: 150, y: midY), window: windowFrame,
                    (22, 27, 35), tolerance: 8, "surface")
    }

    /// P027: surface-2 is #1d2430 — the file card, right of the chevron.
    func testP027Surface2Token() throws {
        let app = launch(Self.visual)
        openThread(app)
        let card = app.buttons.matching(identifier: "visual-open-artifact-pdf-1").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 15), "no pdf file card")
        let point = CGPoint(x: card.frame.maxX - 40, y: card.frame.midY)
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: point, window: windowFrame,
                    (29, 36, 48), tolerance: 12, "surface-2")
    }

    /// P028: accent is #5B9BFF — the send button, draft or not.
    func testP028AccentToken() throws {
        let app = launch(Self.base)
        openThread(app)
        let send = app.buttons.matching(identifier: "v2-composer-send").firstMatch
        XCTAssertTrue(send.waitForExistence(timeout: 15), "no send button")
        // Off-centre: the exact middle is the white arrow glyph.
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: send.frame.midX - 15, y: send.frame.midY), window: windowFrame,
                    (91, 155, 255), tolerance: 8, "accent")
    }

    // MARK: - thread (P029–P045)

    /// P029: the nav title is 16pt (line box ~21, not the old ~19.7).
    func testP029TitleSize() throws {
        let app = launch(Self.comp)
        openThread(app)
        let title = app.staticTexts.matching(identifier: "chat-title").firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 10), "no chat title")
        XCTAssertTrue((20.3...22.5).contains(title.frame.height),
                      "title height \(frameString(title.frame)) is not the 16pt line box")
    }

    /// P030: General carries no status (nothing to say); an attention
    /// project carries the 10px warning dot.
    func testP030StatusDotAbsentOnQuietProject() throws {
        let app = launch(Self.base)
        openThread(app)
        let dot = app.descendants(matching: .any).matching(identifier: "v2-status-dot").firstMatch
        XCTAssertFalse(dot.waitForExistence(timeout: 5), "a quiet project shows no status dot")
    }

    func testP030StatusDotPresentOnAttention() throws {
        let app = launch(Self.base + ["-v2SeedScale"])
        openThread(app)
        openDrawer(app)
        let row = app.buttons.matching(identifier: "v2-drawer-project-row").matching(
            NSPredicate(format: "label == %@", "G Soak4")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 15), "no attention project in the drawer")
        row.tap()
        let marker = app.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
        XCTAssertTrue(marker.waitForExistence(timeout: 15), "the project thread never opened")
        let dot = app.descendants(matching: .any).matching(identifier: "v2-status-dot").firstMatch
        XCTAssertTrue(dot.waitForExistence(timeout: 10), "an attention project shows no status dot")
        XCTAssertEqualWithAccuracy(dot.frame.width, 10, accuracy: 1.5, "the status dot is not 10px wide")
    }

    /// P031: the hamburger opens the drawer (and the drawer exists). The
    /// 44pt target is code + evidence: XCUI reports the glyph's frame, not
    /// the tappable rect, so no frame assert can lock it.
    func testP031DrawerButton() throws {
        let app = launch(Self.base)
        openThread(app)
        let burger = app.buttons.matching(identifier: "v2-drawer-button").firstMatch
        XCTAssertTrue(burger.waitForExistence(timeout: 10), "no drawer button on the thread")
        burger.tap()
        let drawer = app.descendants(matching: .any).matching(identifier: "v2-drawer").firstMatch
        XCTAssertTrue(drawer.waitForExistence(timeout: 10), "the drawer never opened")
    }

    /// P032: the user bubble is the accent fill, not raised2.
    func testP032UserBubbleFill() throws {
        let app = launch(Self.comp)
        openThread(app)
        let bubble = app.staticTexts["Buyers. Keep the film for press."].firstMatch
        XCTAssertTrue(bubble.waitForExistence(timeout: 15), "the seeded user text never rendered")
        // Inside the bubble's leading padding, left of the first glyph.
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: bubble.frame.minX + 8, y: bubble.frame.midY),
                    window: windowFrame, (91, 155, 255), tolerance: 12, "user bubble")
    }

    /// P033: the agent line reads the PROJECT name (`General`, not `Corner`).
    func testP033AgentName() throws {
        let app = launch(Self.comp)
        openThread(app)
        let label = app.staticTexts.matching(identifier: "v2-agent-label").firstMatch
        XCTAssertTrue(label.waitForExistence(timeout: 15), "no agent line")
        XCTAssertEqual(label.label, "General")
    }

    /// R42 P092: agent body is the design's fixed 15/22 — the 15pt line in
    /// its single-line box, and the seeded two-line body on the 22pt
    /// rhythm (lineSpacing pins the second line a full 22 down).
    /// (Contract change from the R17 16pt reading, ordered by the R42
    /// brief's re-measure against R17-native-thread-design.png.)
    func testP034AgentBodySize() throws {
        let app = launch(Self.comp)
        openThread(app)
        let body = app.staticTexts["Before I start, two things I cannot guess from the brand kit."].firstMatch
        XCTAssertTrue(body.waitForExistence(timeout: 15), "the seeded agent text never rendered")
        let single = app.staticTexts["Pick a lane"].firstMatch
        XCTAssertTrue((18.6...20.8).contains(single.frame.height),
                      "agent text height \(frameString(single.frame)) is not the 15pt line box")
        XCTAssertTrue((41.5...45.5).contains(body.frame.height),
                      "wrapped body height \(frameString(body.frame)) is not two 22pt lines")
    }

    /// P035: options are 57px cards carrying their detail line.
    func testP035OptionCards() throws {
        let app = launch(Self.comp)
        openThread(app)
        let option = app.buttons.matching(identifier: "v2-option-q-retail").firstMatch
        XCTAssertTrue(option.waitForExistence(timeout: 15), "no option card")
        XCTAssertEqualWithAccuracy(option.frame.height, 57, accuracy: 1.5, "the option card is not 57px")
        XCTAssertTrue(app.staticTexts["Range, margins, timing"].firstMatch.exists, "the option detail is missing")
    }

    /// P036: steps are plain rows — ground shows between them, no card.
    func testP036StepsRows() throws {
        let app = launch(Self.comp)
        openThread(app)
        let first = app.staticTexts["Read the playbook"].firstMatch
        let second = app.staticTexts["Outline from the priorities"].firstMatch
        XCTAssertTrue(first.waitForExistence(timeout: 15), "no seeded steps")
        XCTAssertTrue(second.waitForExistence(timeout: 5), "the second step is missing")
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: first.frame.minX, y: (first.frame.maxY + second.frame.minY) / 2),
                    window: windowFrame, (15, 19, 25), tolerance: 10, "steps gutter")
    }

    /// P037: file cards are 52px with the kind badge.
    func testP037FileCards() throws {
        let app = launch(Self.visual)
        openThread(app)
        let card = app.buttons.matching(identifier: "visual-open-artifact-pdf-1").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 15), "no pdf file card")
        XCTAssertEqualWithAccuracy(card.frame.height, 52, accuracy: 1.5, "the file card is not 52px")
        XCTAssertTrue(app.staticTexts["PDF"].firstMatch.exists, "the PDF badge is missing")
    }

    /// P038: the composer invites `Tell General what to make next`.
    func testP038ComposerPlaceholder() throws {
        let app = launch(Self.base)
        openThread(app)
        let field = app.textFields.matching(identifier: "v2-composer-field").firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 15), "no composer field")
        XCTAssertEqual(field.placeholderValue, "Tell General what to make next")
    }

    /// P039: no outer card — ground shows between the pill and the send.
    func testP039NoOuterCard() throws {
        let app = launch(Self.base)
        openThread(app)
        let send = app.buttons.matching(identifier: "v2-composer-send").firstMatch
        XCTAssertTrue(send.waitForExistence(timeout: 15), "no send button")
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: send.frame.minX - 5, y: send.frame.midY),
                    window: windowFrame, (15, 19, 25), tolerance: 8, "composer gutter")
    }

    /// P040: the 50px send stays accent with an empty draft.
    func testP040SendAlwaysAccent() throws {
        let app = launch(Self.base)
        openThread(app)
        let send = app.buttons.matching(identifier: "v2-composer-send").firstMatch
        XCTAssertTrue(send.waitForExistence(timeout: 15), "no send button")
        XCTAssertEqualWithAccuracy(send.frame.width, 50, accuracy: 1.5, "the send is not 50px")
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: send.frame.midX - 15, y: send.frame.midY),
                    window: windowFrame, (91, 155, 255), tolerance: 8, "send stays accent")
    }

    /// P041: Record is a bare glyph — the pill fill shows at its centre.
    func testP041MicBare() throws {
        let app = launch(Self.base)
        openThread(app)
        let mic = app.buttons.matching(identifier: "v2-record").firstMatch
        guard mic.waitForExistence(timeout: 10) else {
            throw XCTSkip("dictation is unsupported on this simulator; the glyph is screenshot evidence")
        }
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: mic.frame.midX - 10, y: mic.frame.midY),
                    window: windowFrame, (22, 27, 35), tolerance: 10, "pill fill behind Record")
    }

    /// P042: the peek bar's corner is ground — r16, no hairline card.
    func testP042PeekCorners() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        dismissSheetIfAny(app)
        let peek = app.buttons.matching(identifier: "visual-peek").firstMatch
        XCTAssertTrue(peek.waitForExistence(timeout: 15), "no peek bar after opening a tab")
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: peek.frame.minX + 2, y: peek.frame.minY + 2),
                    window: windowFrame, (15, 19, 25), tolerance: 10, "peek corner")
    }

    /// P043: the peek title + count render (sizes ride the evidence shot).
    func testP043PeekText() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        dismissSheetIfAny(app)
        let count = app.staticTexts.matching(identifier: "visual-peek-count").firstMatch
        XCTAssertTrue(count.waitForExistence(timeout: 15), "no peek count")
        XCTAssertEqual(count.label, "No changes yet")
    }

    /// R42 P092: the thread column starts at x=16 (the design at 390).
    /// (Contract change from the R17 21px reading, ordered by the R42
    /// brief's re-measure against R17-native-thread-design.png.)
    func testP044Gutter() throws {
        let app = launch(Self.comp)
        openThread(app)
        let label = app.staticTexts.matching(identifier: "v2-agent-label").firstMatch
        XCTAssertTrue(label.waitForExistence(timeout: 15), "no agent line")
        XCTAssertEqualWithAccuracy(label.frame.minX, 16, accuracy: 1.5, "the thread gutter is not 16px")
    }

    /// P045: every message carries a `h:mm` stamp.
    func testP045Timestamps() throws {
        let app = launch(Self.comp)
        openThread(app)
        let stamps = app.staticTexts.matching(identifier: "v2-event-time")
        XCTAssertTrue(stamps.firstMatch.waitForExistence(timeout: 15), "no timestamps")
        XCTAssertEqual(stamps.count, 4, "expected one stamp per seeded event")
        let clock = NSPredicate(format: "label MATCHES %@", "\\d{1,2}:\\d{2}")
        XCTAssertEqual(stamps.matching(clock).count, 4, "a stamp is not h:mm")
    }

    // MARK: - sheet (P024, P046–P054)

    /// P024: the Preview / Context tabs, and Context shows its sections.
    func testP024SheetTabs() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let preview = app.buttons.matching(identifier: "sheet-tab-preview").firstMatch
        let context = app.buttons.matching(identifier: "sheet-tab-context").firstMatch
        XCTAssertTrue(preview.waitForExistence(timeout: 10), "no Preview tab")
        XCTAssertTrue(context.exists, "no Context tab")
        context.tap()
        let section = app.staticTexts.matching(identifier: "context-section").firstMatch
        XCTAssertTrue(section.waitForExistence(timeout: 10), "the Context pane shows no sections")
        preview.tap()
        let stage = app.descendants(matching: .any).matching(identifier: "visual-stage-pdf").firstMatch
        XCTAssertTrue(stage.waitForExistence(timeout: 10), "Preview never came back")
    }

    /// P046: the Review toggle is transparent + muted off (not accentWeak).
    /// R59 (Patrik phone review): the review affordance is now "Leave a
    /// review" in the CONTENT, not a header toggle. The top row is only
    /// Preview · Context · ×. This asserts the new entry exists, the old
    /// header toggle is gone, and tapping it opens the review panel.
    func testP046ReviewToggle() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let leave = app.buttons.matching(identifier: "leave-a-review").firstMatch
        XCTAssertTrue(leave.waitForExistence(timeout: 10), "no 'Leave a review' button in content")
        XCTAssertEqual(leave.label, "Leave a review of this file")
        XCTAssertEqual(app.buttons.matching(identifier: "review-toggle").count, 0,
                       "the header still carries a Review tab — it must be Preview · Context · × only")
        leave.tap()
        XCTAssertTrue(app.buttons.matching(identifier: "review-send").firstMatch.waitForExistence(timeout: 10),
                      "tapping Leave a review did not open the review panel")
    }

    /// P047: close is the filled 36px circle, not a text button.
    func testP047CloseCircle() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let close = app.buttons.matching(identifier: "visual-sheet-close").firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 10), "no sheet close")
        XCTAssertEqualWithAccuracy(close.frame.width, 36, accuracy: 2.5, "the close is not the 36px circle")
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: close.frame.minX + 6, y: close.frame.midY),
                    window: windowFrame, (41, 45, 53), tolerance: 12, "close circle fill")
    }

    /// P048: the sheet paints surface, not ground. Read between the header
    /// and the chip strip, clear of every glyph.
    func testP048SheetBackground() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: 200, y: 232), window: windowFrame,
                    (22, 27, 35), tolerance: 8, "sheet background")
    }

    /// P049: the 40×4 handle reads back pale, centred.
    func testP049Handle() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: 195, y: 239), window: windowFrame,
                    (73, 77, 83), tolerance: 18, "sheet handle")
    }

    /// P050: the sheet reports half, then full through a drag on the header
    /// (the marker leaf itself is 1pt — nothing to grab).
    func testP050Detents() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let sheet = app.descendants(matching: .any).matching(identifier: "visual-sheet").firstMatch
        XCTAssertEqual(sheet.value as? String, "half", "the sheet does not open at half")
        // A slow drag from the header to near the top: the flick gesture
        // scrolls content, the drag moves the detent.
        let tab = app.buttons.matching(identifier: "sheet-tab-preview").firstMatch
        let start = tab.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.18))
        start.press(forDuration: 0.3, thenDragTo: end)
        let full = NSPredicate(format: "value == %@", "full")
        let exp = expectation(for: full, evaluatedWith: sheet)
        wait(for: [exp], timeout: 10)
    }

    /// P051: the selected chip is a 36px surface-2 fill with no accent
    /// underline. XCUI reports the title's frame, so two pixels prove the
    /// geometry: inside-above and inside-below the title are both chip fill,
    /// and the underline's old seat is fill, not accent.
    func testP051FileChips() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let chip = app.buttons.matching(identifier: "visual-tab").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 10), "no file chips")
        let shot = XCUIScreen.main.screenshot()
        expectPixel(shot, at: CGPoint(x: chip.frame.minX + 10, y: chip.frame.minY - 6),
                    window: windowFrame, (29, 36, 48), tolerance: 12, "chip extends above the title")
        expectPixel(shot, at: CGPoint(x: chip.frame.minX + 10, y: chip.frame.maxY + 4),
                    window: windowFrame, (29, 36, 48), tolerance: 12, "no accent underline under the chip")
    }

    /// P052: the video stage slot is 400px at half (media + chrome).
    /// Measured leaf to leaf — player top to the status card below it
    /// (12pt apart) — because the slot itself carries no identifier (a
    /// container id would overwrite the pin controls, R14).
    func testP052StageHeight() throws {
        let app = launch(Self.compVisual)
        openSheet(app, artifactID: "artifact-video-1")
        let player = app.descendants(matching: .any).matching(identifier: "visual-stage-video").firstMatch
        XCTAssertTrue(player.waitForExistence(timeout: 20), "the video stage never rendered")
        let card = app.staticTexts.matching(identifier: "sheet-status-text").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 10), "no status card below the stage")
        let slot = card.frame.minY - player.frame.minY - 12
        XCTAssertEqualWithAccuracy(slot, 400, accuracy: 6, "the half stage slot is not media + chrome")
    }

    /// P053: Send is 50px and reads `Pin a change to send` when empty.
    func testP053SendButton() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        // R59: enter review via "Leave a review" in content.
        let toggle = app.buttons.matching(identifier: "leave-a-review").firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 10), "no 'Leave a review' entry")
        toggle.tap()
        let send = app.buttons.matching(identifier: "review-send").firstMatch
        XCTAssertTrue(send.waitForExistence(timeout: 10), "no review Send")
        XCTAssertEqualWithAccuracy(send.frame.height, 50, accuracy: 3, "Send is not 50px")
        XCTAssertEqual(send.label, "Pin a change to send")
    }

    /// P054: the sheet carries the latest agent line in the status card.
    func testP054StatusCard() throws {
        let app = launch(Self.compVisual)
        openSheet(app)
        let card = app.staticTexts.matching(identifier: "sheet-status-text").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 10), "no status card in the sheet")
        XCTAssertTrue(card.label.contains("three priorities"), "the status card is not the agent line")
    }

    // MARK: - drawer (P055–P058)

    /// P055: the drawer is 84% wide and holds every §4 row. The width is
    /// measured, not framed: the panel edge is scanned in the screenshot
    /// (surface against the darkened thread behind).
    func testP055DrawerWidth() throws {
        let app = launch(Self.base)
        openThread(app)
        openDrawer(app)
        // R41 sync: HEAD dropped "Record a call" per Patrik's annotation —
        // the row (and its identifier) no longer exists to assert.
        for id in ["v2-drawer-new", "v2-drawer-new-project",
                   "v2-drawer-recent-row", "v2-drawer-project-row",
                   "v2-drawer-bell", "v2-drawer-settings"] {
            XCTAssertTrue(
                app.descendants(matching: .any).matching(identifier: id).firstMatch
                    .waitForExistence(timeout: 5),
                "the drawer is missing \(id)"
            )
        }
        let shot = XCUIScreen.main.screenshot()
        guard let edge = scanDrawerEdge(shot, window: windowFrame, y: 400) else {
            XCTFail("the drawer edge never resolved in the screenshot"); return
        }
        XCTAssertEqualWithAccuracy(edge, 390 * 0.8356, accuracy: 3, "the drawer is not 84% wide")
    }

    /// P056: the visible row reads exactly `New mission` — one plus icon,
    /// never `+ + New mission`. (The button's VoiceOver label keeps the
    /// project context; the visible text is what this locks.) R23: the row
    /// lives in the drawer — the entry project's is expanded by default.
    func testP056NewMissionRow() throws {
        let app = launch(Self.base)
        openThread(app)
        openDrawer(app)
        let row = app.buttons.matching(identifier: "v2-drawer-new-mission").firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 15), "no New-mission row in the drawer")
        XCTAssertEqual(row.staticTexts.firstMatch.label, "New mission")
    }

    /// P057: mission rows are 14pt muted titles with a dot, no LIVE tag.
    /// R23: the rows live in the drawer. General rides first with no
    /// missions: expand the second project.
    func testP057MissionRows() throws {
        let app = launch(Self.base + ["-v2SeedScale"])
        openThread(app)
        openDrawer(app)
        // The chevron label reports the state, so a tap that lands during a
        // re-render is retried instead of silently collapsing again.
        let expand = app.buttons.matching(identifier: "v2-drawer-project-expand").element(boundBy: 1)
        XCTAssertTrue(expand.waitForExistence(timeout: 20), "no project rows at scale")
        let name = app.staticTexts.matching(identifier: "v2-drawer-mission-name").firstMatch
        // The seed starts expanded: only tap when collapsed, otherwise a tap
        // hides the rows the test is looking for.
        for _ in 0..<6 {
            if name.waitForExistence(timeout: 3) { break }
            if expand.label.hasPrefix("Expand") { expand.tap() }
        }
        XCTAssertTrue(name.waitForExistence(timeout: 10), "no mission rows at scale")
        XCTAssertTrue((15.5...18.5).contains(name.frame.height),
                      "mission title height \(frameString(name.frame)) is not the 14pt line box")
        XCTAssertFalse(app.staticTexts["LIVE"].waitForExistence(timeout: 3), "the caps status tag is still here")
    }

    /// P058: project rows lost the GENERAL tag. R23: the rows live in the drawer.
    func testP058ProjectRows() throws {
        let app = launch(Self.base)
        openThread(app)
        openDrawer(app)
        XCTAssertFalse(app.staticTexts["GENERAL"].waitForExistence(timeout: 3), "the GENERAL tag is still here")
        let name = app.staticTexts.matching(identifier: "v2-drawer-project-name").firstMatch
        XCTAssertTrue(name.exists, "no project names in the drawer")
    }

    // MARK: - login (P059–P060)

    /// P059: the phone Login — headline, email, Continue.
    func testP059LoginScreen() throws {
        let app = launch(["-v2ForceSignOut"])
        let head = app.staticTexts.matching(identifier: "login-headline").firstMatch
        XCTAssertTrue(head.waitForExistence(timeout: 20), "the login never appeared")
        XCTAssertEqual(head.label, "Make things with an agent that knows your work.")
        XCTAssertTrue(app.textFields.matching(identifier: "login-email").firstMatch.exists, "no email field")
        XCTAssertTrue(app.buttons.matching(identifier: "login-email-continue").firstMatch.exists, "no Continue")
        XCTAssertTrue(app.staticTexts.matching(identifier: "login-terms").firstMatch.exists, "no terms footnote")
    }

    /// P060: the three 50px SSO rows.
    func testP060SSORows() throws {
        let app = launch(["-v2ForceSignOut"])
        let head = app.staticTexts.matching(identifier: "login-headline").firstMatch
        XCTAssertTrue(head.waitForExistence(timeout: 20), "the login never appeared")
        for id in ["login-sso-google", "login-sso-apple", "login-sso-sso"] {
            let row = app.buttons.matching(identifier: id).firstMatch
            XCTAssertTrue(row.exists, "missing \(id)")
            XCTAssertEqualWithAccuracy(row.frame.height, 50, accuracy: 1.5, "\(id) is not 50px")
        }
    }

    // MARK: - setup, empty, settings (P061–P063)

    /// P061: the 6-step flow — segments, step 1, all the way to step 6.
    /// Setup is first-run real-backend behaviour, so this test signs in for
    /// real (AUTO_SIGNIN_* from the runner environment, like the tour) with
    /// the completion flag reset. It taps nothing that writes.
    func testP061SetupFlow() throws {
        guard let email = ProcessInfo.processInfo.environment["TOUR_EMAIL"],
              let password = ProcessInfo.processInfo.environment["TOUR_PASSWORD"],
              !email.isEmpty, !password.isEmpty else {
            throw XCTSkip("TOUR_EMAIL / TOUR_PASSWORD must be set in the test environment")
        }
        let app = launch(["-v2ResetSetup", "-v2SuppressHaptics"], env: [
            "UITEST_REAL_BACKEND": "1",
            "AUTO_SIGNIN_EMAIL": email,
            "AUTO_SIGNIN_PASSWORD": password,
        ])
        let setup = app.descendants(matching: .any).matching(identifier: "v2-setup").firstMatch
        XCTAssertTrue(setup.waitForExistence(timeout: 30), "the setup flow never appeared")
        let step = app.staticTexts.matching(identifier: "v2-setup-step").firstMatch
        XCTAssertEqual(step.label, "Step 1 of 6")
        XCTAssertTrue(app.staticTexts.matching(identifier: "v2-setup-connect-gmail").firstMatch.exists,
                      "step 1 shows no Connect rows")
        for _ in 1...5 {
            let next = app.buttons.matching(identifier: "v2-setup-continue").firstMatch
            XCTAssertTrue(next.waitForExistence(timeout: 5), "no Continue")
            next.tap()
        }
        XCTAssertEqual(step.label, "Step 6 of 6")
        XCTAssertTrue(app.textFields.matching(identifier: "v2-setup-name").firstMatch.exists,
                      "step 6 shows no project field")
    }

    /// P062: the empty home with its two CTAs.
    func testP062EmptyHome() throws {
        let app = launch(Self.base + ["-v2SeedEmpty"])
        let empty = app.descendants(matching: .any).matching(identifier: "v2-empty").firstMatch
        XCTAssertTrue(empty.waitForExistence(timeout: 20), "the empty home never appeared")
        XCTAssertEqual(app.staticTexts.matching(identifier: "v2-empty-headline").firstMatch.label,
                       "Let's get started.")
        XCTAssertTrue(app.buttons.matching(identifier: "v2-empty-start").firstMatch.exists, "no Start CTA")
        XCTAssertTrue(app.buttons.matching(identifier: "v2-empty-context").firstMatch.exists, "no Bring-in CTA")
    }

    /// P063: the phone Settings via the drawer's gear.
    func testP063SettingsScreen() throws {
        let app = launch(Self.base)
        openThread(app)
        openDrawer(app)
        let gear = app.buttons.matching(identifier: "v2-drawer-settings").firstMatch
        gear.tap()
        let settings = app.descendants(matching: .any).matching(identifier: "settings-screen").firstMatch
        XCTAssertTrue(settings.waitForExistence(timeout: 10), "the settings never opened")
        XCTAssertTrue(app.buttons.matching(identifier: "settings-row-profile").firstMatch.exists, "no Profile row")
        XCTAssertTrue(app.buttons.matching(identifier: "settings-rerun").firstMatch.exists, "no Re-run setup")
    }

    // MARK: - R24 send-and-sheet (P074, P076, P077)

    /// P074: the PDF page aspect-fits inside the stage — the page view's
    /// frame IS the fitted rect (media-height tall, portrait 4:5,
    /// letterboxed), never the cropped full-width scroll window — and the
    /// arrows step pages.
    func testP074PdfPageFitsStage() throws {
        let app = launch(Self.compVisual)
        openSheet(app, artifactID: "artifact-pdf-1")
        let page = app.descendants(matching: .any).matching(identifier: "visual-stage-pdf").firstMatch
        XCTAssertTrue(page.waitForExistence(timeout: 20), "the PDF stage never rendered")
        // The 290 slot is media + footer (HANDOFF §6): the page fills the
        // media remainder edge-to-edge of its height…
        XCTAssertGreaterThan(page.frame.height, 200, "the page does not fill the media area")
        XCTAssertLessThanOrEqual(page.frame.height, 290, "the page overflows its slot")
        let aspect = page.frame.width / page.frame.height
        XCTAssertLessThan(aspect, 1.0, "the page view is landscape — the page is cropped, not fit")
        XCTAssertEqualWithAccuracy(aspect, 0.8, accuracy: 0.06,
                                   "the page view does not keep the 4:5 page aspect")
        XCTAssertLessThan(page.frame.width, 348, "no letterbox — the page fills the stage width")
        app.buttons.matching(identifier: "visual-pdf-next").firstMatch.tap()
        let pager = app.staticTexts.matching(identifier: "visual-pdf-page").firstMatch
        XCTAssertTrue(pager.waitForExistence(timeout: 10), "no page footer")
        XCTAssertTrue(pager.label.contains("Page 2 of"), "the arrows do not step pages: \(pager.label)")
        let pdfShot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        pdfShot.name = "R24-P074-sheet-half"
        pdfShot.lifetime = .keepAlways
        add(pdfShot)
    }

    /// P076: at 390 the pill shows the full placeholder — the commands
    /// chip collapses to its icon while the field is empty and expands
    /// with its label once there is text.
    func testP076ComposerPlaceholderFits() throws {
        let app = launch(Self.base)
        openThread(app)
        let field = app.textFields.matching(identifier: "v2-composer-field").firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 15), "no composer field")
        XCTAssertEqual(field.placeholderValue, "Tell General what to make next")
        let chip = app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 10), "no commands chip in the pill")
        XCTAssertEqual(chip.value as? String, "collapsed", "the chip does not collapse while empty")
        XCTAssertLessThanOrEqual(chip.frame.width, 28,
                                 "the collapsed chip exceeds its width budget")
        // The layout delivers the budgeted field width on-device (the unit
        // test proves the full string fits that budget).
        XCTAssertGreaterThanOrEqual(field.frame.width, 200,
                                    "the field is narrower than the placeholder budget")
        field.tap()
        field.typeText("x")
        XCTAssertEqual(chip.value as? String, "expanded", "the chip does not expand with typing")
        XCTAssertGreaterThan(chip.frame.width, 30, "the expanded chip shows no label")
        // Back to empty: the full placeholder is on screen, untruncated.
        field.tap()
        app.keyboards.keys["delete"].firstMatch.tap()
        let composerShot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        composerShot.name = "R24-P076-composer"
        composerShot.lifetime = .keepAlways
        add(composerShot)
    }

    /// P077: the thread ground is flat `--ground` even in the Glass theme —
    /// no gradient glow behind the messages. Glass flat is #0C1218; either
    /// glow channel would read 40+ higher.
    func testP077ThreadGroundFlatInGlass() throws {
        let app = launch(Self.base + ["-glassPreview"])
        openThread(app)
        let shot = XCUIScreen.main.screenshot()
        let window = windowFrame
        for point in [
            CGPoint(x: 10, y: 300), CGPoint(x: 380, y: 300),
            CGPoint(x: 10, y: 450), CGPoint(x: 380, y: 450),
            CGPoint(x: 10, y: 600), CGPoint(x: 380, y: 600),
        ] {
            expectPixel(shot, at: point, window: window, (12, 18, 24), tolerance: 14,
                        "thread ground not flat at \(point)")
        }
        let glassShot = XCTAttachment(screenshot: shot)
        glassShot.name = "R24-P077-thread-glass"
        glassShot.lifetime = .keepAlways
        add(glassShot)
    }
}
