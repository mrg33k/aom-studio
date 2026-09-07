import Combine
import PDFKit
import UIKit
import XCTest
@testable import Corner

/// corner:corner-v2 R24 (P074/P075/P076/P078/P079/P080): the send goes to the
/// thread, rejections read as rejections, the page fits the stage, the
/// placeholder fits the pill, step-only events paint.
@MainActor
final class R24SendAndSheetTests: XCTestCase {

    // MARK: - helpers

    private func thread(id: String = "thread-r24-1") throws -> (
        thread: Corner.Thread, project: ProjectSummary, mission: MissionSummary?
    ) {
        let fixture = try Fixture.loadNativeFixture()
        guard let aster = fixture.workspace.projects.first(where: { $0.name == "Aster" }) else {
            throw FakeRouteError.expectedAsterProject
        }
        let thread = Corner.Thread(
            id: id, ownerType: .project, projectID: aster.id,
            missionID: nil, visualSessionID: "session-r24"
        )
        return (thread, aster, nil)
    }

    private func routeDecision(project: ProjectSummary, threadID: String) -> RouteDecision {
        RouteDecision(
            decisionId: "decision-r24-1", destinationThreadID: threadID,
            project: project, mission: nil, confidence: 1, alternatives: [],
            reason: "Already in \(project.name).", needsClarification: false,
            needsCreationConfirmation: false, actor: "tester", createdAt: Date()
        )
    }

    private func decisionJSON(destinationThreadID: String) -> [String: Any] {
        [
            "decisionId": "decision-1",
            "destinationThreadID": destinationThreadID,
            "project": [
                "id": "proj-general-1", "workspaceID": "world-1", "name": "General",
                "kind": "general", "tintHex": "#8B5CF6", "needsAttention": false,
                "threadID": "thread-general-1", "missions": [],
            ],
            "mission": NSNull(),
            "confidence": 1.0, "alternatives": [],
            "reason": "Already in General.",
            "needsClarification": false, "needsCreationConfirmation": false,
            "actor": "tester", "createdAt": "2026-09-05T10:06:00.000Z",
        ]
    }

