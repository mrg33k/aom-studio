// ChatViewModel.swift — Corner native iOS
// corner:native-ios Stage 1
//
// One room's thread, and the three things this app exists to get right.
//
// 1. A FAILED SEND MUST STAY ON SCREEN AND BE RETRYABLE.
//    The web drops the optimistic echo when the POST fails (useRoomThread.send:
//    `setPending(p => p.filter(...))`) — the message the user typed vanishes and the
//    room looks like they never sent anything. Here a failed send stays in the thread,
//    marked "Not sent", with Retry and Discard. Nothing the user typed is ever thrown
//    away by the app on their behalf.
//
// 2. A DEAD TURN MUST LOOK DEAD.
//    "Working…" is driven by the agent's REAL step heartbeats, and it stops on the
//    bridge's `settled` sentinel — the agent's own end-of-turn signal, not a guess.
//    When a turn goes completely silent past the backstop, the spinner does not just
//    quietly disappear (which reads as "finished"): the row turns into "No reply —
//    this turn stopped" with a Send again action. Silence gets a name.
//
// 3. COMING BACK FROM THE BACKGROUND MUST NOT LOSE ANYTHING.
//    iOS suspends the app and the realtime socket dies with it. On foreground the
//    subscription is rebuilt and the thread is delta-fetched: if the newest row this
//    app knows about is not in the standard window, the window is widened before
//    concluding anything, so a long absence produces a gap-free thread instead of a
//    thread that silently starts in the middle.
//
// The reconcile poll underneath all of it (10s, the web's cadence) is what makes a
// dropped socket invisible. Realtime is the accelerator; the poll is the guarantee.

import Foundation
import SwiftUI

// MARK: - Outbox

struct OutboxItem: Identifiable, Equatable {
    enum State: Equatable {
        case sending
        case failed(String)
    }

    let id: String
    let text: String
    var state: State
    let createdAt: Date

    var isFailed: Bool {
        if case .failed = state { return true }
        return false
    }

    var failureMessage: String? {
        if case .failed(let m) = state { return m }
        return nil
    }
}

// MARK: - Turn state

enum TurnState: Equatable {
    /// Nothing in flight.
    case idle
    /// The agent is on it. `detail` is the latest real step, when the bridge is
    /// emitting them; nil means "sent, no heartbeat yet".
    case working(detail: String?)
    /// Sent, then total silence past the backstop: no step, no reply. This is a turn
    /// that stopped, and it says so.
    case stalled(sentText: String?)
}

// MARK: - Thread item

enum ThreadItem: Identifiable, Equatable {
    case message(MessageRow)
    case outbox(OutboxItem)

    var id: String {
        switch self {
        case .message(let row): return row.id
        case .outbox(let item): return item.id
        }
    }
}

// MARK: - View model

@MainActor
final class ChatViewModel: ObservableObject {

    enum LoadState: Equatable { case loading, ready, empty, error(String) }

    let room: Room

    @Published private(set) var rows: [MessageRow] = []
    @Published private(set) var outbox: [OutboxItem] = []
    @Published private(set) var turn: TurnState = .idle
    @Published private(set) var loadState: LoadState = .loading
    /// "4 new messages while you were away" — set by the foreground catch-up so a
    /// long absence is acknowledged instead of silently scrolling.
    @Published var catchUpNotice: String?
    @Published var draft = ""

    private let api: MessageTransport
    /// Timings are injected rather than read from Config at the point of use, so the
    /// three-minute backstop can be exercised in a test in milliseconds. A timeout that
    /// has never been observed firing is a timeout nobody knows the behavior of.
    private let backstop: TimeInterval
    private let stepInterval: TimeInterval
    private let reconcileInterval: TimeInterval
    private let onFirstReply: @MainActor () async -> Void

    private var subscription: RoomSubscribing?
    private var pollTask: Task<Void, Never>?
    private var stepTask: Task<Void, Never>?

