// TrackerTests.swift — Corner native iOS
// corner:native-ios Stage 3
//
// The boards, against the rows the three endpoints actually return.
//
// Every fixture here is copied from a live read on 2026-08-10: the CV6 board's 107 rows
// (severities High/Low/Medium/None/blocker/bug/feature/high/med/polish, numeric priority
// 1–5), Space Rising's five tickets (needs_fix / in_review, medium / high), and the three
// custom trackers (template "mission", columns ["Item","Status"], one row each).

import XCTest
@testable import Corner

final class TrackerTests: XCTestCase {

    private func bugs(_ json: String) throws -> [BugRow] {
        try XCTUnwrap(JSONDecoder().decode(BugsEnvelope.self, from: Data(json.utf8)).bugs)
    }

    // MARK: - The bug board

    func testLiveBugRowDecodes() throws {
        let rows = try bugs("""
        {"bugs":[{"id":"hp-2","page":"Homepage","owner":"EA",
          "title":"Clicking an active-work card jumped straight to the full chat",
          "status":"Done","added_by":"patrik",
          "expected":"Single click opens the conversation and quick reply; double click opens the Chat tool",
          "priority":1,"severity":"High"}]}
        """)
        let issue = try XCTUnwrap(rows.first).asIssue
        XCTAssertEqual(issue.id, "hp-2")
        XCTAssertEqual(issue.status, .done)
        XCTAssertEqual(issue.priority, .high)
        XCTAssertEqual(issue.owner, "EA")
        XCTAssertEqual(issue.area, "Homepage")
        XCTAssertTrue(issue.detail.hasPrefix("Expected: "), "the expected result is what \"fixed\" means")
    }

    /// THE DIVERGENCE FROM THE WEB, PINNED. severityToPriority() in useCommandTracker.js
    /// maps everything that is not high/critical/1/2/low/4/5 to medium — so a `blocker`
    /// renders identically to a `polish`. Both are live severities on the real board.
    func testABlockerIsNotAMediumAndPolishIsNotEither() throws {
        XCTAssertEqual(IssuePriority.resolve(severity: "blocker", numeric: nil), .high)
        XCTAssertEqual(IssuePriority.resolve(severity: "critical", numeric: nil), .high)
        XCTAssertEqual(IssuePriority.resolve(severity: "polish", numeric: nil), .low)
        XCTAssertEqual(IssuePriority.resolve(severity: "High", numeric: 1), .high)
        XCTAssertEqual(IssuePriority.resolve(severity: "Low", numeric: 5), .low)
        XCTAssertEqual(IssuePriority.resolve(severity: "med", numeric: 3), .medium)
    }

    /// `bug`, `feature` and `None` say what a row IS, not how urgent it is. The numeric
    /// column is the only ranking left, and the web throws it away entirely.
    func testAWordThatIsNotAnUrgencyFallsBackToTheNumericRank() {
        XCTAssertEqual(IssuePriority.resolve(severity: "bug", numeric: 1), .high)
        XCTAssertEqual(IssuePriority.resolve(severity: "feature", numeric: 5), .low)
        XCTAssertEqual(IssuePriority.resolve(severity: "None", numeric: 3), .medium)
        XCTAssertEqual(IssuePriority.resolve(severity: "None", numeric: nil), .medium)
        XCTAssertEqual(IssuePriority.resolve(severity: "", numeric: nil), .medium)
    }

    /// Open work first, and within it the urgent above the cosmetic. A board that opens
    /// on a wall of closed bugs, or sorts a blocker under a typo, is not triageable.
    func testOpenWorkSortsFirstAndBlockersSortAboveCosmetics() throws {
        let rows = try bugs("""
        {"bugs":[
          {"id":"1","title":"Closed thing","status":"Done","severity":"blocker","priority":1},
          {"id":"2","title":"Cosmetic","status":"Open","severity":"polish","priority":5},
          {"id":"3","title":"Blocker","status":"Open","severity":"blocker","priority":1},
          {"id":"4","title":"Being worked","status":"In progress","severity":"high","priority":2}
        ]}
        """)
        let ordered = TrackerStore.issues(for: TrackerBoard.cv6ID, bugs: rows, tickets: [], custom: [])
        XCTAssertEqual(ordered.map(\.id), ["3", "2", "4", "1"])
    }

