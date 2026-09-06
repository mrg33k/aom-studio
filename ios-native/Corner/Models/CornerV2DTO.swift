// CornerV2DTO.swift — Corner native iOS
// corner:corner-v2 native plan Task 3.
//
// Typed v2 network models. Field names follow the plan's "Shared native
// interfaces" block; where the backend's real JSON differs, the BACKEND wins
// (it is what ships):
// - text blocks are {"type":"text","value"} (the plan snippet says `text`);
// - RouteDecision carries `decisionId` (R10 gap 1);
// - VisualWindowTab carries `agentLabel` (R10 gap 2);
// - ReviewPin has no `artifactID` on the wire (pins are submitted per
//   artifact), so it decodes as optional;
// - workspaceTree / threadForProject / threadForMission return their DTO or
//   null (R10 gap 6), so those reads are Optional on the API.

import Foundation

// MARK: - Dates

extension ISO8601DateFormatter {
    /// Backend dates: `new Date(ms).toISOString()`, always fractional seconds.
    static var cornerFractional: ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }

    static var cornerPlain: ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }
}

extension JSONDecoder {
    /// Dates arrive as ISO-8601 strings, with fractional seconds from the
    /// backend. Accepts both spellings so a missing fraction never fails a
    /// whole thread decode. `ConvexService.request(_:as:)` uses this decoder.
    static var corner: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { inner in
            let container = try inner.singleValueContainer()
            let raw = try container.decode(String.self)
            if let date = ISO8601DateFormatter.cornerFractional.date(from: raw)
                ?? ISO8601DateFormatter.cornerPlain.date(from: raw) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container, debugDescription: "Not an ISO-8601 date: \(raw)"
            )
        }
        return decoder
    }
}

// MARK: - Workspace tree

enum ProjectKind: String, Codable { case standard, general }
enum MissionStatus: String, Codable { case live, blocked, ready, done }
enum ThreadOwnerType: String, Codable { case project, mission }
enum ThreadAuthor: String, Codable { case user, agent }

struct WorkspaceSummary: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let generalProjectID: String
    let projects: [ProjectSummary]
}

struct ProjectSummary: Codable, Identifiable, Equatable {
    let id: String
    let workspaceID: String
    let name: String
    let kind: ProjectKind
    let tintHex: String
    let needsAttention: Bool
    let threadID: String
    let missions: [MissionSummary]
}

struct MissionSummary: Codable, Identifiable, Equatable {
    let id: String
    let projectID: String
    let title: String
    let status: MissionStatus
    let threadID: String
}

struct Thread: Codable, Identifiable, Equatable {
    let id: String
    let ownerType: ThreadOwnerType
    let projectID: String
    let missionID: String?
    let visualSessionID: String
}

struct ThreadEvent: Codable, Identifiable, Equatable {
    let id: String
    let threadID: String
    let author: ThreadAuthor
    let agentLabel: String?
    let blocks: [ThreadBlock]
    let createdAt: Date
}

// MARK: - Thread blocks (tagged by `type`)

enum ThreadBlock: Codable, Equatable {
    case text(String)
    case question(id: String, text: String, options: [QuestionOption])
    case steps([StepState])
    case success(text: String, stepIndex: Int)
    case snag(text: String, options: [QuestionOption])
    case artifact(artifactIDs: [String])
    case checklist(pinIDs: [String])
}

