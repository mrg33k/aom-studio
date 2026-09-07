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

/// A reply-to quote: who wrote it and the line being answered. The quote
/// rides the sent text as a `> sender: snippet` line (the server stores
/// exactly what it receives), so no mapping table can drift.
struct V2ReplyQuote: Equatable {
    let messageID: String
    let sender: String
    let snippet: String

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

/// A v2 staged attachment. Names ride the send (see buildSendText); bytes
/// wait on a send-attachments field the backend does not take yet, which the
/// R28 report files as a backend row. Session-only: relaunch drops staged
/// names rather than restoring bytes-less ghosts.
struct V2StagedAttachment: Identifiable, Equatable {
    enum Kind: String { case photo, file, camera }
    let id: String
    let name: String
    let kind: Kind
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
/// the row goes away; `failed`/`cancelled` show why with a dismiss.
struct V2ImageRun: Identifiable, Equatable {
    enum State: String, Equatable { case generating, done, failed, cancelled }
    let id: String
    let prompt: String
    var state: State
    var error: String?
}

// MARK: - Send-text builder

/// The exact text a v2 send carries: an optional `> sender: snippet` reply
/// line, the typed text, and an optional `[attached: …]` trailer naming the
/// staged files. One builder, one test target — the view never concatenates
/// send text itself.
enum V2SendText {
    static func build(text: String, quote: V2ReplyQuote?, attachments: [V2StagedAttachment]) -> String {
        var parts: [String] = []
        if let quote {
            parts.append("> \(quote.sender): \(quote.snippet)")
        }
        parts.append(text.trimmingCharacters(in: .whitespacesAndNewlines))
        if !attachments.isEmpty {
            parts.append("[attached: \(attachments.map(\.name).joined(separator: ", "))]")
        }
        return parts.joined(separator: "\n")
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
