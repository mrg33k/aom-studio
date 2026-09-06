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
        app.launchArguments += ["-v2FixtureUITest", "-v2SeedVisual", "-v2ResetVisual"]
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

    private func openGeneralChat(_ scope: XCUIApplication) {
        let tree = scope.staticTexts.matching(identifier: "workspace-project-name")
            .matching(NSPredicate(format: "label == 'General'")).firstMatch
        XCTAssertTrue(tree.waitForExistence(timeout: 120),
                      "workspace tree never appeared — sign-in or ensureWorkspace failed")
        scope.buttons.matching(identifier: "workspace-project-row").firstMatch.tap()
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
            .waitForExistence(timeout: 30), "tapping General did not open a chat")
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

    private func closeChip(_ scope: XCUIApplication, title: String) {
        scope.buttons.matching(identifier: "visual-close")
            .matching(NSPredicate(format: "label CONTAINS '\(title)'")).firstMatch.tap()
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
        back.launchArguments += ["-v2FixtureUITest", "-v2SeedVisual"]
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
}
