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
        // `.local` clears the Keychain-persisted session with NO network round-trip. The
        // default `.global` scope calls /logout and throws on any non-2xx (expired token,
        // offline, a 403) BEFORE removing the local session — and `try?` swallowed that
        // throw, leaving the Keychain session intact so the app came back on Home still
        // signed in. Local cannot fail that way: it removes the session, period.
        try? await client.auth.signOut(scope: .local)
        // Do not wait on the authStateChanges stream to flip the gate. Drive the published
        // state to signed-out this runloop so RootView returns to the login screen the
        // instant the Account sheet dismisses. The stream's own .signedOut lands after and
        // sets these to nil again — idempotent.
        session = nil
        world = nil
    }

    var userEmail: String? { session?.user.email }

    /// Email is AOM's private operations desk, not a tenant feature. The server
    /// still enforces the support tenant; this gate prevents the surface from
    /// appearing for client/review accounts in the first place.
    var isEmailOwner: Bool {
        guard world == "aom", let email = userEmail?.lowercased() else { return false }
        return email.hasSuffix("@aom-inhouse.com") || email == "patrikmatheson@gmail.com"
    }

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
    ///
    /// The `MessageTransport` witness. Every send through this entry point is a room the
    /// user is already inside (the room composer, a room picked in the confirm sheet), so
    /// it never carries a route stamp — it forwards with `routed: nil`.
    @discardableResult
    func send(text: String, room: Room, interactionMode: String = "work") async throws -> MessageRow? {
        try await send(text: text, room: room, interactionMode: interactionMode, routed: nil)
    }

    /// The home-composer seed path. `routed` is the R11 provenance stamp, present ONLY
    /// when Corner's router auto-opened this room for a room-less message. It is what lets
    /// `api/dashboard/room-activity.js` quarantine the exchange out of the room's digest
    /// until the user accepts it — mirroring seedRoom's `metadata.routed { auto, confidence }`.
    /// Kept off the `MessageTransport` protocol on purpose: provenance is an intake concern,
    /// not part of the room-thread seam the failure tests run against.
    @discardableResult
    func send(text: String, room: Room, interactionMode: String, routed: RouteProvenance?) async throws -> MessageRow? {
        try await send(text: text, room: room, interactionMode: interactionMode, routed: routed, attachments: [])
    }

    /// The full send: text plus any files the composer staged, one POST, one row —
    /// exactly how the web's composer rides pendingAttachments into the write path.
    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String, attachments: [Attachment]
    ) async throws -> MessageRow? {
        try await send(text: text, room: room, interactionMode: interactionMode, routed: nil, attachments: attachments)
    }

    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        attachments: [Attachment], roomAgent: String?
    ) async throws -> MessageRow? {
        try await send(
            text: text, room: room, interactionMode: interactionMode,
            routed: nil, attachments: attachments, roomAgent: roomAgent
        )
    }

    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        attachments: [Attachment], roomAgent: String?, clientMessageID: String
    ) async throws -> MessageRow? {
        try await send(
            text: text, room: room, interactionMode: interactionMode,
            routed: nil, attachments: attachments, roomAgent: roomAgent,
            clientMessageID: clientMessageID
        )
    }

    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        routed: RouteProvenance?, attachments: [Attachment]
    ) async throws -> MessageRow? {
        try await send(
            text: text, room: room, interactionMode: interactionMode,
            routed: routed, attachments: attachments, roomAgent: nil
        )
    }

    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        routed: RouteProvenance?, attachments: [Attachment], roomAgent: String?,
        clientMessageID: String? = nil
    ) async throws -> MessageRow? {
        let request = try await authorizedRequest(
            path: "/api/dashboard/supabase-messages",
            method: "POST",
            jsonBody: room.sendBody(
                text: text, interactionMode: interactionMode,
                routed: routed, attachments: attachments, roomAgent: roomAgent,
                clientMessageID: clientMessageID
            )
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(SendEnvelope.self, from: data))?.message
    }

    // MARK: - Uploads (corner:native-ios R4 — the web's own tunnel lane)

    /// A file pushed through the upload lane, ready to ride a send.
    struct UploadedFile: Identifiable, Equatable {
        let url: String
        let name: String
        let mime: String
        let size: Int
        var id: String { url }

        var asAttachment: Attachment {
            Attachment(url: url, name: name, mime: mime, size: size, gateStatus: "")
        }
    }

    /// POST {rag}/upload-file-binary — the SAME lane the web composer uses
    /// (useChatAttachments.uploadViaTunnel): raw bytes, Bearer JWT, per-chat scope
    /// params so the rag-server lands the file in this chat's own Uploads/ folder.
    /// The web's base64-through-Vercel fallback is deliberately not ported — it
    /// predates chat-folder routing and drops files at the legacy flat root, which
    /// is the "it's in your Files panel but it isn't" class of bug.
    func uploadFile(data: Data, filename: String, mime: String, room: Room) async throws -> UploadedFile {
        let token: String
        do { token = try await client.auth.session.accessToken }
        catch { throw APIError.notSignedIn }
        let world = try requireWorld()

        var components = URLComponents(string: "https://rag.aheadofmarket.com/upload-file-binary")!
        var items = [
            URLQueryItem(name: "world", value: world),
            URLQueryItem(name: "filename", value: filename.isEmpty ? "upload.bin" : filename),
            URLQueryItem(name: "mime", value: mime),
        ]
        switch room.kind {
        case .agent(let slug):
            items.append(URLQueryItem(name: "agent", value: slug))
        case .project(let slug):
            items.append(URLQueryItem(name: "project", value: slug))
        case .mission(let slug, let project):
            items.append(URLQueryItem(name: "project", value: project))
            items.append(URLQueryItem(name: "mission", value: Room.bareMissionSlug(slug, project: project)))
        }
        components.queryItems = items

        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(mime, forHTTPHeaderField: "Content-Type")
        request.httpBody = data

        let payload = try await run(request)
        guard let json = try? JSONSerialization.jsonObject(with: payload) as? [String: Any],
              let rawURL = json["url"] as? String, !rawURL.isEmpty else {
            throw APIError.decoding
        }
        let fullURL = rawURL.hasPrefix("http") ? rawURL : "https://rag.aheadofmarket.com" + rawURL
        return UploadedFile(
            url: fullURL,
            name: filename,
            mime: (json["mime_type"] as? String) ?? mime,
            size: (json["size"] as? Int) ?? data.count
        )
    }

    // MARK: - Image generation (corner:native-ios R16)

    struct GeneratedImage: Equatable {
        let data: Data
        let mime: String
        let tool: String
        let prompt: String
    }

    /// Generate through Corner's authenticated provider router, then resolve the
    /// provider response into bytes immediately. Provider URLs can expire; callers
    /// upload these bytes into the room before presenting success.
    func generateImage(tool: String, prompt: String) async throws -> GeneratedImage {
        let world = try requireWorld()
        var request = try await authorizedRequest(
            path: "/api/dashboard/image-gen",
            method: "POST",
            jsonBody: ["tool": tool, "prompt": prompt, "client_id": world]
        )
        request.timeoutInterval = 180
        let payload = try await run(request)
        guard let json = try? JSONSerialization.jsonObject(with: payload) as? [String: Any] else {
            throw APIError.decoding
        }

        let bytes: Data
        if let b64 = json["b64"] as? String, let decoded = Data(base64Encoded: b64) {
            bytes = decoded
        } else if let rawURL = json["url"] as? String, let url = URL(string: rawURL) {
            var download = URLRequest(url: url)
            download.timeoutInterval = 120
            let (data, response) = try await URLSession.shared.data(for: download)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard (200..<300).contains(status), !data.isEmpty else {
                throw APIError.badResponse(status: status, message: "Generated image could not be downloaded")
            }
            bytes = data
        } else {
            throw APIError.decoding
        }
        return GeneratedImage(data: bytes, mime: "image/png", tool: tool, prompt: prompt)
    }

    // MARK: - Owner Email desk (corner:native-ios R16 E1/E2)

    func fetchEmailWishes() async throws -> [EmailWish] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/support/wishes",
            queryItems: [URLQueryItem(name: "world", value: world)]
        )
        let data = try await run(request)
        struct Envelope: Decodable { let wishes: [EmailWish] }
        guard let envelope = try? JSONDecoder().decode(Envelope.self, from: data) else { throw APIError.decoding }
        return envelope.wishes
    }

    func fetchEmailMailboxes(days: Int = 7) async throws -> [EmailMailbox] {
        let request = try await authorizedRequest(
            path: "/api/support/inbox",
            method: "POST",
            jsonBody: ["email": userEmail ?? "", "days": max(1, min(days, 14))]
        )
        let data = try await run(request)
        struct Envelope: Decodable { let mailboxes: [EmailMailbox] }
        guard let envelope = try? JSONDecoder().decode(Envelope.self, from: data) else { throw APIError.decoding }
        return envelope.mailboxes
    }

    func fetchEmailSuggestion(wishID: String) async throws -> EmailSuggestion {
        let request = try await authorizedRequest(
            path: "/api/support/suggest",
            queryItems: [URLQueryItem(name: "wish_id", value: wishID)]
        )
        let data = try await run(request)
        guard let result = try? JSONDecoder().decode(EmailSuggestion.self, from: data) else { throw APIError.decoding }
        return result
    }

    func fetchEmailThread(item: EmailItem) async throws -> [EmailThreadMessage] {
        let query: [URLQueryItem]
        switch item.source {
        case .wish(let wish):
            query = [URLQueryItem(name: "wish_id", value: wish.id)]
        case .mailbox(let threadID, let account):
            query = [URLQueryItem(name: "thread_id", value: threadID), URLQueryItem(name: "account", value: account)]
        }
        let request = try await authorizedRequest(path: "/api/support/thread", queryItems: query)
        let data = try await run(request)
        struct Envelope: Decodable { let thread: [EmailThreadMessage] }
        guard let envelope = try? JSONDecoder().decode(Envelope.self, from: data) else { throw APIError.decoding }
        return envelope.thread
    }

    func sendStagedEmail(wishID: String, draftID: String, connectionID: String) async throws {
        let request = try await authorizedRequest(
            path: "/api/support/send-staged", method: "POST",
            jsonBody: ["action": "send", "wish_id": wishID, "draft_id": draftID, "connection_id": connectionID]
        )
        _ = try await run(request)
    }

    func replyToEmail(wishID: String, text: String) async throws {
        let request = try await authorizedRequest(
            path: "/api/support/reply", method: "POST",
            jsonBody: ["wish_id": wishID, "text": text]
        )
        _ = try await run(request)
    }

    func resolveEmail(wishID: String) async throws {
        let request = try await authorizedRequest(
            path: "/api/support/wishes",
            queryItems: [URLQueryItem(name: "id", value: wishID)],
            method: "PATCH", jsonBody: ["status": "resolved"]
        )
        _ = try await run(request)
    }

    func fetchAutoReplyStatus() async throws -> AutoReplyStatus {
        let request = try await authorizedRequest(
            path: "/api/dashboard/support-autoreply",
            queryItems: [URLQueryItem(name: "world", value: "aom")]
        )
        let data = try await run(request)
        guard let status = try? JSONDecoder().decode(AutoReplyStatus.self, from: data) else { throw APIError.decoding }
        return status
    }

    func setAutoReply(action: String) async throws -> AutoReplyStatus {
        let request = try await authorizedRequest(
            path: "/api/dashboard/support-autoreply", method: "POST",
            jsonBody: ["action": action, "world": "aom"]
        )
        let data = try await run(request)
        guard let status = try? JSONDecoder().decode(AutoReplyStatus.self, from: data) else { throw APIError.decoding }
        return status
    }

    // MARK: - Native AirPods conversation (corner:airpods-mode R16)

    struct VoiceSessionConfig {
        let webSocketURL: URL
        let setupMessage: [String: Any]
    }

    func createVoiceSession(sessionID: String) async throws -> VoiceSessionConfig {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/voice-session", method: "POST",
            jsonBody: [
                "agent": "corner", "client_id": world, "voice": "Kore",
                "temperature": 0.85, "mode": "airpods", "session_id": sessionID,
            ]
        )
        let data = try await run(request)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let rawURL = json["wsUrl"] as? String, let url = URL(string: rawURL),
              let setup = json["setupMessage"] as? [String: Any]
        else { throw APIError.decoding }
        return VoiceSessionConfig(webSocketURL: url, setupMessage: setup)
    }

    func runVoiceAction(sessionID: String, action: String, arguments: [String: Any]) async throws -> [String: Any] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/airpods-action", method: "POST",
            jsonBody: ["client_id": world, "session_id": sessionID, "action": action, "arguments": arguments]
        )
        let data = try await run(request)
        return (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? ["ok": true]
    }

    func handoffVoiceSession(sessionID: String, duration: Int, transcript: [[String: Any]]) async throws {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/airpods-handoff", method: "POST",
            jsonBody: [
                "client_id": world, "session_id": sessionID,
                "duration_secs": duration, "transcript": transcript,
                "active_context": ["view": "native"],
            ]
        )
        _ = try await run(request)
    }

    // MARK: - Model preference (corner:native-ios R4)

    /// GET /api/dashboard/agent-model — the workspace's per-room model choices, the
    /// same user_preferences row the web composer reads. Keys per
    /// Room.modelPreferenceKey; "_all" is the workspace-wide default.
    func agentModels() async throws -> [String: String] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/agent-model",
            queryItems: [URLQueryItem(name: "client", value: world)]
        )
        let data = try await run(request)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw APIError.decoding
        }
        return (json["models"] as? [String: String]) ?? [:]
    }

    /// PATCH /api/dashboard/agent-model — save one room's model choice.
    func setAgentModel(preferenceKey: String, model: String) async throws {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/agent-model",
            method: "PATCH",
            jsonBody: ["slug": preferenceKey, "model": model, "client_id": world]
        )
        _ = try await run(request)
    }

    // MARK: - Room specialist preference (corner:native-ios R15)

    struct RoomAgentOption: Decodable, Identifiable, Equatable {
        let slug: String
        let title: String
        let role: String
        var id: String { slug }
    }

    struct RoomAgentsResult: Equatable {
        let agents: [RoomAgentOption]
        let assignments: [String: String]
    }

    /// GET returns the live agent_status roster plus this world's room map. The
    /// roster is deliberately server-owned so the 72-hour agent sweep reaches the
    /// phone without waiting for another App Store build.
    func roomAgents() async throws -> RoomAgentsResult {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/room-agent",
            queryItems: [URLQueryItem(name: "client", value: world)]
        )
        let data = try await run(request)
        struct Envelope: Decodable {
            let agents: [RoomAgentOption]
            let assignments: [String: String]
        }
        guard let envelope = try? JSONDecoder().decode(Envelope.self, from: data) else {
            throw APIError.decoding
        }
        return RoomAgentsResult(agents: envelope.agents, assignments: envelope.assignments)
    }

    /// PATCH assigns who answers one canonical room, or clears it with "default".
    func setRoomAgent(preferenceKey: String, agent: String) async throws {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/room-agent",
            method: "PATCH",
            jsonBody: ["room": preferenceKey, "agent": agent, "client_id": world]
        )
        _ = try await run(request)
    }

    /// POST /api/dashboard/intake-route — Corner's routing brain, the SAME endpoint the
    /// web front door uses. Given the room-less message the user typed at the home
    /// composer plus the rooms they can see, it returns where the message belongs (an
    /// existing room to open, or that nothing fit). PURE classification: it creates and
    /// writes NOTHING. The caller seeds the chosen room through the one write path
    /// (`send`) once the destination is settled, exactly like useIntakeRoute.
    ///
    /// The endpoint always answers 200 with a valid contract object, so a network throw
    /// is the only failure — the caller falls to the confirm sheet and never loses the
    /// text.
    func routeIntake(
        message: String,
        interactionMode: String,
        candidates: [String: Any],
        recentRooms: [[String: Any]]
    ) async throws -> IntakeDecision {
        let world = try requireWorld()
        let body: [String: Any] = [
            "client_id": world,
            "message": message,
            "interaction_mode": interactionMode,
            "candidates": candidates,
            "recent_rooms": recentRooms,
        ]
        let request = try await authorizedRequest(
            path: "/api/dashboard/intake-route",
            method: "POST",
            jsonBody: body
        )
        let data = try await run(request)
        guard let decision = try? JSONDecoder().decode(IntakeDecision.self, from: data) else {
            throw APIError.decoding
        }
        return decision
    }

    // MARK: - Room reset (/clear)

    /// POST /api/dashboard/room-reset — archives the current thread.
    /// Mirrors useRoomThread.clearRoom() in Cv6FullComposer exactly:
    /// mission payload → { client_id, agent:"corner", project, mission_slug (bare) }
    /// project payload → { client_id, agent:"corner", project }
    /// agent payload   → { client_id, agent }
    @discardableResult
    func clearRoom(room: Room) async throws -> Bool {
        let worldId = try requireWorld()
        let payload: [String: Any]
        switch room.kind {
        case .mission(let slug, let project):
            let bare = Room.bareMissionSlug(slug, project: project)
            payload = ["client_id": worldId, "agent": "corner", "project": project, "mission_slug": bare]
        case .project(let slug):
            payload = ["client_id": worldId, "agent": "corner", "project": slug]
        case .agent(let slug):
            payload = ["client_id": worldId, "agent": slug]
        }
        let request = try await authorizedRequest(
            path: "/api/dashboard/room-reset",
            method: "POST",
            jsonBody: payload
        )
        try await run(request)
        return true
    }

    // MARK: - Room checklists (R11)

    /// GET /api/dashboard/room-checklists — load this room's private lists.
    func fetchChecklists(room: Room) async throws -> [ChecklistList] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/room-checklists",
            queryItems: [
                URLQueryItem(name: "world", value: world),
                URLQueryItem(name: "room", value: room.checklistRoomKey),
            ]
        )
        let data = try await run(request)
        struct Envelope: Decodable { let lists: [ChecklistList] }
        return (try? JSONDecoder().decode(Envelope.self, from: data))?.lists ?? []
    }

    /// POST /api/dashboard/room-checklists — mutate (add/edit/toggle/delete).
    /// Returns the updated list array. Mirrors useRoomChecklists.mutate() on the web.
    func mutateChecklist(room: Room, action: String, fields: [String: Any] = [:]) async throws -> [ChecklistList] {
        let world = try requireWorld()
        var body: [String: Any] = [
            "world": world,
            "room": room.checklistRoomKey,
            "action": action,
        ]
        for (key, value) in fields { body[key] = value }
        let request = try await authorizedRequest(
            path: "/api/dashboard/room-checklists",
            method: "POST",
            jsonBody: body
        )
        let data = try await run(request)
        struct Envelope: Decodable { let lists: [ChecklistList] }
        return (try? JSONDecoder().decode(Envelope.self, from: data))?.lists ?? []
    }

    /// GET /api/dashboard/message-steps — the agent's real heartbeats for a turn.
    /// Default 100, the web's persistence-poll window: the steps feed is shared by
    /// every room in the world, and 40 let a busy afternoon push a long turn's own
    /// steps out of the window — which read as the turn losing its heartbeat.
    func fetchSteps(room: Room, limit: Int = 100) async throws -> [MessageStep] {
        try await fetchSteps(room: room, roomAgent: nil, limit: limit)
    }

    func fetchSteps(room: Room, roomAgent: String?, limit: Int = 100) async throws -> [MessageStep] {
        let selected = (roomAgent ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let stepAgent = selected.isEmpty || selected == "default" ? room.stepAgentSlug : selected
        var items = [
            URLQueryItem(name: "client_id", value: room.world),
            URLQueryItem(name: "agent", value: stepAgent),
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

    // MARK: - Integrations

    /// One connected-integration entry from `/api/integrations/list`.
    struct IntegrationEntry: Decodable {
        let slug: String
        let status: String          // "connected" | "disconnected"
        let connected_at: String?
        let system: Bool?
        let system_note: String?
    }

    private struct IntegrationsEnvelope: Decodable {
        let integrations: [IntegrationEntry]
    }

    /// Fetch the account's connected integration state from the server.
    /// Returns the raw entries (caller decides what "connected" means).
    /// Throws when the server is unreachable or returns a non-2xx response.
    func fetchIntegrationsList() async throws -> [IntegrationEntry] {
        let request = try await authorizedRequest(path: "/api/integrations/list")
        let data = try await run(request)
        return (try? JSONDecoder().decode(IntegrationsEnvelope.self, from: data))?.integrations ?? []
    }

    // MARK: - Recency (the home timeline)

    /// One entry per active room from `/api/dashboard/room-activity`: when it last saw
    /// traffic, and a human digest of its recent lines. `last_message_at` is an ISO
    /// timestamp string; `last_message_text` is a " · "-joined digest (RoomPreview.clean
    /// takes the first human segment).
    struct RoomActivity: Decodable {
        struct Entry: Decodable {
            let last_message_at: String?
            let last_message_text: String?
        }
        /// keyed by project slug
        let projects: [String: Entry]?
        /// keyed by "<project>:<bare mission slug>"
        let missions: [String: Entry]?
        /// keyed by agent slug (e.g. "bobby", "rex") — the agents bucket added in R9
        let agents: [String: Entry]?
    }

    /// GET /api/dashboard/room-activity?client=<world>.
    ///
    /// The SAME wide-window (~11 day) recency feed the web home reads (contract §2). It
    /// covers project and mission rooms; direct 1:1 agent threads are NOT in it (the web
    /// derives those from its message-poll inbox feed, which this client does not run).
    /// `?client=` is sent so the response takes the endpoint's 180s edge cache.
    func fetchRoomActivity() async throws -> RoomActivity {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/room-activity",
            queryItems: [URLQueryItem(name: "client", value: world)]
        )
        let data = try await run(request)
        guard let env = try? JSONDecoder().decode(RoomActivity.self, from: data) else {
            throw APIError.decoding
        }
        return env
    }

    // MARK: - This room's files (the crossings)

    /// The SAME room-scoped thread query, narrowed to rows that carry a file
    /// (`attachments=1`). One query, so the Files panel can never disagree with the
    /// conversation — it IS the conversation, filtered.
    ///
    /// `limit` 400 matches the web. When the server hands back a full window the caller
    /// says so out loud rather than implying these are all the files that ever crossed.
    func fetchRoomFiles(room: Room, limit: Int = 400) async throws -> (rows: [MessageRow], windowFull: Bool) {
        var items = room.historyQueryItems
        items.append(URLQueryItem(name: "attachments", value: "1"))
        items.append(URLQueryItem(name: "limit", value: String(limit)))
        let request = try await authorizedRequest(
            path: "/api/dashboard/supabase-messages",
            queryItems: items
        )
        let data = try await run(request)
        guard let envelope = try? JSONDecoder().decode(MessagesEnvelope.self, from: data) else {
            throw APIError.decoding
        }
        return (envelope.messages, envelope.messages.count >= limit)
    }

    // MARK: - Review

    /// GET /api/dashboard/review-queue. Default view is the WAITING set: agent
    /// hand-offs with no closing decision yet. The server owns that definition
    /// (uploads never wait, decided items are suppressed by id and by content digest)
    /// and this client deliberately does not re-derive any of it.
    func fetchReviewQueue(limit: Int = 40, offset: Int = 0) async throws -> ReviewQueueEnvelope {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/review-queue",
            queryItems: [
                URLQueryItem(name: "world", value: world),
                URLQueryItem(name: "limit", value: String(limit)),
                URLQueryItem(name: "offset", value: String(offset)),
            ]
        )
        let data = try await run(request)
        guard let envelope = try? JSONDecoder().decode(ReviewQueueEnvelope.self, from: data) else {
            throw APIError.decoding
        }
        return envelope
    }

    /// POST /api/dashboard/review-decision — the real endpoint, with the real body.
    ///
    /// `request-changes` writes the agent a queued `tasks` row server-side and 500s if
    /// that insert fails, precisely so a UI cannot report "sent" over a note that went
    /// nowhere. So a non-2xx here means NOTHING was recorded, and the caller has to say
    /// that instead of optimistically dropping the item.
    ///
    /// The identity trio (deliverable + source_path + sha256) is what makes a verdict
    /// stick to the FILE rather than to one message id.
    @discardableResult
    func postReviewDecision(
        deliverable: String,
        action: ReviewAction,
        notes: String? = nil,
        title: String? = nil,
        project: String? = nil,
        mission: String? = nil,
        sourcePath: String? = nil,
        sha256: String? = nil
    ) async throws -> ReviewDecisionResult {
        let world = try requireWorld()
        var body: [String: Any] = [
            "deliverable": deliverable,
            "action": action.rawValue,
            "world": world,
        ]
        // Omit rather than send empty strings: the server cleans and stores whatever it
        // is given, and an empty source_path would write a decision row whose content
        // key is half-formed — which review-queue.js then cannot match on.
        if let notes, !notes.isEmpty { body["notes"] = notes }
        if let title, !title.isEmpty { body["title"] = title }
        if let project, !project.isEmpty { body["project"] = project }
        if let mission, !mission.isEmpty { body["mission"] = mission }
        if let sourcePath, !sourcePath.isEmpty { body["source_path"] = sourcePath }
        if let sha256, sha256.count == 64 { body["sha256"] = sha256.lowercased() }

        let request = try await authorizedRequest(
            path: "/api/dashboard/review-decision",
            method: "POST",
            jsonBody: body
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(ReviewDecisionResult.self, from: data))
            ?? ReviewDecisionResult(ok: true, taskID: nil, decisionID: nil)
    }

    // MARK: - Organize (the Files surface)

    /// GET /api/dashboard/files?type=organize — ONE project's files, uploads and review
    /// ghosts, plus the world's waiting total.
    ///
    /// `project` is always sent. The endpoint has always accepted it and scopes both its
    /// mirror read and its upload read by it; the web omits it and pulls the whole world
    /// (18,545 rows for `aom`, counted live 2026-08-10) every 30 seconds. That is a
    /// desktop-only affordance and it is why this call names its folder.
    func fetchOrganize(project: String) async throws -> OrganizeEnvelope {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/files",
            queryItems: [
                URLQueryItem(name: "type", value: "organize"),
                URLQueryItem(name: "client", value: world),
                URLQueryItem(name: "project", value: project),
            ]
        )
        let data = try await run(request)
        guard let envelope = try? JSONDecoder().decode(OrganizeEnvelope.self, from: data) else {
            throw APIError.decoding
        }
        return envelope
    }

    /// GET /api/dashboard/files?type=uploads — the user's own chat uploads, and nothing
    /// else. This is what the Personal bucket is made of, and asking `type=organize` for
    /// it would drag the entire disk mirror along for files that are not in it.
    func fetchUploads(limit: Int = 500) async throws -> [UploadRow] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/files",
            queryItems: [
                URLQueryItem(name: "type", value: "uploads"),
                URLQueryItem(name: "client", value: world),
                URLQueryItem(name: "limit", value: String(limit)),
            ]
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(OrganizeEnvelope.UploadsOnly.self, from: data))?.files ?? []
    }

    /// GET /api/dashboard/files?type=mirror&id=… — one mirror row WITH its text.
    ///
    /// Only for files whose bytes are text: the row carries a `content` column the disk
    /// watcher fills for readable files. Media never comes through here — it streams from
    /// the tunnel via FileStore, because pulling a video through a JSON column would be
    /// absurd and the column is empty for it anyway.
    func fetchFileText(id: String) async throws -> String? {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/files",
            queryItems: [
                URLQueryItem(name: "type", value: "mirror"),
                URLQueryItem(name: "client", value: world),
                URLQueryItem(name: "id", value: id),
                URLQueryItem(name: "content", value: "1"),
            ]
        )
        let data = try await run(request)
        struct Envelope: Decodable { let file: MirrorRow? }
        return (try? JSONDecoder().decode(Envelope.self, from: data))?.file?.content
    }

    // MARK: - Tracker

    /// GET /api/dashboard/cv6-bugs.
    ///
    /// `world` IS sent. The web omits it and the endpoint defaults to 'aom', so every
    /// tenant's Tracker on the web reads AOM's board — the store is per-world server-side
    /// (`cm_state.client_id`), so the world is the only honest reading.
    func fetchBugs() async throws -> [BugRow] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/cv6-bugs",
            queryItems: [URLQueryItem(name: "world", value: world)]
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(BugsEnvelope.self, from: data))?.bugs ?? []
    }

    /// GET /api/dashboard/admin-tickets — a client's live ticket board, read only.
    /// Answers 503 with an explanatory body when the bridge key is unset on the
    /// deployment, which the UI repeats rather than showing an empty board.
    func fetchTickets() async throws -> [TicketRow] {
        let request = try await authorizedRequest(path: "/api/dashboard/admin-tickets")
        let data = try await run(request)
        return (try? JSONDecoder().decode(TicketsEnvelope.self, from: data))?.tickets ?? []
    }

    func fetchCustomTrackers() async throws -> [CustomTracker] {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/trackers",
            queryItems: [URLQueryItem(name: "world", value: world)]
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(CustomTrackersEnvelope.self, from: data))?.trackers ?? []
    }

    /// POST /api/dashboard/cv6-bugs { action: 'update' }. `status` must be one of the
    /// endpoint's three literals or it answers 400; IssueStatus.wireValue spells them.
    func updateBug(id: String, status: String?, owner: String?) async throws {
        let world = try requireWorld()
        var body: [String: Any] = ["action": "update", "world": world, "id": id]
        if let status, !status.isEmpty { body["status"] = status }
        if let owner { body["owner"] = owner }
        let request = try await authorizedRequest(
            path: "/api/dashboard/cv6-bugs",
            method: "POST",
            jsonBody: body
        )
        try await run(request)
    }

    /// POST /api/dashboard/cv6-bugs { action: 'add' }. The reporter is taken from the
    /// JWT server-side (three people share the AOM world), so nothing here claims one.
    func addBug(title: String, expected: String, severity: String, status: String, owner: String) async throws {
        let world = try requireWorld()
        var body: [String: Any] = [
            "action": "add",
            "world": world,
            "page": "mobile",
            "title": title,
            "expected": expected,
            "severity": severity,
            "status": status,
        ]
        if !owner.isEmpty { body["owner"] = owner }
        let request = try await authorizedRequest(
            path: "/api/dashboard/cv6-bugs",
            method: "POST",
            jsonBody: body
        )
        try await run(request)
    }

    /// POST /api/dashboard/trackers { action: 'add-row' } — an APPEND, which is the only
    /// custom-tracker write that cannot mis-target: every other action addresses a row by
    /// positional index into shared mutable state.
    func addTrackerRow(trackerID: String, row: [String: String]) async throws {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/trackers",
            method: "POST",
            jsonBody: ["action": "add-row", "world": world, "id": trackerID, "row": row]
        )
        try await run(request)
    }

    // MARK: - Assign an artifact to an agent

    /// The dispatch write, byte-for-byte the web's (cv6kit/AssignButton.jsx): a message
    /// into the agent's own room through the ONE write path, carrying a human first line,
    /// the notes, and the machine ref so the agent can find the exact artifact.
    ///
    /// There is no "assignments" table. The row IS the assignment — the bridge picks it
    /// up, the agent works it, and the message is the platform's eternal record of it.
    @discardableResult
    func assign(
        artifactType: String,
        artifactID: String,
        label: String,
        details: String,
        project: String?,
        toAgentSlug slug: String
    ) async throws -> MessageRow? {
        let world = try requireWorld()
        let kinds = [
            "email": "email", "file": "file", "doc": "document",
            "bug": "bug", "deliverable": "deliverable", "transcript": "transcript",
        ]
        let kind = kinds[artifactType] ?? "item"
        var lines = ["Assigned to you from the dashboard: \(kind) \"\(label)\"."]
        if !details.isEmpty { lines.append("\nNotes:\n\(details)") }
        if !artifactID.isEmpty { lines.append("\n(ref: \(artifactType):\(artifactID))") }

        // `project` is omitted rather than sent as null when there is none. The web sends
        // an explicit null; both read the same at the far end, and an omitted key cannot
        // be mistaken for a project literally named "null" by anything downstream.
        var assign: [String: Any] = ["type": artifactType, "id": artifactID]
        if let project, !project.isEmpty { assign["project"] = project }

        let body: [String: Any] = [
            "agent": slug,
            "text": lines.joined(separator: "\n"),
            "role": "user",
            "source": Config.messageSource,
            "client_id": world,
            "metadata": ["assign": assign],
        ]
        let request = try await authorizedRequest(
            path: "/api/dashboard/supabase-messages",
            method: "POST",
            jsonBody: body
        )
        let data = try await run(request)
        return (try? JSONDecoder().decode(SendEnvelope.self, from: data))?.message
    }

    // MARK: - File bytes

    /// The bearer token, for the file downloader. Downloads stream to disk through their
    /// own URLSession delegate, so they cannot go through `run()` — but they must still
    /// carry the same identity, and the token must still be the refreshed one.
    func currentAccessToken() async throws -> String {
        do { return try await client.auth.session.accessToken }
        catch { throw APIError.notSignedIn }
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

    // MARK: - Avatar identity (corner:native-ios — tap to edit photo/initials/color)

    /// The three visual identity fields the user can edit. Mirrors the web's
    /// `{ initials, color, image }` draft object in AvatarIdentityDialog.jsx.
    struct AvatarIdentity: Equatable {
        var initials: String
        var hexColor: String   // "#RRGGBB"
        var imageURL: String?  // nil → show initials
    }

    /// Derive initials from a display name (fallback when no saved initials exist).
    private static func defaultInitials(from name: String) -> String {
        let words = name.trimmingCharacters(in: .whitespaces)
            .components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        if words.count >= 2 {
            return (String(words[0].prefix(1)) + String(words[1].prefix(1))).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    /// The signed-in user's current avatar identity, read from session metadata.
    /// Falls back to name-derived initials + the web's default blue when nothing is saved.
    var userAvatarIdentity: AvatarIdentity {
        let meta = session?.user.userMetadata ?? [:]
        let displayName = userDisplayName
            ?? userEmail?.split(separator: "@").first.map(String.init)
            ?? "U"
        let savedInitials = meta["avatar_initials"]?.stringValue
        let savedColor   = meta["avatar_color"]?.stringValue
        let savedURL     = meta["avatar_url"]?.stringValue

        let initials: String
        if let si = savedInitials, !si.isEmpty { initials = si }
        else { initials = CornerAPI.defaultInitials(from: displayName) }

        let hexColor: String
        if let sc = savedColor,
           sc.hasPrefix("#"), sc.count == 7 { hexColor = sc }
        else { hexColor = "#2563EB" }

        let imageURL: String?
        if let url = savedURL, !url.isEmpty { imageURL = url } else { imageURL = nil }

        return AvatarIdentity(initials: initials, hexColor: hexColor, imageURL: imageURL)
    }

    // MARK: - Save avatar identity

    private struct AvatarSaveResult: Decodable {
        let ok: Bool?
        let avatar_url: String?
        let initials: String?
        let color: String?
    }

    /// POST /api/dashboard/avatar — the web's `saveProfileIdentity` path ported
    /// to native. Accepts initials + color + optional image bytes (JPEG by default),
    /// or a `removeImage` flag that clears the photo and falls back to initials.
    ///
    /// After a successful save the Supabase session is refreshed so that
    /// `userAvatarIdentity` returns the updated values without a sign-out/in cycle.
    @discardableResult
    func saveAvatarIdentity(
        initials: String,
        hexColor: String,
        imageData: Data? = nil,
        mimeType: String = "image/jpeg",
        removeImage: Bool = false
    ) async throws -> AvatarIdentity {
        var body: [String: Any] = [
            "initials": initials,
            "color": hexColor,
        ]
        if let imageData {
            body["image_base64"] = imageData.base64EncodedString()
            body["mime_type"] = mimeType
        } else if removeImage {
            body["remove_image"] = true
        }
        let req = try await authorizedRequest(
            path: "/api/dashboard/avatar",
            method: "POST",
            jsonBody: body
        )
        let data = try await run(req)
        guard let resp = try? JSONDecoder().decode(AvatarSaveResult.self, from: data),
              resp.ok == true else {
            let msg = CornerAPI.serverMessage(from: data)
            throw APIError.badResponse(
                status: 500,
                message: msg.isEmpty ? "Profile could not be updated." : msg
            )
        }
        // Refresh the session so userAvatarIdentity picks up the new metadata. The
        // authStateChanges stream delivers the refreshed session into `session`.
        try? await client.auth.refreshSession()
        let url = resp.avatar_url
        return AvatarIdentity(
            initials: resp.initials ?? initials,
            hexColor: resp.color ?? hexColor,
            imageURL: url?.isEmpty == false ? url : nil
        )
    }

    // MARK: - Room creation (corner:native-ios — "+ New" from phone)

    /// Port of cv6next/data/useHomeData.js `slugify()`:
    /// lower → strip non-alphanumeric → trim hyphens → ensure letter start → cap at 48 chars.
    static func slugify(_ s: String) -> String {
        var v = s.lowercased().trimmingCharacters(in: .whitespaces)
        // Replace runs of non-alphanumeric chars with a single hyphen.
        let clean = v.unicodeScalars.map { c -> Character in
            let ch = Character(c)
            return ch.isLetter || ch.isNumber ? ch : "-"
        }
        v = String(clean)
        // Collapse multiple hyphens to one, trim ends.
        while v.contains("--") { v = v.replacingOccurrences(of: "--", with: "-") }
        while v.hasPrefix("-") { v = String(v.dropFirst()) }
        while v.hasSuffix("-") { v = String(v.dropLast()) }
        // Must start with a letter (same guard as the JS).
        if v.isEmpty || !(v.first?.isLetter ?? false) { v = "m-" + v }
        return String(v.prefix(48))
    }

    /// Response from POST /api/dashboard/create-mission-from-drawer
    private struct CreateMissionResponse: Decodable {
        let ok: Bool?
        let parent_slug: String?
        let mission_slug: String?
        let name: String?
        let agent: String?
    }

    /// Response from POST /api/dashboard/create-project-from-chat
    private struct CreateProjectResponse: Decodable {
        let ok: Bool?
        let slug: String?
        let name: String?
    }

    /// Create a mission inside a project, mirroring cv6next/data/useHomeData.js
    /// `createMissionInProject`. Returns the newly created Room on success.
    ///
    /// 1. POST /api/dashboard/create-mission-from-drawer (scaffolds stubs + kickoff)
    /// 2. POST /api/dashboard/supabase-messages with the opening note (goal, agent,
    ///    priority, when) — the same "nothing typed is lost" guarantee the web has.
    @discardableResult
    func createMission(
        projectSlug: String,
        title: String,
        goal: String,
        agentName: String,
        priority: String,
        when: String
    ) async throws -> Room {
        let worldId = try requireWorld()
        let missionSlug = CornerAPI.slugify(title.isEmpty ? goal : title)
        guard !missionSlug.isEmpty else {
            throw APIError.badResponse(status: 400, message: "Could not derive a slug from the name or goal.")
        }

        // Step 1 — scaffold the mission room.
        let createRequest = try await authorizedRequest(
            path: "/api/dashboard/create-mission-from-drawer",
            method: "POST",
            jsonBody: [
                "parent_slug": projectSlug,
                "mission_slug": missionSlug,
                "name": title.isEmpty ? goal.split(separator: "\n").first.map(String.init) ?? goal : title,
                "client_id": worldId,
            ]
        )
        let createData = try await run(createRequest)
        guard let resp = try? JSONDecoder().decode(CreateMissionResponse.self, from: createData),
              resp.ok == true else {
            throw APIError.badResponse(status: 500, message: "Could not start the mission.")
        }

        let displayName = resp.name ?? title
        let canonicalSlug = "\(projectSlug):\(missionSlug)"
        let room = Room(
            world: worldId,
            kind: .mission(slug: canonicalSlug, project: projectSlug),
            title: displayName,
            subtitle: Room.prettify(projectSlug)
        )

        // Step 2 — fold the goal/agent/priority/when into an opening note, exactly
        // as the web does in createMissionInProject (nothing the user typed is lost).
        let parts = [
            goal.isEmpty ? nil : "Goal: \(goal)",
            agentName.isEmpty ? nil : "Assigned: \(agentName)",
            priority.isEmpty ? nil : "Priority: \(priority)",
            when.isEmpty ? nil : "When: \(when)",
        ].compactMap { $0 }
        if !parts.isEmpty {
            let note = parts.joined(separator: " · ")
            _ = try? await send(text: note, room: room)
        }

        return room
    }

    /// Create a new project, mirroring cv6next/data/useHomeData.js
    /// `createProjectFromHome`. Returns the newly created Room on success.
    ///
    /// 1. POST /api/dashboard/create-project-from-chat (scaffolds + kickoff + forward link)
    /// 2. POST /api/dashboard/supabase-messages with the about text if the user gave one.
    @discardableResult
    func createProject(name: String, about: String) async throws -> Room {
        let worldId = try requireWorld()
        let slug = CornerAPI.slugify(name)
        guard !slug.isEmpty else {
            throw APIError.badResponse(status: 400, message: "Could not derive a slug from the name.")
        }

        // Step 1 — create the project row + scaffold stubs + kickoff greeting.
        let createRequest = try await authorizedRequest(
            path: "/api/dashboard/create-project-from-chat",
            method: "POST",
            jsonBody: [
                "slug": slug,
                "name": name,
                "client_id": worldId,
                "agent_slug": "ea",
            ]
        )
        let createData = try await run(createRequest)
        guard let resp = try? JSONDecoder().decode(CreateProjectResponse.self, from: createData),
              resp.ok == true else {
            // Handle 409 duplicate specially — the project already exists; just open it.
            if let json = try? JSONSerialization.jsonObject(with: createData) as? [String: Any],
               let existingSlug = (json["existing"] as? [String: Any])?["slug"] as? String ?? json["slug"] as? String,
               !existingSlug.isEmpty {
                return Room(
                    world: worldId,
                    kind: .project(slug: existingSlug),
                    title: name,
                    subtitle: "Project"
                )
            }
            throw APIError.badResponse(status: 500, message: "Could not create the project.")
        }

        let displayName = resp.name ?? name
        let finalSlug = resp.slug ?? slug
        let room = Room(
            world: worldId,
            kind: .project(slug: finalSlug),
            title: displayName,
            subtitle: "Project"
        )

        // Step 2 — post the about text into the new project room (the web does this
        // via a second supabase-messages call so the agent self-builds around it).
        let trimmedAbout = about.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedAbout.isEmpty {
            _ = try? await send(text: trimmedAbout, room: room)
        }

        return room
    }

    // MARK: - Background work

    /// GET /api/dashboard/running-tasks?client=<world>
    ///
    /// Returns two arrays matching the web's WorkersShell:
    ///   tasks    — dispatched jobs actively executing (status building | running)
    ///   promises — pending come-backs (followups, status pending)
    ///
    /// Scoped to the viewer's whole world (no project filter) so the panel answers
    /// "is anything running anywhere?" — the same promise the web panel makes.
    func fetchRunningTasks() async throws -> (tasks: [BackgroundTask], promises: [BackgroundPromise]) {
        let world = try requireWorld()
        let request = try await authorizedRequest(
            path: "/api/dashboard/running-tasks",
            queryItems: [URLQueryItem(name: "client", value: world)]
        )
        let data = try await run(request)
        guard let envelope = try? JSONDecoder().decode(RunningTasksEnvelope.self, from: data) else {
            throw APIError.decoding
        }
        return (envelope.tasks ?? [], envelope.promises ?? [])
    }

    /// POST /api/dashboard/dismiss-followup — the user releasing a promise.
    ///
    /// Returns true when the server recorded the dismiss (2xx). Does NOT throw on
    /// a 4xx/5xx — the caller shows an in-row error and un-hides the row instead.
    func dismissFollowup(id: String) async -> Bool {
        guard let world = try? requireWorld() else { return false }
        guard let request = try? await authorizedRequest(
            path: "/api/dashboard/dismiss-followup",
            method: "POST",
            jsonBody: ["id": id, "client": world]
        ) else { return false }
        guard let (data, response) = try? await URLSession.shared.data(for: request) else { return false }
        let httpStatus = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(httpStatus) else { return false }
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           json["error"] != nil { return false }
        return true
    }

    /// Send a user message into the room that owns a background promise.
    ///
    /// Routing is derived from the promise row exactly as WorkersShell's `roomPayload`
    /// does: mission + project → corner with mission_slug, project-only → corner with
    /// project, neither → agent 1:1. Returns true when the POST was accepted.
    func sendToPromiseRoom(promise: BackgroundPromise, text: String) async -> Bool {
        guard let world = try? requireWorld() else { return false }
        var metadata: [String: Any] = ["interaction_mode": "work"]
        var body: [String: Any] = [
            "client_id": world,
            "text": text,
            "role": "user",
            "source": Config.messageSource,
        ]
        if let mission = promise.mission, !mission.isEmpty,
           let project = promise.project, !project.isEmpty {
            body["agent"] = "corner"
            body["project"] = project
            metadata["mission_slug"] = mission
        } else if let project = promise.project, !project.isEmpty {
            body["agent"] = "corner"
            body["project"] = project
        } else {
            body["agent"] = promise.who ?? "corner"
        }
        body["metadata"] = metadata
        guard let request = try? await authorizedRequest(
            path: "/api/dashboard/supabase-messages",
            method: "POST",
            jsonBody: body
        ) else { return false }
        guard let (_, response) = try? await URLSession.shared.data(for: request) else { return false }
        let httpStatus = (response as? HTTPURLResponse)?.statusCode ?? 0
        return (200..<300).contains(httpStatus)
    }
}

// Decode envelope — same shape as running-tasks.js response.
// Private so it does not collide with the BackgroundWorkStore's private copy.
private struct RunningTasksEnvelope: Decodable {
    let tasks: [BackgroundTask]?
    let promises: [BackgroundPromise]?
}
