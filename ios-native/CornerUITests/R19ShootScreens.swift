// R19ShootScreens.swift — Corner native iOS
// corner:corner-v2 R19 — the native visual e2e evidence shooter.
//
// One test per design screen, against the REAL backend (production clone)
// with the e2e account (TOUR_EMAIL / TOUR_PASSWORD in the runner env,
// forwarded as AUTO_SIGNIN_*). Each test navigates to its screen, takes an
// XCTAttachment screenshot (exported from the xcresult by
// tools/native-design-vs-sim.mjs), and prints machine-readable lines:
//
//   R19STATUS <screen> ok|missing <detail>
//   R19FRAME <screen> <id> {x,y} wxh label=<label>
//   R19PIXEL <screen> <label> <r>,<g>,<b>
//
// The shooter never fails: a missing screen is a status, not an abort —
// the script (and DesignMatchUITests) is the gate. It never sends a
// message, never creates anything, never leaves a setting changed.

import XCTest

final class R19ShootScreens: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    // MARK: - launchers

    // R23: -v2ResetEntry pins the entry to General's thread on every launch —
    // the gate then navigates to the design's thread through the drawer,
    // deterministically, no matter what an earlier test left behind.
    private static let harness = ["-screenTour", "-v2SuppressHaptics", "-v2ClearRecents", "-v2ResetEntry"]

    /// Runner-side credentials: the shell environment does NOT reach the
    /// on-sim test runner (proven: R19PROBE runner-email-present=0), so the
    /// orchestrator's script writes /tmp/r19-diag-env.json from
    /// /tmp/corner-v2-e2e.env before launching. Never committed, never logged.
    private func runnerCreds() -> (String, String) {
        let env = ProcessInfo.processInfo.environment
        if let e = env["TOUR_EMAIL"], !e.isEmpty,
           let p = env["TOUR_PASSWORD"], !p.isEmpty { return (e, p) }
        if let data = try? Data(contentsOf: URL(fileURLWithPath: "/tmp/r19-diag-env.json")),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
           let e = json["email"], !e.isEmpty,
           let p = json["password"], !p.isEmpty { return (e, p) }
        return ("", "")
    }

    @discardableResult
    private func launch(_ args: [String], realBackend: Bool = true) -> XCUIApplication {
        app = XCUIApplication()
        app.launchArguments += args
        if realBackend {
            app.launchEnvironment["UITEST_REAL_BACKEND"] = "1"
            let (email, password) = runnerCreds()
            if !email.isEmpty { app.launchEnvironment["AUTO_SIGNIN_EMAIL"] = email }
            if !password.isEmpty { app.launchEnvironment["AUTO_SIGNIN_PASSWORD"] = password }
        }
        app.launch()
        return app
    }

    // MARK: - queries

    /// Gentle polling (one snapshot a second) rather than waitForExistence:
    /// on a saturated cold start the waiter's snapshot hammering starves the
    /// main thread it is waiting on (R23 gate-1: chat rendered in 5s, the
    /// waiter still found nothing in 30s).
    private func any(_ id: String, timeout: TimeInterval = 20) -> XCUIElement {
        let el = app.descendants(matching: .any).matching(identifier: id).firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if el.exists { break }
            Thread.sleep(forTimeInterval: 1)
        }
        return el
    }

    private func btn(_ id: String, timeout: TimeInterval = 15) -> XCUIElement {
        let el = app.buttons.matching(identifier: id).firstMatch
        _ = el.waitForExistence(timeout: timeout)
        return el
    }

    private func shot(_ screen: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "R19-\(screen)"
        attachment.lifetime = .keepAlways
        add(attachment)
        NSLog("R19STATUS \(screen) shot")
    }

    /// R23 P073: the element read waits for the sheet to settle — the dump
    /// runs only after the sheet anchor stops moving, and ids that still read
    /// MISSING get one more dump after a further settle, so the gate reads
    /// what the picture shows.
    private func frames(_ screen: String, _ ids: [String]) {
        settleSheetIfAny()
        let missing = dumpFrames(screen, ids)
        if !missing.isEmpty {
            settle(3)
            dumpFrames(screen, missing)
        }
    }

    @discardableResult
    private func dumpFrames(_ screen: String, _ ids: [String]) -> [String] {
        var missing: [String] = []
        for id in ids {
            let el = app.descendants(matching: .any).matching(identifier: id).firstMatch
            if el.waitForExistence(timeout: 4) {
                let f = el.frame
                NSLog(String(format: "R19FRAME %@ %@ {%.1f,%.1f} %.1fx%.1f label=%@",
                             screen, id, f.minX, f.minY, f.width, f.height,
                             el.label.replacingOccurrences(of: "\n", with: " ")))
            } else {
                NSLog("R19FRAME \(screen) \(id) MISSING")
                missing.append(id)
            }
        }
        return missing
    }

    /// The sheet anchor stops moving once the rise animation lands. Frames
    /// sampled mid-animation read back transitional rects and a stale tree.
    private func settleSheetIfAny() {
        let anchor = app.descendants(matching: .any).matching(identifier: "visual-sheet-close").firstMatch
        guard anchor.waitForExistence(timeout: 3) else { return }
        waitForStable(anchor, timeout: 8)
    }

    private func waitForStable(_ el: XCUIElement, timeout: TimeInterval) {
        var last = el.frame
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            Thread.sleep(forTimeInterval: 0.5)
            let now = el.frame
            if abs(now.minX - last.minX) < 0.5 && abs(now.minY - last.minY) < 0.5
                && abs(now.width - last.width) < 0.5 && abs(now.height - last.height) < 0.5 { return }
            last = now
        }
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

    private func sample(_ screen: String, _ label: String, _ point: CGPoint) {
        let shot = XCUIScreen.main.screenshot()
        if let (r, g, b) = pixel(shot, at: point, window: windowFrame) {
            NSLog("R19PIXEL \(screen) \(label) \(Int(r)),\(Int(g)),\(Int(b))")
        } else {
            NSLog("R19PIXEL \(screen) \(label) UNREADABLE")
        }
    }

    private func settle(_ seconds: TimeInterval = 1.5) {
        Thread.sleep(forTimeInterval: seconds)
    }

    // MARK: - shared navigation (real backend)

    /// R23: the entry IS a thread — signed in means the chat screen is up.
    /// False when sign-in did not complete.
    private func threadUp() -> Bool {
        any("chat-screen", timeout: 30).exists
    }

    /// The design's thread is the Spring launch deck mission: from the entry,
    /// through the drawer — expand Aster, tap the mission row. False when the
    /// tree has no such rows.
    @discardableResult
    private func openDesignThread() -> Bool {
        guard threadUp() else { return false }
        let title = app.staticTexts.matching(identifier: "chat-title").firstMatch
        if title.waitForExistence(timeout: 10), title.label == "Spring launch deck" { return true }
        guard openDrawer() else { return false }
        // Expand Aster when collapsed, then tap the mission row.
        let expands = app.buttons.matching(identifier: "v2-drawer-project-expand")
        if expands.firstMatch.waitForExistence(timeout: 10) {
            for i in 0..<expands.count {
                let exp = expands.element(boundBy: i)
                if exp.label.localizedCaseInsensitiveContains("aster") {
                    if exp.label.hasPrefix("Expand") { exp.tap() }
                    break
                }
            }
            Thread.sleep(forTimeInterval: 1)
        }
        if tapRow(id: "v2-drawer-mission-row", contains: "Spring launch deck") {
            // The old thread's chat-screen is still showing until the replace
            // lands — wait for the mission title, not just any chat.
            let want = app.staticTexts.matching(identifier: "chat-title").firstMatch
            let deadline = Date().addingTimeInterval(20)
            while Date() < deadline {
                if want.exists, want.label == "Spring launch deck" { return true }
                Thread.sleep(forTimeInterval: 0.5)
            }
        }
        return false
    }

    @discardableResult
    private func tapRow(id: String, contains text: String) -> Bool {
        let rows = app.buttons.matching(identifier: id)
        guard rows.firstMatch.waitForExistence(timeout: 10) else { return false }
        for i in 0..<rows.count {
            let row = rows.element(boundBy: i)
            if row.label.localizedCaseInsensitiveContains(text) {
                NSLog("R19STATUS thread-row %@ label=%@", id, row.label)
                row.tap()
                return true
            }
        }
        return false
    }

    @discardableResult
    private func openDrawer() -> Bool {
        let burger = btn("v2-drawer-button")
        guard burger.exists else { return false }
        burger.tap()
        settle(1.5)
        return any("v2-drawer", timeout: 10).exists
    }

    /// First file card (visual-open-*) or the peek bar opens the sheet.
    @discardableResult
    private func openSheet() -> Bool {
        // Any file card opens the sheet (identifier "visual-open-<artifactID>");
        // otherwise the peek bar above the composer does the same.
        let cards = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH 'visual-open-'"))
        let card = cards.firstMatch
        if card.waitForExistence(timeout: 8) {
            card.tap()
        } else {
            let peek = app.buttons.matching(identifier: "visual-peek").firstMatch
            guard peek.waitForExistence(timeout: 8) else { return false }
            peek.tap()
        }
        settle(1.5)
        // R23 P073: never hand a rising sheet to the shot/dump — the rise
        // must have landed first.
        guard any("visual-sheet", timeout: 15).exists else { return false }
        settleSheetIfAny()
        return true
    }

    // MARK: - screens

    func testShoot01Login() throws {
        let app = launch(Self.harness + ["-v2ForceSignOut"], realBackend: false)
        _ = app
        guard any("login-headline", timeout: 45).exists else {
            NSLog("R19STATUS login missing no-headline"); return
        }
        settle()
        shot("login")
        frames("login", ["login-headline", "login-sub", "login-email",
                         "login-email-continue", "login-sso-google",
                         "login-sso-apple", "login-sso-sso", "login-terms"])
        sample("login", "ground", CGPoint(x: 195, y: 205))
        NSLog("R19STATUS login ok")
    }

    func testShoot02Setup1() throws {
        launch(Self.harness + ["-v2ResetSetup"])
        guard any("v2-setup", timeout: 40).exists else {
            NSLog("R19STATUS setup-1 missing no-setup"); return
        }
        settle()
        shot("setup-1")
        frames("setup-1", ["v2-setup-step", "v2-setup-headline",
                           "v2-setup-continue", "v2-setup-skip",
                           "v2-setup-connect-gmail"])
        NSLog("R19STATUS setup-1 ok")
    }

    func testShoot03Setup6() throws {
        launch(Self.harness + ["-v2ResetSetup"])
        guard any("v2-setup", timeout: 40).exists else {
            NSLog("R19STATUS setup-6 missing no-setup"); return
        }
        for _ in 1...5 {
            let next = btn("v2-setup-continue", timeout: 8)
            guard next.exists else {
                NSLog("R19STATUS setup-6 missing no-continue"); return
            }
            next.tap()
            settle(1)
        }
        settle()
        shot("setup-6")
        frames("setup-6", ["v2-setup-step", "v2-setup-headline",
                           "v2-setup-name", "v2-setup-goal",
                           "v2-setup-finish", "v2-setup-skip"])
        NSLog("R19STATUS setup-6 ok")
        // Leave via Skip (never Finish — that would create a project).
        let skip = app.buttons.matching(identifier: "v2-setup-skip").firstMatch
        if skip.waitForExistence(timeout: 5) { skip.tap(); settle(1) }
    }

    func testShoot04Thread() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        guard openDesignThread() else {
            NSLog("R19STATUS thread missing no-thread"); return
        }
        settle(2)
        shot("thread")
        frames("thread", ["chat-title", "chat-subtitle", "v2-drawer-button",
                          "v2-status-dot", "v2-composer-field", "v2-composer-send",
                          "v2-record", "v2-commands", "visual-peek",
                          "visual-peek-count", "v2-agent-label"])
        // R28: the left gutter (content insets at 21pt; bubbles/cards never
        // reach x=10), not mid-thread — live message cards (option rows,
        // raised fill) collided with the old point and tested content, not
        // ground. Same fixed-zone reasoning as the drawer's (8,56) sample.
        sample("thread", "ground", CGPoint(x: 10, y: 400))
        let send = app.descendants(matching: .any).matching(identifier: "v2-composer-send").firstMatch
        if send.exists {
            // Offset from center: the arrow glyph itself is white.
            sample("thread", "send", CGPoint(x: send.frame.midX - 14, y: send.frame.midY))
        }
        NSLog("R19STATUS thread ok")
    }

    func testShoot05Drawer() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        guard openDesignThread(), openDrawer() else {
            NSLog("R19STATUS drawer missing no-drawer"); return
        }
        shot("drawer")
        // Second frame, scrolled: proves the mission list + lower projects
        // below the fold are reachable, not truncated.
        app.swipeUp()
        settle(1)
        shot("drawer-scrolled")
        // R28: measure back at the top (symmetric swipe reverses the proof
        // scroll). A flooded drawer (probe missions) scrolls the header rows
        // out of the lazy AX tree; measuring post-scroll tested list depth,
        // not the header. Thresholds unchanged.
        app.swipeDown()
        settle(1)
        frames("drawer", ["v2-drawer", "v2-drawer-close", "v2-drawer-new",
                          "v2-drawer-new-project", "v2-drawer-record",
                          "v2-drawer-settings", "v2-drawer-bell"])
        // Top-left corner inset: fixed header zone, always plain surface —
        // never a highlighted row or a button fill.
        sample("drawer", "surface", CGPoint(x: 8, y: 56))
        NSLog("R19STATUS drawer ok")
    }

    func testShoot06Settings() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        guard openDesignThread(), openDrawer() else {
            NSLog("R19STATUS settings missing no-drawer"); return
        }
        let gear = btn("v2-drawer-settings")
        guard gear.exists else {
            NSLog("R19STATUS settings missing no-gear"); return
        }
        gear.tap()
        guard any("settings-screen", timeout: 10).exists else {
            NSLog("R19STATUS settings missing no-screen"); return
        }
        settle()
        shot("settings")
        frames("settings", ["settings-back", "settings-name", "settings-email",
                            "settings-rerun", "settings-signout"])
        NSLog("R19STATUS settings ok")
    }

    func testShoot07SheetHalf() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        guard openDesignThread(), openSheet() else {
            NSLog("R19STATUS sheet-half missing no-sheet"); return
        }
        shot("sheet-half")
        frames("sheet-half", ["visual-sheet-close", "review-toggle",
                              "sheet-tab-preview", "sheet-tab-context",
                              "sheet-status-text"])
        sample("sheet-half", "sheet-bg", CGPoint(x: 200, y: 232))
        NSLog("R19STATUS sheet-half ok")
    }

    func testShoot08SheetContext() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        guard openDesignThread(), openSheet() else {
            NSLog("R19STATUS sheet-context missing no-sheet"); return
        }
        let ctx = app.buttons.matching(identifier: "sheet-tab-context").firstMatch
        guard ctx.waitForExistence(timeout: 8) else {
            NSLog("R19STATUS sheet-context missing no-tab"); return
        }
        ctx.tap()
        settle()
        shot("sheet-context")
        frames("sheet-context", ["sheet-tab-preview", "sheet-tab-context",
                                 "context-section"])
        NSLog("R19STATUS sheet-context ok")
    }

    func testShoot09SheetReview() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        guard openDesignThread(), openSheet() else {
            NSLog("R19STATUS sheet-review missing no-sheet"); return
        }
        let toggle = app.buttons.matching(identifier: "review-toggle").firstMatch
        guard toggle.waitForExistence(timeout: 8) else {
            NSLog("R19STATUS sheet-review missing no-toggle"); return
        }
        toggle.tap()
        settle()
        shot("sheet-review")
        frames("sheet-review", ["review-toggle", "review-send",
                                "review-empty", "review-note"])
        NSLog("R19STATUS sheet-review ok")
    }

    func testShoot09bSheetFull() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        guard openDesignThread(), openSheet() else {
            NSLog("R19STATUS sheet-full missing no-sheet"); return
        }
        let toggle = app.buttons.matching(identifier: "review-toggle").firstMatch
        guard toggle.waitForExistence(timeout: 8) else {
            NSLog("R19STATUS sheet-full missing no-toggle"); return
        }
        if toggle.label == "Review" {
            // Review off: turn it on so the checklist + Send show.
            toggle.tap()
            Thread.sleep(forTimeInterval: 1)
        }
        // Full detent: slow drag from the header to near the top (the flick
        // gesture scrolls content, the drag moves the detent).
        let tab = app.buttons.matching(identifier: "sheet-tab-preview").firstMatch
        guard tab.waitForExistence(timeout: 8) else {
            NSLog("R19STATUS sheet-full missing no-tab"); return
        }
        let start = tab.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.18))
        start.press(forDuration: 0.3, thenDragTo: end)
        Thread.sleep(forTimeInterval: 2)
        shot("sheet-full")
        frames("sheet-full", ["review-toggle", "review-send", "sheet-status-text"])
        NSLog("R19STATUS sheet-full ok")
    }

    func testShoot10Empty() throws {
        launch(Self.harness + ["-v2SkipSetup"])
        // The empty home only exists on an account with no workspace yet.
        // On the populated e2e account this screen is unreachable by design.
        let empty = app.descendants(matching: .any).matching(identifier: "v2-empty").firstMatch
        if empty.waitForExistence(timeout: 25) {
            settle()
            shot("empty")
            frames("empty", ["v2-empty-headline", "v2-empty-start",
                             "v2-empty-context", "v2-empty-sample"])
            NSLog("R19STATUS empty ok")
        } else if threadUp() {
            NSLog("R19STATUS empty missing populated-account")
        } else {
            NSLog("R19STATUS empty missing no-home")
        }
    }
}
