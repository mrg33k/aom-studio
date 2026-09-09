// ConvexService.swift — Corner native iOS
// corner:native-ios Convex backend (BRIEF 04)
//
// Raw HTTP Convex client. Convex exposes REST endpoints at
// https://neat-pony-216.convex.cloud/api/query and
// https://neat-pony-216.convex.cloud/api/mutation
//
// If an official Convex Swift SDK becomes available, this file is the
// single seam to swap to it — call sites use ConvexService.shared only.

import Combine
import Foundation

/// The HTTP seam behind ConvexService. URLSession is the production
/// implementation; tests inject a scripted stub. Exists so the envelope,
/// auth-header, and userId tests can run without the network (audit H7).
protocol ConvexTransport {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: ConvexTransport {
    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await data(for: request, delegate: nil)
    }
}

/// A Task is already something you stop — this states it so subscriptions can
/// expose the standard `Cancellable` primitive instead of a bespoke type.
extension Task: Cancellable {}

/// Errors from the authenticated `request(_:as:)` path. The legacy string-based
/// methods below keep throwing `ConvexError` so their callers do not change in
/// this task; they migrate to this type when Tasks 3-4 move them onto endpoints.
enum ConvexServiceError: Error, Equatable {
    /// The Convex envelope reported `status != "success"`.
    case server(String)
    /// The HTTP layer itself failed (non-2xx).
    case http(Int, String)
    /// No session to authorize with.
    case notSignedIn
}

/// Which Convex data-plane route an endpoint hits.
enum ConvexEndpointKind {
    case query
    case mutation
}

/// One authenticated Convex call. Identity always rides the Bearer [REDACTED] (see
/// `authorizedData(for:)`); a `userId` argument is refused at construction
/// because the server derives the viewer from the token.
struct ConvexEndpoint {
    enum ConstructionError: Error {
        case clientUserIdForbidden
    }

    let kind: ConvexEndpointKind
    let path: String
    let args: [String: Any]

    init(kind: ConvexEndpointKind, path: String, args: [String: Any] = [:]) throws {
        guard args["userId"] == nil else { throw ConstructionError.clientUserIdForbidden }
        self.kind = kind
        self.path = path
        self.args = args
    }
}

/// Endpoint factories. Each `try!` covers a literal argument dictionary that
/// cannot contain `userId` by inspection; the throwing initializer remains the
/// backstop for dynamically built args.
extension ConvexEndpoint {
    static var workspaceTree: ConvexEndpoint {
        try! ConvexEndpoint(kind: .query, path: "workspace:tree")
    }

    static func listMessages(roomId: String, limit: Int = 100) -> ConvexEndpoint {
        try! ConvexEndpoint(kind: .query, path: "messages:list", args: ["roomId": roomId, "limit": limit])
    }

    static func sendMessage(roomId: String, text: String) -> ConvexEndpoint {
        try! ConvexEndpoint(kind: .mutation, path: "messages:send", args: ["roomId": roomId, "text": text])
    }

    static func markRead(roomId: String, lastReadAt: Double) -> ConvexEndpoint {
        try! ConvexEndpoint(kind: .mutation, path: "reads:markRead", args: ["roomId": roomId, "lastReadAt": lastReadAt])
    }

    static func listRooms(worldId: String) -> ConvexEndpoint {
        try! ConvexEndpoint(kind: .query, path: "rooms:listRooms", args: ["worldId": worldId])
    }
}

/// The typed response envelope. Decoded BEFORE any model: a non-success status
/// throws instead of letting a tolerant model invent a fallback row (audit H8).
struct ConvexEnvelope<Value: Decodable>: Decodable {
    let status: String
    let value: Value?
    let errorMessage: String?
}

/// The full workspace-tree DTO now lives in `Corner/Models/CornerV2DTO.swift`
/// (native Task 3); transport tests use their own probe struct.
final class ConvexService {
    static let shared = ConvexService()

    /// Deployment switch: `CONVEX_BASE_URL` overrides the default (see
    /// `Config.convexBaseURL`). UI tests point at rehearsal through the
    /// launch environment; the value never appears in source.
    let baseURL = Config.convexBaseURL

    /// Injected session for tests. Production (`shared`) leaves this nil and
    /// resolves the token from the Keychain session on every request.
    private let sessionOverride: AuthSession?
    private let transport: any ConvexTransport

    init(session: AuthSession? = nil, transport: (any ConvexTransport)? = nil) {
        self.sessionOverride = session
        self.transport = transport ?? URLSession.shared
    }

    // MARK: - Authenticated endpoint requests (native Task 2)

