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
    @discardableResult
    func send(text: String, room: Room, interactionMode: String, attachments: [Attachment]) async throws -> MessageRow?
    @discardableResult
    func send(text: String, room: Room, interactionMode: String, attachments: [Attachment], roomAgent: String?) async throws -> MessageRow?
    @discardableResult
    func send(text: String, room: Room, interactionMode: String, attachments: [Attachment], roomAgent: String?, clientMessageID: String) async throws -> MessageRow?
    func fetchSteps(room: Room, limit: Int) async throws -> [MessageStep]
    func fetchSteps(room: Room, roomAgent: String?, limit: Int) async throws -> [MessageStep]
    func roomHealth(room: Room, messageID: String, repair: Bool) async throws -> RoomHealth?
    func stopTurn(room: Room, messageID: String) async throws -> StopResult
    func turnStream(room: Room, messageID: String) -> AsyncStream<TurnStreamEvent>?
    func subscribeToRoom(_ room: Room, onInsert: @escaping @Sendable () -> Void) -> RoomSubscribing
}

extension MessageTransport {
    /// A send that carries staged files (R4 composer). Defaulted through the plain
    /// send so the fakes the failure tests run against keep compiling unchanged;
    /// CornerAPI overrides this with the real metadata.attachments write.
    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String, attachments: [Attachment]
    ) async throws -> MessageRow? {
        try await send(text: text, room: room, interactionMode: interactionMode)
    }

    /// R15 routing seam. Existing fakes and non-room callers keep the old behavior;
    /// CornerAPI overrides this to stamp the selected specialist on the user row.
    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        attachments: [Attachment], roomAgent: String?
    ) async throws -> MessageRow? {
        try await send(text: text, room: room, interactionMode: interactionMode, attachments: attachments)
    }

    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        attachments: [Attachment], roomAgent: String?, clientMessageID: String
    ) async throws -> MessageRow? {
        try await send(text: text, room: room, interactionMode: interactionMode, attachments: attachments, roomAgent: roomAgent)
    }

    func fetchSteps(room: Room, roomAgent: String?, limit: Int) async throws -> [MessageStep] {
        try await fetchSteps(room: room, limit: limit)
    }

    /// R18 N1 steward seam. Defaulted to "no verdict" so existing fakes keep
    /// compiling; CornerAPI overrides with the real room-health call, and the
    /// failure tests script verdicts through FakeTransport.
    func roomHealth(room: Room, messageID: String, repair: Bool) async throws -> RoomHealth? {
        nil
    }

    /// R18 N2 stop seam. Defaulted to feature-off — the honest answer for a
    /// transport that has no stop lane.
    func stopTurn(room: Room, messageID: String) async throws -> StopResult {
        StopResult(stopped: false, reason: "disabled", featureOff: true)
    }

    /// R18 N3 stream seam. nil = this transport has no live-reply lane; the
    /// engine behaves exactly as before streaming existed (steps drive status,
    /// the durable row is the reply). CornerAPI overrides with the real SSE read.
    func turnStream(room: Room, messageID: String) -> AsyncStream<TurnStreamEvent>? {
        nil
    }
}

extension CornerAPI: MessageTransport {
    func subscribeToRoom(_ room: Room, onInsert: @escaping @Sendable () -> Void) -> RoomSubscribing {
        subscribe(room: room, onInsert: onInsert)
    }
}
