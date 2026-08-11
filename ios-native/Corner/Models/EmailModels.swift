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
}

struct EmailMailbox: Decodable, Equatable {
    let email: String
    let error: String?
    let needs: [MailboxMessage]
    let replied: [MailboxMessage]
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
    }
}

struct MailboxMessageDetail: Decodable, Equatable {
    let date: String?
    let body: String?
    let snippet: String?
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
}

struct EmailThreadMessage: Decodable, Identifiable, Equatable {
    let direction: String
    let from: String?
    let fromEmail: String?
    let date: String?
    let body: String?
    let draft: Bool?

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
    }
    struct Control: Decodable, Equatable {
        let mode: String?
        let requestedAt: String?
        enum CodingKeys: String, CodingKey {
            case mode
            case requestedAt = "requested_at"
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
