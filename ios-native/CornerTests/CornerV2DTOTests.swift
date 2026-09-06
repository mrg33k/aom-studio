import XCTest
@testable import Corner

/// Native plan Task 3, Step 1: tagged blocks and Visual Window tabs decode
/// from the backend's exact JSON. Where the plan's snippets and the backend
/// disagree, the backend wins:
/// - text blocks carry `{"type":"text","value"}` (the plan snippet says `text`);
/// - `RouteDecision` carries `decisionId` (R10 gap 1);
/// - `VisualWindowTab` carries `agentLabel` (R10 gap 2).
final class CornerV2DTOTests: XCTestCase {

    func testTextQuestionAndArtifactBlocksDecodeByType() throws {
        let data = #"[{"type":"text","value":"Ready"},{"type":"question","id":"audience","text":"Who is it for?","options":[{"id":"buyers","title":"Buyers","detail":"Range and timing","recommended":true}]},{"type":"artifact","artifactIDs":["artifact-1"]}]"#.data(using: .utf8)!
        let blocks = try JSONDecoder.corner.decode([ThreadBlock].self, from: data)
        XCTAssertEqual(blocks.count, 3)
        XCTAssertEqual(blocks[0], .text("Ready"))
    }

    func testStepsSuccessSnagAndChecklistBlocksDecodeByType() throws {
        let data = #"[{"type":"steps","steps":[{"id":"step-1","label":"Gather sources","state":"done"}]},{"type":"success","text":"Gathered three sources.","stepIndex":0},{"type":"snag","text":"The brief needs a call date.","options":[{"id":"pick-date","title":"Pick a date","detail":"Choose the call date","recommended":true}]},{"type":"checklist","pinIDs":["pin-1","pin-2"]}]"#.data(using: .utf8)!
        let blocks = try JSONDecoder.corner.decode([ThreadBlock].self, from: data)
        XCTAssertEqual(blocks.count, 4)
        XCTAssertEqual(blocks[0], .steps([StepState(id: "step-1", label: "Gather sources", state: "done")]))
        XCTAssertEqual(blocks[1], .success(text: "Gathered three sources.", stepIndex: 0))
        XCTAssertEqual(
            blocks[2],
            .snag(
                text: "The brief needs a call date.",
                options: [QuestionOption(id: "pick-date", title: "Pick a date", detail: "Choose the call date", recommended: true)]
            )
        )
        XCTAssertEqual(blocks[3], .checklist(pinIDs: ["pin-1", "pin-2"]))
    }

    func testPinAnchorsDecodeByType() throws {
        let data = #"[{"type":"point","page":2,"x":10.5,"y":20.25},{"type":"time","seconds":2.0,"x":null,"y":null},{"type":"line","number":42}]"#.data(using: .utf8)!
        let anchors = try JSONDecoder.corner.decode([PinAnchor].self, from: data)
        XCTAssertEqual(anchors, [
            .point(page: 2, x: 10.5, y: 20.25),
            .time(seconds: 2.0, x: nil, y: nil),
            .line(number: 42),
        ])
    }

    func testFixtureDecodesOneGeneralProjectAndLabeledAgentEvents() throws {
        let fixture = try Fixture.load("v2.native.fixture")
        let payload = try Fixture.decode(NativeFixture.self, from: fixture)
        let workspace = payload.workspace
        let events = payload.thread.events
        XCTAssertEqual(workspace.projects.filter { $0.kind == .general }.count, 1)
        XCTAssertTrue(events.allSatisfy { $0.author == .user || ($0.author == .agent && $0.agentLabel != nil) })
    }

    func testFixtureRouteCarriesDecisionId() throws {
        let payload = try Fixture.loadNativeFixture()
        let data = try Fixture.load("v2.native.fixture")
        let route = try Fixture.decode(RouteDecision.self, from: data, atKeyPath: "route")
        XCTAssertFalse(route.decisionId.isEmpty)
        XCTAssertEqual(route.project.name, "Aster")
        _ = payload
    }

    func testFixtureDatesParseAsFractionalSecondISO8601() throws {
        let payload = try Fixture.loadNativeFixture()
        let first = try XCTUnwrap(payload.thread.events.first)
        let expected = ISO8601DateFormatter.cornerFractional.date(from: "2026-09-05T10:00:00.000Z")
        XCTAssertEqual(first.createdAt, expected)
    }

    func testBrainMentionParsing() {
        XCTAssertEqual(BrainMention.parse("ask @research to draft it"), ["research"])
        XCTAssertEqual(BrainMention.parse("@Research and @Cleo, sync up"), ["research", "cleo"])
        XCTAssertEqual(BrainMention.parse("no mentions here"), [])
        XCTAssertEqual(BrainMention.parse("mail me at patrik@example.com"), [])
    }
}
