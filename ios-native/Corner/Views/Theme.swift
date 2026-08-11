// Theme.swift — Corner native iOS
// corner:native-ios R4 — the CV6 design system, ported for real, all three themes.
//
// These are the LIVE web dashboard's tokens (cv6next/cv6.css), not approximations:
// Corner is a blue-accent product on near-black ink grounds. The old bronze-gold
// set was AOM's editorial brand, which Corner deliberately is not. Every value here
// traces to a named CSS custom property; if it isn't in cv6.css it doesn't belong
// in this file.
//
// THEMING. The web keeps one shared theme setting (Dark / Light / Glass) applied at
// the app root; the phone mirrors it. `Theme`'s members kept their names — every
// call site still says `Theme.ink` — but resolve through ThemeManager's current
// palette, and the root view re-identifies itself on a change so the whole tree
// repaints at once. Glass's layered-radial wallpaper has no flat-Color equivalent;
// it ships as its deep blue base with the web's translucent surfaces over it —
// stated here so nobody mistakes the approximation for the finished wallpaper.

import SwiftUI

extension Color {
    /// A CV6 hex token, verbatim from cv6.css — so this file reads like the stylesheet.
    init(cv6 hex: UInt32, opacity: Double = 1) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}

// MARK: - The three palettes

enum ThemeKind: String, CaseIterable, Identifiable {
    case dark, light, glass
    var id: String { rawValue }

    var label: String {
        switch self {
        case .dark: return "Dark"
        case .light: return "Light"
        case .glass: return "Glass"
        }
    }
}

struct ThemePalette {
    let ground: Color
    let raised: Color          // --surface
    let raised2: Color         // --surface-2
    let hairline: Color        // --hair
    let divider: Color
    let chipFill: Color        // --chip
    let composer: Color        // --composer-solid
    let composerCard: Color    // --composer-card-solid
    let composerControl: Color // --composer-control-solid
    let ink: Color             // --fg
    let inkSoft: Color         // --muted
    let inkFaint: Color        // --faint
    let accent: Color
    let accentWeak: Color
    let warning: Color
    let danger: Color
    let success: Color

    /// cv6.css `[data-cv6]` base block — the default theme.
    static let dark = ThemePalette(
        ground: Color(cv6: 0x0A0A0B),
        raised: Color(cv6: 0x161619),
        raised2: Color(cv6: 0x1C1C21),
        hairline: Color.white.opacity(0.09),
        divider: Color.white.opacity(0.07),
        chipFill: Color.white.opacity(0.06),
        composer: Color(cv6: 0x131317),
        composerCard: Color(cv6: 0x202026),
        composerControl: Color(cv6: 0x292930),
        ink: Color(cv6: 0xE9E9EC),
        inkSoft: Color(cv6: 0x9A9AA2),
        inkFaint: Color(cv6: 0x62626B),
        accent: Color(cv6: 0x3B82F6),
        accentWeak: Color(cv6: 0x3B82F6, opacity: 0.16),
        warning: Color(cv6: 0xFBBF24),
        danger: Color(cv6: 0xF87171),
        success: Color(cv6: 0x34D399)
    )

    /// cv6.css `[data-app-theme="light"]`.
    static let light = ThemePalette(
        ground: Color(cv6: 0xF6F6F7),
        raised: Color(cv6: 0xFFFFFF),
        raised2: Color(cv6: 0xF0F0F2),
        hairline: Color.black.opacity(0.08),
        divider: Color.black.opacity(0.07),
        chipFill: Color.black.opacity(0.04),
        composer: Color(cv6: 0xFFFFFF),
        composerCard: Color(cv6: 0xF3F3F5),
        composerControl: Color(cv6: 0xE9E9ED),
        ink: Color(cv6: 0x18181B),
        inkSoft: Color(cv6: 0x6A6A72),
        inkFaint: Color(cv6: 0xA0A0A8),
        accent: Color(cv6: 0x0066FF),
        accentWeak: Color(cv6: 0x0066FF, opacity: 0.10),
        warning: Color(cv6: 0xB45309),
        danger: Color(cv6: 0xDC2626),
        success: Color(cv6: 0x10B981)
    )