    // Turn tracking — every field here answers a question with a server fact.
    /// Server id of the user row we are awaiting a reply to. The bridge keys its step
    /// heartbeats to exactly this id, which is what makes the indicator honest rather
    /// than a timer.
    private var awaitingParentID: String?
    private var awaitingUserEpoch: TimeInterval = 0
    private var awaitingSentText: String?
    /// Last moment anything happened on this turn: a new step, or a reply.
    private var lastTurnActivity = Date()
    /// Once the bridge emits a real step it OWNS the stop signal via its `settled`
    /// sentinel. Agents flush in-progress thoughts as interim reply rows mid-turn;
    /// settling on one of those is the exact "bar stops while it is still working"
    /// bug the web fixed on 2026-06-27.
    private var sawLiveSteps = false
    private var renderableStepCount = -1
    private var didBaseline = false
    /// Newest row id this view model has ever held — the anchor the delta fetch uses
    /// to decide whether it is looking at a continuous thread or a gap.
    private var newestKnownID: String?

    private var hasNotifiedFirstReply = false

    init(
        room: Room,
        // Resolved INSIDE the initializer rather than as `= CornerAPI.shared`: a default
        // argument is evaluated at the call site, which is not always the main actor,
        // and the shared instance is main-actor isolated.
        transport: MessageTransport? = nil,
        backstop: TimeInterval = Config.deadTurnBackstop,
        stepInterval: TimeInterval = Config.stepPollInterval,
        reconcileInterval: TimeInterval = Config.reconcileInterval,
        onFirstReply: @escaping @MainActor () async -> Void = {
            await PushService.shared.requestAuthorizationAfterFirstReply()
        }
    ) {
        self.room = room
        self.api = transport ?? CornerAPI.shared
        self.backstop = backstop
        self.stepInterval = stepInterval
        self.reconcileInterval = reconcileInterval
        self.onFirstReply = onFirstReply
    }

    var thread: [ThreadItem] {
        rows.map(ThreadItem.message) + outbox.map(ThreadItem.outbox)
    }

    var isAwaiting: Bool {
        if case .working = turn { return true }
        return false
    }

    // MARK: - Lifecycle

    func start() {
        subscribe()
        startReconcilePoll()
        Task { await load() }
    }

    func stop() {
        pollTask?.cancel(); pollTask = nil
        stepTask?.cancel(); stepTask = nil
        subscription?.stop(); subscription = nil
    }

    /// Returning to the foreground. The socket is dead — a suspended app's socket
    /// always is — so rebuild it and reconcile with a gap check before trusting
    /// anything on screen.
    func handleForeground() {
        subscription?.stop()
        subscription = nil
        subscribe()
        startReconcilePoll()
        Task { await catchUp() }
    }

    private func subscribe() {
        subscription = api.subscribeToRoom(room) { [weak self] in
            Task { @MainActor [weak self] in await self?.load() }
        }
    }

