// EmailModels.swift — corner:native-ios R16
// Owner-only mobile triage models. Campaign mission control intentionally remains desktop.

import Foundation

struct EmailWish: Decodable, Identifiable, Equatable {
    let id: String
    let name: String?
    let email: String?
    let message: String?
    let status: String
    let createdAt: String?
    let updatedAt: String?
    let autoSendAt: String?
    let latencySeconds: Double?

    enum CodingKeys: String, CodingKey {
        case id, name, email, message, status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case autoSendAt = "auto_send_at"
        case latencySeconds = "latency_seconds"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func str(_ key: CodingKeys) -> String? { try? c.decodeIfPresent(String.self, forKey: key) }
        // id may arrive as Int or String
        if let s = try? c.decode(String.self, forKey: .id) { id = s }
        else if let n = try? c.decode(Int.self, forKey: .id) { id = String(n) }
        else if let d = try? c.decode(Double.self, forKey: .id) { id = String(Int(d)) }
        else { id = UUID().uuidString }
        name = str(.name)
        email = str(.email)
        message = str(.message)
        status = (try? c.decodeIfPresent(String.self, forKey: .status)) ?? "open"
        createdAt = str(.createdAt)
        updatedAt = str(.updatedAt)
        autoSendAt = str(.autoSendAt)
        if let v = try? c.decodeIfPresent(Double.self, forKey: .latencySeconds) { latencySeconds = v }
        else if let n = try? c.decodeIfPresent(Int.self, forKey: .latencySeconds) { latencySeconds = Double(n) }
        else { latencySeconds = nil }
    }
}

struct EmailMailbox: Decodable, Equatable {
    let email: String
    let error: String?
    let needs: [MailboxMessage]
    let replied: [MailboxMessage]

    enum CodingKeys: String, CodingKey {
        case email, error, needs, replied
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        email = (try? c.decodeIfPresent(String.self, forKey: .email)) ?? ""
        error = try? c.decodeIfPresent(String.self, forKey: .error)
        needs = (try? c.decodeIfPresent([MailboxMessage].self, forKey: .needs)) ?? []
        replied = (try? c.decodeIfPresent([MailboxMessage].self, forKey: .replied)) ?? []
    }
}

struct MailboxMessage: Decodable, Equatable {
    let from: String?
    let email: String?
    let subject: String?
    let threadId: String?
    let date: String?
    let snippet: String?
    let messageCount: Int?
    let lastInbound: MailboxMessageDetail?
    let lastReply: MailboxMessageDetail?

    enum CodingKeys: String, CodingKey {
        case from, email, subject, date, snippet
        case threadId, messageCount, lastInbound, lastReply
        // snake_case aliases the server may send
        case thread_id, message_count, last_inbound, last_reply
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        from = try? c.decodeIfPresent(String.self, forKey: .from)
        email = try? c.decodeIfPresent(String.self, forKey: .email)
        subject = try? c.decodeIfPresent(String.self, forKey: .subject)
        date = try? c.decodeIfPresent(String.self, forKey: .date)
        snippet = try? c.decodeIfPresent(String.self, forKey: .snippet)
        // threadId — accept camelCase or snake_case
        if let v = try? c.decodeIfPresent(String.self, forKey: .threadId) { threadId = v }
        else if let v = try? c.decodeIfPresent(String.self, forKey: .thread_id) { threadId = v }
        else if let n = try? c.decodeIfPresent(Int.self, forKey: .threadId) { threadId = String(n) }
        else if let n = try? c.decodeIfPresent(Int.self, forKey: .thread_id) { threadId = String(n) }
        else { threadId = nil }
        // messageCount
        if let v = try? c.decodeIfPresent(Int.self, forKey: .messageCount) { messageCount = v }
        else if let v = try? c.decodeIfPresent(Int.self, forKey: .message_count) { messageCount = v }
        else if let v = try? c.decodeIfPresent(Double.self, forKey: .messageCount) { messageCount = Int(v) }
        else if let v = try? c.decodeIfPresent(Double.self, forKey: .message_count) { messageCount = Int(v) }
        else { messageCount = nil }
        // lastInbound / lastReply — accept both casings
        if let v = try? c.decodeIfPresent(MailboxMessageDetail.self, forKey: .lastInbound) { lastInbound = v }
        else if let v = try? c.decodeIfPresent(MailboxMessageDetail.self, forKey: .last_inbound) { lastInbound = v }
        else { lastInbound = nil }
        if let v = try? c.decodeIfPresent(MailboxMessageDetail.self, forKey: .lastReply) { lastReply = v }
        else if let v = try? c.decodeIfPresent(MailboxMessageDetail.self, forKey: .last_reply) { lastReply = v }
        else { lastReply = nil }
    }
}

struct MailboxMessageDetail: Decodable, Equatable {
    let date: String?
    let body: String?
    let snippet: String?

