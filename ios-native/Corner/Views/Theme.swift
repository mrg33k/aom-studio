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
    static let accentWeak = Color(red: 0.867, green: 0.686, blue: 0.376).opacity(0.16)
    static let userBubble = Color(red: 0.180, green: 0.204, blue: 0.243)
    static let agentBubble = Color(red: 0.106, green: 0.114, blue: 0.129)
    static let warning = Color(red: 0.945, green: 0.706, blue: 0.353)
    static let danger = Color(red: 0.906, green: 0.400, blue: 0.365)
    /// The "active" status dot / hero dot — a live green, matching the web's lime signal.
    static let live = Color(red: 0.353, green: 0.859, blue: 0.451)

    // Room-row contract §1 — type-chip + category tones. Tokens, never literals in a view.
    //   PROJECT → --violet-400 (#8b7cf6) on rgba(139,124,246,.18)
    //   MISSION → --teal-400  (#2dd4bf) on rgba(45,212,191,.16)
    //   AGENT   → --accent               on --accent-weak
    static let violet = Color(red: 0.545, green: 0.486, blue: 0.965)
    static let teal   = Color(red: 0.176, green: 0.831, blue: 0.749)
    static let pink   = Color(red: 0.957, green: 0.447, blue: 0.714)
    static let lime   = Color(red: 0.639, green: 0.902, blue: 0.208)
    static let amber  = Color(red: 0.961, green: 0.620, blue: 0.043)
    static let violetWeak = Color(red: 0.545, green: 0.486, blue: 0.965).opacity(0.18)
    static let tealWeak   = Color(red: 0.176, green: 0.831, blue: 0.749).opacity(0.16)

    /// The six category tints, in the web's `tintFor` order, and the same stable-hash
    /// pick — so a room's left-edge colour matches between the phone and the web.
    static let tintPalette: [Color] = [violet, accent, pink, teal, lime, amber]
    static func tint(for seed: String) -> Color {
        var h: UInt32 = 0
        for scalar in seed.unicodeScalars { h = h &* 31 &+ scalar.value }
        return tintPalette[Int(h % UInt32(tintPalette.count))]
    }

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
