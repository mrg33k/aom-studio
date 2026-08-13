// TurnActivityService.swift — Corner native iOS
// corner:native-ios R18 smoothness pass, round N7
//
// The app side of the Live Activity: start on a fresh turn, mirror the one
// status vocabulary + the projected work label while the app is alive, end on
// settle with the final word. LOCAL updates only in v1 — no push-token lane
// (that is server work for a later round); when the app suspends the activity
// simply stops updating, and the counting clock keeps counting because it is
// a timer interval the SYSTEM renders, not an update we send.
//
// One activity at a time, ever: a lock screen with three stale turn banners is
// worse than none.

import Foundation

#if canImport(ActivityKit)
import ActivityKit
#endif

@MainActor
final class TurnActivityService {

    static let shared = TurnActivityService()

    /// Dead under XCTest: unit tests exercising ChatViewModel must never leave
    /// fixture activities on the simulator's lock screen.
    private var underTest: Bool { NSClassFromString("XCTestCase") != nil }

    #if canImport(ActivityKit)
    private var activity: Activity<TurnActivityAttributes>?
    #endif

    func turnBegan(roomTitle: String, ask: String?) {
        #if canImport(ActivityKit)
        guard !underTest, ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        endNow()
        let clippedAsk = (ask ?? "").count > 120 ? String((ask ?? "").prefix(117)) + "…" : (ask ?? "")
        let attributes = TurnActivityAttributes(roomTitle: roomTitle, ask: clippedAsk)
        let state = TurnActivityAttributes.ContentState(
            statusWord: "Thinking", stepLabel: "", startedAt: Date(), done: false
        )
        activity = try? Activity.request(
            attributes: attributes,
            content: .init(state: state, staleDate: nil)
        )
        #endif
    }

    func update(statusWord: String, stepLabel: String, startedAt: Date?) {
        #if canImport(ActivityKit)
        guard !underTest, let activity else { return }
        let state = TurnActivityAttributes.ContentState(
            statusWord: statusWord,
            stepLabel: stepLabel,
            startedAt: startedAt ?? Date(),
            done: false
        )
        Task { await activity.update(.init(state: state, staleDate: nil)) }
        #endif
    }

    /// The turn is over: freeze the frame with the final word, keep it readable
    /// for a beat, then let the system clear it.
    func turnEnded(outcomeWord: String, startedAt: Date?) {
        #if canImport(ActivityKit)
        guard !underTest, let activity else { return }
        let state = TurnActivityAttributes.ContentState(
            statusWord: outcomeWord,
            stepLabel: "",
            startedAt: startedAt ?? Date(),
            done: true
        )
        self.activity = nil
        Task {
            await activity.end(.init(state: state, staleDate: nil), dismissalPolicy: .after(.now + 20))
        }
        #endif
    }

    private func endNow() {
        #if canImport(ActivityKit)
        guard let activity else { return }
        self.activity = nil
        Task { await activity.end(nil, dismissalPolicy: .immediate) }
        #endif
    }
}
