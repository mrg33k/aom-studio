// R32NativeWiringTests.swift — Corner native iOS
// corner:corner-v2 R32 — the phone uses the backend it now has.
//
// Pins the R32 wiring: run-state working line + nav status (P081), the
// `replyTo` block field (bare text on the wire, server-field quotes),
// server clear, staged uploads as artifacts (per-file retry, outbox never
// blocked), the pending-image poll, artifact kind mapping, the ThreadEvent
// quote lift, and the Shift+Return newline helper.

import XCTest
@testable import Corner

@MainActor
final class R32NativeWiringTests: XCTestCase {
    private var prefsKeys: [String] = []

    override func tearDown() {
        for key in prefsKeys { UserDefaults.standard.removeObject(forKey: key) }
        prefsKeys.removeAll()
        super.tearDown()
    }

    private func track(_ key: String) { prefsKeys.append(key) }

    private func context(threadID: String = "thread-r32-test") throws
        -> (thread: Corner.Thread, project: ProjectSummary, mission: MissionSummary?)
    {
        let fixture = try Fixture.loadNativeFixture()
        guard let aster = fixture.workspace.projects.first(where: { $0.name == "Aster" }) else {
            throw FakeRouteError.expectedAsterProject
        }
        track("v2ThreadPrefs.\(threadID)")
        let thread = Corner.Thread(
            id: threadID, ownerType: .project, projectID: aster.id,
            missionID: nil, visualSessionID: "session-r32"
        )
        return (thread, aster, nil)
    }

    private func routeDecision(project: ProjectSummary, threadID: String) -> RouteDecision {
        RouteDecision(
            decisionId: "decision-r32", destinationThreadID: threadID,
            project: project, mission: nil, confidence: 1, alternatives: [],
            reason: "Already in \(project.name).", needsClarification: false,
            needsCreationConfirmation: false, actor: "tester", createdAt: Date()
        )
    }

    private func startedModel(
        threadID: String = "thread-r32-test",
        quietAfter: TimeInterval? = nil,
        configure: ((CornerV2APIFake) -> Void)? = nil
    ) async throws -> (V2ChatModel, CornerV2APIFake, Corner.Thread, ProjectSummary) {
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        api.runsHandler = { _ in V2ThreadRuns(open: [], lastDone: nil) }
        api.clearThreadHandler = { _ in }
        configure?(api)
        let model = V2ChatModel(api: api, outbox: .memory, quietAfter: quietAfter)
        let (thread, project, mission) = try context(threadID: threadID)
        await model.start(thread: thread, project: project, mission: mission)
        return (model, api, thread, project)
    }

    private func userEvent(id: String, text: String, at: Date = Date()) -> ThreadEvent {
        ThreadEvent(
            id: id, threadID: "thread-r32-test", author: .user, agentLabel: nil,
            blocks: [.text(text)], createdAt: at
        )
    }

    private func agentEvent(id: String, text: String, label: String = "Paige", at: Date = Date()) -> ThreadEvent {
        ThreadEvent(
            id: id, threadID: "thread-r32-test", author: .agent, agentLabel: label,
            blocks: [.text(text)], createdAt: at
        )
    }

    // MARK: - R66b copy-a-message (Slack-gap)

    func testReplyQuoteFullTextJoinsTextBlocksForCopy() {
        // Copy takes the FULL message (every text block), not the reply
        // snippet's truncated first line.
        let long = String(repeating: "line one is quite long. ", count: 12)
        let blocks: [ThreadBlock] = [.text(long), .text("a second paragraph")]
        let full = V2ReplyQuote.fullText(blocks: blocks)
        XCTAssertTrue(full.contains("a second paragraph"), full)
        XCTAssertTrue(full.count > 140, "full copy must not be truncated like the snippet")
        // steps-only / artifact-only rows have nothing to copy.
        XCTAssertEqual(V2ReplyQuote.fullText(blocks: []), "")
    }

    // MARK: - run state helpers (P081)

    func testDriverNamePrefersNewestAgentVoice() {
        let events = [
            userEvent(id: "u1", text: "hi"),
            agentEvent(id: "a1", text: "one", label: "Paige"),
            agentEvent(id: "a2", text: "two", label: "Research"),
        ]
        XCTAssertEqual(V2RunState.driverName(events: events, projectName: "Aster"), "Research")
    }

