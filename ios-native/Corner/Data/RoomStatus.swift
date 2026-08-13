// RoomStatus.swift — Corner native iOS
// corner:native-ios R18 smoothness pass, round N1
//
// THE ONE STATUS VOCABULARY — a pure port of the web's cv6next/data/roomStatus.js
// semantics (R-SMOOTHNESS Round E). Every surface that says anything about a turn
// reads THIS derivation, so the room can never say two different things about the
// same moment. Pure functions only: no fetching, no state, no timers.
//
// The honesty rules, carried over verbatim:
// 1. `streaming` requires a live draft. It is never inferred from steps — until the
//    bridge's live-stream flag is on, no draft ever exists and this state is dormant.
// 2. `needs_you` is the RECOVERABLE needs-attention set; the hard causes — nothing
//    is actually running — are `stuck`, a different word because it asks for a
//    different action.
// 3. A live turn on a stale feed is `stuck`, not `working`: if the last thread
//    fetch failed, "working" would be a guess wearing a status chip.
// 4. The settled phase `waiting` is deliberately NOT mapped to needs_you — chips
//    end most replies, so it would light on nearly every turn.
// 5. Stopping never locally settles anything. The state exists so the user sees
//    their stop was heard; the turn ends only when the server's row or sentinel
//    says so.

import Foundation

// MARK: - Room health (GET|POST /api/dashboard/room-health)

/// The steward's answer for one turn. GET inspects; POST repairs. Shape mirrors
/// api/dashboard/room-health.js — every field optional, nothing here may throw.
struct RoomHealth: Decodable, Equatable {
    var found: Bool?
    var state: String?          // accepted | active | settled | recovering | needs_attention | unknown
    var cause: String?          // runner_failed | unclaimed | message_missing | reply_room_mismatch |
                                // settled_without_reply | write_failed | agent_silent | ...
    var repaired: Bool?
    var action: String?         // requeue_expired_job | clear_stale_status | ...
    var outcome: String?
    var repairCount: Int?
    var phase: String?          // freshest step's phase, sentinel preferred
    var suggestedAction: String?// 'room_reset' when repair has given up

    enum CodingKeys: String, CodingKey {
        case found, state, cause, repaired, action, outcome, phase
        case repairCount = "repair_count"
        case suggestedAction = "suggested_action"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        found = try? c.decodeIfPresent(Bool.self, forKey: .found)
        state = try? c.decodeIfPresent(String.self, forKey: .state)
        cause = try? c.decodeIfPresent(String.self, forKey: .cause)
        repaired = try? c.decodeIfPresent(Bool.self, forKey: .repaired)
        action = try? c.decodeIfPresent(String.self, forKey: .action)
        outcome = try? c.decodeIfPresent(String.self, forKey: .outcome)
        repairCount = try? c.decodeIfPresent(Int.self, forKey: .repairCount)
        phase = try? c.decodeIfPresent(String.self, forKey: .phase)
        suggestedAction = try? c.decodeIfPresent(String.self, forKey: .suggestedAction)
    }

    /// Memberwise, for tests and the optimistic accepted snapshot at send.
    init(
        found: Bool? = true, state: String? = nil, cause: String? = nil,
        repaired: Bool? = nil, action: String? = nil, outcome: String? = nil,
        repairCount: Int? = nil, phase: String? = nil, suggestedAction: String? = nil
    ) {
        self.found = found; self.state = state; self.cause = cause
        self.repaired = repaired; self.action = action; self.outcome = outcome
        self.repairCount = repairCount; self.phase = phase; self.suggestedAction = suggestedAction
    }
}

// MARK: - The vocabulary

enum RoomStatus: String, CaseIterable, Equatable {
    case thinking, working, streaming, stopping
    case needsYou = "needs_you"
    case stuck, idle

    /// The hard causes: nothing is actually running. Everything else under
    /// needs_attention is recoverable and reads as the agent needing the user.
    static let hardCauses: Set<String> = [
        "runner_failed", "unclaimed", "message_missing", "reply_room_mismatch",
    ]

    /// The exact ordered derivation from roomStatus.js — first match wins.
    /// `awaiting` = a turn is open (native: turn != .idle; the stalled notice is a
    /// notice, not a close — polling continues, so a stalled turn is still awaiting).
    static func derive(
        awaiting: Bool,
        liveStepCount: Int,
        draftStreaming: Bool,
        healthState: String?,
        healthCause: String?,
        feedStale: Bool
    ) -> RoomStatus {
        if healthState == "stopping" { return .stopping }
        if healthState == "needs_attention" {
            return hardCauses.contains(healthCause ?? "") ? .stuck : .needsYou
        }
        if awaiting && feedStale { return .stuck }
        if awaiting && draftStreaming { return .streaming }
        if awaiting && liveStepCount > 0 { return .working }
        if awaiting { return .thinking }
        return .idle
    }

    /// Chip label. `streaming` reads "Writing" — the user's word for it, not ours.
    /// `idle` is the empty string and renders NOTHING (no "idle" chip, ever).
    var label: String {
        switch self {
        case .thinking: return "Thinking"
        case .working: return "Working"
        case .streaming: return "Writing"
        case .stopping: return "Stopping…"
        case .needsYou: return "Needs you"
        case .stuck: return "Stuck"
        case .idle: return ""
        }
    }

    enum Tone { case live, blocked, none }

    var tone: Tone {
        switch self {
        case .thinking, .working, .streaming, .stopping: return .live
        case .needsYou, .stuck: return .blocked
        case .idle: return .none
        }
    }
}
