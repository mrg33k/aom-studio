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

    /// roomID → epoch-ms of the last receipt actually sent to the server. In memory
    /// only: a fresh launch sending one receipt per room opened is the correct cost.
    private var lastRemote: [String: Double] = [:]

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

    /// Tell the SERVER the room has been read, so the badge clears on every surface
    /// instead of only on this phone.
    ///
    /// Silent by design. A read receipt is not worth an error in the user's face,
    /// and the device-local stamp above remains the offline fallback.
    func markReadRemote(roomID: String, at ts: Double) async {
        guard Config.useConvex, !roomID.isEmpty else { return }
        // At most one receipt per room per 30s. Read state is not a live feed, and a
        // write on every visit to a room the user is swiping through would cost more
        // database I/O than the messages themselves.
        if let last = lastRemote[roomID], ts - last < 30_000 { return }
        lastRemote[roomID] = ts
        try? await ConvexService.shared.mutation("reads:markRead", args: [
            "roomId": roomID,
            "userId": Self.userIdentity(),
            "lastReadAt": ts,
        ])
    }

    /// The same identity `messages:send` writes, so a read receipt and a message from
    /// this device belong to the same user server-side.
    private static func userIdentity() -> String {
        // Convex users are indexed by email; the id is the fallback.
        if let email = CornerAPI.shared.session?.user.email, !email.isEmpty { return email }
        if let uid = CornerAPI.shared.session?.user.id, !uid.isEmpty { return uid }
        let key = "convex.anonUserId"
        if let saved = UserDefaults.standard.string(forKey: key), !saved.isEmpty { return saved }
        let fresh = "anon-\(UUID().uuidString.prefix(8).lowercased())"
        UserDefaults.standard.set(fresh, forKey: key)
        return fresh
    }
}
