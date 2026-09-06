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

    /// How many rows one fetch asks for. Named, because the whole defect this constant
    /// exists to prevent is a page size wearing the costume of a backlog: `items.count`
    /// pinned at exactly 100 forever, motionless while the user clears the queue.
    nonisolated static let pageLimit = 100

    /// True when the server told us how many are really waiting. False means the only
    /// number we hold is "however many fit in one page", which is not a count.
    @Published private(set) var totalIsFromServer = false

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

    /// How many files are waiting — the SERVER's number, not the page size.
    ///
    /// `items.count` is what one fetch returned, capped at `pageLimit`. Reading the badge
    /// off it made a backlog of 247 render as "100" and then sit still while the user
    /// worked, which is how a queue badge teaches people to stop believing it.
    var waitingCount: Int { Self.count(total: total, loaded: items.count) }

    /// True when the number cannot be trusted as exact: the server sent no total AND the
    /// page came back full, so the real backlog is at least this and possibly much more.
    var waitingCountIsApproximate: Bool {
        Self.isApproximate(loaded: items.count, totalIsFromServer: totalIsFromServer)
    }

    /// The number as it should be printed. A precise-looking round number we cannot
    /// stand behind is worse than an honest "99+".
    var waitingCountLabel: String {
        Self.label(total: total, loaded: items.count, totalIsFromServer: totalIsFromServer)
    }

    /// The full sentence both the Files headline card and the review header print, so
    /// the two screens are physically incapable of naming different numbers.
    var waitingSentence: String {
        Self.sentence(total: total, loaded: items.count, totalIsFromServer: totalIsFromServer)
    }

    // MARK: - The count, as pure functions
    //
    // Free of the store's state so the exact regression this guards — a page size
    // wearing the costume of a backlog — is a unit test and not a screenshot.

    nonisolated static func count(total: Int, loaded: Int) -> Int { max(total, loaded) }

    nonisolated static func isApproximate(loaded: Int, totalIsFromServer: Bool) -> Bool {
        !totalIsFromServer && loaded >= pageLimit
    }

    nonisolated static func label(total: Int, loaded: Int, totalIsFromServer: Bool) -> String {
        isApproximate(loaded: loaded, totalIsFromServer: totalIsFromServer)
            ? "99+"
            : "\(count(total: total, loaded: loaded))"
    }

    nonisolated static func sentence(total: Int, loaded: Int, totalIsFromServer: Bool) -> String {
        if isApproximate(loaded: loaded, totalIsFromServer: totalIsFromServer) {
            return "99+ files need your review"
        }
        let n = count(total: total, loaded: loaded)
        return n == 1 ? "1 file needs your review" : "\(n) files need your review"
    }

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
            let envelope = try await api.fetchReviewQueue(limit: Self.pageLimit)
            items = envelope.items ?? []
            // The server's own count is the only honest one. Remember WHETHER it sent
            // one, so a full page with no total renders "99+" instead of a confident
            // "100" that is really just the limit looking back at us.
            totalIsFromServer = envelope.total != nil
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

// MARK: - Corner v2 checklist review (native Task 8)
//
// Checklist-only, per artifact: point anchors for PDF/image/web, time
// anchors for video, line anchors for code. Max 4 pins per artifact (HANDOFF
// §6) — the fifth is refused with a `limitHit` toast signal, never silently
// kept. Blank notes never send. The agent's checklist completion arrives as
// `ThreadBlock.checklist`; there is deliberately no approval button anywhere
// in this loop.
//
// This is a NEW type appended to this file per the plan's file list. The
// legacy review-queue `ReviewStore` above keeps its contract and its tests.

/// A draft pin before submit: `id` is empty until the server answers.
/// Identity client-side is `clientID`.
@MainActor
final class V2ReviewStore: ObservableObject {
    /// HANDOFF §6: max 4 pins per artifact.
    static let maxPins = 4

    /// The current artifact's pins, in anchor order.
    @Published private(set) var pins: [ReviewPin] = []
    /// The selected pin's clientID (server ids arrive only after submit).
    @Published var selectedPinID: String?
    /// Review mode: checklist + Send show only while on (HANDOFF §4).
    @Published var reviewing = false
    /// Set when a pin past the cap is refused; the view toasts and clears.
    @Published private(set) var limitHit = false
    /// A submit is in flight; Send stands down so one tap is one checklist.
    @Published private(set) var submitting = false

    private(set) var artifactID: String?
    /// Pins parked per artifact while another tab is selected.
    private var stash: [String: [ReviewPin]] = [:]

    private let api: any CornerV2API

    init(api: any CornerV2API) {
        self.api = api
    }

    /// Pins with text — the only ones that send.
    var sendablePins: [ReviewPin] {
        pins.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    var sendTitle: String {
        let count = sendablePins.count
        return count == 0 ? "Send" : "Send \(count) change\(count == 1 ? "" : "s")"
    }

    var canSend: Bool { !sendablePins.isEmpty && !submitting }

    /// Switch the artifact under review: park the current pins, restore the
    /// target's. Same-artifact calls only reselect.
    func context(artifactID newID: String?) {
        let current = artifactID
        if let current, current != newID { stash[current] = pins }
        artifactID = newID
        if let newID, newID != current { pins = stash[newID] ?? [] }
        if let selected = selectedPinID,
           !pins.contains(where: { $0.clientID == selected }) {
            selectedPinID = nil
        }
    }

    /// Add a pin to the current artifact. Returns false at the cap (and
    /// raises `limitHit` for the toast); the pin is not added.
    @discardableResult
    func addPin(_ anchor: PinAnchor, text: String) -> Bool {
        guard pins.count < Self.maxPins else {
            limitHit = true
            return false
        }
        let pin = ReviewPin(
            id: "", artifactID: artifactID, anchor: anchor,
            text: text, isDone: false, clientID: UUID().uuidString
        )
        pins.append(pin)
        selectedPinID = pin.clientID
        reviewing = true
        return true
    }

    func removePin(id: String) {
        pins.removeAll { $0.id == id || $0.clientID == id }
        if selectedPinID == id { selectedPinID = nil }
    }

    func updateText(id: String, text: String) {
        guard let index = pins.firstIndex(where: { $0.id == id || $0.clientID == id }) else { return }
        pins[index].text = text
    }

    func clearLimitHit() { limitHit = false }

    /// Submit the current artifact's non-empty pins as one checklist. Maps
    /// the echoed client ids to server ids on the kept pins (the panel
    /// resets after). A blank-only outbox makes no network call.
    @discardableResult
    func submit(artifactID: String) async throws -> SubmitReviewResult {
        self.artifactID = artifactID
        let sendable = sendablePins
        guard !sendable.isEmpty else {
            return SubmitReviewResult(checklistId: "", pins: [])
        }
        submitting = true
        defer { submitting = false }
        let outgoing = sendable.map { pin -> ReviewPin in
            var copy = pin
            copy.artifactID = artifactID
            return copy
        }
        let result = try await api.submitReview(artifactID: artifactID, pins: outgoing)
        for item in result.pins {
            guard let client = item.clientID,
                  let index = pins.firstIndex(where: { $0.clientID == client }) else { continue }
            pins[index].id = item.id
        }
        return result
    }

    /// After a sent checklist: pins reset, review mode off (HANDOFF §6).
    func reset() {
        if let current = artifactID { stash[current] = [] }
        pins = []
        selectedPinID = nil
        reviewing = false
    }
}
