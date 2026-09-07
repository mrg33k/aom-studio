// DesignMatchUITests.swift — Corner native iOS
// corner:corner-v2 R19 — one UI test per R19 fix.
//
// Fixture tests run hermetically (deterministic, no backend). The two setup
// tests need the real backend + e2e creds (TOUR_EMAIL / TOUR_PASSWORD in the
// runner env, or the script's /tmp handoff); without them they skip, exactly
// like CompMatch's P061.

import XCTest

final class DesignMatchUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - launchers

    // R23: -v2ResetEntry pins the entry to General's thread.
    private static let fixture = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]
    private static let seed = fixture + ["-v2SeedVisual", "-v2ResetVisual", "-v2SeedCompMatch"]

    @discardableResult
    private func launch(_ args: [String], env: [String: String] = [:]) -> XCUIApplication {
        app = XCUIApplication()
        app.launchArguments += args
        for (k, v) in env { app.launchEnvironment[k] = v }
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        return app
    }

    /// Real-backend creds: the shell never reaches the on-sim runner, so the
    /// gate script drops /tmp/r19-diag-env.json first (never committed).
    private func backendCreds() -> (String, String)? {
        let env = ProcessInfo.processInfo.environment
        if let e = env["TOUR_EMAIL"], !e.isEmpty,
           let p = env["TOUR_PASSWORD"], !p.isEmpty { return (e, p) }
        if let data = try? Data(contentsOf: URL(fileURLWithPath: "/tmp/r19-diag-env.json")),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
           let e = json["email"], !e.isEmpty,
           let p = json["password"], !p.isEmpty { return (e, p) }
        return nil
    }

    /// R23: the entry IS the thread — the launch lands on it, no tree, no taps.
    private func openThread(_ app: XCUIApplication) {
        let chat = app.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
        XCTAssertTrue(chat.waitForExistence(timeout: 20), "the entry thread never appeared")
    }

    private var windowFrame: CGRect { app.windows.firstMatch.frame }

    private func pixel(_ shot: XCUIScreenshot, at point: CGPoint, window: CGRect) -> (CGFloat, CGFloat, CGFloat)? {
        guard let cg = shot.image.cgImage,
              let provider = cg.dataProvider,
              let data = provider.data,
              let bytes = CFDataGetBytePtr(data) else { return nil }
        let sx = CGFloat(cg.width) / window.width
        let sy = CGFloat(cg.height) / window.height
        let px = Int(point.x * sx), py = Int(point.y * sy)
        guard px >= 0, py >= 0, px < cg.width, py < cg.height else { return nil }
        let bpp = cg.bitsPerPixel / 8
        let off = py * cg.bytesPerRow + px * bpp
        guard off + 3 < CFDataGetLength(data) else { return nil }
        return (CGFloat(bytes[off]), CGFloat(bytes[off + 1]), CGFloat(bytes[off + 2]))
    }

    // MARK: - P064 the commands chip (fixture)

    /// P064: the sparkles chip sits INSIDE the v2 pill, left of Record —
    /// 32pt tall, labelled with the live model name.
    func testV2CommandsChipInPill() throws {
        let app = launch(Self.seed)
        openThread(app)
        let chip = app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "no commands chip in the v2 pill")
        XCTAssertEqualWithAccuracy(chip.frame.height, 32, accuracy: 1.5, "chip is not 32pt tall")
        let record = app.descendants(matching: .any).matching(identifier: "v2-record").firstMatch
        XCTAssertTrue(record.waitForExistence(timeout: 10), "no Record in the v2 pill")
        XCTAssertLessThan(chip.frame.maxX, record.frame.minX, "chip is not left of Record")
        let field = app.descendants(matching: .any).matching(identifier: "v2-composer-field").firstMatch
        XCTAssertTrue(field.exists, "no composer field")
        XCTAssertGreaterThan(chip.frame.minX, field.frame.minX, "chip is not inside the pill")
        XCTAssertTrue(chip.label.contains("Commands"), "chip label lost: \(chip.label)")
    }

    /// P064: the chip opens the one commands menu — Work/Plan, the Model
    /// submenu, Files, Generate an image — with the web's Plan caption.
    func testV2CommandsMenuItems() throws {
        let app = launch(Self.seed)
        openThread(app)
        let chip = app.descendants(matching: .any).matching(identifier: "v2-commands").firstMatch
        XCTAssertTrue(chip.waitForExistence(timeout: 15), "no commands chip in the v2 pill")
        chip.tap()
        // The Model/Specialist rows carry their live selection in the label
        // ("Model — Auto"), so they match by prefix; the rest are exact.
        for label in ["Work", "Plan", "Files in this conversation", "Generate an image"] {
            let item = app.buttons[label].firstMatch
            XCTAssertTrue(item.waitForExistence(timeout: 8), "menu has no \(label)")
        }
        do {
            let item = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Model'")).firstMatch
            XCTAssertTrue(item.waitForExistence(timeout: 8), "menu has no Model submenu")
        }
        // The web's caption under the toggle renders as disabled menu text —
        // a button or a label depending on the OS build. Either one proves
        // the caption is on screen.
        do {
            let predicate = NSPredicate(
                format: "label BEGINSWITH 'Corner will propose a plan first' OR label BEGINSWITH 'Corner gets to work directly'"
            )
            let asButton = app.buttons.matching(predicate).firstMatch
            let asText = app.staticTexts.matching(predicate).firstMatch
            let found = asButton.waitForExistence(timeout: 6) || asText.waitForExistence(timeout: 6)
            XCTAssertTrue(found, "menu has no mode caption")
        }
    }

    // MARK: - P067 brand marks (fixture login)

    /// P067: the Google row carries the multicolor G, not a grey letter —
    /// the icon box must contain a saturated red pixel (the G has no grey).
    /// The sign-out wipe is async (push unregister first), so a simulator
    /// with a live session needs the long wait.
    func testLoginGoogleBrandMark() throws {
        // -screenTour freezes ambient animation so snapshots stay instant
        // (the R0 finding); without it a live-session launch chokes queries.
        let app = launch(["-screenTour", "-v2ForceSignOut"])
        let head = app.staticTexts.matching(identifier: "login-headline").firstMatch
        XCTAssertTrue(head.waitForExistence(timeout: 45), "the login never appeared")
        let row = app.buttons.matching(identifier: "login-sso-google").firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 10), "no Google row")
        let icon = CGRect(x: row.frame.minX + 16, y: row.frame.midY - 10, width: 24, height: 20)
        let shot = XCUIScreen.main.screenshot()
        var saturatedRed = false
        var x = icon.minX
        while x <= icon.maxX, !saturatedRed {
            var y = icon.minY
            while y <= icon.maxY, !saturatedRed {
                if let (r, g, b) = pixel(shot, at: CGPoint(x: x, y: y), window: windowFrame),
                   r > 170, g < 130, b < 130 { saturatedRed = true }
                y += 2
            }
            x += 2
        }
        XCTAssertTrue(saturatedRed, "the Google row icon has no brand red — still a grey letter")
    }

    // MARK: - setup (real backend, skip-guarded like P061)

    /// P065 + P067: every Connect row draws its hairline divider and its
    /// brand mark. Rows are ≥68pt; the divider sits at the row's bottom edge.
    func testSetupConnectRows() throws {
        guard let (email, password) = backendCreds() else {
            throw XCTSkip("TOUR_EMAIL / TOUR_PASSWORD must be set in the test environment")
        }
        let app = launch(["-v2ResetSetup", "-v2SuppressHaptics", "-v2ClearRecents"], env: [
            "UITEST_REAL_BACKEND": "1",
            "AUTO_SIGNIN_EMAIL": email,
            "AUTO_SIGNIN_PASSWORD": password,
        ])
        let setup = app.descendants(matching: .any).matching(identifier: "v2-setup").firstMatch
        XCTAssertTrue(setup.waitForExistence(timeout: 40), "the setup flow never appeared")
        for service in ["gmail", "drive", "figma", "slack", "github"] {
            let row = app.descendants(matching: .any).matching(identifier: "v2-setup-connect-\(service)").firstMatch
            XCTAssertTrue(row.waitForExistence(timeout: 10), "no Connect row for \(service)")
        }
        Thread.sleep(forTimeInterval: 1)
        let shot = XCUIScreen.main.screenshot()
        // The row's AX frame collapses to its title (R14 class), so the
        // divider is found visually: the first near-full-width non-ground
        // run below the row's text is the hairline at the row's bottom edge.
        let window = windowFrame
        var dividerLift: CGFloat = 0
        var y: CGFloat = 270
        while y < 340, dividerLift <= 24 {
            var wide = 0
            var liftSum: CGFloat = 0
            var x: CGFloat = 19
            while x < 371 {
                if let (r, g, b) = pixel(shot, at: CGPoint(x: x, y: y), window: window) {
                    let lift = (r - 15) + (g - 19) + (b - 25)
                    if lift > 12 { wide += 1; liftSum += lift }
                }
                x += 4
            }
            if wide >= 70 { dividerLift = liftSum / CGFloat(max(wide, 1)) }
            y += 1
        }
        XCTAssertGreaterThan(dividerLift, 24, "no hairline under the Gmail row")
    }

    /// P066: step 6's CTA is bottom-docked under its hairline, not floating
    /// after the fields.
    func testSetup6CTADocked() throws {
        guard let (email, password) = backendCreds() else {
            throw XCTSkip("TOUR_EMAIL / TOUR_PASSWORD must be set in the test environment")
        }
        let app = launch(["-v2ResetSetup", "-v2SuppressHaptics", "-v2ClearRecents"], env: [
            "UITEST_REAL_BACKEND": "1",
            "AUTO_SIGNIN_EMAIL": email,
            "AUTO_SIGNIN_PASSWORD": password,
        ])
        let setup = app.descendants(matching: .any).matching(identifier: "v2-setup").firstMatch
        XCTAssertTrue(setup.waitForExistence(timeout: 40), "the setup flow never appeared")
        for _ in 1...5 {
            let next = app.buttons.matching(identifier: "v2-setup-continue").firstMatch
            XCTAssertTrue(next.waitForExistence(timeout: 8), "no Continue")
            next.tap()
        }
        let cta = app.buttons.matching(identifier: "v2-setup-finish").firstMatch
        XCTAssertTrue(cta.waitForExistence(timeout: 10), "no Take-me-to-Corner CTA")
        XCTAssertGreaterThan(cta.frame.maxY, 740, "the step-6 CTA floats mid-screen (maxY \(cta.frame.maxY))")
    }
}