    private func args(of request: URLRequest) throws -> [String: Any] {
        let body = try XCTUnwrap(request.httpBody)
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: body) as? [String: Any])
        return try XCTUnwrap(json["args"] as? [String: Any])
    }

    // MARK: - P080: the thread send carries its thread id

    func testInThreadSendCarriesThreadId() async throws {
        let (thread, project, _) = try thread()
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        api.sendHandler = { [weak api] _, _, _, _ in
            _ = api
            return self.routeDecision(project: project, threadID: thread.id)
        }
        let model = V2ChatModel(api: api, outbox: .memory)
        await model.start(thread: thread, project: project, mission: nil)

        await model.send("Retail buyers")

        XCTAssertEqual(api.sentThreadIDs, [thread.id], "the thread send must pin its thread id")
        XCTAssertEqual(api.sentTexts, ["Retail buyers"])
        XCTAssertEqual(
            model.lastDecision?.destinationThreadID, thread.id,
            "an in-thread answer names the thread it is already in"
        )
    }

    func testGlobalIntakeSendCarriesNoThreadId() async throws {
        let fixture = try Fixture.loadNativeFixture()
        let general = try XCTUnwrap(fixture.workspace.projects.first(where: { $0.kind == .general }))
        let api = CornerV2APIFake()
        api.sendHandler = { _, _, _, _ in
            self.routeDecision(project: general, threadID: general.threadID)
        }
        _ = try await api.send(text: "Summarize this", mentioning: [], preferredProjectID: nil)
        let expected: [String?] = [nil]
        XCTAssertEqual(api.sentThreadIDs, expected, "the room-less intake send stays global")
    }

    // MARK: - P075: the mode fallback fires, and keeps the thread

    func testPlanModeFallbackFiresAndKeepsThreadId() async throws {
        var calls = 0
        let transport = FakeConvexTransport { [self] request in
            // A backend that predates `mode`: arg validation rejects before
            // anything writes; the field-less retry then succeeds.
            let body: [String: Any] = calls == 0
                ? ["status": "error", "errorMessage": "Invalid argument `mode` for v2Native:send"]
                : ["status": "success", "value": self.decisionJSON(destinationThreadID: "thread-r24-1")]
            calls += 1
            let data = try! JSONSerialization.data(withJSONObject: body)
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (data, response)
        }
        let service = ConvexService(session: .valid, transport: transport)
        let api = DefaultCornerV2API(service: service)

        let decision = try await api.send(
            text: "Draft the plan", mentioning: [], preferredProjectID: nil,
            mode: "plan", threadId: "thread-r24-1"
        )

        XCTAssertEqual(decision.decisionId, "decision-1")
        XCTAssertEqual(transport.requests.count, 2, "the mode rejection must fall back field-less, once")
        let first = try args(of: transport.requests[0])
        XCTAssertEqual(first["mode"] as? String, "plan", "Plan rides the first attempt")
        XCTAssertEqual(first["threadId"] as? String, "thread-r24-1")
        let second = try args(of: transport.requests[1])
        XCTAssertNil(second["mode"], "the fallback drops the unknown field")
        XCTAssertEqual(
            second["threadId"] as? String, "thread-r24-1",
            "the fallback must never degrade an in-thread send into a global route"
        )
    }

    func testSendOmitsAbsentThreadId() {
        let args = ConvexEndpoint.v2Send(text: "hi", mentioning: [], preferredProjectID: nil).args
        XCTAssertNil(args["threadId"], "absent thread is omitted, not null")
        let threaded = ConvexEndpoint.v2Send(
            text: "hi", mentioning: [], preferredProjectID: nil, threadId: "thread-r24-1"
        ).args
        XCTAssertEqual(threaded["threadId"] as? String, "thread-r24-1")
    }

    // MARK: - P075: rejections read as rejections, offline as offline

    func testRejectionQueuesWithPlainReasonAndNotSentBanner() async throws {
        let (thread, project, _) = try thread(id: "thread-r24-reject")
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        api.sendHandler = { _, _, _, _ in
            throw ConvexServiceError.server("[Request ID: test-reject] Server Error")
        }
        let outbox = V2OutboxStore.memory
        let model = V2ChatModel(api: api, outbox: outbox)
        await model.start(thread: thread, project: project, mission: nil)

        await model.send("Hello?")

        let pending = outbox.pending(threadID: thread.id)
        XCTAssertEqual(pending.count, 1, "a rejected send parks, never vanishes")
        XCTAssertEqual(
            pending.first?.lastFailure,
            .rejected(reason: "The server didn't take it — your text is kept. Tap Retry."),
            "the masked clone rejection keeps a plain reason, not the envelope"
        )
        guard case .notSent(let count, let reason) = model.sendBanner else {
            return XCTFail("a rejection must banner Not sent, got \(model.sendBanner)")
        }
        XCTAssertEqual(count, 1)
        XCTAssertTrue(reason.contains("kept"), "the banner reason names the kept text: \(reason)")
    }

    func testNetworkErrorQueuesOfflineBanner() async throws {
        let (thread, project, _) = try thread(id: "thread-r24-offline")
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        api.sendHandler = { _, _, _, _ in throw URLError(.notConnectedToInternet) }
        let outbox = V2OutboxStore.memory
        let model = V2ChatModel(api: api, outbox: outbox)
        await model.start(thread: thread, project: project, mission: nil)

        await model.send("Hello?")

        XCTAssertEqual(outbox.pending(threadID: thread.id).first?.lastFailure, .network)
        XCTAssertEqual(model.sendBanner, .offline(count: 1), "only a real network failure reads Offline")
    }

    func testSuccessfulSendClearsBanner() async throws {
        let (thread, project, _) = try thread(id: "thread-r24-ok")
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        let outbox = V2OutboxStore.memory
        let model = V2ChatModel(api: api, outbox: outbox)
        await model.start(thread: thread, project: project, mission: nil)

        await model.send("Hello.")

        XCTAssertEqual(outbox.pending(threadID: thread.id).count, 0)
        XCTAssertEqual(model.sendBanner, .none)
    }

    func testClassifyShapes() {
        XCTAssertEqual(V2SendError.classify(URLError(.notConnectedToInternet)), .network)
        XCTAssertEqual(V2SendError.classify(URLError(.timedOut)), .network)
        XCTAssertEqual(
            V2SendError.classify(ConvexServiceError.notSignedIn),
            .rejected(reason: "You're signed out. Sign in, then retry.")
        )
        XCTAssertEqual(
            V2SendError.plainReason("Project access denied for viewer"),
            "You don't have access to this thread."
        )
        XCTAssertEqual(
            V2SendError.plainReason("Thread not found"),
            "This thread isn't here anymore."
        )
        XCTAssertEqual(
            V2SendError.plainReason("[Request ID: abc] Server Error"),
            "The server didn't take it — your text is kept. Tap Retry."
        )
    }

    func testOutboxEntryDecodesPreR24JSON() throws {
        // Entries written before the failure stamp existed (no `lastFailure`
        // key) still load — as "no failure yet", never dropped.
        let json = """
        {"clientEventID":"c1","threadID":"t1","text":"hi","mentioning":[],"preferredProjectID":null,"createdAt":778381200.0}
        """.data(using: .utf8)!
        let entry = try JSONDecoder().decode(V2OutboxEntry.self, from: json)
        XCTAssertNil(entry.lastFailure)
        XCTAssertEqual(entry.text, "hi")
    }

    func testStartClearsThePreviousThreadDecision() async throws {
        let (thread, project, _) = try thread(id: "thread-r24-decision")
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        let model = V2ChatModel(api: api, outbox: .memory)
        await model.start(thread: thread, project: project, mission: nil)
        await model.send("Hello.")
        XCTAssertNotNil(model.lastDecision)

        await model.start(thread: thread, project: project, mission: nil)
        XCTAssertNil(model.lastDecision, "one thread's decision must never card the next thread")
    }

    // MARK: - P078: step-only rows paint, blanks never do

    func testStepsPrepareFiltersBlankLabels() {
        let rows = V2StepsPrepare.rows(from: [
            StepState(id: "a", label: "Gathering the latest numbers", state: "done"),
            StepState(id: "b", label: "", state: "done"),
            StepState(id: "c", label: "   ", state: "open"),
        ])
        XCTAssertEqual(rows.map(\.id), ["a"])
    }

    func testStepsPrepareEmptyStaysEmpty() {
        XCTAssertTrue(V2StepsPrepare.rows(from: []).isEmpty)
    }

    // MARK: - P076: the placeholder fits the pill at 390

    private func hankenInput() throws -> UIFont {
        let names = UIFont.fontNames(forFamilyName: "Hanken Grotesk")
        let regular = names.first(where: { $0.lowercased().contains("regular") }) ?? names.first
        return try XCTUnwrap(regular.flatMap { UIFont(name: $0, size: 14.5) }, "Hanken Grotesk missing: \(names)")
    }

    private func width(_ text: String, font: UIFont) -> CGFloat {
        // TextKit, not size(withAttributes:): the field renders through
        // TextKit (kerning, line-fragment metrics), and the advance sum
        // under-reads it by ~7%.
        let storage = NSTextStorage(string: text, attributes: [.font: font])
        let container = NSTextContainer(size: CGSize(width: 10_000, height: 1_000))
        container.lineFragmentPadding = 0
        let manager = NSLayoutManager()
        manager.addTextContainer(container)
        storage.addLayoutManager(manager)
        manager.ensureLayout(for: container)
        return manager.usedRect(for: container).width
    }

    func testPlaceholderFitsAt390WithCollapsedChip() throws {
        let font = try hankenInput()
        let copy = ChatView.V2ComposerMetrics.placeholder(project: ChatView.V2ComposerMetrics.placeholderProject)
        XCTAssertEqual(copy, "Tell Aster what to make next")
        let need = width(copy, font: font)
        let general = width("Tell General what to make next", font: font)
        let have = ChatView.V2ComposerMetrics.fieldWidth(
            screenWidth: 390, chipWidth: ChatView.V2ComposerMetrics.collapsedChipWidth
        )
        print("R24 placeholder need=\(need) general=\(general) have=\(have)")
        XCTAssertLessThanOrEqual(
            need, have,
            "the full placeholder must fit the pill at 390 with the collapsed chip (need \(need), have \(have))"
        )
        XCTAssertLessThanOrEqual(
            general, have,
            "General-length names fit too — the phone's case (need \(general), have \(have))"
        )
    }

    // MARK: - P074: the page fits the stage

    func testPDFPageFitCentersPortraitPage() {
        // The fixture brief is a 1080×1350 (4:5) portrait page.
        let rect = PDFPageFit.fittedRect(pageSize: CGSize(width: 1080, height: 1350), in: CGSize(width: 390, height: 290))
        XCTAssertEqual(rect.width, 232, accuracy: 0.5, "a portrait page fits by height")
        XCTAssertEqual(rect.height, 290, accuracy: 0.5, "the whole page is visible, edge to edge of the stage height")
        XCTAssertEqual(rect.minX, 79, accuracy: 0.5, "letterboxed, centered")
        XCTAssertEqual(rect.minY, 0, accuracy: 0.5)
        XCTAssertEqual(rect.width / rect.height, 1080.0 / 1350.0, accuracy: 0.001, "aspect preserved")
    }

    func testPDFPageFitNeverEmitsNaN() {
        XCTAssertEqual(PDFPageFit.fittedRect(pageSize: .zero, in: CGSize(width: 390, height: 290)), .zero)
        XCTAssertEqual(PDFPageFit.fittedRect(pageSize: CGSize(width: 1080, height: 1350), in: .zero), .zero)
    }

    func testPDFPageTurnClamps() throws {
        let url = try XCTUnwrap(
            Bundle(for: FixtureBundleMarker.self).url(forResource: "aster-brief", withExtension: "pdf"),
            "aster-brief.pdf missing from the test bundle"
        )
        let document = try XCTUnwrap(PDFDocument(url: url))
        XCTAssertGreaterThan(document.pageCount, 1)
        XCTAssertNotNil(PDFPageTurn.target(document: document, page: 1))
        XCTAssertNotNil(PDFPageTurn.target(document: document, page: document.pageCount))
        XCTAssertNil(PDFPageTurn.target(document: document, page: 0), "page numbers are 1-based")
        XCTAssertNil(PDFPageTurn.target(document: document, page: document.pageCount + 1))
        // The turn lands the view on the asked page (the arrows move the
        // view, not just the label — the old code never did this).
        let view = PDFView()
        view.document = document
        view.displayMode = .singlePage
        view.autoScales = true
        view.go(to: try XCTUnwrap(PDFPageTurn.target(document: document, page: 1)))
        XCTAssertEqual(document.index(for: view.currentPage!), 0)
        view.go(to: try XCTUnwrap(PDFPageTurn.target(document: document, page: 2)))
        XCTAssertEqual(document.index(for: view.currentPage!), 1)
    }

    // MARK: - P077: the glass preview never persists

    func testThemePreviewDoesNotPersist() {
        UserDefaults.standard.removeObject(forKey: ThemeManager.storageKey)
        let manager = ThemeManager()
        manager.preview(.glass)
        XCTAssertEqual(manager.kind, .glass, "the preview applies to the process")
        XCTAssertNil(
            UserDefaults.standard.string(forKey: ThemeManager.storageKey),
            "a preview default must never reach disk and re-theme later runs"
        )
    }

    // MARK: - P075: reconnect fires once, on the edge

    func testReconnectMonitorFiresOnlyOnTheEdge() {
        let monitor = V2ReconnectMonitor(monitor: nil)
        var posts = 0
        let token = NotificationCenter.default.addObserver(
            forName: .v2DidReconnect, object: nil, queue: nil
        ) { _ in posts += 1 }
        defer { NotificationCenter.default.removeObserver(token) }

        XCTAssertFalse(monitor.pathChanged(satisfied: true), "launching online is not a reconnect")
        XCTAssertFalse(monitor.pathChanged(satisfied: false))
        XCTAssertFalse(monitor.pathChanged(satisfied: false), "staying offline is not a reconnect")
        XCTAssertTrue(monitor.pathChanged(satisfied: true), "offline→online flushes the queue")
        XCTAssertFalse(monitor.pathChanged(satisfied: true), "staying online fires nothing")
        XCTAssertEqual(posts, 1)
    }
}
