// MessageContent.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Turns one `messages` row into the pieces a bubble renders: prose, link cards, and
// `metadata.blocks`.
//
// STAGE 1 IS DELIBERATELY NARROW. The full block vocabulary (blockSchema.js: data
// tables with charts, email cards, galleries, audio, video, confirm gates) lands in
// Stage 2/4. What ships here is the floor:
//
//   1. Plain text always renders.
//   2. Link cards render as tappable cards, never as a bare URL in prose
//      (Patrik 2026-07-13). Extraction is a port of cv6next/data/resultLinks.js.
//   3. Every OTHER block kind renders as an honest fallback card carrying whatever
//      human-readable title/detail/text it has, labelled with what it is.
//
// Point 3 is the whole design. The alternative — render only the kinds we recognise —
// means an agent emitting a `data` block produces a BLANK bubble on the phone while
// the web shows a table, and the user is left to guess whether the agent said nothing
// or the app dropped it. A visible "Table — open Corner on the web to see it" card is
// worse-looking and vastly more honest, and it is why unknown kinds are handled by
// construction rather than by a list that has to be kept in sync.

import Foundation

// MARK: - Link cards

struct LinkCard: Identifiable, Equatable {
    var id: String { url.absoluteString }
    let url: URL
    let summary: String

    var host: String { url.host?.replacingOccurrences(of: "www.", with: "") ?? url.absoluteString }

    /// A readable label: the last meaningful path component, else the host.
    var label: String {
        let last = url.pathComponents.last { $0 != "/" && !$0.isEmpty }
        guard let last, last.count > 1 else { return host }
        return Room.prettify(last.replacingOccurrences(of: ".html", with: ""))
    }
}

// MARK: - Blocks

/// One `metadata.blocks` entry, kept as raw JSON plus the few fields every kind of
/// block tends to carry. Nothing is required — a block with no recognisable text at
/// all still renders as its kind, which is more information than nothing.
struct MessageBlock: Identifiable, Equatable {
    let id: String
    let kind: String
    let raw: JSONValue

    var title: String? { firstString("title", "prompt", "subject", "label", "name", "file") }
    var detail: String? { firstString("detail", "text", "explain", "quote", "caption", "transcript") }
    var state: String? { raw["state"]?.stringValue }
    var url: URL? {
        guard let s = firstString("url", "href", "link"), let u = URL(string: s) else { return nil }
        return u
    }

    /// Bullet lines for summary-shaped blocks.
    var bullets: [String] {
        (raw["bullets"]?.arrayValue ?? []).compactMap { $0.stringValue }
    }

    /// Tappable option labels (question / choice / replies). Stage 1 puts the label
    /// into the composer instead of auto-sending it: a chip that fires a message with
    /// a payload shape we have not verified is a worse bug than a chip that drafts one.
    var options: [String] {
        for key in ["options", "choices", "actions"] {
            guard let arr = raw[key]?.arrayValue else { continue }
            let labels = arr.compactMap { item -> String? in
                if let s = item.stringValue { return s }
                return item["title"]?.stringValue ?? item["label"]?.stringValue
            }
            if !labels.isEmpty { return labels }
        }
        return []
    }

    var code: String? { raw["code"]?.stringValue }

    /// How many rows a `data` block holds, for the fallback card's one honest fact.
    var rowCount: Int? { raw["rows"]?.arrayValue?.count }

    private func firstString(_ keys: String...) -> String? {
        for k in keys {
            if let s = raw[k]?.stringValue, !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return s
            }
        }
        return nil
    }
}

// MARK: - Assembled content

struct MessageContent: Equatable {
    let prose: String
    let links: [LinkCard]
    let blocks: [MessageBlock]
    let attachmentURL: URL?
    let attachmentIsImage: Bool

    var isEmpty: Bool {
        prose.isEmpty && links.isEmpty && blocks.isEmpty && attachmentURL == nil
    }

