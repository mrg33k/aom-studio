// FakeTransport.swift — Corner native iOS tests
// corner:native-ios Stage 1
//
// A scriptable stand-in for the Corner API so the thread's state machine can be run
// against failures on purpose: a send that refuses, a turn that goes silent, a
// backgrounded app that missed more than a window of messages.

import Foundation
@testable import Corner

final class FakeSubscription: RoomSubscribing {
    private(set) var stopped = false
    func stop() { stopped = true }
}

@MainActor
final class FakeTransport: MessageTransport {

    /// Rows the history endpoint returns, oldest first. Tests mutate this to simulate
    /// the server moving on.
    var rows: [MessageRow] = []
    /// A larger window, returned when the caller asks for more than 100 — the gap path.
    var wideRows: [MessageRow]?
    var steps: [MessageStep] = []

    var sendError: Error?
    /// Consumed by the next fetch only — models a transient reconcile failure.
    var failNextFetch: Error?
    /// What POST returns. nil models an older API deploy that answers without the row.
    var sendReturnsRow = true
    /// Appends the sent row to `rows` automatically, like the real server does.
    var sendLandsInThread = true

    private(set) var sentTexts: [String] = []
    private(set) var clientMessageIDs: [String] = []
    private(set) var fetchLimits: [Int] = []
    private(set) var stepLimits: [Int] = []
    private(set) var subscriptions: [FakeSubscription] = []

    func fetchMessages(room: Room, limit: Int) async throws -> [MessageRow] {
        fetchLimits.append(limit)
        if let error = failNextFetch {
            failNextFetch = nil
            throw error
        }
        if limit > 100, let wideRows { return wideRows }
        return rows
    }

    func fetchLimitsReset() { fetchLimits.removeAll() }

    @discardableResult
    func send(text: String, room: Room, interactionMode: String) async throws -> MessageRow? {
        if let sendError { throw sendError }
        sentTexts.append(text)
        let row = MessageRow.fake(id: "server-\(sentTexts.count)", role: "user", text: text, epoch: Date().timeIntervalSince1970)
        if sendLandsInThread { rows.append(row) }
        return sendReturnsRow ? row : nil
    }

    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        attachments: [Attachment], roomAgent: String?, clientMessageID: String
    ) async throws -> MessageRow? {
        clientMessageIDs.append(clientMessageID)
        return try await send(text: text, room: room, interactionMode: interactionMode)
    }

    func fetchSteps(room: Room, limit: Int) async throws -> [MessageStep] {
        stepLimits.append(limit)
        return steps
    }

    /// Steward verdicts (R18 N1). `healthScript` entries are consumed one per poll;
    /// when the script is empty `healthDefault` repeats. nil = the steward has no
    /// verdict, which must change nothing.
    var healthScript: [RoomHealth] = []
    var healthDefault: RoomHealth?
    private(set) var healthRequests: [(messageID: String, repair: Bool)] = []

    func roomHealth(room: Room, messageID: String, repair: Bool) async throws -> RoomHealth? {
        healthRequests.append((messageID, repair))
        if !healthScript.isEmpty { return healthScript.removeFirst() }
        return healthDefault
    }

    /// Stop verdicts (R18 N2). Defaults to feature-off — the honest no-lane answer.
    var stopResult = StopResult(stopped: false, reason: "disabled", featureOff: true)
    var stopError: Error?
    private(set) var stopRequests: [String] = []

    func stopTurn(room: Room, messageID: String) async throws -> StopResult {
        stopRequests.append(messageID)
        if let stopError { throw stopError }
        return stopResult
    }

    /// Live-reply stream (R18 N3). Tests drive events through `streamContinuation`;
    /// `provideStream = false` models a transport with no stream lane at all.
    var provideStream = true
    var streamContinuation: AsyncStream<TurnStreamEvent>.Continuation?
    private(set) var streamOpens: [String] = []

    func turnStream(room: Room, messageID: String) -> AsyncStream<TurnStreamEvent>? {
        streamOpens.append(messageID)
        guard provideStream else { return nil }
        return AsyncStream { c in self.streamContinuation = c }
    }

    func subscribeToRoom(_ room: Room, onInsert: @escaping @Sendable () -> Void) -> RoomSubscribing {
        let sub = FakeSubscription()
        subscriptions.append(sub)
        return sub
    }
}

// MARK: - Convex transport stub (native Task 2: transport safety gate)
//
// Scriptable stand-in for the Convex HTTP data plane behind ConvexService.
// Lets the envelope/refresh tests prove strict decoding, single-flight refresh,
// and userId rejection without touching the network.

final class FakeConvexTransport: ConvexTransport, @unchecked Sendable {
    private let handler: (URLRequest) -> (Data, HTTPURLResponse)
    private(set) var requests: [URLRequest] = []

    init(handler: @escaping (URLRequest) -> (Data, HTTPURLResponse)) {
        self.handler = handler
    }

