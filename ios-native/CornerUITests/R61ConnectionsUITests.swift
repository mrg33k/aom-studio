// R61ConnectionsUITests.swift — Corner native iOS
// corner:corner-v2 R61 — the agent connections panel (Patrik 2026-09-08).
//
// The feature has two entry points, one panel:
//   • per-room — the chat nav, left of the eye (id v2-connections-room);
//   • global — the drawer footer, beside the person mark (id
//     v2-connections-global).
// Both raise the same sheet, identified by its summary line
// (v2-connections-summary) and closed by v2-connections-close.
//
// This is the front-end regression guard Patrik asked for after features
// silently regressed twice: if either icon or the panel vanishes, one of
// these two tests goes red.

import XCTest

final class R61ConnectionsUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private static let base = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]

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

    private func openDrawer(_ scope: XCUIApplication) {
        scope.buttons.matching(identifier: "v2-drawer-button").firstMatch.tap()
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "v2-drawer").firstMatch
            .waitForExistence(timeout: 10), "the drawer never opened")
    }

    private func tapDrawerProject(_ scope: XCUIApplication, contains text: String, title: String) {
        let rows = scope.buttons.matching(identifier: "v2-drawer-project-row")
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 15), "no project rows in the drawer")
        for i in 0..<rows.count {
            let row = rows.element(boundBy: i)
            if row.label.localizedCaseInsensitiveContains(text) { row.tap(); break }
        }
        let want = scope.staticTexts.matching(identifier: "chat-title")
            .matching(NSPredicate(format: "label == %@", title)).firstMatch
        XCTAssertTrue(want.waitForExistence(timeout: 30), "tapping the row did not open \(title)")
    }

    private func summary(_ scope: XCUIApplication) -> XCUIElement {
        scope.staticTexts.matching(identifier: "v2-connections-summary").firstMatch
    }

    private func close(_ scope: XCUIApplication) {
        scope.buttons.matching(identifier: "v2-connections-close").firstMatch.tap()
    }

    /// The per-room icon (left of the eye) opens the panel; the panel carries
    /// its summary and at least one tool toggle; the close dismisses it.
    func testRoomConnectionsButtonOpensPanel() throws {
        let app = launch(Self.base)
        openHome(app)
        openDrawer(app)
        tapDrawerProject(app, contains: "Aster", title: "Aster")

        let button = app.buttons.matching(identifier: "v2-connections-room").firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 15), "no connections icon in the room nav")
        button.tap()

        XCTAssertTrue(summary(app).waitForExistence(timeout: 10), "the connections panel never opened from the room")
        XCTAssertTrue(
            app.switches.matching(identifier: "v2-connections-toggle-browser").firstMatch.waitForExistence(timeout: 10),
            "the panel shows no browser toggle")

        close(app)
        XCTAssertTrue(summary(app).waitForNonExistence(timeout: 10), "the panel never closed")
    }

    /// The global icon (drawer footer, beside the person mark) opens the same
    /// panel.
    func testGlobalConnectionsButtonOpensPanel() throws {
        let app = launch(Self.base)
        openHome(app)
        openDrawer(app)

        let button = app.buttons.matching(identifier: "v2-connections-global").firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 15), "no connections icon in the drawer footer")
        button.tap()

        XCTAssertTrue(summary(app).waitForExistence(timeout: 10), "the connections panel never opened from the menu")
        close(app)
        XCTAssertTrue(summary(app).waitForNonExistence(timeout: 10), "the panel never closed")
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