    static func build(from row: MessageRow) -> MessageContent {
        let rawText = row.text ?? ""
        let meta = row.metadata

        // --- link cards ---
        var cards: [LinkCard] = []
        var seen = Set<String>()
        let attachmentURLs = Set(
            (meta?["attachments"]?.arrayValue ?? [])
                .compactMap { $0["url"]?.stringValue }
        )

        func push(_ candidate: String, summary: String) {
            let cleaned = MessageContent.cleanURL(candidate)
            guard !cleaned.isEmpty,
                  !seen.contains(cleaned),
                  !attachmentURLs.contains(cleaned),
                  MessageContent.isCardable(cleaned),
                  let url = URL(string: cleaned)
            else { return }
            seen.insert(cleaned)
            cards.append(LinkCard(url: url, summary: summary))
        }

        // The structured completion payload first (task-complete.sh → the row), then
        // any http(s) URL the agent wrote in prose — the bridge-voiced completion path
        // carries no payload, and the text lift is what makes a card appear every time.
        if let rp = meta?["result_payload"] {
            let type = (rp["type"]?.stringValue ?? "").lowercased()
            if type == "link" || type == "check_external", let payload = rp["payload"]?.stringValue {
                push(payload, summary: rp["summary"]?.stringValue ?? "")
            }
        }
        for match in MessageContent.urls(in: rawText) {
            if cards.count >= 3 { break }
            push(match, summary: "")
        }

        // --- blocks ---
        var blocks: [MessageBlock] = []
        if let arr = meta?["blocks"]?.arrayValue {
            for (i, item) in arr.enumerated() {
                let kind = (item["type"]?.stringValue ?? "").lowercased()
                guard !kind.isEmpty else { continue }
                blocks.append(MessageBlock(id: "\(row.id)-block-\(i)", kind: kind, raw: item))
            }
        }

        // --- attachment ---
        var attachment: URL?
        var isImage = false
        if let a = row.attachmentURL, let u = URL(string: a) {
            attachment = u
            isImage = (row.fileMimeType ?? "").hasPrefix("image/")
                || MessageContent.imageExtensions.contains(u.pathExtension.lowercased())
        }

        return MessageContent(
            prose: MessageContent.stripTrailingCardURL(rawText, cards: cards),
            links: cards,
            blocks: blocks,
            attachmentURL: attachment,
            attachmentIsImage: isImage
        )
    }

    // MARK: - resultLinks.js port

    private static let imageExtensions: Set<String> = [
        "png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "bmp",
    ]

    /// Media already renders as media; a link card on top would double it.
    private static let mediaExtensions: Set<String> = imageExtensions.union([
        "mp4", "mov", "webm", "m4v", "avi", "mp3", "wav", "m4a", "aac", "ogg",
    ])

    /// Backticks are excluded from the URL character class on purpose: agents wrap
    /// URLs in markdown code spans and a captured trailing ` produced dead links
    /// (a live Drive URL rendering as …LMWi2eG%60), found in the 2026-07-17 sweep.
    private static let urlRegex = try? NSRegularExpression(
        pattern: "https?://[^\\s<>\"'()\\[\\]`]+",
        options: []
    )

    static func urls(in text: String) -> [String] {
        guard let urlRegex else { return [] }
        let ns = text as NSString
        return urlRegex
            .matches(in: text, range: NSRange(location: 0, length: ns.length))
            .map { ns.substring(with: $0.range) }
    }

    static func cleanURL(_ raw: String) -> String {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        while let last = s.last, ".,;:!?`*_".contains(last) { s.removeLast() }
        return s
    }

    static func isCardable(_ raw: String) -> Bool {
        guard let url = URL(string: raw), let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https",
              let host = url.host?.lowercased()
        else { return false }
        if mediaExtensions.contains(url.pathExtension.lowercased()) { return false }
        // A dev-machine URL is not a link in the user's world — nothing to tap.
        if host == "localhost" || host == "127.0.0.1" || host.hasSuffix(".local") { return false }
        return true
    }

    /// Drop a trailing bare URL from the prose when a card already carries it, so the
    /// same link never shows twice. Only a whitespace-preceded bare URL at the very end
    /// goes; mid-sentence and markdown links stay in the prose where they read.
    static func stripTrailingCardURL(_ text: String, cards: [LinkCard]) -> String {
        guard !cards.isEmpty else { return text }
        let urls = Set(cards.map { $0.url.absoluteString })
        var out = text
        var guardCount = 0
        while guardCount < 5 {
            guardCount += 1
            let trimmed = out.trimmingCharacters(in: CharacterSet(charactersIn: " \t\n\r.,;:!?`*_-—–"))
            guard let lastToken = trimmed.split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "`" }).last
            else { break }
            let candidate = cleanURL(String(lastToken))
            guard urls.contains(candidate), let range = out.range(of: lastToken, options: .backwards)
            else { break }
            out = String(out[out.startIndex..<range.lowerBound])
                .trimmingCharacters(in: CharacterSet(charactersIn: " \t\n\r:—–`-"))
        }
        return out
    }
}