    /// HTTP 200 with `{"status":"error","errorMessage":...}` — the shape the real
    /// Convex data plane returns for a failed function call.
    static func errorEnvelope(_ message: String, statusCode: Int = 200) -> FakeConvexTransport {
        FakeConvexTransport { request in
            let body: [String: Any] = ["status": "error", "errorMessage": message]
            let data = try! JSONSerialization.data(withJSONObject: body)
            let response = HTTPURLResponse(
                url: request.url!, statusCode: statusCode,
                httpVersion: nil, headerFields: nil
            )!
            return (data, response)
        }
    }

    /// HTTP 200 with `{"status":"success","value":...}`.
    static func success<Value: Encodable>(value: Value) -> FakeConvexTransport {
        FakeConvexTransport { request in
            let payload = try! JSONEncoder().encode(value)
            let inner = try! JSONSerialization.jsonObject(with: payload)
            let body: [String: Any] = ["status": "success", "value": inner]
            let data = try! JSONSerialization.data(withJSONObject: body)
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 200,
                httpVersion: nil, headerFields: nil
            )!
            return (data, response)
        }
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        requests.append(request)
        return handler(request)
    }

    /// The `args` dictionary of the most recent request body, if it parses.
    var lastArgs: [String: Any]? {
        guard let body = requests.last?.httpBody,
              let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any] else { return nil }
        return json["args"] as? [String: Any]
    }
}

// MARK: - Auth fixtures + refresh stub (native Task 2)

/// Unsigned JWT + session factories. No secret: `ConvexAuth.expiry(of:)` only reads
/// the payload's `exp` claim, so an `alg:none` token is enough to drive expiry.
enum AuthFixture {
    static func jwt(expiringIn offset: TimeInterval) -> String {
        let exp = Int(Date().addingTimeInterval(offset).timeIntervalSince1970)
        func b64(_ string: String) -> String {
            Data(string.utf8).base64EncodedString()
                .replacingOccurrences(of: "+", with: "-")
                .replacingOccurrences(of: "/", with: "_")
                .replacingOccurrences(of: "=", with: "")
        }
        return "\(b64("{\"alg\":\"none\"}")).\(b64("{\"exp\":\(exp)}")).sig"
    }

    static func session(expiringIn offset: TimeInterval) -> AuthSession {
        AuthSession(
            accessToken: jwt(expiringIn: offset),
            refreshToken: "refresh-\(UUID().uuidString)",
            user: AuthUser(
                id: "user-test", email: "test@example.com", name: nil,
                world: "aom", worldId: nil, worldName: nil, role: nil,
                isAdmin: false, mustChangePassword: false,
                initials: nil, color: nil, avatarUrl: nil
            )
        )
    }
}

extension AuthSession {
    /// A session whose access token is good for another hour: `validSession()`
    /// must return it without refreshing.
    static var valid: AuthSession { AuthFixture.session(expiringIn: 3600) }
    /// A session whose access token expired an hour ago: `validSession()` must refresh.
    static var expired: AuthSession { AuthFixture.session(expiringIn: -3600) }
}

extension ConvexAuth.RefreshClient {
    /// Refresh succeeds and rotates both tokens, like the real server.
    static var singleUseSuccess: Self {
        Self(run: { base in
            var next = base
            next.accessToken = AuthFixture.jwt(expiringIn: 3600)
            next.refreshToken = "refresh-rotated-\(UUID().uuidString)"
            return next
        })
    }

    /// Refresh is definitively rejected (unknown/rotated refresh token).
    static var rejected: Self {
        Self(run: { _ in throw ConvexAuthError.signedOut })
    }
}

// MARK: - Row + step builders

extension MessageRow {
    /// MessageRow has only a decoding initializer (it mirrors a database row), so the
    /// fixtures go through the real decoder — which means every fixture also exercises
    /// the tolerant decode path.
    static func fake(
        id: String,
        role: String,
        text: String,
        epoch: TimeInterval,
        agent: String? = nil,
        metadata: [String: Any]? = nil
    ) -> MessageRow {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var dict: [String: Any] = [
            "id": id,
            "role": role,
            "text": text,
            "timestamp": iso.string(from: Date(timeIntervalSince1970: epoch)),
        ]
        if let agent { dict["agent"] = agent }
        if let metadata { dict["metadata"] = metadata }
        let data = try! JSONSerialization.data(withJSONObject: dict)
        return try! JSONDecoder().decode(MessageRow.self, from: data)
    }
}

extension MessageStep {
    static func fake(id: String, parent: String, index: Int, text: String, phase: String? = nil) -> MessageStep {
        var dict: [String: Any] = [
            "id": id,
            "parent_message_id": parent,
            "step_index": index,
            "text": text,
        ]
        if let phase { dict["phase"] = phase }
        let data = try! JSONSerialization.data(withJSONObject: dict)
        return try! JSONDecoder().decode(MessageStep.self, from: data)
    }
}
