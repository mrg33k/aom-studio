// TurnActivityAttributes.swift — Corner native iOS
// corner:native-ios R18 smoothness pass, round N7
//
// The Live Activity's data contract — COMPILED INTO BOTH TARGETS (app + widget
// extension); ActivityKit matches the two sides by this type's shape. Keep it
// tiny: the lock screen gets the same one honest status word the header pill
// speaks, the current work label, and a counting clock. Nothing here may
// carry paths, endpoints, or ids — it renders on a LOCK SCREEN.

import Foundation

#if canImport(ActivityKit)
import ActivityKit

struct TurnActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// The one vocabulary word: Thinking / Working / Writing / Stopping… —
        /// or the final Done / Stopped / Needs you.
        var statusWord: String
        /// The projected current work label ("Reading the room's canon").
        var stepLabel: String
        /// When the turn opened — drives Text(timerInterval:) so the clock
        /// counts WITHOUT any update budget spent.
        var startedAt: Date
        /// The final frame: true stops the pulse and freezes the clock.
        var done: Bool
    }

    /// What the user asked, clipped by the sender. Static per activity.
    var roomTitle: String
    var ask: String
}
#endif
