// V2FollowState.swift — Corner native iOS
// corner:corner-v2 R40 (L030/L032, the web's R41 root cause).
//
// Follow-by-identity for the v2 thread: every arrival is keyed on the
// newest row's id (and the first id), never on the row count. The web's
// follow effect was keyed on count and starved the moment the read became
// a sliding 200-row window — every arrival slid the window at a constant
// length and nothing scrolled. With `limit: 200` the phone waits in the
// same trap, so this state is the only thing that may move the v2 scroll.
//
// All decisions, no side effects: the view reports arrivals and performs
// whatever action comes back, after layout (see ChatView.v2ThreadList).

import Foundation

/// Identity-keyed follow state for one thread visit.
struct V2FollowState: Equatable {
    enum Action: Equatable {
        case none
        /// First paint only: land at the bottom instantly.
        case snapInstant
        /// A new newest row while following: glide to it.
        case followSmooth
    }

    /// The newest row id of the last arrival, if any.
    private(set) var newestID: String?
    /// The first row id of the last arrival, if any.
    private(set) var firstID: String?
    /// A send pins the view to the bottom until the user scrolls up.
    private(set) var pinnedBySend = false
    /// Newest rows that arrived while the user was reading elsewhere.
    private(set) var unseenCount = 0

    /// The "new messages" pill shows while arrivals wait unread.
    var showsNewMessages: Bool { unseenCount > 0 }

    /// A new thread visit: nothing is known, nothing is pinned.
    mutating func noteOpened() {
        newestID = nil
        firstID = nil
        pinnedBySend = false
        unseenCount = 0
    }

    /// A send pins to the bottom (a send always lands there) and clears
    /// any waiting pill — the user just wrote, they are at the tail.
    mutating func noteSend() {
        pinnedBySend = true
        unseenCount = 0
    }

    /// The user deliberately left the tail: the send pin releases, so the
    /// next arrival raises the pill instead of yanking the scroll.
    mutating func noteUserScrolledUp() {
        pinnedBySend = false
    }

    /// One arrival batch. `nearBottom` is the view's measured distance
    /// (the 200pt tail band, the legacy brain's twin). Identity only:
    /// a constant count with a new newest id still follows, and a changed
    /// count with the same newest id (an earlier page prepending, an echo
    /// leaving, a reorder) never moves.
    mutating func arrivals(newestID: String?, firstID: String?, nearBottom: Bool) -> Action {
        defer {
            self.newestID = newestID
            self.firstID = firstID
        }
        guard let newestID else { return .none }
        guard let prev = self.newestID else {
            // First paint: land at the bottom.
            return .snapInstant
        }
        guard newestID != prev else { return .none }
        if nearBottom || pinnedBySend {
            unseenCount = 0
            return .followSmooth
        }
        unseenCount += 1
        return .none
    }

    /// The pill was tapped: the view re-pins, the wait clears.
    mutating func notePillTapped() {
        unseenCount = 0
    }
}
