import XCTest

/// Full-app walk: taps every reachable control, prints WALK-OK / WALK-FAIL
/// lines, screenshots each screen. Never asserts navigation — the log plus
/// screenshots are the audit. Read output with:
///   xcodebuild test ... 2>&1 | grep "WALK-"
final class WalkAuditUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchArguments += ["-v2FixtureUITest", "-v2SkipSetup",
                                "-v2SuppressHaptics", "-v2ResetEntry", "-v2SeedHome"]
        app.launch()
        // Auto-dismiss system permission alerts (mic, etc.).
        addUIInterruptionMonitor(withDescription: "system alert") { alert in
            let b = alert.buttons["Don't Allow"]
                .exists ? alert.buttons["Don't Allow"] : alert.buttons["Cancel"]
            if b.exists { b.tap(); return true }
            return false
        }
    }

    @discardableResult
    func step(_ name: String, file: StaticString = #file, line: UInt = #line,
              _ body: () -> Bool) -> Bool {
        let ok: Bool
        @Sendable func run(_ b: () -> Bool) -> Bool { b() }
        ok = run(body)
        print("WALK-\(ok ? "OK" : "FAIL"): \(name)")
        return ok
    }

    func tapIfExists(_ el: XCUIElement, timeout: TimeInterval = 5) -> Bool {
        guard el.waitForExistence(timeout: timeout) else { return false }
        guard el.isHittable else { return false }
        el.tap()
        return true
    }

    func shot(_ name: String) {
        XCTContext.runActivity(named: name) { act in
            let att = XCTAttachment(screenshot: app.screenshot())
            att.name = name
            att.lifetime = .keepAlways
            act.add(att)
        }
    }

    // MARK: - B. Drawer

    func openDrawer() -> Bool {
        if app.otherElements["v2-drawer"].exists { return true }
        return tapIfExists(app.buttons["v2-drawer-button"])
            && app.otherElements["v2-drawer"].waitForExistence(timeout: 5)
    }

    func testWalkBDrawer() {
        guard openDrawer() else { print("WALK-FAIL: drawer-open"); return }
        print("WALK-OK: drawer-open")
        shot("walk-drawer")
        step("drawer-search-type-clear") {
            guard tapIfExists(app.textFields["v2-drawer-search"]) else { return false }
            app.textFields["v2-drawer-search"].typeText("zzz")
            shot("walk-drawer-search")
            return tapIfExists(app.buttons["v2-drawer-search-clear"], timeout: 2)
        }
        step("drawer-bell") {
            guard tapIfExists(app.buttons["v2-drawer-bell"]) else { return false }
            shot("walk-notifications")
            // Dismiss via the sheet's Done button (background tap does nothing).
            guard tapIfExists(app.buttons["Done"], timeout: 3) else { return false }
            return openDrawer()
        }
        step("drawer-new") {
            guard tapIfExists(app.buttons["v2-drawer-new"]) else { return false }
            shot("walk-drawer-new")
            _ = tapIfExists(app.buttons["intake-close"], timeout: 3)
            app.tap()
            return openDrawer()
        }
        step("drawer-new-project") {
            guard tapIfExists(app.buttons["v2-drawer-new-project"]) else { return false }
            shot("walk-drawer-new-project")
            _ = tapIfExists(app.buttons["intake-close"], timeout: 3)
            app.tap()
            return openDrawer()
        }
        step("drawer-project-expand-and-mission") {
            guard tapIfExists(app.buttons["v2-drawer-project-expand"].firstMatch,
                              timeout: 5) else { return false }
            shot("walk-drawer-expanded")
            if tapIfExists(app.buttons["v2-drawer-mission-row"].firstMatch, timeout: 3) {
                shot("walk-mission-thread")
                return openDrawer()
            }
            return true // no missions seeded — expand alone is the check
        }
        step("drawer-new-mission") {
            let ok = tapIfExists(app.buttons["v2-drawer-new-mission"].firstMatch, timeout: 3)
            if ok {
                shot("walk-drawer-new-mission")
                _ = tapIfExists(app.buttons["intake-close"], timeout: 3)
                app.tap()
            }
            _ = openDrawer()
            return true // present only when a project is expanded; absence is fine
        }
        step("drawer-settings") {
            guard tapIfExists(app.buttons["v2-drawer-settings"]) else { return false }
            let ok = app.otherElements["settings-screen"].waitForExistence(timeout: 5)
            shot("walk-settings")
            return ok
        }
        step("settings-back-to-drawer") {
            _ = tapIfExists(app.buttons["settings-back"], timeout: 3)
            return openDrawer()
        }
        step("drawer-files-row") {
            guard tapIfExists(app.buttons["v2-drawer-files-row"]) else { return false }
            shot("walk-files")
            _ = tapIfExists(app.buttons["settings-back"], timeout: 3)
            _ = tapIfExists(app.buttons["v2-drawer-close"], timeout: 2)
            return true
        }
        step("drawer-recent-row-opens-thread") {
            _ = openDrawer()
            guard tapIfExists(app.buttons["v2-drawer-recent-row"].firstMatch,
                              timeout: 5) else { return false }
            let ok = app.otherElements["chat-screen"].waitForExistence(timeout: 8)
            shot("walk-thread")
            return ok
        }
    }

    // MARK: - C. Thread + composer

    func openFirstThread() -> Bool {
        if app.otherElements["chat-screen"].exists
            && app.textFields["v2-composer-field"].exists { return true }
        guard openDrawer() else { return false }
        guard tapIfExists(app.buttons["v2-drawer-recent-row"].firstMatch,
                          timeout: 5) else { return false }
        return app.textFields["v2-composer-field"].waitForExistence(timeout: 8)
    }

    func testWalkCThread() {
        guard openFirstThread() else { print("WALK-FAIL: thread-open"); return }
        print("WALK-OK: thread-open")
        shot("walk-thread-open")
        step("composer-type-send") {
            let f = app.textFields["v2-composer-field"]
            guard tapIfExists(f, timeout: 5) else { return false }
            f.typeText("walk audit hello")
            guard tapIfExists(app.buttons["v2-composer-send"], timeout: 3) else { return false }
            // Wait for the user bubble (echo) — up to 20s for a bridge round trip.
            let ok = app.staticTexts["walk audit hello"].waitForExistence(timeout: 20)
            shot("walk-thread-sent")
            return ok
        }
        step("composer-eye") { tapIfExists(app.buttons["v2-composer-eye"], timeout: 3) }
        step("composer-checklist") {
            guard tapIfExists(app.buttons["v2-composer-checklist"], timeout: 3) else { return false }
            shot("walk-checklist")
            return true
        }
        step("composer-attach") {
            guard tapIfExists(app.buttons["v2-attach"], timeout: 3) else { return false }
            shot("walk-attach")
            app.tap()
            return true
        }
        step("model-caption") {
            let ok = app.staticTexts["v2-model-caption"].waitForExistence(timeout: 3)
            shot("walk-model")
            return ok
        }
    }

    // MARK: - E. Visual viewer

    func testWalkEViewer() {
        app.terminate()
        app.launchArguments += ["-v2SeedVisual", "-v2ResetVisual"]
        app.launch()
        let opener = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'visual-open-'")).firstMatch
        guard opener.waitForExistence(timeout: 25) else {
            print("WALK-INFO: no visual artifact seeded — viewer not walkable"); return
        }
        print("WALK-OK: visual-artifact-present")
        step("visual-open") {
            guard tapIfExists(opener, timeout: 5) else { return false }
            let ok = app.otherElements["visual-sheet"].waitForExistence(timeout: 8)
            shot("walk-visual-open")
            return ok
        }
        step("visual-leave-a-review") {
            guard tapIfExists(app.buttons["leave-a-review"], timeout: 5) else { return false }
            shot("walk-visual-review")
            return true
        }
        step("visual-close") {
            if tapIfExists(app.buttons["visual-close"], timeout: 3) { return true }
            if tapIfExists(app.buttons["visual-sheet-close"], timeout: 3) { return true }
            app.swipeDown()
            Thread.sleep(forTimeInterval: 1.5)
            return !app.otherElements["visual-sheet"].exists
        }
    }

    // MARK: - D. Settings + tools

    func testWalkDSettings() {
        guard openDrawer() else { print("WALK-FAIL: drawer-open"); return }
        guard tapIfExists(app.buttons["v2-drawer-settings"]) else {
            print("WALK-FAIL: settings-open"); return
        }
        guard app.otherElements["settings-screen"].waitForExistence(timeout: 5) else {
            print("WALK-FAIL: settings-screen"); return
        }
        print("WALK-OK: settings-open")
        shot("walk-settings-full")
        for row in ["profile", "environment", "permissions", "notifications", "appearance"] {
            step("settings-row-\(row)") {
                guard tapIfExists(app.buttons["settings-row-\(row)"], timeout: 3) else { return false }
                shot("walk-settings-\(row)")
                if row == "notifications" {
                    let push = app.buttons["settings-push-status"].waitForExistence(timeout: 3)
                        || app.staticTexts["settings-push-status"].waitForExistence(timeout: 1)
                    let sys = app.buttons["settings-open-system"].waitForExistence(timeout: 3)
                    print("WALK-\(push ? "OK" : "FAIL"): settings-push-status")
                    print("WALK-\(sys ? "OK" : "FAIL"): settings-open-system")
                    if !push || !sys { return false }
                }
                if row == "profile" {
                    let so = app.buttons["settings-signout"].waitForExistence(timeout: 3)
                    print("WALK-\(so ? "OK" : "FAIL"): settings-signout-present-not-tapped")
                }
                _ = tapIfExists(app.buttons["settings-back"], timeout: 3)
                return app.otherElements["settings-screen"].waitForExistence(timeout: 5)
            }
        }
        step("settings-rerun-present") {
            return app.buttons["settings-rerun"].waitForExistence(timeout: 3)
        }
        // tools-tracker lives only in the retired RoomListView — confirmed
        // unreachable; log it rather than tap it.
        print("WALK-INFO: tools-tracker has no v2 entry point (dead RoomListView only)")
    }

    // MARK: - A. Home

    func testWalkAHome() {
        let welcome = app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch
        guard welcome.waitForExistence(timeout: 25) else {
            print("WALK-FAIL: home-welcome-missing"); return
        }
        print("WALK-OK: home-welcome")
        shot("walk-home")
        step("home-drawer-opens") {
            tapIfExists(app.buttons["v2-drawer-button"])
                && app.otherElements["v2-drawer"].waitForExistence(timeout: 5)
        }
        shot("walk-drawer-open")
        step("drawer-close") { tapIfExists(app.buttons["v2-drawer-close"]) }
        step("home-eye") { tapIfExists(app.buttons["v2-eye"]) }
        shot("walk-eye")
        let cards = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'v2-home-card-'"))
        step("home-three-cards") { cards.count >= 3 }
        for i in 0..<min(3, cards.count) {
            // Fresh launch per card — a card leaves home with no way back.
            if i > 0 {
                app.terminate()
                app.launch()
            }
            let home = app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch
            guard home.waitForExistence(timeout: 25) else {
                print("WALK-FAIL: home-card-\(i)-no-home-after-relaunch"); continue
            }
            let cs = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'v2-home-card-'"))
            step("home-card-\(i)-opens-thread") {
                guard i < cs.count, tapIfExists(cs.element(boundBy: i), timeout: 5) else { return false }
                shot("walk-card-\(i)")
                return app.otherElements["chat-screen"].waitForExistence(timeout: 8)
            }
        }
        // After card taps we sit in a thread: is there ANY way back home?
        step("thread-can-return-home") {
            _ = tapIfExists(app.buttons["v2-drawer-button"], timeout: 5)
            shot("walk-drawer-after-card")
            let homeBtn = app.buttons.matching(NSPredicate(format: "identifier CONTAINS 'home'")).firstMatch
            if homeBtn.waitForExistence(timeout: 2) {
                homeBtn.tap()
                return app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch.waitForExistence(timeout: 8)
            }
            print("WALK-INFO: no home affordance in drawer after card tap")
            return false
        }
    }
}
