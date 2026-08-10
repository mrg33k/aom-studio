// TrackerModels.swift — Corner native iOS
// corner:native-ios Stage 3
//
// The Tracker surface: boards, and the issues on them.
//
// THREE KINDS OF BOARD, THREE ENDPOINTS, one screen (cv6next/data/useCommandTracker.js):
//   1. CV6 Bugs      GET/POST /api/dashboard/cv6-bugs      — the product's own board,
//                                                            editable (status + owner)
//   2. Space Rising  GET      /api/dashboard/admin-tickets  — a client's live ticket
//                                                            board, READ ONLY by design
//   3. Custom        GET/POST /api/dashboard/trackers       — the spreadsheets a user
//                                                            builds, arbitrary columns
//
// SEVERITY IS FREE TEXT AND THE WEB'S MAPPING LOSES BLOCKERS. severityToPriority() in
// useCommandTracker.js maps 'high'/'critical'/'1'/'2' to high, 'low'/'4'/'5' to low and
// EVERYTHING ELSE to medium. The live board (107 rows, read 2026-08-10) carries these
// severity values: High, Low, Medium, None, blocker, bug, feature, high, med, polish.
// So a bug filed as a **blocker** renders as "Med" on the web, indistinguishable from a
// typo fix. The rows also carry a numeric `priority` (1–5) that the web ignores entirely
// even though it is the actually-ranked field — the High-severity row is priority 1 and
// the Low one is priority 5. Here: the severity word wins when it means something
// (blocker and critical included), the numeric priority is the fallback, and only then
// medium. A board where the blocker sorts with the polish is a board nobody triages from.
//
// A CUSTOM TRACKER'S ROWS ARE REAL AND THE WEB DOES NOT SHOW THEM. useCommandTracker.js
// sets `listBugs = []` for any custom board with the comment "a freshly-created custom
// tracker is an honest empty board" — but all three live custom trackers have rows in
// them right now, and the web prints "No bugs in this tracker" over the top. Those rows
// are rendered here against the tracker's own columns.
//
// WHAT IS DELIBERATELY NOT WIRED: editing a cell on a custom tracker. The endpoint
// addresses a row by POSITIONAL INDEX (`rowIdx`) and the rows array is shared mutable
// state — if anything appends or deletes between the read and the write, the edit lands
// on a different row. Appending (`add-row`) is safe because it cannot mis-target, so
// that is what this app offers. A silent wrong-row write is worse than a missing button.

import Foundation

// MARK: - Boards

struct TrackerBoard: Identifiable, Equatable, Hashable {
    enum Kind: Equatable, Hashable {
        /// The CV6 bug board. Add and update are live.
        case bugs
        /// Space Rising's ticket board — read only, and labelled as such.
        case tickets
        /// A user-built tracker with arbitrary columns. Append only.
        case custom(columns: [String])
    }

    let id: String
    let name: String
    let scope: String
    let kind: Kind
    /// Open items, for the switcher's count. Zero is shown as blank rather than "0" —
    /// a cleared board should read as cleared, not as broken.
    let openCount: Int

    static let cv6ID = "cv6"
    static let spaceID = "space-rising"

    var isReadOnly: Bool {
        if case .tickets = kind { return true }
        return false
    }

    var canAddIssue: Bool { !isReadOnly }

    /// Only the CV6 board persists a status or an owner change; the tickets board is a
    /// mirror of someone else's system, and a custom tracker has no id-addressable cell.
    var canEditIssue: Bool {
        if case .bugs = kind { return true }
        return false
    }
}

// MARK: - Issues

enum IssueStatus: String, CaseIterable, Equatable {
    case open, progress, done

    /// The literal the cv6-bugs endpoint validates against (`ALLOWED_STATUS`). Sending
    /// anything else is a 400, so the wire value is spelled out rather than derived.
    var wireValue: String {
        switch self {
        case .open:     return "Open"
        case .progress: return "In progress"
        case .done:     return "Done"
        }
    }

    var label: String { wireValue }

    static func parse(_ raw: String) -> IssueStatus {
        switch raw.lowercased() {
        case "done", "closed", "fixed", "resolved": return .done
        case "in progress", "in_progress", "progress", "working", "in review", "in_review", "doing":
            return .progress
        default: return .open
        }
    }
}

enum IssuePriority: String, Equatable {
    case high, medium, low

    var label: String {
        switch self {
        case .high:   return "High"
        case .medium: return "Med"
        case .low:    return "Low"
        }
    }

