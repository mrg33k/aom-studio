// CornerV2API.swift — Corner native iOS
// corner:corner-v2 native plan Task 3.
//
// The typed v2 client. `CornerV2API` is the protocol every v2 feature codes
// against; `DefaultCornerV2API` runs it over `ConvexService.request(_:as:)`.
// The client never sends a user id, room id, or agent id: identity rides the
// Bearer [REDACTED] `ConvexService` attaches, and `send` carries only text, parsed
// `@brain` slugs, and an optional preferred project id.

import Combine
import Foundation

enum CornerV2APIError: Error, Equatable {
    /// A test double received a call its test never configured.
    case unconfiguredFakeOperation
}

/// Client-side v2 errors that never reach the wire.
enum CornerV2Error: Error, Equatable {
    /// The confirmation expired before the tap: no write was attempted, and
    /// a failed or expired confirmation makes no write.
    case expiredConfirmation
    /// The confirmation is no longer the pending one (already confirmed or
    /// replaced): confirming again would risk a double write.
    case confirmationConsumed
}

@MainActor
protocol CornerV2API {
    func workspaceTree() async throws -> WorkspaceSummary?
    func thread(projectID: String) async throws -> Thread?
    func thread(missionID: String) async throws -> Thread?
    /// One windowed read. `limit` is the newest-N window (R40 L030: first
    /// load 200, "Earlier messages" +200); nil means the server default,
    /// which is the same 200. Polls never pass it — they keep `after`.
    func threadEvents(threadID: String, limit: Int?) async throws -> [ThreadEvent]
    /// Send one message. `mode` is the commands menu's Work/Plan intent
    /// (R19): "work" rides only when a backend field exists for it — today
    /// only "plan" is sent, and a backend that does not know the field gets
    /// the same send without it (strict envelope: an unknown-arg mutation
    /// fails validation before anything writes, so the retry never doubles).
    /// `threadId` (R24 P080) is the in-thread send the clone's `v2Native:send`
    /// accepts: set, the text lands in that thread with no routing and no
    /// `Routed to` receipt; nil is the room-less global intake send, which
    /// routes. A thread send answers open questions into the thread.
    ///
    /// R32 wiring: `model` rides when the thread picked a non-Auto model
    /// (the web's rule: Auto is the server default and is omitted);
    /// `clientEventId` is the outbox id (a retried send never appends
    /// twice); `imageTool` is the armed image tool; `replyTo` is the quoted
    /// message (the server stores it on the block payload — the text itself
    /// carries no quote line anymore). All four are omitted when unset, so
    /// an older backend keeps taking the send.
    func send(text: String, mentioning: [String], preferredProjectID: String?, mode: String?, threadId: String?, model: String?, clientEventId: String?, imageTool: String?, replyTo: V2ReplyTo?) async throws -> RouteDecision
    /// Open runs + the last done one for a thread (`v2Native:runsForThread`,
    /// R33). Drives the nav status: open run = Working, none = Ready.
    func runsForThread(threadID: String) async throws -> V2ThreadRuns
    /// "Clear this chat" (`v2Workspace:clearThread`, R27 B2): rows at or
    /// before `clearedAt` leave the surface on every device; history keeps
    /// them. The caller re-reads the thread after.
    func clearThread(threadID: String) async throws
    /// One file's bytes to Convex storage (the web's upload path):
    /// `files:generateUploadUrl`, then POST the bytes to the returned URL.
    /// Returns the storage id for `createArtifact`.
    func uploadFile(data: Data, mimeType: String) async throws -> String
    /// Register an uploaded (or to-be-generated) file on the thread
    /// (`v2Visual:createArtifact`, the web's upload path). `kind` is the
    /// CORE name (`site`/`file`, never the native `web`/`genericFile`);
    /// `createdBy` is `"user"` for phone uploads. Returns the artifact id
    /// for the tab open.
    func createArtifact(threadID: String, kind: VisualTabKind, title: String, storageId: String?, meta: [String: String], createdBy: String) async throws -> V2CreatedArtifact
    func subscribeThread(threadID: String, receive: @escaping ([ThreadEvent]) -> Void) -> any Cancellable
    func visualTabs(visualSessionID: String) async throws -> [VisualWindowTab]
    func openVisualTab(kind: VisualTabKind, threadID: String, artifactID: String?, title: String, state: [String: String]) async throws -> VisualWindowTab
    func closeVisualTab(id: String) async throws
    func submitReview(artifactID: String, pins: [ReviewPin]) async throws -> SubmitReviewResult
    func ledger(workspaceID: String, after: String?) async throws -> [LedgerItem]
    func confirmCrossProjectWrite(id: String) async throws
    // Beyond the plan's protocol: the subscribable reads are queries that
    // resolve only after `ensureWorkspace`, and proposals need confirming.
    func ensureWorkspace() async throws -> EnsureWorkspaceResult
    func confirmProposal(decisionId: String) async throws -> ConfirmProposalResult
    func artifacts(threadID: String) async throws -> [Artifact]
    func pendingConfirmations() async throws -> [CrossProjectWriteConfirmation]
    /// Live refresh of the workspace tree (polls the subscribable query).
    func subscribeWorkspace(receive: @escaping (WorkspaceSummary?) -> Void) -> any Cancellable
}

