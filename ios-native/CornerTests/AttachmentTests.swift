// AttachmentTests.swift — Corner native iOS
// corner:native-ios Stage 2
//
// The attachment parser, against the shapes that are ACTUALLY in the database.
//
// Every fixture below is a real row read out of Supabase on 2026-08-10, trimmed but
// not reshaped — including the ones that break the web's version. Writing fixtures from
// the JS source instead would have tested my reading of the JS, which is not the thing
// that has to be right.

import XCTest
@testable import Corner

final class AttachmentTests: XCTestCase {

    private func row(_ json: String) throws -> MessageRow {
        try JSONDecoder().decode(MessageRow.self, from: Data(json.utf8))
    }

    // MARK: - The four shapes

    /// Shape 2, the most common one on the platform: the watcher's auto-share.
    /// Real row 61b37529-4a10-4250-aa04-ace01a69ac77.
    func testWatcherAutoShare() throws {
        let parsed = Attachment.parse(row: try row("""
        {"id":"61b37529","role":"assistant","agent":"elon","source":"auto-share",
         "text":"Attached file: 2026-08-10.jsonl",
         "metadata":{"attachment":{
            "url":"https://rag.aheadofmarket.com/files/aom/d1142671-2026-08-10.jsonl",
            "mime":"application/octet-stream","name":"2026-08-10.jsonl","size":2816,
            "sha256":"c4862c8558619e69a389ec90baf7285490f70cd535135986e1948b76b3f14d9d"},
          "auto_share":true,
          "source_path":"/Users/aom-inhouse/AOM-EA/corner/users/aom/projects/agent-hooks/logs/2026-08-10.jsonl"}}
        """))
        XCTAssertEqual(parsed.attachments.count, 1)
        let file = try XCTUnwrap(parsed.attachments.first)
        XCTAssertEqual(file.name, "2026-08-10.jsonl")
        XCTAssertEqual(file.size, 2816)
        XCTAssertTrue(parsed.isPure, "text is nothing but the announcement")
        // Identity has to survive the hop or a verdict on this file suppresses one id
        // and nothing else.
        XCTAssertEqual(file.sha256.count, 64)
        XCTAssertTrue(file.sourcePath.hasSuffix("2026-08-10.jsonl"))
    }

    /// Shape 1: a real four-photo upload. Real row 53d380dd.
    func testMultiFileUpload() throws {
        let parsed = Attachment.parse(row: try row("""
        {"id":"53d380dd","role":"user",
         "text":"Attached 4 files: IMG_2966.png, IMG_2967.png, IMG_2968.png, IMG_2969.png\\nhttps://rag.aheadofmarket.com/files/aom/IMG_2966.png\\nhttps://rag.aheadofmarket.com/files/aom/IMG_2967.png\\nhttps://rag.aheadofmarket.com/files/aom/IMG_2968.png\\nhttps://rag.aheadofmarket.com/files/aom/IMG_2969.png",
         "metadata":{"attachments":[
           {"url":"https://rag.aheadofmarket.com/files/aom/IMG_2966.png","mime":"image/jpeg","name":"IMG_2966.png","size":85322},
           {"url":"https://rag.aheadofmarket.com/files/aom/IMG_2967.png","mime":"image/jpeg","name":"IMG_2967.png","size":85735},
           {"url":"https://rag.aheadofmarket.com/files/aom/IMG_2968.png","mime":"image/jpeg","name":"IMG_2968.png","size":94141},
           {"url":"https://rag.aheadofmarket.com/files/aom/IMG_2969.png","mime":"image/jpeg","name":"IMG_2969.png","size":64491}]}}
        """))
        XCTAssertEqual(parsed.attachments.count, 4, "a four-photo drop shows four files, not one")
        XCTAssertTrue(parsed.attachments.allSatisfy { $0.kind == .photo })
        // The announcement lists exactly these four URLs, so the prose adds nothing.
        XCTAssertTrue(parsed.isPure)
    }

    /// Convex stores files directly on the message document, not under a
    /// Supabase-style metadata object. MessageRow must bridge that field back
    /// into the one parser every native file surface shares.
    func testConvexDirectAttachmentsSurviveDecoding() throws {
        let parsed = Attachment.parse(row: try row("""
        {"_id":"convex-file","role":"assistant","agentSlug":"pixel",
         "text":"Attached file: ipad13-chat.png",
         "attachments":[{"url":"https://files.example/ipad13-chat.png","name":"ipad13-chat.png","mime":"image/png","size":9216}]}
        """))
        XCTAssertEqual(parsed.attachments.count, 1)
        XCTAssertEqual(parsed.attachments.first?.name, "ipad13-chat.png")
        XCTAssertEqual(parsed.attachments.first?.url, "https://files.example/ipad13-chat.png")
        XCTAssertEqual(parsed.attachments.first?.kind, .photo)
        XCTAssertTrue(parsed.isPure)
    }

