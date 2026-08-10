// TrackerStore.swift — Corner native iOS
// corner:native-ios Stage 3
//
// Which board is open, what is on it, and the three writes that are real.
//
// THE WORLD IS SENT, AND THE WEB DOES NOT SEND IT. `authFetch('/api/dashboard/cv6-bugs')`
// in useCommandTracker.js passes no `world`, and the endpoint defaults to `'aom'` — so
// every tenant's Tracker on the web reads AOM's bug board. The store is keyed per world
// server-side (`cm_state` rows carry client_id), so passing the signed-in world is both
// what the endpoint asks for and the only reading that is true for a non-AOM user. On
// this device a tenant sees their own board, which will look EMPTY next to the web's
// borrowed one; that difference is the bug being surfaced, not created.
//
// OPTIMISM, AND WHERE IT STOPS. A status flip shows immediately and then reconciles
// against a reload, because the write is a single field on a row the server already has
// and a 2xx is the norm. A FAILED write rolls the row back and says so — a chip that
// stays flipped after the server refused is a lie the user acts on later.
//
// THE ASSIGN WRITE IS TWO WRITES AND THEY ARE NOT EQUAL. Assigning an issue posts a
// message into the agent's room (the real dispatch — this is how the agent learns about
// it) and then stamps the owner onto the board row. If the stamp fails the assignment
// still HAPPENED; the row just does not show it, and that is what the notice says. If
// the message fails, nothing was assigned at all and no owner is stamped.

import Foundation

@MainActor
final class TrackerStore: ObservableObject {

    enum LoadState: Equatable {
        case idle
        case loading
        case ready
        case error(String)
    }

    @Published private(set) var boards: [TrackerBoard] = []
    @Published private(set) var issues: [TrackerIssue] = []
    @Published private(set) var state: LoadState = .idle
    @Published private(set) var activeBoardID: String = TrackerBoard.cv6ID
    @Published var notice: Notice?
    /// Issue ids with a write in flight, so a double-tap cannot post two updates.
    @Published private(set) var writing: Set<String> = []

    struct Notice: Identifiable, Equatable {
        let id = UUID()
        let text: String
        let isFailure: Bool
    }

    private let api: CornerAPI
    private var bugs: [BugRow] = []
    private var tickets: [TicketRow] = []
    private var custom: [CustomTracker] = []
    /// Each board's own load outcome, so one dead endpoint does not blank the others.
    private var bugsFailure: String?
    private var ticketsFailure: String?

    init(api: CornerAPI? = nil) {
        self.api = api ?? .shared
    }

    /// A store already holding boards, for previews and the render gallery. It takes the
    /// WIRE rows rather than finished issues, so anything rendered from it has been
    /// through the real decode, the real priority mapping and the real sort — a gallery
    /// that renders hand-built view models proves only that the view compiles.
    init(
        previewBugs: [BugRow] = [],
        tickets: [TicketRow] = [],
        custom: [CustomTracker] = [],
        active: String = TrackerBoard.cv6ID,
        ticketsFailure: String? = nil
    ) {
        self.api = .shared
        self.bugs = previewBugs
        self.tickets = tickets
        self.custom = custom
        self.activeBoardID = active
        self.ticketsFailure = ticketsFailure
        self.state = .ready
        rebuild()
    }

    var activeBoard: TrackerBoard? {
        boards.first { $0.id == activeBoardID }
    }

    var hasLoadedOnce: Bool {
        if case .idle = state { return false }
        if case .loading = state { return bugs.isEmpty && tickets.isEmpty && custom.isEmpty }
        return true
    }

    // MARK: - Loading

    func load() async {
        if !hasLoadedOnce { state = .loading }

        // Three independent boards. `async let` so a slow client-ticket bridge does not
        // hold up the board the user is actually looking at.
        async let bugsTask = api.fetchBugs()
        async let ticketsTask = api.fetchTickets()
        async let customTask = api.fetchCustomTrackers()

        do {
            bugs = try await bugsTask
            bugsFailure = nil
        } catch {
            bugsFailure = (error as? LocalizedError)?.errorDescription ?? "The bug board could not be loaded."
        }
        do {
            tickets = try await ticketsTask
            ticketsFailure = nil
        } catch {
            // The bridge answers 503 when SOURCING_SUPABASE_SERVICE_KEY is unset on the
            // deployment. That is a configuration fact, not a user error, and the board
            // says so instead of showing an empty list that reads as "no tickets".
            ticketsFailure = (error as? LocalizedError)?.errorDescription ?? "The client ticket board is not reachable."
        }
        custom = (try? await customTask) ?? []

        rebuild()

        if bugsFailure != nil && tickets.isEmpty && custom.isEmpty {
            state = .error(bugsFailure ?? "The tracker could not be loaded.")
        } else {
            state = .ready
        }
    }