    /// The endpoint validates status against three literals and 400s anything else, so
    /// the wire values are spelled out rather than derived from the case name.
    func testStatusWireValuesMatchWhatTheEndpointAccepts() {
        XCTAssertEqual(IssueStatus.open.wireValue, "Open")
        XCTAssertEqual(IssueStatus.progress.wireValue, "In progress")
        XCTAssertEqual(IssueStatus.done.wireValue, "Done")
    }

    // MARK: - The client ticket board

    func testTicketKeepsTheClientsOwnVocabulary() throws {
        let envelope = try JSONDecoder().decode(TicketsEnvelope.self, from: Data("""
        {"tickets":[{"id":"281ffab5-f5b0-4834-9bbc-265e92ed1389","title":"Team Page",
          "description":"1) OUR VISION: …","status":"needs_fix","priority":"high","owner":"",
          "area":"","link":"https://www.spacerising.org/srw-v2/about",
          "updatedAt":"2026-06-26T01:37:42.80643+00:00"}]}
        """.utf8))
        let issue = try XCTUnwrap(envelope.tickets?.first).asIssue
        XCTAssertEqual(issue.statusLabel, "Needs fix", "their word, not ours")
        XCTAssertEqual(issue.status, .open, "…and our own state for sorting")
        XCTAssertEqual(issue.priority, .high)
        XCTAssertEqual(issue.area, "Space Rising", "an empty area still says whose board this is")
        XCTAssertFalse(issue.link.isEmpty)
    }

    /// `in_review` is work in flight, not work waiting. Filing it under Open would put a
    /// ticket somebody is already reviewing at the top of the queue.
    func testInReviewIsProgressNotOpen() {
        XCTAssertEqual(IssueStatus.parse("in_review"), .progress)
        XCTAssertEqual(IssueStatus.parse("working"), .progress)
        XCTAssertEqual(IssueStatus.parse("needs_fix"), .open)
    }

    func testTheClientBoardIsReadOnlyAndSaysSo() {
        let boards = TrackerStore.boards(bugs: [], tickets: [], custom: [])
        let space = try? XCTUnwrap(boards.first { $0.id == TrackerBoard.spaceID })
        XCTAssertEqual(space?.isReadOnly, true)
        XCTAssertEqual(space?.canAddIssue, false)
        XCTAssertEqual(space?.canEditIssue, false)
    }

    // MARK: - Custom trackers

    /// The web sets `listBugs = []` for every custom board and prints "No bugs in this
    /// tracker" over rows that exist. All three live trackers have a row.
    func testACustomTrackersRowsAreRendered() throws {
        let envelope = try JSONDecoder().decode(CustomTrackersEnvelope.self, from: Data("""
        {"trackers":[{"id":"trk-mqtsmlvc7g","on":false,"name":"Design Hook",
          "rows":[{"Item":"Idle, no open tasks, nothing shipped in last 24h.","__id":"row-mqtsmm5v38h","Status":"Open"}],
          "scope":"Agent Hooks","columns":["Item","Status"],
          "created":"2026-06-25T17:45:53.976Z","updated":"2026-06-25T17:45:54.355Z","template":"mission"}]}
        """.utf8))
        let tracker = try XCTUnwrap(envelope.trackers?.first)
        XCTAssertTrue(tracker.isMissionScoped)
        let issues = TrackerStore.issues(for: tracker.id, bugs: [], tickets: [], custom: [tracker])
        XCTAssertEqual(issues.count, 1)
        XCTAssertEqual(issues.first?.id, "row-mqtsmm5v38h", "the row's own id, so it is stable across a reload")
        XCTAssertEqual(issues.first?.title, "Idle, no open tasks, nothing shipped in last 24h.")
        XCTAssertEqual(issues.first?.status, .open)
        XCTAssertEqual(issues.first?.columns.map(\.0), ["Item", "Status"], "the tracker's OWN columns, in its own order")
    }

