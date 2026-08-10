// Attachment.swift — Corner native iOS
// corner:native-ios Stage 2
//
// THE definition of "this message carries a file", ported from rowAttachments() in
// cv6next/data/useRoomThread.js.
//
// ONE parser, deliberately. The web keeps a single rowAttachments() because the thread
// and the room Files panel must never be able to disagree about what crossed the chat —
// a file card in the bubble with nothing in the panel (or the reverse) is the exact
// "it's in your Files panel but it isn't" bug that panel exists to answer. This file is
// that single definition for the phone: MessageContent uses it for the bubble's file
// cards, RoomFilesStore uses it for the crossings list, and neither has its own copy.
//
// FOUR SHAPES IN THE WILD, in the web's own precedence order:
//   1. metadata.attachments[]     — structured multi-file
//   2. metadata.attachment        — watcher auto-share {url, name, mime, size, gate_status}
//   3. attachment_url column      — composer / legacy single file
//   4. "Attached file: NAME" text — the canonical bridge/listener announcement
//      ("Attached N files: …" for multi), with the URLs on the following lines
//
// `isPure` means the row is ONLY the announcement, so the bubble renders the cards and
// hides the note — otherwise every delivery reads twice.
//
// PURITY IS COMPUTED FROM THE TEXT HERE, not hardcoded per shape as the web does. The
// web returns pure:true for EVERY metadata.attachment row, and a real hand-off carries
// both a written summary and an attachment — verified live on message
// 53894d66-ed19-4b95-81fd-92213efa8c2f, whose text reads "Disk count finished — 15GB of
// last year's Adobe is the biggest win." next to metadata.attachment. On the web that
// sentence is blanked (useRoomThread.js:486 `displayText = pure ? '' : m.text`); the
// agent's actual point disappears and only the file card survives. A row is pure only
// when its text says nothing the cards do not already say.
//
// SCHEMA NOTE (checked live, 2026-08-10). The `messages` table has NO attachment_url,
// attachment_name, file_mime_type or file_size column — the full column list is agent,
// broadcast, client_id, id, metadata, project, project_path, reply_to, retention, role,
// room_id, sender_role, source, text, timestamp, user_id, user_name, world_id. Shape 3
// below is therefore unreachable against today's schema (the web's branch for it is dead
// code). It is kept because it costs nothing and the endpoint is a `select=*` passthrough
// that would start carrying the column the day someone adds it — but NOTHING may depend
// on it, and everything real arrives through metadata or the announcement text.
//
// NO INVENTED URLS. On the multi-file text shape the web deliberately stopped pointing
// extra names at file 1's bytes: that lied about what you were opening and then dedup
// swallowed the extra file. A name with no URL arrives here with an empty url and
// renders as an un-openable row that still SAYS the file exists.

import Foundation

struct Attachment: Identifiable, Equatable, Hashable {
    /// The raw url/path exactly as the row carried it. This string IS the deliverable
    /// identity the review endpoints key on (api/_lib/fileRef.js: review.id = url), so
    /// it is never normalised, prettified, or re-encoded on the way through.
    let url: String
    let name: String
    let mime: String
    let size: Int
    /// share-file.py stamps the critic's verdict onto the ATTACHMENT, not the row.
    /// Patrik 2026-07-27: always deliver, mark it — so a file that shipped without its
    /// gate pass says so on its own card.
    let gateStatus: String
    /// Content identity, straight off the row. review-decision.js suppresses a re-share
    /// of the SAME bytes by (source_path, sha256), so a decision posted without these
    /// only ever suppresses one exact id and the file walks back into the queue on the
    /// next auto-share. The web's rowAttachments drops both; the review endpoints read
    /// them off the row independently, which is why the web still works and why anything
    /// deciding from THIS list has to carry them itself.
    var sha256: String = ""
    var sourcePath: String = ""

    var id: String { url.isEmpty ? name : url }

    var kind: FileKind { FileKind.of(name: name, mime: mime, url: url) }

    /// Nothing to open. Kept visible on purpose (see the no-invented-urls note above).
    var isOpenable: Bool { !url.isEmpty }

    var isAbsolute: Bool { Attachment.isAbsolute(url) }

    static func isAbsolute(_ raw: String) -> Bool {
        let lower = raw.lowercased()
        return lower.hasPrefix("http://") || lower.hasPrefix("https://")
    }

    var sizeLabel: String? {
        guard size > 0 else { return nil }
        if size < 1024 { return "\(size) B" }
        if size < 1024 * 1024 { return "\(Int((Double(size) / 1024).rounded())) KB" }
        return String(format: "%.1f MB", Double(size) / 1_048_576)
    }
}

// MARK: - File kinds

/// Port of fileKind() in cv6next/ChatDesktop.jsx, widened with the two kinds the
/// preview layer needs to treat differently (audio has a player, docs do not).
enum FileKind: String, Equatable {
    case photo, video, audio, pdf, doc, file

