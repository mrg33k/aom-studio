// R43HomeFirstAndEyeUITests.swift — Corner native iOS
// corner:corner-v2 R43 — home-first entry, the eye cycle.
//
// Fixture mode throughout (deterministic, no backend):
// - P097: a cold launch lands on home (the General welcome); a relaunch
//   after visiting a thread still lands on home; a background return with
//   the `-v2HomeOnForeground` rig lands on home too. The eye sits
//   top-right on every chat.
// - P094/P095: the eye walks hidden → facetime → full → hidden; the mode
//   persists per thread across a relaunch; the site tab renders the
//   website-as-video stage.

import XCTest

final class R43HomeFirstAndEyeUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - launchers

    private static let base = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]
    // -v2ResetEntry (in base) also clears the per-thread eye modes, so
    // the cycle starts hidden deterministically.
    private static let visual = base + ["-v2SeedVisual", "-v2ResetVisual"]

    @discardableResult
    private func launch(_ args: [String]) -> XCUIApplication {
        app = XCUIApplication()
        app.launchArguments += args
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        return app
    }

    private func openHome(_ scope: XCUIApplication) {
        let welcome = scope.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch
        XCTAssertTrue(welcome.waitForExistence(timeout: 25), "the home welcome never appeared")
    }

    private func openEntryThread(_ scope: XCUIApplication, timeout: TimeInterval = 30) {
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
            .waitForExistence(timeout: timeout), "the entry thread never appeared")
    }

    private func eye(_ scope: XCUIApplication) -> XCUIElement {
        scope.buttons.matching(identifier: "v2-eye").firstMatch
    }

    private func eyeLabel(_ scope: XCUIApplication) -> String {
        eye(scope).label
    }

    private func openDrawer(_ scope: XCUIApplication) {
        scope.buttons.matching(identifier: "v2-drawer-button").firstMatch.tap()
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "v2-drawer").firstMatch
            .waitForExistence(timeout: 10), "the drawer never opened")
    }

    private func tapDrawerRow(_ scope: XCUIApplication, id: String, contains text: String, title: String) {
        let rows = scope.buttons.matching(identifier: id)
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 15), "no \(id) rows in the drawer")
        for i in 0..<rows.count {
            let row = rows.element(boundBy: i)
            if row.label.localizedCaseInsensitiveContains(text) {
                row.tap()
                break
            }
        }
        let want = scope.staticTexts.matching(identifier: "chat-title")
            .matching(NSPredicate(format: "label == %@", title)).firstMatch
        XCTAssertTrue(want.waitForExistence(timeout: 30), "tapping the row did not open \(title)")
    }

    private func openCard(_ scope: XCUIApplication, artifactID: String) {
        let card = scope.buttons.matching(identifier: "visual-open-\(artifactID)").firstMatch
        XCTAssertTrue(card.waitForExistence(timeout: 30), "no file card for \(artifactID) in the thread")
        card.tap()
    }

    private func dismissSheet(_ scope: XCUIApplication) {
        let close = scope.buttons.matching(identifier: "visual-sheet-close").firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 10), "no sheet close")
        close.tap()
        XCTAssertTrue(
            scope.otherElements.matching(identifier: "visual-sheet").firstMatch
                .waitForNonExistence(timeout: 10), "the sheet never closed")
    }

    // MARK: - P097 entry = home

    /// A cold launch lands on the home welcome — never the last thread,
    /// never a tree — with the eye top-right.
    func testColdLaunchLandsOnHome() throws {
        let app = launch(Self.base)
        openHome(app)
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "chat-title").firstMatch.exists,
            "home shows a nav title")
        XCTAssertTrue(eye(app).waitForExistence(timeout: 10), "no eye icon top-right on home")
    }

    /// Visit Aster's thread, relaunch with no taps: home again, not Aster.
    /// The last thread stays one tap away (drawer Recent + home cards —
    /// the drawer still lists it).
    func testRelaunchAfterVisitingThreadStillLandsOnHome() throws {
        let app = launch(Self.base)
        openHome(app)
        openDrawer(app)
        tapDrawerRow(app, id: "v2-drawer-project-row",
                     contains: "Aster", title: "Aster")
        app.terminate()

        let back = XCUIApplication()
        back.launchArguments += Self.base
        back.launch()
        XCTAssertTrue(back.wait(for: .runningForeground, timeout: 30), "app did not relaunch")
        openHome(back)
        XCTAssertFalse(
            back.staticTexts.matching(identifier: "chat-title").firstMatch.exists,
            "relaunch restored the last thread instead of home")
    }

    /// On Aster's thread, background and return with the rig forcing the
    /// long-background path: the app lands on home.
    func testBackgroundReturnLandsOnHome() throws {
        let app = launch(Self.base + ["-v2HomeOnForeground"])
        openHome(app)
        openDrawer(app)
        tapDrawerRow(app, id: "v2-drawer-project-row",
                     contains: "Aster", title: "Aster")
        XCUIDevice.shared.press(.home)
        Thread.sleep(forTimeInterval: 1)
        app.activate()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not return to the foreground")
        openHome(app)
    }

    // MARK: - P094/P095 the eye cycle

    /// Hidden →(tap) facetime →(tap) full →(close) hidden, with the PiP box
    /// and the sheet proving each mode. The site tab proves the
    /// website-as-video stage in full mode.
    func testEyeWalksFacetimeFullHidden() throws {
        let app = launch(Self.visual)
        openEntryThread(app)
        XCTAssertEqual(eyeLabel(app), "Visual window: hidden", "a fresh thread starts hidden")

        // The thread carries seeded file cards: open the pdf straight into
        // full mode (every sheet raise lands in full).
        openCard(app, artifactID: "artifact-pdf-1")
        let sheet = app.otherElements.matching(identifier: "visual-sheet").firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 15), "opening the pdf raised no sheet")
        XCTAssertEqual(eyeLabel(app), "Visual window: full")

        // The site card renders the website-as-video stage: the desktop
        // page, scrollable inside, in a ~third-screen frame.
        dismissSheet(app)
        openCard(app, artifactID: "artifact-site-1")
        XCTAssertTrue(
            app.otherElements.matching(identifier: "visual-sheet").firstMatch
                .waitForExistence(timeout: 15), "opening the site raised no sheet")
        XCTAssertTrue(
            app.descendants(matching: .any).matching(identifier: "visual-stage-web").firstMatch
                .waitForExistence(timeout: 15),
            "the site tab shows no website stage in full mode")

        // The person's close is the ring's full→hidden step (on iPhone the
        // sheet covers the eye, so the close carries it).
        dismissSheet(app)
        XCTAssertEqual(eyeLabel(app), "Visual window: hidden", "closing the full window hides it")

        // Tap 1 → FaceTime with the SITE selected: R56 docks the site tab
        // as the full-width 16:9 band under the nav — never the portrait
        // box (a desktop page squeezed into 110pt reads as nothing).
        eye(app).tap()
        let siteBand = app.descendants(matching: .any).matching(identifier: "v2-facetime-site").firstMatch
        XCTAssertTrue(siteBand.waitForExistence(timeout: 10), "tap 1 raised no FaceTime site band")
        XCTAssertEqual(eyeLabel(app), "Visual window: FaceTime")
        XCTAssertFalse(sheet.exists, "FaceTime mode raised the sheet")
        XCTAssertFalse(
            app.descendants(matching: .any).matching(identifier: "v2-facetime").firstMatch.exists,
            "the site tab must not use the portrait box")
        // Tap 2 → full: the sheet returns (the band, like the box, also
        // pulls up on tap — the eye is the deterministic test path).
        eye(app).tap()
        XCTAssertTrue(sheet.waitForExistence(timeout: 10), "tap 2 raised no full window")
        XCTAssertEqual(eyeLabel(app), "Visual window: full")
        dismissSheet(app)

        // The portrait box is for document tabs: open the pdf, close it,
        // tap 1 → FaceTime is the floating box, no sheet.
        openCard(app, artifactID: "artifact-pdf-1")
        dismissSheet(app)
        eye(app).tap()
        let pip = app.descendants(matching: .any).matching(identifier: "v2-facetime").firstMatch
        XCTAssertTrue(pip.waitForExistence(timeout: 10), "tap 1 raised no FaceTime window")
        XCTAssertEqual(eyeLabel(app), "Visual window: FaceTime")
        XCTAssertFalse(sheet.exists, "FaceTime mode raised the sheet")
        // The PiP is the brief's box: ~110×160, top-right.
        XCTAssertEqual(pip.frame.width, 110, accuracy: 2)
        XCTAssertEqual(pip.frame.height, 160, accuracy: 2)
        XCTAssertGreaterThan(pip.frame.minX, 200, "the FaceTime window is not top-right")

        // Tap 2 → full: the sheet returns.
        eye(app).tap()
        XCTAssertTrue(sheet.waitForExistence(timeout: 10), "tap 2 raised no full window")
        XCTAssertEqual(eyeLabel(app), "Visual window: full")
    }

    /// The mode persists per thread: leave a thread in FaceTime, relaunch,
    /// come back to FaceTime.
    func testEyeModePersistsPerThread() throws {
        // The first launch resets the eye through -v2ResetEntry; the
        // relaunch drops the reset (a real relaunch never resets), or there
        // is nothing to persist.
        let app = launch(Self.base)
        openHome(app)
        eye(app).tap()
        XCTAssertEqual(eyeLabel(app), "Visual window: FaceTime")
        app.terminate()

        let back = XCUIApplication()
        back.launchArguments += ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics"]
        back.launch()
        XCTAssertTrue(back.wait(for: .runningForeground, timeout: 30), "app did not relaunch")
        openHome(back)
        XCTAssertEqual(eyeLabel(back), "Visual window: FaceTime", "the thread forgot its eye mode")
    }
}

private extension XCUIElement {
    func waitForNonExistence(timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !exists { return true }
            Thread.sleep(forTimeInterval: 0.5)
        }
        return !exists
    }
}