    /// cv6.css `[data-app-theme="glass"]` — flat-base approximation (see header note).
    static let glass = ThemePalette(
        ground: Color(cv6: 0x0C1218),
        raised: Color(cv6: 0x161A21, opacity: 0.55),
        raised2: Color.white.opacity(0.08),
        hairline: Color.white.opacity(0.16),
        divider: Color.white.opacity(0.10),
        chipFill: Color.white.opacity(0.10),
        composer: Color(cv6: 0x111820),
        composerCard: Color(cv6: 0x1B242E),
        composerControl: Color(cv6: 0x273340),
        ink: Color(cv6: 0xF3F4F6),
        inkSoft: Color(cv6: 0xC0C4CC),
        inkFaint: Color(cv6: 0x828690),
        accent: Color(cv6: 0x5B9BFF),
        accentWeak: Color(cv6: 0x5B9BFF, opacity: 0.22),
        warning: Color(cv6: 0xFBBF24),
        danger: Color(cv6: 0xF87171),
        success: Color(cv6: 0x46E0A8)
    )
}

// MARK: - The manager

/// One shared theme setting, like the web's `localStorage['cv6-theme']` — same key
/// name on purpose, so the convention is recognizable across the two codebases.
/// Per-device, exactly as the web's is per-browser.
@MainActor
final class ThemeManager: ObservableObject {
    static let shared = ThemeManager()
    private static let storageKey = "cv6-theme"

    @Published var kind: ThemeKind {
        didSet { UserDefaults.standard.set(kind.rawValue, forKey: Self.storageKey) }
    }

    init() {
        kind = ThemeKind(rawValue: UserDefaults.standard.string(forKey: Self.storageKey) ?? "") ?? .dark
    }

    var palette: ThemePalette {
        switch kind {
        case .dark: return .dark
        case .light: return .light
        case .glass: return .glass
        }
    }

    var colorScheme: ColorScheme { kind == .light ? .light : .dark }
}

// MARK: - The tokens every view speaks

enum Theme {
    @MainActor static var current: ThemePalette { ThemeManager.shared.palette }

    // Ground
    @MainActor static var ground: Color { current.ground }
    @MainActor static var raised: Color { current.raised }
    @MainActor static var raised2: Color { current.raised2 }
    @MainActor static var hairline: Color { current.hairline }
    @MainActor static var divider: Color { current.divider }
    @MainActor static var chipFill: Color { current.chipFill }

    // Composer — its own three surfaces on the web, kept distinct on purpose
    @MainActor static var composer: Color { current.composer }
    @MainActor static var composerCard: Color { current.composerCard }
    @MainActor static var composerControl: Color { current.composerControl }

    // Ink — solid colors on the web, not opacities
    @MainActor static var ink: Color { current.ink }
    @MainActor static var inkSoft: Color { current.inkSoft }
    @MainActor static var inkFaint: Color { current.inkFaint }

    // Accent + signals
    @MainActor static var accent: Color { current.accent }
    @MainActor static var accentWeak: Color { current.accentWeak }
    @MainActor static var warning: Color { current.warning }
    @MainActor static var danger: Color { current.danger }
    @MainActor static var success: Color { current.success }
    /// --status-working: the lime "an agent is moving" signal (same in every theme).
    static let live = Color(cv6: 0xA3E635)

    // Bubbles — user rides the accent with white ink in every web theme.
    @MainActor static var userBubble: Color { current.accent }
    static let userBubbleInk = Color.white
    @MainActor static var agentBubble: Color { current.raised2 }

    // Raw palette — the web's *-400 row, theme-invariant.
    static let violet = Color(cv6: 0xA855F7)
    static let teal   = Color(cv6: 0x2DD4BF)
    static let pink   = Color(cv6: 0xF472B6)
    static let lime   = Color(cv6: 0xA3E635)
    static let amber  = Color(cv6: 0xFBBF24)
    static let violetWeak = Color(cv6: 0xA855F7, opacity: 0.18)
    static let tealWeak   = Color(cv6: 0x2DD4BF, opacity: 0.16)

    /// The six category tints, in the web's `tintFor` order, and the same stable-hash
    /// pick — so a room's left-edge colour matches between the phone and the web.
    @MainActor static var tintPalette: [Color] { [violet, accent, pink, teal, lime, amber] }
    @MainActor static func tint(for seed: String) -> Color {
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
