import XCTest

// corner:corner-smooth-loop R0-ios — the native screen tour.
//
// Visits every home surface and every room surface, photographs each one, and
// keeps going when an element is missing: a MISSING frame plus an XCTFail per
// absent step, then on to the next step. A missing element is a finding, not a
// reason to abort.
//
// The tour never sends a message, never creates a room, never deletes anything,
// and never leaves a setting changed. Composer typing is always cleared, never
// sent. The theme round-trip (21/22) restores whatever theme it started from.
final class ScreenTour: XCTestCase {

    private var app: XCUIApplication!
    private var missingFrames: [String] = []
    private var capturedFrames: [String] = []
    private var timingLines: [String] = []

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        // Force the real backend. Without this the app sees
        // XCTestConfigurationFilePath and silently uses FakeTransport, which
        // would make this tour prove nothing (SharedBackendAcceptance doctrine).
        // AUTO_SIGNIN_* are deliberately NOT set here: the tour must meet the
        // real sign-in screen unless the Keychain session survived.
        app.launchEnvironment["UITEST_REAL_BACKEND"] = "1"
        addUIInterruptionMonitor(withDescription: "System Dialog") { alert in
            for label in ["Allow", "Don't Allow", "OK", "Not Now"] {
                let button = alert.buttons[label]
                if button.exists { button.tap(); return true }
            }
            return false
        }
    }

    // MARK: - capture + guard helpers

    private func shot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        capturedFrames.append(name)
    }

    /// A missing element is a finding: MISSING frame plus a failure, then continue.
    private func recordMissing(frame: String, step: String, element: String) {
        shot("\(frame)-MISSING")
        missingFrames.append(frame)
        XCTFail("\(step): \(element) not found")
    }

    private func note(_ line: String) {
        timingLines.append(line)
        NSLog("ScreenTour timing: %@", line)
    }

    private func attachTiming() {
        let attachment = XCTAttachment(string: timingLines.joined(separator: "\n"))
        attachment.name = "timing"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func settle(_ seconds: TimeInterval = 2) {
        Thread.sleep(forTimeInterval: seconds)
    }

    // MARK: - element queries (identifier first, visible-label fallback)
    //
    // Type-scoped only, never descendants(.any): a full-tree query timed out
    // its snapshot on the animated sign-in screen and hard-aborted the run
    // even with continueAfterFailure (R0 finding). Scoped snapshots are instant.

    /// Identifier lookup across the container types a SwiftUI view can surface
    /// as. Returns an element whose `exists` is false when nothing matches, so
    /// call sites keep using `waitForExistence`.
    private func scoped(_ id: String) -> XCUIElement {
        let queries: [XCUIElementQuery] = [
            app.tables.matching(identifier: id),
            app.collectionViews.matching(identifier: id),
            app.scrollViews.matching(identifier: id),
            app.otherElements.matching(identifier: id),
            app.groups.matching(identifier: id),
        ]
        for query in queries {
            let element = query.firstMatch
            if element.waitForExistence(timeout: 2) { return element }
        }
        return app.otherElements[id].firstMatch
    }

    private func roomListUp(timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if scoped("room-list-screen").exists { return true }
        }
        return false
    }

    private func chatScreenUp(timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if scoped("chat-screen").exists { return true }
        }
        return false
    }

    private var firstRoomRow: XCUIElement {
        // The row combines its children and carries .isButton: it is a Button.
        app.buttons.matching(identifier: "room-row").firstMatch
    }

    private var composer: XCUIElement {
        app.textFields["chat-composer"].firstMatch
    }

    private var searchChip: XCUIElement {
        let byID = app.buttons["search-chip"].firstMatch
        if byID.waitForExistence(timeout: 3) { return byID }
        return app.buttons.matching(NSPredicate(format: "label == 'Search rooms'")).firstMatch
    }

    private var homeMenu: XCUIElement {
        let byID = app.buttons["home-menu"].firstMatch
        if byID.waitForExistence(timeout: 3) { return byID }
        return app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Menu'")).firstMatch
    }

    private var newRoomButton: XCUIElement {
        let byID = app.buttons["new-room-button"].firstMatch
        if byID.waitForExistence(timeout: 3) { return byID }
        return app.buttons["New room"].firstMatch
    }

    private var roomMoreOptions: XCUIElement {
        let byID = app.buttons["room-more-options"].firstMatch
        if byID.waitForExistence(timeout: 3) { return byID }
        return app.buttons["More options"].firstMatch
    }

    private func navBar(named title: String) -> XCUIElement {
        app.navigationBars[title].firstMatch
    }

    // MARK: - menu helpers

    /// Open the home hamburger menu. Returns false (and records MISSING) when absent.
    @discardableResult
    private func openMenu(frame: String, step: String) -> Bool {
        let menu = homeMenu
        guard menu.waitForExistence(timeout: 10) else {
            recordMissing(frame: frame, step: step, element: "home menu button")
            return false
        }
        menu.tap()
        settle(1)
        return true
    }

    /// Dismiss an open menu by tapping the Corner logo (a tap outside the menu).
    private func dismissMenu() {
        let logo = app.images.matching(NSPredicate(format: "label == 'Corner'")).firstMatch
        if logo.waitForExistence(timeout: 5) { logo.tap() }
        settle(1)
    }

    /// Tap the navigation back chevron and wait for the room list. Frame-scoped.
    @discardableResult
    private func backToHome(frame: String, step: String) -> Bool {
        let back = app.navigationBars.firstMatch.buttons.firstMatch
        guard back.waitForExistence(timeout: 10) else {
            recordMissing(frame: frame, step: step, element: "navigation back button")
            return false
        }
        back.tap()
        guard roomListUp(timeout: 10) else {
            recordMissing(frame: frame, step: step, element: "room list after back")
            return false
        }
        settle(1)
        return true
    }

    private func themeButton() -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Theme:'")).firstMatch
    }

    /// "Theme: Dark" -> "Dark". Nil when the menu is not open or has no theme row.
    private func currentThemeName() -> String? {
        let button = themeButton()
        guard button.waitForExistence(timeout: 5) else { return nil }
        guard let colon = button.label.firstIndex(of: ":") else { return nil }
        return String(button.label[button.label.index(after: colon)...])
            .trimmingCharacters(in: .whitespaces)
    }

    // MARK: - the tour

    func testTour() {
        guard let email = ProcessInfo.processInfo.environment["TOUR_EMAIL"],
              !email.isEmpty,
              let password = ProcessInfo.processInfo.environment["TOUR_PASSWORD"],
              !password.isEmpty else {
            XCTFail("TOUR_EMAIL / TOUR_PASSWORD must be set in the test environment")
            return
        }

        let launchDate = Date()
        app.launch()

        // --- auth branch -----------------------------------------------------
        if roomListUp(timeout: 15) {
            let ms = Int(Date().timeIntervalSince(launchDate) * 1000)
            note("signin=skipped (Keychain session survived; room-list in \(ms) ms)")
        } else if chatScreenUp(timeout: 5) {
            // Restoration landed straight in the last room: back out to home.
            let ms = Int(Date().timeIntervalSince(launchDate) * 1000)
            note("launch restored into a room (\(ms) ms); backing out to home")
            if backToHome(frame: "02-home", step: "restore-back-out") {
                note("signin=skipped (session survived; restored into a room)")
            }
        } else {
            // Cold sign-in.
            let signInButton = app.buttons["Sign in"].firstMatch
            guard signInButton.waitForExistence(timeout: 30) else {
                recordMissing(frame: "00-signin-empty", step: "signin", element: "sign-in screen")
                attachTiming()
                return
            }
            note("launch_to_signin_ms=\(Int(Date().timeIntervalSince(launchDate) * 1000))")
            shot("00-signin-empty")

            let emailField = app.textFields.firstMatch
            guard emailField.waitForExistence(timeout: 10) else {
                recordMissing(frame: "01-signin-filled", step: "signin", element: "email field")
                attachTiming()
                return
            }
            emailField.tap()
            emailField.typeText(email)
            settle(1)

            let passwordField = app.secureTextFields.firstMatch
            guard passwordField.waitForExistence(timeout: 10) else {
                recordMissing(frame: "01-signin-filled", step: "signin", element: "password field")
                attachTiming()
                return
            }
            passwordField.tap()
            passwordField.typeText(password)
            settle(1)
            shot("01-signin-filled")

            let tapDate = Date()
            if signInButton.exists && signInButton.isHittable {
                signInButton.tap()
            } else {
                // The keyboard covers the button: the Go key submits the same form.
                app.keyboards.buttons["Go"].firstMatch.tap()
            }

            // Wait up to 90 s for home, watching for the set-password gate instead.
            var signedIn = false
            var needsPassword = false
            let deadline = Date().addingTimeInterval(90)
            while Date() < deadline {
                if roomListUp(timeout: 2) { signedIn = true; break }
                if app.staticTexts["Set your password"].firstMatch.exists {
                    needsPassword = true; break
                }
            }
            if needsPassword {
                shot("01b-set-password")
                note("signin_tap_to_home_ms=never (set-password gate)")
                attachTiming()
                XCTFail("account needs a password; tour cannot continue")
                return
            }
            if !signedIn {
                recordMissing(frame: "02-home", step: "signin", element: "room list within 90 s")
                attachTiming()
                return
            }
            note("signin_tap_to_home_ms=\(Int(Date().timeIntervalSince(tapDate) * 1000))")
        }

        // --- 02/03/04 home ---------------------------------------------------
        guard roomListUp(timeout: 15) else {
            recordMissing(frame: "02-home", step: "home", element: "room list")
            attachTiming()
            return
        }
        settle(2)
        shot("02-home")
        app.swipeUp()
        settle(1)
        shot("03-home-scrolled")
        app.swipeUp()
        app.swipeUp()
        app.swipeUp()
        settle(1)
        shot("04-home-bottom")

        // --- 05 search -------------------------------------------------------
        do {
            let chip = searchChip
            guard chip.waitForExistence(timeout: 10) else {
                recordMissing(frame: "05-search-open", step: "search", element: "search chip")
                throw SearchDone()
            }
            chip.tap()
            let field = app.textFields["Search rooms"].firstMatch
            guard field.waitForExistence(timeout: 10) else {
                recordMissing(frame: "05-search-open", step: "search", element: "search field")
                throw SearchDone()
            }
            field.tap()
            field.typeText("a")
            settle(1)
            shot("05-search-open")
            let clear = app.buttons["Clear and close search"].firstMatch
            if clear.waitForExistence(timeout: 5) { clear.tap() } else {
                // Fallback close: the chip toggles the field row.
                chip.tap()
            }
            settle(1)
        } catch { /* SearchDone: continue with the next step */ }

        // --- 06 menu ---------------------------------------------------------
        if openMenu(frame: "06-menu-open", step: "menu") {
            shot("06-menu-open")
            dismissMenu()
        }

        // --- 07 new room sheet (opened, never created) -----------------------
        do {
            let button = newRoomButton
            guard button.waitForExistence(timeout: 10) else {
                recordMissing(frame: "07-new-room-sheet", step: "new-room", element: "\"New room\" button")
                throw SearchDone()
            }
            button.tap()
            let sheet = scoped("new-room-sheet")
            let sheetShown: Bool
            if sheet.waitForExistence(timeout: 5) {
                sheetShown = true
            } else {
                // Fallback: the sheet's nav title (mission mode is the default).
                sheetShown = navBar(named: "Start a mission").waitForExistence(timeout: 5)
                    || navBar(named: "New project").waitForExistence(timeout: 2)
            }
            guard sheetShown else {
                recordMissing(frame: "07-new-room-sheet", step: "new-room", element: "new-room sheet")
                throw SearchDone()
            }
            settle(1)
            shot("07-new-room-sheet")
            let cancel = app.buttons["Cancel"].firstMatch
            if cancel.waitForExistence(timeout: 5) { cancel.tap() } else { app.swipeDown() }
            settle(1)
        } catch { /* continue */ }

        // --- 08/09/10/11 room -----------------------------------------------
        do {
            let row = firstRoomRow
            guard row.waitForExistence(timeout: 15) else {
                recordMissing(frame: "08-room", step: "room", element: "room row")
                throw SearchDone()
            }
            row.tap()
            guard chatScreenUp(timeout: 30) else {
                recordMissing(frame: "08-room", step: "room", element: "chat screen")
                throw SearchDone()
            }
            settle(3)
            shot("08-room")
            app.swipeDown()
            settle(1)
            shot("09-room-scrolled-up")

            let box = composer
            guard box.waitForExistence(timeout: 10) else {
                recordMissing(frame: "10-room-keyboard", step: "room", element: "chat composer")
                throw SearchDone()
            }
            box.tap()
            guard app.keyboards.firstMatch.waitForExistence(timeout: 15) else {
                recordMissing(frame: "10-room-keyboard", step: "room", element: "keyboard")
                throw SearchDone()
            }
            settle(1)
            shot("10-room-keyboard")

            let draft = "tour draft, not sent"
            let before = (box.value as? String) ?? ""
            box.typeText(draft)
            settle(1)
            shot("11-room-typed")
            // Clear exactly what was typed, leaving any pre-existing draft intact.
            // NEVER tap `send`.
            box.tap()
            for _ in 0..<draft.count {
                app.keyboards.keys["delete"].firstMatch.tap()
            }
            _ = before
            // The thread scrolls the keyboard away interactively.
            app.swipeDown()
            settle(1)

            // --- 12 room toolbar: files / settings / history -----------------
            do {
                let more = roomMoreOptions
                guard more.waitForExistence(timeout: 10) else {
                    recordMissing(frame: "12a-room-files", step: "room-toolbar", element: "More options menu")
                    throw SearchDone()
                }
                more.tap()
                settle(1)
                let filesItem = app.buttons["Files"].firstMatch
                guard filesItem.waitForExistence(timeout: 5) else {
                    recordMissing(frame: "12a-room-files", step: "room-toolbar", element: "\"Files\" menu item")
                    dismissMenu()
                    throw SearchDone()
                }
                filesItem.tap()
                if navBar(named: "Files").waitForExistence(timeout: 10) {
                    settle(1)
                    shot("12a-room-files")
                } else {
                    recordMissing(frame: "12a-room-files", step: "room-toolbar", element: "room files sheet")
                }
                // RoomFilesView has an explicit Done button (no drag needed).
                let filesDone = app.buttons["Done"].firstMatch
                if filesDone.waitForExistence(timeout: 5) { filesDone.tap() } else { app.swipeDown() }
                settle(1)

                more.tap()
                settle(1)
                let settingsItem = app.buttons["Room settings"].firstMatch
                guard settingsItem.waitForExistence(timeout: 5) else {
                    recordMissing(frame: "12b-room-settings", step: "room-toolbar", element: "\"Room settings\" menu item")
                    dismissMenu()
                    throw SearchDone()
                }
                settingsItem.tap()
                if navBar(named: "Room settings").waitForExistence(timeout: 10) {
                    settle(1)
                    shot("12b-room-settings")
                    let historyTab = app.segmentedControls.firstMatch.buttons["History"].firstMatch
                    let historyTarget: XCUIElement
                    if historyTab.waitForExistence(timeout: 3) {
                        historyTarget = historyTab
                    } else {
                        historyTarget = app.buttons["History"].firstMatch
                    }
                    if historyTarget.waitForExistence(timeout: 5) {
                        historyTarget.tap()
                        settle(1)
                        shot("12c-room-history")
                    } else {
                        recordMissing(frame: "12c-room-history", step: "room-toolbar", element: "\"History\" settings tab")
                    }
                } else {
                    recordMissing(frame: "12b-room-settings", step: "room-toolbar", element: "room settings sheet")
                }
                let settingsDone = app.buttons["Done"].firstMatch
                if settingsDone.waitForExistence(timeout: 5) { settingsDone.tap() } else { app.swipeDown() }
                settle(1)
            } catch { /* continue */ }

            // --- 13 back home -------------------------------------------------
            if backToHome(frame: "13-back-home", step: "back-home") {
                shot("13-back-home")
            }
        } catch { /* room block skipped; home steps below still run if home is up */ }

        // --- 14 files / 15 tracker (Tools section) ----------------------------
        for (frame, id, label, nav) in [
            ("14-files", "tools-files", "Files", "Files"),
            ("15-tracker", "tools-tracker", "Tracker", "Tracker"),
        ] as [(String, String, String, String)] {
            guard roomListUp(timeout: 15) else {
                recordMissing(frame: frame, step: label.lowercased(), element: "room list")
                continue
            }
            var entry = app.buttons[id].firstMatch
            if !entry.waitForExistence(timeout: 3) {
                entry = app.buttons[label].firstMatch
            }
            guard entry.waitForExistence(timeout: 10) else {
                recordMissing(frame: frame, step: label.lowercased(), element: "\"\(label)\" entry")
                continue
            }
            entry.tap()
            guard navBar(named: nav).waitForExistence(timeout: 15) else {
                recordMissing(frame: frame, step: label.lowercased(), element: "\"\(nav)\" screen")
                continue
            }
            settle(2)
            shot(frame)
            _ = backToHome(frame: frame, step: label.lowercased())
        }

        // --- 16 review (waiting card; gated to waitingCount > 0) --------------
        do {
            guard roomListUp(timeout: 15) else {
                recordMissing(frame: "16-review", step: "review", element: "room list")
                throw SearchDone()
            }
            var card = app.buttons["waiting-card"].firstMatch
            if !card.waitForExistence(timeout: 3) {
                card = app.buttons.matching(
                    NSPredicate(format: "label CONTAINS 'Waiting on you'")).firstMatch
            }
            guard card.waitForExistence(timeout: 5) else {
                recordMissing(frame: "16-review", step: "review", element: "waiting card (empty queue hides it)")
                throw SearchDone()
            }
            card.tap()
            guard navBar(named: "Waiting on you").waitForExistence(timeout: 15) else {
                recordMissing(frame: "16-review", step: "review", element: "review screen")
                throw SearchDone()
            }
            settle(2)
            shot("16-review")
            _ = backToHome(frame: "16-review", step: "review")
        } catch { /* continue */ }

        // --- 17 email ---------------------------------------------------------
        do {
            guard roomListUp(timeout: 15) else {
                recordMissing(frame: "17-email", step: "email", element: "room list")
                throw SearchDone()
            }
            var card = app.buttons["email-card"].firstMatch
            if !card.waitForExistence(timeout: 3) {
                card = app.buttons.matching(
                    NSPredicate(format: "label BEGINSWITH 'Email'")).firstMatch
            }
            guard card.waitForExistence(timeout: 5) else {
                recordMissing(frame: "17-email", step: "email", element: "email card (non-owners have none)")
                throw SearchDone()
            }
            card.tap()
            guard navBar(named: "Email").waitForExistence(timeout: 15) else {
                recordMissing(frame: "17-email", step: "email", element: "email screen")
                throw SearchDone()
            }
            settle(2)
            shot("17-email")
            _ = backToHome(frame: "17-email", step: "email")
        } catch { /* continue */ }

        // --- 18 settings sheet / 19 notifications sheet ------------------------
        for (frame, id, label, nav) in [
            ("18-settings-sheet", "settings-sheet", "Settings", "Settings"),
            ("19-notifications-sheet", "notifications-sheet", "Notifications", "Notifications"),
        ] as [(String, String, String, String)] {
            guard roomListUp(timeout: 15) else {
                recordMissing(frame: frame, step: label.lowercased(), element: "room list")
                continue
            }
            guard openMenu(frame: frame, step: label.lowercased()) else { continue }
            let item = app.buttons[label].firstMatch
            guard item.waitForExistence(timeout: 5) else {
                recordMissing(frame: frame, step: label.lowercased(), element: "\"\(label)\" menu item")
                dismissMenu()
                continue
            }
            item.tap()
            settle(1)
            let sheet = scoped(id)
            var shown = sheet.waitForExistence(timeout: 10)
            if !shown {
                shown = navBar(named: nav).waitForExistence(timeout: 5)
            }
            guard shown else {
                recordMissing(frame: frame, step: label.lowercased(), element: "\"\(label)\" sheet")
                continue
            }
            settle(1)
            shot(frame)
            let done = app.buttons["Done"].firstMatch
            if done.waitForExistence(timeout: 5) { done.tap() } else { app.swipeDown() }
            settle(1)
        }

        // --- 20 background work (menu entry; drag to dismiss, no Done button) --
        do {
            guard roomListUp(timeout: 15) else {
                recordMissing(frame: "20-background-work", step: "background-work", element: "room list")
                throw SearchDone()
            }
            guard openMenu(frame: "20-background-work", step: "background-work") else {
                throw SearchDone()
            }
            let item = app.buttons.matching(
                NSPredicate(format: "label BEGINSWITH 'Background work'")).firstMatch
            guard item.waitForExistence(timeout: 5) else {
                recordMissing(frame: "20-background-work", step: "background-work", element: "\"Background work\" menu item")
                dismissMenu()
                throw SearchDone()
            }
            item.tap()
            settle(1)
            let sheet = scoped("background-work-sheet")
            var shown = sheet.waitForExistence(timeout: 10)
            if !shown { shown = navBar(named: "Background work").waitForExistence(timeout: 5) }
            guard shown else {
                recordMissing(frame: "20-background-work", step: "background-work", element: "background work sheet")
                throw SearchDone()
            }
            settle(1)
            shot("20-background-work")
            app.swipeDown()
            settle(1)
        } catch { /* continue */ }

        // --- 21/22 theme round-trip (light, then back to the original) --------
        do {
            guard roomListUp(timeout: 15) else {
                recordMissing(frame: "21-theme-light", step: "theme", element: "room list")
                throw SearchDone()
            }
            guard openMenu(frame: "21-theme-light", step: "theme") else {
                throw SearchDone()
            }
            let original = currentThemeName() ?? "unknown"
            note("theme_original=\(original)")
            // Cycle (at most 3 taps: Dark -> Light -> Glass -> Dark) to Light.
            var light = (original == "Light")
            for _ in 0..<3 {
                if light { break }
                let button = themeButton()
                guard button.waitForExistence(timeout: 5) else { break }
                button.tap()
                settle(1)
                _ = openMenu(frame: "21-theme-light", step: "theme")
                if currentThemeName() == "Light" { light = true }
            }
            if light {
                dismissMenu()
                settle(1)
                shot("21-theme-light")
            } else {
                dismissMenu()
                recordMissing(frame: "21-theme-light", step: "theme", element: "light theme after cycling")
            }
            // Restore the original theme the same way.
            if light, original != "Light", original != "unknown" {
                _ = openMenu(frame: "22-theme-restored", step: "theme-restore")
                for _ in 0..<3 {
                    if currentThemeName() == original { break }
                    let button = themeButton()
                    guard button.waitForExistence(timeout: 5) else { break }
                    button.tap()
                    settle(1)
                    _ = openMenu(frame: "22-theme-restored", step: "theme-restore")
                }
                dismissMenu()
            }
            settle(1)
            shot("22-theme-restored")
            _ = openMenu(frame: "22-theme-restored", step: "theme-verify")
            if let now = currentThemeName(), now != original {
                XCTFail("theme not restored: started \(original), now \(now)")
            }
            dismissMenu()
        } catch { /* continue */ }

        note("captured=\(capturedFrames.count) missing=\(missingFrames.joined(separator: ","))")
        attachTiming()
    }

    /// Control-flow marker: thrown to skip the rest of one guarded block.
    private struct SearchDone: Error {}
}