extension ThreadBlock {
    enum CodingKeys: String, CodingKey {
        case type, value, text, id, options, steps, stepIndex, artifactIDs, pinIDs
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(String.self, forKey: .type) {
        case "text":
            // Backend: {"type":"text","value"}. The plan snippet's `text`
            // key is wrong; accept it as a fallback so neither spelling
            // fails the whole event.
            if let value = try? container.decode(String.self, forKey: .value) {
                self = .text(value)
            } else {
                self = .text(try container.decode(String.self, forKey: .text))
            }
        case "question":
            self = .question(
                id: try container.decode(String.self, forKey: .id),
                text: try container.decode(String.self, forKey: .text),
                options: try container.decode([QuestionOption].self, forKey: .options)
            )
        case "steps":
            self = .steps(try container.decode([StepState].self, forKey: .steps))
        case "success":
            self = .success(
                text: try container.decode(String.self, forKey: .text),
                stepIndex: (try? container.decode(Int.self, forKey: .stepIndex)) ?? 0
            )
        case "snag":
            self = .snag(
                text: try container.decode(String.self, forKey: .text),
                options: (try? container.decode([QuestionOption].self, forKey: .options)) ?? []
            )
        case "artifact":
            self = .artifact(artifactIDs: try container.decode([String].self, forKey: .artifactIDs))
        case "checklist":
            self = .checklist(pinIDs: try container.decode([String].self, forKey: .pinIDs))
        case let other:
            throw DecodingError.dataCorruptedError(
                forKey: .type, in: container,
                debugDescription: "Unsupported Corner v2 block: \(other)"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .text(let value):
            try container.encode("text", forKey: .type)
            try container.encode(value, forKey: .value)
        case .question(let id, let text, let options):
            try container.encode("question", forKey: .type)
            try container.encode(id, forKey: .id)
            try container.encode(text, forKey: .text)
            try container.encode(options, forKey: .options)
        case .steps(let steps):
            try container.encode("steps", forKey: .type)
            try container.encode(steps, forKey: .steps)
        case .success(let text, let stepIndex):
            try container.encode("success", forKey: .type)
            try container.encode(text, forKey: .text)
            try container.encode(stepIndex, forKey: .stepIndex)
        case .snag(let text, let options):
            try container.encode("snag", forKey: .type)
            try container.encode(text, forKey: .text)
            try container.encode(options, forKey: .options)
        case .artifact(let artifactIDs):
            try container.encode("artifact", forKey: .type)
            try container.encode(artifactIDs, forKey: .artifactIDs)
        case .checklist(let pinIDs):
            try container.encode("checklist", forKey: .type)
            try container.encode(pinIDs, forKey: .pinIDs)
        }
    }
}

struct QuestionOption: Codable, Equatable, Identifiable {
    let id: String
    let title: String
    let detail: String
    let recommended: Bool
}

struct StepState: Codable, Equatable, Identifiable {
    let id: String
    let label: String
    let state: String
}

// MARK: - Visual window

enum VisualTabKind: String, Codable {
    case pdf, deck, document, web, photo, video, youtube, code, genericFile, email, tracker
}

enum PinAnchor: Codable, Equatable {
    case point(page: Int?, x: Double, y: Double)
    case time(seconds: Double, x: Double?, y: Double?)
    case line(number: Int)

    enum CodingKeys: String, CodingKey {
        case type, page, x, y, seconds, number
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(String.self, forKey: .type) {
        case "point":
            self = .point(
                page: try container.decodeIfPresent(Int.self, forKey: .page),
                x: try container.decode(Double.self, forKey: .x),
                y: try container.decode(Double.self, forKey: .y)
            )
        case "time":
            self = .time(
                seconds: try container.decode(Double.self, forKey: .seconds),
                x: try container.decodeIfPresent(Double.self, forKey: .x),
                y: try container.decodeIfPresent(Double.self, forKey: .y)
            )
        case "line":
            self = .line(number: try container.decode(Int.self, forKey: .number))
        case let other:
            throw DecodingError.dataCorruptedError(
                forKey: .type, in: container,
                debugDescription: "Unsupported pin anchor: \(other)"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .point(let page, let x, let y):
            try container.encode("point", forKey: .type)
            try container.encodeIfPresent(page, forKey: .page)
            try container.encode(x, forKey: .x)
            try container.encode(y, forKey: .y)
        case .time(let seconds, let x, let y):
            try container.encode("time", forKey: .type)
            try container.encode(seconds, forKey: .seconds)
            try container.encodeIfPresent(x, forKey: .x)
            try container.encodeIfPresent(y, forKey: .y)
        case .line(let number):
            try container.encode("line", forKey: .type)
            try container.encode(number, forKey: .number)
        }
    }
}

struct Artifact: Codable, Identifiable, Equatable {
    let id: String
    let threadID: String
    let title: String
    let kind: VisualTabKind
    let version: Int
    let sourceURL: URL?
    let metadata: [String: String]
}

struct VisualWindowTab: Codable, Identifiable, Equatable {
    let id: String
    let visualSessionID: String
    let threadID: String
    let kind: VisualTabKind
    let artifactID: String?
    let title: String
    let openedBy: ThreadAuthor
    let agentLabel: String?
    let state: [String: String]
    let createdAt: Date
}

struct ReviewPin: Codable, Identifiable, Equatable {
    /// Empty until the server answers `submitReview` (Task 8 maps the echoed
    /// client ids back onto the kept pins).
    var id: String
    /// Absent on the wire (pins are listed per artifact); present when the
    /// client echoes a pin it already knows the server id for. Mutable so
    /// submit can stamp the target artifact on its outgoing copies.
    var artifactID: String?
    let anchor: PinAnchor
    var text: String
    var isDone: Bool
    /// Client correlation id for `submitReview`; never sent by the server.
    var clientID: String?

    enum CodingKeys: String, CodingKey {
        case id, artifactID, anchor, text, isDone, clientID
    }

