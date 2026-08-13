// WorkProjection.swift — Corner native iOS
// corner:native-ios R18 smoothness pass, round N5
//
// The work card's label pipeline — a pure port of the web's roomWorkProjection
// semantics. The steps feed re-emits rows (keep-alives share a step_index) and
// repeats labels; rendering it raw produces duplicate lines and a card that
// stutters. The projection: de-duplicate by step_index keeping the newest by
// timestamp, sort, collapse adjacent identical labels, and when no step exists
// fall through to honest generic labels — never an empty card.

import Foundation

enum WorkProjection {

    /// Dedup + sort + collapse. Steps come in server-humanized; this never
    /// rewrites a label, only chooses which rows earn a line.
    static func projected(_ steps: [MessageStep]) -> [MessageStep] {
        // Newest row wins per step_index (a re-emitted keep-alive replaces its
        // older self instead of stacking).
        var newestByIndex: [Int: MessageStep] = [:]
        var indexless: [MessageStep] = []
        for step in steps {
            guard let index = step.stepIndex else {
                indexless.append(step)
                continue
            }
            if let current = newestByIndex[index] {
                if epoch(step) >= epoch(current) { newestByIndex[index] = step }
            } else {
                newestByIndex[index] = step
            }
        }
        let ordered = newestByIndex
            .sorted { $0.key < $1.key }
            .map(\.value) + indexless

        // Collapse adjacent identical labels — one thought, one line.
        var collapsed: [MessageStep] = []
        for step in ordered {
            if let last = collapsed.last, last.text == step.text { continue }
            collapsed.append(step)
        }
        return collapsed
    }

    /// The card's current line: the latest projected label, else the web's
    /// fallback ladder — "Responding to: <ask>" when we know what was asked,
    /// "Preparing a response" when we know nothing. Never empty.
    static func currentLabel(steps: [MessageStep], ask: String?) -> String {
        if let latest = projected(steps).last?.text, !latest.isEmpty {
            return latest
        }
        if let ask = ask?.trimmingCharacters(in: .whitespacesAndNewlines), !ask.isEmpty {
            let clipped = ask.count > 80 ? String(ask.prefix(77)) + "…" : ask
            return "Responding to: \(clipped)"
        }
        return "Preparing a response"
    }

    /// The action glyph per label class — the web's search/read/write/run/send/
    /// ship/question vocabulary, keyed on the humanized label's verbs.
    static func glyph(for label: String) -> String {
        let l = label.lowercased()
        if l.hasSuffix("?") || l.contains("waiting") || l.contains("confirm") {
            return "questionmark.circle"
        }
        if l.contains("search") || l.contains("looking") || l.contains("finding") || l.contains("hunting") {
            return "magnifyingglass"
        }
        if l.contains("read") || l.contains("open") || l.contains("review") || l.contains("checking") || l.contains("picking") {
            return "book"
        }
        if l.contains("ship") || l.contains("deploy") || l.contains("push") || l.contains("commit") {
            return "shippingbox"
        }
        // Write outranks send: "Writing the reply" is a WRITE — the greedy "repl"
        // keyword must never steal it (the exact misclassification the test caught).
        if l.contains("writ") || l.contains("edit") || l.contains("draft") || l.contains("creat") {
            return "square.and.pencil"
        }
        if l.contains("run") || l.contains("test") || l.contains("execut") || l.contains("build") {
            return "play"
        }
        if l.contains("send") || l.contains("post") || l.contains("repl") || l.contains("deliver") {
            return "paperplane"
        }
        return "circle"
    }

    /// Honest progress: determinate ONLY when the label carries a real
    /// "N of M" / "N/M" checklist count with 0 < N <= M; indeterminate (nil)
    /// otherwise. A progress bar that invents its fraction is a fake UI element.
    static func checklistProgress(in label: String) -> Double? {
        let pattern = #"(\d+)\s*(?:of|/)\s*(\d+)"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: label, range: NSRange(label.startIndex..., in: label)),
              let nRange = Range(match.range(at: 1), in: label),
              let mRange = Range(match.range(at: 2), in: label),
              let n = Int(label[nRange]), let m = Int(label[mRange]),
              m > 0, n > 0, n <= m
        else { return nil }
        return Double(n) / Double(m)
    }

    private static func epoch(_ step: MessageStep) -> TimeInterval {
        step.timestamp.flatMap(MessageRow.parseTimestamp)?.timeIntervalSince1970 ?? 0
    }
}