    var rank: Int {
        switch self {
        case .high: return 0
        case .medium: return 1
        case .low: return 2
        }
    }

    /// The severity word first, the numeric rank second, medium last. See the header:
    /// the web drops 'blocker' into medium and throws the numeric field away.
    static func resolve(severity: String, numeric: Int?) -> IssuePriority {
        switch severity.lowercased().trimmingCharacters(in: .whitespaces) {
        case "blocker", "critical", "urgent", "high", "1", "2":
            return .high
        case "low", "polish", "nit", "trivial", "4", "5":
            return .low
        case "medium", "med", "normal", "3":
            return .medium
        default:
            // 'bug', 'feature', 'None', '' — words that say what a thing IS, not how
            // urgent it is. The numeric field is the only ranking left.
            guard let numeric else { return .medium }
            if numeric <= 2 { return .high }
            if numeric >= 4 { return .low }
            return .medium
        }
    }
}

struct TrackerIssue: Identifiable, Equatable {
    let id: String
    let title: String
    let status: IssueStatus
    /// The board's own word for the status, kept because Space Rising's vocabulary
    /// ("Needs fix", "In review") is not ours to rewrite.
    let statusLabel: String
    let priority: IssuePriority
    let owner: String
    let area: String
    let detail: String
    let updated: String
    /// Present on a Space Rising ticket: where the ticket points on the live site.
    let link: String
    /// Custom-tracker rows are column/value pairs, and the columns differ per tracker.
    let columns: [(String, String)]

    static func == (lhs: TrackerIssue, rhs: TrackerIssue) -> Bool {
        lhs.id == rhs.id
            && lhs.title == rhs.title
            && lhs.status == rhs.status
            && lhs.statusLabel == rhs.statusLabel
            && lhs.priority == rhs.priority
            && lhs.owner == rhs.owner
            && lhs.detail == rhs.detail
            && lhs.updated == rhs.updated
            && lhs.columns.map(\.0) == rhs.columns.map(\.0)
            && lhs.columns.map(\.1) == rhs.columns.map(\.1)
    }

    var ownerInitials: String {
        let parts = owner.split(separator: " ").filter { !$0.isEmpty }
        if parts.count >= 2 { return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased() }
        if let first = parts.first { return String(first.prefix(2)).uppercased() }
        return "·"
    }
}

// MARK: - Wire shapes

/// GET /api/dashboard/cv6-bugs → `{ bugs: [...] }`
struct BugRow: Decodable {
    let id: String
    let page: String
    let title: String
    let expected: String
    let severity: String
    let status: String
    let owner: String
    let priority: Int?
    let notes: String

    enum CodingKeys: String, CodingKey {
        case id, page, title, expected, severity, status, owner, priority, notes, note
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func str(_ key: CodingKeys) -> String { (try? c.decodeIfPresent(String.self, forKey: key)) ?? "" }
        id = str(.id)
        page = str(.page)
        title = str(.title)
        expected = str(.expected)
        severity = str(.severity)
        status = str(.status)
        owner = str(.owner)
        // `priority` is an int on every live row, but the column is untyped storage —
        // accept a numeric string too rather than lose the only ranked field to a
        // type mismatch nobody would ever see.
        if let n = try? c.decodeIfPresent(Int.self, forKey: .priority) {
            priority = n
        } else if let s = try? c.decodeIfPresent(String.self, forKey: .priority) {
            priority = Int(s)
        } else {
            priority = nil
        }
        let long = str(.notes)
        notes = long.isEmpty ? str(.note) : long
    }

    var asIssue: TrackerIssue {
        let detail = [expected.isEmpty ? "" : "Expected: \(expected)", notes]
            .filter { !$0.isEmpty }
            .joined(separator: "\n\n")
        return TrackerIssue(
            id: id,
            title: title.isEmpty ? (page.isEmpty ? "Untitled" : page) : title,
            status: IssueStatus.parse(status),
            statusLabel: status.isEmpty ? "Open" : status,
            priority: IssuePriority.resolve(severity: severity, numeric: priority),
            owner: owner,
            area: page,
            detail: detail,
            updated: "",
            link: "",
            columns: []
        )
    }
}

struct BugsEnvelope: Decodable { let bugs: [BugRow]? }

