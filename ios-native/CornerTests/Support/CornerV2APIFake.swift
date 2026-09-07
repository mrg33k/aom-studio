import Combine
import Foundation
@testable import Corner

enum FakeRouteError: Error {
    case expectedOneGeneralProject
    case expectedAsterProject
}

/// Route presets for store tests, built from the backend fixture workspace so
/// the ids always match the contract (`v2.native.fixture.json`).
enum FakeRoute {
    case proposedGeneralMission
    case ambiguousAsterOrNorthwind

    /// The fixture's General project (exactly one exists by contract).
    func generalProject() throws -> ProjectSummary {
        let fixture = try Fixture.loadNativeFixture()
        let generals = fixture.workspace.projects.filter { $0.kind == .general }
        guard generals.count == 1, let general = generals.first else {
            throw FakeRouteError.expectedOneGeneralProject
        }
        return general
    }

    func decision() throws -> RouteDecision {
        let stamp = Date()
        switch self {
        case .proposedGeneralMission:
            let general = try generalProject()
            return RouteDecision(
                decisionId: "decision-proposed-general-1",
                destinationThreadID: "",
                project: general,
                mission: nil,
                confidence: 0.7,
                alternatives: [],
                reason: "Create mission in General.",
                needsClarification: false,
                needsCreationConfirmation: true,
                actor: "tester",
                createdAt: stamp
            )
        case .ambiguousAsterOrNorthwind:
            let fixture = try Fixture.loadNativeFixture()
            guard let aster = fixture.workspace.projects.first(where: { $0.name == "Aster" }) else {
                throw FakeRouteError.expectedAsterProject
            }
            return RouteDecision(
                decisionId: "decision-ambiguous-1",
                destinationThreadID: aster.threadID,
                project: aster,
                mission: nil,
                confidence: 0.45,
                alternatives: [aster.threadID, "thread-north-1"],
                reason: "Aster and Northwind both match; asking once.",
                needsClarification: true,
                needsCreationConfirmation: false,
                actor: "tester",
                createdAt: stamp
            )
        }
    }
}

/// Closure-backed `CornerV2API` double. Each test sets only the closures (or
/// preset) it uses; every unconfigured operation throws
/// `CornerV2APIError.unconfiguredFakeOperation`.
@MainActor
final class CornerV2APIFake: CornerV2API {
    var workspaceTreeHandler: (() async throws -> WorkspaceSummary?)?
    var threadProjectHandler: ((String) async throws -> Corner.Thread?)?
    var threadMissionHandler: ((String) async throws -> Corner.Thread?)?
    var threadEventsHandler: ((String) async throws -> [ThreadEvent])?
    var sendHandler: ((String, [String], String?, String?) async throws -> RouteDecision)?
    var subscribeHandler: ((String, @escaping ([ThreadEvent]) -> Void) -> any Cancellable)?
    var visualTabsHandler: ((String) async throws -> [VisualWindowTab])?
    var openTabHandler: ((VisualTabKind, String, String?, String, [String: String]) async throws -> VisualWindowTab)?
    var closeTabHandler: ((String) async throws -> Void)?
    var submitReviewHandler: ((String, [ReviewPin]) async throws -> SubmitReviewResult)?
    var ledgerHandler: ((String, String?) async throws -> [LedgerItem])?
    var confirmCrossProjectWriteHandler: ((String) async throws -> Void)?
    var ensureWorkspaceHandler: (() async throws -> EnsureWorkspaceResult)?
    var confirmProposalHandler: ((String) async throws -> ConfirmProposalResult)?
    var artifactsHandler: ((String) async throws -> [Artifact])?
    var pendingConfirmationsHandler: (() async throws -> [CrossProjectWriteConfirmation])?
    var subscribeWorkspaceHandler: ((@escaping (WorkspaceSummary?) -> Void) -> any Cancellable)?
    var runsHandler: ((String) async throws -> V2ThreadRuns)?
    var clearThreadHandler: ((String) async throws -> Void)?
    var uploadHandler: ((Data, String) async throws -> String)?
    var createArtifactHandler: ((String, VisualTabKind, String, String?, [String: String], String) async throws -> V2CreatedArtifact)?