/// The 3-arg send every pre-R19 caller uses: mode unset (Work default),
/// room-less (global intake routing).
extension CornerV2API {
    func send(text: String, mentioning: [String], preferredProjectID: String?) async throws -> RouteDecision {
        try await send(
            text: text, mentioning: mentioning, preferredProjectID: preferredProjectID,
            mode: nil, threadId: nil, model: nil, clientEventId: nil, imageTool: nil, replyTo: nil
        )
    }

    /// The 4-arg send pre-R24 callers use: room-less (global intake routing).
    func send(text: String, mentioning: [String], preferredProjectID: String?, mode: String?) async throws -> RouteDecision {
        try await send(
            text: text, mentioning: mentioning, preferredProjectID: preferredProjectID,
            mode: mode, threadId: nil, model: nil, clientEventId: nil, imageTool: nil, replyTo: nil
        )
    }

    /// The 5-arg send pre-R32 callers use: no model, outbox id, image tool,
    /// or quote.
    func send(text: String, mentioning: [String], preferredProjectID: String?, mode: String?, threadId: String?) async throws -> RouteDecision {
        try await send(
            text: text, mentioning: mentioning, preferredProjectID: preferredProjectID,
            mode: mode, threadId: threadId, model: nil, clientEventId: nil, imageTool: nil, replyTo: nil
        )
    }
}

// MARK: - v2Native endpoints

/// The thread read window (R40 L030, the web's R39 window twin): the phone
/// loads the newest 200 rows, never the whole thread, and "Earlier
/// messages" grows the window 200 at a time. Polls keep `after` and never
/// pass a limit.
enum V2ReadWindow {
    static let firstPage = 200
    static let pageStep = 200
}

extension ConvexEndpoint {
    private static func v2(_ function: String, kind: ConvexEndpointKind, args: [String: Any] = [:]) -> ConvexEndpoint {
        try! ConvexEndpoint(kind: kind, path: "v2Native:\(function)", args: args)
    }

    static var v2EnsureWorkspace: ConvexEndpoint { v2("ensureWorkspace", kind: .mutation) }
    static var v2WorkspaceTree: ConvexEndpoint { v2("workspaceTree", kind: .query) }

    static func v2ThreadForProject(_ projectID: String) -> ConvexEndpoint {
        v2("threadForProject", kind: .query, args: ["projectId": projectID])
    }

    static func v2ThreadForMission(_ missionID: String) -> ConvexEndpoint {
        v2("threadForMission", kind: .query, args: ["missionId": missionID])
    }

    static func v2ThreadEvents(threadID: String, after: String? = nil, limit: Int? = nil) -> ConvexEndpoint {
        var args: [String: Any] = ["threadId": threadID]
        if let after {
            // Polls keep the cursor: the window is the server's, not ours.
            args["after"] = after
        } else {
            // First load asks for the newest window, never the whole
            // thread (R40 L030: 200; explicit windows ride as given).
            args["limit"] = limit ?? V2ReadWindow.firstPage
        }
        return v2("threadEvents", kind: .query, args: args)
    }

