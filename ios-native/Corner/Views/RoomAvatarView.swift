// RoomAvatarView.swift — Corner native iOS
// corner:native-ios R5 — chat-header parity
//
// Mirrors web's RoomAvatar.jsx + cv6.css `.cv6-room-avatar-button`:
//   • Background: the room's stable tint (hash of room id, same algorithm as web)
//   • Initials: first 1-2 letters of the display title, uppercased
//   • Presence ring: lime green dot (--status-working) when `isActive = true` —
//     the same signal the web attaches when isActiveRoomStatus() returns true,
//     but driven here by ChatViewModel.isAwaiting so it tracks the live turn.
//
// Used in the chat header (size 34) and potentially the room rail (size 30).
// Read-only on native for now — the "edit room picture" tap lives on web.

import SwiftUI

struct RoomAvatarView: View {
    let room: Room
    var size: CGFloat = 34
    /// Green presence dot — set to `model.isAwaiting` in the chat header.
    var isActive: Bool = false

    private var initials: String {
        let words = room.title
            .trimmingCharacters(in: .whitespaces)
            .components(separatedBy: .whitespaces)
            .filter { !$0.isEmpty }
        if words.count >= 2 {
            let a = words[0].prefix(1).uppercased()
            let b = words[1].prefix(1).uppercased()
            return "\(a)\(b)"
        }
        return String(room.title.prefix(2)).uppercased()
    }

    private var tint: Color { Theme.tint(for: room.id) }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // Avatar circle
            Circle()
                .fill(tint.opacity(0.18))
                .frame(width: size, height: size)
                .overlay(
                    Text(initials)
                        .font(.system(size: size * 0.37, weight: .semibold, design: .rounded))
                        .foregroundStyle(tint)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                )
                .overlay(
                    Circle()
                        .strokeBorder(tint.opacity(0.30), lineWidth: 1)
                )

            // Presence dot — same lime as Theme.live (--status-working)
            if isActive {
                let dotSize = max(size * 0.28, 8)
                Circle()
                    .fill(Theme.live)
                    .frame(width: dotSize, height: dotSize)
                    .overlay(Circle().strokeBorder(Theme.ground, lineWidth: 1.5))
                    .offset(x: 2, y: 2)
            }
        }
        // Outer frame is consistent whether or not the dot is visible, so the
        // header doesn't shift when a turn starts.
        .frame(width: size, height: size)
    }
}
