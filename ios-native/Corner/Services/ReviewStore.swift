// ReviewStore.swift — Corner native iOS
// corner:native-ios Stage 2
//
// The review queue and the three verdicts, over the real endpoints.
//
// ONE STORE FOR THE WHOLE APP, because the waiting set is not just a screen — it is the
// amber mark on a file card inside a room, and the count on the rooms rail. Two copies
// of "what is waiting" drift within one refresh cycle and then the badge and the list
// disagree in front of the user.
//
// OPTIMISM HAS A FLOOR HERE. A decided item leaves the list the moment the server says
// 2xx, never before — and a FAILED request-changes puts nothing anywhere, because
// review-decision.js 500s when it cannot queue the agent's task, specifically so a
// client cannot report "sent" over feedback that reached no one. The web's own comment
// on that branch is "the UI must see the failure".
//
// AND APPROVE IS FINAL. The endpoint's undo action accepts dismiss rows ONLY. There is
// no rollback to offer, so the UI does not pretend there is one.

import Foundation

@MainActor
final class ReviewStore: ObservableObject {

    static let shared = ReviewStore()

    enum LoadState: Equatable {
        case idle
        case loading
        case ready
        case error(String)
    }

    @Published private(set) var items: [ReviewItem] = []
    @Published private(set) var state: LoadState = .idle
    @Published private(set) var total: Int = 0
    /// Set after a verdict. Carries what actually happened, including the task id the
    /// server minted for request-changes — the receipt that the note became real work.
    @Published var notice: Notice?
    /// Ids currently in flight, so a double-tap cannot post two verdicts.
    @Published private(set) var deciding: Set<String> = []

    struct Notice: Identifiable, Equatable {
        let id = UUID()
        /// The full sentence, for a surface that shows nothing else — the queue's
        /// notice bar has no heading above it and has to stand alone.
        let text: String
        /// Just the cause, for a surface that already frames it. The decision sheet's
        /// card is titled "Nothing was recorded", and pasting the full sentence under
        /// that heading printed the same fact twice in four lines.
        let reason: String?
        let isFailure: Bool

        init(text: String, reason: String? = nil, isFailure: Bool) {
            self.text = text
            self.reason = reason
            self.isFailure = isFailure
        }
    }

    private let api: CornerAPI
    private var refresher: Task<Void, Never>?

    /// The default is resolved INSIDE the initializer, not as a default argument: a
    /// default argument is evaluated at the call site, which is not always on the main
    /// actor, and `CornerAPI.shared` is main-actor isolated.
    init(api: CornerAPI? = nil) {
        self.api = api ?? .shared
    }

    /// Every waiting deliverable's identity, for the marks inside rooms. Both the id and
    /// the bare filename, matching what the web's badge layer keys on.
    var waitingIDs: Set<String> {
        var out = Set<String>()
        for item in items {
            if !item.path.isEmpty { out.insert(item.path) }
            if !item.name.isEmpty { out.insert(item.name) }
            if !item.sourcePath.isEmpty { out.insert(item.sourcePath) }
        }
        return out
    }

    var waitingCount: Int { items.count }

    // MARK: - Loading

    func startPolling() {
        guard refresher == nil else { return }
        refresher = Task { [weak self] in
            while !Task.isCancelled {
                await self?.load()
                // 60s, matching the web's badge refresh. The queue is not a live feed;
                // it changes when an agent finishes something.
                try? await Task.sleep(nanoseconds: 60_000_000_000)
            }
        }
    }

    func stopPolling() {
        refresher?.cancel()
        refresher = nil
    }

    func load() async {
        if items.isEmpty { state = .loading }
        do {
            let envelope = try await api.fetchReviewQueue(limit: 100)
            items = envelope.items ?? []
            total = envelope.total ?? items.count
            state = .ready
        } catch {
            let message = (error as? LocalizedError)?.errorDescription ?? "The review queue could not be loaded."
            // Same rule as the room files: a failed refresh does not blank a good list.
            state = items.isEmpty ? .error(message) : .ready
        }
    }

    // MARK: - Verdicts

    /// Post a decision. Returns true only when the server recorded it.
    ///
    /// `notes` is required by nothing server-side, but request-changes without notes
    /// produces a task whose brief reads "(no written notes)" — so the UI asks for them
    /// and this layer passes exactly what it was given, never a manufactured summary.
    @discardableResult
    func decide(
        _ item: ReviewItem,
        action: ReviewAction,
        notes: String? = nil
    ) async -> Bool {
        guard !deciding.contains(item.id) else { return false }
        deciding.insert(item.id)
        defer { deciding.remove(item.id) }

        do {
            let result = try await api.postReviewDecision(
                deliverable: item.path,
                action: action,
                notes: notes,
                title: item.name,
                project: item.project,
                mission: item.mission,
                sourcePath: item.sourcePath,
                sha256: item.sha256
            )
            items.removeAll { $0.id == item.id }
            notice = Notice(text: successText(for: action, item: item, result: result), isFailure: false)
            Task { await load() }
            return true
        } catch {
            let reason = (error as? LocalizedError)?.errorDescription ?? "The server refused it."
            // Named precisely: nothing was recorded. The item stays exactly where it was.
            notice = Notice(
                text: "\(action.label) did not go through — \(reason.prefix(1).lowercased())\(reason.dropFirst()) Nothing was recorded.",
                reason: reason,
                isFailure: true
            )
            return false
        }
    }

    /// Decide on a file that is not (or no longer) in the queue — a crossing tapped
    /// inside a room, or a notification action. The identity fields come from the
    /// attachment itself, which is why Attachment carries sha256 and source_path.
    @discardableResult
    func decide(
        attachment: Attachment,
        action: ReviewAction,
        notes: String? = nil,
        project: String? = nil,
        mission: String? = nil
    ) async -> Bool {
        let item = ReviewItem(
            path: attachment.url,
            name: attachment.name,
            project: project ?? "",
            mission: mission ?? "",
            mime: attachment.mime,
            size: attachment.size,
            sourceKind: "handoff",
            sourcePath: attachment.sourcePath,
            sha256: attachment.sha256,
            lastModified: "",
            verdict: nil
        )
        return await decide(item, action: action, notes: notes)
    }

    private func successText(for action: ReviewAction, item: ReviewItem, result: ReviewDecisionResult) -> String {
        switch action {
        case .approve:
            return "Approved \(item.name)."
        case .requestChanges:
            if let task = result.taskID, !task.isEmpty {
                // The web shows the first 8 characters; the point is that a real row
                // exists, not that the user memorises a uuid.
                return "Changes requested — tracked as task \(task.prefix(8)). The agent picks it up from the queue."
            }
            // 2xx with no task id should be impossible (the endpoint 500s when the
            // insert fails), so say what is true rather than inventing a receipt.
            return "Changes requested on \(item.name). The server did not name a task for it."
        case .dismiss:
            return "\(item.name) removed from review."
        }
    }
}
