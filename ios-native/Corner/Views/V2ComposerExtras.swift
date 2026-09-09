// V2ComposerExtras.swift — Corner native iOS
// corner:corner-v2 R28 — everything the CV6 composer did, inside the v2 pill.
//
// Pure composer logic with no SwiftUI in it, so the unit tests pin it
// directly: slash commands, reply quotes, @mention chips, per-thread disk
// drafts, staged attachments, image runs, and the send-text builder. The
// view (ChatView.v2Composer) renders these; nothing here touches the wire.

import Foundation

// MARK: - Slash commands

/// One slash row. The palette mirrors the commands menu's items (Work/Plan,
/// Model, Specialist, Files, Generate an image) plus the CV6 slash set the
/// web carries (`/clear`, `/integrations`); rows a thread cannot run are
/// filtered by the caller, never faked.
struct V2SlashCommand: Identifiable, Equatable {
    enum ID: String {
        case plan, work, model, specialist, files, image, talk, integrations, clear
    }
    let id: ID
    let title: String
    let detail: String
    var name: String { "/\(id.rawValue)" }
}

enum V2SlashPalette {
    /// The full palette, in the order the sheet shows it.
    static func all(hasSpecialist: Bool) -> [V2SlashCommand] {
        var rows = [
            V2SlashCommand(id: .plan, title: "Plan", detail: "Corner proposes a plan first"),
            V2SlashCommand(id: .work, title: "Work", detail: "Corner gets to work directly"),
            V2SlashCommand(id: .model, title: "Model", detail: "Pick the model for this thread"),
            V2SlashCommand(id: .files, title: "Files", detail: "Open this conversation's files"),
            V2SlashCommand(id: .image, title: "Generate an image", detail: "Describe it in the field first"),
            V2SlashCommand(id: .talk, title: "Talk aloud", detail: "Hear the driver's replies"),
            V2SlashCommand(id: .integrations, title: "Integrations", detail: "Connections in Settings"),
            V2SlashCommand(id: .clear, title: "Clear chat", detail: "Confirm before anything clears"),
        ]
        if hasSpecialist {
            rows.insert(
                V2SlashCommand(id: .specialist, title: "Specialist", detail: "Route this thread's replies"),
                at: 3
            )
        }
        return rows
    }

    /// A draft opens the palette when it starts with `/` (leading
    /// whitespace ignored, mirroring the web's type-ahead).
    static func isSlashDraft(_ draft: String) -> Bool {
        draft.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("/")
    }

    /// The token after the `/`, lowercased, up to the first space.
    static func token(in draft: String) -> String {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("/") else { return "" }
        let rest = String(trimmed.dropFirst())
        if let space = rest.firstIndex(of: " ") { return String(rest[..<space]).lowercased() }
        return rest.lowercased()
    }

    /// Rows matching the typed token. Empty token matches everything.
    static func filtered(_ draft: String, hasSpecialist: Bool) -> [V2SlashCommand] {
        let token = token(in: draft)
        let rows = all(hasSpecialist: hasSpecialist)
        guard !token.isEmpty else { return rows }
        return rows.filter { $0.id.rawValue.hasPrefix(token) || $0.title.lowercased().hasPrefix(token) }
    }
}

// MARK: - Reply quotes

/// A reply-to quote: who wrote it and the line being answered. R32: the
/// quote rides the send as the `replyTo` block field (stored on the block
/// payload, like the web's send) — the sent TEXT carries no quote line
/// anymore, so cross-device quotes never depend on text parsing.
struct V2ReplyQuote: Equatable {
    let messageID: String
    let sender: String
    let snippet: String

    /// The wire field for `v2Native:send`.
    var wire: V2ReplyTo {
        V2ReplyTo(messageId: messageID, sender: sender, snippet: snippet)
    }

    init(messageID: String, sender: String, snippet: String) {
        self.messageID = messageID
        self.sender = sender
        self.snippet = snippet
    }

