// V2CommandsTests.swift — Corner native iOS
// corner:corner-v2 R19 — the composer's commands chip, v2 side.
//
// The v2 pill carries the same commands menu as the legacy room path
// (Work/Plan, Model, Specialist, Files, Generate an image). Mode persists
// per thread and rides the send when the backend accepts it; model and
// specialist persist per thread and label the chip. A backend that does not
// know `mode` gets the same send without it.

import UIKit
import XCTest
@testable import Corner

@MainActor
final class V2CommandsTests: XCTestCase {
    private var prefsKeys: [String] = []

    override func tearDown() {
        for key in prefsKeys { UserDefaults.standard.removeObject(forKey: key) }
        prefsKeys.removeAll()
        super.tearDown()
    }

    private func context(threadID: String = "thread-r19-test") throws
        -> (thread: Corner.Thread, project: ProjectSummary, mission: MissionSummary?)
    {
        let fixture = try Fixture.loadNativeFixture()
        guard let aster = fixture.workspace.projects.first(where: { $0.name == "Aster" }) else {
            throw FakeRouteError.expectedAsterProject
        }
        prefsKeys.append("v2ThreadPrefs.\(threadID)")
        let thread = Corner.Thread(
            id: threadID, ownerType: .project, projectID: aster.id,
            missionID: nil, visualSessionID: "session-r19"
        )
        return (thread, aster, nil)
    }

    private func routeDecision(project: ProjectSummary) -> RouteDecision {
        RouteDecision(
            decisionId: "decision-r19", destinationThreadID: project.threadID,
            project: project, mission: nil, confidence: 1, alternatives: [],
            reason: "Already in \(project.name).", needsClarification: false,
            needsCreationConfirmation: false, actor: "tester", createdAt: Date()
        )
    }

    // MARK: - per-thread prefs

    func testChatModeDefaultsWorkAndPersistsPerThread() async throws {
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        let model = V2ChatModel(api: api, outbox: .memory)
        let (thread, project, mission) = try context()
        await model.start(thread: thread, project: project, mission: mission)
        XCTAssertEqual(model.chatMode, "work")

        model.setMode("plan")
        XCTAssertEqual(model.chatMode, "plan")

        // Another thread starts at the default…
        let (other, _, _) = try context(threadID: "thread-r19-other")
        await model.start(thread: other, project: project, mission: mission)
        XCTAssertEqual(model.chatMode, "work")

        // …and the first thread remembers Plan.
        await model.start(thread: thread, project: project, mission: mission)
        XCTAssertEqual(model.chatMode, "plan")

        // Junk restores to Work, never to a third state.
        model.setMode("turbo")
        XCTAssertEqual(model.chatMode, "work")
    }

    func testSelectModelValidatesAndPersists() async throws {
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        let model = V2ChatModel(api: api, outbox: .memory)
        let (thread, project, mission) = try context()
        await model.start(thread: thread, project: project, mission: mission)
        XCTAssertEqual(model.modelChoice, "default")

        model.selectModel("opus")
        XCTAssertEqual(model.modelChoice, "opus")

        let again = V2ChatModel(api: api, outbox: .memory)
        await again.start(thread: thread, project: project, mission: mission)
        XCTAssertEqual(again.modelChoice, "opus")

        model.selectModel("no-such-model")
        XCTAssertEqual(model.modelChoice, "default")
    }

    func testSpecialistRosterDerivesFromAgentLabels() async throws {
        let api = CornerV2APIFake()
        let (thread, project, _) = try context()
        let stamp = Date()
        api.threadEventsHandler = { _ in
            [
                ThreadEvent(id: "e1", threadID: thread.id, author: .agent, agentLabel: "Corner",
                            blocks: [.text("hi")], createdAt: stamp),
                ThreadEvent(id: "e2", threadID: thread.id, author: .agent, agentLabel: project.name,
                            blocks: [.text("driving")], createdAt: stamp),
                ThreadEvent(id: "e3", threadID: thread.id, author: .agent, agentLabel: "Steffen",
                            blocks: [.text("research done")], createdAt: stamp),
            ]
        }
        let model = V2ChatModel(api: api, outbox: .memory)
        await model.start(thread: thread, project: project, mission: nil)

        // Corner and the project default are not specialists.
        XCTAssertEqual(model.specialistRoster.map(\.title), ["Steffen"])
        XCTAssertEqual(model.specialistTitle, "Thread default")

        model.selectSpecialist("steffen")
        XCTAssertEqual(model.specialistChoice, "steffen")
        XCTAssertEqual(model.specialistTitle, "Steffen")

        let again = V2ChatModel(api: api, outbox: .memory)
        await again.start(thread: thread, project: project, mission: nil)
        XCTAssertEqual(again.specialistChoice, "steffen")
    }