    /// Shape 4a with NO url lines. The names are real; the bytes are not reachable.
    /// The web deliberately stopped pointing the extra names at file 1's URL because
    /// that lied about what you were opening and dedup then swallowed the extra file.
    func testMultiAnnouncementWithoutURLsInventsNothing() {
        let parsed = Attachment.parse(row: try! row("""
        {"id":"m","role":"assistant","text":"Attached 3 files: a.png, b.png, c.png"}
        """))
        XCTAssertEqual(parsed.attachments.count, 3)
        XCTAssertTrue(parsed.attachments.allSatisfy { $0.url.isEmpty },
                      "no URL in the row means no URL on the card — never file 1's")
        XCTAssertFalse(parsed.attachments.contains { $0.isOpenable })
    }

    func testSingleAnnouncementTakesTheURLOnTheNextLine() throws {
        let parsed = Attachment.parse(row: try row("""
        {"id":"s","role":"assistant","text":"Attached file: deck.pdf\\nhttps://rag.aheadofmarket.com/files/aom/deck.pdf"}
        """))
        XCTAssertEqual(parsed.attachments.first?.url, "https://rag.aheadofmarket.com/files/aom/deck.pdf")
        XCTAssertEqual(parsed.attachments.first?.kind, .pdf)
    }

    /// A bare corner path in the announcement is a real reference the file endpoints
    /// can resolve, so it becomes the url.
    func testCornerPathInAnnouncementBecomesTheURL() throws {
        let parsed = Attachment.parse(row: try row("""
        {"id":"c","role":"assistant","text":"Attached file: corner/users/aom/projects/ambition/VISION.md"}
        """))
        XCTAssertEqual(parsed.attachments.first?.url, "corner/users/aom/projects/ambition/VISION.md")
        XCTAssertEqual(parsed.attachments.first?.name, "VISION.md")
    }

    func testProseMentioningAPathIsNotALink() {
        XCTAssertEqual(Attachment.cornerPath(from: "see corner/users/aom/projects/x/VISION.md for details"), "")
        XCTAssertEqual(Attachment.cornerPath(from: "notcorner/users/aom/projects/x/a.md"), "")
    }

    // MARK: - Purity (the web's bug, on purpose)

    /// THE REGRESSION THIS FILE EXISTS FOR. Real row 53894d66: a share-file hand-off
    /// whose text is the agent's actual finding, with an attachment beside it. The web
    /// hardcodes pure:true for this shape and blanks the sentence — the user is left
    /// with a file card and no idea what the agent concluded.
    func testHandoffKeepsTheAgentsOwnSentence() throws {
        let r = try row("""
        {"id":"53894d66","role":"assistant","agent":"corner","source":"auto-share",
         "text":"Disk count finished — 15GB of last year's Adobe is the biggest win.",
         "metadata":{"handoff":true,"gate":{"status":"not_applicable"},
          "attachment":{"url":"https://rag.aheadofmarket.com/files/aom/rooms-2026-08-09.md",
            "mime":"application/octet-stream","name":"rooms-2026-08-09.md","size":6284,
            "sha256":"d2c1c11d7a761c633463e4e1574fbad3b973cdf1390c26e35d9bea7abeac089e",
            "gate_status":"not_applicable"}}}
        """)
        let parsed = Attachment.parse(row: r)
        XCTAssertFalse(parsed.isPure, "a hand-off that says something keeps what it said")

        let content = MessageContent.build(from: r)
        XCTAssertTrue(content.prose.contains("15GB"), "the agent's finding must survive to the bubble")
        XCTAssertEqual(content.attachments.count, 1, "and the file card is there too")
    }