    init(_ wire: V2ReplyTo) {
        self.messageID = wire.messageId
        self.sender = wire.sender
        self.snippet = wire.snippet
    }

    /// One message line, truncated to `max` graphemes with an ellipsis.
    /// Pure so the tests pin the truncation, not the view.
    static func snippet(from text: String, max: Int = 140) -> String {
        let oneLine = text
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .first ?? ""
        guard oneLine.count > max else { return oneLine }
        return String(oneLine.prefix(max)).trimmingCharacters(in: .whitespaces) + "…"
    }

    /// The first text block of an event, or nil when the event carries no
    /// quotable text (steps-only, artifacts-only).
    static func quote(messageID: String, sender: String, blocks: [ThreadBlock]) -> V2ReplyQuote? {
        for block in blocks {
            if case .text(let value) = block {
                let snippet = snippet(from: value)
                guard !snippet.isEmpty else { return nil }
                return V2ReplyQuote(messageID: messageID, sender: sender, snippet: snippet)
            }
        }
        return nil
    }

    /// R66b (Slack-gap): the FULL copyable text of a message — every text
    /// block joined, not the reply snippet's truncated first line. Empty when
    /// the row is steps-only / artifacts-only (nothing to copy).
    static func fullText(blocks: [ThreadBlock]) -> String {
        var parts: [String] = []
        for block in blocks {
            if case .text(let value) = block {
                let t = value.trimmingCharacters(in: .whitespacesAndNewlines)
                if !t.isEmpty { parts.append(t) }
            }
        }
        return parts.joined(separator: "\n\n")
    }
}

// MARK: - @mention chips

/// Committed @mention chips: the tokens in the draft that name a routable
/// slug (`brain` or a specialist roster slug). Parsing reuses
/// BrainMention's own tokeniser so a chip and the wire never disagree about
/// what counts as a mention.
enum V2Mentions {
    /// Slugs committed in the draft, in order, deduped, restricted to the
    /// routable set. Pure.
    static func committed(in draft: String, roster: [String]) -> [String] {
        let routable = Set(["brain"] + roster.map { $0.lowercased() })
        var seen = Set<String>()
        return BrainMention.parse(draft).filter { slug in
            guard routable.contains(slug), !seen.contains(slug) else { return false }
            seen.insert(slug)
            return true
        }
    }

    /// The token being typed after the last `@` (no space since), or nil
    /// when the caret is not inside a mention. Pure.
    static func currentToken(in draft: String) -> String? {
        guard let at = draft.lastIndex(of: "@") else { return nil }
        let tail = String(draft[draft.index(after: at)...])
        guard !tail.isEmpty, !tail.contains(" "), !tail.contains("\n") else {
            return tail.isEmpty ? "" : nil
        }
        return tail.lowercased()
    }

    /// Suggestions for the token being typed: `brain` plus the roster,
    /// prefix-filtered. Empty token suggests everything.
    static func suggestions(token: String?, roster: [(slug: String, title: String)]) -> [(slug: String, title: String)] {
        var rows = [("brain", "Corner driver")] + roster
        guard let token, !token.isEmpty else { return rows }
        rows.removeAll { !$0.0.hasPrefix(token) && !$0.1.lowercased().hasPrefix(token) }
        return rows
    }

    /// Replace the token being typed with `@slug ` (trailing space, so the
    /// next word never glues onto the mention). No `@` in flight → append.
    static func complete(slug: String, in draft: String) -> String {
        guard let at = draft.lastIndex(of: "@") else {
            let base = draft.isEmpty ? "" : (draft.hasSuffix(" ") ? draft : draft + " ")
            return base + "@\(slug) "
        }
        return String(draft[..<at]) + "@\(slug) "
    }