    static func of(name: String, mime: String, url: String = "") -> FileKind {
        let m = mime.lowercased()
        let ext = FileKind.extensionOf(name.isEmpty ? url : name)
        if m.hasPrefix("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "avif", "bmp", "tiff"].contains(ext) { return .photo }
        if m.hasPrefix("video/") || ["mp4", "mov", "webm", "m4v", "avi", "mkv"].contains(ext) { return .video }
        if m.hasPrefix("audio/") || ["mp3", "wav", "m4a", "aac", "ogg", "flac", "aiff", "opus"].contains(ext) { return .audio }
        if m == "application/pdf" || ext == "pdf" { return .pdf }
        if ["docx", "doc", "pptx", "ppt", "xlsx", "xls", "csv", "md", "txt", "rtf", "pages", "key", "numbers"].contains(ext) { return .doc }
        return .file
    }

    /// Query strings and fragments are stripped first — a store URL ends
    /// `…/render.png?w=440`, and taking the raw last dot-component types that as "440".
    private static func extensionOf(_ raw: String) -> String {
        let head = raw.split(whereSeparator: { $0 == "?" || $0 == "#" }).first.map(String.init) ?? raw
        guard let dot = head.lastIndex(of: "."), dot != head.index(before: head.endIndex) else { return "" }
        return String(head[head.index(after: dot)...]).lowercased()
    }

    /// QuickLook renders images, PDFs, video, audio and office documents natively.
    /// Anything else gets the share sheet, which is the honest answer: iOS may have
    /// another app that opens it, and this one does not.
    var isQuickLookable: Bool {
        switch self {
        case .photo, .video, .audio, .pdf, .doc: return true
        case .file: return false
        }
    }

    var symbol: String {
        switch self {
        case .photo: return "photo"
        case .video: return "play.rectangle"
        case .audio: return "waveform"
        case .pdf:   return "doc.richtext"
        case .doc:   return "doc.text"
        case .file:  return "doc"
        }
    }

    var label: String {
        switch self {
        case .photo: return "Image"
        case .video: return "Video"
        case .audio: return "Audio"
        case .pdf:   return "PDF"
        case .doc:   return "Document"
        case .file:  return "File"
        }
    }
}

// MARK: - The parser

struct RowAttachments: Equatable {
    let attachments: [Attachment]
    /// The row is nothing but the announcement — render the cards, hide the note.
    let isPure: Bool

    static let none = RowAttachments(attachments: [], isPure: false)

    var isEmpty: Bool { attachments.isEmpty }
}

extension Attachment {

    /// Parse one `messages` row into its attachments. Never throws, never returns nil:
    /// a row with no file is `RowAttachments.none`.
    static func parse(row: MessageRow) -> RowAttachments {
        let rawText = row.text ?? ""
        let lines = rawText.components(separatedBy: "\n")
        let firstLine = lines.first ?? ""
        let trailingLines = lines.dropFirst().map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }

        let meta = row.metadata
        let sha = meta?["attachment"]?["sha256"]?.stringValue ?? meta?["sha256"]?.stringValue ?? ""
        let sourcePath = meta?["source_path"]?.stringValue ?? ""

        func finish(_ items: [Attachment]) -> RowAttachments {
            let carried = items.map { item -> Attachment in
                var copy = item
                if copy.sha256.isEmpty, items.count == 1 { copy.sha256 = sha }
                if copy.sourcePath.isEmpty, items.count == 1 { copy.sourcePath = sourcePath }
                return copy
            }
            return RowAttachments(attachments: carried, isPure: Attachment.textIsOnlyAnnouncement(rawText, of: carried))
        }

        // 1. metadata.attachments[] — structured multi-file.
        if let arr = meta?["attachments"]?.arrayValue, !arr.isEmpty {
            let parsed = arr.compactMap(Attachment.fromMetadataObject)
            if !parsed.isEmpty { return finish(parsed) }
        }

        // 2. metadata.attachment — the watcher's auto-share and every share-file hand-off.
        if let obj = meta?["attachment"],
           obj["url"]?.stringValue?.isEmpty == false || obj["name"]?.stringValue?.isEmpty == false {
            let name = obj["name"]?.stringValue ?? ""
            return finish([Attachment(
                url: obj["url"]?.stringValue ?? "",
                name: name.isEmpty ? "File" : name,
                mime: obj["mime"]?.stringValue ?? "",
                size: obj["size"]?.intValue ?? 0,
                gateStatus: obj["gate_status"]?.stringValue ?? "",
                sha256: obj["sha256"]?.stringValue ?? sha,
                sourcePath: sourcePath
            )])
        }

        // 3. attachment_url column — see the schema note at the top: unreachable today.
        if let url = row.attachmentURL, !url.isEmpty {
            return finish([Attachment(
                url: url,
                name: Attachment.displayName(from: url),
                mime: row.fileMimeType ?? "",
                size: row.fileSize ?? 0,
                gateStatus: ""
            )])
        }

        // 4a. "Attached 3 files: a.png, b.png, c.png" + one URL per following line.
        if let names = Attachment.multiAnnouncement(firstLine) {
            let items = names.enumerated().map { index, raw in
                Attachment(
                    url: index < trailingLines.count ? trailingLines[index] : Attachment.cornerPath(from: raw),
                    name: Attachment.displayName(from: raw),
                    mime: "",
                    size: 0,
                    gateStatus: ""
                )
            }
            return finish(items)
        }

