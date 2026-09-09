// R66JumpToLatestUITests.swift — Corner native iOS
// corner:corner-v2 R66c — the Slack-gap "jump to latest" button.
//
// The v2 chat had a new-messages pill (only on arrivals). Scrolling up to
// re-read with NO new messages left no way back to the newest row. This adds a
// floating chevron (id v2-jump-to-latest) that shows whenever you're scrolled
// up and returns you to the tail. Regression guard: the button is hidden at the
// bottom, appears when scrolled up, and hides again after it returns you.
//
// Uses -v2SeedLongThread (200 rows) so there is something to scroll.

import XCTest

final class R66JumpToLatestUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    func testJumpToLatestShowsWhenScrolledUpAndHidesAtBottom() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-v2FixtureUITest", "-v2SeedLongThread",
                                "-v2SkipSetup", "-v2SuppressHaptics"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not foreground")

        let btn = app.buttons["v2-jump-to-latest"]
        // A seeded thread lands at the bottom: the button is hidden.
        XCTAssertFalse(btn.waitForExistence(timeout: 4),
                       "jump-to-latest must be hidden at the bottom")

        // Scroll up a few times; the button appears.
        for _ in 0..<3 { app.swipeDown() }
        XCTAssertTrue(btn.waitForExistence(timeout: 6),
                      "jump-to-latest must appear when scrolled up")

        // Tapping returns to the tail and the button hides again.
        btn.tap()
        XCTAssertTrue(waitForNonExistence(btn, timeout: 6),
                      "jump-to-latest must hide once it returns you to the bottom")
    }

    private func waitForNonExistence(_ el: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if !el.exists { return true }
            Thread.sleep(forTimeInterval: 0.3)
        }
        return !el.exists
    }
}
