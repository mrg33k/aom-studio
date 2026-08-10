// Theme.swift — Corner native iOS
// corner:native-ios Stage 1
//
// A small, deliberate token set. Corner is an ink-ground product: obsidian ground,
// ivory type, one warm accent. These are tokens rather than literals scattered through
// the views so the phone product can be re-tuned in one place when CV6's design system
// is properly ported (Stage 2) — and so nothing here quietly invents a fourth grey.

import SwiftUI

enum Theme {
    // Ground
    static let ground = Color(red: 0.043, green: 0.047, blue: 0.055)
    static let raised = Color(red: 0.086, green: 0.094, blue: 0.106)
    static let hairline = Color.white.opacity(0.08)

    // Ink
    static let ink = Color(red: 0.945, green: 0.941, blue: 0.925)
    static let inkSoft = Color(red: 0.945, green: 0.941, blue: 0.925).opacity(0.62)
    static let inkFaint = Color(red: 0.945, green: 0.941, blue: 0.925).opacity(0.38)

    // Accent + signals
    static let accent = Color(red: 0.867, green: 0.686, blue: 0.376)
    static let userBubble = Color(red: 0.180, green: 0.204, blue: 0.243)
    static let agentBubble = Color(red: 0.106, green: 0.114, blue: 0.129)
    static let warning = Color(red: 0.945, green: 0.706, blue: 0.353)
    static let danger = Color(red: 0.906, green: 0.400, blue: 0.365)

    // Rhythm — one 4pt scale, nothing off it.
    static let s1: CGFloat = 4
    static let s2: CGFloat = 8
    static let s3: CGFloat = 12
    static let s4: CGFloat = 16
    static let s5: CGFloat = 24
    static let s6: CGFloat = 32

    static let bubbleRadius: CGFloat = 18
    static let cardRadius: CGFloat = 14
}

/// A card that carries the ground's raised surface plus a hairline. Used by link
/// cards, block fallbacks, and the stalled-turn notice so all three read as one family.
struct RaisedCard<Content: View>: View {
    var tint: Color = Theme.hairline
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(Theme.s3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .strokeBorder(tint, lineWidth: 1)
            )
    }
}
