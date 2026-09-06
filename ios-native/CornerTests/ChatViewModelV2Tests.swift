import Combine
import XCTest
@testable import Corner

/// Native plan Task 5, Step 1: v2 conversation tests. The v2 chat model is a
/// separate type from the legacy room-based `ChatViewModel` (which keeps its
/// room contract and its tests): `V2ChatModel` implements the plan's
/// `start(thread:project:mission:)` / `send(_:)` interface against
/// `CornerV2API`, with a disk-backed outbox keyed by thread id + client
/// event id. See the R14 report for the deviation note.
@MainActor
final class ChatViewModelV2Tests: XCTestCase {

    // MARK: - helpers

    private func context() throws -> (thread: Corner.Thread, project: ProjectSummary, mission: MissionSummary?) {
        let fixture = try Fixture.loadNativeFixture()
        guard let aster = fixture.workspace.projects.first(where: { $0.name == "Aster" }) else {
            throw FakeRouteError.expectedAsterProject
        }
        let thread = Corner.Thread(
            id: aster.threadID, ownerType: .project, projectID: aster.id,
            missionID: nil, visualSessionID: "session-test"
        )
        return (thread, aster, nil)
    }

    private func agentReply(id: String = "event-agent-1", threadID: String, label: String, text: String) -> ThreadEvent {
        ThreadEvent(
            id: id, threadID: threadID, author: .agent, agentLabel: label,
            blocks: [.text(text)], createdAt: Date()
        )
    }

    private func routeDecision(project: ProjectSummary) -> RouteDecision {
        RouteDecision(
            decisionId: "decision-test-1", destinationThreadID: project.threadID,
            project: project, mission: nil, confidence: 1, alternatives: [],
            reason: "Already in \(project.name).", needsClarification: false,
            needsCreationConfirmation: false, actor: "tester", createdAt: Date()
        )
    }

    /// Flush the `Task { @MainActor }` hops the subscription path uses.
    private func flush() async throws {
        try await Task.sleep(nanoseconds: 50_000_000)
        try await Task.sleep(nanoseconds: 50_000_000)
    }

    // MARK: - plan Step 1 tests (adapted: backend JSON wins)

    func testMentionIsSentAsRoutingMetadataButDoesNotCreateAnAgentRoom() async throws {
        let (thread, project, mission) = try context()
        let api = CornerV2APIFake()
        var served: [ThreadEvent] = []
        api.threadEventsHandler = { _ in served }
        api.sendHandler = { [weak api] _, _, _ in
            served = [self.agentReply(threadID: thread.id, label: "Research", text: "I found three competitors.")]
            _ = api
            return self.routeDecision(project: project)
        }
        let model = V2ChatModel(api: api, outbox: .memory)
        await model.start(thread: thread, project: project, mission: mission)

        await model.send("@research find competitors")

        XCTAssertEqual(api.sentMentions.last, ["research"])
        XCTAssertEqual(api.sentTexts.last, "@research find competitors")
        XCTAssertEqual(model.events.last?.agentLabel, "Research")
        // The thread never changes under a mention: routing metadata rides
        // the send, and no agent room or destination is ever navigated to.
        XCTAssertEqual(model.thread?.id, thread.id)
    }

    func testQueuedMessageSurvivesOfflineThenReconcilesByEventID() async throws {
        let (thread, project, mission) = try context()
        let api = CornerV2APIFake()
        var served: [ThreadEvent] = []
        api.threadEventsHandler = { _ in served }
        api.sendHandler = { _, _, _ in throw URLError(.notConnectedToInternet) }
        let outbox = V2OutboxStore.memory
        let model = V2ChatModel(api: api, outbox: outbox)

        await model.start(thread: thread, project: project, mission: mission)
        await model.send("Draft the brief")

        XCTAssertEqual(outbox.pending(threadID: thread.id).count, 1)

        // Reconnect: the queued entry sends once, the optimistic echo is
        // replaced by the server event (no duplicate), the queue drains.
        api.sendHandler = { _, _, _ in
            served = [ThreadEvent(
                id: "event-server-1", threadID: thread.id, author: .user,
                agentLabel: nil, blocks: [.text("Draft the brief")], createdAt: Date()
            )]
            return self.routeDecision(project: project)
        }
        await model.replayOutbox()
        try await flush()

        XCTAssertEqual(outbox.pending(threadID: thread.id).count, 0)
        XCTAssertEqual(model.events.filter { $0.id == "event-server-1" }.count, 1)
        XCTAssertFalse(model.events.contains { $0.id.hasPrefix("local-") })
    }

