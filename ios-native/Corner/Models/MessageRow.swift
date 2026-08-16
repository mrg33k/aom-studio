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
        // Convex backend fields (BRIEF 04): _id, _creationTime, roomId etc.
        case convexID = "_id"
        case convexCreationTime = "_creationTime"
        case convexRoomId = "roomId"
        case convexClientId = "clientId"
        case convexUserId = "userId"
        case convexUserName = "userName"
        case convexAgent = "agentSlug"
        case convexCreatedAt = "createdAt"
        case convexAttachmentURL = "attachmentUrl"
        case convexAttachmentMime = "attachmentMime"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Supabase `id` or Convex `_id`
        let rawID: String? = (try? c.decodeIfPresent(String.self, forKey: .id)) ?? nil
        let convexID: String? = (try? c.decodeIfPresent(String.self, forKey: .convexID)) ?? nil
        if let s = rawID, !s.isEmpty {
            id = s
        } else if let s = convexID, !s.isEmpty {
            id = s
        } else {
            id = UUID().uuidString
        }
        // timestamp: Supabase ISO string or Convex _creationTime (ms since epoch)
        let rawTS: String? = (try? c.decodeIfPresent(String.self, forKey: .timestamp)) ?? nil
        let convexMS: Double? = (try? c.decodeIfPresent(Double.self, forKey: .convexCreatedAt))
            ?? (try? c.decodeIfPresent(Double.self, forKey: .convexCreationTime))
            ?? nil
        if let s = rawTS, !s.isEmpty {
            timestamp = s
        } else if let m = convexMS {
            let date = Date(timeIntervalSince1970: m / 1000)
            timestamp = ISO8601DateFormatter().string(from: date)
        } else {
            timestamp = nil
        }
        let decodedAgent: String? = (try? c.decodeIfPresent(String.self, forKey: .agent))
            ?? (try? c.decodeIfPresent(String.self, forKey: .convexAgent))
            ?? nil
        agent = decodedAgent
        let decodedUserID: String? = (try? c.decodeIfPresent(String.self, forKey: .userID))
            ?? (try? c.decodeIfPresent(String.self, forKey: .convexUserId))
            ?? nil
        role = ((try? c.decodeIfPresent(String.self, forKey: .role)) ?? nil)
            ?? (decodedAgent == nil && decodedUserID != nil ? "user" : "assistant")
        text = (try? c.decodeIfPresent(String.self, forKey: .text)) ?? nil
        source = (try? c.decodeIfPresent(String.self, forKey: .source)) ?? nil
        status = (try? c.decodeIfPresent(String.self, forKey: .status)) ?? nil
        // client_id (Supabase) or clientId (Convex)
        let rawClientID: String? = (try? c.decodeIfPresent(String.self, forKey: .clientID)) ?? nil
        let convexClientID: String? = (try? c.decodeIfPresent(String.self, forKey: .convexClientId)) ?? nil
        if let s = rawClientID, !s.isEmpty {
            clientID = s
        } else {
            clientID = convexClientID
        }
        // room_id vs roomId
        let rawRoomID: String? = (try? c.decodeIfPresent(String.self, forKey: .roomID)) ?? nil
        let convexRoomID: String? = (try? c.decodeIfPresent(String.self, forKey: .convexRoomId)) ?? nil
        if let s = rawRoomID, !s.isEmpty {
            roomID = s
        } else {
            roomID = convexRoomID
        }
        project = (try? c.decodeIfPresent(String.self, forKey: .project)) ?? nil
        worldID = (try? c.decodeIfPresent(String.self, forKey: .worldID)) ?? nil
        // user_id vs userId
        let rawUserID: String? = (try? c.decodeIfPresent(String.self, forKey: .userID)) ?? nil
        let convexUserID: String? = (try? c.decodeIfPresent(String.self, forKey: .convexUserId)) ?? nil
        if let s = rawUserID, !s.isEmpty {
            userID = s
        } else {
            userID = convexUserID
        }
        let rawUserName: String? = (try? c.decodeIfPresent(String.self, forKey: .userName)) ?? nil
        let convexUserName: String? = (try? c.decodeIfPresent(String.self, forKey: .convexUserName)) ?? nil
        if let s = rawUserName, !s.isEmpty {
            userName = s
        } else {
            userName = convexUserName
        }
        senderRole = (try? c.decodeIfPresent(String.self, forKey: .senderRole)) ?? nil
        // attachment_url vs attachmentUrl
        let rawAttURL: String? = (try? c.decodeIfPresent(String.self, forKey: .attachmentURL)) ?? nil
        let convexAttURL: String? = (try? c.decodeIfPresent(String.self, forKey: .convexAttachmentURL)) ?? nil
        if let s = rawAttURL, !s.isEmpty {
            attachmentURL = s
        } else {
            attachmentURL = convexAttURL
        }
        let rawMime: String? = (try? c.decodeIfPresent(String.self, forKey: .fileMimeType)) ?? nil
        let convexMime: String? = (try? c.decodeIfPresent(String.self, forKey: .convexAttachmentMime)) ?? nil
        if let s = rawMime, !s.isEmpty {
            fileMimeType = s
        } else {
            fileMimeType = convexMime
        }
        fileSize = (try? c.decodeIfPresent(Int.self, forKey: .fileSize)) ?? nil
        replyTo = (try? c.decodeIfPresent(String.self, forKey: .replyTo)) ?? nil
        metadata = (try? c.decodeIfPresent(JSONValue.self, forKey: .metadata)) ?? nil
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
        return AgentRoster.title(for: resolvedAgentSlug(roomAgent: nil))
    }

    /// Resolve which agent actually authored this row.
    /// Order: metadata agentName/agent_name/agent/specialist → non-corner agent column →
    /// room specialist assignment → fallback "corner".
    func resolvedAgentSlug(roomAgent: String?) -> String {
        // 1. metadata — web writes agentName into message metadata
        let metaKeys = ["agentName", "agent_name", "agent", "specialist", "agentSlug", "agent_slug"]
        for key in metaKeys {
            if let v = metadata?[key]?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines), !v.isEmpty, v.lowercased() != "corner" {
                return v.lowercased()
            }
        }
        // 2. agent column when it is not generic
        if let a = agent?.trimmingCharacters(in: .whitespacesAndNewlines), !a.isEmpty, a.lowercased() != "corner" {
            return a.lowercased()
        }
        // 3. room specialist assignment
        if let r = roomAgent?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), !r.isEmpty, r != "default", r != "corner" {
            return r
        }
        // 4. fallback to agent column even if "corner", else "corner"
        if let a = agent?.trimmingCharacters(in: .whitespacesAndNewlines), !a.isEmpty { return a.lowercased() }
        return "corner"
    }

    func resolvedDisplayName(roomAgent: String?) -> String {
        if isUser { return userName ?? "You" }
        return AgentRoster.title(for: resolvedAgentSlug(roomAgent: roomAgent))
    }

    /// Project-qualified label "Project · Agent" or just "Agent" when no project.
    /// Satisfies "[project:agent](message)" — both names visible on every assistant row.
    func qualifiedDisplayName(room: Room?, roomAgent: String?) -> String {
        if isUser { return userName ?? "You" }
        let agentTitle = resolvedDisplayName(roomAgent: roomAgent)
        guard let room else { return agentTitle }
        switch room.kind {
        case .project:
            let projectName = room.title
            if projectName.lowercased() == agentTitle.lowercased() { return agentTitle }
            return "\(projectName) · \(agentTitle)"
        case .mission(_, let project):
            // Mission rooms: show "Project · Agent" (project is the mission's parent)
            let projectName = room.subtitle.isEmpty ? Room.prettify(project) : room.subtitle
            return "\(projectName) · \(agentTitle)"
        case .agent:
            return agentTitle
        }
    }

    /// The bridge's mid-turn interim rows ("Still working on this…") carry
    /// metadata.interim / metadata.kind == "progress". They feed the silence
    /// clock but are NOT the turn's answer — the streaming draft must survive
    /// them (the web's known draft-flicker defect, decided and fixed here).
    var isInterimProgress: Bool {
        if metadata?["interim"]?.boolValue == true { return true }
        if metadata?["kind"]?.stringValue == "progress" { return true }
        return false
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