    /// The one authorized call path: Bearer [REDACTED] attached exactly once here, the
    /// envelope decoded strictly, and `errorMessage` surfaced as
    /// `ConvexServiceError.server`. No caller attaches its own token and no
    /// endpoint carries a `userId`.
    func request<Value: Decodable>(_ endpoint: ConvexEndpoint, as type: Value.Type) async throws -> Value {
        let data = try await authorizedData(for: endpoint)
        let envelope = try JSONDecoder.corner.decode(ConvexEnvelope<Value>.self, from: data)
        guard envelope.status == "success", let value = envelope.value else {
            throw ConvexServiceError.server(envelope.errorMessage ?? "Convex request failed")
        }
        return value
    }

    /// Nullable-query reads (native Task 3): the v2 subscribable queries
    /// (`workspaceTree`, `threadForProject`, `threadForMission`) return their
    /// DTO or null when the workspace was never ensured. A success envelope
    /// with a null value decodes to nil instead of throwing.
    func requestOptional<Value: Decodable>(_ endpoint: ConvexEndpoint, as type: Value.Type) async throws -> Value? {
        let data = try await authorizedData(for: endpoint)
        let envelope = try JSONDecoder.corner.decode(ConvexEnvelope<Value?>.self, from: data)
        guard envelope.status == "success" else {
            throw ConvexServiceError.server(envelope.errorMessage ?? "Convex request failed")
        }
        return envelope.value ?? nil
    }

    /// Poll an endpoint on an interval, delivering typed results. The returned
    /// `Cancellable` stops the loop; the caller owns its lifetime.
    func subscribe<Value: Decodable>(
        _ endpoint: ConvexEndpoint,
        as type: Value.Type,
        interval: TimeInterval = 2.0,
        onUpdate: @escaping (Result<Value, Error>) -> Void
    ) -> any Cancellable {
        Task<Void, Never> {
            while !Task.isCancelled {
                do {
                    let value = try await request(endpoint, as: type)
                    if Task.isCancelled { break }
                    onUpdate(.success(value))
                } catch {
                    if Task.isCancelled { break }
                    onUpdate(.failure(error))
                }
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
            }
        }
    }