/// GET /api/dashboard/admin-tickets → `{ tickets: [...] }`
struct TicketRow: Decodable {
    let id: String
    let title: String
    let description: String
    let status: String
    let priority: String
    let owner: String
    let area: String
    let link: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, description, status, priority, owner, area, link, updatedAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func str(_ key: CodingKeys) -> String { (try? c.decodeIfPresent(String.self, forKey: key)) ?? "" }
        if let s = try? c.decodeIfPresent(String.self, forKey: .id) {
            id = s
        } else if let n = try? c.decodeIfPresent(Int.self, forKey: .id) {
            id = String(n)
        } else {
            id = ""
        }
        title = str(.title)
        description = str(.description)
        status = str(.status)
        priority = str(.priority)
        owner = str(.owner)
        area = str(.area)
        link = str(.link)
        updatedAt = str(.updatedAt)
    }

    /// Space Rising's own status vocabulary, preserved. `needs_fix` is not "Open" to the
    /// people who filed it, and rewriting another team's words into ours makes the board
    /// harder to talk about across the two systems, not easier.
    private var ticketStatusLabel: String {
        switch status.lowercased() {
        case "needs_fix":  return "Needs fix"
        case "working":    return "Working"
        case "in_review":  return "In review"
        case "done":       return "Done"
        default:           return status.isEmpty ? "Open" : status
        }
    }

    var asIssue: TrackerIssue {
        TrackerIssue(
            id: id,
            title: title.isEmpty ? "Untitled" : title,
            status: IssueStatus.parse(status),
            statusLabel: ticketStatusLabel,
            priority: IssuePriority.resolve(severity: priority, numeric: nil),
            owner: owner,
            area: area.isEmpty ? "Space Rising" : area,
            detail: description,
            updated: updatedAt,
            link: link,
            columns: []
        )
    }
}

struct TicketsEnvelope: Decodable { let tickets: [TicketRow]? }

/// GET /api/dashboard/trackers → `{ trackers: [...] }`
struct CustomTracker: Decodable {
    let id: String
    let name: String
    let scope: String
    let template: String
    let columns: [String]
    let rows: [[String: String]]
    let updated: String

    enum CodingKeys: String, CodingKey {
        case id, name, scope, template, columns, rows, updated
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func str(_ key: CodingKeys) -> String { (try? c.decodeIfPresent(String.self, forKey: key)) ?? "" }
        id = str(.id)
        name = str(.name)
        scope = str(.scope)
        template = str(.template)
        columns = (try? c.decodeIfPresent([String].self, forKey: .columns)) ?? []
        updated = str(.updated)
        // Cells are cleaned to strings server-side (`cleanMultiline`), but the store is a
        // free-form jsonb payload — decode through JSONValue so a number or a null in one
        // cell costs that cell, not the tracker.
        let raw = (try? c.decodeIfPresent([JSONValue].self, forKey: .rows)) ?? []
        rows = raw.map { value in
            var out: [String: String] = [:]
            for (key, cell) in value.objectValue ?? [:] {
                // `stringValue` already renders numbers and booleans, so a cell holding
                // 3 or true survives as "3" / "true" instead of vanishing.
                if let text = cell.stringValue { out[key] = text }
            }
            return out
        }
    }

    var isMissionScoped: Bool { template == "mission" }

    var board: TrackerBoard {
        TrackerBoard(
            id: id,
            name: name.isEmpty ? "Tracker" : name,
            scope: scope,
            kind: .custom(columns: columns),
            openCount: rows.count
        )
    }

    /// One row → one issue. The FIRST column is the row's title (the endpoint's own
    /// default column set is ["Item", "Status"], and every live tracker uses it); a
    /// column literally named Status drives the status chip when it is there.
    var issues: [TrackerIssue] {
        rows.enumerated().map { index, row in
            let titleColumn = columns.first ?? "Item"
            let title = row[titleColumn] ?? ""
            let statusRaw = row["Status"] ?? row["status"] ?? ""
            let ordered = columns.compactMap { column -> (String, String)? in
                guard let value = row[column], !value.isEmpty else { return nil }
                return (column, value)
            }
            return TrackerIssue(
                id: row["__id"] ?? "\(id)-row-\(index)",
                title: title.isEmpty ? "Row \(index + 1)" : title,
                status: IssueStatus.parse(statusRaw),
                statusLabel: statusRaw.isEmpty ? "—" : statusRaw,
                priority: IssuePriority.resolve(severity: row["Priority"] ?? "", numeric: nil),
                owner: row["__assignee"] ?? "",
                area: scope,
                detail: "",
                updated: "",
                link: "",
                columns: ordered
            )
        }
    }
}

struct CustomTrackersEnvelope: Decodable { let trackers: [CustomTracker]? }