    func testNoSpecialistSubmenuWithoutSpecialistLabels() async throws {
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        let model = V2ChatModel(api: api, outbox: .memory)
        let (thread, project, mission) = try context()
        await model.start(thread: thread, project: project, mission: mission)
        XCTAssertTrue(model.specialistRoster.isEmpty)
    }

    // MARK: - mode on the wire

    func testPlanSendCarriesPlanMode() async throws {
        let api = CornerV2APIFake()
        let (thread, project, _) = try context()
        api.threadEventsHandler = { _ in [] }
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project) }
        let model = V2ChatModel(api: api, outbox: .memory)
        await model.start(thread: thread, project: project, mission: nil)
        model.setMode("plan")

        await model.send("hello")
        XCTAssertEqual(api.sentModes.last, "plan")
    }

    func testWorkSendCarriesWorkMode() async throws {
        let api = CornerV2APIFake()
        let (thread, project, _) = try context()
        api.threadEventsHandler = { _ in [] }
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project) }
        let model = V2ChatModel(api: api, outbox: .memory)
        await model.start(thread: thread, project: project, mission: nil)

        await model.send("hello")
        XCTAssertEqual(api.sentModes.last, "work")
    }

    /// The clone does not know `mode`: the Plan attempt fails validation and
    /// the same send goes out without the field. Two requests, one send.
    func testPlanSendFallsBackWithoutMode() async throws {
        var bodies: [[String: Any]] = []
        let transport = FakeConvexTransport { request in
            let json = try! JSONSerialization.jsonObject(with: request.httpBody!) as! [String: Any]
            let args = json["args"] as! [String: Any]
            bodies.append(args)
            if args["mode"] != nil {
                let err: [String: Any] = ["status": "error", "errorMessage": "Server Error"]
                let data = try! JSONSerialization.data(withJSONObject: err)
                return (data, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
            }
            let decision: [String: Any] = [
                "decisionId": "decision-r19", "destinationThreadID": "thread-r19-test",
                "project": ["id": "p1", "workspaceID": "w1", "name": "Aster", "kind": "standard",
                            "tintHex": "#A78BFA", "needsAttention": false, "threadID": "thread-r19-test",
                            "missions": []],
                "mission": NSNull(), "confidence": 1, "alternatives": [],
                "reason": "Already in Aster.", "needsClarification": false,
                "needsCreationConfirmation": false, "actor": "tester",
                "createdAt": "2026-09-06T12:00:00.000Z",
            ]
            let ok: [String: Any] = ["status": "success", "value": decision]
            let data = try! JSONSerialization.data(withJSONObject: ok)
            return (data, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
        }
        let api = DefaultCornerV2API(service: ConvexService(session: .valid, transport: transport))
        let decision = try await api.send(text: "hello", mentioning: [], preferredProjectID: nil, mode: "plan")
        XCTAssertEqual(decision.decisionId, "decision-r19")
        XCTAssertEqual(bodies.count, 2)
        XCTAssertEqual(bodies[0]["mode"] as? String, "plan")
        XCTAssertNil(bodies[1]["mode"])
        XCTAssertEqual(bodies[1]["text"] as? String, "hello")
    }

    /// Work never carries the field and never pays the fallback: one request.
    func testWorkSendGoesOutOnceWithoutMode() async throws {
        var bodies: [[String: Any]] = []
        let transport = FakeConvexTransport { request in
            let json = try! JSONSerialization.jsonObject(with: request.httpBody!) as! [String: Any]
            bodies.append(json["args"] as! [String: Any])
            let err: [String: Any] = ["status": "error", "errorMessage": "boom"]
            let data = try! JSONSerialization.data(withJSONObject: err)
            return (data, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
        }
        let api = DefaultCornerV2API(service: ConvexService(session: .valid, transport: transport))
        do {
            _ = try await api.send(text: "hello", mentioning: [], preferredProjectID: nil, mode: "work")
            XCTFail("the lone attempt must surface its error")
        } catch {
            XCTAssertEqual(bodies.count, 1)
            XCTAssertNil(bodies[0]["mode"])
        }
    }

    // MARK: - brand assets (design LOGO set)

    /// Every brand mark the setup + login screens render must resolve —
    /// a missing asset is a blank icon, not a build error.
    func testBrandAssetsExist() {
        for name in ["brand-google-g", "brand-gmail", "brand-drive",
                     "brand-figma", "brand-slack", "brand-github"] {
            XCTAssertNotNil(UIImage(named: name, in: .main, with: nil), "missing asset \(name)")
        }
    }
}
