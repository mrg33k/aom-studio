import XCTest

// corner:corner-smooth-loop R0-ios — the native screen tour, R23-rebased.
//
// R23 P070 retired the home tree: the app opens INTO the last thread (or
// General's) and every navigation happens through the drawer. The tour walks
// the new product path — thread, drawer, search, intake sheet, composer,
// review sheet, files, settings, notifications — photographs each one, and
// keeps going when an element is missing: a MISSING frame plus an XCTFail per
// absent step, then on to the next step. A missing element is a finding, not a
// reason to abort.
//
// The tour never sends a message, never creates anything, never deletes
// anything, and never leaves a setting changed. Composer typing is always
// cleared, never sent. The intake sheet is opened, never submitted.
//
// R0b: launches with -screenTour (frozen ambient animation) and the real
// backend. Stops after the sign-in verdict (01c) while tour credentials are
// known bad; every later frame is MISSING with reason `credentials`.
//
// Retired with the tree (R23, no UI path anymore — see the round report):
// tracker, review-queue card, email card, background work, theme round-trip.
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
        // real sign-in screen unless the Keychain session survived (or the
        // fallback relaunch below sets them after a terminate).
        app.launchEnvironment["UITEST_REAL_BACKEND"] = "1"
        // R0b gate: freeze ambient animation (ASCIIBackground timeline +
        // repeatForever pulses) so the main thread idles for snapshots.
        app.launchArguments += ["-screenTour"]
        // The tour walks the signed-in app, not first-run setup — and R23 pins
        // the entry to General's thread so every run starts in the same place.
        app.launchArguments += ["-v2SkipSetup", "-v2ResetEntry"]
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

    /// R0b: the tour stops at the sign-in verdict (credentials known bad), so
    /// every later frame is MISSING for one shared reason. One failure, not
    /// one per frame — per-frame MISSING shots would all show the same screen.
    private func markPostSigninMissing(reason: String) {
        let tail = [
            "02-thread", "03-thread-scrolled", "04-thread-bottom",
            "05-drawer-search", "06-drawer-open", "07-intake-sheet",
            "08-thread-deck", "09-sheet", "10-thread-keyboard",
            "11-thread-typed", "12-files", "13-settings", "14-notifications",
        ]
        missingFrames.append(contentsOf: tail)
        note("captured=\(capturedFrames.count) missing=\(missingFrames.joined(separator: ","))")
        XCTFail("tour stops at sign-in (\(reason)): \(tail.count) later frames MISSING")
    }

    /// Real-backend creds: the shell never reaches the on-sim runner (R19
    /// finding), so the gate script drops /tmp/r19-diag-env.json first.
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

    /// R23: signed in means the entry thread is up — the chat screen IS home.
    /// Gentle polling (one snapshot a second) rather than waitForExistence:
    /// on a saturated cold start the waiter's snapshot hammering starves the
    /// main thread it is waiting on, while spaced single snapshots get
    /// through (R23 gate-1: chat rendered in 5s, the waiter still found
    /// nothing in 30s).
    private func threadUp(timeout: TimeInterval) -> Bool {
        let marker = app.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if marker.exists { return true }
            Thread.sleep(forTimeInterval: 1)
        }
        return marker.exists
    }

    /// The v2 composer field, whichever AX type the OS surfaces it as.
    private func v2Composer() -> XCUIElement {
        let field = app.textFields.matching(identifier: "v2-composer-field").firstMatch
        if field.waitForExistence(timeout: 5) { return field }
        return app.textViews.matching(identifier: "v2-composer-field").firstMatch
    }

    private func navBar(named title: String) -> XCUIElement {
        app.navigationBars[title].firstMatch
    }

    // MARK: - drawer helpers (R23: the drawer is the navigation)

    /// Open the drawer from a thread. Returns false (and records MISSING)
    /// when the burger is absent. Idempotent: a tap on the covered burger
    /// would hit the scrim and close the drawer instead.
    @discardableResult
    private func openDrawer(frame: String, step: String) -> Bool {
        if scoped("v2-drawer").exists { return true }
        let burger = app.buttons["v2-drawer-button"].firstMatch
        guard burger.waitForExistence(timeout: 10) else {
            recordMissing(frame: frame, step: step, element: "drawer button")
            return false
        }
        burger.tap()
        settle(1)
        guard scoped("v2-drawer").exists else {
            recordMissing(frame: frame, step: step, element: "drawer")
            return false
        }
        return true
    }

    private func closeDrawer() {
        let close = app.buttons["v2-drawer-close"].firstMatch
        if close.waitForExistence(timeout: 5) { close.tap() }
        settle(1)
    }

    /// Tap the drawer row (project or mission) whose label contains the text.
    @discardableResult
    private func tapDrawerRow(id: String, contains text: String, frame: String, step: String) -> Bool {
        let rows = app.buttons.matching(identifier: id)
        guard rows.firstMatch.waitForExistence(timeout: 10) else {
            recordMissing(frame: frame, step: step, element: "drawer rows \(id)")
            return false
        }
        for i in 0..<rows.count {
            let row = rows.element(boundBy: i)
            if row.label.localizedCaseInsensitiveContains(text) {
                row.tap()
                settle(1)
                return true
            }
        }
        recordMissing(frame: frame, step: step, element: "drawer row \(text)")
        return false
    }

    /// Pop a pushed screen (Files, archive) back to the entry thread.
    @discardableResult
    private func backToThread(frame: String, step: String) -> Bool {
        let back = app.navigationBars.firstMatch.buttons.firstMatch
        guard back.waitForExistence(timeout: 10) else {
            recordMissing(frame: frame, step: step, element: "navigation back button")
            return false
        }
        back.tap()
        guard threadUp(timeout: 10) else {
            recordMissing(frame: frame, step: step, element: "thread after back")
            return false
        }
        settle(1)
        return true
    }

    // MARK: - the tour

    func testTour() {
        guard let (email, password) = backendCreds() else {
            XCTFail("TOUR_EMAIL / TOUR_PASSWORD must be set in the test environment")
            return
        }

        let launchDate = Date()
        app.launch()

        // --- auth branch -----------------------------------------------------
        if threadUp(timeout: 15) {
            let ms = Int(Date().timeIntervalSince(launchDate) * 1000)
            note("signin=skipped (Keychain session survived; thread in \(ms) ms)")
        } else {
            // Cold sign-in. Primary path: real element interaction on the real
            // sign-in screen — the -screenTour gate keeps the main thread idle
            // enough for these queries to snapshot. R17: the v2 login is two
            // steps (email → Continue with email → password → Sign in).
            let emailContinue = app.buttons["Continue with email"].firstMatch
            let signInButton = app.buttons["Sign in"].firstMatch
            if emailContinue.waitForExistence(timeout: 10) || signInButton.waitForExistence(timeout: 10) {
                note("signin_path=manual (v2 login found under -screenTour)")
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

                // The keyboard covers the Continue button (email step sits at
                // the bottom) and its return key carries no text label, so
                // submit with Return through the field — its onSubmit advances
                // to the password step. The button is the fallback when it is
                // hittable.
                emailField.typeText("\n")
                settle(2)
                if !app.secureTextFields.firstMatch.waitForExistence(timeout: 5),
                   emailContinue.exists && emailContinue.isHittable {
                    emailContinue.tap()
                    settle(2)
                }

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

                // One tap, then up to 20 s for the server verdict. Tour
                // credentials are known bad, so the inline rejection is the
                // expected landing; 01c photographs whatever is on screen.
                // Never retry: one tap, one verdict, stop.
                var signedIn = false
                var needsPassword = false
                let deadline = Date().addingTimeInterval(20)
                while Date() < deadline {
                    if threadUp(timeout: 2) { signedIn = true; break }
                    if app.staticTexts["Set your password"].firstMatch.exists {
                        needsPassword = true; break
                    }
                }
                if signedIn {
                    note("signin_tap_to_thread_ms=\(Int(Date().timeIntervalSince(tapDate) * 1000))")
                } else {
                    settle(1)
                    shot("01c-signin-rejected")
                    let rejected = app.staticTexts.matching(
                        NSPredicate(format: "label CONTAINS 'did not match'")).firstMatch.exists
                    note("signin_tap_to_reject_ms=\(Int(Date().timeIntervalSince(tapDate) * 1000)) "
                        + (needsPassword ? "(set-password gate)"
                            : rejected ? "(inline rejection shown)" : "(no verdict text seen)"))
                    markPostSigninMissing(reason: "credentials")
                    attachTiming()
                    return
                }
            } else {
                // Fallback: even the gate did not free the snapshot service.
                // No element query is needed for a screenshot, so photograph
                // the sign-in screen raw, then relaunch with the app's own
                // auto-sign-in hook and continue from the entry thread.
                note("signin_path=fallback-auto-signin (no sign-in button in 10 s under -screenTour)")
                shot("00-signin-empty")
                app.terminate()
                app.launchEnvironment["AUTO_SIGNIN_EMAIL"] = email
                app.launchEnvironment["AUTO_SIGNIN_PASSWORD"] = password
                app.launch()
                if threadUp(timeout: 30) {
                    note("signin=auto (fallback relaunch reached the thread)")
                } else {
                    settle(1)
                    shot("01c-signin-rejected")
                    note("signin=fallback relaunch did not reach the thread")
                    markPostSigninMissing(reason: "credentials")
                    attachTiming()
                    return
                }
            }
        }

        // --- 02/03/04 entry thread -------------------------------------------
        guard threadUp(timeout: 15) else {
            recordMissing(frame: "02-thread", step: "thread", element: "entry thread")
            attachTiming()
            return
        }
        settle(2)
        shot("02-thread")
        app.swipeUp()
        settle(1)
        shot("03-thread-scrolled")
        app.swipeUp()
        app.swipeUp()
        settle(1)
        shot("04-thread-bottom")

        // --- 05 drawer search --------------------------------------------------
        do {
            guard openDrawer(frame: "05-drawer-search", step: "search") else { throw SearchDone() }
            let field = app.textFields.matching(identifier: "v2-drawer-search").firstMatch
            guard field.waitForExistence(timeout: 10) else {
                recordMissing(frame: "05-drawer-search", step: "search", element: "drawer search field")
                throw SearchDone()
            }
            field.tap()
            field.typeText("a")
            settle(1)
            shot("05-drawer-search")
            let clear = app.buttons["v2-drawer-search-clear"].firstMatch
            if clear.waitForExistence(timeout: 5) { clear.tap() }
            settle(1)
            closeDrawer()
        } catch { /* SearchDone: continue with the next step */ }

        // --- 06 drawer ---------------------------------------------------------
        if openDrawer(frame: "06-drawer-open", step: "drawer") {
            shot("06-drawer-open")
            closeDrawer()
        }

        // --- 07 intake sheet (opened, never submitted) -------------------------
        do {
            guard openDrawer(frame: "07-intake-sheet", step: "intake") else { throw SearchDone() }
            let button = app.buttons["v2-drawer-new"].firstMatch
            guard button.waitForExistence(timeout: 10) else {
                recordMissing(frame: "07-intake-sheet", step: "intake", element: "\"New\" button")
                throw SearchDone()
            }
            button.tap()
            let field = app.textFields.matching(identifier: "global-intake-field").firstMatch
            guard field.waitForExistence(timeout: 15) else {
                recordMissing(frame: "07-intake-sheet", step: "intake", element: "intake sheet")
                throw SearchDone()
            }
            settle(1)
            shot("07-intake-sheet")
            let close = app.buttons["intake-close"].firstMatch
            if close.waitForExistence(timeout: 5) { close.tap() } else { app.swipeDown() }
            settle(1)
        } catch { /* continue */ }

        // --- 08 thread with files: the Spring launch deck mission --------------
        do {
            guard openDrawer(frame: "08-thread-deck", step: "deck") else { throw SearchDone() }
            let expands = app.buttons.matching(identifier: "v2-drawer-project-expand")
            if expands.firstMatch.waitForExistence(timeout: 10) {
                for i in 0..<expands.count {
                    let exp = expands.element(boundBy: i)
                    if exp.label.localizedCaseInsensitiveContains("aster"),
                       exp.label.hasPrefix("Expand") {
                        exp.tap()
                        break
                    }
                }
                settle(1)
            }
            guard tapDrawerRow(id: "v2-drawer-mission-row", contains: "Spring launch deck",
                               frame: "08-thread-deck", step: "deck") else { throw SearchDone() }
            guard threadUp(timeout: 15) else {
                recordMissing(frame: "08-thread-deck", step: "deck", element: "mission thread")
                throw SearchDone()
            }
            settle(2)
            shot("08-thread-deck")
        } catch { /* continue */ }

        // --- 09 review sheet -----------------------------------------------------
        do {
            let cards = app.buttons.matching(
                NSPredicate(format: "identifier BEGINSWITH 'visual-open-'"))
            let card = cards.firstMatch
            var peeked = false
            if card.waitForExistence(timeout: 10) {
                card.tap()
                peeked = true
            } else {
                let peek = app.buttons.matching(identifier: "visual-peek").firstMatch
                if peek.waitForExistence(timeout: 10) {
                    peek.tap()
                    peeked = true
                }
            }
            guard peeked else {
                recordMissing(frame: "09-sheet", step: "sheet", element: "file card or peek bar")
                throw SearchDone()
            }
            guard scoped("visual-sheet").exists else {
                recordMissing(frame: "09-sheet", step: "sheet", element: "review sheet")
                throw SearchDone()
            }
            settle(2)
            shot("09-sheet")
            let close = app.buttons["visual-sheet-close"].firstMatch
            if close.waitForExistence(timeout: 10) { close.tap() } else { app.swipeDown() }
            settle(1)
        } catch { /* continue */ }

        // --- 10/11 composer: keyboard, typed, cleared (never sent) --------------
        do {
            let box = v2Composer()
            guard box.waitForExistence(timeout: 10) else {
                recordMissing(frame: "10-thread-keyboard", step: "composer", element: "v2 composer")
                throw SearchDone()
            }
            box.tap()
            guard app.keyboards.firstMatch.waitForExistence(timeout: 15) else {
                recordMissing(frame: "10-thread-keyboard", step: "composer", element: "keyboard")
                throw SearchDone()
            }
            settle(1)
            shot("10-thread-keyboard")

            let draft = "tour draft, not sent"
            box.typeText(draft)
            settle(1)
            shot("11-thread-typed")
            // Clear exactly what was typed. NEVER tap `send`.
            box.tap()
            for _ in 0..<draft.count {
                app.keyboards.keys["delete"].firstMatch.tap()
            }
            app.swipeDown()
            settle(1)
        } catch { /* continue */ }

        // --- 12 files (the drawer's Files row → Files browser) -------------------
        // The row is per project thread (tree parity): walk the projects and
        // take the first one whose own thread holds files.
        do {
            guard openDrawer(frame: "12-files", step: "files") else { throw SearchDone() }
            let projects = app.buttons.matching(identifier: "v2-drawer-project-row")
            guard projects.firstMatch.waitForExistence(timeout: 10) else {
                recordMissing(frame: "12-files", step: "files", element: "drawer project rows")
                throw SearchDone()
            }
            var opened = false
            for i in 0..<min(projects.count, 10) {
                let exp = app.buttons.matching(identifier: "v2-drawer-project-expand").element(boundBy: i)
                if exp.waitForExistence(timeout: 5), exp.label.hasPrefix("Expand") {
                    exp.tap()
                    settle(1)
                }
                let files = app.buttons.matching(identifier: "v2-drawer-files-row").firstMatch
                if files.waitForExistence(timeout: 8) {
                    files.tap()
                    if navBar(named: "Files").waitForExistence(timeout: 15) {
                        settle(2)
                        shot("12-files")
                        opened = true
                        _ = backToThread(frame: "12-files", step: "files")
                    } else {
                        recordMissing(frame: "12-files", step: "files", element: "\"Files\" screen")
                    }
                    break
                }
            }
            if !opened {
                // No project thread on this account holds files (the row
                // correctly hides — the fixture suite locks the row itself),
                // so photograph the expanded drawer instead of failing: there
                // is no Files browser to open without writing files, and the
                // tour never writes.
                settle(1)
                shot("12-files")
                note("files=none-on-account (drawer expanded, row hidden, no failure)")
                closeDrawer()
            }
        } catch { /* continue */ }

        // --- 13 settings (drawer gear) -------------------------------------------
        do {
            guard openDrawer(frame: "13-settings", step: "settings") else { throw SearchDone() }
            let gear = app.buttons["v2-drawer-settings"].firstMatch
            guard gear.waitForExistence(timeout: 10) else {
                recordMissing(frame: "13-settings", step: "settings", element: "settings gear")
                throw SearchDone()
            }
            gear.tap()
            guard scoped("settings-screen").exists else {
                recordMissing(frame: "13-settings", step: "settings", element: "settings screen")
                throw SearchDone()
            }
            settle(1)
            shot("13-settings")
            let back = app.buttons["settings-back"].firstMatch
            if back.waitForExistence(timeout: 5) { back.tap() } else { app.swipeDown() }
            settle(1)
        } catch { /* continue */ }

        // --- 14 notifications (drawer bell) ----------------------------------------
        do {
            guard openDrawer(frame: "14-notifications", step: "notifications") else { throw SearchDone() }
            let bell = app.buttons["v2-drawer-bell"].firstMatch
            guard bell.waitForExistence(timeout: 10) else {
                recordMissing(frame: "14-notifications", step: "notifications", element: "notifications bell")
                throw SearchDone()
            }
            bell.tap()
            settle(1)
            shot("14-notifications")
            let done = app.buttons["Done"].firstMatch
            if done.waitForExistence(timeout: 5) { done.tap() } else { app.swipeDown() }
            settle(1)
        } catch { /* continue */ }

        note("captured=\(capturedFrames.count) missing=\(missingFrames.joined(separator: ","))")
        attachTiming()
    }

    /// Control-flow marker: thrown to skip the rest of one guarded block.
    private struct SearchDone: Error {}
}
