import XCTest
@testable import Corner

/// Native plan Task 3/4: `DefaultCornerV2API` maps the protocol onto the
/// `v2Native:*` Convex functions — no user id, room id, or agent id ever
/// leaves the device, and nullable reads decode to nil instead of throwing.
/// Runs against `FakeConvexTransport`: no network, no secrets.
@MainActor
final class CornerV2APITests: XCTestCase {

    private func api(
        handler: @escaping (URLRequest) -> (Data, HTTPURLResponse)
    ) -> (DefaultCornerV2API, FakeConvexTransport) {
        let transport = FakeConvexTransport(handler: handler)
        let service = ConvexService(session: .valid, transport: transport)
        return (DefaultCornerV2API(service: service), transport)
    }

    private func envelope(_ inner: Any) -> (Data, HTTPURLResponse) {
        let body: [String: Any] = ["status": "success", "value": inner]
        let data = try! JSONSerialization.data(withJSONObject: body)
        let request = URLRequest(url: URL(string: "https://example.com")!)
        let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
        return (data, response)
    }

    func testSendPostsOnlyTextMentionsAndPreferredProject() async throws {
        let (api, transport) = self.api { [self] request in
            self.envelope([
                "decisionId": "decision-1",
                "destinationThreadID": "",
                "project": [
                    "id": "proj-general-1", "workspaceID": "world-1", "name": "General",
                    "kind": "general", "tintHex": "#8B5CF6", "needsAttention": false,
                    "threadID": "thread-general-1", "missions": [],
                ],
                "mission": NSNull(),
                "confidence": 0.7, "alternatives": [],
                "reason": "Create mission in General.",
                "needsClarification": false, "needsCreationConfirmation": true,
                "actor": "tester", "createdAt": "2026-09-05T10:06:00.000Z",
            ])
        }
        let decision = try await api.send(
            text: "Summarize this @research",
            mentioning: BrainMention.parse("Summarize this @research"),
            preferredProjectID: nil
        )
        XCTAssertEqual(decision.decisionId, "decision-1")
        XCTAssertTrue(decision.needsCreationConfirmation)
        let args = try XCTUnwrap(transport.lastArgs)
        XCTAssertEqual(args["text"] as? String, "Summarize this @research")
        XCTAssertEqual(args["mentioning"] as? [String], ["research"])
        XCTAssertNil(args["preferredProjectId"], "absent preferred project is omitted, not null")
        for forbidden in ["userId", "roomId", "roomID", "agentId", "agent"] {
            XCTAssertNil(args[forbidden], "client must never send \(forbidden)")
        }
    }

    func testWorkspaceTreeNullDecodesToNil() async throws {
        let (api, _) = self.api { [self] _ in self.envelope(NSNull()) }
        // A success envelope with a null value is "never ensured", not an error.
        let tree = try await api.workspaceTree()
        XCTAssertNil(tree)
    }

    func testThreadEventsDecodeFixtureWireShapes() async throws {
        // Raw fixture JSON rides the fake envelope untouched: this proves the
        // client's decode against the backend's exact bytes, not a re-encode.
        let data = try Fixture.load("v2.native.fixture")
        let expected = try Fixture.decode([ThreadEvent].self, from: data, atKeyPath: "events")
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        let inner = try XCTUnwrap(json["events"])
        let (api, _) = self.api { [self] _ in self.envelope(inner) }
        let events = try await api.threadEvents(threadID: "thread-aster-1")
        XCTAssertEqual(events, expected)
    }

    func testV2EndpointsUseV2NativePaths() {
        XCTAssertEqual(ConvexEndpoint.v2WorkspaceTree.path, "v2Native:workspaceTree")
        XCTAssertEqual(ConvexEndpoint.v2ThreadForProject("p").path, "v2Native:threadForProject")
        XCTAssertEqual(ConvexEndpoint.v2ThreadForMission("m").path, "v2Native:threadForMission")
        XCTAssertEqual(ConvexEndpoint.v2ThreadEvents(threadID: "t").path, "v2Native:threadEvents")
        XCTAssertEqual(
            ConvexEndpoint.v2Send(text: "hi", mentioning: [], preferredProjectID: nil).path,
            "v2Native:send"
        )
        let sendArgs = ConvexEndpoint.v2Send(text: "hi", mentioning: ["research"], preferredProjectID: "p").args
        XCTAssertEqual(sendArgs["mentioning"] as? [String], ["research"])
        XCTAssertEqual(sendArgs["preferredProjectId"] as? String, "p")
        XCTAssertNil(ConvexEndpoint.v2Send(text: "hi", mentioning: [], preferredProjectID: nil).args["preferredProjectId"])
    }
}
