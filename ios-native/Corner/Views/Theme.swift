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
// repaints at once. `Theme.ground` remains a flat semantic fill for small shapes;
// full-screen roots use `.groundBackground()` to paint the real CV6 glass field.

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

    /// Parse a six-digit CSS hex string ("#RRGGBB") into a Color.
    /// Returns nil when the string does not match that pattern.
    /// Only six-digit form is supported — the Avatar API always stores "#RRGGBB".
    init?(hexString: String) {
        var hex = hexString.trimmingCharacters(in: .whitespaces)
        guard hex.hasPrefix("#") else { return nil }
        hex.removeFirst()
        guard hex.count == 6 else { return nil }
        var value: UInt64 = 0
        let ok = Scanner(string: hex).scanHexInt64(&value)
        guard ok else { return nil }
        self.init(cv6: UInt32(value & 0xFFFFFF))
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
    static let tileRadius: CGFloat = 18
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
            .background {
                Theme.frostedSurface(
                    fallback: Theme.raised,
                    tint: Color(cv6: 0x161A21, opacity: 0.32),
                    in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                )
            }
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .strokeBorder(tint, lineWidth: 1)
            )
    }
}

// MARK: - Glass wallpaper and surfaces

/// CV6 glass `--ground`: steel, bronze, and ocean glows over a near-black
/// vertical gradient. Each screen paints the same frame-relative field because a
/// pushed NavigationStack destination cannot see through to the root wallpaper.
struct GlassWallpaper: View {
    var body: some View {
        GeometryReader { geometry in
            let radius = max(geometry.size.width, geometry.size.height)
            ZStack {
                LinearGradient(
                    stops: [
                        .init(color: Color(cv6: 0x0C1218), location: 0),
                        .init(color: Color(cv6: 0x080B10), location: 0.55),
                        .init(color: Color(cv6: 0x05080B), location: 1),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                RadialGradient(
                    colors: [Color(cv6: 0x4A7494, opacity: 0.48), .clear],
                    center: UnitPoint(x: 0.12, y: 0.03),
                    startRadius: 0,
                    endRadius: radius * 0.62
                )
                RadialGradient(
                    colors: [Color(cv6: 0xCE9446, opacity: 0.28), .clear],
                    center: UnitPoint(x: 0.96, y: 0.13),
                    startRadius: 0,
                    endRadius: radius * 0.52
                )
                RadialGradient(
                    colors: [Color(cv6: 0x2E6080, opacity: 0.42), .clear],
                    center: UnitPoint(x: 0.78, y: 0.96),
                    startRadius: 0,
                    endRadius: radius * 0.58
                )
            }
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }
}

struct GroundBackground: ViewModifier {
    @ObservedObject private var theme = ThemeManager.shared

    func body(content: Content) -> some View {
        content.background {
            if theme.kind == .glass {
                GlassWallpaper()
            } else {
                theme.palette.ground
            }
        }
    }
}

extension View {
    /// Full-screen background only. Small foreground/fill sites keep Theme.ground.
    func groundBackground() -> some View { modifier(GroundBackground()) }
}

extension Theme {
    /// Glass gets real blur plus a restrained CV6 tint; dark/light keep their
    /// explicit opaque palette. Material must never leak into those themes.
    @MainActor @ViewBuilder
    static func frostedSurface<S: Shape>(fallback: Color, tint: Color, in shape: S) -> some View {
        if ThemeManager.shared.kind == .glass {
            shape.fill(.ultraThinMaterial)
                .overlay(shape.fill(tint))
        } else {
            shape.fill(fallback)
        }
    }
}

// MARK: - AgentColors (Team Room)

/// Central mapping of agent → fixed distinct color.
/// Creative→teal, Web→green, Content→cyan, Design→pink, Operations→amber,
/// Systems→purple, Assistant→violet, Outreach→yellow, Social→emerald,
/// Strategy→blue, Research→indigo, Corner→neutral, User→accent blue.
@MainActor
enum AgentColors {
    static let creative  = Color(cv6: 0x2DD4BF)
    static let web       = Color(cv6: 0x4ADE80)
    static let content   = Color(cv6: 0x22D3EE)
    static let design    = Color(cv6: 0xF472B6)
    static let operations = Color(cv6: 0xFBBF24)
    static let systems   = Color(cv6: 0xA78BFA)
    static let assistant = Color(cv6: 0x8B5CF6)
    static let outreach  = Color(cv6: 0xFACC15)
    static let social    = Color(cv6: 0x34D399)
    static let strategy  = Color(cv6: 0x60A5FA)
    static let research  = Color(cv6: 0x818CF8)
    static let corner    = Color(cv6: 0xE5E7EB)
    static let user      = Color(cv6: 0x3B82F6)
    static let qa        = Color(cv6: 0xF97316)
    static let media     = Color(cv6: 0x38BDF8)

    static func color(forSlug slug: String) -> Color {
        let key = slug.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch key {
        case "director": return creative
        case "bobby":    return web
        case "cleo":     return content
        case "steffen":  return design
        case "gary":     return operations
        case "elon":     return systems
        case "rex":      return assistant
        case "jacob":    return outreach
        case "tony":     return social
        case "alex":     return strategy
        case "steve":    return research
        case "elmo":     return qa
        case "pixel":    return media
        case "corner", "studio": return corner
        case "user", "you": return user
        default:
            return color(forTitle: key) ?? Theme.tint(for: key)
        }
    }

    static func color(forTitle title: String) -> Color? {
        let key = title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch key {
        case "creative":  return creative
        case "web":       return web
        case "content":   return content
        case "design":    return design
        case "operations": return operations
        case "systems":   return systems
        case "assistant": return assistant
        case "outreach":  return outreach
        case "social":    return social
        case "strategy":  return strategy
        case "research", "advisory": return research
        case "qa":        return qa
        case "media":     return media
        case "corner":    return corner
        case "studio":    return corner
        case "user", "you": return user
        default: return nil
        }
    }

    static func color(forMention mention: String) -> Color {
        let raw = mention.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if let c = color(forTitle: raw) { return c }
        return color(forSlug: raw)
    }

    static let mentionAliases: Set<String> = [
        "creative", "director", "web", "bobby", "content", "cleo",
        "design", "steffen", "operations", "gary", "systems", "elon",
        "assistant", "rex", "outreach", "jacob", "social", "tony",
        "strategy", "alex", "research", "advisory", "steve", "qa", "elmo",
        "media", "pixel", "corner", "studio", "user", "you"
    ]
}