    enum CodingKeys: String, CodingKey { case date, body, snippet }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = try? c.decodeIfPresent(String.self, forKey: .date)
        body = try? c.decodeIfPresent(String.self, forKey: .body)
        snippet = try? c.decodeIfPresent(String.self, forKey: .snippet)
    }
}

struct EmailSuggestion: Decodable, Equatable {
    struct Staged: Decodable, Equatable {
        let draftId: String
        let connectionId: String
        let body: String?

        enum CodingKeys: String, CodingKey {
            case draftId = "draft_id"
            case connectionId = "connection_id"
            case body
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            draftId = (try? c.decodeIfPresent(String.self, forKey: .draftId)) ?? ""
            connectionId = (try? c.decodeIfPresent(String.self, forKey: .connectionId)) ?? ""
            body = try? c.decodeIfPresent(String.self, forKey: .body)
        }
    }

    let summary: [String]
    let recommendation: [String]
    let staged: Staged?
    let original: String?
    let autoSendAt: String?

    enum CodingKeys: String, CodingKey {
        case summary, recommendation, staged, original
        case autoSendAt = "auto_send_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        summary = (try? c.decodeIfPresent([String].self, forKey: .summary)) ?? []
        recommendation = (try? c.decodeIfPresent([String].self, forKey: .recommendation)) ?? []
        staged = try? c.decodeIfPresent(Staged.self, forKey: .staged)
        original = try? c.decodeIfPresent(String.self, forKey: .original)
        autoSendAt = try? c.decodeIfPresent(String.self, forKey: .autoSendAt)
    }
}

struct EmailThreadMessage: Decodable, Identifiable, Equatable {
    let direction: String
    let from: String?
    let fromEmail: String?
    let date: String?
    let body: String?
    let draft: Bool?

    enum CodingKeys: String, CodingKey {
        case direction, from, date, body, draft
        case fromEmail = "fromEmail"
        case from_email
        case fromAddress = "from_address"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        direction = (try? c.decodeIfPresent(String.self, forKey: .direction)) ?? "in"
        from = try? c.decodeIfPresent(String.self, forKey: .from)
        if let v = try? c.decodeIfPresent(String.self, forKey: .fromEmail) { fromEmail = v }
        else if let v = try? c.decodeIfPresent(String.self, forKey: .from_email) { fromEmail = v }
        else if let v = try? c.decodeIfPresent(String.self, forKey: .fromAddress) { fromEmail = v }
        else { fromEmail = nil }
        date = try? c.decodeIfPresent(String.self, forKey: .date)
        body = try? c.decodeIfPresent(String.self, forKey: .body)
        draft = try? c.decodeIfPresent(Bool.self, forKey: .draft)
    }

    var id: String { "\(direction)|\(date ?? "")|\(fromEmail ?? "")|\(body ?? "")" }
}

struct AutoReplyStatus: Decodable, Equatable {
    struct State: Decodable, Equatable {
        let mode: String?
        let answerMode: String?
        let thresholdMin: Double?
        let syncedAt: String?

        enum CodingKeys: String, CodingKey {
            case mode
            case answerMode = "answer_mode"
            case thresholdMin = "threshold_min"
            case syncedAt = "synced_at"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            mode = try? c.decodeIfPresent(String.self, forKey: .mode)
            answerMode = try? c.decodeIfPresent(String.self, forKey: .answerMode)
            if let v = try? c.decodeIfPresent(Double.self, forKey: .thresholdMin) { thresholdMin = v }
            else if let n = try? c.decodeIfPresent(Int.self, forKey: .thresholdMin) { thresholdMin = Double(n) }
            else { thresholdMin = nil }
            syncedAt = try? c.decodeIfPresent(String.self, forKey: .syncedAt)
        }
    }
    struct Control: Decodable, Equatable {
        let mode: String?
        let requestedAt: String?

        enum CodingKeys: String, CodingKey {
            case mode
            case requestedAt = "requested_at"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            mode = try? c.decodeIfPresent(String.self, forKey: .mode)
            requestedAt = try? c.decodeIfPresent(String.self, forKey: .requestedAt)
        }
    }

    let control: Control?
    let fileState: State?
    let canRestore: Bool

    enum CodingKeys: String, CodingKey {
        case control
        case fileState = "file_state"
        case canRestore = "can_restore"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        control = try? c.decodeIfPresent(Control.self, forKey: .control)
        fileState = try? c.decodeIfPresent(State.self, forKey: .fileState)
        // can_restore may be absent — default false
        if let v = try? c.decodeIfPresent(Bool.self, forKey: .canRestore) { canRestore = v ?? false }
        else { canRestore = false }
    }
}

struct EmailItem: Identifiable, Equatable {
    enum Source: Equatable {
        case wish(EmailWish)
        case mailbox(threadID: String, account: String)
    }
    let id: String
    let source: Source
    let sender: String
    let address: String
    let subject: String
    let snippet: String
    let createdAt: String?
    let status: String
    let hasStaged: Bool
    let urgency: Int
}