    init(
        id: String, artifactID: String? = nil, anchor: PinAnchor,
        text: String, isDone: Bool, clientID: String? = nil
    ) {
        self.id = id
        self.artifactID = artifactID
        self.anchor = anchor
        self.text = text
        self.isDone = isDone
        self.clientID = clientID
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        artifactID = try container.decodeIfPresent(String.self, forKey: .artifactID)
        anchor = try container.decode(PinAnchor.self, forKey: .anchor)
        text = try container.decode(String.self, forKey: .text)
        isDone = (try? container.decode(Bool.self, forKey: .isDone)) ?? false
        clientID = try container.decodeIfPresent(String.self, forKey: .clientID)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        // A brand-new pin has no server id yet; the backend treats a missing
        // `id` as "create". Sending "" would fail its lookup instead.
        if !id.isEmpty { try container.encode(id, forKey: .id) }
        try container.encodeIfPresent(clientID, forKey: .clientID)
        try container.encode(anchor, forKey: .anchor)
        try container.encode(text, forKey: .text)
        try container.encode(isDone, forKey: .isDone)
    }
}

// MARK: - Routing, ledger, confirmations

struct RouteDecision: Codable, Equatable {
    /// The proposal handle for `confirmProposal` (R10 gap 1). Present on
    /// every variant, including confident routes.
    let decisionId: String
    let destinationThreadID: String
    let project: ProjectSummary
    let mission: MissionSummary?
    let confidence: Double
    let alternatives: [String]
    let reason: String
    let needsClarification: Bool
    let needsCreationConfirmation: Bool
    let actor: String
    let createdAt: Date
}

struct LedgerItem: Codable, Identifiable, Equatable {
    let id: String
    let workspaceID: String
    let kind: String
    let description: String
    let actor: String
    let surface: String
    let subjectIDs: [String]
    let createdAt: Date
    let supersedesID: String?
}

struct CrossProjectWriteConfirmation: Codable, Equatable {
    let id: String
    let sourceThreadID: String
    let destinationThreadID: String
    let summary: String
    let expiresAt: Date
}

/// `ensureWorkspace` result: the ids the client needs after first sign-in.
struct EnsureWorkspaceResult: Codable, Equatable {
    let workspaceId: String
    let generalProjectId: String
    let generalThreadId: String
}

/// `submitReview` result (R10 gap 4): the checklist plus per-pin server ids
/// keyed by the client's correlation ids.
struct SubmitReviewResult: Codable, Equatable {
    struct PinID: Codable, Equatable {
        let clientID: String?
        let id: String

        enum CodingKeys: String, CodingKey { case clientID = "clientId", id }
    }

    let checklistId: String
    let pins: [PinID]

    enum CodingKeys: String, CodingKey { case checklistId, pins }
}

/// `confirmProposal` result: the created rows' ids.
struct ConfirmProposalResult: Codable, Equatable {
    let projectID: String
    let missionID: String?
    let threadID: String

    enum CodingKeys: String, CodingKey {
        case projectID = "projectId", missionID = "missionId", threadID = "threadId"
    }
}

// MARK: - Test fixture root

struct NativeFixture: Codable {
    let workspace: WorkspaceSummary
    let thread: FixtureThread
    let visualTabs: [VisualWindowTab]
}

struct FixtureThread: Codable {
    let events: [ThreadEvent]
}

// MARK: - @brain mentions

/// `@brain` slugs are routing metadata, never navigation destinations. The
/// client sends the parsed slugs; the server keeps the thread, files, and
/// Visual Window untouched.
enum BrainMention {
    /// Lowercased `@slug` tokens in order of appearance. An `@` followed by
    /// nothing, or an email address (`patrik@example.com`), is not a mention:
    /// the character before must not be a word character and the character
    /// after the slug must not be `.` followed by more word characters.
    static func parse(_ text: String) -> [String] {
        var out: [String] = []
        let chars = Array(text)
        var i = chars.startIndex
        while i < chars.endIndex {
            guard chars[i] == "@" else { i = chars.index(after: i); continue }
            let prev = i == chars.startIndex ? nil : chars[chars.index(before: i)]
            let prevOK = prev.map { !($0.isLetter || $0.isNumber || $0 == "_") } ?? true
            var j = chars.index(after: i)
            var slug = ""
            while j < chars.endIndex, chars[j].isLetter || chars[j].isNumber || chars[j] == "_" {
                slug.append(contentsOf: chars[j].lowercased())
                j = chars.index(after: j)
            }
            // "@support.example.com" is an address, not a mention.
            var isEmail = false
            if j < chars.endIndex, chars[j] == "." {
                let after = chars.index(after: j)
                if after < chars.endIndex, chars[after].isLetter { isEmail = true }
            }
            if prevOK, !isEmail, !slug.isEmpty { out.append(slug) }
            i = (j == chars.index(after: i)) ? chars.index(after: i) : j
        }
        return out
    }
}
