// MessageTransport.swift — Corner native iOS
// corner:native-ios Stage 1
//
// The seam between the thread's behavior and the network.
//
// This exists so the three things Stage 1 promises — a failed send stays retryable, a
// dead turn looks dead, a backgrounded app catches up without a gap — can be PROVEN by
// running them against a fake, instead of asserted because the code reads as if it
// works. A state machine that only ever runs against production is a state machine
// nobody has seen fail on purpose.
//
// CornerAPI is the only production implementation, and the protocol is shaped exactly
// like the methods it already had, so this adds a seam without adding a layer.

import Foundation

/// A live room subscription, from the thread's point of view: something you stop.
protocol RoomSubscribing: AnyObject {
    func stop()
}

extension CornerAPI.RoomSubscription: RoomSubscribing {}

@MainActor
protocol MessageTransport: AnyObject {
    func fetchMessages(room: Room, limit: Int) async throws -> [MessageRow]
    @discardableResult
    func send(text: String, room: Room, interactionMode: String) async throws -> MessageRow?
    func fetchSteps(room: Room, limit: Int) async throws -> [MessageStep]
    func subscribeToRoom(_ room: Room, onInsert: @escaping @Sendable () -> Void) -> RoomSubscribing
}

extension CornerAPI: MessageTransport {
    func subscribeToRoom(_ room: Room, onInsert: @escaping @Sendable () -> Void) -> RoomSubscribing {
        subscribe(room: room, onInsert: onInsert)
    }
}
