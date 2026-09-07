// R41HomeWelcomeUITests.swift — Corner native iOS
// corner:corner-v2 R41 — the phone's home is a welcome screen.
//
// Fixture mode throughout (deterministic, no backend). Each test launches
// its own app on General's thread (-v2ResetEntry pins it; the fixture
// General starts empty, so home shows) and drives the welcome like a
// person: logo centred, welcome line, three cards, no empty-state bubble,
// card tap → project thread with the composer pre-filled (never sent).

import XCTest

final class R41HomeWelcomeUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - launchers

    private static let base = ["-v2FixtureUITest", "-v2SkipSetup", "-v2SuppressHaptics", "-v2ResetEntry"]
    /// The home ledger window: one noise row (newest, must drop), one Aster
    /// row, one General row, one foreign subject (must skip).
    private static let seeded = base + ["-v2SeedHome"]

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

    private func cards(_ scope: XCUIApplication) -> XCUIElementQuery {
        scope.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'v2-home-card-'"))
    }

    private func waitForCount(_ query: XCUIElementQuery, _ count: Int, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if query.count >= count { return true }
            Thread.sleep(forTimeInterval: 0.5)
        }
        return query.count >= count
    }

    private func field(_ scope: XCUIApplication) -> XCUIElement {
        scope.textFields.matching(identifier: "v2-composer-field").firstMatch
    }

    /// Empty the composer through the delete key, so the pre-filled draft
    /// leaves no disk trace for later suites.
    private func clearField(_ scope: XCUIApplication) {
        let f = field(scope)
        guard f.waitForExistence(timeout: 10) else { return }
        f.tap()
        let delete = scope.keyboards.keys["delete"].firstMatch
        for _ in 0..<120 {
            guard let value = f.value as? String, !value.isEmpty else { return }
            if delete.waitForExistence(timeout: 2) {
                delete.tap()
            } else {
                return
            }
        }
    }

    // MARK: - welcome

    /// Logo centred in the content column, the welcome line, three
    /// ledger-driven cards — and the old empty state is gone.
    func testHomeShowsWelcomeLogoAndThreeLedgerCards() throws {
        let app = launch(Self.seeded)
        openHome(app)
        let welcome = app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch
        // The fixture account is named "UITest": the first name rides the
        // welcome end to end (never an email, never a "+" string).
        XCTAssertEqual(welcome.label, "Welcome UITest")
        // The logo lives in the content column, centred — not in the nav.
        let logo = app.descendants(matching: .any).matching(identifier: "v2-home-logo").firstMatch
        XCTAssertTrue(logo.exists, "no home logo")
        let midX = app.windows.firstMatch.frame.midX
        XCTAssertEqual(logo.frame.midX, midX, accuracy: 3, "the home logo is not centred")
        // Three cards: Aster, General, then the first onboarding fill.
        XCTAssertTrue(waitForCount(cards(app), 3, timeout: 10), "home does not show three cards")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-home-card-0").firstMatch.label, "Aster")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-home-card-1").firstMatch.label, "General")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-home-card-2").firstMatch.label, "Bring in your context")
        // The newest row was noise: the Aster card carries the older real
        // sentence, and no run-noise text is anywhere on screen.
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Shipped the Aster home page hero.")).count > 0,
            "the Aster card lost its ledger sentence"
        )
        XCTAssertEqual(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "corner-v2-chat run")).count, 0,
            "run noise reached the home"
        )
        // The crossed-out empty state is gone: no bubble text, no nav title.
        XCTAssertEqual(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "No messages yet")).count, 0,
            "the empty-state bubble survived"
        )
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "chat-title").firstMatch.exists,
            "home shows a nav title"
        )
        // The composer stays docked with General's invite.
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 10), "no composer field on home")
        XCTAssertEqual(f.placeholderValue, "Tell General what to make next")
    }

    /// Tapping the Aster card opens Aster's thread with the composer
    /// pre-filled "Pick up where we left off on Aster." — staged, not sent.
    func testHomeCardTapOpensProjectWithPrefill() throws {
        let app = launch(Self.seeded)
        openHome(app)
        XCTAssertTrue(waitForCount(cards(app), 3, timeout: 10), "home does not show three cards")
        app.buttons.matching(identifier: "v2-home-card-0").firstMatch.tap()
        let title = app.staticTexts.matching(identifier: "chat-title").firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 15), "tapping the card did not open the thread")
        XCTAssertEqual(title.label, "Aster")
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 10), "no composer field in the opened thread")
        XCTAssertEqual(f.value as? String, "Pick up where we left off on Aster.")
        // Pre-filled, not sent: the line is in the field, not the thread.
        XCTAssertFalse(
            app.staticTexts["Pick up where we left off on Aster."].firstMatch.exists,
            "the tap sent the pre-fill"
        )
        clearField(app)
    }

    /// A card naming the thread already showing pre-fills in place: tapping
    /// General's own card stages the draft here instead of navigating.
    func testHomeGeneralCardPrefillsInPlace() throws {
        let app = launch(Self.seeded)
        openHome(app)
        XCTAssertTrue(waitForCount(cards(app), 3, timeout: 10), "home does not show three cards")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-home-card-1").firstMatch.label, "General")
        app.buttons.matching(identifier: "v2-home-card-1").firstMatch.tap()
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 10), "no composer field on home")
        XCTAssertEqual(f.value as? String, "Pick up where we left off on General.")
        // Still home: the welcome stays, no title, nothing sent.
        XCTAssertTrue(
            app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch.exists,
            "the in-place pre-fill left home"
        )
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "chat-title").firstMatch.exists,
            "the in-place pre-fill raised a title"
        )
        clearField(app)
    }

    /// With no ledger rows, the three onboarding rows fill in order, and an
    /// onboarding tap pre-fills this thread's composer without navigating.
    func testHomeOnboardingFillWithoutLedger() throws {
        let app = launch(Self.base)
        openHome(app)
        XCTAssertTrue(waitForCount(cards(app), 3, timeout: 10), "home does not show three cards")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-home-card-0").firstMatch.label, "Bring in your context")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-home-card-1").firstMatch.label, "Connect where the work lives")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-home-card-2").firstMatch.label, "Start your first project")
        app.buttons.matching(identifier: "v2-home-card-2").firstMatch.tap()
        let f = field(app)
        XCTAssertTrue(f.waitForExistence(timeout: 10), "no composer field on home")
        XCTAssertEqual(f.value as? String, "I want to start a new project: ")
        // Still home: the welcome stays, no title, nothing sent.
        XCTAssertTrue(
            app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch.exists,
            "the onboarding tap left home"
        )
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "chat-title").firstMatch.exists,
            "the onboarding tap raised a title"
        )
        clearField(app)
    }
}