    func testPureAnnouncementDropsTheNote() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"p","role":"assistant","text":"Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/report.pdf","name":"report.pdf"}}}
        """))
        XCTAssertTrue(content.prose.isEmpty, "the card already says everything the note says")
        XCTAssertEqual(content.attachments.count, 1)
    }

    /// An announcement plus a real extra line is not pure — that line is the agent
    /// telling you which version to look at.
    func testAnnouncementPlusRealLineIsNotPure() throws {
        let parsed = Attachment.parse(row: try row("""
        {"id":"x","role":"assistant","text":"Attached file: v2.png\\nhttps://rag.aheadofmarket.com/files/aom/v2.png\\nThe second one is the keeper.",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/v2.png","name":"v2.png"}}}
        """))
        XCTAssertFalse(parsed.isPure)
    }

    // MARK: - No duplicate cards

    /// The announcement's URL line must not ALSO become a link card under the file card
    /// that already opens it.
    func testAttachmentURLDoesNotAlsoBecomeALinkCard() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"d","role":"assistant","text":"Attached file: notes.md\\nhttps://rag.aheadofmarket.com/files/aom/notes.md",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/notes.md","name":"notes.md"}}}
        """))
        XCTAssertEqual(content.attachments.count, 1)
        XCTAssertTrue(content.links.isEmpty, "one file, one card")
    }

    // MARK: - Typing

    func testFileKindIgnoresQueryStrings() {
        // Store thumbnails arrive as `…/render.png?w=440`; taking the last dot-component
        // types that as "440" and a real image renders as a generic file.
        XCTAssertEqual(FileKind.of(name: "", mime: "", url: "https://x/render.png?w=440"), .photo)
        XCTAssertEqual(FileKind.of(name: "cut.mov", mime: ""), .video)
        XCTAssertEqual(FileKind.of(name: "brief.pdf", mime: ""), .pdf)
        XCTAssertEqual(FileKind.of(name: "notes.md", mime: ""), .doc)
        XCTAssertEqual(FileKind.of(name: "thing", mime: ""), .file)
        // mime wins when there is no useful extension.
        XCTAssertEqual(FileKind.of(name: "IMG_0001", mime: "image/heic"), .photo)
    }

    func testDisplayNameStripsQueryAndDecodes() {
        XCTAssertEqual(Attachment.displayName(from: "https://x/a/Q3%20report.pdf?token=1"), "Q3 report.pdf")
        XCTAssertEqual(Attachment.displayName(from: "`corner/users/aom/projects/x/a.md`"), "a.md")
    }

    // MARK: - Announcement matching

    func testAnnouncementMatchers() {
        XCTAssertEqual(Attachment.singleAnnouncement("Attached file: a.png"), "a.png")
        XCTAssertEqual(Attachment.singleAnnouncement("  attached FILE:  a.png "), "a.png")
        XCTAssertNil(Attachment.singleAnnouncement("I attached file: a.png"))
        XCTAssertEqual(Attachment.multiAnnouncement("Attached 2 files: a.png, b.png")?.count, 2)
        XCTAssertNil(Attachment.multiAnnouncement("Attached some files: a.png"))
        XCTAssertNil(Attachment.multiAnnouncement("Attached 2 files:"))
    }

    // MARK: - A row with nothing

    func testOrdinaryMessageHasNoAttachments() throws {
        let parsed = Attachment.parse(row: try row(#"{"id":"n","role":"assistant","text":"Done — pushed to main."}"#))
        XCTAssertTrue(parsed.isEmpty)
        XCTAssertFalse(parsed.isPure, "an ordinary message is not an announcement")
    }

    // MARK: - R20 Bug B: bracket prefix stripping

    /// The "[not reviewed]" prefix that share-file.py prepends must not leak as
    /// literal text in the bubble. The announcement matcher must see through it.
    func testNotReviewedPrefixDoesNotBreakPurity() throws {
        let parsed = Attachment.parse(row: try row("""
        {"id":"nr","role":"assistant",
         "text":"[not reviewed] Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/report.pdf","name":"report.pdf",
                      "gate_status":"fail"}}}
        """))
        XCTAssertTrue(parsed.isPure,
                      "[not reviewed] announcement is still just an announcement")
        XCTAssertEqual(parsed.attachments.count, 1)
    }

    /// The prose side must strip the bracket prefix from displayed text.
    func testNotReviewedPrefixIsStrippedFromProse() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"nr2","role":"assistant",
         "text":"[not reviewed] Attached file: report.pdf\\nhttps://rag.aheadofmarket.com/files/aom/report.pdf",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/report.pdf","name":"report.pdf",
                      "gate_status":"fail"}}}
        """))
        XCTAssertTrue(content.prose.isEmpty,
                      "a pure [not reviewed] announcement should produce no prose")
        XCTAssertEqual(content.attachments.first?.gateStatus, "fail")
    }

    /// A hand-off with real text plus a bracket prefix keeps the text but strips
    /// the prefix.
    func testBracketPrefixStrippedFromHandoffProse() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"nr3","role":"assistant",
         "text":"[not reviewed] Here is the deliverable with your changes applied.",
         "metadata":{"attachment":{"url":"https://rag.aheadofmarket.com/files/aom/v2.pdf","name":"v2.pdf",
                      "gate_status":"fail"}}}
        """))
        XCTAssertFalse(content.prose.contains("[not reviewed]"),
                       "the bracket prefix must never appear in displayed prose")
        XCTAssertTrue(content.prose.contains("deliverable"),
                      "the agent's real text survives")
    }

    func testStripBracketPrefixesHandlesMultiplePrefixes() {
        XCTAssertEqual(Attachment.stripBracketPrefixes("[not reviewed] [URGENT] hello"), "hello")
        XCTAssertEqual(Attachment.stripBracketPrefixes("[gate waived] Attached file: x.pdf"), "Attached file: x.pdf")
        XCTAssertEqual(Attachment.stripBracketPrefixes("No brackets here"), "No brackets here")
        XCTAssertEqual(Attachment.stripBracketPrefixes(""), "")
    }

    func testSingleAnnouncementMatchesWithBracketPrefix() {
        XCTAssertEqual(Attachment.singleAnnouncement("[not reviewed] Attached file: a.png"), "a.png")
        XCTAssertEqual(Attachment.singleAnnouncement("[UNGATED] Attached file: b.pdf"), "b.pdf")
        // Non-bracket prefix still fails as expected
        XCTAssertNil(Attachment.singleAnnouncement("I attached file: a.png"))
    }
}
