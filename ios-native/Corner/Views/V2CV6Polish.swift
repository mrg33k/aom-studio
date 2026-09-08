// V2CV6Polish.swift — Corner native iOS
// corner:corner-v2 R42 — the phone thread wears the CV6 design, not iOS defaults.
//
// Four pieces, one file: the thread's fixed type/space numbers (P092), the
// project-tinted ambient glow behind the composer and loader (P093), the
// living Corner-mark loader (P089), and the CV6 popover command card (P090).

import SwiftUI

// MARK: - P092 thread numbers (the design at 390, fixed)

// The phone thread's type and space, measured at 390 against
// `R17-native-thread-design.png`: agent name 12.5 semibold ink + time 11
// muted on one line, body 15/22 ink, 16pt gutters, 14pt between rows; the
// user bubble is accent, 16pt radius, 15/22 white, capped at 74 % of the
// thread width, its time 11 muted right-aligned under it. One enum so the view,
// the unit tests, and the gate's anchors share the same numbers — a drift
// fails instead of drifting.
enum V2ThreadType {
    static let gutter: CGFloat = 16
    static let rowSpacing: CGFloat = 14
    static let agentName: CGFloat = 12.5
    static let time: CGFloat = 11
    static let body: CGFloat = 15
    static let bodyLineHeight: CGFloat = 22
    /// Extra leading that lands the 15pt body on its 22pt design rhythm.
    static let bodyLineSpacing: CGFloat = 4
    static let bubbleRadius: CGFloat = 16
    /// The tail corner stays tighter, like the web's bubble language.
    static let bubbleTail: CGFloat = 6
    static let bubbleMaxFraction: CGFloat = 0.74

    /// The user bubble's cap for a measured column width (74 % of it).
    static func bubbleMaxWidth(columnWidth: CGFloat) -> CGFloat {
        columnWidth * bubbleMaxFraction
    }
}

// MARK: - P093 project tint (whose glow)

// The glow wears the project's avatar colour — the same tint the drawer
// uses for that project's mark — and General wears the app accent.
enum V2ProjectGlow {
    enum Tint: Equatable {
        case appAccent
        case hex(String)
    }

    static func tint(for project: ProjectSummary) -> Tint {
        if project.kind == .general { return .appAccent }
        let hex = project.tintHex.trimmingCharacters(in: .whitespacesAndNewlines)
        guard hex.hasPrefix("#"), hex.count == 7, Color(hexString: hex) != nil else {
            return .appAccent
        }
        return .hex(hex)
    }
}

extension V2ProjectGlow.Tint {
    @MainActor var color: Color {
        switch self {
        case .appAccent: return Theme.accent
        case .hex(let hex): return Color(hexString: hex) ?? Theme.accent
        }
    }
}

// MARK: - P093 ambient glow (the CV4 soundwave feel, not the code)

// Two soft tinted ellipses drifting against each other on a slow loop, the
// way the old GlassBackdrop's glows breathed — blurred gradient, never
// particles. Static under Reduce Motion and under the frozen tour (gate
// pixels must be deterministic); a touch brighter while `boost` holds (the
// second after a reply arrives).
struct V2AmbientGlow: View {
    let tint: Color
    var boost: Bool = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drift = false

    /// The drift loop's period: slow, 8–12 s.
    static let driftSeconds: Double = 10

    var body: some View {
        let frozen = reduceMotion || Config.screenTour
        ZStack {
            Ellipse()
                .fill(tint.opacity(boost ? 0.30 : 0.15))
                .frame(width: 220, height: 90)
                .offset(x: drift && !frozen ? 26 : -26, y: 8)
                .blur(radius: 30)
            Ellipse()
                .fill(tint.opacity(boost ? 0.22 : 0.12))
                .frame(width: 170, height: 70)
                .offset(x: drift && !frozen ? -30 : 24, y: -6)
                .blur(radius: 26)
        }
        .hueRotation(.degrees(drift && !frozen ? 10 : -10))
        .animation(.easeInOut(duration: Self.driftSeconds).repeatForever(autoreverses: true), value: drift)
        .animation(.easeOut(duration: 0.6), value: boost)
        .onAppear {
            guard !frozen else { return }
            drift = true
        }
    }
}

/// The band behind the composer pill: ~140pt tall, fading to the ground
/// upward, strictly the pill's own footprint (clipped) so the pill/send
/// gap stays flat ground (P039's lock) and text stays legible.
struct V2ComposerGlow: View {
    let tint: Color
    var boost: Bool = false