    /// Every `send` call's routing metadata, in order.
    private(set) var sentMentions: [[String]] = []
    private(set) var sentTexts: [String] = []
    private(set) var sentPreferredProjectIDs: [String?] = []
    /// Every `submitReview` call's pins, in order.
    private(set) var submittedPins: [[ReviewPin]] = []
    /// Every `confirmCrossProjectWrite` id, in order.
    private(set) var confirmedWriteIDs: [String] = []
    /// Queued offline texts the fake holds for outbox tests (Task 5 owns the
    /// real outbox; the fake only stores and reports them).
    var pendingOutbox: [String] = []
    /// Every `confirmProposal` decision id, in order.
    private(set) var confirmedProposalIDs: [String] = []

    init() {}

    /// Preset double: `workspaceTree` serves the fixture workspace, `send`
    /// serves the preset route, `confirmProposal` echoes a result for the
    /// preset decision id. Everything else still throws until configured.
    init(route: FakeRoute) {
        sendHandler = { [weak self] text, mentioning, preferredProjectID, _ in
            self?.sentTexts.append(text)
            self?.sentMentions.append(mentioning)
            self?.sentPreferredProjectIDs.append(preferredProjectID)
            return try route.decision()
        }
        workspaceTreeHandler = {
            try Fixture.loadNativeFixture().workspace
        }
        confirmProposalHandler = { [weak self] decisionID in
            self?.confirmedProposalIDs.append(decisionID)
            let decision = try route.decision()
            guard decisionID == decision.decisionId else {
                throw CornerV2APIError.unconfiguredFakeOperation
            }
            let general = try route.generalProject()
            return ConfirmProposalResult(
                projectID: general.id,
                missionID: "mission-created-1",
                threadID: "thread-created-1"
            )
        }
    }

    private func require<T>(_ handler: T?, op: String) throws -> T {
        guard let handler else { throw CornerV2APIError.unconfiguredFakeOperation }
        return handler
    }

    func workspaceTree() async throws -> WorkspaceSummary? {
        try await require(workspaceTreeHandler, op: "workspaceTree")()
    }

    func thread(projectID: String) async throws -> Corner.Thread? {
        try await require(threadProjectHandler, op: "thread(projectID:)")(projectID)
    }

    func thread(missionID: String) async throws -> Corner.Thread? {
        try await require(threadMissionHandler, op: "thread(missionID:)")(missionID)
    }

    func threadEvents(threadID: String) async throws -> [ThreadEvent] {
        try await require(threadEventsHandler, op: "threadEvents")(threadID)
    }

    /// Modes the fake has seen, per send — the mode-fallback test asserts
    /// Plan rides the first attempt and the field-less retry follows.
    private(set) var sentModes: [String?] = []
    /// Thread ids the fake has seen, per send — the in-thread test asserts
    /// a thread send carries its thread and a global send carries none.
    private(set) var sentThreadIDs: [String?] = []
    /// R32 wiring the fake has seen, per send.
    private(set) var sentModels: [String?] = []
    private(set) var sentClientEventIDs: [String?] = []
    private(set) var sentImageTools: [String?] = []
    private(set) var sentReplyTos: [V2ReplyTo?] = []
    /// Every `uploadFile` call's (byte count, MIME), in order.
    private(set) var uploadedFiles: [(bytes: Int, mimeType: String)] = []
    /// Every `createArtifact` call, in order.
    private(set) var createdArtifacts: [(threadID: String, kind: VisualTabKind, title: String, storageId: String?, meta: [String: String], createdBy: String)] = []
    /// Every `clearThread` thread id, in order.
    private(set) var clearedThreadIDs: [String] = []
    /// Every `runsForThread` thread id, in order.
    private(set) var runsThreadIDs: [String] = []

