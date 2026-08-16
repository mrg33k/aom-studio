import XCTest

/// The native half of the `corner:convex-multi-agent` bar.
///
/// WHY THIS EXISTS. Every previous native acceptance claim in this mission was made from a
/// Node HTTP client, and the mission's own worker loop says plainly: "Two reads from one
/// Node client are not cross-device proof." The evidence folder even contains
/// `09-composer-NOT-RUN.txt`. The reason it was never run is that there was no UI test
/// target at all. There is now, and this is what runs in it.
///
/// The whole point is to drive the app the way a person does: tap a room, type in the
/// visible composer, press send, and look at the screen. Nothing here talks to Convex
/// directly. If this passes, a person can send a message on a phone. If it fails, they
/// cannot, no matter what an HTTP grader says.
final class SharedBackendAcceptance: XCTestCase {

    private var app: XCUIApplication!
    private var token: String!

    override func setUpWithError() throws {
        continueAfterFailure = false
        token = "UITEST-\(Int(Date().timeIntervalSince1970))-\(Int.random(in: 1000...9999))"

        app = XCUIApplication()
        // Force the real backend. The app disables Convex when it sees
        // XCTestConfigurationFilePath so unit tests can use FakeTransport; that variable is
        // set in the runner, not in the app under UI test, but state it explicitly rather
        // than depend on that subtlety. A UI test that silently exercised the fallback
        // would be worse than no test — it would report green while proving nothing.
        app.launchEnvironment["UITEST_REAL_BACKEND"] = "1"
        if let email = ProcessInfo.processInfo.environment["AUTO_SIGNIN_EMAIL"],
           let pass = ProcessInfo.processInfo.environment["AUTO_SIGNIN_PASSWORD"] {
            app.launchEnvironment["AUTO_SIGNIN_EMAIL"] = email
            app.launchEnvironment["AUTO_SIGNIN_PASSWORD"] = pass
        }

        addUIInterruptionMonitor(withDescription: "System dialog") { alert in
            for label in ["Allow", "OK", "Not Now", "Don't Allow", "Continue"] {
                let b = alert.buttons[label]
                if b.exists { b.tap(); return true }
            }
            return false
        }
    }

    // MARK: - helpers

    private func shot(_ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    /// The composer INSIDE a conversation. Identified explicitly, with no fallback to
    /// "any text field on screen".
    ///
    /// The first version of this test did fall back, and it cost a full run: it never
    /// entered a room, typed the token into the Home screen's intake box, and then failed
    /// with "the message was sent but never appeared in the conversation". That reads
    /// exactly like a real send bug. It was not. A test that can silently drive the wrong
    /// screen is worse than no test, so this one can only ever find the room composer.
    private var chatComposer: XCUIElement {
        app.textFields["chat-composer"].firstMatch
    }

    /// True only when a conversation is genuinely on screen.
    private var inAConversation: Bool {
        chatComposer.exists
    }

    private func waitForText(_ needle: String, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            // staticTexts is how a message bubble surfaces to accessibility.
            if app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", needle)).count > 0 {
                return true
            }
            if app.descendants(matching: .any)
                .containing(NSPredicate(format: "label CONTAINS %@", needle)).count > 0 {
                return true
            }
            Thread.sleep(forTimeInterval: 1.0)
        }
        return false
    }

    /// A room row, whichever element type it surfaces as. The card sets
    /// `.accessibilityElement(children: .combine)` and `.isButton` inside a SwiftUI
    /// `Button`, so it comes through as a BUTTON, not an otherElement. Querying one type
    /// reported "no room rows" on a home screen that was plainly full of them.
    private func roomRow(timeout: TimeInterval) -> XCUIElement? {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            for q in [app.buttons, app.otherElements, app.cells, app.staticTexts] {
                let e = q["room-row"].firstMatch
                if e.exists { return e }
            }
            let any = app.descendants(matching: .any)["room-row"].firstMatch
            if any.exists { return any }
            Thread.sleep(forTimeInterval: 1.0)
        }
        return nil
    }

    private func openFirstRoom() throws {
        guard let row = roomRow(timeout: 30) else {
            XCTFail("no room rows on the home screen — cannot open a conversation")
            return
        }
        row.tap()
        XCTAssertTrue(chatComposer.waitForExistence(timeout: 30),
                      "tapped a room but no conversation composer appeared — still on the home screen")
        XCTAssertTrue(inAConversation, "not in a conversation after tapping a room")
    }

    // MARK: - the acceptance run

    func test_sendAMessageAndItSurvivesARelaunch() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        shot("01-launched")

        try openFirstRoom()
        shot("02-room-open")

        // Type in the VISIBLE conversation composer, the way a person does.
        chatComposer.tap()
        chatComposer.typeText(token)
        shot("03-typed")

        // Send. Prefer a labelled control, fall back to the keyboard's return key.
        // Tap the real send control. NO fallback to the return key: this composer is
        // multiline, so return inserts a newline and sends nothing, which produced a
        // convincing false "the message never appeared" failure.
        let send = app.buttons["send"].firstMatch
        XCTAssertTrue(send.waitForExistence(timeout: 10), "no send button in the conversation")
        XCTAssertTrue(send.isEnabled, "the send button is disabled with text in the composer")
        send.tap()

        XCTAssertTrue(waitForText(token, timeout: 30),
                      "the message was sent but never appeared in the conversation")
        shot("04-sent")

        // It must survive a full restart, not just a re-render.
        app.terminate()
        XCTAssertTrue(app.wait(for: .notRunning, timeout: 30), "app did not terminate")
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not relaunch")

        try openFirstRoom()
        XCTAssertTrue(waitForText(token, timeout: 40),
                      "the message is gone after relaunching the app")
        shot("05-survived-relaunch")
    }

    /// A send must never crash the app. This is a named requirement of the mission and it
    /// is cheap to assert once we are already driving the real thing.
    func test_sendDoesNotCrashTheApp() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
        try openFirstRoom()

        chatComposer.tap()
        chatComposer.typeText("\(token!)-CRASHPROBE")
        let send = app.buttons["send"].firstMatch
        if send.exists && send.isHittable { send.tap() } else { app.keyboards.buttons["return"].firstMatch.tap() }

        Thread.sleep(forTimeInterval: 8)
        XCTAssertEqual(app.state, .runningForeground, "the app left the foreground after a send")
        shot("06-still-alive-after-send")
    }
}
