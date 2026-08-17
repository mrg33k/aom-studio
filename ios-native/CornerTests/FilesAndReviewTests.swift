// FilesAndReviewTests.swift — Corner native iOS
// corner:native-ios Stage 2
//
// The crossings model, the byte-source resolver, the review queue decoder, and the
// notification payload — the four places where being subtly wrong is invisible until a
// real file or a real verdict goes missing.

import XCTest
@testable import Corner

final class FilesAndReviewTests: XCTestCase {

    private func row(_ json: String) throws -> MessageRow {
        try JSONDecoder().decode(MessageRow.self, from: Data(json.utf8))
    }

    // MARK: - Crossings

    func testCrossingsSplitByDirectionAndSortNewestFirst() throws {
        let rows = [
            try row("""
            {"id":"1","role":"assistant","agent":"steffen","timestamp":"2026-08-09T10:00:00Z",
             "metadata":{"attachment":{"url":"https://x/one.png","name":"one.png","mime":"image/png"}}}
            """),
            try row("""
            {"id":"2","role":"user","user_name":"Patrik","timestamp":"2026-08-09T12:00:00Z",
             "metadata":{"attachment":{"url":"https://x/mine.png","name":"mine.png","mime":"image/png"}}}
            """),
        ]
        let files = RoomFile.crossings(in: rows, roomTitle: "Design")
        XCTAssertEqual(files.count, 2)
        XCTAssertEqual(files.first?.name, "mine.png", "newest first")
        XCTAssertEqual(files.filter { !$0.isUser }.first?.who, "Design",
                       "agents render as their TITLE, never the persona slug")
        XCTAssertEqual(files.filter(\.isUser).first?.who, "You")
    }

    /// A re-share of the same file is one card, not two — but the SAME file you uploaded
    /// and the agent later handed back are two different events and both belong on
    /// screen, which is why direction is part of the dedupe key.
    func testDedupeKeepsBothDirections() throws {
        let rows = [
            try row("""
            {"id":"1","role":"assistant","agent":"corner","timestamp":"2026-08-09T10:00:00Z",
             "metadata":{"attachment":{"url":"https://x/a.png","name":"a.png"}}}
            """),
            try row("""
            {"id":"2","role":"assistant","agent":"corner","timestamp":"2026-08-09T11:00:00Z",
             "metadata":{"attachment":{"url":"https://x/a.png","name":"a.png"}}}
            """),
            try row("""
            {"id":"3","role":"user","user_name":"Patrik","timestamp":"2026-08-09T09:00:00Z",
             "metadata":{"attachment":{"url":"https://x/a.png","name":"a.png"}}}
            """),
        ]
        let files = RoomFile.crossings(in: rows, roomTitle: "Corner")
        XCTAssertEqual(files.count, 2, "two agent shares collapse; the user's own upload stays")
        XCTAssertEqual(files.filter { !$0.isUser }.count, 1)
        XCTAssertEqual(files.filter(\.isUser).count, 1)
    }