    static func v2Send(
        text: String, mentioning: [String], preferredProjectID: String?,
        mode: String? = nil, threadId: String? = nil,
        model: String? = nil, clientEventId: String? = nil,
        imageTool: String? = nil, replyTo: V2ReplyTo? = nil
    ) -> ConvexEndpoint {
        var args: [String: Any] = ["text": text, "mentioning": mentioning]
        if let preferredProjectID { args["preferredProjectId"] = preferredProjectID }
        if let mode, !mode.isEmpty { args["mode"] = mode }
        if let threadId, !threadId.isEmpty { args["threadId"] = threadId }
        if let model, !model.isEmpty { args["model"] = model }
        if let clientEventId, !clientEventId.isEmpty { args["clientEventId"] = clientEventId }
        if let imageTool, !imageTool.isEmpty { args["imageTool"] = imageTool }
        if let replyTo {
            args["replyTo"] = [
                "messageId": replyTo.messageId,
                "sender": replyTo.sender,
                "snippet": replyTo.snippet,
            ]
        }
        return v2("send", kind: .mutation, args: args)
    }

    static func v2RunsForThread(threadID: String) -> ConvexEndpoint {
        v2("runsForThread", kind: .query, args: ["threadId": threadID])
    }

    static func v2ClearThread(threadID: String) -> ConvexEndpoint {
        try! ConvexEndpoint(kind: .mutation, path: "v2Workspace:clearThread", args: ["threadId": threadID])
    }

    static var v2GenerateUploadUrl: ConvexEndpoint {
        try! ConvexEndpoint(kind: .mutation, path: "files:generateUploadUrl")
    }

    /// `kind` is the CORE name (`site`/`file`) — the caller maps from the
    /// native tab kind first (the backend validates the literal union).
    static func v2CreateArtifact(
        threadID: String, coreKind: String, title: String,
        storageId: String?, meta: [String: String], createdBy: String
    ) -> ConvexEndpoint {
        var args: [String: Any] = [
            "threadId": threadID, "kind": coreKind, "title": title,
            "meta": meta, "createdBy": createdBy,
        ]
        if let storageId, !storageId.isEmpty { args["storageId"] = storageId }
        return try! ConvexEndpoint(kind: .mutation, path: "v2Visual:createArtifact", args: args)
    }

    static func v2ConfirmProposal(decisionID: String) -> ConvexEndpoint {
        v2("confirmProposal", kind: .mutation, args: ["decisionId": decisionID])
    }

    static func v2VisualTabs(visualSessionID: String) -> ConvexEndpoint {
        v2("visualTabs", kind: .query, args: ["visualSessionId": visualSessionID])
    }

    static func v2OpenVisualTab(kind: VisualTabKind, threadID: String, artifactID: String?, title: String, state: [String: String]) -> ConvexEndpoint {
        var args: [String: Any] = ["kind": kind.rawValue, "threadId": threadID, "title": title, "state": state]
        if let artifactID { args["artifactId"] = artifactID }
        return v2("openVisualTab", kind: .mutation, args: args)
    }

    static func v2CloseVisualTab(id: String) -> ConvexEndpoint {
        v2("closeVisualTab", kind: .mutation, args: ["id": id])
    }

    static func v2Artifacts(threadID: String) -> ConvexEndpoint {
        v2("artifacts", kind: .query, args: ["threadId": threadID])
    }

    static func v2SubmitReview(artifactID: String, pins: [ReviewPin]) -> ConvexEndpoint {
        let encoder = JSONEncoder()
        let pinDicts: [[String: Any]] = pins.map { pin in
            let data = (try? encoder.encode(pin)) ?? Data()
            return (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        }
        return v2("submitReview", kind: .mutation, args: ["artifactId": artifactID, "pins": pinDicts])
    }

    static func v2Ledger(workspaceID: String, after: String? = nil) -> ConvexEndpoint {
        var args: [String: Any] = ["workspaceId": workspaceID]
        if let after { args["after"] = after }
        return v2("ledger", kind: .query, args: args)
    }

    static var v2PendingConfirmations: ConvexEndpoint {
        v2("pendingConfirmations", kind: .query)
    }

    static func v2ConfirmCrossProjectWrite(id: String) -> ConvexEndpoint {
        v2("confirmCrossProjectWrite", kind: .mutation, args: ["id": id])
    }
}

/// Mutations that return a small object the client never reads. Decodes (and
/// ignores) any object envelope value.
private struct ConvexVoid: Decodable {}

// MARK: - Default implementation

/// The production `CornerV2API`, over the authenticated Convex transport.
/// `subscribeThread` is a polling loop on `threadEvents(after:)` every 2 s
/// while the thread is active: `ConvexService` has a generic poller but no
/// WebSocket subscribe, and the `after` cursor keeps each tick incremental.
/// Only one thread poll runs at a time; a new subscription stops the old one.
@MainActor
final class DefaultCornerV2API: CornerV2API {
    private let service: ConvexService
    private var activeThreadPoll: Task<Void, Never>?
    private var activeWorkspacePoll: (any Cancellable)?