    func send(
        text: String, mentioning: [String], preferredProjectID: String?,
        mode: String? = nil, threadId: String? = nil,
        model: String? = nil, clientEventId: String? = nil,
        imageTool: String? = nil, replyTo: V2ReplyTo? = nil
    ) async throws -> RouteDecision {
        sentTexts.append(text)
        sentMentions.append(mentioning)
        sentPreferredProjectIDs.append(preferredProjectID)
        sentModes.append(mode)
        sentThreadIDs.append(threadId)
        sentModels.append(model)
        sentClientEventIDs.append(clientEventId)
        sentImageTools.append(imageTool)
        sentReplyTos.append(replyTo)
        return try await require(sendHandler, op: "send")(text, mentioning, preferredProjectID, threadId)
    }

    func subscribeThread(threadID: String, receive: @escaping ([ThreadEvent]) -> Void) -> any Cancellable {
        if let handler = subscribeHandler { return handler(threadID, receive) }
        return AnyCancellableTask {}
    }

    func visualTabs(visualSessionID: String) async throws -> [VisualWindowTab] {
        try await require(visualTabsHandler, op: "visualTabs")(visualSessionID)
    }

    func openVisualTab(kind: VisualTabKind, threadID: String, artifactID: String?, title: String, state: [String: String]) async throws -> VisualWindowTab {
        try await require(openTabHandler, op: "openVisualTab")(kind, threadID, artifactID, title, state)
    }

    func closeVisualTab(id: String) async throws {
        try await require(closeTabHandler, op: "closeVisualTab")(id)
    }

    func submitReview(artifactID: String, pins: [ReviewPin]) async throws -> SubmitReviewResult {
        submittedPins.append(pins)
        return try await require(submitReviewHandler, op: "submitReview")(artifactID, pins)
    }

    func ledger(workspaceID: String, after: String?) async throws -> [LedgerItem] {
        try await require(ledgerHandler, op: "ledger")(workspaceID, after)
    }

    func confirmCrossProjectWrite(id: String) async throws {
        confirmedWriteIDs.append(id)
        try await require(confirmCrossProjectWriteHandler, op: "confirmCrossProjectWrite")(id)
    }

    func ensureWorkspace() async throws -> EnsureWorkspaceResult {
        try await require(ensureWorkspaceHandler, op: "ensureWorkspace")()
    }

    func confirmProposal(decisionId: String) async throws -> ConfirmProposalResult {
        confirmedProposalIDs.append(decisionId)
        return try await require(confirmProposalHandler, op: "confirmProposal")(decisionId)
    }

    func artifacts(threadID: String) async throws -> [Artifact] {
        try await require(artifactsHandler, op: "artifacts")(threadID)
    }

    func pendingConfirmations() async throws -> [CrossProjectWriteConfirmation] {
        try await require(pendingConfirmationsHandler, op: "pendingConfirmations")()
    }

    func subscribeWorkspace(receive: @escaping (WorkspaceSummary?) -> Void) -> any Cancellable {
        if let handler = subscribeWorkspaceHandler { return handler(receive) }
        return AnyCancellableTask {}
    }

    func runsForThread(threadID: String) async throws -> V2ThreadRuns {
        runsThreadIDs.append(threadID)
        return try await require(runsHandler, op: "runsForThread")(threadID)
    }

    func clearThread(threadID: String) async throws {
        clearedThreadIDs.append(threadID)
        return try await require(clearThreadHandler, op: "clearThread")(threadID)
    }

    func uploadFile(data: Data, mimeType: String) async throws -> String {
        uploadedFiles.append((bytes: data.count, mimeType: mimeType))
        return try await require(uploadHandler, op: "uploadFile")(data, mimeType)
    }

    func createArtifact(
        threadID: String, kind: VisualTabKind, title: String,
        storageId: String?, meta: [String: String], createdBy: String
    ) async throws -> V2CreatedArtifact {
        createdArtifacts.append((threadID: threadID, kind: kind, title: title, storageId: storageId, meta: meta, createdBy: createdBy))
        return try await require(createArtifactHandler, op: "createArtifact")(threadID, kind, title, storageId, meta, createdBy)
    }
}

/// A no-op Cancellable for fakes that never push.
private final class AnyCancellableTask: Cancellable {
    private let work: () -> Void
    init(_ work: @escaping () -> Void) { self.work = work }
    func cancel() { work() }
}