    /// A named file with no URL cannot be a crossing card: nothing to open, preview or
    /// export, and a row that does nothing when tapped is worse than one that is absent.
    func testUnreachableNamesAreNotCrossings() throws {
        let files = RoomFile.crossings(
            in: [try row(#"{"id":"1","role":"assistant","text":"Attached 2 files: a.png, b.png"}"#)],
            roomTitle: "Corner"
        )
        XCTAssertTrue(files.isEmpty)
    }

    // MARK: - Byte sources

    func testAbsoluteURLIsTheOnlySourceForAStoreFile() {
        let file = Attachment(url: "https://rag.aheadofmarket.com/files/aom/a.png", name: "a.png", mime: "", size: 0, gateStatus: "")
        let sources = FileStore.sources(for: file)
        XCTAssertEqual(sources.count, 1)
        XCTAssertFalse(sources[0].authorized, "the store host takes no bearer token")
    }

    /// A corner path gets the tunnel first and the authed proxy second — the order
    /// useReview.js::downloadDeliverable proved, for the reason it documents: the proxy
    /// buffers the whole file in a lambda and dies on anything video-sized.
    func testCornerPathTriesTunnelThenAuthedProxy() {
        let file = Attachment(url: "corner/users/aom/projects/x/a.png", name: "a.png", mime: "", size: 0, gateStatus: "")
        let sources = FileStore.sources(for: file)
        XCTAssertEqual(sources.count, 2)
        XCTAssertTrue(sources[0].url.absoluteString.contains("rag.aheadofmarket.com/project-file-raw"))
        XCTAssertFalse(sources[0].authorized)
        XCTAssertTrue(sources[1].url.absoluteString.contains("/api/dashboard/project-file"))
        XCTAssertTrue(sources[1].authorized, "the Vercel proxy is tenant-gated")
        // The path must arrive encoded or a slash ends the query value.
        XCTAssertTrue(sources[0].url.absoluteString.contains("corner%2Fusers%2Faom"))
    }

    func testNoURLMeansNoSources() {
        let file = Attachment(url: "", name: "ghost.png", mime: "", size: 0, gateStatus: "")
        XCTAssertTrue(FileStore.sources(for: file).isEmpty)
    }

    /// Real filenames have spaces. `URL(string:)` returns nil for those, which reads as
    /// "the file is broken" when the file is fine and the string was raw.
    func testURLWithSpacesStillResolves() {
        XCTAssertNotNil(FileStore.encodedURL("https://rag.aheadofmarket.com/files/aom/Q3 report final.pdf"))
    }

    // MARK: - Cache paths

    /// A filename is untrusted input from a server. A path separator in it would write
    /// outside the intended folder.
    func testCacheFilenameCannotEscapeItsFolder() {
        let nasty = Attachment(url: "https://x/evil", name: "../../Library/Preferences/hacked.plist", mime: "", size: 0, gateStatus: "")
        let location = FileStore.cacheLocation(for: nasty)
        XCTAssertFalse(location.path.contains(".."))
        XCTAssertEqual(location.deletingLastPathComponent().deletingLastPathComponent().lastPathComponent, "CornerFiles")
    }

    func testCacheKeepsTheRealExtension() {
        let file = Attachment(url: "https://x/a/report.pdf", name: "report.pdf", mime: "", size: 0, gateStatus: "")
        XCTAssertEqual(FileStore.cacheLocation(for: file).pathExtension, "pdf",
                       "QuickLook types the document by extension — losing it loses the preview")
    }

    /// Two agents both delivering `report.pdf` are two different files.
    func testSameNameDifferentURLGetsADifferentCachePath() {
        let a = Attachment(url: "https://x/one/report.pdf", name: "report.pdf", mime: "", size: 0, gateStatus: "")
        let b = Attachment(url: "https://x/two/report.pdf", name: "report.pdf", mime: "", size: 0, gateStatus: "")
        XCTAssertNotEqual(FileStore.cacheLocation(for: a), FileStore.cacheLocation(for: b))
    }

    func testHiddenFilenameIsUnhidden() {
        XCTAssertEqual(FileStore.safeFilename(".env"), "env")
        XCTAssertEqual(FileStore.safeFilename(""), "file")
    }

    // MARK: - Review queue decoding

    /// The live response shape (api/_lib/reviewTruth.js + fileRefToReviewQueueItem):
    /// `path`, a `type` OBJECT, and explicitly nullable mime/mission.
    func testReviewQueueDecodesTheRealShape() throws {
        let envelope = try JSONDecoder().decode(ReviewQueueEnvelope.self, from: Data("""
        {"items":[
          {"name":"deck.pdf","path":"https://rag.aheadofmarket.com/files/aom/deck.pdf",
           "project":"ambition","mission":null,"kind":"deliverable",
           "type":{"key":"doc","label":"Document","color":"#0066FF"},
           "mime":null,"size":18422,"source_kind":"handoff",
           "source_path":"/Users/x/AOM-EA/corner/users/aom/projects/ambition/deck.pdf",
           "sha256":"aa11bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00112233",
           "last_modified":"2026-08-09T18:00:00.000Z","health_status":"ready"}],
         "total":7,"offset":0,"hasMore":false,"newest_ts":"2026-08-09T18:00:00.000Z",
         "counts":{"waiting":7,"decided":31}}
        """.utf8))
        let item = try XCTUnwrap(envelope.items?.first)
        XCTAssertEqual(item.name, "deck.pdf")
        XCTAssertEqual(item.mime, "", "a null mime decodes to empty, not to a thrown item")
        XCTAssertEqual(item.mission, "")
        XCTAssertEqual(item.kind, .pdf, "the extension types it when the server sends no mime")
        XCTAssertTrue(item.isAgentHandoff)
        XCTAssertEqual(envelope.total, 7)
        XCTAssertEqual(item.location, "ambition")
    }

    /// useReview.js reads `it.id || it.path` because the field has moved once. Accepting
    /// only one of them is how a queue silently renders rows with no identity — and an
    /// item with no id cannot carry a verdict.
    func testReviewItemAcceptsIdInsteadOfPath() throws {
        let item = try JSONDecoder().decode(ReviewItem.self, from: Data("""
        {"id":"https://x/a.png","name":"a.png","project":"corner"}
        """.utf8))
        XCTAssertEqual(item.path, "https://x/a.png")
        XCTAssertEqual(item.id, "https://x/a.png")
    }

    func testReviewItemWithoutANameFallsBackToTheFilename() throws {
        let item = try JSONDecoder().decode(ReviewItem.self, from: Data(#"{"path":"https://x/a/final%20cut.mp4"}"#.utf8))
        XCTAssertEqual(item.name, "final cut.mp4")
        XCTAssertEqual(item.kind, .video)
    }

    func testOnlyDismissIsReversible() {
        XCTAssertTrue(ReviewAction.dismiss.isReversible)
        XCTAssertFalse(ReviewAction.approve.isReversible)
        XCTAssertFalse(ReviewAction.requestChanges.isReversible)
    }

    // MARK: - Room review scoping

    /// review-decision.js canonicalises "<project>:<mission>" itself and its own comment
    /// records that handing it an already-composite slug double-prefixed the result.
    func testMissionRoomSendsTheBareLeaf() {
        let room = Room(world: "aom", kind: .mission(slug: "corner:native-ios", project: "corner"), title: "Native iOS", subtitle: "")
        XCTAssertEqual(room.reviewMission, "native-ios")
        XCTAssertEqual(room.reviewProject, "corner")
    }

    /// An agent 1:1 has no project. Sending an empty one lets the endpoint derive it
    /// from the deliverable path, which is what it does when the field is absent —
    /// and a WRONG project is a 403 on request-changes, not a cosmetic error.
    func testAgentRoomSendsNoProject() {
        let room = Room(world: "aom", kind: .agent(slug: "steffen"), title: "Design", subtitle: "")
        XCTAssertEqual(room.reviewProject, "")
        XCTAssertEqual(room.reviewMission, "")
    }

    // MARK: - Notification payload

    func testDeliveredFileParsesTheServerPayload() throws {
        let file = try XCTUnwrap(DeliveredFile(userInfo: [
            "room_id": "aom:mission:corner:native-ios",
            "file_url": "https://rag.aheadofmarket.com/files/aom/deck.pdf",
            "file_name": "deck.pdf",
            "project": "corner",
            "mission_slug": "corner:native-ios",
            "file_sha256": "aa11bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00112233",
            "file_source_path": "/Users/x/AOM-EA/corner/missions/native-ios/deck.pdf",
        ]))
        XCTAssertEqual(file.name, "deck.pdf")
        XCTAssertEqual(file.missionLeaf, "native-ios")
        XCTAssertEqual(file.attachment.sha256.count, 64, "content identity rides to the decision")
        XCTAssertEqual(file.attachment.url, file.url)
    }

    /// A push with no file is an ordinary reply. Building a DeliveredFile from it would
    /// put an Approve button on a message about nothing.
    func testOrdinaryPushIsNotADeliveredFile() {
        XCTAssertNil(DeliveredFile(userInfo: ["room_id": "aom:agent:rex", "message_id": "abc"]))
        XCTAssertNil(DeliveredFile(userInfo: ["file_url": "  "]))
    }

    func testDeliveredFileNamesItselfFromTheURLWhenTheServerDidNot() throws {
        let file = try XCTUnwrap(DeliveredFile(userInfo: ["file_url": "https://x/a/Q3%20report.pdf"]))
        XCTAssertEqual(file.name, "Q3 report.pdf")
    }

    // MARK: - The review count is the backlog, never the page size

    /// THE regression. A 247-file backlog fetched a page at a time must read 247 — the
    /// old chip read `items.count`, so it printed "100" and then sat motionless while
    /// the user cleared items, which is how a badge teaches people to distrust it.
    func testWaitingCountIsTheServerTotalNotThePageSize() {
        XCTAssertEqual(ReviewStore.count(total: 247, loaded: 100), 247)
        XCTAssertEqual(ReviewStore.label(total: 247, loaded: 100, totalIsFromServer: true), "247")
        XCTAssertEqual(
            ReviewStore.sentence(total: 247, loaded: 100, totalIsFromServer: true),
            "247 files need your review"
        )
    }

    /// A full page and no server total is the one case where we genuinely do not know.
    /// Printing the limit as if it were a count is the lie; "99+" is the truth.
    func testFullPageWithNoServerTotalReadsAsApproximate() {
        XCTAssertTrue(ReviewStore.isApproximate(loaded: ReviewStore.pageLimit, totalIsFromServer: false))
        XCTAssertEqual(ReviewStore.label(total: 100, loaded: 100, totalIsFromServer: false), "99+")
        XCTAssertEqual(
            ReviewStore.sentence(total: 100, loaded: 100, totalIsFromServer: false),
            "99+ files need your review"
        )
    }

    /// A short page is exact whether or not the server sent a total — there is nothing
    /// beyond it to be wrong about.
    func testShortPageIsExact() {
        XCTAssertFalse(ReviewStore.isApproximate(loaded: 7, totalIsFromServer: false))
        XCTAssertEqual(ReviewStore.label(total: 7, loaded: 7, totalIsFromServer: true), "7")
        XCTAssertEqual(ReviewStore.sentence(total: 1, loaded: 1, totalIsFromServer: true), "1 file needs your review")
    }
}