    init(service: ConvexService = .shared) {
        self.service = service
    }

    func workspaceTree() async throws -> WorkspaceSummary? {
        try await service.requestOptional(.v2WorkspaceTree, as: WorkspaceSummary.self)
    }

    func thread(projectID: String) async throws -> Thread? {
        try await service.requestOptional(.v2ThreadForProject(projectID), as: Thread.self)
    }

    func thread(missionID: String) async throws -> Thread? {
        try await service.requestOptional(.v2ThreadForMission(missionID), as: Thread.self)
    }

    func threadEvents(threadID: String, limit: Int? = nil) async throws -> [ThreadEvent] {
        try await service.request(.v2ThreadEvents(threadID: threadID, limit: limit), as: [ThreadEvent].self)
    }

    func send(
        text: String, mentioning: [String], preferredProjectID: String?,
        mode: String?, threadId: String?,
        model: String?, clientEventId: String?,
        imageTool: String?, replyTo: V2ReplyTo?
    ) async throws -> RouteDecision {
        // Extended fields ride only when set: Work/Auto are the server
        // defaults, so default sends never carry them (and never pay the
        // fallback). A backend without the fields rejects the full send at
        // arg validation — before anything writes — and the same send goes
        // out field-less, so new prefs degrade to a normal send instead of
        // failing. Both failures park in the outbox as usual. The fallback
        // keeps `threadId`: an in-thread send must never degrade into a
        // global-routed one (R24 P079/P080).
        //
        // Work is normalized to absent here (not just in the model), so no
        // caller can regress the rule by passing the default explicitly.
        let wireMode = (mode == "plan") ? "plan" : nil
        let full = ConvexEndpoint.v2Send(
            text: text, mentioning: mentioning, preferredProjectID: preferredProjectID,
            mode: wireMode, threadId: threadId,
            model: model, clientEventId: clientEventId,
            imageTool: imageTool, replyTo: replyTo
        )
        let wantsExtended = full.args.keys.contains { $0 != "text" && $0 != "mentioning" && $0 != "threadId" }
        if wantsExtended {
            do {
                return try await service.request(full, as: RouteDecision.self)
            } catch is ConvexServiceError {
                // Fall through to the field-less send below.
            }
        }
        return try await service.request(
            .v2Send(text: text, mentioning: mentioning, preferredProjectID: preferredProjectID, threadId: threadId),
            as: RouteDecision.self
        )
    }

    func runsForThread(threadID: String) async throws -> V2ThreadRuns {
        try await service.request(.v2RunsForThread(threadID: threadID), as: V2ThreadRuns.self)
    }

    func clearThread(threadID: String) async throws {
        let _: V2ClearThreadResult = try await service.request(.v2ClearThread(threadID: threadID), as: V2ClearThreadResult.self)
    }

    /// The web's upload path: mint a one-shot URL, POST the bytes with the
    /// file's own Content-Type, read back `{storageId}`.
    func uploadFile(data: Data, mimeType: String) async throws -> String {
        let uploadURLString: String = try await service.request(.v2GenerateUploadUrl, as: String.self)
        guard let uploadURL = URL(string: uploadURLString) else {
            throw ConvexServiceError.server("The upload URL was unusable.")
        }
        let body = try await service.postBytes(to: uploadURL, data: data, mimeType: mimeType)
        struct UploadReceipt: Decodable { let storageId: String }
        guard let receipt = try? JSONDecoder().decode(UploadReceipt.self, from: body) else {
            throw ConvexServiceError.server("The upload did not answer with a storage id.")
        }
        return receipt.storageId
    }

