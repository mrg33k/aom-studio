// CornerAPI.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Auth, the authorized fetch wrapper, and every /api/* call this app makes.
//
// THE ONE WRITE PATH. Sending a message is POST /api/dashboard/supabase-messages
// with the user's Supabase JWT — never a direct PostgREST insert from the device.
// Identity stamping (author from the JWT, never from the body), tenant verification,
// room_id derivation and mission-slug canonicalization all live server-side in that
// one route. Writing rows straight from the client would recreate the privilege
// escalation the server closed on 2026-07-27, and RLS blocks anon writes anyway.
//
// THE WORLD. Resolved from the signed-in user's `user_metadata.world`, the same place
// src/dashboard/lib/clientConfig.js reads it. There is deliberately NO fallback to
// "aom": defaulting a missing world is precisely the cross-tenant leak fixed on
// 2026-05-24, and on a phone it would be silent.

import Foundation
import Supabase
import UIKit

@MainActor
final class CornerAPI: ObservableObject {

    static let shared = CornerAPI()

    let client: SupabaseClient

    /// Nil = signed out. Drives the root view.
    @Published private(set) var session: Session?
    /// The signed-in user's world/tenant, or nil if their account carries none.
    @Published private(set) var world: String?

    private init() {
        client = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey
        )
        let existing = client.auth.currentSession
        session = existing
        world = CornerAPI.worldFrom(session: existing)