    func testDriverNameFallsBackToProjectThenCorner() {
        XCTAssertEqual(V2RunState.driverName(events: [userEvent(id: "u1", text: "hi")], projectName: "Aster"), "Aster")
        XCTAssertEqual(V2RunState.driverName(events: [], projectName: nil), "Corner")
        XCTAssertEqual(V2RunState.driverName(events: [], projectName: "  "), "Corner")
    }

    func testWorkingTextBothVariants() {
        XCTAssertEqual(V2RunState.workingText(driver: "Paige", quiet: false), "Paige is on it…")
        XCTAssertEqual(
            V2RunState.workingText(driver: "Paige", quiet: true),
            "Paige is taking a while — the reply will land here."
        )
    }

    func testQuietBound() {
        let sent = Date()
        XCTAssertFalse(V2RunState.isQuiet(sentAt: sent, now: sent.addingTimeInterval(44.9)))
        XCTAssertTrue(V2RunState.isQuiet(sentAt: sent, now: sent.addingTimeInterval(45)))
        XCTAssertTrue(V2RunState.isQuiet(sentAt: sent, now: sent.addingTimeInterval(600)))
    }

    // MARK: - working line lifecycle

    func testSendRaisesWorkingLineUntilFirstAgentBlock() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in
            try await Task.sleep(nanoseconds: 200_000_000)
            return self.routeDecision(project: project, threadID: thread.id)
        }
        api.threadEventsHandler = { _ in
            [self.userEvent(id: "srv-user-1", text: "hello"), self.agentEvent(id: "srv-agent-1", text: "on it")]
        }
        model.startSend("hello")
        try? await Task.sleep(nanoseconds: 50_000_000)
        let line = try XCTUnwrap(model.workingLine, "the line goes up with the send")
        XCTAssertEqual(line.driver, "Aster")
        XCTAssertTrue(model.isSending)
        // The flight lands: the agent block ends the line.
        var waits = 0
        while model.workingLine != nil && waits < 100 {
            try? await Task.sleep(nanoseconds: 50_000_000)
            waits += 1
        }
        XCTAssertNil(model.workingLine, "the first agent block ends the line")
    }

    func testWorkingLineEndsRules() {
        let sentAt = Date()
        let agent = agentEvent(id: "a-new", text: "hi", at: sentAt.addingTimeInterval(10))
        // Loaded send: purely id-based — skew can never wedge the line.
        let loaded = V2WorkingLine(driver: "Aster", sentAt: sentAt, seenAgentIDs: [], loadedAtSend: true)
        XCTAssertTrue(loaded.ends(on: agent))
        XCTAssertFalse(loaded.ends(on: userEvent(id: "u", text: "hi")))
        let seen = V2WorkingLine(driver: "Aster", sentAt: sentAt, seenAgentIDs: ["a-new"], loadedAtSend: true)
        XCTAssertFalse(seen.ends(on: agent), "a seen id never ends the line")
        // Mid-load send: an old replayed row must not end the wait.
        let loading = V2WorkingLine(driver: "Aster", sentAt: sentAt, seenAgentIDs: [], loadedAtSend: false)
        let old = agentEvent(id: "a-old", text: "earlier", at: sentAt.addingTimeInterval(-600))
        XCTAssertFalse(loading.ends(on: old), "the first refresh's old rows end nothing")
        XCTAssertTrue(loading.ends(on: agent), "a genuinely new block still ends it")
    }

    func testLoadedAtSendFlagFollowsLoadState() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in
            try await Task.sleep(nanoseconds: 300_000_000)
            return self.routeDecision(project: project, threadID: thread.id)
        }
        model.startSend("hello")
        try? await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(model.workingLine?.loadedAtSend, true, "a loaded thread sends id-based")
        var waits = 0
        while model.isSending && waits < 100 {
            try? await Task.sleep(nanoseconds: 50_000_000)
            waits += 1
        }
        // A mid-load send (the load still flying) is newness-gated: the
        // first refresh's old rows must not end the wait.
        let hanging = CornerV2APIFake()
        hanging.threadEventsHandler = { _ in
            try await Task.sleep(nanoseconds: 60_000_000_000)
            return []
        }
        hanging.runsHandler = { _ in V2ThreadRuns(open: [], lastDone: nil) }
        hanging.sendHandler = { _, _, _, _ in
            try await Task.sleep(nanoseconds: 60_000_000_000)
            throw URLError(.timedOut)
        }
        let loading = V2ChatModel(api: hanging, outbox: .memory)
        let (hangThread, hangProject, hangMission) = try context(threadID: "thread-r32-loading")
        let startTask = Task { await loading.start(thread: hangThread, project: hangProject, mission: hangMission) }
        // Let the start task claim the thread and enter the hanging load
        // (loadState starts .loading, so it cannot gate this).
        try? await Task.sleep(nanoseconds: 500_000_000)
        loading.startSend("too soon")
        var lineWaits = 0
        while loading.workingLine == nil && lineWaits < 100 {
            try? await Task.sleep(nanoseconds: 20_000_000)
            lineWaits += 1
        }
        XCTAssertEqual(loading.workingLine?.loadedAtSend, false)
        startTask.cancel()
        loading.stop()
    }

    func testSeenAgentEventsDoNotEndTheLine() async throws {
        let old = agentEvent(id: "old-agent-1", text: "earlier", at: Date().addingTimeInterval(-60))
        let (model, api, thread, project) = try await startedModel(configure: { api in
            api.threadEventsHandler = { _ in [old] }
        })
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        await model.send("follow-up")
        // The refresh replays the same (seen) agent event: the line survives
        // it, because arrival is id-based — only a NEW agent block ends it.
        XCTAssertNotNil(model.workingLine)
    }

    func testQuietTimerTurnsTheLineStill() async throws {
        let (model, api, _, _) = try await startedModel(quietAfter: 0.05)
        // A slow flight that fails at the end: the line must read quiet
        // before the flight ends, then come down with the failure.
        api.sendHandler = { _, _, _, _ in
            try await Task.sleep(nanoseconds: 500_000_000)
            throw ConvexServiceError.server("Server Error")
        }
        model.startSend("hello")
        var waits = 0
        while model.workingLine?.quiet != true && waits < 100 {
            try? await Task.sleep(nanoseconds: 20_000_000)
            waits += 1
        }
        XCTAssertEqual(model.workingLine?.quiet, true, "past the bound the line is still, never silent")
        waits = 0
        while model.isSending && waits < 100 {
            try? await Task.sleep(nanoseconds: 50_000_000)
            waits += 1
        }
        XCTAssertNil(model.workingLine, "the failure takes the line down")
    }

    func testStopTakesTheWorkingLineDown() async throws {
        let (model, api, _, _) = try await startedModel()
        api.sendHandler = { _, _, _, _ in
            try await Task.sleep(nanoseconds: 5_000_000_000)
            throw URLError(.timedOut)
        }
        model.startSend("hello")
        try? await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertNotNil(model.workingLine)
        model.stopSending()
        XCTAssertNil(model.workingLine, "Stop is deliberate silence, not a wait")
    }

    // MARK: - runs drive the nav status

    func testOpenRunReadsWorking() async throws {
        let (model, api, _, _) = try await startedModel(configure: { api in
            api.runsHandler = { _ in
                V2ThreadRuns(
                    open: [V2ThreadRun(id: "r1", status: "running", brain: "paige", provider: "bridge", createdAt: Date())],
                    lastDone: nil
                )
            }
        })
        await model.refreshRuns()
        XCTAssertTrue(model.runWorking)
        // The start-time poll runs on its own task: allow it to land.
        var waits = 0
        while api.runsThreadIDs.count < 2 && waits < 100 {
            try? await Task.sleep(nanoseconds: 20_000_000)
            waits += 1
        }
        XCTAssertEqual(api.runsThreadIDs.count, 2, "start polls once, the explicit refresh polls again")
    }

    func testNoOpenRunReadsReady() async throws {
        let (model, _, _, _) = try await startedModel()
        XCTAssertFalse(model.runWorking)
    }

    func testRunsDecodesTheLiveShape() throws {
        // The exact bytes `v2Native:runsForThread` returns (ms-epoch
        // createdAt, nullable brain/lastDone), captured live.
        let json = """
        {"open": [], "lastDone": {"brain": "paige", "createdAt": 1788765877747.0, "id": "run-1", "provider": "r20-bridge", "status": "done"}}
        """.data(using: .utf8)!
        let runs = try JSONDecoder().decode(V2ThreadRuns.self, from: json)
        XCTAssertFalse(runs.isWorking)
        let done = try XCTUnwrap(runs.lastDone)
        XCTAssertEqual(done.brain, "paige")
        XCTAssertEqual(done.createdAt.timeIntervalSince1970, 1788765877.747, accuracy: 0.001)
        let open = try JSONDecoder().decode(
            V2ThreadRuns.self,
            from: #"{"open": [{"id": "r2", "status": "queued", "brain": null, "provider": "b", "createdAt": 1788765877747.0}], "lastDone": null}"#.data(using: .utf8)!
        )
        XCTAssertTrue(open.isWorking)
    }

    // MARK: - replyTo block field

    func testSendCarriesBareTextPlusWireFields() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        let quote = V2ReplyQuote(messageID: "e1", sender: "Paige", snippet: "ship it")
        await model.send("on it", quote: quote)
        XCTAssertEqual(api.sentTexts, ["on it"], "the text carries no quote line")
        XCTAssertEqual(api.sentReplyTos, [quote.wire])
        let eventID = try XCTUnwrap(api.sentClientEventIDs.first ?? nil)
        XCTAssertFalse(eventID.isEmpty, "the outbox id rides clientEventId")
        XCTAssertEqual(api.sentModes, [nil], "Work rides no field")
        XCTAssertEqual(api.sentModels, [nil], "Auto rides no field")
    }

    func testNonDefaultModelRides() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        model.selectModel("sonnet")
        await model.send("hello")
        XCTAssertEqual(api.sentModels, ["sonnet"])
    }

    func testEchoCarriesQuoteAndServerEventKeepsIt() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        // R40: the server event carries the stored `replyTo` itself — the
        // model keeps the server field verbatim, no client re-attach runs.
        let quote = V2ReplyQuote(messageID: "e1", sender: "Paige", snippet: "ship it")
        var server = self.userEvent(id: "srv-user-9", text: "on it")
        server.replyQuote = quote
        api.threadEventsHandler = { _ in [server] }
        await model.send("on it", quote: quote)
        let kept = try XCTUnwrap(model.events.first(where: { $0.id == "srv-user-9" }))
        XCTAssertEqual(kept.replyQuote, quote, "the server field renders as-is")
        XCTAssertFalse(model.events.contains(where: { $0.id.hasPrefix(V2ChatModel.localPrefix) }))
    }

    func testQuotelessServerEventStaysQuoteless() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        // R40: the local re-attach is gone — a server event with no
        // `replyTo` never gains the just-sent quote, even on exact-text
        // match. The server field is the only source of truth.
        api.threadEventsHandler = { _ in [self.userEvent(id: "srv-user-9", text: "on it")] }
        let quote = V2ReplyQuote(messageID: "e1", sender: "Paige", snippet: "ship it")
        await model.send("on it", quote: quote)
        let kept = try XCTUnwrap(model.events.first(where: { $0.id == "srv-user-9" }))
        XCTAssertNil(kept.replyQuote, "no client stamping onto the server event")
    }

    func testRetryResendsQuoteAndOutboxId() async throws {
        let (model, api, thread, project) = try await startedModel()
        var calls = 0
        api.sendHandler = { _, _, _, _ in
            calls += 1
            if calls == 1 { throw URLError(.notConnectedToInternet) }
            return self.routeDecision(project: project, threadID: thread.id)
        }
        api.threadEventsHandler = { _ in [self.userEvent(id: "srv-user-9", text: "on it")] }
        let quote = V2ReplyQuote(messageID: "e1", sender: "Paige", snippet: "ship it")
        await model.send("on it", quote: quote)
        XCTAssertEqual(model.queued.count, 1, "the failure parks visibly")
        await model.replayOutbox()
        XCTAssertEqual(api.sentTexts, ["on it", "on it"])
        XCTAssertEqual(api.sentReplyTos, [quote.wire, quote.wire], "the retry re-sends the quote")
        XCTAssertEqual(api.sentClientEventIDs[0], api.sentClientEventIDs[1], "same outbox id: never appends twice")
        XCTAssertTrue(model.queued.isEmpty)
    }

    func testThreadEventLiftsQuoteFromRawBlock() throws {
        let json = """
        {"id": "e9", "threadID": "t", "author": "user", "agentLabel": null,
         "blocks": [{"type": "text", "value": "on it",
                     "replyTo": {"messageId": "e1", "sender": "Paige", "snippet": "ship it"}}],
         "createdAt": "2026-09-07T10:00:00.000Z"}
        """.data(using: .utf8)!
        let event = try JSONDecoder.corner.decode(ThreadEvent.self, from: json)
        XCTAssertEqual(
            event.replyQuote,
            V2ReplyQuote(messageID: "e1", sender: "Paige", snippet: "ship it")
        )
        // The overlay never encodes: it is read state, not wire state.
        let encoded = try JSONEncoder().encode(event)
        let raw = try JSONSerialization.jsonObject(with: encoded) as? [String: Any]
        XCTAssertNil((raw?["blocks"] as? [[String: Any]])?.first?["replyTo"])
    }

    func testThreadEventWithoutQuoteDecodesClean() throws {
        let event = try JSONDecoder.corner.decode(
            ThreadEvent.self,
            from: """
            {"id": "e9", "threadID": "t", "author": "user", "agentLabel": null,
             "blocks": [{"type": "text", "value": "plain"}],
             "createdAt": "2026-09-07T10:00:00.000Z"}
            """.data(using: .utf8)!
        )
        XCTAssertNil(event.replyQuote)
    }

    // MARK: - clear chat

    func testClearEmptiesTheThread() async throws {
        // The fake models `clearedAt`: after the clear the surface serves
        // no rows, like the server hiding them on every device.
        var cleared = false
        let (model, api, thread, _) = try await startedModel(configure: { api in
            api.clearThreadHandler = { _ in cleared = true }
        })
        api.threadEventsHandler = { _ in cleared ? [] : [self.userEvent(id: "u1", text: "before")] }
        await model.foreground()
        XCTAssertFalse(model.events.isEmpty)
        model.draft = "typed"
        try await model.clearThread()
        XCTAssertEqual(api.clearedThreadIDs, [thread.id])
        XCTAssertTrue(model.events.isEmpty, "the thread empties")
        XCTAssertEqual(model.loadState, .empty)
        XCTAssertEqual(model.draft, "")
        XCTAssertNil(model.lastDecision)
        XCTAssertNil(model.workingLine)
    }

    func testClearFailureChangesNothing() async throws {
        let (model, api, _, _) = try await startedModel(configure: { api in
            api.clearThreadHandler = { _ in throw ConvexServiceError.server("Server Error") }
        })
        api.threadEventsHandler = { _ in [self.userEvent(id: "u1", text: "before")] }
        await model.foreground()
        do {
            try await model.clearThread()
            XCTFail("the failure must throw so the view can say so")
        } catch {
            XCTAssertEqual(model.events.map(\.id), ["u1"], "nothing changed")
        }
    }

    // MARK: - staged uploads

    func testUploadRunsTheWebPath() async throws {
        let (model, api, thread, _) = try await startedModel(configure: { api in
            api.uploadHandler = { _, _ in "storage-1" }
            api.createArtifactHandler = { _, _, _, _, _, _ in V2CreatedArtifact(id: "art-1") }
        })
        let bytes = Data("pdf-bytes".utf8)
        model.stageAttachment(name: "brief.pdf", kind: .file, data: bytes, mimeType: "application/pdf")
        var waits = 0
        while model.staged.first?.isDone != true && waits < 100 {
            try? await Task.sleep(nanoseconds: 20_000_000)
            waits += 1
        }
        XCTAssertEqual(api.uploadedFiles.count, 1, "one storage POST per file")
        XCTAssertEqual(api.uploadedFiles.first?.bytes, bytes.count, "the bytes ride the POST")
        XCTAssertEqual(api.uploadedFiles.first?.mimeType, "application/pdf", "the file's MIME rides the POST")
        let created = try XCTUnwrap(api.createdArtifacts.first)
        XCTAssertEqual(created.threadID, thread.id)
        XCTAssertEqual(created.kind, .pdf, "kind by MIME")
        XCTAssertEqual(created.title, "brief.pdf")
        XCTAssertEqual(created.storageId, "storage-1")
        XCTAssertEqual(created.meta["mimeType"], "application/pdf")
        XCTAssertEqual(created.createdBy, "user")
    }

    func testFailedUploadRetriesAloneAndNeverBlocksSend() async throws {
        let (model, api, thread, project) = try await startedModel(configure: { api in
            var calls = 0
            api.uploadHandler = { _, _ in
                calls += 1
                if calls == 1 { throw URLError(.notConnectedToInternet) }
                return "storage-2"
            }
            api.createArtifactHandler = { _, _, _, _, _, _ in V2CreatedArtifact(id: "art-2") }
        })
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        model.stageAttachment(name: "photo.jpg", kind: .photo, data: Data("img".utf8), mimeType: "image/jpeg")
        var waits = 0
        while model.staged.first?.isRetryable != true && waits < 100 {
            try? await Task.sleep(nanoseconds: 20_000_000)
            waits += 1
        }
        let reason = try XCTUnwrap(model.staged.first).upload
        XCTAssertEqual(reason, .failed(reason: "Couldn't upload — check your connection, then retry."))
        // The send goes out mid-failure, carrying no bytes.
        await model.send("hello")
        XCTAssertEqual(api.sentTexts, ["hello"])
        // The retry finishes the file alone.
        model.retryUpload(id: model.staged[0].id)
        waits = 0
        while model.staged.first?.isDone != true && waits < 100 {
            try? await Task.sleep(nanoseconds: 20_000_000)
            waits += 1
        }
        XCTAssertEqual(api.uploadedFiles.count, 2)
        XCTAssertEqual(api.createdArtifacts.first?.kind, .photo)
    }

    func testStagedBeforeStartUploadsAtStart() async throws {
        // Items staged before the thread arrives (seeds, fast picks) begin
        // uploading at start, once the thread pins them.
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        api.runsHandler = { _ in V2ThreadRuns(open: [], lastDone: nil) }
        api.uploadHandler = { _, _ in "storage-9" }
        api.createArtifactHandler = { _, _, _, _, _, _ in V2CreatedArtifact(id: "art-9") }
        let model = V2ChatModel(api: api, outbox: .memory)
        model.stageAttachment(name: "early.pdf", kind: .file, data: Data("x".utf8), mimeType: "application/pdf")
        XCTAssertEqual(model.staged.first?.upload, .queued, "no thread yet: no upload")
        let (thread, project, mission) = try context()
        await model.start(thread: thread, project: project, mission: mission)
        var waits = 0
        while model.staged.first?.isDone != true && waits < 100 {
            try? await Task.sleep(nanoseconds: 20_000_000)
            waits += 1
        }
        XCTAssertEqual(api.uploadedFiles.count, 1)
    }

    func testNameOnlyStageNeverUploads() async throws {
        let (model, api, _, _) = try await startedModel()
        model.stageAttachment(name: "seed-deck.pdf", kind: .file)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertTrue(api.uploadedFiles.isEmpty)
        XCTAssertEqual(model.staged.first?.upload, .queued)
    }

    // MARK: - artifact kinds

    func testKindByMIME() {
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "application/pdf", filename: "x"), .pdf)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "application/octet-stream", filename: "deck.pdf"), .pdf)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "image/jpeg", filename: "photo.jpg"), .photo)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "video/mp4", filename: "clip.mov"), .video)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "text/html", filename: "x"), .web)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "application/octet-stream", filename: "deck.pptx"), .deck)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "text/plain", filename: "notes"), .document)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "application/octet-stream", filename: "main.swift"), .code)
        XCTAssertEqual(V2ArtifactKind.from(mimeType: "application/octet-stream", filename: "blob.bin"), .genericFile)
    }

    func testCoreNames() {
        XCTAssertEqual(V2ArtifactKind.coreName(for: .web), "site")
        XCTAssertEqual(V2ArtifactKind.coreName(for: .genericFile), "file")
        XCTAssertEqual(V2ArtifactKind.coreName(for: .pdf), "pdf")
        XCTAssertEqual(V2ArtifactKind.coreName(for: .photo), "photo")
    }

    // MARK: - image artifacts

    func testCreateImageArtifactRegistersPendingPhoto() async throws {
        let (model, api, thread, _) = try await startedModel(configure: { api in
            api.createArtifactHandler = { _, _, _, _, _, _ in V2CreatedArtifact(id: "art-photo-1") }
        })
        let runID = model.startImageRun(prompt: "a lighthouse at dawn")
        let artifactID = try await model.createImageArtifact(runID: runID, prompt: "a lighthouse at dawn", tool: "image")
        XCTAssertEqual(artifactID, "art-photo-1")
        let created = try XCTUnwrap(api.createdArtifacts.first)
        XCTAssertEqual(created.threadID, thread.id)
        XCTAssertEqual(created.kind, .photo)
        XCTAssertTrue(created.title.hasPrefix("Generated image — "))
        XCTAssertNil(created.storageId, "no bytes yet: the bridge upgrades in place")
        XCTAssertEqual(created.meta["status"], "generating")
        XCTAssertEqual(created.meta["prompt"], "a lighthouse at dawn")
        XCTAssertEqual(created.meta["imageTool"], "image")
        XCTAssertEqual(created.createdBy, "user")
        XCTAssertEqual(model.imageRuns.first(where: { $0.id == runID })?.artifactID, "art-photo-1")
    }

    func testAwaitImageReadyResolvesWhenStorageLands() async throws {
        let ready = Artifact(
            id: "art-photo-1", threadID: "thread-r32-test", title: "Generated image",
            kind: .photo, version: 1,
            sourceURL: URL(string: "https://example.com/img.png"), metadata: ["status": "ready"]
        )
        let (model, _, _, _) = try await startedModel(configure: { api in
            api.artifactsHandler = { _ in [ready] }
        })
        let done = await model.awaitImageReady(artifactID: "art-photo-1", pollInterval: 0.01)
        XCTAssertTrue(done)
    }

    func testAwaitImageReadyWaitsThroughPending() async throws {
        let pending = Artifact(
            id: "art-photo-1", threadID: "thread-r32-test", title: "Generated image",
            kind: .photo, version: 1, sourceURL: nil, metadata: ["status": "generating"]
        )
        let ready = Artifact(
            id: "art-photo-1", threadID: "thread-r32-test", title: "Generated image",
            kind: .photo, version: 1,
            sourceURL: URL(string: "https://example.com/img.png"), metadata: ["status": "ready"]
        )
        var reads = 0
        let (model, _, _, _) = try await startedModel(configure: { api in
            api.artifactsHandler = { _ in
                reads += 1
                return reads < 3 ? [pending] : [ready]
            }
        })
        let done = await model.awaitImageReady(artifactID: "art-photo-1", pollInterval: 0.01)
        XCTAssertTrue(done, "the poll outlasts the pending state")
        XCTAssertGreaterThanOrEqual(reads, 3)
    }

    func testPendingPredicate() {
        let pending = Artifact(
            id: "a", threadID: "t", title: "Generated image", kind: .photo, version: 1,
            sourceURL: nil, metadata: ["status": "generating", "prompt": "a lighthouse"]
        )
        XCTAssertTrue(V2ArtifactPending.isPending(pending))
        XCTAssertEqual(V2ArtifactPending.prompt(pending), "a lighthouse")
        let ready = Artifact(
            id: "a", threadID: "t", title: "Generated image", kind: .photo, version: 1,
            sourceURL: URL(string: "https://example.com/img.png"), metadata: ["status": "ready"]
        )
        XCTAssertFalse(V2ArtifactPending.isPending(ready))
        let broken = Artifact(
            id: "a", threadID: "t", title: "Broken file", kind: .pdf, version: 1,
            sourceURL: nil, metadata: [:]
        )
        XCTAssertFalse(V2ArtifactPending.isPending(broken), "a linkless file is still the error card, not Generating")
    }

    // MARK: - multiline

    func testShiftReturnAppendsNewline() {
        XCTAssertEqual(V2ShiftReturn.newlineDraft("hello"), "hello\n")
        XCTAssertEqual(V2ShiftReturn.newlineDraft(""), "\n")
        XCTAssertEqual(V2ShiftReturn.newlineDraft("a\nb"), "a\nb\n")
    }

    // MARK: - wire shapes

    func testV2SendArgsCarryWireFields() {
        let reply = V2ReplyTo(messageId: "e1", sender: "Paige", snippet: "ship it")
        let args = ConvexEndpoint.v2Send(
            text: "on it", mentioning: [], preferredProjectID: nil,
            mode: "plan", threadId: "t1", model: "sonnet",
            clientEventId: "evt-1", imageTool: "image", replyTo: reply
        ).args
        XCTAssertEqual(args["mode"] as? String, "plan")
        XCTAssertEqual(args["model"] as? String, "sonnet")
        XCTAssertEqual(args["clientEventId"] as? String, "evt-1")
        XCTAssertEqual(args["imageTool"] as? String, "image")
        let wire = try? XCTUnwrap(args["replyTo"] as? [String: String])
        XCTAssertEqual(wire?["messageId"], "e1")
        XCTAssertEqual(wire?["sender"], "Paige")
        XCTAssertEqual(wire?["snippet"], "ship it")
    }

    func testV2SendArgsOmitUnsetFields() {
        let args = ConvexEndpoint.v2Send(
            text: "hi", mentioning: [], preferredProjectID: nil,
            mode: nil, threadId: "t1", model: nil,
            clientEventId: nil, imageTool: nil, replyTo: nil
        ).args
        for key in ["mode", "model", "clientEventId", "imageTool", "replyTo", "preferredProjectId"] {
            XCTAssertNil(args[key], "\(key) is omitted, not null")
        }
        XCTAssertEqual(args["threadId"] as? String, "t1")
    }

    func testNewEndpointPaths() {
        XCTAssertEqual(ConvexEndpoint.v2RunsForThread(threadID: "t").path, "v2Native:runsForThread")
        XCTAssertEqual(ConvexEndpoint.v2ClearThread(threadID: "t").path, "v2Workspace:clearThread")
        XCTAssertEqual(ConvexEndpoint.v2GenerateUploadUrl.path, "files:generateUploadUrl")
        let create = ConvexEndpoint.v2CreateArtifact(
            threadID: "t", coreKind: "file", title: "a.pdf",
            storageId: "s1", meta: ["mimeType": "application/pdf"], createdBy: "user"
        )
        XCTAssertEqual(create.path, "v2Visual:createArtifact")
        XCTAssertEqual(create.args["kind"] as? String, "file")
        XCTAssertEqual(create.args["storageId"] as? String, "s1")
        let pending = ConvexEndpoint.v2CreateArtifact(
            threadID: "t", coreKind: "photo", title: "Generated image",
            storageId: nil, meta: ["status": "generating"], createdBy: "user"
        )
        XCTAssertNil(pending.args["storageId"], "pending images carry no storage")
    }

    func testUploadFilePostsBytesToMintedURL() async throws {
        let bytes = Data("hello-bytes".utf8)
        var posts: [(url: String, type: String, count: Int)] = []
        let transport = FakeConvexTransport { request in
            let url = request.url!
            let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: nil)!
            if url.path.contains("/api/storage/upload") {
                posts.append((
                    url: url.absoluteString,
                    type: request.value(forHTTPHeaderField: "Content-Type") ?? "",
                    count: request.httpBody?.count ?? -1
                ))
                return (Data(#"{"storageId": "storage-abc"}"#.utf8), response)
            }
            let body: [String: Any] = ["status": "success", "value": "https://example.com/api/storage/upload?token=x"]
            return (try! JSONSerialization.data(withJSONObject: body), response)
        }
        let api = DefaultCornerV2API(service: ConvexService(session: .valid, transport: transport))
        let storageId = try await api.uploadFile(data: bytes, mimeType: "image/jpeg")
        XCTAssertEqual(storageId, "storage-abc")
        XCTAssertEqual(posts.count, 1)
        XCTAssertEqual(posts.first?.type, "image/jpeg")
        XCTAssertEqual(posts.first?.count, bytes.count)
    }

    func testCreateArtifactDecodesInsertedRow() async throws {
        let transport = FakeConvexTransport { request in
            let body: [String: Any] = [
                "status": "success",
                "value": ["_id": "art-row-1", "threadId": "t", "kind": "photo", "title": "Generated image"],
            ]
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (try! JSONSerialization.data(withJSONObject: body), response)
        }
        let api = DefaultCornerV2API(service: ConvexService(session: .valid, transport: transport))
        let created = try await api.createArtifact(
            threadID: "t", kind: .photo, title: "Generated image",
            storageId: nil, meta: ["status": "generating"], createdBy: "user"
        )
        XCTAssertEqual(created.id, "art-row-1")
        let sent = try XCTUnwrap(transport.requests.last?.httpBody)
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: sent) as? [String: Any])
        let args = try XCTUnwrap(json["args"] as? [String: Any])
        XCTAssertEqual(args["kind"] as? String, "photo")
    }
}
