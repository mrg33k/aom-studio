// MessageContentTests.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Row decoding, link cards, and the block fallback — the three places where a bug
// shows the user an EMPTY bubble rather than an error, which is the failure mode this
// whole file exists to prevent.

import XCTest
@testable import Corner

final class MessageContentTests: XCTestCase {

    private func row(_ json: String) throws -> MessageRow {
        try JSONDecoder().decode(MessageRow.self, from: Data(json.utf8))
    }

    // MARK: - Tolerant decoding

    /// PostgREST hands back MICROSECOND precision; ISO8601DateFormatter only handles
    /// milliseconds reliably. A timestamp that fails to parse means no time label and,
    /// worse, an epoch of 0, which would make every turn look ancient to the working
    /// indicator.
    func testMicrosecondTimestampParses() throws {
        let r = try row("""
        {"id":"a","timestamp":"2026-08-09T19:23:45.123456+00:00","role":"assistant","text":"hi"}
        """)
        XCTAssertNotNil(r.date)
        XCTAssertGreaterThan(r.epoch, 1_700_000_000)
    }

    func testPlainAndMillisecondTimestampsParseToo() throws {
        XCTAssertNotNil(try row(#"{"id":"a","timestamp":"2026-08-09T19:23:45Z"}"#).date)
        XCTAssertNotNil(try row(#"{"id":"a","timestamp":"2026-08-09T19:23:45.123Z"}"#).date)
    }

    /// One unfamiliar column must never cost the thread. Every field is optional and
    /// nothing throws.
    func testUnknownColumnsAndMissingFieldsDoNotThrow() throws {
        let r = try row("""
        {"id":"x","some_column_from_the_future":{"nested":[1,2,3]},"file_size":"not-a-number"}
        """)
        XCTAssertEqual(r.id, "x")
        XCTAssertNil(r.text)
        XCTAssertNil(r.fileSize)
    }

    func testRoleDrivesAuthorshipAndLegacyRowsFallBackToUserName() throws {
        XCTAssertTrue(try row(#"{"id":"a","role":"user"}"#).isUser)
        XCTAssertFalse(try row(#"{"id":"a","role":"assistant"}"#).isUser)
        // Written before `role` was mandatory.
        XCTAssertTrue(try row(#"{"id":"a","user_name":"Patrik"}"#).isUser)
        XCTAssertFalse(try row(#"{"id":"a"}"#).isUser)
    }

    func testAgentRowDisplaysTitleNotSlug() throws {
        XCTAssertEqual(try row(#"{"id":"a","role":"assistant","agent":"elon"}"#).displayName, "Systems")
    }

    // MARK: - Link cards (port of resultLinks.js)

    func testResultPayloadBecomesALinkCard() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"All done.",
         "metadata":{"result_payload":{"type":"link","payload":"https://lab.aheadofmarket.com/dashboard","summary":"The new page"}}}
        """))
        XCTAssertEqual(content.links.count, 1)
        XCTAssertEqual(content.links.first?.summary, "The new page")
        XCTAssertEqual(content.links.first?.host, "lab.aheadofmarket.com")
    }

    func testCheckExternalPayloadAlsoBecomesACard() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"Take a look.",
         "metadata":{"result_payload":{"type":"check_external","payload":"https://example.com/page"}}}
        """))
        XCTAssertEqual(content.links.count, 1)
    }

    /// The bridge-voiced completion path carries no structured payload, so lifting
    /// URLs out of prose is what makes a card appear EVERY time.
    func testBareURLInProseBecomesACard() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"Shipped: https://example.com/report"}
        """))
        XCTAssertEqual(content.links.count, 1)
        XCTAssertEqual(content.links.first?.url.absoluteString, "https://example.com/report")
    }

    /// Backticks are excluded from the URL character class: agents wrap URLs in
    /// markdown code spans and a captured trailing ` produced dead links (a live Drive
    /// URL rendering as …LMWi2eG%60), found in the 2026-07-17 sweep.
    func testTrailingBacktickIsNotCapturedIntoTheURL() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"Here: `https://drive.google.com/file/d/LMWi2eG`"}
        """))
        XCTAssertEqual(content.links.first?.url.absoluteString, "https://drive.google.com/file/d/LMWi2eG")
    }

    func testTrailingPunctuationIsStripped() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"See https://example.com/page."}
        """))
        XCTAssertEqual(content.links.first?.url.absoluteString, "https://example.com/page")
    }

    /// Images already render as media; a link card on top would double them.
    func testMediaURLsAreNotCarded() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"https://example.com/shot.png and https://example.com/clip.mp4"}
        """))
        XCTAssertTrue(content.links.isEmpty)
    }

    /// A dev-machine URL is not a link in the user's world — nothing to tap.
    func testLocalhostIsNotCarded() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"http://localhost:8787/x and http://127.0.0.1:3000/y"}
        """))
        XCTAssertTrue(content.links.isEmpty)
    }

    func testCardsAreCappedAtThreeAndDeduplicated() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"https://a.com/1 https://b.com/2 https://c.com/3 https://d.com/4 https://a.com/1"}
        """))
        XCTAssertEqual(content.links.count, 3)
    }

    func testAttachmentURLsAreNotDuplicatedAsCards() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"https://files.example.com/doc.pdf",
         "metadata":{"attachments":[{"url":"https://files.example.com/doc.pdf"}]}}
        """))
        XCTAssertTrue(content.links.isEmpty)
    }

    /// The same link must not show twice (sentence + card).
    func testTrailingCardURLIsStrippedFromProse() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"The page is live: https://example.com/page"}
        """))
        XCTAssertEqual(content.links.count, 1)
        XCTAssertFalse(content.prose.contains("https://example.com/page"))
        XCTAssertTrue(content.prose.hasPrefix("The page is live"))
    }

    /// Only a TRAILING bare URL goes. A mid-sentence link stays where it reads.
    func testMidSentenceURLStaysInTheProse() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"Check https://example.com/page before the meeting."}
        """))
        XCTAssertTrue(content.prose.contains("https://example.com/page"))
        XCTAssertTrue(content.prose.hasSuffix("before the meeting."))
    }

    // MARK: - Blocks

    func testKnownBlockKindsSurviveDecoding() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"",
         "metadata":{"blocks":[
           {"type":"step","title":"Read the audit","state":"done"},
           {"type":"success","title":"Shipped","detail":"Live on prod"},
           {"type":"summary","bullets":["one","two"]}
         ]}}
        """))
        XCTAssertEqual(content.blocks.map(\.kind), ["step", "success", "summary"])
        XCTAssertEqual(content.blocks[0].state, "done")
        XCTAssertEqual(content.blocks[1].detail, "Live on prod")
        XCTAssertEqual(content.blocks[2].bullets, ["one", "two"])
    }

    /// THE POINT OF THE FALLBACK. A kind invented after this binary shipped must still
    /// arrive as a block carrying its human-readable text, so it can render as a card
    /// instead of a blank bubble.
    func testUnknownBlockKindStillCarriesItsText() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"",
         "metadata":{"blocks":[{"type":"hologram","title":"Q3 forecast","detail":"Up 12%"}]}}
        """))
        XCTAssertEqual(content.blocks.count, 1)
        XCTAssertEqual(content.blocks[0].kind, "hologram")
        XCTAssertEqual(content.blocks[0].title, "Q3 forecast")
        XCTAssertEqual(content.blocks[0].detail, "Up 12%")
        XCTAssertFalse(content.isEmpty, "an unknown block must not read as an empty message")
    }

    /// ForEach keys on Identifiable, so two blocks sharing an id means the second one
    /// is silently never drawn. A message with three steps would render one.
    func testBlockIDsAreUniqueWithinARow() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"",
         "metadata":{"blocks":[
           {"type":"step","title":"one"},{"type":"step","title":"two"},{"type":"step","title":"three"}
         ]}}
        """))
        XCTAssertEqual(content.blocks.count, 3)
        XCTAssertEqual(Set(content.blocks.map(\.id)).count, 3)
    }

    func testDataBlockExposesItsRowCountForTheFallbackCard() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"",
         "metadata":{"blocks":[{"type":"data","title":"Leads","columns":["a"],"rows":[[1],[2],[3]]}]}}
        """))
        XCTAssertEqual(content.blocks.first?.rowCount, 3)
    }

    func testOptionBearingBlocksExposeTheirLabels() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"",
         "metadata":{"blocks":[
           {"type":"choice","prompt":"Which one?","choices":[{"id":"1","title":"Ship it"},{"id":"2","title":"Hold"}]},
           {"type":"replies","options":["Yes","No"]}
         ]}}
        """))
        XCTAssertEqual(content.blocks[0].options, ["Ship it", "Hold"])
        XCTAssertEqual(content.blocks[1].options, ["Yes", "No"])
    }

    func testBlockWithNoTypeIsSkippedRatherThanRenderedBlank() throws {
        let content = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","text":"hi","metadata":{"blocks":[{"title":"orphan"},{"type":"step","title":"real"}]}}
        """))
        XCTAssertEqual(content.blocks.count, 1)
        XCTAssertEqual(content.blocks[0].title, "real")
    }

    func testMetadataThatIsNotAnObjectDoesNotCrashTheRow() throws {
        let content = MessageContent.build(from: try row(#"{"id":"a","role":"assistant","text":"hi","metadata":"oops"}"#))
        XCTAssertEqual(content.prose, "hi")
        XCTAssertTrue(content.blocks.isEmpty)
    }

    // MARK: - Attachments

    func testImageAttachmentIsRecognisedByMimeTypeAndByExtension() throws {
        let byMime = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","attachment_url":"https://x.com/f","file_mime_type":"image/png"}
        """))
        XCTAssertTrue(byMime.attachmentIsImage)

        let byExtension = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","attachment_url":"https://x.com/shot.jpg"}
        """))
        XCTAssertTrue(byExtension.attachmentIsImage)

        let document = MessageContent.build(from: try row("""
        {"id":"a","role":"assistant","attachment_url":"https://x.com/report.pdf"}
        """))
        XCTAssertFalse(document.attachmentIsImage)
    }

    /// A row with nothing renderable must be DETECTABLE, so the bubble can say
    /// "nothing this version can display" instead of drawing an empty box.
    func testTrulyEmptyRowReportsItself() throws {
        XCTAssertTrue(MessageContent.build(from: try row(#"{"id":"a","role":"assistant","text":""}"#)).isEmpty)
    }

    // MARK: - Steps

    func testSettledSentinelIsRecognisedBothWays() throws {
        let byIndex = try JSONDecoder().decode(MessageStep.self, from: Data("""
        {"id":"1","parent_message_id":"p","step_index":9999,"text":"whatever"}
        """.utf8))
        XCTAssertTrue(byIndex.isSettledSentinel)
        XCTAssertFalse(byIndex.isRenderable)

        let byText = try JSONDecoder().decode(MessageStep.self, from: Data("""
        {"id":"2","parent_message_id":"p","step_index":3,"text":"settled"}
        """.utf8))
        XCTAssertTrue(byText.isSettledSentinel)

        let real = try JSONDecoder().decode(MessageStep.self, from: Data("""
        {"id":"3","parent_message_id":"p","step_index":1,"text":"Reading the details"}
        """.utf8))
        XCTAssertFalse(real.isSettledSentinel)
        XCTAssertTrue(real.isRenderable)
    }

    func testStepWithNumericIDStillDecodes() throws {
        let step = try JSONDecoder().decode(MessageStep.self, from: Data(#"{"id":42,"text":"x"}"#.utf8))
        XCTAssertEqual(step.id, "42")
    }
}
