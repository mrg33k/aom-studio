// ReadStateStore.swift — Corner native iOS
// corner:native-ios
//
// Per-room read-state: records when the user last looked at each room so the home
// timeline can show a real unread dot instead of hardcoding `false`.
//
// Design:
//   • A room is "unread" if its last_message_at (entry.ts from the rail) is NEWER
//     than the device's last-read timestamp for that room.
//   • markRead(roomID:ts:) is called by ChatView.onAppear and on every fresh
//     message batch — any time the user is actively looking at the room.
//   • lastRead(for:) is called by RoomRowCard to drive the dot.
//   • Persistence: UserDefaults key "readState" — a [String:Double] of
//     roomID → epoch-ms. No server round-trip; survives app restarts.
//   • The @Published `data` dict causes RoomRowCard to re-render whenever any room
//     is marked read, keeping the dots live as the user navigates between rooms.

import Foundation

@MainActor
final class ReadStateStore: ObservableObject {

    static let shared = ReadStateStore()

    private static let udKey = "readState"

    /// roomID → epoch-ms of the most recent moment the user viewed that room.
    @Published private var data: [String: Double] = [:]

    private init() {
        if let saved = UserDefaults.standard.dictionary(forKey: Self.udKey) as? [String: Double] {
            data = saved
        }
    }

    // MARK: - Public API

    /// Epoch-ms when the user last viewed this room, or 0 if never.
    func lastRead(for roomID: String) -> Double {
        data[roomID] ?? 0
    }

    /// Record that the user has seen this room up to (at least) `ts` epoch-ms.
    /// No-ops when `ts` is not newer than the already-recorded time, so calling
    /// this on every row update is safe.
    func markRead(roomID: String, ts: Double) {
        guard ts > (data[roomID] ?? 0) else { return }
        data[roomID] = ts
        UserDefaults.standard.set(data, forKey: Self.udKey)
    }
}