    private func rebuild() {
        boards = TrackerStore.boards(bugs: bugs, tickets: tickets, custom: custom)
        if !boards.contains(where: { $0.id == activeBoardID }) {
            activeBoardID = TrackerBoard.cv6ID
        }
        issues = issuesForActiveBoard()
    }

    private func issuesForActiveBoard() -> [TrackerIssue] {
        TrackerStore.issues(for: activeBoardID, bugs: bugs, tickets: tickets, custom: custom)
    }

    // MARK: - Derivation (pure, so it is testable without a network)

    nonisolated static func boards(bugs: [BugRow], tickets: [TicketRow], custom: [CustomTracker]) -> [TrackerBoard] {
        let openBugs = bugs.filter { IssueStatus.parse($0.status) != .done }
        let openTickets = tickets.filter { IssueStatus.parse($0.status) != .done }
        var out: [TrackerBoard] = [
            TrackerBoard(id: TrackerBoard.cv6ID, name: "CV6 Bugs", scope: "Corner CV6", kind: .bugs, openCount: openBugs.count),
            TrackerBoard(id: TrackerBoard.spaceID, name: "Space Rising", scope: "Client tickets", kind: .tickets, openCount: openTickets.count),
        ]
        // Project trackers first, then mission-scoped ones — the switcher's own grouping.
        out.append(contentsOf: custom.filter { !$0.isMissionScoped }.map(\.board))
        out.append(contentsOf: custom.filter { $0.isMissionScoped }.map(\.board))
        return out
    }

    nonisolated static func issues(
        for boardID: String,
        bugs: [BugRow],
        tickets: [TicketRow],
        custom: [CustomTracker]
    ) -> [TrackerIssue] {
        switch boardID {
        case TrackerBoard.cv6ID:
            // Open work first, done last — an active board must not open on a wall of
            // closed bugs. Within open work, the blocker sorts above the polish, which is
            // the whole reason the priority mapping was rewritten.
            return bugs.map(\.asIssue).sorted {
                if $0.status != $1.status { return statusRank($0.status) < statusRank($1.status) }
                return $0.priority.rank < $1.priority.rank
            }
        case TrackerBoard.spaceID:
            return tickets.map(\.asIssue).sorted {
                if $0.status != $1.status { return statusRank($0.status) < statusRank($1.status) }
                return $0.updated > $1.updated
            }
        default:
            return custom.first { $0.id == boardID }?.issues ?? []
        }
    }

    nonisolated static func statusRank(_ status: IssueStatus) -> Int {
        switch status {
        case .open: return 0
        case .progress: return 1
        case .done: return 2
        }
    }

    /// Why this board has nothing on it — the difference between "cleared" and "the
    /// endpoint refused", which an empty list alone cannot express.
    var emptyReason: String? {
        guard issues.isEmpty else { return nil }
        switch activeBoardID {
        case TrackerBoard.cv6ID:  return bugsFailure
        case TrackerBoard.spaceID: return ticketsFailure
        default: return nil
        }
    }

    func switchBoard(_ id: String) {
        guard activeBoardID != id else { return }
        activeBoardID = id
        issues = issuesForActiveBoard()
    }

    // MARK: - Writes

    /// Change an issue's status. CV6 board only — the tickets board is someone else's
    /// system and a custom row has no id-addressable cell (see TrackerModels' header).
    @discardableResult
    func setStatus(_ status: IssueStatus, on issue: TrackerIssue) async -> Bool {
        guard activeBoard?.canEditIssue == true, !writing.contains(issue.id) else { return false }
        writing.insert(issue.id)
        defer { writing.remove(issue.id) }

        let previous = bugs
        applyLocally(id: issue.id) { $0.status = status.wireValue }
        do {
            try await api.updateBug(id: issue.id, status: status.wireValue, owner: nil)
            await load()
            return true
        } catch {
            bugs = previous
            rebuild()
            let reason = (error as? LocalizedError)?.errorDescription ?? "The server refused it."
            notice = Notice(text: "That status change did not save — \(reason)", isFailure: true)
            return false
        }
    }

