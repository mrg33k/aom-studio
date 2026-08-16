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
    /// The steward's verdict on the open turn (R18 N1). Set optimistically to
    /// `accepted` at send — the waking state keys off it — then refreshed every 10s
    /// from /api/dashboard/room-health. Survives a needs_attention halt so the room
    /// keeps saying WHY it stopped; cleared when a new turn begins or the
    /// conversation visibly continues.
    @Published private(set) var turnHealth: RoomHealth?
    /// True when the last thread fetch FAILED while a turn is open. Rule 3 of the
    /// status derivation: a live turn on a stale feed is `stuck`, not `working` —
    /// "working" would be a guess wearing a status chip. Clears on the next
    /// successful fetch.
    @Published private(set) var feedStale = false
    /// One honest feature_off hides Stop for the rest of the session (R18 N2) —
    /// showing a control the bridge will 404 is a button that lies.
    @Published private(set) var stopUnavailable = false
    /// The live partial reply, revealed at a steady cadence (R18 N3). NEVER
    /// persisted, never a message: the durable row is the only thing that ever
    /// renders as one. Internal state — render through `draft`, which gates on
    /// the turn being open (the web's snapshot-gating kill, kill #2 of the
    /// no-duplicate contract).
    @Published private(set) var streamDraft: String?
    /// The stop honesty strip: set when a stop was accepted but nothing confirmed
    /// it within the timeout. Cleared by the next send or the turn settling.
    @Published private(set) var stopNotice: String?
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
    private let stewardInterval: TimeInterval
    private let repairAfter: TimeInterval
    private let onFirstReply: @MainActor () async -> Void

    private var subscription: RoomSubscribing?
    private var pollTask: Task<Void, Never>?
    private var stepTask: Task<Void, Never>?
    private var stewardTask: Task<Void, Never>?
    private var stopTimeoutTask: Task<Void, Never>?
    private let stopTimeout: TimeInterval
    // Streaming (R18 N3): one reader per turn, keyed on the durable parent id.
    private var streamTask: Task<Void, Never>?
    private var revealTask: Task<Void, Never>?
    private var streamKey: String?
    /// Chunks land here raw; the reveal loop drains into `streamDraft` at a
    /// steady tick — the cadence, not the network, owns the paint rate.
    private var streamBuffer = ""
    private let revealInterval: TimeInterval
    /// The one repair ask per turn (the web's contract: GET until 45s, then ONE
    /// POST). Repair is not a retry loop.
    private var repairAskedThisTurn = false
    /// Last (status, label) mirrored to the Live Activity — updates are sent
    /// only on change, never on every 1.5s poll tick (R18 N7).
    private var lastActivitySignature = ""

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
        stewardInterval: TimeInterval = Config.stewardPollInterval,
        repairAfter: TimeInterval = Config.stewardRepairAfter,
        stopTimeout: TimeInterval = Config.stopConfirmTimeout,
        revealInterval: TimeInterval = Config.streamRevealInterval,
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
        self.stewardInterval = stewardInterval
        self.repairAfter = repairAfter
        self.stopTimeout = stopTimeout
        self.revealInterval = revealInterval
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

    /// R20: the thread now deduplicates re-delivered file cards. When an agent
    /// re-shares the same file (same filename + URL + direction), only the LATEST
    /// card renders — the earlier delivery is suppressed. This prevents the "two
    /// cards with the same name" visual bug on re-deliveries. Conservative: only
    /// dedupes when the message is a pure file announcement (no real prose), and
    /// both filename and URL match.
    var thread: [ThreadItem] {
        let messages = ChatViewModel.deduplicateFileDeliveries(rows)
        return messages.map(ThreadItem.message) + outbox.map(ThreadItem.outbox)
    }

    /// Suppress older pure-file-announcement rows that re-deliver the same file.
    /// Walks from newest to oldest, keeping the first (newest) occurrence of each
    /// unique (direction, url, name) triple. Rows with real prose (isPure == false)
    /// are never suppressed — they carry the agent's commentary.
    static func deduplicateFileDeliveries(_ rows: [MessageRow]) -> [MessageRow] {
        // Build the set of file keys we have already seen, scanning from newest
        // (end of array) to oldest (start). A file key is "u|<url>|<name>" or
        // "a|<url>|<name>" — the same identity RoomFile.crossings uses.
        var seenFileKeys = Set<String>()
        var keep = [Bool](repeating: true, count: rows.count)

        for i in stride(from: rows.count - 1, through: 0, by: -1) {
            let row = rows[i]
            let parsed = Attachment.parse(row: row)
            // Only suppress pure announcements — rows with real prose stay.
            guard parsed.isPure, !parsed.attachments.isEmpty else { continue }
            let direction = row.isUser ? "u" : "a"
            var allSeen = true
            for att in parsed.attachments {
                let key = "\(direction)|\(att.url)|\(att.name)"
                if !seenFileKeys.contains(key) {
                    seenFileKeys.insert(key)
                    allSeen = false
                }
            }
            // If every attachment in this row was already seen (from a newer row),
            // this row is a duplicate delivery — suppress it.
            if allSeen {
                keep[i] = false
            }
        }

        return rows.enumerated().compactMap { keep[$0.offset] ? $0.element : nil }
    }

    var isAwaiting: Bool {
        if case .working = turn { return true }
        return false
    }

    /// A turn is OPEN — working or stalled. The stalled notice is a notice, not a
    /// close: polling continues underneath, so for the status vocabulary the turn
    /// is still awaiting.
    var turnIsOpen: Bool {
        if case .idle = turn { return false }
        return true
    }

    /// The renderable STREAM draft (named to never collide with the composer's
    /// `draft` — the web hit this exact collision): kill #2 of the no-duplicate
    /// contract. The instant the turn settles this is nil regardless of state.
    var liveDraft: String? {
        guard turnIsOpen, let text = streamDraft, !text.isEmpty else { return nil }
        return text
    }

    /// THE one status word for this room, derived by the ported roomStatus rules.
    /// Every surface reads this — the header pill, and anything N2+ adds — so the
    /// room can never say two different things about the same turn.
    var roomStatus: RoomStatus {
        RoomStatus.derive(
            awaiting: turnIsOpen,
            liveStepCount: liveSteps.count,
            draftStreaming: liveDraft != nil,
            healthState: turnHealth?.state,
            healthCause: turnHealth?.cause,
            feedStale: feedStale
        )
    }

    // MARK: - Lifecycle

    func start() {
        if Config.useConvex {
            startConvexPoll()
        } else {
            subscribe()
            startReconcilePoll()
        }
        Task { await load() }
    }

    func stop() {
        pollTask?.cancel(); pollTask = nil
        stepTask?.cancel(); stepTask = nil
        stewardTask?.cancel(); stewardTask = nil
        stopTimeoutTask?.cancel(); stopTimeoutTask = nil
        stopConvexPoll()
        closeTurnStream()
        subscription?.stop(); subscription = nil
    }

    /// Returning to the foreground. The socket is dead — a suspended app's socket
    /// always is — so rebuild it and reconcile with a gap check before trusting
    /// anything on screen.
    func handleForeground() {
        if Config.useConvex {
            startConvexPoll()
            Task { await catchUp() }
            return
        }
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

    // MARK: - Convex backend (BRIEF 04)

    private var convexPollTask: Task<Void, Never>?

    /// Convex-backed thread loader: `loadMessages(roomId)` → `messages:getThread`
    func loadMessages(roomId: String) async throws -> [MessageRow] {
        try await ConvexService.shared.query("messages:getThread", args: ["roomId": roomId])
    }

    /// Convex-backed send against the real Corner schema. Room, world, and user
    /// are Convex document ids resolved from the signed-in account.
    func sendMessage(roomId: String, text: String) async throws -> String {
        let concreteAPI = CornerAPI.shared
        guard let email = concreteAPI.session?.user.email else { throw ConvexService.ConvexError.missingIdentity }
        let userName: String = {
            if let meta = concreteAPI.session?.user.userMetadata,
               let n = (meta["name"] as? String ?? meta["full_name"] as? String ?? meta["user_name"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
               !n.isEmpty { return n }
            if let email = concreteAPI.session?.user.email, !email.isEmpty { return email }
            return "iOS"
        }()
        let identity = try await ConvexService.shared.identity(email: email, name: userName)
        let args: [String: Any] = [
            "roomId": roomId,
            "text": text,
            "worldId": identity.worldId,
            "source": Config.messageSource,
            "userId": identity.userId,
            "userName": userName,
        ]
        return try await ConvexService.shared.mutationWithResult("messages:sendMessage", args: args)
    }

    /// Start Convex polling — 1s while a turn is open, 2.5s idle. Immediate load
    /// on send means the agent's typing row appears within a second (user asked for
    /// Corner to attaches to agents immediately, not after a generic delay).
    func startConvexPoll() {
        guard Config.useConvex else { return }
        convexPollTask?.cancel()
        convexPollTask = Task { [weak self] in
            while !Task.isCancelled {
                let interval: TimeInterval = (self?.turnIsOpen == true) ? 1.0 : 2.5
                try? await Task.sleep(for: .seconds(interval))
                if Task.isCancelled { return }
                await self?.load()
            }
        }
    }

    /// Kick an immediate reload without waiting for the next poll tick.
    /// Call right after Corner dispatches to agents so typing indicators show in <1s.
    func kickConvexPoll() {
        Task { await load() }
    }

    func stopConvexPoll() {
        convexPollTask?.cancel()
        convexPollTask = nil
    }

    // MARK: - Loading

    func load() async {
        do {
            let fetched: [MessageRow]
            let isTesting = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
            if Config.useConvex && !isTesting {
                fetched = try await ConvexService.shared.query(
                    "messages:getThread",
                    args: ["roomId": room.convexRoomID, "limit": 100]
                )
            } else {
                fetched = try await api.fetchMessages(room: room, limit: 100)
            }
            feedStale = false
            apply(fetched)
            loadState = thread.isEmpty ? .empty : .ready
        } catch {
            // A failed reconcile under a thread that is already rendering must NOT
            // blank the room — the user loses their place for a transient error. Only
            // a failure with nothing on screen is worth showing as a failure.
            // But while a turn is OPEN, a failed fetch makes "working" a guess —
            // the status derivation reads this as stuck until the feed recovers.
            if turnIsOpen { feedStale = true }
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
            var fetched: [MessageRow]
            if Config.useConvex {
                fetched = try await ConvexService.shared.query(
                    "messages:getThread",
                    args: ["roomId": room.convexRoomID, "limit": 100]
                )
            } else {
                fetched = try await api.fetchMessages(room: room, limit: 100)
            }
            if hadRows, let anchor, !fetched.contains(where: { $0.id == anchor }) {
                if Config.useConvex {
                    fetched = try await ConvexService.shared.query(
                        "messages:getThread",
                        args: ["roomId": room.convexRoomID, "limit": 400]
                    )
                } else {
                    fetched = try await api.fetchMessages(room: room, limit: 400)
                }
            }
            feedStale = false
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
            if turnIsOpen { feedStale = true }
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

        // Kill #1 of the no-duplicate contract: the draft dies in the SAME
        // mutation pass that renders the real row — rows and the cleared draft
        // commit together, so the reply can never paint twice, not even for a
        // frame. The bridge's interim progress rows are NOT the answer and do
        // not clear it (the web's known draft-flicker defect, decided here:
        // suppressed).
        if streamDraft != nil,
           awaitingUserEpoch > 0,
           fetched.contains(where: { !$0.isUser && !$0.isInterimProgress && $0.epoch >= awaitingUserEpoch }) {
            closeTurnStream()
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
            // A needs_attention verdict outlives the turn on purpose — the room keeps
            // saying WHY it stopped. But a genuinely new reply means the conversation
            // continued and the verdict is history; keeping the Stuck chip over a
            // fresh answer would be the lie in the other direction.
            if replyIsNew, turnHealth?.state == "needs_attention" {
                turnHealth = nil
            }
            return
        case .working:
            if replyIsNew { lastTurnActivity = Date() }
            guard !sawLiveSteps else { return }
            // The bridge's interim "Still working on this" rows feed the clock
            // above but are NOT the answer — settling on one is calling a turn
            // done while it is still working (R18 N3).
            if let newestReply, !newestReply.isInterimProgress,
               awaitingUserEpoch > 0, newestReply.epoch >= awaitingUserEpoch {
                settleTurn()
            }
        case .stalled:
            guard replyIsNew else { return }
            // A reply arrived after the quiet notice: the conversation continues.
            // With live steps flowing the sentinel still owns the stop signal, so
            // this goes back to working; without steps the reply IS the answer —
            // unless it is an interim progress row, which only proves life.
            lastTurnActivity = Date()
            if sawLiveSteps {
                turn = .working(detail: liveSteps.last?.text)
            } else if newestReply?.isInterimProgress == false, replyEpoch >= awaitingUserEpoch {
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
            // Optimistic accepted — the web sets it at send. The waking state keys
            // off it, and the steward's first real read replaces it within 10s.
            turnHealth = RoomHealth(state: "accepted")
            repairAskedThisTurn = false
            stopNotice = nil
            // The running turn on the lock screen / Dynamic Island (R18 N7).
            lastActivitySignature = ""
            TurnActivityService.shared.turnBegan(roomTitle: room.title, ask: text)
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
        startStewardPoll()
        // One stream per TURN, keyed to its first parent — the bridge live-steers
        // a mid-turn follow-up into the in-flight turn, so the original stream is
        // the one that keeps narrating. Re-entry with the same key is a no-op.
        if awaitingParentIDs.count == 1 {
            openTurnStream(parentID: parentID)
        }
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
        stewardTask?.cancel()
        stewardTask = nil
        stopTimeoutTask?.cancel()
        stopTimeoutTask = nil
        closeTurnStream()
        turnHealth = nil
        stopNotice = nil
        repairAskedThisTurn = false
        // Catch-all for the teardown paths that carry no better word (dismiss,
        // resend). The explicit ends above already ran on the main paths, and
        // the service no-ops once its activity is gone.
        TurnActivityService.shared.turnEnded(outcomeWord: "Done", startedAt: turnStartedAt)
    }

    // MARK: - Live reply stream (R18 N3)

    /// One reader per live turn, keyed by the durable parent id. Re-entry with
    /// the same id is a no-op; a superseded reader can never write into a new
    /// turn (the key guard below). nil from the transport = no stream lane —
    /// the engine behaves exactly as before streaming existed.
    private func openTurnStream(parentID: String) {
        guard streamKey != parentID else { return }
        closeTurnStream()
        guard let events = api.turnStream(room: room, messageID: parentID) else { return }
        streamKey = parentID
        streamTask = Task { [weak self] in
            for await event in events {
                guard let self, !Task.isCancelled else { return }
                guard self.streamKey == parentID else { return }
                self.applyStreamEvent(event)
            }
        }
    }

    private func applyStreamEvent(_ event: TurnStreamEvent) {
        switch event {
        case .typing:
            break
        case .chunk(let delta):
            streamBuffer += delta
            // Live text is life — it feeds the same silence clock steps do.
            lastTurnActivity = Date()
            ensureRevealLoop()
        case .done, .superseded:
            // The durable row is the only renderable reply. Reveal what was
            // buffered, reload, and let apply() clear the draft in the same
            // pass the row renders. done.text is deliberately ignored.
            flushRevealBuffer()
            Task { await load() }
        case .error:
            // Silent no-op: the step poll is the fallback and keeps running.
            flushRevealBuffer()
        }
    }

    /// The reveal loop: network chunks arrive in bursts, the visible draft
    /// drains at a steady tick — the cadence owns the paint rate, which is what
    /// reads as smooth. A zero interval (tests) reveals synchronously.
    private func ensureRevealLoop() {
        if revealInterval <= 0 {
            streamDraft = (streamDraft ?? "") + streamBuffer
            streamBuffer = ""
            return
        }
        guard revealTask == nil else { return }
        let interval = revealInterval
        revealTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(interval))
                if Task.isCancelled { break }
                guard let self else { return }
                if self.drainRevealTick() { break }
            }
            self?.revealTask = nil
        }
    }

    /// One tick. Returns true when the buffer is empty and the loop may rest —
    /// a later chunk restarts it.
    private func drainRevealTick() -> Bool {
        guard !streamBuffer.isEmpty else { return true }
        let backlog = streamBuffer.count
        let take = backlog > Config.streamCatchupThreshold
            ? max(Config.streamRevealChars, backlog / 15)
            : Config.streamRevealChars
        let cut = streamBuffer.index(streamBuffer.startIndex, offsetBy: min(take, backlog))
        streamDraft = (streamDraft ?? "") + String(streamBuffer[..<cut])
        streamBuffer = String(streamBuffer[cut...])
        return streamBuffer.isEmpty
    }

    /// The stream ended — no reason to keep dripping. Reveal the rest now.
    private func flushRevealBuffer() {
        if !streamBuffer.isEmpty {
            streamDraft = (streamDraft ?? "") + streamBuffer
            streamBuffer = ""
        }
        revealTask?.cancel()
        revealTask = nil
    }

    private func closeTurnStream() {
        streamTask?.cancel()
        streamTask = nil
        revealTask?.cancel()
        revealTask = nil
        streamKey = nil
        streamBuffer = ""
        streamDraft = nil
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
        if let sentinel = mine.first(where: \.isSettledSentinel) {
            // The lock screen's final word rides the sentinel's phase: a stop the
            // user asked for reads "Stopped", everything else reads "Done"
            // (phase `waiting` is deliberately NOT surfaced as needs-you).
            TurnActivityService.shared.turnEnded(
                outcomeWord: sentinel.phase == "stopped" ? "Stopped" : "Done",
                startedAt: turnStartedAt
            )
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

        // Mirror to the Live Activity, only when the frame actually changed.
        let word = roomStatus.label
        let label = WorkProjection.currentLabel(steps: liveSteps, ask: awaitingSentText)
        let signature = "\(word)|\(label)"
        if signature != lastActivitySignature {
            lastActivitySignature = signature
            TurnActivityService.shared.update(
                statusWord: word, stepLabel: label, startedAt: turnStartedAt
            )
        }
    }

    // MARK: - Steward (room-health) — R18 N1

    /// The steward loop: every `stewardInterval` seconds while a turn is open, ask
    /// /api/dashboard/room-health what it thinks. GET until `repairAfter` seconds
    /// have passed since send, then exactly ONE POST — the same endpoint the
    /// server's own auto-repair uses; a client ask just asks sooner.
    private func startStewardPoll() {
        stewardTask?.cancel()
        let interval = stewardInterval
        stewardTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(interval))
                if Task.isCancelled { return }
                await self?.pollHealth()
            }
        }
    }

    private func pollHealth() async {
        guard turnIsOpen, let parentID = awaitingParentID else { return }
        let sentAt = turnStartedAt ?? Date()
        let wantRepair = !repairAskedThisTurn && Date().timeIntervalSince(sentAt) >= repairAfter
        if wantRepair { repairAskedThisTurn = true }

        let result = try? await api.roomHealth(room: room, messageID: parentID, repair: wantRepair)
        // Health is advisory: a failed or empty read changes nothing. found:false
        // means the steward does not know this turn — also nothing.
        guard let health = result ?? nil, health.found != false else { return }
        // The poll may outlive the turn it asked about.
        guard turnIsOpen else { return }
        // A client-set `stopping` outranks routine steward reads: the user's stop
        // is in flight, and "active" arriving 10s later must not un-say it. Only
        // an END verdict (settled / needs_attention) may replace it.
        if turnHealth?.state == "stopping",
           health.state != "settled", health.state != "needs_attention" {
            return
        }

        turnHealth = health
        switch health.state {
        case "settled":
            // The steward says this turn is over — the same server fact the 9999
            // sentinel carries. Settle, then reload so whatever the reply row says
            // (or its absence) is what the user sees.
            TurnActivityService.shared.turnEnded(outcomeWord: "Done", startedAt: turnStartedAt)
            settleTurn()
            await load()
        case "needs_attention" where health.repaired != true:
            TurnActivityService.shared.turnEnded(
                outcomeWord: RoomStatus.hardCauses.contains(health.cause ?? "") ? "Stuck" : "Needs you",
                startedAt: turnStartedAt
            )
            haltTurnKeepingHealth()
        default:
            break
        }
    }

    /// A needs_attention verdict: nothing is running, or the agent needs the user.
    /// The turn stops being "awaiting" (the web flips awaiting=false on exactly
    /// this) but the verdict STAYS — clearing it would erase the WHY. The parent id
    /// and sent text survive too, so recovery actions have something to act on.
    private func haltTurnKeepingHealth() {
        let keepHealth = turnHealth
        let keepParent = awaitingParentID
        let keepText = awaitingSentText
        turn = .idle
        clearTurnTracking()
        turnHealth = keepHealth
        awaitingParentID = keepParent
        awaitingSentText = keepText
    }

    // MARK: - Stop (R18 N2)

    enum StopControl: Equatable { case hidden, ready, stopping }

    /// What the Stop control should render. Hidden after one honest feature_off —
    /// a control the bridge will refuse is a lie in button form.
    var stopControl: StopControl {
        guard turnIsOpen, !stopUnavailable, awaitingParentID != nil else { return .hidden }
        if turnHealth?.state == "stopping" { return .stopping }
        return .ready
    }

    /// Ask the bridge to stop the running turn. NEVER fakes a settled turn: the
    /// optimistic state is `stopping`, and the turn only ends when the durable
    /// stopped row or the settled sentinel arrives through the normal feed. A stop
    /// the bridge accepted but never confirmed reverts after `stopTimeout` with an
    /// honest notice — the web's own decision record names the missing timeout as
    /// the defect to fix in any port.
    @discardableResult
    func stopTurn() async -> Bool {
        guard turnIsOpen, let parentID = awaitingParentID, !stopUnavailable else { return false }
        guard turnHealth?.state != "stopping" else { return false } // already stopping
        let previous = turnHealth
        turnHealth = RoomHealth(state: "stopping")
        stopNotice = nil
        startStopTimeout()
        do {
            let result = try await api.stopTurn(room: room, messageID: parentID)
            if result.stopped == true {
                // Accepted. The stopping state STANDS until the stopped row or
                // sentinel lands; the timeout covers a watcher that never confirms.
                await load()
                return true
            }
            if result.featureOff == true { stopUnavailable = true }
            cancelStopTimeout()
            if turnHealth?.state == "stopping" { turnHealth = previous }
            return false
        } catch {
            cancelStopTimeout()
            if turnHealth?.state == "stopping" { turnHealth = previous }
            return false
        }
    }

    private func startStopTimeout() {
        stopTimeoutTask?.cancel()
        let timeout = stopTimeout
        stopTimeoutTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(timeout))
            if Task.isCancelled { return }
            await self?.stopTimeoutFired()
        }
    }

    private func cancelStopTimeout() {
        stopTimeoutTask?.cancel()
        stopTimeoutTask = nil
    }

    private func stopTimeoutFired() {
        guard turnIsOpen, turnHealth?.state == "stopping" else { return }
        turnHealth = nil
        stopNotice = "Couldn't confirm the stop — the turn may still be running."
    }

    // MARK: - Recovery actions (R18 N2)

    /// One human repair ask — the same endpoint the steward's 45s auto-ask uses.
    /// On success the turn resumes as `recovering`; polling picks it back up.
    @discardableResult
    func repairTurn() async -> Bool {
        guard let parentID = awaitingParentID else { return false }
        let result = try? await api.roomHealth(room: room, messageID: parentID, repair: true)
        await load()
        guard let health = result ?? nil else { return false }
        turnHealth = health
        if health.repaired == true {
            // The repair re-ran something: the turn is live again. Re-open the
            // tracking so steps and the steward keep watching it.
            if case .idle = turn {
                lastTurnActivity = Date()
                turnIsQuiet = false
                if turnStartedAt == nil { turnStartedAt = Date() }
                awaitingParentIDs.insert(parentID)
                turn = .working(detail: liveSteps.last?.text)
                startStepPoll()
                startStewardPoll()
            }
            turnHealth = RoomHealth(state: "recovering", cause: health.cause)
            return true
        }
        return false
    }

    /// Dismiss the recovery notice. The verdict is acknowledged, not erased from
    /// the server — the steward will speak again if it recurs on a future turn.
    func dismissRecovery() {
        if turnHealth?.state == "needs_attention" || turnHealth?.state == "recovering" {
            turnHealth = nil
        }
        stopNotice = nil
    }

    /// agent_silent's way out: send the same words as a genuinely new turn.
    func resendAfterRecovery() {
        guard let text = awaitingSentText, !text.isEmpty else { return }
        turn = .idle
        clearTurnTracking()
        enqueue(text: text)
    }

    /// agent_silent's lighter way out — the web's literal status ask.
    func askForStatus() {
        turn = .idle
        clearTurnTracking()
        enqueue(text: "Are you still on this? Give me a quick status on my last message.")
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
                // Convex path: try Convex first; on failure fall through to Supabase so
                // a Convex outage never bricks sending. Skip in tests — FakeTransport is the contract there.
                let isTesting = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
                if Config.useConvex && !isTesting {
                    let messageID = try await self.sendMessage(roomId: self.room.convexRoomID, text: item.text)
                    if let index = self.outbox.firstIndex(where: { $0.id == item.id }) {
                        self.outbox[index].serverMessageID = messageID
                    }
                    self.beginTurn(parentID: messageID, userEpoch: Date().timeIntervalSince1970, text: item.text)
                    await self.load()
                    kickConvexPoll()
                    return
                }
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
                    ?? (error as? ConvexService.ConvexError)?.errorDescription
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
