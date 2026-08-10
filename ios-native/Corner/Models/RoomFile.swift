// RoomFile.swift — Corner native iOS
// corner:native-ios Stage 2
//
// A CROSSING: one file that crossed one conversation, with who sent it and when.
//
// Patrik's file rule (corner:one-corner drop 1): a file exists for the user only if it
// crossed the chat. So this panel is not a disk listing, a project tree, or a storage
// bucket view — it is the thread, narrowed to files. That is why it is built from the
// SAME room-scoped /api/dashboard/supabase-messages query the thread uses, with
// attachments=1, rather than from any of the three file-listing endpoints that exist.
// The old three-source merge (project-files disk walk + list-chat-files + a message
// scrape) was demolished on the web for the reason that matters here too: three sources
// disagree, and when they disagree the panel says a file is there that the chat cannot
// show you.
//
// TWO DIRECTIONS, NEVER ONE MERGED LIST BY DEFAULT. "From agent" and "You sent" are
// different questions — one is work delivered to you, the other is material you handed
// over — and only the first can be waiting on your review.

import Foundation

struct RoomFile: Identifiable, Equatable, Hashable {
    let attachment: Attachment
    /// Display name of whoever put it in the room: "You", or the agent's TITLE
    /// (never a persona name — agentTitles.js doctrine).
    let who: String
    let timestamp: Date?
    let isUser: Bool
    /// The row this file arrived on, so "find it in the conversation" can scroll to it.
    let messageID: String

    /// Identity used for dedupe and for review decisions. The url IS the deliverable id
    /// the review endpoints key on (api/_lib/fileRef.js: review.id = url).
    var id: String { "\(isUser ? "u" : "a")|\(attachment.url)|\(attachment.name)" }

    var name: String { attachment.name }
    var kind: FileKind { attachment.kind }

    var metaLine: String {
        [who, RoomFile.relativeAge(timestamp), attachment.sizeLabel]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }

    static func relativeAge(_ date: Date?, now: Date = Date()) -> String {
        guard let date else { return "" }
        let seconds = now.timeIntervalSince(date)
        if seconds < 60 { return "now" }
        let minutes = Int((seconds / 60).rounded())
        if minutes < 60 { return "\(minutes)m" }
        let hours = Int((Double(minutes) / 60).rounded())
        if hours < 24 { return "\(hours)h" }
        return "\(Int((Double(hours) / 24).rounded()))d"
    }

    /// Every file a room's message rows carry, newest first, deduped.
    ///
    /// Dedupe keeps the NEWEST card for a repeated (direction, url, name) — an agent
    /// re-sharing a corrected file announces it twice and two identical rows read as a
    /// bug. Direction is part of the key on purpose: the same file you uploaded and the
    /// agent later handed back are two different events and both belong on screen.
    static func crossings(in rows: [MessageRow], roomTitle: String) -> [RoomFile] {
        var out: [RoomFile] = []
        for row in rows {
            let parsed = Attachment.parse(row: row)
            guard !parsed.isEmpty else { continue }
            let isUser = row.isUser
            let who = isUser ? "You" : AgentRoster.title(for: row.agent ?? "corner")
            for attachment in parsed.attachments {
                // A name with no bytes behind it is still a fact about the room, but it
                // cannot be a crossing card — there is nothing to open, preview, or
                // export, and a row that does nothing when tapped is worse than absent.
                guard attachment.isOpenable else { continue }
                out.append(RoomFile(
                    attachment: attachment,
                    who: who.isEmpty ? roomTitle : who,
                    timestamp: row.date,
                    isUser: isUser,
                    messageID: row.id
                ))
            }
        }
        out.sort { ($0.timestamp ?? .distantPast) > ($1.timestamp ?? .distantPast) }
        var seen = Set<String>()
        return out.filter { seen.insert($0.id).inserted }
    }
}
