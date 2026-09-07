import XCTest

/// Native plan Task 4, Step 1: Workspace → Project → Mission navigation,
/// R23-rebased on the thread entry.
///
/// R23 P070 retired the home tree: the app opens INTO the last thread (or
/// General's) and every navigation happens through the drawer. These tests
/// drive the app like a person — entry thread, drawer rows, intake sheet —
/// and never touch the tree identifiers.
///
/// Backend: the rehearsal deployment (CONVEX_BASE_URL in the test
/// environment, forwarded to the app — never hardcoded here). Credentials:
/// TOUR_EMAIL / TOUR_PASSWORD in the test environment, forwarded to the
/// app's AUTO_SIGNIN hook. No URL, token, or account appears in this file.
///
/// If the account has no v2 projects yet, `ensureWorkspace` runs through the
/// app's own refresh path and the test creates one project + one mission
/// through the UI; that live tree is the fixture.
final class CornerV2FlowUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        let env = ProcessInfo.processInfo.environment
        // Hermetic fixture mode (default): the app serves fixture-shaped data
        // in-process — deterministic, no network, no account. Rehearsal mode
        // (V2_FIXTURE_STUB=0 with CONVEX_BASE_URL + TOUR_* in the environment)
        // drives the real deployment once its password sign-in works again.
        let stubMode = (env["V2_FIXTURE_STUB"] ?? "1") == "1"
        if stubMode {
            // R23: -v2ResetEntry pins the entry to General's thread, so every
            // test starts on the same thread. Tests that assert persistence
            // across a relaunch build their own app without it.
            app.launchArguments += ["-v2FixtureUITest", "-v2ResetEntry"]
        } else {
            app.launchEnvironment["UITEST_REAL_BACKEND"] = "1"
            if let base = env["CONVEX_BASE_URL"], !base.isEmpty {
                app.launchEnvironment["CONVEX_BASE_URL"] = base
            }
            if let email = env["TOUR_EMAIL"], let pass = env["TOUR_PASSWORD"],
               !email.isEmpty, !pass.isEmpty {
                app.launchEnvironment["AUTO_SIGNIN_EMAIL"] = email
                app.launchEnvironment["AUTO_SIGNIN_PASSWORD"] = pass
            }
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

    /// Screenshot to the test result AND to the evidence dir (R14_EVIDENCE_DIR
    /// or R11_EVIDENCE_DIR or /tmp/r11-evidence) so the run report can attach
    /// the PNGs. EVIDENCE_PREFIX renames the run (R14-native for this round).
    private func evidence(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attach = XCTAttachment(screenshot: shot)
        attach.name = name
        attach.lifetime = .keepAlways
        add(attach)
        let env = ProcessInfo.processInfo.environment
        let prefix = env["EVIDENCE_PREFIX"] ?? "R11-native"
        let dir = env["R14_EVIDENCE_DIR"] ?? env["R11_EVIDENCE_DIR"] ?? "/tmp/r11-evidence"
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "\(dir)/\(prefix)-\(name).png"))
    }

    /// The chat header title (exact: `Project` or the mission name — R23 P071).
    private var chatTitle: XCUIElement {
        app.staticTexts.matching(identifier: "chat-title").firstMatch
    }

    private var chatScreen: XCUIElement {
        app.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
    }

    private func waitForCount(_ query: XCUIElementQuery, _ count: Int, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if query.count >= count { return true }
            Thread.sleep(forTimeInterval: 2.0)
        }
        return query.count >= count
    }

    // MARK: - v2 entry + drawer helpers (R23 P070)

    /// The entry thread is up — no tree, no taps. The launch lands on it.
    private func openEntryThread(_ scope: XCUIApplication, timeout: TimeInterval = 30) {
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
            .waitForExistence(timeout: timeout), "the entry thread never appeared")
    }

    /// No home tree anywhere: the retired identifiers never resolve.
    private func assertNoTree(_ scope: XCUIApplication) {
        XCTAssertEqual(scope.descendants(matching: .any).matching(identifier: "workspace-project-row").count, 0,
                       "the retired home tree is on screen")
        XCTAssertFalse(scope.descendants(matching: .any).matching(identifier: "room-list-screen").firstMatch.exists,
                       "the retired home screen is on screen")
    }

    private func openDrawer(_ scope: XCUIApplication) {
        let drawer = scope.descendants(matching: .any).matching(identifier: "v2-drawer").firstMatch
        // Idempotent: the burger sits under the open drawer, so tapping it
        // again would hit the scrim and close what the test wants open.
        if drawer.waitForExistence(timeout: 3) { return }
        scope.buttons.matching(identifier: "v2-drawer-button").firstMatch.tap()
        XCTAssertTrue(drawer.waitForExistence(timeout: 10), "the drawer never opened")
    }

    /// Tap the drawer row (project or mission) whose label contains the text,
    /// then wait for the thread with that exact title.
    private func tapDrawerRow(_ scope: XCUIApplication, id: String, contains text: String, title: String) {
        let rows = scope.buttons.matching(identifier: id)
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 15), "no \(id) rows in the drawer")
        var tapped = false
        for i in 0..<rows.count {
            let row = rows.element(boundBy: i)
            if row.label.localizedCaseInsensitiveContains(text) {
                row.tap()
                tapped = true
                break
            }
        }
        XCTAssertTrue(tapped, "no \(id) row contains \(text)")
        let want = scope.staticTexts.matching(identifier: "chat-title")
            .matching(NSPredicate(format: "label == %@", title)).firstMatch
        XCTAssertTrue(want.waitForExistence(timeout: 30), "tapping the row did not open \(title)")
    }

    /// The intake sheet's field (TextField or TextView — the multiline field
    /// exposes either shape depending on OS version).
    private func intakeField(_ scope: XCUIApplication) -> XCUIElement {
        let field = scope.textFields.matching(identifier: "global-intake-field").firstMatch
        if field.waitForExistence(timeout: 10) { return field }
        return scope.textViews.matching(identifier: "global-intake-field").firstMatch
    }

    /// Raise the intake sheet from the drawer (optionally scoped to a project
    /// via its `+`), type, and send. Leaves the confirm sheet up.
    private func sendIntake(_ scope: XCUIApplication, _ text: String, projectAdd: String? = nil) {
        openDrawer(scope)
        if let projectAdd {
            scope.buttons.matching(identifier: "v2-drawer-project-add")
                .matching(NSPredicate(format: "label == %@", "New mission in \(projectAdd)")).firstMatch.tap()
        } else {
            scope.buttons.matching(identifier: "v2-drawer-new").firstMatch.tap()
        }
        let field = intakeField(scope)
        XCTAssertTrue(field.waitForExistence(timeout: 15), "the intake sheet never appeared")
        field.tap()
        field.typeText(text)
        scope.buttons.matching(identifier: "global-intake-send").firstMatch.tap()
        XCTAssertTrue(scope.buttons.matching(identifier: "intake-confirm-create").firstMatch
            .waitForExistence(timeout: 30), "no creation confirmation for the intake")
    }

    // MARK: - v2 chat helpers (native Task 5)

    /// The v2 composer field (TextField or TextView — the multiline field
    /// exposes either shape depending on OS version).
    private func v2Field(in scope: XCUIApplication) -> XCUIElement {
        let field = scope.textFields.matching(identifier: "v2-composer-field").firstMatch
        if field.waitForExistence(timeout: 15) { return field }
        return scope.textViews.matching(identifier: "v2-composer-field").firstMatch
    }

    private func v2Send(in scope: XCUIApplication) -> XCUIElement {
        scope.buttons.matching(identifier: "v2-composer-send").firstMatch
    }

    private func sendInV2Chat(_ scope: XCUIApplication, _ text: String) {
        let field = v2Field(in: scope)
        XCTAssertTrue(field.waitForExistence(timeout: 15), "no v2 composer field in the chat")
        field.tap()
        field.typeText(text)
        let send = v2Send(in: scope)
        XCTAssertTrue(send.waitForExistence(timeout: 10), "no v2 composer send button")
        send.tap()
    }

    // MARK: - R23 P070 entry tests

    /// Launching lands straight on the last thread — never on a tree. From a
    /// clean slate that is General's thread; after visiting the seeded Ship
    /// mission, a relaunch restores the mission (R23 P071: mission name only).
    func testLaunchOpensLastThreadNotATree() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2RouteMode=confirm"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)
        // A clean launch lands on General's empty thread: the welcome home
        // (R41) — no nav title, the greeting, three cards — never a tree.
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "chat-title").firstMatch.exists,
            "home shows a nav title"
        )
        let home = app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 15), "a clean launch does not open General's home")
        assertNoTree(app)
        evidence("R23-entry-general")

        // Visit the seeded mission through the drawer: its thread becomes the
        // stored last thread. (The seed re-seeds every launch, so the stored
        // id still resolves after the relaunch below.)
        openDrawer(app)
        let expand = app.buttons.matching(identifier: "v2-drawer-project-expand")
            .matching(NSPredicate(format: "label == 'Expand Aster'")).firstMatch
        if expand.waitForExistence(timeout: 10) { expand.tap() }
        tapDrawerRow(app, id: "v2-drawer-mission-row",
                     contains: "Ship home page", title: "Ship home page")
        XCTAssertTrue(app.staticTexts.matching(identifier: "chat-subtitle").firstMatch.exists,
                      "the mission thread shows no project line")
        assertNoTree(app)
        evidence("R23-entry-mission")
        app.terminate()

        // Relaunch with no taps: the mission thread is the entry, not a tree.
        let back = XCUIApplication()
        back.launchArguments += ["-v2FixtureUITest", "-v2RouteMode=confirm"]
        back.launch()
        XCTAssertTrue(back.wait(for: .runningForeground, timeout: 30), "app did not relaunch")
        openEntryThread(back)
        XCTAssertEqual(back.staticTexts.matching(identifier: "chat-title").firstMatch.label, "Ship home page",
                       "relaunch did not restore the last thread")
        assertNoTree(back)
    }

    /// The drawer carries every home action the tree offered: search, New /
    /// Project +, projects with missions, per-project `+`,
    /// Files rows, and identity + bell + gear.
    func testDrawerCarriesEveryHomeAction() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2SeedVisual"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)
        openDrawer(app)

        for id in ["v2-drawer-close", "v2-drawer-search", "v2-drawer-new",
                   "v2-drawer-new-project",
                   "v2-drawer-project-row", "v2-drawer-project-add",
                   "v2-drawer-project-expand", "v2-drawer-new-mission",
                   "v2-drawer-bell", "v2-drawer-settings"] {
            XCTAssertTrue(app.descendants(matching: .any).matching(identifier: id).firstMatch
                .waitForExistence(timeout: 10), "the drawer is missing \(id)")
        }
        // General + Aster ride the fixture.
        XCTAssertGreaterThanOrEqual(
            app.buttons.matching(identifier: "v2-drawer-project-row").count, 2,
            "the drawer does not list the projects")
        // The entry project's missions + New-mission row are expanded by default.
        XCTAssertTrue(app.buttons.matching(identifier: "v2-drawer-new-mission").firstMatch.exists,
                      "no New-mission row under the entry project")
        // General's seeded artifacts surface as its Files row.
        let files = app.descendants(matching: .any).matching(identifier: "v2-drawer-files-row").firstMatch
        XCTAssertTrue(files.waitForExistence(timeout: 30), "no Files row under General")
        XCTAssertTrue(files.label.contains("6"), "General's Files row is not the 6 seeded artifacts: \(files.label)")
        evidence("R23-drawer-full")

        // Search filters to the match: Aster survives, General does not.
        let search = app.textFields.matching(identifier: "v2-drawer-search").firstMatch
        search.tap()
        search.typeText("Aster")
        let asterRow = app.buttons.matching(identifier: "v2-drawer-project-row")
            .matching(NSPredicate(format: "label == 'Aster'")).firstMatch
        XCTAssertTrue(asterRow.waitForExistence(timeout: 10), "search hid the Aster project")
        XCTAssertEqual(app.buttons.matching(identifier: "v2-drawer-project-row")
            .matching(NSPredicate(format: "label == 'General'")).count, 0,
            "search did not filter General out")
        app.buttons.matching(identifier: "v2-drawer-search-clear").firstMatch.tap()

        // The per-project `+` opens the intake scoped to that project.
        app.buttons.matching(identifier: "v2-drawer-project-add")
            .matching(NSPredicate(format: "label == 'New mission in Aster'")).firstMatch.tap()
        let scope = app.buttons.matching(identifier: "intake-project-context").firstMatch
        XCTAssertTrue(scope.waitForExistence(timeout: 15), "the intake sheet shows no Aster scope")
        XCTAssertTrue(scope.label.contains("Aster"), "the intake scope is not Aster: \(scope.label)")
        app.buttons.matching(identifier: "intake-close").firstMatch.tap()
    }

    // MARK: - native Task 5+ flows on the entry

    /// Send/reply with a visible agent label: `@research` rides as routing
    /// metadata, the reply carries the Research label, and the thread never
    /// navigates away (the title is still the project).
    func testV2ChatSendShowsAgentLabel() throws {
        app.launchArguments += ["-v2FixtureUITest"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)
        // The entry is General's empty thread: the welcome home shows no
        // title until the first message lands (R41).

        let probe = "@research find competitors \(Int(Date().timeIntervalSince1970))"
        let field = v2Field(in: app)
        XCTAssertTrue(field.waitForExistence(timeout: 15), "no v2 composer field in the chat")
        field.tap()
        field.typeText(probe)
        // The @brain suggestion may offer to complete the token; the raw
        // @research text sends as-is either way.
        let send = v2Send(in: app)
        XCTAssertTrue(send.waitForExistence(timeout: 10), "no v2 composer send button")
        send.tap()

        let labels = app.staticTexts.matching(identifier: "v2-agent-label")
        XCTAssertTrue(labels.firstMatch.waitForExistence(timeout: 60),
                      "no agent-labelled reply arrived after sending")
        XCTAssertTrue(labels.matching(NSPredicate(format: "label == 'Research'")).count >= 1,
                      "the @research reply carries no visible Research label")
        evidence("05-send-reply")
        // The first message ends the welcome: the title is back, still the project.
        let title = app.staticTexts.matching(identifier: "chat-title").firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 15), "the first message did not return the title")
        XCTAssertEqual(title.label, "General", "sending navigated away from the thread")
    }

    // MARK: - native Task 6 flows

    /// R24 P079: an in-thread send stays in the thread — no route card, no
    /// Move, title unchanged — even when a global send would route
    /// confidently elsewhere. Routing UI belongs to global-input sends.
    func testV2InThreadSendShowsNoRouteCard() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2RouteMode=confirm"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)

        let probe = "Where should this go \(Int(Date().timeIntervalSince1970))"
        sendInV2Chat(app, probe)
        // The text lands in THIS thread…
        XCTAssertTrue(app.staticTexts[probe].waitForExistence(timeout: 60),
                      "the in-thread send never echoed in its thread")
        // …with no routing card after it.
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "route-title").firstMatch.waitForExistence(timeout: 8),
            "an in-thread send showed routing UI"
        )
        XCTAssertFalse(
            app.buttons.matching(identifier: "route-move").firstMatch.waitForExistence(timeout: 3),
            "an in-thread send offered Move"
        )
        XCTAssertEqual(chatTitle.label, "General", "sending navigated away from the thread")
        evidence("07-inthread-no-route")
    }

    /// R24 P079's other half: a global intake send still routes — a
    /// confident match opens the destination thread, no card, no confirm.
    func testV2GlobalIntakeConfidentRouteNavigates() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2RouteMode=confirm"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)

        openDrawer(app)
        app.buttons.matching(identifier: "v2-drawer-new").firstMatch.tap()
        let field = intakeField(app)
        XCTAssertTrue(field.waitForExistence(timeout: 15), "the intake sheet never appeared")
        field.tap()
        field.typeText("Where should this go \(Int(Date().timeIntervalSince1970))")
        app.buttons.matching(identifier: "global-intake-send").firstMatch.tap()
        let moved = app.staticTexts.matching(identifier: "chat-title")
            .matching(NSPredicate(format: "label == 'Ship home page'")).firstMatch
        XCTAssertTrue(moved.waitForExistence(timeout: 30),
                      "the confident global route did not open the destination mission chat")
        evidence("07b-intake-routed")
    }

    /// R24 P080: tapping a question option selects its radio and sends the
    /// option text INTO this thread — never a global-routed send, never a
    /// router clarification card.
    func testV2QuestionOptionAnswersInThread() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2SeedCompMatch"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)

        let option = app.buttons.matching(identifier: "v2-option-q-press").firstMatch
        XCTAssertTrue(option.waitForExistence(timeout: 15), "no question option on the thread")
        option.tap()
        XCTAssertEqual(option.value as? String, "selected", "the tap did not select the radio")
        // The option text lands in THIS thread (option card + user echo)…
        let copies = app.staticTexts.matching(NSPredicate(format: "label == 'Press and partners'"))
        XCTAssertTrue(waitForCount(copies, 2, timeout: 60),
                      "the answer never landed in the thread")
        // …with no router clarification card after it.
        XCTAssertFalse(
            app.staticTexts.matching(identifier: "route-title").firstMatch.waitForExistence(timeout: 8),
            "the option tap routed globally"
        )
        XCTAssertEqual(chatTitle.label, "General", "answering navigated away from the thread")
        evidence("09-option-inthread")
    }

    /// R24 P075: a send the server rejects parks with "Not sent, tap to
    /// retry" + the plain reason — never "Offline" — and Retry sends it.
    func testV2RejectedSendShowsNotSentAndRetries() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2RejectNextSends=1"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)

        let probe = "Rejected draft \(Int(Date().timeIntervalSince1970))"
        sendInV2Chat(app, probe)
        let banner = app.descendants(matching: .any).matching(identifier: "v2-notsent-banner").firstMatch
        XCTAssertTrue(banner.waitForExistence(timeout: 30),
                      "the rejected send never parked in the Not-sent banner")
        let reason = app.staticTexts.matching(identifier: "v2-notsent-reason").firstMatch
        XCTAssertTrue(reason.waitForExistence(timeout: 10), "the banner names no reason")
        XCTAssertTrue(reason.label.contains("kept"), "the reason is not the plain kept-text sentence: \(reason.label)")
        XCTAssertFalse(
            app.descendants(matching: .any).matching(identifier: "v2-offline-banner").firstMatch
                .waitForExistence(timeout: 3),
            "a rejection read as Offline"
        )
        evidence("06c-notsent-banner")
        // Retry: the rejection is spent, so the replayed send lands and the
        // banner clears.
        app.buttons.matching(identifier: "v2-outbox-retry").firstMatch.tap()
        let gone = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: banner, handler: nil)
        wait(for: [gone], timeout: 30)
        XCTAssertTrue(app.staticTexts[probe].waitForExistence(timeout: 10),
                      "the retried text did not survive")
        evidence("06d-notsent-retried")
    }

    /// R24 P078: a step-only agent event paints its label — never a blank
    /// labelled row (web L011 twin).
    func testV2StepOnlyEventPaintsLabel() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2SeedStepOnly"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)

        XCTAssertTrue(app.staticTexts["Gathering the latest numbers"].waitForExistence(timeout: 30),
                      "the step-only event painted no label")
        evidence("10-step-only")
    }

    /// Open a project's chat through the drawer, by its accessible label.
    private func openProjectChatOn(_ scope: XCUIApplication, named name: String) {
        openDrawer(scope)
        tapDrawerRow(scope, id: "v2-drawer-project-row", contains: name, title: name)
    }

    /// A pending confirmation card confirms once and disappears; a second
    /// confirm never happens (the card is gone, so there is nothing to tap).
    func testV2ConfirmationCardConfirmsOnce() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2SeedConfirmation"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openProjectChatOn(app, named: "Aster")

        let summary = app.staticTexts.matching(identifier: "confirm-summary").firstMatch
        XCTAssertTrue(summary.waitForExistence(timeout: 60),
                      "no cross-project confirmation card on the source thread")
        XCTAssertEqual(summary.label, "update brief: Set primary to #5B9BFF")
        evidence("08-confirm-card")
        app.buttons.matching(identifier: "confirm-write").firstMatch.tap()
        let gone = expectation(
            for: NSPredicate(format: "exists == false"), evaluatedWith: summary, handler: nil
        )
        wait(for: [gone], timeout: 15)
        evidence("08b-confirm-done")
    }

    /// Offline queue: with sends failing, the message parks in the banner;
    /// after a relaunch with the network back, it sends once and the banner
    /// clears (the disk outbox survives the process death).
    func testV2OfflineQueueBannerAndReplay() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2FailNextSends=999"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(app)

        let probe = "Offline draft \(Int(Date().timeIntervalSince1970))"
        let field = v2Field(in: app)
        XCTAssertTrue(field.waitForExistence(timeout: 15), "no v2 composer field in the chat")
        field.tap()
        field.typeText(probe)
        v2Send(in: app).tap()

        let banner = app.descendants(matching: .any).matching(identifier: "v2-offline-banner").firstMatch
        XCTAssertTrue(banner.waitForExistence(timeout: 30),
                      "the failed send never parked in the offline queue banner")
        evidence("06-offline-queue")
        app.terminate()

        let back = XCUIApplication()
        back.launchArguments += ["-v2FixtureUITest"]
        back.launch()
        XCTAssertTrue(back.wait(for: .runningForeground, timeout: 30), "app did not relaunch")
        openEntryThread(back)
        XCTAssertTrue(back.staticTexts[probe].waitForExistence(timeout: 60),
                      "the queued message never sent after reconnect")
        evidence("06b-offline-replayed")
        XCTAssertFalse(back.descendants(matching: .any).matching(identifier: "v2-offline-banner").firstMatch.exists,
                       "the offline banner did not clear after the replay succeeded")
    }

    // MARK: - the flow: entry thread + drawer + intake sheet

    /// The person journey on the new entry: the launch IS General's thread;
    /// projects + missions live in the drawer; a mission is created through
    /// the intake sheet (scoped per project); a one-off proposes a General
    /// mission and cancels without creating anything.
    func testEntryThreadDrawerFlow() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")

        // 1. The launch lands straight on the thread — General's empty
        // thread, i.e. the welcome home (R41): no title, the greeting.
        openEntryThread(app)
        XCTAssertFalse(
            chatTitle.exists,
            "home shows a nav title"
        )
        let home = app.descendants(matching: .any).matching(identifier: "v2-home-welcome").firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 15), "a clean launch does not open General's home")
        assertNoTree(app)
        evidence("01-entry")

        // 2. The drawer lists the projects; Aster starts collapsed.
        openDrawer(app)
        let projectRows = app.buttons.matching(identifier: "v2-drawer-project-row")
        XCTAssertTrue(waitForCount(projectRows, 2, timeout: 30), "the drawer does not list the projects")
        evidence("02-drawer")

        // 3. A mission created through the per-project `+` opens its chat,
        // titled with the mission name only (R23 P071).
        sendIntake(app, "UI Mission alpha", projectAdd: "Aster")
        XCTAssertTrue(app.staticTexts["Create in Aster."].waitForExistence(timeout: 10),
                      "no creation confirmation for the new mission")
        evidence("02b-mission-confirm")
        app.buttons.matching(identifier: "intake-confirm-create").firstMatch.tap()
        let missionTitle = app.staticTexts.matching(identifier: "chat-title")
            .matching(NSPredicate(format: "label == 'UI Mission alpha'")).firstMatch
        XCTAssertTrue(missionTitle.waitForExistence(timeout: 30),
                      "confirming did not open the new mission chat")
        evidence("02c-mission-created")

        // 4. The new mission is a drawer row under Aster now.
        openDrawer(app)
        let expand = app.buttons.matching(identifier: "v2-drawer-project-expand")
            .matching(NSPredicate(format: "label == 'Expand Aster'")).firstMatch
        if expand.waitForExistence(timeout: 10) { expand.tap() }
        tapDrawerRow(app, id: "v2-drawer-mission-row",
                     contains: "UI Mission alpha", title: "UI Mission alpha")
        evidence("03-mission-chat")

        // 5. An unrelated one-off proposes a General mission instead of creating.
        let probe = "Summarize this invoice \(Int(Date().timeIntervalSince1970))"
        openDrawer(app)
        app.buttons.matching(identifier: "v2-drawer-new").firstMatch.tap()
        let field = intakeField(app)
        XCTAssertTrue(field.waitForExistence(timeout: 15), "no intake field in the sheet")
        field.tap()
        field.typeText(probe)
        app.buttons.matching(identifier: "global-intake-send").firstMatch.tap()
        XCTAssertTrue(app.buttons.matching(identifier: "intake-confirm-create").firstMatch
            .waitForExistence(timeout: 30), "typing a one-off did not show the creation confirmation")
        XCTAssertTrue(app.staticTexts["Create mission in General"].waitForExistence(timeout: 10),
                      "confirmation does not propose creating the mission in General")
        evidence("04-intake-confirm")
        // Dismiss without creating: nothing is silently created.
        app.buttons.matching(identifier: "intake-confirm-cancel").firstMatch.tap()
        app.buttons.matching(identifier: "intake-close").firstMatch.tap()
        openEntryThread(app)
    }

    // MARK: - R40 read window

    /// A full 200-row window offers "Earlier messages" at the top; tapping
    /// it asks +200 and the row leaves when the wider window returns no
    /// more (the fixture holds 200). The row sits above the fold, so the
    /// test scrolls up to it — first paint lands at the bottom by design.
    func testEarlierMessagesRowExpandsTheWindow() throws {
        let long = XCUIApplication()
        long.launchArguments += ["-v2FixtureUITest", "-v2ResetEntry", "-v2SeedLongThread"]
        long.launch()
        XCTAssertTrue(long.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openEntryThread(long)
        let longTitle = long.staticTexts.matching(identifier: "chat-title").firstMatch
        XCTAssertTrue(longTitle.waitForExistence(timeout: 15), "entry thread has no title")

        let earlier = long.buttons.matching(identifier: "v2-earlier-messages").firstMatch
        // First paint lands at the bottom by design and the list is lazy,
        // so the top row only enters the hierarchy once the test has
        // climbed ~200 rows — a dozen swipes never get there (R40b: the
        // row existed, the scroll budget did not). Swipe first, ask
        // after: each swipe settles faster than a fresh 3s wait.
        var found = earlier.waitForExistence(timeout: 5)
        for _ in 0..<30 where !found {
            long.swipeDown()
            found = earlier.exists
        }
        XCTAssertTrue(found, "a full 200-row window shows no Earlier messages row")
        earlier.tap()
        // The wider window answers with the same 200 (nothing older in
        // the fixture): the row leaves, the thread stays put.
        let gone = expectation(
            for: NSPredicate(format: "exists == FALSE"),
            evaluatedWith: long.buttons.matching(identifier: "v2-earlier-messages").firstMatch,
            handler: nil
        )
        wait(for: [gone], timeout: 15)
        XCTAssertTrue(longTitle.exists, "the expansion lost the thread")
        evidence("R40-earlier-expanded")
    }
}