    /// Remove every occurrence of `@slug` from the draft and collapse the
    /// whitespace left behind. Pure.
    static func removing(slug: String, from draft: String) -> String {
        let target = "@\(slug.lowercased())"
        var out = draft
        // Drop case-insensitively by scanning the parsed spans is overkill:
        // mentions commit lowercase, so an exact pass plus a collapse holds.
        while let range = out.lowercased().range(of: target) {
            out.removeSubrange(range)
        }
        while out.contains("  ") { out = out.replacingOccurrences(of: "  ", with: " ") }
        return out.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Per-thread disk drafts

/// Draft persistence per thread, on disk (UserDefaults), surviving relaunch.
/// Keyed by thread id — never by room, never global — so drafts cannot leak
/// across threads. The one-shot setup stash (V2DraftStore) wins when both
/// exist; the view checks that first.
enum V2ComposerDrafts {
    static func key(threadID: String) -> String { "v2ComposerDraft.\(threadID)" }

    static func save(_ text: String, threadID: String) {
        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            UserDefaults.standard.removeObject(forKey: key(threadID: threadID))
        } else {
            UserDefaults.standard.set(text, forKey: key(threadID: threadID))
        }
    }

    static func load(threadID: String) -> String? {
        let text = UserDefaults.standard.string(forKey: key(threadID: threadID))
        return (text?.isEmpty == false) ? text : nil
    }

    static func clear(threadID: String) {
        UserDefaults.standard.removeObject(forKey: key(threadID: threadID))
    }
}

// MARK: - Staged attachments

/// One file's upload lifecycle. Uploads start at stage time and run per
/// file (the web's attach path): a failed file retries alone and never
/// blocks the outbox — the send carries no bytes at all.
enum V2UploadState: Equatable {
    case queued
    case uploading
    case failed(reason: String)
    case done(artifactID: String)
}

/// A v2 staged attachment. R32: bytes upload at stage time through
/// `files:generateUploadUrl` → `v2Visual:createArtifact` (kind by MIME,
/// `createdBy: "user"`); the staged row tracks the upload, and the opened
/// tab dismisses the chip. Session-only: relaunch drops staged items
/// rather than restoring bytes-less ghosts.
struct V2StagedAttachment: Identifiable, Equatable {
    enum Kind: String, Codable { case photo, file, camera }
    let id: String
    let name: String
    let kind: Kind
    /// The file bytes (photos from the picker, files read at stage time,
    /// camera JPEGs). Nil for name-only seeds, which never upload.
    let data: Data?
    /// MIME for the storage POST (`image/jpeg`, the file's own type, or
    /// `application/octet-stream` when unknown).
    let mimeType: String
    var upload: V2UploadState

    init(id: String = UUID().uuidString, name: String, kind: Kind, data: Data? = nil, mimeType: String = "", upload: V2UploadState = .queued) {
        self.id = id
        self.name = name
        self.kind = kind
        self.data = data
        self.mimeType = mimeType.isEmpty ? V2StagedAttachment.defaultMIME(for: kind, name: name) : mimeType
        self.upload = upload
    }

    /// Name-only seeds (and extension-less names) fall back by kind; real
    /// picks always pass their own type explicitly.
    static func defaultMIME(for kind: Kind, name: String) -> String {
        let lower = name.lowercased()
        if lower.hasSuffix(".pdf") { return "application/pdf" }
        if lower.hasSuffix(".png") { return "image/png" }
        if lower.hasSuffix(".jpg") || lower.hasSuffix(".jpeg") { return "image/jpeg" }
        if lower.hasSuffix(".heic") || lower.hasSuffix(".heif") { return "image/heic" }
        if lower.hasSuffix(".mp4") || lower.hasSuffix(".mov") { return "video/mp4" }
        switch kind {
        case .photo, .camera: return "image/jpeg"
        case .file: return "application/octet-stream"
        }
    }

    var isRetryable: Bool {
        if case .failed = upload { return true }
        return false
    }