    /// POST raw bytes to a Convex storage upload URL (R32 attachments: the
    /// web's `files:generateUploadUrl` path). The mint URL carries its own
    /// authorization, so no session header rides along — same as the web's
    /// `fetch(url, { method: "POST", body })`. Runs through the injected
    /// transport so the scripted stub covers it.
    func postBytes(to url: URL, data: Data, mimeType: String) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(mimeType.isEmpty ? "application/octet-stream" : mimeType, forHTTPHeaderField: "Content-Type")
        request.httpBody = data
        request.timeoutInterval = 120
        let (body, response) = try await transport.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: body.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexServiceError.http(http.statusCode, msg)
        }
        return body
    }

    /// Build, authorize, and send one request. The access token is set exactly
    /// once, here — never by callers, never in endpoint args.
    func authorizedData(for endpoint: ConvexEndpoint) async throws -> Data {
        let token = try await accessToken()
        var request = URLRequest(
            url: baseURL.appendingPathComponent(endpoint.kind == .query ? "api/query" : "api/mutation")
        )
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": endpoint.path, "args": endpoint.args, "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await transport.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexServiceError.http(http.statusCode, msg)
        }
        return data
    }

    private func accessToken() async throws -> String {
        if let sessionOverride { return sessionOverride.accessToken }
        guard let stored = await ConvexAuth.shared.load() else {
            throw ConvexServiceError.notSignedIn
        }
        do {
            return try await ConvexAuth.shared.validSession(stored).accessToken
        } catch {
            throw ConvexServiceError.notSignedIn
        }
    }

    // MARK: - Legacy string-based methods (compatibility shims)
    //
    // RoomStore, ChatViewModel, and ReadStateStore still call these until Tasks
    // 3-4 move them onto endpoints. They now attach the Bearer [REDACTED] when one is
    // available and strip any client `userId` before the args leave the device,
    // so those call sites stop sending client-asserted identity with no edit to
    // their files. Decoding stays tolerant here; the strict envelope path above
    // is what new callers use.

    /// Drop client-asserted identity from legacy args. The server derives the
    /// viewer from the Bearer [REDACTED]; a `userId` key is either redundant or a lie.
    private static func sanitizedArgs(_ args: [String: Any]) -> [String: Any] {
        var clean = args
        clean.removeValue(forKey: "userId")
        return clean
    }

    /// Best-effort Bearer [REDACTED] for the legacy shims: attach when signed in, send
    /// bare when not. Unlike `authorizedData(for:)`, these never throw for auth —
    /// their callers predate the authenticated contract.
    private func legacyBearerToken() async -> String? {
        if let sessionOverride { return sessionOverride.accessToken }
        guard let stored = await ConvexAuth.shared.load() else { return nil }
        return try? await ConvexAuth.shared.validSession(stored).accessToken
    }

    // MARK: - Query

    func query<T: Decodable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/query"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await legacyBearerToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": functionName, "args": Self.sanitizedArgs(args), "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await transport.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexError.badResponse(status: http.statusCode, message: msg)
        }
        return try ConvexService.decodeQueryResponse(data)
    }

    // MARK: - Mutation

    func mutation(_ functionName: String, args: [String: Any] = [:]) async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/mutation"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await legacyBearerToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": functionName, "args": Self.sanitizedArgs(args), "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await transport.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexError.badResponse(status: http.statusCode, message: msg)
        }
    }

    // MARK: - Mutation with return value

    func mutationWithResult<T: Decodable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/mutation"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await legacyBearerToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": functionName, "args": Self.sanitizedArgs(args), "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await transport.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexError.badResponse(status: http.statusCode, message: msg)
        }
        return try ConvexService.decodeQueryResponse(data)
    }

    // MARK: - Action with return value

    /// Call a Convex ACTION (server-side, may make external HTTP — e.g. the
    /// Arcade connect flow). Same envelope as a mutation but the `api/action`
    /// endpoint. R67: added for `arcade:initiateAuth` / `arcade:checkAuth`.
    func actionWithResult<T: Decodable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/action"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await legacyBearerToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": functionName, "args": Self.sanitizedArgs(args), "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await transport.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexError.badResponse(status: http.statusCode, message: msg)
        }
        return try ConvexService.decodeQueryResponse(data)
    }

    // MARK: - Polling helper

    /// Poll a query every `interval` seconds, calling `onUpdate` with each result.
    /// Returns the Task so the caller can cancel it when the view disappears.
    @discardableResult
    func pollQuery<T: Decodable>(
        _ functionName: String,
        args: [String: Any] = [:],
        interval: TimeInterval = 2.0,
        onUpdate: @escaping (Result<T, Error>) -> Void
    ) -> Task<Void, Never> {
        Task {
            while !Task.isCancelled {
                do {
                    let result: T = try await query(functionName, args: args)
                    if Task.isCancelled { break }
                    onUpdate(.success(result))
                } catch {
                    if Task.isCancelled { break }
                    onUpdate(.failure(error))
                }
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
            }
        }
    }

    // MARK: - Decoding

    /// Convex query responses are wrapped: {"status":"success","value":<T>} or
    /// {"value":<T>}. Try unwrapping before falling back to direct decode so the
    /// same call works against both the brief's simplified mock and the real Convex cloud.
    private static func decodeQueryResponse<T: Decodable>(_ data: Data) throws -> T {
        // Fast path: direct decode (brief's assumption)
        if let direct = try? JSONDecoder().decode(T.self, from: data) {
            return direct
        }
        // Wrapped forms: { "value": T }, { "data": T }, { "result": T }
        if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            for key in ["value", "data", "result"] {
                if let inner = obj[key] {
                    let innerData: Data
                    // NSNull means empty result — try to decode as empty array if T is array
                    if inner is NSNull {
                        innerData = "null".data(using: .utf8)!
                    } else {
                        innerData = try JSONSerialization.data(withJSONObject: inner)
                    }
                    if let decoded = try? JSONDecoder().decode(T.self, from: innerData) {
                        return decoded
                    }
                    // Handle null -> empty array fallback for [MessageRow] etc
                    if inner is NSNull, let empty = try? JSONDecoder().decode(T.self, from: "[]".data(using: .utf8)!) {
                        return empty
                    }
                }
            }
            // Some Convex responses wrap as { "value": ..., "status": "success" }
            // If value is missing but the whole object IS the value (e.g. array direct)
            // we already tried direct decode above.
        }
        // Last resort: try decoding with keyDecodingStrategy / date handling leniently
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        // Give a clear error if nothing matched
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Errors

    enum ConvexError: LocalizedError {
        case badResponse(status: Int, message: String)

        var errorDescription: String? {
            switch self {
            case .badResponse(let status, let message):
                if message.isEmpty { return "Convex returned \(status)." }
                return message
            }
        }

        /// True when the Convex response indicates the function path does not exist
        /// (used to fall back between `messages:send` and legacy `messages:sendMessage`).
        var isNotFound: Bool {
            switch self {
            case .badResponse(let status, let message):
                if status == 404 { return true }
                let lower = message.lowercased()
                return lower.contains("could not find function")
                    || lower.contains("not found")
                    || lower.contains("unknown path")
            }
        }
    }
}