        Task { [weak self] in
            guard let self else { return }
            for await (_, session) in self.client.auth.authStateChanges {
                self.session = session
                self.world = CornerAPI.worldFrom(session: session)
            }
        }
    }

    // MARK: - Errors

    enum APIError: LocalizedError {
        case notSignedIn
        case noWorld
        case badResponse(status: Int, message: String)
        case decoding

        var errorDescription: String? {
            switch self {
            case .notSignedIn:
                return "You are signed out."
            case .noWorld:
                return "This account is not attached to a workspace yet."
            case .badResponse(let status, let message):
                if status == 401 { return "Your session expired. Sign in again." }
                if status == 403 { return "You do not have access to that." }
                return message.isEmpty ? "The server returned \(status)." : message
            case .decoding:
                return "The server sent something this app could not read."
            }
        }

        var isAuthFailure: Bool {
            switch self {
            case .notSignedIn: return true
            case .badResponse(let status, _): return status == 401
            default: return false
            }
        }
    }

    // MARK: - Auth

    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    func signOut() async {
        // Drop this device's push registration BEFORE the token is gone, or the row
        // keeps pointing a stranger's phone at this world's room names.
        await PushService.shared.unregisterCurrentDevice()
        try? await client.auth.signOut()
    }

    var userEmail: String? { session?.user.email }

    var userDisplayName: String? {
        guard let meta = session?.user.userMetadata else { return nil }
        for key in ["name", "full_name", "user_name"] {
            if let v = meta[key]?.stringValue, !v.isEmpty { return v }
        }
        return nil
    }

    private static func worldFrom(session: Session?) -> String? {
        guard let raw = session?.user.userMetadata["world"]?.stringValue else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespaces).lowercased()
        return trimmed.isEmpty ? nil : trimmed
    }

    // MARK: - authFetch

    /// Mirrors src/dashboard/lib/authFetch.js — attach the current access token.
    /// `client.auth.session` refreshes it when expired, so a long-backgrounded app
    /// does not come back to a wall of 401s.
    private func authorizedRequest(
        path: String,
        queryItems: [URLQueryItem] = [],
        method: String = "GET",
        jsonBody: [String: Any]? = nil
    ) async throws -> URLRequest {
        let token: String
        do {
            token = try await client.auth.session.accessToken
        } catch {
            throw APIError.notSignedIn
        }
        var components = URLComponents(
            url: Config.apiOrigin.appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        )!
        if !queryItems.isEmpty { components.queryItems = queryItems }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let jsonBody {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: jsonBody)
        }
        return request
    }

    @discardableResult
    private func run(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw APIError.badResponse(status: status, message: CornerAPI.serverMessage(from: data))
        }
        return data
    }

    /// Server errors arrive as `{ "error": "..." }`. Show the server's own words when
    /// it gave any — a copied string beats an invented one.
    private static func serverMessage(from data: Data) -> String {
        if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let err = obj["error"] as? String, !err.isEmpty {
            return err
        }
        return String(data: data.prefix(200), encoding: .utf8) ?? ""
    }

    func requireWorld() throws -> String {
        guard let world else { throw APIError.noWorld }
        return world
    }

    // MARK: - Thread

    /// GET /api/dashboard/supabase-messages. Returns oldest-first.
    func fetchMessages(room: Room, limit: Int = 100) async throws -> [MessageRow] {
        var items = room.historyQueryItems
        items.append(URLQueryItem(name: "limit", value: String(limit)))
        let request = try await authorizedRequest(
            path: "/api/dashboard/supabase-messages",
            queryItems: items
        )
        let data = try await run(request)
        guard let envelope = try? JSONDecoder().decode(MessagesEnvelope.self, from: data) else {
            throw APIError.decoding
        }
        return envelope.messages
    }

    /// POST /api/dashboard/supabase-messages — the user row whose arrival dispatches
    /// the agent. Returns the created row; its id is the parent the bridge keys every
    /// step heartbeat to, which is what makes the working indicator honest.
    @discardableResult
    func send(text: String, room: Room, interactionMode: String = "work") async throws -> MessageRow? {
        let request = try await authorizedRequest(
            path: "/api/dashboard/supabase-messages",
            method: "POST",
            jsonBody: room.sendBody(text: text, interactionMode: interactionMode)
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(SendEnvelope.self, from: data))?.message
    }

    /// GET /api/dashboard/message-steps — the agent's real heartbeats for a turn.
    func fetchSteps(room: Room, limit: Int = 40) async throws -> [MessageStep] {
        var items = [
            URLQueryItem(name: "client_id", value: room.world),
            URLQueryItem(name: "agent", value: room.stepAgentSlug),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        if let project = room.stepProjectSlug {
            items.append(URLQueryItem(name: "project", value: project))
        }
        let request = try await authorizedRequest(
            path: "/api/dashboard/message-steps",
            queryItems: items
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(StepsEnvelope.self, from: data))?.steps ?? []
    }

    // MARK: - Rail

    struct ProjectRow: Decodable, Identifiable, Hashable {
        let id: String?
        let name: String?
        let slug: String?

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            if let s = try? c.decode(String.self, forKey: .id) { id = s }
            else if let n = try? c.decode(Int.self, forKey: .id) { id = String(n) }
            else { id = nil }
            name = try? c.decodeIfPresent(String.self, forKey: .name)
            slug = try? c.decodeIfPresent(String.self, forKey: .slug)
        }
        enum CodingKeys: String, CodingKey { case id, name, slug }
    }

    struct ProjectsEnvelope: Decodable { let projects: [ProjectRow]? }

    struct MissionNode: Decodable, Hashable {
        let slug: String?
        let name: String?
    }

    struct ProjectNode: Decodable, Hashable {
        let slug: String?
        let name: String?
        let missions: [MissionNode]?
    }

    struct MissionsTreeEnvelope: Decodable { let projects: [ProjectNode]? }

    func fetchProjects() async throws -> [ProjectRow] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/projects",
            queryItems: [URLQueryItem(name: "client", value: world)]
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(ProjectsEnvelope.self, from: data))?.projects ?? []
    }

    func fetchMissionsTree() async throws -> [ProjectNode] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/missions-tree",
            queryItems: [URLQueryItem(name: "client", value: world)]
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(MissionsTreeEnvelope.self, from: data))?.projects ?? []
    }

    // MARK: - Push device registration

    /// POST /api/push/register-device. The server takes user_id AND world from the
    /// JWT and ignores anything the body claims about either, so this sends only what
    /// the server cannot know: the token and which build produced it.
    func registerDevice(token: String) async throws {
        let body: [String: Any] = [
            "token": token,
            "platform": "ios",
            "environment": Config.apnsEnvironment,
            "bundleId": Config.bundleID,
            "deviceName": UIDevice.current.name,
            "appVersion": Config.appVersion,
        ]
        let request = try await authorizedRequest(
            path: "/api/push/register-device",
            method: "POST",
            jsonBody: body
        )
        try await run(request)
    }

    func unregisterDevice(token: String) async throws {
        let request = try await authorizedRequest(
            path: "/api/push/register-device",
            method: "DELETE",
            jsonBody: ["token": token]
        )
        try await run(request)
    }

    // MARK: - Account deletion (App Store guideline 5.1.1(v))

    struct DeletionSummary: Decodable {
        let email: String?
        let name: String?
        let world: String?
        let deletes: [String]?
        let keeps: [String]?
    }

    struct DeletionBegin: Decodable {
        let confirmation: String?
        let requiresText: String?
        let expiresInSeconds: Int?
        let summary: DeletionSummary?
    }

    /// Step 1: ask the server what deleting this account actually does, and get the
    /// short-lived confirmation token bound to this user.
    ///
    /// The consequences shown on screen come from the SERVER's own summary, not from
    /// a string in this app. If someone later changes which tables the endpoint
    /// touches, the words the user reads change with it — an app-side copy of that
    /// list is a promise that goes stale silently.
    func beginAccountDeletion() async throws -> DeletionBegin {
        let request = try await authorizedRequest(
            path: "/api/account/delete",
            method: "POST",
            jsonBody: ["step": "begin"]
        )
        let data = try await run(request)
        guard let begin = try? JSONDecoder().decode(DeletionBegin.self, from: data) else {
            throw APIError.decoding
        }
        return begin
    }

    /// Step 2: the irreversible one. `confirmText` must be the literal word the server
    /// asked for; it validates it again regardless of what this app checked.
    func confirmAccountDeletion(confirmation: String, typed: String) async throws {
        let request = try await authorizedRequest(
            path: "/api/account/delete",
            method: "POST",
            jsonBody: ["confirmation": confirmation, "confirmText": typed]
        )
        try await run(request)
    }

    // MARK: - Realtime

    /// Live subscription for one room. Every INSERT on the room's canonical room_id
    /// triggers `onInsert`, and the caller RELOADS the thread rather than decoding and
    /// appending — byte-for-byte the web's behavior, and it makes a missed event
    /// self-healing instead of a permanent hole in the thread.
    final class RoomSubscription {
        private let channel: RealtimeChannelV2
        private let client: SupabaseClient
        private var handle: RealtimeSubscription?
        private var task: Task<Void, Never>?

        fileprivate init(client: SupabaseClient, room: Room, onInsert: @escaping @Sendable () -> Void) {
            self.client = client
            self.channel = client.realtimeV2.channel("native-thread-\(room.roomID)")
            // Registering the callback BEFORE subscribe is the SDK's contract; the
            // other order silently drops the first events.
            handle = channel.onPostgresChange(
                InsertAction.self,
                schema: "public",
                table: "messages",
                filter: .eq("room_id", value: room.roomID)
            ) { _ in
                onInsert()
            }
            let channel = self.channel
            task = Task {
                do {
                    try await channel.subscribeWithError()
                } catch {
                    // Offline, or a token hiccup. The reconcile poll still carries
                    // everything — realtime is the accelerator, not the guarantee.
                }
            }
        }

        func stop() {
            task?.cancel()
            task = nil
            handle?.cancel()
            handle = nil
            let channel = channel
            let client = client
            Task { await client.realtimeV2.removeChannel(channel) }
        }
    }

    func subscribe(room: Room, onInsert: @escaping @Sendable () -> Void) -> RoomSubscription {
        RoomSubscription(client: client, room: room, onInsert: onInsert)
    }
}
