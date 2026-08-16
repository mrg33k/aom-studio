import XCTest

// corner:native-ios R21 — ASC screenshot capture.

final class ScreenshotCapture: XCTestCase {

    private let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = true
        addUIInterruptionMonitor(withDescription: "System Dialog") { alert in
            for label in ["Not Now", "Don't Allow", "OK", "Allow"] {
                let btn = alert.buttons[label]
                if btn.exists { btn.tap(); return true }
            }
            return false
        }
    }

    private func tapAt(x: CGFloat, y: CGFloat) {
        app.coordinate(withNormalizedOffset: CGVector(dx: x, dy: y)).tap()
    }

    private func capture(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attach = XCTAttachment(screenshot: shot)
        attach.name = name
        attach.lifetime = .keepAlways
        add(attach)
    }

    private func signIn(email: String, password: String) {
        let emailField = app.textFields.firstMatch
        guard emailField.waitForExistence(timeout: 90) else {
            XCTFail("Email field not found"); return
        }
        emailField.tap()
        emailField.typeText(email)
        sleep(1)

        // Retry loop for password field in case of interruption
        for attempt in 1...3 {
            let pwField = app.secureTextFields.firstMatch
            if pwField.waitForExistence(timeout: 10) {
                pwField.tap()
                sleep(1)
                // Trigger and dismiss any interruption first
                tapAt(x: 0.5, y: 0.5)
                sleep(1)
                // Re-tap password field
                let pw2 = app.secureTextFields.firstMatch
                if pw2.exists {
                    pw2.tap()
                    pw2.typeText(password)
                    break
                }
            }
            if attempt < 3 { sleep(2) }
        }
        sleep(1)

        let signIn = app.buttons["Sign in"]
        if signIn.waitForExistence(timeout: 5) {
            signIn.tap()
        }
        sleep(15)
    }

    func testDemoHomeAndAgents() throws {
        app.launch()
        sleep(3)
        signIn(email: "demo@corner.aheadofmarket.com", password: "Corner-Review-2026!")
        sleep(5)
        capture("demo-00-home")
        tapAt(x: 0.25, y: 0.185)
        sleep(3)
        capture("demo-01-agents")
    }

    func testQAChat() throws {
        app.launch()
        sleep(3)
        signIn(email: "onboarding-qa@corner.aheadofmarket.com", password: "Corner-QA-2027!")
        sleep(3)
        capture("qa-00-home")
        tapAt(x: 0.50, y: 0.37)
        sleep(8)
        capture("qa-01-chat")
    }
}
