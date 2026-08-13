// TurnStreamEvent.swift — Corner native iOS
// corner:native-ios R18 smoothness pass, round N3
//
// The bridge's live-reply stream, as the client consumes it. Wire format
// (GET /api/dashboard/chat-bridge?stream=<messageId>): plain SSE `data:` lines,
// one JSON object per line, NO `event:` names — the discriminator is the `type`
// field inside the JSON. Because every event is a single-line JSON body, plain
// line-splitting is a correct SSE read here; the blank-line event delimiters
// that trip naive parsers carry no information on this stream.
//
// `chunk.text` is a DELTA, never a snapshot — always append. `done.text` is the
// full final reply and is deliberately IGNORED: the durable row is the only
// thing that ever renders as a message.

import Foundation

enum TurnStreamEvent: Equatable {
    /// Opening frame, always first.
    case typing
    /// An append-delta of the reply as it is written.
    case chunk(String)
    /// The turn finished. The payload text is ignored by contract — reload and
    /// let the durable row speak.
    case done
    /// A follow-up folded this turn into another; this stream is over.
    case superseded
    /// The bridge reported an error (including 'timeout'). Silent no-op — the
    /// step poll is the fallback and keeps running regardless.
    case error(String)

    /// Parse one SSE line. Returns nil for anything that is not a well-formed
    /// `data: {json}` line — unparseable lines are skipped, never fatal.
    static func parse(line: String) -> TurnStreamEvent? {
        guard line.hasPrefix("data:") else { return nil }
        let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
        guard !payload.isEmpty,
              let data = payload.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = obj["type"] as? String
        else { return nil }
        switch type {
        case "typing":
            return .typing
        case "chunk":
            return .chunk(obj["text"] as? String ?? "")
        case "done", "fallback":
            // `fallback` is a legacy vocabulary word from the primary bridge lane;
            // the client treats it exactly like done (close, reload, row speaks).
            return .done
        case "superseded":
            return .superseded
        case "error":
            return .error(obj["error"] as? String ?? "unknown")
        default:
            return nil
        }
    }
}
