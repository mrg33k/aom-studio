// Theme.swift — Corner native iOS
// corner:native-ios R4 — the CV6 design system, ported for real.
//
// These are the LIVE web dashboard's tokens (cv6next/cv6.css, dark theme — the
// default), not approximations: Corner is a blue-accent product on near-black
// ink grounds. The old bronze-gold set was AOM's editorial brand, which Corner
// deliberately is not. Every value here traces to a named CSS custom property;
// if it isn't in cv6.css it doesn't belong in this file.

import SwiftUI

extension Color {
    /// A CV6 hex token, verbatim from cv6.css — so the file reads like the stylesheet.
    init(cv6 hex: UInt32, opacity: Double = 1) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}

enum Theme {
    // Ground — --ground / --surface / --surface-2
    static let ground = Color(cv6: 0x0A0A0B)
    static let raised = Color(cv6: 0x161619)
    static let raised2 = Color(cv6: 0x1C1C21)
    static let hairline = Color.white.opacity(0.09)   // --hair
    static let divider = Color.white.opacity(0.07)    // --divider
    static let chipFill = Color.white.opacity(0.06)   // --chip

    // Composer — its own three surfaces on the web, kept distinct on purpose
    static let composer = Color(cv6: 0x131317)        // --composer-solid
    static let composerCard = Color(cv6: 0x202026)    // --composer-card-solid
    static let composerControl = Color(cv6: 0x292930) // --composer-control-solid

    // Ink — --fg / --muted / --faint (solid colors on the web, not opacities)
    static let ink = Color(cv6: 0xE9E9EC)
    static let inkSoft = Color(cv6: 0x9A9AA2)
    static let inkFaint = Color(cv6: 0x62626B)

    // Accent + signals — Corner blue, --warn, --error, --success
    static let accent = Color(cv6: 0x3B82F6)
    static let accentWeak = Color(cv6: 0x3B82F6, opacity: 0.16)
    static let warning = Color(cv6: 0xFBBF24)
    static let danger = Color(cv6: 0xF87171)
    static let success = Color(cv6: 0x34D399)
    /// --status-working: the lime "an agent is moving" signal.
    static let live = Color(cv6: 0xA3E635)

    // Bubbles — user rides the accent with white ink; agent sits on surface-2
    // with a hairline, exactly the web's .cv6-mob-bubble pair.
    static let userBubble = accent
    static let userBubbleInk = Color.white
    static let agentBubble = raised2

    // Raw palette — the web's *-400 row, for category tints and chips.
    static let violet = Color(cv6: 0xA855F7)
    static let teal   = Color(cv6: 0x2DD4BF)
    static let pink   = Color(cv6: 0xF472B6)
    static let lime   = Color(cv6: 0xA3E635)
    static let amber  = Color(cv6: 0xFBBF24)
    static let violetWeak = Color(cv6: 0xA855F7, opacity: 0.18)
    static let tealWeak   = Color(cv6: 0x2DD4BF, opacity: 0.16)

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

    // Radii — --radius-card 16 / --radius-button 13 / --radius-control 11 / the
    // mobile input shell's 8. Bubbles carry the web's 18 with a 4pt tail corner.
    static let bubbleRadius: CGFloat = 18
    static let bubbleTail: CGFloat = 4
    static let cardRadius: CGFloat = 16
    static let buttonRadius: CGFloat = 13
    static let controlRadius: CGFloat = 11
    static let shellRadius: CGFloat = 8
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