    // MARK: - brief §Task 5 extra tests

    func testOfflineSendReplaysOnceAfterReconnect() async throws {
        let (thread, project, mission) = try context()
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        var failuresLeft = 2
        var successes = 0
        api.sendHandler = { _, _, _ in
            if failuresLeft > 0 {
                failuresLeft -= 1
                throw URLError(.notConnectedToInternet)
            }
            successes += 1
            return self.routeDecision(project: project)
        }
        let outbox = V2OutboxStore.memory
        let model = V2ChatModel(api: api, outbox: outbox)
        await model.start(thread: thread, project: project, mission: mission)

        // First send fails into the outbox (one server attempt).
        await model.send("Draft the brief")
        XCTAssertEqual(outbox.pending(threadID: thread.id).count, 1)

        // First replay fails again (second attempt); still exactly one entry.
        await model.replayOutbox()
        XCTAssertEqual(outbox.pending(threadID: thread.id).count, 1)

        // Second replay succeeds (third attempt): exactly one server send.
        await model.replayOutbox()
        XCTAssertEqual(successes, 1, "the queued message must reach the server exactly once")
        XCTAssertEqual(outbox.pending(threadID: thread.id).count, 0)
    }

    func testSubscriptionDeliversAgentReplyToTheActiveThread() async throws {
        let (thread, project, mission) = try context()
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        var push: (([ThreadEvent]) -> Void)?
        api.subscribeHandler = { _, receive in
            push = receive
            return AnyCancellable {}
        }
        let model = V2ChatModel(api: api, outbox: .memory)
        await model.start(thread: thread, project: project, mission: mission)
        XCTAssertEqual(model.loadState, .empty)

        push?([self.agentReply(threadID: thread.id, label: "Research", text: "Live update.")])
        try await flush()

        XCTAssertEqual(model.events.last?.agentLabel, "Research")
        XCTAssertEqual(model.loadState, .ready)
    }

    func testPushRouteMapsToProjectMissionOrVisualTab() {
        XCTAssertEqual(
            PushService.targetForTap(userInfo: ["deep_link": "corner://project/proj-aster-1"]),
            .route(.project(projectID: "proj-aster-1"))
        )
        XCTAssertEqual(
            PushService.targetForTap(userInfo: ["deep_link": "corner://mission/mission-ship-1"]),
            .route(.mission(missionID: "mission-ship-1"))
        )
        XCTAssertEqual(
            PushService.targetForTap(userInfo: ["deep_link": "corner://tab/tab-9"]),
            .route(.visualTab(tabID: "tab-9"))
        )
        // Flat payload keys (the future non-room push): project, then
        // mission, then tab — tab wins when several ride together.
        XCTAssertEqual(
            PushService.targetForTap(userInfo: ["project_id": "proj-aster-1"]),
            .route(.project(projectID: "proj-aster-1"))
        )
        XCTAssertEqual(
            PushService.targetForTap(userInfo: ["mission_id": "mission-ship-1"]),
            .route(.mission(missionID: "mission-ship-1"))
        )
        XCTAssertEqual(
            PushService.targetForTap(userInfo: ["tab_id": "tab-9"]),
            .route(.visualTab(tabID: "tab-9"))
        )
    }

    func testOutboxMigrationDropsRoomKeyedEntriesWithoutReplaying() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let legacyDir = root.appendingPathComponent("ThreadCache", isDirectory: true)
        try FileManager.default.createDirectory(at: legacyDir, withIntermediateDirectories: true)
        let orphan = OutboxItem(id: "outbox-1", text: "stranded hello", state: .sending, createdAt: Date())
        let snapshot = ThreadCacheSnapshot(verifiedAt: Date(), rows: [], outbox: [orphan])
        let data = try JSONEncoder().encode(snapshot)
        try data.write(to: legacyDir.appendingPathComponent("cm9vbQ.json"))

        let defaults = UserDefaults(suiteName: "test-v2outbox-\(UUID().uuidString)")!
        let store = V2OutboxStore(directory: root.appendingPathComponent("V2Outbox", isDirectory: true), defaults: defaults)

        let dropped = store.migrateIfNeeded(legacyDirectory: legacyDir)
        XCTAssertEqual(dropped, 1, "room-keyed entries have no thread mapping and must be dropped, never replayed")
        XCTAssertTrue(store.pending(threadID: "thread-aster-1").isEmpty)
        XCTAssertTrue(store.pending(threadID: "anything").isEmpty)

        // One-time: a second launch migrates nothing.
        XCTAssertEqual(store.migrateIfNeeded(legacyDirectory: legacyDir), 0)
    }
}
