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
// 2. A LIVE TURN MUST LOOK ALIVE — AND SILENCE MUST NOT BE CALLED DEATH TOO EARLY.
//    "Working…" is driven by the agent's REAL step heartbeats, and it stops on the
//    bridge's `settled` sentinel — the agent's own end-of-turn signal, not a guess.
//    But real turns go quiet for long stretches (live rows show 18-minute step gaps
//    on turns that finished fine), so the ladder is: a living indicator with an
//    elapsed clock, then a soft "nothing new for a few minutes" line, and only after
//    ten minutes of TOTAL silence a "still quiet" notice with a way out. Every kind
//    of activity feeds the clock: a new step, a new step timestamp, ANY new assistant
//    row (the bridge posts interim "Still working on this" rows mid-turn), and steps
//    keyed to ANY user row folded into this turn — a follow-up sent mid-turn is
//    live-steered into the in-flight turn by the bridge, so its steps stay keyed to
//    the ORIGINAL parent and must still count. A reply arriving always reads as the
//    conversation continuing, never as a resurrection.
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
    /// The durable row returned by POST. Reconciliation keys on this whenever
    /// available; text is not identity because two legitimate sends may both say
    /// "yes" or "go".
    var serverMessageID: String? = nil
    /// Files staged before this send — kept on the item so a retry re-sends the
    /// SAME already-uploaded files instead of losing them with the failure.
    var attachments: [Attachment] = []

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
    /// Sent, then total silence past the backstop: no step, no reply, no interim row
    /// for ten minutes. Not a verdict — polling continues underneath, and the state
    /// clears itself the moment anything arrives.
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
    /// "work" or "plan" — persisted per-room in UserDefaults so mode survives app restarts,
    /// matching the web's localStorage.cv6.chatMode.<roomKey> pattern.
    @Published var chatMode: String

    /// The turn's renderable steps, oldest first — the progress card's rows. Empty is
    /// the normal state for phone-originated turns today; the card must render as a
    /// bare timer then, never as an empty list.
    @Published private(set) var liveSteps: [MessageStep] = []
    /// When the current turn opened — drives the "Working — 2m 10s" elapsed clock.
    @Published private(set) var turnStartedAt: Date?
    /// Soft flag: steps have been silent past `quietThreshold` but the turn is not
    /// being called stopped. The indicator adds a gentle line; polling continues.
    @Published private(set) var turnIsQuiet = false

    // R4 composer: staged uploads + the room's model preference.
    @Published private(set) var staged: [CornerAPI.UploadedFile] = []
    @Published private(set) var isGeneratingImage = false
    @Published var imageGenerationError: String?
    @Published private(set) var isUploading = false
    @Published var uploadError: String?
    /// The composer's live model label — resolveEffectiveRoomModel's precedence:
    /// this room's own choice, else the workspace "_all", else automatic.
    @Published private(set) var modelChoice = "default"
    @Published private(set) var modelSaving = false
    /// Who answers this project/mission room. "default" means the room's own
    /// identity; agent 1:1 rooms never expose the selector.
    @Published private(set) var roomAgentChoice = "default"
    @Published private(set) var roomAgentRoster: [CornerAPI.RoomAgentOption] = []
    @Published private(set) var roomAgentSaving = false

    private let api: MessageTransport
    /// Uploads + model prefs are CornerAPI-only concerns (the transport seam is the
    /// thread's failure contract, and these are not part of it).
    private var live: CornerAPI { CornerAPI.shared }
    /// Timings are injected rather than read from Config at the point of use, so the
    /// three-minute backstop can be exercised in a test in milliseconds. A timeout that
    /// has never been observed firing is a timeout nobody knows the behavior of.
    private let backstop: TimeInterval
    private let quietThreshold: TimeInterval
    private let stepInterval: TimeInterval
    private let reconcileInterval: TimeInterval
    private let onFirstReply: @MainActor () async -> Void

    private var subscription: RoomSubscribing?
    private var pollTask: Task<Void, Never>?
    private var stepTask: Task<Void, Never>?

    // Turn tracking — every field here answers a question with a server fact.
    /// Server id of the NEWEST user row in this turn. Displayed facts (the resend
    /// text) key off this one.
    private var awaitingParentID: String?
    /// EVERY unsettled user row folded into the current turn. A follow-up sent
    /// mid-turn is live-steered into the in-flight turn by the bridge, so its steps
    /// and its settle stay keyed to the ORIGINAL parent — a poll that only watches
    /// the newest id goes blind the moment a follow-up lands, which was the
    /// guaranteed false-death path (live proof: row 10de6d7a got one step ever while
    /// its siblings carried the real 27-step thread).
    private var awaitingParentIDs: Set<String> = []
    private var awaitingUserEpoch: TimeInterval = 0
    private var awaitingSentText: String?
    /// Last moment anything happened on this turn: a new step, a fresher step
    /// timestamp, or ANY new assistant row — the bridge's interim "Still working on
    /// this" rows count, exactly as this comment always promised.
    private var lastTurnActivity = Date()
    /// Newest step timestamp seen this turn, so a re-emitted step row with the same
    /// count but a fresher stamp still reads as life.
    private var newestSeenStepEpoch: TimeInterval = 0
    /// Newest assistant-row timestamp already accounted for, so only genuinely new
    /// replies reset the silence clock.
    private var newestSeenReplyEpoch: TimeInterval = 0
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
        quietThreshold: TimeInterval = Config.quietTurnThreshold,
        stepInterval: TimeInterval = Config.stepPollInterval,
        reconcileInterval: TimeInterval = Config.reconcileInterval,
        onFirstReply: @escaping @MainActor () async -> Void = {
            await PushService.shared.requestAuthorizationAfterFirstReply()
        }
    ) {
        self.room = room
        self.api = transport ?? CornerAPI.shared
        self.backstop = backstop
        self.quietThreshold = quietThreshold
        self.stepInterval = stepInterval
        self.reconcileInterval = reconcileInterval
        self.onFirstReply = onFirstReply
        // Restore per-room mode, defaulting to work — mirrors web's localStorage.cv6.chatMode.<key>
        let saved = UserDefaults.standard.string(forKey: "chatMode.\(room.id)")
        self.chatMode = saved == "plan" ? "plan" : "work"
    }

    /// Set work or plan mode for this room, persisted across sessions.
    func setMode(_ mode: String) {
        let value = mode == "plan" ? "plan" : "work"
        chatMode = value
        UserDefaults.standard.set(value, forKey: "chatMode.\(room.id)")
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
        // Reconcile one optimistic item to one durable user row. Server id wins.
        // Older API deployments did not return the row, so those items get a narrow
        // text+time fallback that consumes each matching row once. The previous Set
        // of texts swept every pending "yes" as soon as one "yes" existed anywhere
        // in history — a quiet message-loss bug on repeated short replies.
        let realUserIDs = Set(fetched.filter(\.isUser).map(\.id))
        var unmatchedRows = fetched.filter(\.isUser)
        outbox = outbox.filter { item in
            guard !item.isFailed else { return true }
            if let serverID = item.serverMessageID {
                return !realUserIDs.contains(serverID)
            }
            let earliest = item.createdAt.timeIntervalSince1970 - 5
            if let index = unmatchedRows.firstIndex(where: {
                $0.text == item.text && $0.epoch >= earliest
            }) {
                unmatchedRows.remove(at: index)
                return false
            }
            return true
        }

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
            newestSeenReplyEpoch = newestReply?.epoch ?? 0
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
            // or from another device. Either way the agent is now on it. Mid-turn this
            // FOLDS into the in-flight turn rather than replacing it (beginTurn keeps
            // the earlier parent ids), because that is what the bridge does.
            beginTurn(parentID: newestUser.id, userEpoch: newestUser.epoch, text: newestUser.text)
            return
        }

        // ANY new assistant row is turn activity — the promise the lastTurnActivity
        // comment makes. The bridge posts interim "Still working on this. N minutes
        // in" rows mid-turn; those must feed the silence clock, and a reply landing
        // on a turn already called quiet must clear that call on the spot.
        let replyEpoch = newestReply?.epoch ?? 0
        let replyIsNew = replyEpoch > newestSeenReplyEpoch
        if replyIsNew { newestSeenReplyEpoch = replyEpoch }

        switch turn {
        case .idle:
            return
        case .working:
            if replyIsNew { lastTurnActivity = Date() }
            guard !sawLiveSteps else { return }
            if let newestReply, awaitingUserEpoch > 0, newestReply.epoch >= awaitingUserEpoch {
                settleTurn()
            }
        case .stalled:
            guard replyIsNew else { return }
            // A reply arrived after the quiet notice: the conversation continues.
            // With live steps flowing the sentinel still owns the stop signal, so
            // this goes back to working; without steps the reply IS the answer.
            lastTurnActivity = Date()
            if sawLiveSteps {
                turn = .working(detail: liveSteps.last?.text)
            } else if replyEpoch >= awaitingUserEpoch {
                settleTurn()
            } else {
                turn = .working(detail: nil)
            }
        }
    }

    private func beginTurn(parentID: String, userEpoch: TimeInterval, text: String?) {
        if case .idle = turn {
            // A fresh turn: reset every server-fact tracker and start the clock.
            awaitingParentIDs = [parentID]
            sawLiveSteps = false
            renderableStepCount = -1
            newestSeenStepEpoch = 0
            liveSteps = []
            turnStartedAt = Date()
        } else {
            // Mid-turn follow-up: the bridge live-steers it into the in-flight turn,
            // so the earlier parents stay tracked — their steps and their settle are
            // still THIS turn's heartbeats. Dropping them here was the guaranteed
            // false death.
            awaitingParentIDs.insert(parentID)
        }
        awaitingParentID = parentID
        awaitingUserEpoch = userEpoch
        awaitingSentText = text
        lastTurnActivity = Date()
        turnIsQuiet = false
        turn = .working(detail: liveSteps.last?.text)
        startStepPoll()
    }

    private func settleTurn() {
        turn = .idle
        clearTurnTracking()
        Task { await maybeAskForPushPermission() }
    }

    /// Shared teardown for every way a turn ends — settle, dismiss, resend.
    private func clearTurnTracking() {
        awaitingParentID = nil
        awaitingParentIDs = []
        awaitingSentText = nil
        sawLiveSteps = false
        liveSteps = []
        turnStartedAt = nil
        turnIsQuiet = false
        stepTask?.cancel()
        stepTask = nil
    }

    /// Live steps: the only source that can say "still working" or "stopped" without
    /// guessing. Runs while a turn is open — INCLUDING the stalled state, because
    /// "still quiet" is a notice, not a verdict: steps resuming must recover it.
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
        if case .idle = turn { return }
        guard !awaitingParentIDs.isEmpty else { return }

        // 100, matching the web's persistence poll. The steps feed is shared by every
        // room in the world; 40 lets a busy afternoon push a long turn's early steps
        // out of the window, which reads here as the turn losing its heartbeat.
        let steps = (try? await api.fetchSteps(room: room, roomAgent: roomAgentChoice, limit: 100)) ?? []
        // Steps keyed to ANY user row folded into this turn count — a follow-up
        // re-keys the display but the bridge keeps emitting against the original id.
        let mine = steps.filter { step in
            guard let parent = step.parentMessageID else { return false }
            return awaitingParentIDs.contains(parent)
        }

        // The bridge's `settled` sentinel IS "the agent stopped working" — for the
        // whole folded turn, whichever parent id it lands on. Stopping on it is
        // knowing; stopping on a countdown is guessing.
        if mine.contains(where: \.isSettledSentinel) {
            settleTurn()
            return
        }

        let renderable = mine
            .filter(\.isRenderable)
            .sorted { ($0.stepIndex ?? 0) < ($1.stepIndex ?? 0) }
        if !renderable.isEmpty { sawLiveSteps = true }

        // Liveness is the row count AND the newest stamp: a re-emitted step with a
        // fresher timestamp is life even when the count holds still.
        let newestStamp = mine
            .compactMap { $0.timestamp.flatMap(MessageRow.parseTimestamp)?.timeIntervalSince1970 }
            .max() ?? 0
        if renderable.count != renderableStepCount || newestStamp > newestSeenStepEpoch {
            renderableStepCount = renderable.count
            newestSeenStepEpoch = max(newestSeenStepEpoch, newestStamp)
            lastTurnActivity = Date()
        }
        if liveSteps != renderable { liveSteps = renderable }
        let latest = renderable.last?.text

        let silence = Date().timeIntervalSince(lastTurnActivity)
        turnIsQuiet = silence > quietThreshold

        // Total silence past the backstop: say so, softly, and KEEP POLLING — the
        // notice clears itself the moment a step or a reply arrives.
        if silence > backstop {
            if case .working = turn {
                turn = .stalled(sentText: awaitingSentText)
            }
            return
        }

        switch turn {
        case .stalled:
            // Activity resumed after the quiet notice — the turn was never dead.
            turn = .working(detail: latest)
        case .working(let existing):
            if existing != latest { turn = .working(detail: latest) }
        case .idle:
            break
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
        let files = staged.map(\.asAttachment)
        guard !text.isEmpty || !files.isEmpty else { return }
        draft = ""
        staged = []
        // A file sent without words gets the bridge's own canonical announcement
        // text, so every reader of the row (dispatcher included) sees what the
        // watcher itself would have written — and the bubble renders cards only.
        let finalText = text.isEmpty ? Self.announcement(for: files) : text
        enqueue(text: finalText, attachments: files)
    }

    static func announcement(for files: [Attachment]) -> String {
        if files.count == 1 { return "Attached file: \(files[0].name)" }
        return "Attached \(files.count) files: " + files.map(\.name).joined(separator: ", ")
    }

    // MARK: - Staged uploads (R4 composer)

    /// Push one picked file through the web's upload lane and stage it on success.
    /// Failures surface on `uploadError` — a file that silently fails to stage is a
    /// file the user believes they sent.
    func stageFile(data: Data, filename: String, mime: String) async {
        isUploading = true
        uploadError = nil
        defer { isUploading = false }
        do {
            let uploaded = try await live.uploadFile(data: data, filename: filename, mime: mime, room: room)
            if !staged.contains(where: { $0.url == uploaded.url }) {
                staged.append(uploaded)
            }
        } catch {
            uploadError = "\(filename) did not upload. Try again."
        }
    }

    func removeStaged(_ file: CornerAPI.UploadedFile) {
        staged.removeAll { $0.id == file.id }
    }

    /// Generate, then durably upload into this room before exposing the result in
    /// the composer. The generated asset therefore behaves exactly like a photo the
    /// user attached: previewable, retry-safe, and discoverable in Files after send.
    func generateAndStageImage(tool: String, prompt: String) async -> CornerAPI.GeneratedImage? {
        guard !isGeneratingImage else { return nil }
        isGeneratingImage = true
        imageGenerationError = nil
        defer { isGeneratingImage = false }
        do {
            let image = try await CornerAPI.shared.generateImage(tool: tool, prompt: prompt)
            let stamp = Int(Date().timeIntervalSince1970)
            let uploaded = try await CornerAPI.shared.uploadFile(
                data: image.data,
                filename: "corner-image-\(stamp).png",
                mime: image.mime,
                room: room
            )
            staged.append(uploaded)
            return image
        } catch {
            imageGenerationError = error.localizedDescription
            return nil
        }
    }

    // MARK: - Model preference (R4 composer)

    /// Pull the workspace's model prefs and resolve this room's effective choice —
    /// resolveEffectiveRoomModel verbatim: room key > workspace "_all" > automatic.
    func loadModelPreference() async {
        guard let models = try? await live.agentModels() else { return }
        let own = models[room.modelPreferenceKey, default: ""].trimmingCharacters(in: .whitespaces)
        let workspace = models["_all", default: ""].trimmingCharacters(in: .whitespaces)
        if !own.isEmpty, own != "default" { modelChoice = own }
        else if !workspace.isEmpty, workspace != "default" { modelChoice = workspace }
        else { modelChoice = "default" }
    }

    /// Save a model pick for this room. Optimistic, reverted on failure — the same
    /// contract as the web's selectRoomModel.
    func selectModel(_ id: String) async {
        guard !modelSaving, id != modelChoice else { return }
        let previous = modelChoice
        modelChoice = id
        modelSaving = true
        defer { modelSaving = false }
        do {
            try await live.setAgentModel(preferenceKey: room.modelPreferenceKey, model: id)
        } catch {
            modelChoice = previous
        }
    }

    // MARK: - Room specialist preference (R15)

    func loadRoomAgentPreference() async {
        guard let key = room.agentPreferenceKey else { return }
        guard let result = try? await live.roomAgents() else { return }
        roomAgentRoster = result.agents
        let saved = result.assignments[key, default: ""]
            .trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        roomAgentChoice = saved.isEmpty ? "default" : saved
    }

    func selectRoomAgent(_ slug: String) async {
        guard let key = room.agentPreferenceKey, !roomAgentSaving else { return }
        let next = slug.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalized = next.isEmpty ? "default" : next
        guard normalized != roomAgentChoice else { return }
        let previous = roomAgentChoice
        roomAgentChoice = normalized
        roomAgentSaving = true
        defer { roomAgentSaving = false }
        do {
            try await live.setRoomAgent(preferenceKey: key, agent: normalized)
        } catch {
            roomAgentChoice = previous
        }
    }

    var roomAgentTitle: String {
        guard roomAgentChoice != "default" else { return "Room default" }
        return roomAgentRoster.first(where: { $0.slug == roomAgentChoice })?.title
            ?? AgentRoster.title(for: roomAgentChoice)
    }

    func retry(_ item: OutboxItem) {
        guard let index = outbox.firstIndex(where: { $0.id == item.id }) else { return }
        outbox[index].state = .sending
        deliver(outbox[index])
    }

    func discard(_ item: OutboxItem) {
        outbox.removeAll { $0.id == item.id }
        if outbox.isEmpty, case .stalled = turn {
            turn = .idle
            clearTurnTracking()
        }
    }

    /// Re-send the message a stalled turn was for. The thread already holds the user
    /// row that went nowhere, so this is a genuinely new send, not a resurrection.
    func resendStalled() {
        guard case .stalled(let text) = turn, let text, !text.isEmpty else { return }
        turn = .idle
        clearTurnTracking()
        enqueue(text: text)
    }

    func dismissStalled() {
        if case .stalled = turn {
            turn = .idle
            clearTurnTracking()
        }
    }

    private func enqueue(text: String, attachments: [Attachment] = []) {
        let item = OutboxItem(
            id: "outbox-\(UUID().uuidString)",
            text: text,
            state: .sending,
            createdAt: Date(),
            attachments: attachments
        )
        outbox.append(item)
        deliver(item)
    }

    private func deliver(_ item: OutboxItem) {
        // Capture the mode at send time so a mid-flight toggle doesn't change what the
        // agent already received. Mode is the user's INTENT when they pressed send.
        let mode = chatMode
        Task { [weak self] in
            guard let self else { return }
            do {
                let created = try await self.api.send(
                    text: item.text, room: self.room,
                    interactionMode: mode, attachments: item.attachments,
                    roomAgent: self.roomAgentChoice,
                    clientMessageID: item.id
                )
                if let created {
                    if let index = self.outbox.firstIndex(where: { $0.id == item.id }) {
                        self.outbox[index].serverMessageID = created.id
                    }
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
                    if self.turnStartedAt == nil { self.turnStartedAt = Date() }
                }
                await self.load()
            } catch {
                // The message STAYS, marked not sent, with a way to try again.
                guard let index = self.outbox.firstIndex(where: { $0.id == item.id }) else { return }
                let message = (error as? CornerAPI.APIError)?.errorDescription
                    ?? "Could not reach Corner."
                self.outbox[index].state = .failed(message)
                if case .working = self.turn {
                    self.turn = .idle
                    self.clearTurnTracking()
                }
            }
        }
    }

    // MARK: - Room reset (/clear)

    /// POST /api/dashboard/room-reset and reload.
    /// Returns true on success, false on failure.
    func clearRoom() async -> Bool {
        do {
            try await live.clearRoom(room: room)
            await load()
            return true
        } catch {
            return false
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
