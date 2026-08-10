// ReviewItem.swift — Corner native iOS
// corner:native-ios Stage 2
//
// One row of GET /api/dashboard/review-queue, and the body of a decision POST.
//
// WHAT THE QUEUE IS. Files that crossed the chat as a deliberate hand-off
// (share-file.py stamps metadata.handoff / source='share-file'; the watcher's
// auto-shares joined on 2026-07-20) plus the user's own uploads. Waiting-for-review is
// AGENT deliverables only — Patrik, 2026-07-13: "things agents send me need review, my
// own uploads don't" — and the server already enforces that, so this client must not
// re-derive it or the two will drift.
//
// IDENTITY IS THREE FIELDS, NOT ONE. A decision carries `deliverable` (the exact id) AND
// `source_path` + `sha256` (the content identity share-file.py stamps). review-queue.js
// suppresses a decided item by BOTH, which is what makes a re-share of the same unchanged
// bytes stay decided while a genuinely fixed file (new digest) re-enters as new work.
// Post only the id and the same file walks back into the queue on its next auto-share,
// wearing a verdict that was already given.
//
// APPROVE IS PERMANENT. review-decision.js accepts `undo` for dismiss rows ONLY
// ("Only dismiss decisions can be undone") — approve and request-changes are final, and
// request-changes has already queued a real task by the time the response lands. That
// asymmetry is the reason the UI treats approve as a decision and not as a swipe.

import Foundation

struct ReviewItem: Identifiable, Equatable {
    let path: String            // the deliverable id (a store URL or a corner path)
    let name: String
    let project: String
    let mission: String
    let mime: String
    let size: Int
    let sourceKind: String      // "handoff" | "upload"
    let sourcePath: String
    let sha256: String
    let lastModified: String
    let verdict: String?        // only present under ?view=all

    var id: String { path }

    var kind: FileKind { FileKind.of(name: name, mime: mime, url: path) }

    var isAgentHandoff: Bool { sourceKind == "handoff" }

    var date: Date? { lastModified.isEmpty ? nil : MessageRow.parseTimestamp(lastModified) }

    var location: String {
        if !mission.isEmpty && !project.isEmpty { return "\(project) / \(mission)" }
        return project.isEmpty ? mission : project
    }

    /// The attachment shape the preview/export layer takes, so a queue item and a room
    /// crossing open through exactly one code path.
    var asAttachment: Attachment {
        Attachment(
            url: path,
            name: name,
            mime: mime,
            size: size,
            gateStatus: "",
            sha256: sha256,
            sourcePath: sourcePath
        )
    }
}

extension ReviewItem: Decodable {
    enum CodingKeys: String, CodingKey {
        case path, name, project, mission, mime, size, verdict
        case id
        case type
        case sourceKind = "source_kind"
        case sourcePath = "source_path"
        case sha256
        case lastModified = "last_modified"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)

        // Every field is read tolerantly. A queue whose 40th item carries an unexpected
        // null must not throw away the other 39 — the whole point of this screen is
        // that nothing waiting on the user silently disappears.
        func string(_ key: CodingKeys) -> String {
            // `try?` flattens the String?? that decodeIfPresent returns, so one
            // coalesce covers both "the key was absent" and "the value was null".
            (try? c.decodeIfPresent(String.self, forKey: key)) ?? ""
        }

        // The server writes `path`; useReview.js reads `it.id || it.path` because the
        // shape has moved once. Accept both rather than depend on which one won.
        let byPath = string(.path)
        path = byPath.isEmpty ? string(.id) : byPath
        let declaredName = string(.name)
        name = declaredName.isEmpty ? Attachment.displayName(from: path) : declaredName
        project = string(.project)
        mission = string(.mission)
        // `mime` is explicitly nullable server-side (fileRefToReviewQueueItem).
        mime = string(.mime)
        size = ((try? c.decodeIfPresent(Int.self, forKey: .size)) ?? nil) ?? 0
        sourceKind = string(.sourceKind)
        sourcePath = string(.sourcePath)
        sha256 = string(.sha256)
        lastModified = string(.lastModified)
        let rawVerdict = string(.verdict)
        verdict = rawVerdict.isEmpty ? nil : rawVerdict
    }
}

struct ReviewQueueEnvelope: Decodable {
    let items: [ReviewItem]?
    let total: Int?
    let hasMore: Bool?
    let newestTs: String?

    enum CodingKeys: String, CodingKey {
        case items, total, hasMore
        case newestTs = "newest_ts"
    }
}

/// What the server says came back from a decision. `task_id` is present only on
/// request-changes, and it is the receipt that the note became real dispatched work
/// rather than a comment that dies in chat.
struct ReviewDecisionResult: Decodable {
    let ok: Bool?
    let taskID: String?
    let decisionID: String?

    enum CodingKeys: String, CodingKey {
        case ok
        case taskID = "task_id"
        case decisionID = "decision_id"
    }
}

enum ReviewAction: String {
    case approve
    case requestChanges = "request-changes"
    case dismiss

    var label: String {
        switch self {
        case .approve:        return "Approve"
        case .requestChanges: return "Request changes"
        case .dismiss:        return "Not for review"
        }
    }

    /// Only dismiss is reversible server-side. The UI must not offer an undo it does
    /// not have, and it must not present a permanent act as a light one.
    var isReversible: Bool { self == .dismiss }
}