    var isDone: Bool {
        if case .done = upload { return true }
        return false
    }
}

enum V2Attachments {
    /// `photo.jpg`, `photo-2.jpg`, … — the next free name for a picker item
    /// with no filename of its own. Pure.
    static func nextPhotoName(existing: [V2StagedAttachment]) -> String {
        let taken = Set(existing.map(\.name))
        var n = existing.filter { $0.kind == .photo || $0.kind == .camera }.count + 1
        while true {
            let name = n == 1 ? "photo.jpg" : "photo-\(n).jpg"
            if !taken.contains(name) { return name }
            n += 1
        }
    }
}

// MARK: - Image runs

/// A "Generate an image" run. The run is local UI state: `generating` shows
/// the card with its Stop; `done` hands off to the opened artifact tab and
/// the row goes away; `failed`/`cancelled` show why with a dismiss. R32:
/// the run tracks the pending photo artifact the client created
/// (`meta.status: "generating"`); the model polls `artifacts` until the
/// bridge's upgrade lands `storageId`, then the tab paints and the run
/// finishes.
struct V2ImageRun: Identifiable, Equatable {
    enum State: String, Equatable { case generating, done, failed, cancelled }
    let id: String
    let prompt: String
    var state: State
    var error: String?
    /// The pending photo artifact, once `createArtifact` answers. Nil while
    /// the create is still in flight.
    var artifactID: String? = nil
}

// MARK: - Send-text builder

/// R32: the send carries the bare trimmed text — nothing else. The reply
/// quote rides the `replyTo` block field and staged files upload as
/// artifacts of their own, so neither is concatenated into the text (the
/// R28 `> sender:` line and `[attached: …]` trailer are retired).
enum V2SendText {
    static func build(text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - R32 run state (P081)

/// Client-side run state for the thread header and the optimistic working
/// line (the web's `runState.ts` twin, adapted: the phone HAS the
/// `runsForThread` query, so the nav status reads open runs — open =
/// Working, none = Ready — instead of the web's turn-shape heuristic).
enum V2RunState {
    /// The web's quiet bound: 45 s with no reply turns "<driver> is on it…"
    /// into the still notice — never silence.
    static let quietAfter: TimeInterval = 45

    /// The "<driver> is on it…" name: the newest agent voice in the thread,
    /// else the thread's project, else Corner (the web's `driverFor` twin).
    static func driverName(events: [ThreadEvent], projectName: String?) -> String {
        let label = events.reversed().first(where: { $0.author == .agent })
            .flatMap(\.agentLabel)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !label.isEmpty { return label }
        let fallback = (projectName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return fallback.isEmpty ? "Corner" : fallback
    }

    /// The working line's copy. Quiet (past the bound, still no reply) is
    /// still, never silent: the dot stops pulsing and the text says the
    /// reply will land here.
    static func workingText(driver: String, quiet: Bool) -> String {
        quiet ? "\(driver) is taking a while — the reply will land here." : "\(driver) is on it…"
    }

    /// True once the quiet bound has passed with no reply. Pure so the
    /// bound is pinned without waiting 45 s.
    static func isQuiet(sentAt: Date, now: Date, bound: TimeInterval = quietAfter) -> Bool {
        now.timeIntervalSince(sentAt) >= bound
    }
}

/// The optimistic working line under the just-sent message: set at send,
/// cleared by the first new agent event, by Stop, by a send failure, or by
/// leaving the thread. Past the quiet bound it becomes the still notice;
/// it is never silence.
struct V2WorkingLine: Equatable {
    let driver: String
    let sentAt: Date
    /// Agent event ids known when the send went out. The first agent event
    /// outside this set ends the line.
    let seenAgentIDs: Set<String>
    /// The thread was fully loaded when the send went out. When it was
    /// (the common case) arrival is purely id-based — client/server skew
    /// can never wedge the line on. A send fired mid-load (empty seen set)
    /// additionally requires the arrival to be newer than the send, so the
    /// first refresh — replaying old agent rows the model had not seen —
    /// cannot end the wait before it began.
    let loadedAtSend: Bool
    var quiet: Bool = false

    /// Whether this fresh agent event ends the line.
    func ends(on event: ThreadEvent) -> Bool {
        guard event.author == .agent, !seenAgentIDs.contains(event.id) else { return false }
        if loadedAtSend { return true }
        return event.createdAt >= sentAt.addingTimeInterval(-5)
    }
}

// MARK: - R32 artifact kinds

/// MIME/extension → artifact kind (the web's `artifactKindForFile` twin),
/// then native tab kind → CORE kind for `createArtifact` (the backend
/// validates the literal union: `site`/`file`, never `web`/`genericFile`).
enum V2ArtifactKind {
    static func from(mimeType: String, filename: String) -> VisualTabKind {
        let type = mimeType.lowercased()
        let name = filename.lowercased()
        if type == "application/pdf" || name.hasSuffix(".pdf") { return .pdf }
        if type.hasPrefix("image/") { return .photo }
        if type.hasPrefix("video/") { return .video }
        if type == "text/html" || name.hasSuffix(".html") || name.hasSuffix(".htm") { return .web }
        if name.hasSuffix(".ppt") || name.hasSuffix(".pptx") || name.hasSuffix(".key") { return .deck }
        if name.hasSuffix(".doc") || name.hasSuffix(".docx") || name.hasSuffix(".md")
            || name.hasSuffix(".txt") || name.hasSuffix(".rtf") || name.hasSuffix(".pages")
            || type == "text/plain" { return .document }
        if name.hasSuffix(".ts") || name.hasSuffix(".tsx") || name.hasSuffix(".js")
            || name.hasSuffix(".jsx") || name.hasSuffix(".py") || name.hasSuffix(".swift")
            || name.hasSuffix(".css") || name.hasSuffix(".json") || name.hasSuffix(".sh")
            || name.hasSuffix(".rb") || name.hasSuffix(".go") || name.hasSuffix(".rs")
            || name.hasSuffix(".java") || name.hasSuffix(".c") || name.hasSuffix(".cpp")
            || name.hasSuffix(".h") { return .code }
        return .genericFile
    }

    /// Native tab kind → the CORE kind literal `createArtifact` validates.
    static func coreName(for kind: VisualTabKind) -> String {
        switch kind {
        case .web: return "site"
        case .genericFile: return "file"
        default: return kind.rawValue
        }
    }
}

// MARK: - R32 multiline entry

/// Hardware Shift+Return inserts a newline instead of sending (Return alone
/// still sends, soft or hardware). The single `\n` the key inserts must not
/// trip the soft-Return submit detector, so the decision lives here — one
/// helper, one test target — not in the view's change handler.
enum V2ShiftReturn {
    /// The draft after a hardware Shift+Return: the newline appended. The
    /// view sets its submit-bypass flag around this call so the soft-Return
    /// detector does not submit the inserted newline.
    static func newlineDraft(_ draft: String) -> String {
        draft + "\n"
    }
}

// MARK: - Speakable text (Talk aloud)

/// What Talk aloud reads: agent text blocks only (options, steps, and cards
/// stay silent — the reply is the message). Checklist playback joins the
/// filled pin notes. Pure, so tests assert the words without audio.
enum V2SpeakText {
    static func speakableText(blocks: [ThreadBlock]) -> String? {
        let lines = blocks.compactMap { block -> String? in
            if case .text(let value) = block {
                let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
                return trimmed.isEmpty ? nil : trimmed
            }
            return nil
        }
        guard !lines.isEmpty else { return nil }
        return lines.joined(separator: "\n")
    }

    static func checklistSpeech(texts: [String]) -> String? {
        let filled = texts
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard !filled.isEmpty else { return nil }
        let headed = filled.enumerated().map { "Note \($0.offset + 1): \($0.element)" }
        return headed.joined(separator: "\n")
    }
}