    func createArtifact(
        threadID: String, kind: VisualTabKind, title: String,
        storageId: String?, meta: [String: String], createdBy: String
    ) async throws -> V2CreatedArtifact {
        try await service.request(
            .v2CreateArtifact(
                threadID: threadID, coreKind: V2ArtifactKind.coreName(for: kind),
                title: title, storageId: storageId, meta: meta, createdBy: createdBy
            ),
            as: V2CreatedArtifact.self
        )
    }

    func subscribeThread(threadID: String, receive: @escaping ([ThreadEvent]) -> Void) -> any Cancellable {
        activeThreadPoll?.cancel()
        let service = service
        let formatter = ISO8601DateFormatter.cornerFractional
        let task = Task<Void, Never> {
            var after: String?
            var known: [String: ThreadEvent] = [:]
            while !Task.isCancelled {
                do {
                    let fresh: [ThreadEvent] = try await service.request(
                        .v2ThreadEvents(threadID: threadID, after: after),
                        as: [ThreadEvent].self
                    )
                    if Task.isCancelled { break }
                    for event in fresh { known[event.id] = event }
                    if !fresh.isEmpty {
                        after = known.values.map(\.createdAt).max().map { formatter.string(from: $0) }
                    }
                    let ordered = known.values.sorted {
                        $0.createdAt != $1.createdAt ? $0.createdAt < $1.createdAt : $0.id < $1.id
                    }
                    receive(ordered)
                } catch {
                    if Task.isCancelled { break }
                    // A failed tick is silence, not a teardown: the next tick
                    // retries with the same cursor. Task 5 surfaces staleness.
                }
                try? await Task.sleep(nanoseconds: 2_000_000_000)
            }
        }
        activeThreadPoll = task
        return task
    }

    func visualTabs(visualSessionID: String) async throws -> [VisualWindowTab] {
        try await service.request(.v2VisualTabs(visualSessionID: visualSessionID), as: [VisualWindowTab].self)
    }

    func openVisualTab(kind: VisualTabKind, threadID: String, artifactID: String?, title: String, state: [String: String]) async throws -> VisualWindowTab {
        try await service.request(
            .v2OpenVisualTab(kind: kind, threadID: threadID, artifactID: artifactID, title: title, state: state),
            as: VisualWindowTab.self
        )
    }

    func closeVisualTab(id: String) async throws {
        let _: ConvexVoid = try await service.request(.v2CloseVisualTab(id: id), as: ConvexVoid.self)
    }

    func submitReview(artifactID: String, pins: [ReviewPin]) async throws -> SubmitReviewResult {
        try await service.request(.v2SubmitReview(artifactID: artifactID, pins: pins), as: SubmitReviewResult.self)
    }

    func ledger(workspaceID: String, after: String?) async throws -> [LedgerItem] {
        try await service.request(.v2Ledger(workspaceID: workspaceID, after: after), as: [LedgerItem].self)
    }

    func confirmCrossProjectWrite(id: String) async throws {
        let _: ConvexVoid = try await service.request(.v2ConfirmCrossProjectWrite(id: id), as: ConvexVoid.self)
    }

    func ensureWorkspace() async throws -> EnsureWorkspaceResult {
        try await service.request(.v2EnsureWorkspace, as: EnsureWorkspaceResult.self)
    }

    func confirmProposal(decisionId: String) async throws -> ConfirmProposalResult {
        try await service.request(.v2ConfirmProposal(decisionID: decisionId), as: ConfirmProposalResult.self)
    }

    func artifacts(threadID: String) async throws -> [Artifact] {
        try await service.request(.v2Artifacts(threadID: threadID), as: [Artifact].self)
    }

    func pendingConfirmations() async throws -> [CrossProjectWriteConfirmation] {
        try await service.request(.v2PendingConfirmations, as: [CrossProjectWriteConfirmation].self)
    }

    func subscribeWorkspace(receive: @escaping (WorkspaceSummary?) -> Void) -> any Cancellable {
        activeWorkspacePoll?.cancel()
        // A null tree (never ensured) is a failed tick here, not a teardown:
        // refresh() ensures before subscribing, so ticks resolve.
        let poll = service.subscribe(.v2WorkspaceTree, as: WorkspaceSummary.self, interval: 10.0) { result in
            if case .success(let workspace) = result { receive(workspace) }
        }
        activeWorkspacePoll = poll
        return poll
    }
}
