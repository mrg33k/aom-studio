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
    /// R32 reply-to: the quote this message answers, when the backend
    /// carried one. The server stores `replyTo` on the block payload and
    /// both surfaces (`v2Workspace`, `v2Native:threadEvents`) pass it
    /// through. Two sources: decoded from a text block's `replyTo` key
    /// when present, and set on the optimistic echo at send. Never
    /// encoded: it is a read overlay, not wire state.
    var replyQuote: V2ReplyQuote? = nil

    enum CodingKeys: String, CodingKey {
        case id, threadID, author, agentLabel, blocks, createdAt
    }

    init(
        id: String, threadID: String, author: ThreadAuthor, agentLabel: String?,
        blocks: [ThreadBlock], createdAt: Date, replyQuote: V2ReplyQuote? = nil
    ) {
        self.id = id
        self.threadID = threadID
        self.author = author
        self.agentLabel = agentLabel
        self.blocks = blocks
        self.createdAt = createdAt
        self.replyQuote = replyQuote
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        threadID = try container.decode(String.self, forKey: .threadID)
        author = try container.decode(ThreadAuthor.self, forKey: .author)
        agentLabel = try container.decodeIfPresent(String.self, forKey: .agentLabel)
        blocks = try container.decode([ThreadBlock].self, forKey: .blocks)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        // A text block may carry the quote the backend stored (the surface
        // passes the payload through). The first quoted text block wins;
        // anything else leaves the overlay unset.
        replyQuote = Self.quoteFromRawBlocks(try? container.decode([RawThreadBlock].self, forKey: .blocks))
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(threadID, forKey: .threadID)
        try container.encode(author, forKey: .author)
        try container.encodeIfPresent(agentLabel, forKey: .agentLabel)
        try container.encode(blocks, forKey: .blocks)
        try container.encode(createdAt, forKey: .createdAt)
    }

    private static func quoteFromRawBlocks(_ raw: [RawThreadBlock]?) -> V2ReplyQuote? {
        guard let raw else { return nil }
        for block in raw {
            if block.type == "text", let reply = block.replyTo,
               !reply.messageId.isEmpty, !reply.sender.isEmpty {
                return V2ReplyQuote(messageID: reply.messageId, sender: reply.sender, snippet: reply.snippet)
            }
        }
        return nil
    }
}

/// The untyped shape of one wire block, decoded alongside `ThreadBlock`
/// only to lift the `replyTo` the backend stored on text payloads. Unknown
/// keys are ignored, so a block the typed decode rejects still cannot fail
/// the quote lift (and a block with no quote decodes to nils).
private struct RawThreadBlock: Decodable {
    var type: String = ""
    var replyTo: V2ReplyTo? = nil

    enum CodingKeys: String, CodingKey { case type, replyTo }
}

// MARK: - R32 wiring: reply-to, runs, artifacts

/// The wire shape of a reply-to reference: `{messageId, sender, snippet}`.
/// Stored on the user text block's payload by `v2Native:send` /
/// `v2Workspace:sendMessage`; read back wherever the surface passes the
/// payload through.
struct V2ReplyTo: Codable, Equatable {
    let messageId: String
    let sender: String
    let snippet: String
}

/// One backend run row, as `v2Native:runsForThread` shapes it: open rows
/// (`running`/`queued`) plus the last `done` one. `createdAt` arrives as ms
/// epoch (a number), never an ISO string.
struct V2ThreadRun: Codable, Equatable {
    let id: String
    let status: String
    let brain: String?
    let provider: String
    let createdAt: Date

    var isOpen: Bool { status == "running" || status == "queued" }

    enum CodingKeys: String, CodingKey { case id, status, brain, provider, createdAt }

    init(id: String, status: String, brain: String?, provider: String, createdAt: Date) {
        self.id = id
        self.status = status
        self.brain = brain
        self.provider = provider
        self.createdAt = createdAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        status = try container.decode(String.self, forKey: .status)
        brain = try container.decodeIfPresent(String.self, forKey: .brain)
        provider = try container.decode(String.self, forKey: .provider)
        // The runs query shapes ms epoch; accept an ISO string too so a
        // future shaped envelope never fails the decode.
        if let ms = try? container.decode(Double.self, forKey: .createdAt) {
            createdAt = Date(timeIntervalSince1970: ms / 1000)
        } else {
            createdAt = try container.decode(Date.self, forKey: .createdAt)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(status, forKey: .status)
        try container.encodeIfPresent(brain, forKey: .brain)
        try container.encode(provider, forKey: .provider)
        try container.encode(createdAt.timeIntervalSince1970 * 1000, forKey: .createdAt)
    }
}

struct V2ThreadRuns: Codable, Equatable {
    let open: [V2ThreadRun]
    let lastDone: V2ThreadRun?

    var isWorking: Bool { !open.isEmpty }
}

/// What `v2Visual:createArtifact` returns: the raw inserted row, not the
/// shaped surface artifact (no `id`/`sourceURL` envelope). Only the id is
/// decoded — the client already holds the title, kind, and thread.
struct V2CreatedArtifact: Decodable, Equatable {
    /// The `_id` of the inserted `artifacts` row.
    let id: String