    var body: some View {
        ZStack(alignment: .bottom) {
            LinearGradient(
                stops: [
                    .init(color: tint.opacity(boost ? 0.20 : 0.14), location: 0.35),
                    .init(color: .clear, location: 1.0),
                ],
                startPoint: .bottom, endPoint: .top
            )
            V2AmbientGlow(tint: tint, boost: boost)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 140)
        // The blobs fade to nothing before the clip: a blur cut by the
        // frame edge would read as a hard card edge over the thread.
        .mask(alignment: .bottom) {
            LinearGradient(
                stops: [
                    .init(color: .white, location: 0.0),
                    .init(color: .white, location: 0.55),
                    .init(color: .clear, location: 1.0),
                ],
                startPoint: .bottom, endPoint: .top
            )
        }
        .clipped()
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("v2-composer-glow")
        .accessibilityLabel("Conversation glow")
    }
}

// MARK: - P089 the living Corner mark (cold start + project switches)

// The Corner logo animating in — the mark fades up over ~600 ms while the
// same breathing tint washes the ground behind it. No text, no spinner, no
// card. Never a fake wait: this branch shows until the load lands, however
// fast that is. Reduce Motion (and the frozen tour) get the static mark.
struct V2LoadingMark: View {
    let tint: Color

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var entered = false

    /// The entrance: mark draws/fades over ~600 ms, then settles.
    static let enterSeconds: Double = 0.6

    var body: some View {
        let frozen = reduceMotion || Config.screenTour
        ZStack {
            V2AmbientGlow(tint: tint)
            Image("CornerLogo")
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .frame(height: 40)
                .foregroundStyle(Theme.ink)
                .opacity(frozen ? 1 : (entered ? 1 : 0))
                .scaleEffect(frozen ? 1 : (entered ? 1 : 0.92))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            guard !frozen else { return }
            withAnimation(.easeOut(duration: Self.enterSeconds)) { entered = true }
        }
        .accessibilityIdentifier("v2-loading-mark")
        .accessibilityLabel("Loading")
    }
}

/// The chip's frame, handed to the card overlay so the card anchors above
/// the chip that raised it.
struct V2CommandsAnchorKey: PreferenceKey {
    static var defaultValue: [Anchor<CGRect>] = []
    static func reduce(value: inout [Anchor<CGRect>], nextValue: () -> [Anchor<CGRect>]) {
        value.append(contentsOf: nextValue())
    }
}

// MARK: - P090 the CV6 command card (not the system Menu)

// The desktop commands menu's rhythm at phone width (~260pt): solid raised2
// card, hairline, 12pt radius, 44pt rows, 14.5 medium ink labels, 18pt icons
// in inkSoft, thin dividers between the groups, "Model — Auto" with a
// chevron and the model sub-line under it, Plan/Work as check rows. No blur,
// no scrim; the host dismisses it on an outside tap. The SECTIONS below are
// pure (unit-pinned); the view renders them from the shared menu state, so
// the card and the legacy Menu can never disagree about what is on it.
struct V2CommandsCardData: Equatable {
    var chatMode: String
    var modelChoice: String
    var modelSub: String
    var hasSpecialist: Bool
    var specialistTitle: String
    var specialistCount: Int
    var talkEnabled: Bool
    var canReadChecklist: Bool
}

enum V2CommandsCardRow: Equatable {
    case work, plan, model, specialist, files, image, talk, readChecklist
}

enum V2CommandsCardSections {
    /// The card's groups, in order — the desktop menu's rhythm. The caption
    /// under the mode toggle is the web's copy, verbatim.
    static func sections(_ data: V2CommandsCardData) -> [[V2CommandsCardRow]] {
        var out: [[V2CommandsCardRow]] = [[.work, .plan]]
        var second: [V2CommandsCardRow] = [.model]
        if data.hasSpecialist { second.append(.specialist) }
        out.append(second)
        out.append([.files, .image])
        out.append([.talk, .readChecklist])
        return out
    }

    static func modeCaption(chatMode: String) -> String {
        chatMode == "plan"
            ? "Corner will propose a plan first"
            : "Corner gets to work directly"
    }
}

private enum V2CommandsPick {
    case model, specialist
}

/// The card itself. Model/specialist picks open inside the card (check rows
/// + Back to commands); everything else acts through the callbacks and the
/// host dismisses the card.
struct V2CommandsCard: View {
    let data: V2CommandsCardData
    let modelOptions: [(id: String, label: String)]
    let specialistRoster: [(slug: String, title: String)]
    let specialistChoice: String
    let onMode: (String) -> Void
    let onModel: (String) -> Void
    let onSpecialist: (String) -> Void
    let onFiles: () -> Void
    let onImage: () -> Void
    let onTalkToggle: () -> Void
    let onReadChecklist: () -> Void
    let onActed: () -> Void

    @State private var picking: V2CommandsPick?

    /// Phone width per the brief; the host clamps it into the screen.
    static let width: CGFloat = 260