    /// A cell holding a number or a boolean is a real cell. Dropping it would show a row
    /// that looks empty next to a tracker that is not.
    func testNonStringCellsSurvive() throws {
        let envelope = try JSONDecoder().decode(CustomTrackersEnvelope.self, from: Data("""
        {"trackers":[{"id":"t1","name":"Counts","scope":"","template":"project",
          "columns":["Item","Hits","Live"],
          "rows":[{"Item":"Hook fires","Hits":42,"Live":true,"__id":"r1"}]}]}
        """.utf8))
        let tracker = try XCTUnwrap(envelope.trackers?.first)
        let columns = try XCTUnwrap(tracker.issues.first).columns
        XCTAssertEqual(columns.map(\.0), ["Item", "Hits", "Live"])
        XCTAssertEqual(columns.map(\.1), ["Hook fires", "42", "true"])
    }

    /// A custom tracker takes an appended row but has no addressable cell — the endpoint
    /// edits by positional index into shared mutable state, which can land on the wrong
    /// row. The UI must not offer a control that can mis-target.
    func testACustomBoardCanBeAddedToButNotEdited() throws {
        let envelope = try JSONDecoder().decode(CustomTrackersEnvelope.self, from: Data("""
        {"trackers":[{"id":"t1","name":"Follow-ups","scope":"Ops","template":"project","columns":["Item","Status"],"rows":[]}]}
        """.utf8))
        let tracker = try XCTUnwrap(envelope.trackers?.first)
        let board = tracker.board
        XCTAssertTrue(board.canAddIssue)
        XCTAssertFalse(board.canEditIssue)
        XCTAssertFalse(board.isReadOnly)
    }

    // MARK: - Boards

    func testBoardListAlwaysCarriesBothStandingBoardsAndCountsOnlyOpenWork() throws {
        let rows = try bugs("""
        {"bugs":[{"id":"1","title":"a","status":"Open","severity":"high"},
                 {"id":"2","title":"b","status":"Done","severity":"high"}]}
        """)
        let boards = TrackerStore.boards(bugs: rows, tickets: [], custom: [])
        XCTAssertEqual(boards.first?.id, TrackerBoard.cv6ID)
        XCTAssertEqual(boards.first?.openCount, 1, "a closed bug is not open work")
        XCTAssertTrue(boards.contains { $0.id == TrackerBoard.spaceID })
    }

    func testProjectTrackersListBeforeMissionOnes() throws {
        let envelope = try JSONDecoder().decode(CustomTrackersEnvelope.self, from: Data("""
        {"trackers":[
          {"id":"m1","name":"Mission one","scope":"","template":"mission","columns":["Item"],"rows":[]},
          {"id":"p1","name":"Project one","scope":"","template":"project","columns":["Item"],"rows":[]}
        ]}
        """.utf8))
        let boards = TrackerStore.boards(bugs: [], tickets: [], custom: try XCTUnwrap(envelope.trackers))
        XCTAssertEqual(boards.map(\.id), [TrackerBoard.cv6ID, TrackerBoard.spaceID, "p1", "m1"])
    }

    func testAnUnknownBoardShowsNothingRatherThanAnotherBoardsRows() throws {
        let rows = try bugs("""
        {"bugs":[{"id":"1","title":"a","status":"Open","severity":"high"}]}
        """)
        XCTAssertTrue(TrackerStore.issues(for: "trk-does-not-exist", bugs: rows, tickets: [], custom: []).isEmpty)
    }

    func testOwnerInitialsNeverRenderEmpty() {
        func issue(_ owner: String) -> TrackerIssue {
            TrackerIssue(id: "1", title: "t", status: .open, statusLabel: "Open", priority: .medium,
                         owner: owner, area: "", detail: "", updated: "", link: "", columns: [])
        }
        XCTAssertEqual(issue("Patrik Matheson").ownerInitials, "PM")
        XCTAssertEqual(issue("EA").ownerInitials, "EA")
        XCTAssertEqual(issue("").ownerInitials, "·")
    }
}