    enum CodingKeys: String, CodingKey { case id = "_id" }
}

/// What `v2Workspace:clearThread` returns. The client keeps nothing from it
/// (the re-read shows the emptied surface); the decode only proves success.
/// Lenient by design: a shaped-envelope change must never read as a failed
/// clear when the server already hid the rows.
struct V2ClearThreadResult: Decodable, Equatable {
    let clearedAt: Double?

    enum CodingKeys: String, CodingKey { case clearedAt }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        clearedAt = try? container.decodeIfPresent(Double.self, forKey: .clearedAt)
    }
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

/// One `v2Workspace:getNavigation` node (R41 home): the flat projects +
/// missions list. Titles (not slugs) ride the wire, so the home suggestion
/// builder matches ledger subjects against `slugifiedTitle` — the backend's
/// `slugify` lowercases and turns every non-alphanumeric run into one dash.
struct V2NavNode: Codable, Equatable {
    let id: String
    let threadId: String
    let kind: String // "project" or "mission"
    let title: String
    let projectId: String
    let parentProjectId: String?
    let tint: String?
    let needsYou: Bool
    let lastActivityAt: Double?

    var isProject: Bool { kind == "project" }

    /// The backend's `slugify(name)`: lowercase, `[^a-z0-9]+` → `-`, trim
    /// dashes. Ledger subjects are slugs, so this is the join key.
    var slugifiedTitle: String {
        var out = ""
        var dashed = true
        for scalar in title.lowercased().unicodeScalars {
            let v = scalar.value
            let alnum = (v >= 97 && v <= 122) || (v >= 48 && v <= 57)
            if alnum {
                out.unicodeScalars.append(scalar)
                dashed = false
            } else if !dashed {
                out.append("-")
                dashed = true
            }
        }
        while out.hasSuffix("-") { out.removeLast() }
        return out
    }

    enum CodingKeys: String, CodingKey {
        case id, threadId, kind, title, projectId, parentProjectId, tint, needsYou, lastActivityAt
    }

    init(
        id: String, threadId: String, kind: String, title: String, projectId: String,
        parentProjectId: String? = nil, tint: String? = nil,
        needsYou: Bool = false, lastActivityAt: Double? = nil
    ) {
        self.id = id
        self.threadId = threadId
        self.kind = kind
        self.title = title
        self.projectId = projectId
        self.parentProjectId = parentProjectId
        self.tint = tint
        self.needsYou = needsYou
        self.lastActivityAt = lastActivityAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        threadId = try container.decode(String.self, forKey: .threadId)
        kind = (try? container.decode(String.self, forKey: .kind)) ?? "project"
        title = try container.decode(String.self, forKey: .title)
        projectId = (try? container.decode(String.self, forKey: .projectId)) ?? ""
        parentProjectId = try? container.decodeIfPresent(String.self, forKey: .parentProjectId)
        tint = try? container.decodeIfPresent(String.self, forKey: .tint)
        needsYou = (try? container.decodeIfPresent(Bool.self, forKey: .needsYou)) ?? false
        if let ms = try? container.decodeIfPresent(Double.self, forKey: .lastActivityAt) {
            lastActivityAt = ms
        } else if let ms = try? container.decodeIfPresent(Int.self, forKey: .lastActivityAt) {
            lastActivityAt = Double(ms)
        } else {
            lastActivityAt = nil
        }
    }
}

/// One `ledger:latest` row (R41 home): the organization ledger's plain
/// sentence (`what`) plus its subject slugs. A different shape from the
/// workspace `LedgerItem` (that one is `description` + `subjectIDs`).
struct WorldLedgerItem: Codable, Equatable {
    let id: String
    let world: String?
    let who: String?
    let surface: String?
    let what: String
    let subjects: [String]
    let kind: String?
    /// Authoritative freshness: the backend stores both `atMs` (number)
    /// and `at` (ISO string).
    let atMs: Double?
    let at: Date?

    /// Seconds since epoch — `atMs` first, `at` second, never nil (an
    /// undated row sorts oldest instead of failing the decode).
    var freshness: TimeInterval {
        if let atMs { return atMs / 1000 }
        if let at { return at.timeIntervalSince1970 }
        return 0
    }

    enum CodingKeys: String, CodingKey {
        case id, world, who, surface, what, subjects, kind, atMs, at
    }

    init(
        id: String, world: String? = nil, who: String? = nil, surface: String? = nil,
        what: String, subjects: [String], kind: String? = nil,
        atMs: Double? = nil, at: Date? = nil
    ) {
        self.id = id
        self.world = world
        self.who = who
        self.surface = surface
        self.what = what
        self.subjects = subjects
        self.kind = kind
        self.atMs = atMs
        self.at = at
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        world = try? container.decodeIfPresent(String.self, forKey: .world)
        who = try? container.decodeIfPresent(String.self, forKey: .who)
        surface = try? container.decodeIfPresent(String.self, forKey: .surface)
        what = try container.decode(String.self, forKey: .what)
        subjects = (try? container.decodeIfPresent([String].self, forKey: .subjects)) ?? []
        kind = try? container.decodeIfPresent(String.self, forKey: .kind)
        if let ms = try? container.decodeIfPresent(Double.self, forKey: .atMs) {
            atMs = ms
        } else if let ms = try? container.decodeIfPresent(Int.self, forKey: .atMs) {
            atMs = Double(ms)
        } else {
            atMs = nil
        }
        at = try? container.decodeIfPresent(Date.self, forKey: .at)
    }
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