    private func startReconcilePoll() {
        pollTask?.cancel()
        // The interval is read out BEFORE the task so the closure does not capture
        // self strongly through a property access and quietly undo the [weak self].
        let interval = reconcileInterval
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(interval))
                if Task.isCancelled { return }
                await self?.load()
            }
        }
    }

    // MARK: - Loading

    func load() async {
        do {
            let fetched = try await api.fetchMessages(room: room, limit: 100)
            apply(fetched)
            loadState = thread.isEmpty ? .empty : .ready
        } catch {
            // A failed reconcile under a thread that is already rendering must NOT
            // blank the room — the user loses their place for a transient error. Only
            // a failure with nothing on screen is worth showing as a failure.
            if rows.isEmpty && outbox.isEmpty {
                loadState = .error((error as? CornerAPI.APIError)?.errorDescription
                    ?? "This room could not be loaded.")
            }
        }
    }

    /// Delta-fetch catch-up. The history endpoint has no `since` parameter, so the gap
    /// check is done by anchor: if the newest row this app already held is missing from
    /// the standard window, more than a window's worth arrived while we were away and
    /// the window is widened before anything is concluded. Without this check a long
    /// absence produces a thread that silently begins in the middle.
    func catchUp() async {
        let anchor = newestKnownID
        let hadRows = !rows.isEmpty
        do {
            var fetched = try await api.fetchMessages(room: room, limit: 100)
            if hadRows, let anchor, !fetched.contains(where: { $0.id == anchor }) {
                fetched = try await api.fetchMessages(room: room, limit: 400)
            }
            let previousIDs = Set(rows.map(\.id))
            let arrived = fetched.filter { !previousIDs.contains($0.id) && !$0.isUser }.count
            apply(fetched)
            loadState = thread.isEmpty ? .empty : .ready
            if hadRows && arrived > 0 {
                catchUpNotice = arrived == 1
                    ? "1 new message while you were away"
                    : "\(arrived) new messages while you were away"
            }
        } catch {
            if rows.isEmpty && outbox.isEmpty {
                loadState = .error((error as? CornerAPI.APIError)?.errorDescription
                    ?? "This room could not be loaded.")
            }
        }
    }

    private func apply(_ fetched: [MessageRow]) {
        // Reconcile the outbox: an item whose text now exists as a real user row has
        // landed. Only `sending` items reconcile — a FAILED item must survive a reload,
        // because the whole point is that the user still has what they typed.
        let realUserTexts = Set(fetched.filter(\.isUser).compactMap(\.text))
        outbox.removeAll { !$0.isFailed && realUserTexts.contains($0.text) }

        rows = fetched
        newestKnownID = fetched.last?.id
        updateTurn(with: fetched)
    }

    // MARK: - Turn state, anchored to server facts

    private func updateTurn(with fetched: [MessageRow]) {
        let newestUser = fetched.last(where: \.isUser)
        let newestReply = fetched.last(where: { !$0.isUser })

        if !didBaseline {
            didBaseline = true
            // Opening a room mid-turn should read as busy whether you sent the message
            // or just walked in. Newest row is a user's, nothing answered it, and it is
            // recent → the agent is on it right now.
            if let newestUser,
               (newestReply?.epoch ?? 0) < newestUser.epoch,
               Date().timeIntervalSince1970 - newestUser.epoch < backstop {
                beginTurn(parentID: newestUser.id, userEpoch: newestUser.epoch, text: newestUser.text)
            } else {
                awaitingUserEpoch = newestUser?.epoch ?? 0
            }
            return
        }

        if let newestUser, newestUser.epoch > awaitingUserEpoch {
            // A user row newer than anything tracked — sent from here, or from the web,
            // or from another device. Either way the agent is now on it.
            beginTurn(parentID: newestUser.id, userEpoch: newestUser.epoch, text: newestUser.text)
            return
        }

        guard case .working = turn else { return }
        guard !sawLiveSteps else { return }
        if let newestReply, awaitingUserEpoch > 0, newestReply.epoch >= awaitingUserEpoch {
            settleTurn()
        }
    }

    private func beginTurn(parentID: String, userEpoch: TimeInterval, text: String?) {
        awaitingParentID = parentID
        awaitingUserEpoch = userEpoch
        awaitingSentText = text
        sawLiveSteps = false
        renderableStepCount = -1
        lastTurnActivity = Date()
        turn = .working(detail: nil)
        startStepPoll()
    }

    private func settleTurn() {
        turn = .idle
        awaitingParentID = nil
        awaitingSentText = nil
        sawLiveSteps = false
        stepTask?.cancel()
        stepTask = nil
        Task { await maybeAskForPushPermission() }
    }

    /// Live steps: the only source that can say "still working" or "stopped" without
    /// guessing. Runs only while a turn is open.
    private func startStepPoll() {
        stepTask?.cancel()
        let interval = stepInterval
        stepTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.pollSteps()
                try? await Task.sleep(for: .seconds(interval))
            }
        }
    }

    private func pollSteps() async {
        guard case .working = turn else { return }
        guard let parent = awaitingParentID else { return }

        let steps = (try? await api.fetchSteps(room: room, limit: 40)) ?? []
        let mine = steps.filter { $0.parentMessageID == parent }

        // The bridge's `settled` sentinel IS "the agent stopped working". Stopping on
        // it is knowing; stopping on a countdown is guessing.
        if mine.contains(where: \.isSettledSentinel) {
            settleTurn()
            return
        }

        let renderable = mine.filter(\.isRenderable)
        if renderable.count > 0 { sawLiveSteps = true }
        if renderable.count != renderableStepCount {
            renderableStepCount = renderable.count
            lastTurnActivity = Date()
        }
        let latest = renderable
            .sorted { ($0.stepIndex ?? 0) < ($1.stepIndex ?? 0) }
            .last?.text

        // Nothing at all for the backstop window. Not "probably done" — stopped, and
        // the user is told so with a way out.
        if Date().timeIntervalSince(lastTurnActivity) > backstop {
            turn = .stalled(sentText: awaitingSentText)
            stepTask?.cancel()
            stepTask = nil
            return
        }

        if case .working(let existing) = turn, existing != latest {
            turn = .working(detail: latest)
        }
    }

    /// Ask for notifications the first time an agent actually answers — the one moment
    /// the value of a Corner notification is obvious. iOS grants exactly one prompt.
    private func maybeAskForPushPermission() async {
        guard !hasNotifiedFirstReply else { return }
        hasNotifiedFirstReply = true
        await onFirstReply()
    }

    // MARK: - Sending

    func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        draft = ""
        enqueue(text: text)
    }

    func retry(_ item: OutboxItem) {
        guard let index = outbox.firstIndex(where: { $0.id == item.id }) else { return }
        outbox[index].state = .sending
        deliver(outbox[index])
    }

    func discard(_ item: OutboxItem) {
        outbox.removeAll { $0.id == item.id }
        if outbox.isEmpty, case .stalled = turn { turn = .idle }
    }

    /// Re-send the message a stalled turn was for. The thread already holds the user
    /// row that went nowhere, so this is a genuinely new send, not a resurrection.
    func resendStalled() {
        guard case .stalled(let text) = turn, let text, !text.isEmpty else { return }
        turn = .idle
        enqueue(text: text)
    }

    func dismissStalled() {
        if case .stalled = turn { turn = .idle }
    }

    private func enqueue(text: String) {
        let item = OutboxItem(
            id: "outbox-\(UUID().uuidString)",
            text: text,
            state: .sending,
            createdAt: Date()
        )
        outbox.append(item)
        deliver(item)
    }

    private func deliver(_ item: OutboxItem) {
        Task { [weak self] in
            guard let self else { return }
            do {
                let created = try await self.api.send(text: item.text, room: self.room, interactionMode: "work")
                if let created {
                    self.beginTurn(
                        parentID: created.id,
                        userEpoch: created.epoch > 0 ? created.epoch : Date().timeIntervalSince1970,
                        text: item.text
                    )
                } else {
                    // An older API deploy that answers without the row. The reload below
                    // finds the row and updateTurn picks the turn up from it — do NOT
                    // fabricate a parent id, because a step poll keyed on a made-up id
                    // silently matches nothing and the indicator never settles.
                    self.turn = .working(detail: nil)
                    self.lastTurnActivity = Date()
                }
                await self.load()
            } catch {
                // The message STAYS, marked not sent, with a way to try again.
                guard let index = self.outbox.firstIndex(where: { $0.id == item.id }) else { return }
                let message = (error as? CornerAPI.APIError)?.errorDescription
                    ?? "Could not reach Corner."
                self.outbox[index].state = .failed(message)
                if case .working = self.turn { self.turn = .idle }
            }
        }
    }

    // MARK: - Composer helpers

    /// A block option tapped: put the label in the composer rather than firing it.
    /// Stage 1 does not own the structured choice-reply payload shape, and a chip that
    /// sends the wrong thing is worse than a chip that drafts the right thing.
    func draftOption(_ label: String) {
        draft = label
    }
}
