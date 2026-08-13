// ScrollBrain.swift — Corner native iOS
// corner:native-ios R18 smoothness pass, round N4
//
// THE ONE SCROLL BRAIN — a pure port of the web's useStickToBottom.js, extracted
// there after three drifting copies proved that scroll behavior must have exactly
// one home. All decisions, no side effects: the view reports what happened and
// performs whatever action comes back.
//
// The three rules, verbatim from the web contract:
// 1. COUNT CHANGES: an identical count NEVER moves the scroll (the poll hands
//    back a fresh array every few seconds; moving on it would yank the reader).
//    First load snaps instantly. A live turn always follows, smoothly. Otherwise
//    follow only when the reader is already near the bottom (within 200pt).
// 2. GROWTH: steps and the streaming draft grow height WITHOUT changing the
//    count. Only while a turn is live, re-pin instantly after layout — without
//    this the reader is stranded mid-draft.
// 3. THE JUMP PILL: shows only when NOT awaiting and the reader is far from the
//    bottom (past 240pt). A live turn never shows it — auto-follow would flicker
//    it. Tapping follows smoothly and re-arms.

import Foundation
import CoreGraphics

struct ScrollBrain {
    enum Action: Equatable {
        case none
        /// Instant, unanimated snap (first load / growth re-pin — animation here
        /// reads as the view chasing its own tail).
        case snapInstant
        /// Smooth follow (new content while reading near the tail, live turns).
        case followSmooth
    }

    /// Distance-from-bottom under which the reader counts as "at the tail".
    var followThreshold: CGFloat = 200
    /// Distance-from-bottom past which the jump pill appears.
    var pillThreshold: CGFloat = 240

    private(set) var prevCount = 0

    /// Rule 1 — the thread's item count changed (or a poll returned).
    mutating func onCountChange(
        count: Int, awaiting: Bool, distanceFromBottom: CGFloat
    ) -> Action {
        defer { prevCount = count }
        if count == prevCount { return .none }
        if prevCount == 0 { return count > 0 ? .snapInstant : .none }
        if awaiting { return .followSmooth }
        return distanceFromBottom < followThreshold ? .followSmooth : .none
    }

    /// Rule 2 — steps or the draft grew without a count change.
    func onContentGrowth(awaiting: Bool, distanceFromBottom: CGFloat) -> Action {
        guard awaiting else { return .none }
        // A reader who deliberately scrolled up mid-turn stays where they are —
        // the growth re-pin is for the follower at the tail, not a leash.
        guard distanceFromBottom < followThreshold else { return .none }
        return .snapInstant
    }

    /// Rule 3 — the pill.
    func showJump(awaiting: Bool, distanceFromBottom: CGFloat) -> Bool {
        !awaiting && distanceFromBottom > pillThreshold
    }

    /// Entering a room always re-snaps (prevCount resets to zero).
    mutating func resetForRoomChange() {
        prevCount = 0
    }
}