        // 4b. "Attached file: NAME" + the URL on the next line.
        if let single = Attachment.singleAnnouncement(firstLine) {
            return finish([Attachment(
                url: trailingLines.first ?? Attachment.cornerPath(from: single),
                name: Attachment.displayName(from: single),
                mime: "",
                size: 0,
                gateStatus: ""
            )])
        }

        return .none
    }

    /// True when the row's prose says nothing the file cards do not already say: it is
    /// empty, or it is the "Attached …" announcement followed only by the attachments'
    /// own URLs. Anything else is the agent talking, and it renders.
    static func textIsOnlyAnnouncement(_ text: String, of attachments: [Attachment]) -> Bool {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return true }
        let lines = trimmed.components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        guard let first = lines.first else { return true }
        guard singleAnnouncement(first) != nil || multiAnnouncement(first) != nil else { return false }
        let urls = Set(attachments.map(\.url).filter { !$0.isEmpty })
        // Every remaining line has to be one of the attachment URLs. A hand-off that
        // adds "…and the second draft is the one to look at" keeps that sentence.
        return lines.dropFirst().allSatisfy { urls.contains($0) }
    }

    private static func fromMetadataObject(_ value: JSONValue) -> Attachment? {
        let url = value["url"]?.stringValue ?? value["path"]?.stringValue ?? ""
        let rawName = value["name"]?.stringValue ?? value["fileName"]?.stringValue ?? ""
        let name = rawName.isEmpty ? Attachment.displayName(from: url) : rawName
        guard !url.isEmpty || !name.isEmpty else { return nil }
        return Attachment(
            url: url,
            name: name.isEmpty ? "File" : name,
            mime: value["mime"]?.stringValue ?? value["fileMime"]?.stringValue ?? "",
            size: value["size"]?.intValue ?? 0,
            gateStatus: value["gate_status"]?.stringValue ?? "",
            sha256: value["sha256"]?.stringValue ?? "",
            sourcePath: value["source_path"]?.stringValue ?? ""
        )
    }

    // MARK: Announcement matching

    /// `^\s*attached file:\s*(.+?)\s*$`, case-insensitive.
    static func singleAnnouncement(_ line: String) -> String? {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        let prefix = "attached file:"
        guard trimmed.lowercased().hasPrefix(prefix) else { return nil }
        let value = trimmed.dropFirst(prefix.count).trimmingCharacters(in: .whitespaces)
        return value.isEmpty ? nil : value
    }

    /// `^\s*attached\s+\d+\s+files?:\s*(.+?)\s*$`, case-insensitive. Names are
    /// comma-separated, and an empty tail is not a multi-file row.
    static func multiAnnouncement(_ line: String) -> [String]? {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard let colon = trimmed.firstIndex(of: ":") else { return nil }
        let head = trimmed[trimmed.startIndex..<colon].lowercased()
        let words = head.split(whereSeparator: { $0 == " " || $0 == "\t" }).map(String.init)
        guard words.count == 3,
              words[0] == "attached",
              Int(words[1]) != nil,
              words[2] == "files" || words[2] == "file"
        else { return nil }
        let names = trimmed[trimmed.index(after: colon)...]
            .components(separatedBy: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        return names.isEmpty ? nil : names
    }

    // MARK: Reference cleaning (port of cleanFileRef / displayNameFromFileRef / cornerPathFromText)

    static func cleanReference(_ raw: String) -> String {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        while s.hasPrefix("`") { s.removeFirst() }
        while s.hasSuffix("`") { s.removeLast() }
        while let f = s.first, f == "\"" || f == "'" { s.removeFirst() }
        while let l = s.last, l == "\"" || l == "'" { s.removeLast() }
        return s
    }

    /// The last path component with the query stripped — a store URL's filename.
    static func displayName(from raw: String) -> String {
        let value = cleanReference(raw)
        guard !value.isEmpty else { return "File" }
        let noQuery = value.split(whereSeparator: { $0 == "?" || $0 == "#" }).first.map(String.init) ?? value
        let last = noQuery.split(separator: "/").last.map(String.init)
        let decoded = last?.removingPercentEncoding ?? last
        return decoded?.isEmpty == false ? decoded! : value
    }

    /// A bare `corner/users/...` path mentioned in the announcement text is a real
    /// reference the file endpoints can resolve. Anything else is not a URL and must
    /// NOT be turned into one.
    static func cornerPath(from raw: String) -> String {
        let value = cleanReference(raw)
        guard !value.isEmpty else { return "" }
        if isAbsolute(value) { return value }
        guard let range = value.range(of: "corner/users/") else { return "" }
        // Only when it reaches the end of the token — a sentence that merely mentions a
        // path is not a link.
        let candidate = String(value[range.lowerBound...])
        if candidate.contains(" ") || candidate.contains(")") || candidate.contains("\"") { return "" }
        // …and only when it starts the token, not mid-word.
        if range.lowerBound != value.startIndex {
            let before = value[value.index(before: range.lowerBound)]
            guard before == "/" else { return "" }
        }
        return candidate
    }
}
