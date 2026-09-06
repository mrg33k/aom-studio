import XCTest

/// Native plan Task 4, Step 1: Workspace → Project → Mission navigation on
/// the rehearsal deployment, driven like a person.
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
            app.launchArguments += ["-v2FixtureUITest"]
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

    /// The tree's presence, read off the General project name: container
    /// identifiers swallow row identifiers in this hierarchy, so the test
    /// never identifies containers.
    private var workspaceTree: XCUIElement {
        projectNames().matching(NSPredicate(format: "label == 'General'")).firstMatch
    }

    private func projectRows() -> XCUIElementQuery {
        app.descendants(matching: .any).matching(identifier: "workspace-project-row")
    }

    private func projectNames() -> XCUIElementQuery {
        app.staticTexts.matching(identifier: "workspace-project-name")
    }

    private func missionRows() -> XCUIElementQuery {
        app.descendants(matching: .any).matching(identifier: "workspace-mission-row")
    }

    private func missionNames() -> XCUIElementQuery {
        app.staticTexts.matching(identifier: "workspace-mission-name")
    }

    /// The chat header title (exact: `Project` or `Project / Mission`).
    private var chatTitle: XCUIElement {
        app.staticTexts.matching(identifier: "chat-title").firstMatch
    }

    private func agentRows() -> XCUIElementQuery {
        app.descendants(matching: .any).matching(identifier: "workspace-agent-row")
    }

    private var chatScreen: XCUIElement {
        app.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
    }

    private var intakeField: XCUIElement {
        app.textFields.matching(identifier: "global-intake-field").firstMatch
    }

    private var intakeSend: XCUIElement {
        app.buttons.matching(identifier: "global-intake-send").firstMatch
    }

    private var intakeConfirmSheet: XCUIElement {
        app.buttons.matching(identifier: "intake-confirm-cancel").firstMatch
    }

    private func waitForCount(_ query: XCUIElementQuery, _ count: Int, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if query.count >= count { return true }
            Thread.sleep(forTimeInterval: 2.0)
        }
        return query.count >= count
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

    private func openFirstProjectChatOn(_ scope: XCUIApplication) {
        let tree = scope.staticTexts.matching(identifier: "workspace-project-name")
            .matching(NSPredicate(format: "label == 'General'")).firstMatch
        XCTAssertTrue(tree.waitForExistence(timeout: 120),
                      "workspace tree never appeared — sign-in or ensureWorkspace failed")
        scope.descendants(matching: .any).matching(identifier: "workspace-project-row").firstMatch.tap()
        XCTAssertTrue(scope.descendants(matching: .any).matching(identifier: "chat-screen").firstMatch
            .waitForExistence(timeout: 30), "tapping a project did not open a chat")
    }

    /// Send/reply with a visible agent label: `@research` rides as routing
    /// metadata, the reply carries the Research label, and the thread never
    /// navigates away (the title is still the project).
    func testV2ChatSendShowsAgentLabel() throws {
        app.launchArguments += ["-v2FixtureUITest"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openFirstProjectChatOn(app)
        let title = app.staticTexts.matching(identifier: "chat-title").firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 15), "project chat has no title")
        let projectName = title.label

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
        XCTAssertEqual(title.label, projectName, "sending navigated away from the thread")
        XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "workspace-agent-row").count, 0,
                       "no agent rows anywhere after a mention send")
    }

    /// Offline queue: with sends failing, the message parks in the banner;
    /// after a relaunch with the network back, it sends once and the banner
    /// clears (the disk outbox survives the process death).
    func testV2OfflineQueueBannerAndReplay() throws {
        app.launchArguments += ["-v2FixtureUITest", "-v2FailNextSends=999"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")
        openFirstProjectChatOn(app)

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
        openFirstProjectChatOn(back)
        XCTAssertTrue(back.staticTexts[probe].waitForExistence(timeout: 60),
                      "the queued message never sent after reconnect")
        evidence("06b-offline-replayed")
        XCTAssertFalse(back.descendants(matching: .any).matching(identifier: "v2-offline-banner").firstMatch.exists,
                       "the offline banner did not clear after the replay succeeded")
    }

    // MARK: - the flow

    func testWorkspaceProjectMissionFlow() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "app did not reach the foreground")

        // 1. Signed-in list: the workspace tree, General exactly once.
        XCTAssertTrue(workspaceTree.waitForExistence(timeout: 120),
                      "workspace tree never appeared — sign-in or ensureWorkspace failed")
        evidence("01-workspace")
        let generals = projectNames().matching(NSPredicate(format: "label == 'General'"))
        XCTAssertEqual(generals.count, 1, "General must appear exactly once, with the normal projects")
        XCTAssertGreaterThanOrEqual(projectRows().count, 1, "expected at least the General project row")
        XCTAssertEqual(agentRows().count, 0, "no agent rows anywhere on the workspace list")
        XCTAssertEqual(
            app.buttons.matching(identifier: "workspace-filter").matching(NSPredicate(format: "label == 'Agents'")).count,
            0, "no agent filter on the workspace list"
        )

        // 2. Missions indent under their project. Pair the first project that
        // owns a visible mission (mission row below the project row, above
        // the next project row).
        var missionHeader = ""
        var missionTitle = ""
        var missionEl: XCUIElement? = nil
        do {
            let prows = projectRows()
            let mrows = missionRows()
            let pnames = projectNames()
            let mnames = missionNames()
            for i in 0..<prows.count {
                let prow = prows.element(boundBy: i)
                let nextMinY: CGFloat = (i + 1 < prows.count)
                    ? prows.element(boundBy: i + 1).frame.minY : CGFloat.greatestFiniteMagnitude
                for j in 0..<mrows.count {
                    let mrow = mrows.element(boundBy: j)
                    if mrow.frame.minY > prow.frame.minY && mrow.frame.minY < nextMinY {
                        XCTAssertGreaterThan(mrow.frame.minX, prow.frame.minX,
                                              "mission rows indent under their project row")
                        missionHeader = pnames.element(boundBy: i).label
                        missionTitle = mnames.element(boundBy: j).label
                        missionEl = mrow
                        break
                    }
                }
                if missionEl != nil { break }
            }
        }

        // 3. Tapping a project opens the chat titled with the project.
        let projectName = projectNames().firstMatch.label
        projectRows().firstMatch.tap()
        XCTAssertTrue(chatScreen.waitForExistence(timeout: 30), "tapping a project did not open a chat")
        XCTAssertTrue(chatTitle.waitForExistence(timeout: 15), "project chat has no title")
        XCTAssertEqual(chatTitle.label, projectName,
                       "project chat is not titled with the project (\(projectName))")
        evidence("02-project-chat")

        // Back to the tree.
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(workspaceTree.waitForExistence(timeout: 15), "did not return to the workspace tree")

        // 3b. No missions yet: create one through the UI — that live tree is
        // the fixture. (Later runs find it and skip this.)
        if missionRows().count == 0 {
            intakeField.tap()
            intakeField.typeText("UI Mission alpha")
            intakeSend.tap()
            XCTAssertTrue(intakeConfirmSheet.waitForExistence(timeout: 60),
                          "no creation confirmation for the new mission")
            evidence("02b-mission-confirm")
            app.buttons.matching(identifier: "intake-confirm-create").firstMatch.tap()
            // Creation navigates straight into the new mission's chat (the
            // covered list virtualizes its rows away, so assert here first).
            XCTAssertTrue(chatScreen.waitForExistence(timeout: 60),
                          "confirming did not open the new mission chat")
            XCTAssertTrue(chatTitle.waitForExistence(timeout: 15), "new mission chat has no title")
            evidence("02c-mission-created")
            do {
                // Title is `Project / Mission`; split it back apart for step 4.
                let parts = chatTitle.label.components(separatedBy: " / ")
                XCTAssertGreaterThanOrEqual(parts.count, 2, "new mission chat is not titled Project / Mission")
                missionHeader = parts.first ?? ""
                missionTitle = parts.dropFirst().joined(separator: " / ")
                missionEl = nil
            }
            app.navigationBars.buttons.firstMatch.tap()
            XCTAssertTrue(workspaceTree.waitForExistence(timeout: 15), "did not return to the workspace tree")
            XCTAssertTrue(waitForCount(missionRows(), 1, timeout: 60),
                          "confirmed mission never appeared under its project")
        }

        // 4. Tapping a mission opens the chat titled Project / Mission.
        // Re-pair after the possible creation above (rows may have shifted).
        if missionEl == nil || missionRows().count == 0 {
            let prows = projectRows()
            let mrows = missionRows()
            let pnames = projectNames()
            let mnames = missionNames()
            for i in 0..<prows.count {
                let prow = prows.element(boundBy: i)
                let nextMinY: CGFloat = (i + 1 < prows.count)
                    ? prows.element(boundBy: i + 1).frame.minY : CGFloat.greatestFiniteMagnitude
                for j in 0..<mrows.count {
                    let mrow = mrows.element(boundBy: j)
                    if mrow.frame.minY > prow.frame.minY && mrow.frame.minY < nextMinY {
                        missionHeader = pnames.element(boundBy: i).label
                        missionTitle = mnames.element(boundBy: j).label
                        missionEl = mrow
                        break
                    }
                }
                if missionEl != nil { break }
            }
        }
        if let mission = missionEl {
            mission.tap()
            XCTAssertTrue(chatScreen.waitForExistence(timeout: 30), "tapping a mission did not open a chat")
            let combined = "\(missionHeader) / \(missionTitle)"
            XCTAssertTrue(chatTitle.waitForExistence(timeout: 15), "mission chat has no title")
            XCTAssertEqual(chatTitle.label, combined,
                           "mission chat is not titled Project / Mission (\(combined))")
            evidence("03-mission-chat")
            app.navigationBars.buttons.firstMatch.tap()
            XCTAssertTrue(workspaceTree.waitForExistence(timeout: 15), "did not return to the workspace tree")
        } else {
            XCTFail("no mission row to tap — creation step above must have failed")
        }

        // 5. An unrelated one-off proposes a General mission instead of creating.
        let probe = "Summarize this invoice \(Int(Date().timeIntervalSince1970))"
        XCTAssertTrue(intakeField.waitForExistence(timeout: 15), "no global intake field on the workspace list")
        intakeField.tap()
        intakeField.typeText(probe)
        XCTAssertTrue(intakeSend.waitForExistence(timeout: 10), "no global intake send button")
        intakeSend.tap()
        XCTAssertTrue(intakeConfirmSheet.waitForExistence(timeout: 60),
                      "typing a one-off did not show the creation confirmation")
        XCTAssertTrue(app.staticTexts["Create mission in General"].waitForExistence(timeout: 10),
                      "confirmation does not propose creating the mission in General")
        evidence("04-intake-confirm")
        // Dismiss without creating: nothing is silently created.
        app.buttons.matching(identifier: "intake-confirm-cancel").firstMatch.tap()
        XCTAssertTrue(workspaceTree.waitForExistence(timeout: 15), "did not return to the workspace tree")
    }
}