    var body: some View {
        VStack(spacing: 0) {
            if let picking {
                pickerBackRow(picking)
                pickerRows(picking)
            } else {
                let groups = V2CommandsCardSections.sections(data)
                ForEach(Array(groups.enumerated()), id: \.offset) { index, rows in
                    if index > 0 {
                        Rectangle()
                            .fill(Theme.divider)
                            .frame(height: 0.5)
                            .padding(.horizontal, 12)
                    }
                    ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                        cardRow(row)
                    }
                    if index == 0 {
                        Text(V2CommandsCardSections.modeCaption(chatMode: data.chatMode))
                            .font(.hanken(12))
                            .foregroundStyle(Theme.inkSoft)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 12)
                            .padding(.bottom, 8)
                    }
                }
            }
        }
        .padding(.vertical, 6)
        .frame(width: Self.width)
        .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.35), radius: 16, y: 8)
    }

    // MARK: rows

    @ViewBuilder
    private func cardRow(_ row: V2CommandsCardRow) -> some View {
        switch row {
        case .work:
            checkRow(title: "Work", icon: "hammer", checked: data.chatMode == "work") {
                onMode("work"); onActed()
            }
        case .plan:
            checkRow(title: "Plan", icon: "list.bullet.rectangle", checked: data.chatMode == "plan") {
                onMode("plan"); onActed()
            }
        case .model:
            navRow(title: "Model — \(shortModel(data.modelChoice))", sub: data.modelSub, icon: "cpu") {
                picking = .model
            }
        case .specialist:
            navRow(
                title: "Specialist — \(data.specialistTitle)",
                sub: "\(data.specialistCount) available",
                icon: "person.crop.circle"
            ) {
                picking = .specialist
            }
        case .files:
            plainRow(title: "Files in this conversation", icon: "folder") {
                onFiles(); onActed()
            }
        case .image:
            plainRow(title: "Generate an image", icon: "photo.badge.plus") {
                onImage(); onActed()
            }
        case .talk:
            checkRow(title: "Talk aloud", icon: "speaker.wave.2", checked: data.talkEnabled) {
                onTalkToggle()
            }
        case .readChecklist:
            plainRow(title: "Read checklist aloud", icon: "list.bullet") {
                onReadChecklist(); onActed()
            }
            .disabled(!data.canReadChecklist)
        }
    }

    private func shortModel(_ id: String) -> String {
        ChatView.shortModelLabel(id)
    }

    private func rowShell<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
    }

    private func rowIcon(_ name: String) -> some View {
        Image(systemName: name)
            .font(.system(size: 18, weight: .regular))
            .foregroundStyle(Theme.inkSoft)
            .frame(width: 22)
            .accessibilityHidden(true)
    }

    private func rowTitle(_ title: String, sub: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title)
                .font(.hanken(14.5).weight(.medium))
                .foregroundStyle(Theme.ink)
            if let sub {
                Text(sub)
                    .font(.hanken(12))
                    .foregroundStyle(Theme.inkSoft)
            }
        }
    }

    private func checkRow(title: String, icon: String, checked: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            rowShell {
                HStack(spacing: 12) {
                    rowIcon(icon)
                    rowTitle(title)
                    Spacer(minLength: 0)
                    if checked {
                        Image(systemName: "checkmark")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.accent)
                            .accessibilityHidden(true)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityValue(checked ? "selected" : "not selected")
    }

    private func navRow(title: String, sub: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            rowShell {
                HStack(spacing: 12) {
                    rowIcon(icon)
                    rowTitle(title, sub: sub)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.inkFaint)
                        .accessibilityHidden(true)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func plainRow(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            rowShell {
                HStack(spacing: 12) {
                    rowIcon(icon)
                    rowTitle(title)
                    Spacer(minLength: 0)
                }
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: pickers

    private func pickerBackRow(_ pick: V2CommandsPick) -> some View {
        Button { picking = nil } label: {
            rowShell {
                HStack(spacing: 12) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(width: 22)
                        .accessibilityHidden(true)
                    Text(pick == .model ? "Model" : "Specialist")
                        .font(.hanken(14.5).weight(.medium))
                        .foregroundStyle(Theme.ink)
                    Spacer(minLength: 0)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Back to commands")
    }

    @ViewBuilder
    private func pickerRows(_ pick: V2CommandsPick) -> some View {
        if pick == .model {
            ForEach(modelOptions, id: \.id) { option in
                checkRow(title: option.label, icon: "cpu", checked: option.id == data.modelChoice) {
                    onModel(option.id); onActed()
                }
            }
        } else {
            checkRow(
                title: "Thread default", icon: "person.crop.circle",
                checked: specialistChoice == "default"
            ) {
                onSpecialist("default"); onActed()
            }
            ForEach(specialistRoster, id: \.slug) { row in
                checkRow(title: row.title, icon: "person.crop.circle", checked: row.slug == specialistChoice) {
                    onSpecialist(row.slug); onActed()
                }
            }
        }
    }
}
