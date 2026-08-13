// MessageRow.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Mirrors the REAL `messages` table. Source of truth: the insert payload in
// api/_lib/write-message.js (the single write path) plus the schema comment in
// src/dashboard/lib/supabase.js.
//
// Every column decodes optionally and nothing in here throws. A thread is the
// product; one unfamiliar column must never be able to blank it.

import Foundation

struct MessageRow: Decodable, Identifiable, Equatable {
    static func == (lhs: MessageRow, rhs: MessageRow) -> Bool {
        lhs.id == rhs.id && lhs.text == rhs.text && lhs.status == rhs.status
    }

    let id: String                 // uuid
    let timestamp: String?         // timestamptz, microsecond precision
    let agent: String?             // agent slug ("rex", "elon", "corner", ...)
    let role: String?              // "user" | "assistant"
    let text: String?
    let source: String?            // "corner-dashboard" | "corner-native-ios" | "terminal" | ...
    let status: String?            // "pending" | "read" | "sent" | "delivered" | "composing"
    let clientID: String?          // world ("aom") or "shared:<slug>"
    let roomID: String?
    let project: String?
    let worldID: String?
    let userID: String?
    let userName: String?          // human turns; server-derived from the JWT
    let senderRole: String?        // "admin" | "user" | "owner"
    let attachmentURL: String?
    let fileMimeType: String?
    let fileSize: Int?
    let replyTo: String?
    let metadata: JSONValue?       // jsonb: mission_slug, attachments[], blocks, chips, result_payload

    enum CodingKeys: String, CodingKey {
        case id, timestamp, agent, role, text, source, status, project, metadata
        case clientID = "client_id"
        case roomID = "room_id"
        case worldID = "world_id"
        case userID = "user_id"
        case userName = "user_name"
        case senderRole = "sender_role"
        case attachmentURL = "attachment_url"
        case fileMimeType = "file_mime_type"
        case fileSize = "file_size"
        case replyTo = "reply_to"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? c.decode(String.self, forKey: .id)) ?? UUID().uuidString
        timestamp = try? c.decodeIfPresent(String.self, forKey: .timestamp)
        agent = try? c.decodeIfPresent(String.self, forKey: .agent)
        role = try? c.decodeIfPresent(String.self, forKey: .role)
        text = try? c.decodeIfPresent(String.self, forKey: .text)
        source = try? c.decodeIfPresent(String.self, forKey: .source)
        status = try? c.decodeIfPresent(String.self, forKey: .status)
        clientID = try? c.decodeIfPresent(String.self, forKey: .clientID)
        roomID = try? c.decodeIfPresent(String.self, forKey: .roomID)
        project = try? c.decodeIfPresent(String.self, forKey: .project)
        worldID = try? c.decodeIfPresent(String.self, forKey: .worldID)
        userID = try? c.decodeIfPresent(String.self, forKey: .userID)
        userName = try? c.decodeIfPresent(String.self, forKey: .userName)
        senderRole = try? c.decodeIfPresent(String.self, forKey: .senderRole)
        attachmentURL = try? c.decodeIfPresent(String.self, forKey: .attachmentURL)
        fileMimeType = try? c.decodeIfPresent(String.self, forKey: .fileMimeType)
        fileSize = try? c.decodeIfPresent(Int.self, forKey: .fileSize)
        replyTo = try? c.decodeIfPresent(String.self, forKey: .replyTo)
        metadata = try? c.decodeIfPresent(JSONValue.self, forKey: .metadata)
    }

    // MARK: - Derived

    /// A row is the user's when the server said so. `role` is written on every row the
    /// one write path creates; the user_name fallback covers legacy rows written before
    /// role was mandatory.
    var isUser: Bool {
        if let role { return role == "user" }
        return (userName?.isEmpty == false)
    }

    var date: Date? {
        guard let timestamp else { return nil }
        return MessageRow.parseTimestamp(timestamp)
    }

    var epoch: TimeInterval { date?.timeIntervalSince1970 ?? 0 }

    var displayName: String {
        if isUser { return userName ?? "You" }
        return AgentRoster.title(for: agent ?? "corner")
    }

    /// PostgREST timestamps carry microseconds; ISO8601DateFormatter only reliably
    /// handles up to milliseconds, so try fractional, then plain, then trim.
    static func parseTimestamp(_ s: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = fractional.date(from: s) { return d }
        let plain = ISO8601DateFormatter()
        if let d = plain.date(from: s) { return d }
        if let dot = s.range(of: ".") {
            let head = s[..<dot.lowerBound]
            let tail = s[dot.upperBound...]
            let digits = tail.prefix(while: \.isNumber)
            let rest = tail.dropFirst(digits.count)
            return fractional.date(from: "\(head).\(digits.prefix(3))\(rest)")
        }
        return nil
    }
}

/// GET /api/dashboard/supabase-messages returns `{ "messages": [...] }`, oldest first.
struct MessagesEnvelope: Decodable {
    let messages: [MessageRow]
}

/// POST /api/dashboard/supabase-messages returns the created row.
struct SendEnvelope: Decodable {
    let message: MessageRow?
}

// MARK: - Live steps

/// One row from GET /api/dashboard/message-steps. These are the agent's real
/// heartbeats for a turn — the only honest answer to "is it still working".
struct MessageStep: Decodable, Identifiable, Equatable {
    let id: String
    let agent: String?
    let parentMessageID: String?
    let stepIndex: Int?
    let text: String?
    let status: String?
    let timestamp: String?
    /// R-SMOOTHNESS Round B: the bridge stamps a turn-phase on every step —
    /// thinking | working | streaming on live steps; done | waiting | stopped ride
    /// ONLY on the 9999 settled sentinel. Meaningful on the freshest step only.
    let phase: String?
    let project: String?

    enum CodingKeys: String, CodingKey {
        case id, agent, text, status, timestamp, phase, project
        case parentMessageID = "parent_message_id"
        case stepIndex = "step_index"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let s = try? c.decode(String.self, forKey: .id) { id = s }
        else if let n = try? c.decode(Int.self, forKey: .id) { id = String(n) }
        else { id = UUID().uuidString }
        agent = try? c.decodeIfPresent(String.self, forKey: .agent)
        parentMessageID = try? c.decodeIfPresent(String.self, forKey: .parentMessageID)
        stepIndex = try? c.decodeIfPresent(Int.self, forKey: .stepIndex)
        text = try? c.decodeIfPresent(String.self, forKey: .text)
        status = try? c.decodeIfPresent(String.self, forKey: .status)
        timestamp = try? c.decodeIfPresent(String.self, forKey: .timestamp)
        phase = try? c.decodeIfPresent(String.self, forKey: .phase)
        project = try? c.decodeIfPresent(String.self, forKey: .project)
    }

    /// The bridge stamps step_index 9999 / text "settled" when a turn ENDS. That
    /// sentinel is the authoritative stop signal — settling on anything else is
    /// guessing, and guessing is what made the web bar drop mid-turn (fixed 2026-06-27).
    var isSettledSentinel: Bool { stepIndex == 9999 || text == "settled" }

    var isRenderable: Bool { !isSettledSentinel && !(text ?? "").isEmpty }
}

struct StepsEnvelope: Decodable {
    let steps: [MessageStep]
}
