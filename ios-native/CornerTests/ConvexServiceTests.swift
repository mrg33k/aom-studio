// ConvexServiceTests.swift — Corner native iOS
// corner:corner-v2 native Task 2 (transport safety gate)
//
// Proves the authenticated Convex transport BEFORE any v2 UI attaches to it:
// error envelopes throw instead of decoding into fallback rows, the access token
// rides exactly once per request, and no endpoint can carry a client-asserted
// user id. Runs against FakeConvexTransport — no network, no secrets.

import XCTest
@testable import Corner

@MainActor
final class ConvexServiceTests: XCTestCase {

    /// Transport-gate probe shape (Task 2's minimal workspace). The real
    /// `WorkspaceSummary` DTO lives in CornerV2DTO now; these tests prove
    /// envelope/auth behavior, not the v2 shape.
    private struct TransportProbe: Codable, Equatable {
        let id: String
        let name: String
    }

    // MARK: - Plan Task 2, Step 1

    func testQueryThrowsWhenConvexEnvelopeStatusIsError() async {
        let service = ConvexService(
            session: .valid,
            transport: FakeConvexTransport.errorEnvelope("not found")
        )
        do {
            _ = try await service.request(.workspaceTree, as: TransportProbe.self)
            XCTFail("an error envelope must throw, never decode")
        } catch {
            XCTAssertEqual(error as? ConvexServiceError, .server("not found"))
        }
    }

    // MARK: - Brief additions

    /// Audit H8: `messages:getMessage` on a missing id used to "succeed" with a
    /// garbage row (MessageRow's decoder never throws and invents a UUID, and the
    /// tolerant decoder even mapped null to `[]`). The envelope status is now
    /// checked before any model decodes, so the same payload throws.
    func testErrorEnvelopeNeverProducesFallbackRow() async {
        let service = ConvexService(
            session: .valid,
            transport: FakeConvexTransport.errorEnvelope("not found")
        )
        do {
            let rows = try await service.request(
                .listMessages(roomId: "aom:project:demo"), as: [MessageRow].self
            )
            XCTFail("expected a throw, got \(rows.count) fallback rows")
        } catch {
            XCTAssertEqual(error as? ConvexServiceError, .server("not found"))
        }
    }

    /// Audit H1: identity rides the Bearer [REDACTED], never a `userId` argument. The
    /// endpoint type refuses to construct with one, and every factory builds clean args.
    func testMutationRejectsClientUserIdArgument() {
        XCTAssertThrowsError(
            try ConvexEndpoint(
                kind: .mutation, path: "messages:send",
                args: ["roomId": "aom:project:demo", "userId": "mallory@example.com"]
            ),
            "a client-asserted userId must be impossible to send"
        )
        let endpoints = [
            ConvexEndpoint.workspaceTree,
            .listMessages(roomId: "aom:project:demo"),
            .sendMessage(roomId: "aom:project:demo", text: "hello"),
            .markRead(roomId: "aom:project:demo", lastReadAt: 1),
            .listRooms(worldId: "aom"),
        ]
        for endpoint in endpoints {
            XCTAssertNil(
                endpoint.args["userId"],
                "\(endpoint.path) must not carry a client userId"
            )
        }
    }

    /// The legacy string-based query path (RoomStore, ChatViewModel, ReadStateStore
    /// still call it until Tasks 3-4 migrate them) strips a client `userId` before
    /// the args leave the device, so those call sites stop sending it with no edit
    /// to their files.
    func testLegacyQueryStripsClientUserIdFromArgs() async throws {
        let transport = FakeConvexTransport.success(value: [] as [String])
        let service = ConvexService(session: .valid, transport: transport)
        let _: [MessageRow] = try await service.query(
            "messages:list", args: ["roomId": "aom:project:demo", "userId": "mallory@example.com"]
        )
        XCTAssertNil(
            transport.lastArgs?["userId"],
            "the wire args must not contain a client userId"
        )
        XCTAssertEqual(transport.lastArgs?["roomId"] as? String, "aom:project:demo")
    }

    /// The access token is attached exactly once per request, in authorizedData(for:).
    func testAuthorizedRequestSendsBearerTokenOnce() async throws {
        let session = AuthSession.valid
        let transport = FakeConvexTransport.success(
            value: TransportProbe(id: "w1", name: "Demo")
        )
        let service = ConvexService(session: session, transport: transport)
        let workspace = try await service.request(.workspaceTree, as: TransportProbe.self)
        XCTAssertEqual(workspace, TransportProbe(id: "w1", name: "Demo"))
        XCTAssertEqual(transport.requests.count, 1)
        let authHeaders = (transport.requests[0].allHTTPHeaderFields ?? [:])
            .filter { ($0.key as? String)?.lowercased() == "authorization" }
        XCTAssertEqual(authHeaders.count, 1, "exactly one Authorization header")
        XCTAssertEqual(authHeaders.first?.value, "Bearer \(session.accessToken)")
    }

    /// A success envelope still decodes the value — strictness must reject errors,
    /// not break the happy path.
    func testSuccessEnvelopeDecodesValue() async throws {
        let service = ConvexService(
            session: .valid,
            transport: FakeConvexTransport.success(
                value: TransportProbe(id: "w1", name: "Demo")
            )
        )
        let workspace = try await service.request(.workspaceTree, as: TransportProbe.self)
        XCTAssertEqual(workspace.id, "w1")
    }
}
