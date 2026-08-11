// FakeTransport.swift — Corner native iOS tests
// corner:native-ios Stage 1
//
// A scriptable stand-in for the Corner API so the thread's state machine can be run
// against failures on purpose: a send that refuses, a turn that goes silent, a
// backgrounded app that missed more than a window of messages.

import Foundation
@testable import Corner

final class FakeSubscription: RoomSubscribing {
    private(set) var stopped = false
    func stop() { stopped = true }
}

@MainActor
final class FakeTransport: MessageTransport {

    /// Rows the history endpoint returns, oldest first. Tests mutate this to simulate
    /// the server moving on.
    var rows: [MessageRow] = []
    /// A larger window, returned when the caller asks for more than 100 — the gap path.
    var wideRows: [MessageRow]?
    var steps: [MessageStep] = []

    var sendError: Error?
    /// Consumed by the next fetch only — models a transient reconcile failure.
    var failNextFetch: Error?
    /// What POST returns. nil models an older API deploy that answers without the row.
    var sendReturnsRow = true
    /// Appends the sent row to `rows` automatically, like the real server does.
    var sendLandsInThread = true

    private(set) var sentTexts: [String] = []
    private(set) var clientMessageIDs: [String] = []
    private(set) var fetchLimits: [Int] = []
    private(set) var stepLimits: [Int] = []
    private(set) var subscriptions: [FakeSubscription] = []

    func fetchMessages(room: Room, limit: Int) async throws -> [MessageRow] {
        fetchLimits.append(limit)
        if let error = failNextFetch {
            failNextFetch = nil
            throw error
        }
        if limit > 100, let wideRows { return wideRows }
        return rows
    }

    func fetchLimitsReset() { fetchLimits.removeAll() }

    @discardableResult
    func send(text: String, room: Room, interactionMode: String) async throws -> MessageRow? {
        if let sendError { throw sendError }
        sentTexts.append(text)
        let row = MessageRow.fake(id: "server-\(sentTexts.count)", role: "user", text: text, epoch: Date().timeIntervalSince1970)
        if sendLandsInThread { rows.append(row) }
        return sendReturnsRow ? row : nil
    }

    @discardableResult
    func send(
        text: String, room: Room, interactionMode: String,
        attachments: [Attachment], roomAgent: String?, clientMessageID: String
    ) async throws -> MessageRow? {
        clientMessageIDs.append(clientMessageID)
        return try await send(text: text, room: room, interactionMode: interactionMode)
    }

    func fetchSteps(room: Room, limit: Int) async throws -> [MessageStep] {
        stepLimits.append(limit)
        return steps
    }

    func subscribeToRoom(_ room: Room, onInsert: @escaping @Sendable () -> Void) -> RoomSubscribing {
        let sub = FakeSubscription()
        subscriptions.append(sub)
        return sub
    }
}

// MARK: - Row + step builders

extension MessageRow {
    /// MessageRow has only a decoding initializer (it mirrors a database row), so the
    /// fixtures go through the real decoder — which means every fixture also exercises
    /// the tolerant decode path.
    static func fake(
        id: String,
        role: String,
        text: String,
        epoch: TimeInterval,
        agent: String? = nil
    ) -> MessageRow {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var dict: [String: Any] = [
            "id": id,
            "role": role,
            "text": text,
            "timestamp": iso.string(from: Date(timeIntervalSince1970: epoch)),
        ]
        if let agent { dict["agent"] = agent }
        let data = try! JSONSerialization.data(withJSONObject: dict)
        return try! JSONDecoder().decode(MessageRow.self, from: data)
    }
}

extension MessageStep {
    static func fake(id: String, parent: String, index: Int, text: String) -> MessageStep {
        let data = try! JSONSerialization.data(withJSONObject: [
            "id": id,
            "parent_message_id": parent,
            "step_index": index,
            "text": text,
        ])
        return try! JSONDecoder().decode(MessageStep.self, from: data)
    }
}