    /// File a new issue. CV6 board → the bug store; a custom tracker → an appended row
    /// against its own columns. Returns false without touching anything when the board
    /// cannot take one.
    @discardableResult
    func createIssue(title: String, detail: String, priority: IssuePriority, status: IssueStatus, owner: String) async -> Bool {
        guard let board = activeBoard, board.canAddIssue else { return false }
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty else { return false }

        do {
            switch board.kind {
            case .bugs:
                try await api.addBug(
                    title: cleanTitle,
                    expected: detail,
                    severity: priority == .high ? "high" : (priority == .low ? "low" : "medium"),
                    status: status.wireValue,
                    owner: owner
                )
            case .custom(let columns):
                // Fill the tracker's OWN columns: first column takes the title, a Status
                // column takes the status, anything else that looks like a description
                // takes the detail. A column the form has nothing for is left empty
                // rather than stuffed with a value that means something else.
                var row: [String: String] = [:]
                if let first = columns.first { row[first] = cleanTitle }
                for column in columns.dropFirst() {
                    switch column.lowercased() {
                    case "status": row[column] = status.wireValue
                    case "priority": row[column] = priority.label
                    case "notes", "detail", "details", "description": row[column] = detail
                    default: break
                    }
                }
                if !owner.isEmpty { row["__assignee"] = owner }
                try await api.addTrackerRow(trackerID: board.id, row: row)
            case .tickets:
                return false
            }
            await load()
            notice = Notice(text: "Filed \"\(cleanTitle)\".", isFailure: false)
            return true
        } catch {
            let reason = (error as? LocalizedError)?.errorDescription ?? "The server refused it."
            notice = Notice(text: "That issue was not filed — \(reason)", isFailure: true)
            return false
        }
    }

    /// Stamp the assigned agent's TITLE onto a CV6 row after the dispatch message landed.
    /// Best-effort by design: the assignment already happened in the agent's room, and a
    /// failed stamp must not be reported as a failed assignment.
    func stampOwner(_ owner: String, on issueID: String) async {
        guard activeBoard?.canEditIssue == true else { return }
        applyLocally(id: issueID) { $0.owner = owner }
        do {
            try await api.updateBug(id: issueID, status: nil, owner: owner)
            await load()
        } catch {
            notice = Notice(
                text: "The agent has the assignment; the board did not record the owner. It will still show unassigned.",
                isFailure: true
            )
        }
    }

    /// Mutate one decoded bug row in place and re-derive. `BugRow` is a decoded value
    /// type, so the edit is expressed as a re-encode of the fields the UI shows.
    private func applyLocally(id: String, _ change: (inout MutableBug) -> Void) {
        guard let index = bugs.firstIndex(where: { $0.id == id }) else { return }
        var mutable = MutableBug(row: bugs[index])
        change(&mutable)
        bugs[index] = mutable.asRow
        issues = issuesForActiveBoard()
    }

    /// The handful of fields an optimistic edit touches. Kept separate from `BugRow` so
    /// the decoded shape stays a faithful mirror of the wire and nothing can confuse a
    /// local guess with what the server said.
    private struct MutableBug {
        var status: String
        var owner: String
        private let source: BugRow

        init(row: BugRow) {
            self.source = row
            self.status = row.status
            self.owner = row.owner
        }

        var asRow: BugRow {
            BugRow(
                id: source.id,
                page: source.page,
                title: source.title,
                expected: source.expected,
                severity: source.severity,
                status: status,
                owner: owner,
                priority: source.priority,
                notes: source.notes
            )
        }
    }
}

extension BugRow {
    /// Memberwise init for the optimistic path. The decoder above stays the ONLY way a
    /// row is built from the wire.
    init(id: String, page: String, title: String, expected: String, severity: String, status: String, owner: String, priority: Int?, notes: String) {
        self.id = id
        self.page = page
        self.title = title
        self.expected = expected
        self.severity = severity
        self.status = status
        self.owner = owner
        self.priority = priority
        self.notes = notes
    }
}
