// RoomPreview.swift — Corner native iOS
// corner:native-ios — the room-row contract's preview hygiene (§3), ported.
//
// A preview line is what a PERSON said, or what an agent said TO a person. It is never
// transport, a receipt, or a probe. This is the native mirror of the web's one pure
// predicate — cv6next/data/presentationClean.js `isMachinePreview` plus
// data/previewText.js `normalizePreview`. A dropped preview NEVER becomes a substitute
// string (no "No messages yet", no room description): empty is legal and the row's
// preview line simply collapses. Add a new machine format here, in one place — not in a
// renderer.

import Foundation

enum RoomPreview {

    /// The clean, human preview for a room's last-activity text.
    ///
    /// The source here is `/api/dashboard/room-activity`'s `last_message_text`, which is
    /// a DIGEST joining several recent accepted lines with " · " (newest first). The first
    /// segment is the room's newest human line — the honest "where you left off" line — so
    /// we take that, run the machine-text ban over it, and normalize file/URL shapes.
    /// Returns "" when there is nothing human to show.
    static func clean(_ raw: String) -> String {
        let collapsed = collapseWhitespace(raw)
        guard !collapsed.isEmpty else { return "" }
        let firstSegment = collapsed.components(separatedBy: " · ").first ?? collapsed
        let candidate = firstSegment.trimmingCharacters(in: .whitespaces)
        guard !candidate.isEmpty, !isMachine(candidate) else { return "" }
        return normalize(candidate)
    }

    /// The §3 machine-text ban. `true` = this is machine plumbing, drop the preview.
    static func isMachine(_ text: String) -> Bool {
        let t = text.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return true }
        let lower = t.lowercased()

        // 1. Structured payloads — text starting `{` or `[`.
        if t.hasPrefix("{") || t.hasPrefix("[") { return true }

        // 2. Ops alerts — the "…alert:" text prefixes (row-level drops happen upstream).
        if regex(lower, #"^(?:chat-serving alert|bridge counter alert|supervisor alert|watchdog alert|bridge supervisor alert)\b"#) { return true }

        // 3. Bridge acknowledgements — the canned "Received — …" / "Acknowledged — …".
        //    This is the exact defect the contract was written for: the Native iOS room
        //    previewed "Received — corner-native-ios send reached the dispatcher."
        if regex(lower, #"^(?:received|acknowledged)\s*[—–-]"#) { return true }

        // 4. Dispatch and task plumbing.
        if lower.contains("[dispatch task")
            || lower.contains("task-complete")
            || lower.contains("status='queued'")
            || lower.contains("status=\"queued\"")
            || lower.contains("needs_input")
            || lower.contains("run_in_background") { return true }

        // 5. Test / probe / acceptance chatter, and round-labelled checks (R7 … check).
        if regex(lower, #"\b(?:smoke|probe|acceptance|regression)\b.*\b(?:test|check|ping)\b"#) { return true }
        if regex(t, #"^R\d+\b.*\bcheck\b"#) { return true }

        // 5b. Session lifecycle stamps — "session restarted", "session was reset",
        //     "new session started". Transport facts, not conversation.
        if regex(lower, #"\bsession\b.*\b(?:restart|restarted|reset|recycled|started over)\b"#) { return true }

        // 6. Internal identifiers surfacing as prose.
        if regex(t, #"^[A-Za-z0-9_.-]+:(?:agent|mission|project):"#) { return true }               // room_id shape
        if regex(lower, #"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"#) { return true } // bare uuid
        if t.hasPrefix("/Users/") || t.hasPrefix("src/") { return true }                              // absolute / repo paths
        if regex(lower, #"^(?:git|npm|npx|yarn|pnpm)\s"#) { return true }                             // command text

        // 7. Artifact housekeeping filenames.
        if regex(lower, #"^(?:r\d+-|census-)"#) { return true }
        if regex(lower, #"(?:-shot-|-critique-)"#) { return true }
        if t.hasPrefix(".") { return true }                                                          // dotfiles

        return false
    }

    /// previewText.js `normalizePreview`: "Attached file: path/name.md" → "Shared a file:
    /// name.md"; anything else gets its embedded URLs humanized.
    static func normalize(_ text: String) -> String {
        let t = collapseWhitespace(text)
        if let name = attachedFileName(t) { return "Shared a file: \(name)" }
        return humanizeURLs(t)
    }

    // MARK: - helpers

    private static func collapseWhitespace(_ s: String) -> String {
        s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func regex(_ s: String, _ pattern: String) -> Bool {
        s.range(of: pattern, options: .regularExpression) != nil
    }

    /// "attached file: X" / "attachment: X" → the trailing filename, path stripped.
    private static func attachedFileName(_ t: String) -> String? {
        guard let range = t.range(
            of: #"^(?:attached file|attachment)\s*[:\-]?\s*(\S+\.[a-z0-9]{2,5})"#,
            options: [.regularExpression, .caseInsensitive]
        ) else { return nil }
        let matched = String(t[range])
        // Pull the captured filename back out and drop any leading path so a mirror path
        // never leaks as prose. Split ONLY on whitespace and the label colon — never on
        // "-", because a hyphen is a legal filename character (the house convention is
        // hyphenated names like call-mode.html). Splitting on "-" truncated the name to
        // the segment after the last hyphen; the web (previewText.js) keeps the whole
        // token, and the two surfaces must agree.
        guard let token = matched.split(whereSeparator: { $0 == " " || $0 == ":" }).last else { return nil }
        let name = token.split(whereSeparator: { $0 == "/" || $0 == "\\" }).last.map(String.init) ?? String(token)
        return name.isEmpty ? nil : name
    }

    /// Swap each raw URL for its human file name (uuid prefix stripped) or, with no file
    /// segment, its hostname — a raw link is not a preview in the user's world.
    private static func humanizeURLs(_ t: String) -> String {
        guard let re = try? NSRegularExpression(pattern: #"https?://[^\s<>"'()\[\]`]+"#) else { return t }
        let ns = t as NSString
        var result = t
        let matches = re.matches(in: t, range: NSRange(location: 0, length: ns.length)).reversed()
        for m in matches {
            let raw = ns.substring(with: m.range)
            let trimmed = raw.replacingOccurrences(of: #"[.,;:!?`]+$"#, with: "", options: .regularExpression)
            let human = humanize(url: trimmed) ?? raw
            if let r = Range(m.range, in: result) { result.replaceSubrange(r, with: human) }
        }
        return result
    }

    private static func humanize(url: String) -> String? {
        guard let u = URL(string: url) else { return nil }
        let last = u.pathComponents.last(where: { $0 != "/" && !$0.isEmpty }) ?? ""
        let seg = last.removingPercentEncoding ?? last
        let named = seg.replacingOccurrences(
            of: #"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-"#,
            with: "", options: [.regularExpression, .caseInsensitive]
        )
        if named.range(of: #"\.[a-z0-9]{2,5}$"#, options: [.regularExpression, .caseInsensitive]) != nil {
            return named
        }
        return u.host
    }
}
