// RoomListView.swift — Corner native iOS
// corner:native-ios — the home timeline, built to the room-row contract
// (corner/missions/bridge/research/room-row-contract.md).
//
// ONE recency-sorted list, strict descending by newest message ts, no grouping. Each row
// carries the contract's eight parts in order: category edge, monogram avatar, title,
// required type chip, hygiene-cleaned preview, relative timestamp, unread dot, and the
// single active hero on row 1. The old flat Tools/Agents directory is gone; ordering is
// derived from live `/api/dashboard/room-activity`, never a static roster.
//
// Agents render as TITLES, never persona names (agentTitles.js doctrine, 2026-06-23) —
// "Assistant", not "Rex" — carried through by AgentRoster + Room.title.

import SwiftUI

struct RoomListView: View {
    @EnvironmentObject private var api: CornerAPI
    @EnvironmentObject private var router: AppRouter
    @StateObject private var store = RoomStore()

    @StateObject private var review = ReviewStore.shared

    @State private var query = ""
    @State private var showAccount = false

    var body: some View {
        List {
            if api.world == nil {
                noWorldNotice
            } else if query.isEmpty {
                if review.waitingCount > 0 { waitingRow }
                recencyRows
                toolsRows
                if let error = store.railError { railErrorRow(error) }
            } else {
                searchRows
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Theme.ground)
        .navigationTitle("Corner")
        .searchable(text: $query, prompt: "Search rooms")
        .refreshable { await store.load() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAccount = true } label: {
                    Image(systemName: "person.crop.circle")
                }
                .accessibilityLabel("Account")
            }
        }
        .sheet(isPresented: $showAccount) {
            AccountView()
                .environmentObject(api)
                .environmentObject(PushService.shared)
        }
        .task {
            if !store.hasLoadedOnce { await store.load() }
            review.startPolling()
        }
        .onChange(of: api.world) { _, _ in store.refresh() }
    }

    // MARK: - The timeline

    @ViewBuilder
    private var recencyRows: some View {
        if store.recent.isEmpty {
            if store.isLoading {
                loadingRow
            } else {
                emptyRow
            }
        } else {
            ForEach(Array(store.recent.enumerated()), id: \.element.id) { index, entry in
                RoomRowCard(entry: entry, isHero: index == 0)
                    .onTapGesture { router.open(entry.room) }
                    .plainCardRow()
            }
        }
    }

    // MARK: - Files / Tracker (surfaces, not rooms)

    @ViewBuilder
    private var toolsRows: some View {
        sectionLabel("Tools")
        UtilityRow(title: "Files", subtitle: "Everything your crew produced", symbol: "folder")
            .onTapGesture { router.open(.organize) }
            .plainCardRow()
        UtilityRow(title: "Tracker", subtitle: "Issues and client tickets", symbol: "checklist")
            .onTapGesture { router.open(.tracker) }
            .plainCardRow()
    }

    // MARK: - Waiting on you (gated to > 0 — a permanent zero is a signal that stops being read)

    private var waitingRow: some View {
        HStack(spacing: Theme.s3) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Theme.warning.opacity(0.16))
                    .frame(width: 40, height: 40)
                Image(systemName: "tray.full").font(.footnote).foregroundStyle(Theme.warning)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Waiting on you").font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(review.waitingCount == 1 ? "1 file needs a verdict" : "\(review.waitingCount) files need a verdict")
                    .font(.caption).foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Text("\(review.waitingCount)")
                .font(.caption.weight(.bold).monospacedDigit())
                .foregroundStyle(Theme.ground)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(Theme.warning, in: Capsule())
        }
        .padding(Theme.s3)
        .cardSurface(fill: Theme.warning.opacity(0.10), border: Theme.warning.opacity(0.35), edge: Theme.warning)
        .contentShape(Rectangle())
        .onTapGesture { router.open(.review) }
        .plainCardRow()
    }

    // MARK: - Search (flat, every room the rail knows — including agents)

    @ViewBuilder
    private var searchRows: some View {
        let matches = store.allRooms.filter {
            $0.title.localizedCaseInsensitiveContains(query)
                || $0.subtitle.localizedCaseInsensitiveContains(query)
        }
        if matches.isEmpty {
            sectionLabel("No rooms match")
        } else {
            sectionLabel("Results")
            ForEach(matches) { room in
                RoomRowCard(entry: RoomStore.RecentRoom(room: room, ts: 0, preview: ""), isHero: false)
                    .onTapGesture { router.open(room) }
                    .plainCardRow()
            }
        }
    }

    // MARK: - Sundry rows

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption2.weight(.semibold))
            .tracking(0.8)
            .foregroundStyle(Theme.inkFaint)
            .padding(.top, Theme.s3)
            .padding(.bottom, Theme.s1)
            .plainCardRow()
    }

    private var loadingRow: some View {
        HStack(spacing: Theme.s2) {
            ProgressView().controlSize(.small)
            Text("Loading your rooms…").font(.footnote).foregroundStyle(Theme.inkSoft)
        }
        .padding(.vertical, Theme.s3)
        .plainCardRow()
    }

    private var emptyRow: some View {
        VStack(alignment: .leading, spacing: Theme.s1) {
            Text("No recent rooms").font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
            Text("Search above to open a project, mission, or agent room.")
                .font(.footnote).foregroundStyle(Theme.inkSoft)
        }
        .padding(Theme.s3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(fill: Theme.raised.opacity(0.6), border: Theme.hairline, edge: Theme.hairline)
        .plainCardRow()
    }

    private var noWorldNotice: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text("No workspace on this account").font(.headline).foregroundStyle(Theme.ink)
            Text("If you have more than one Corner login, sign out and use the one you sign in with on the web.")
                .font(.footnote).foregroundStyle(Theme.inkSoft)
            Text("If this is your only login, ask whoever invited you to finish setting up your account.")
                .font(.footnote).foregroundStyle(Theme.inkFaint)
            Button("Sign out") { Task { await api.signOut() } }
                .font(.footnote.weight(.semibold))
                .padding(.top, Theme.s1)
        }
        .padding(.vertical, Theme.s2)
        .plainCardRow()
    }

    private func railErrorRow(_ message: String) -> some View {
        Label(message, systemImage: "exclamationmark.triangle")
            .font(.footnote).foregroundStyle(Theme.warning)
            .padding(.vertical, Theme.s2)
            .plainCardRow()
    }
}

// MARK: - The contract row

/// One room row, all eight parts of the room-row contract in order.
private struct RoomRowCard: View {
    let entry: RoomStore.RecentRoom
    let isHero: Bool

    private var room: Room { entry.room }
    private var tint: Color { isHero ? Theme.accent : Theme.tint(for: room.title) }
    /// Hero is "active" only when the room genuinely moved in the last hour — otherwise the
    /// status word + progress bar would be a lie, so we show its timestamp instead.
    private var heroActive: Bool { isHero && entry.hasActivity && (Date().timeIntervalSince1970 * 1000 - entry.ts) < 3_600_000 }
    // Unread is "an agent message newer than the viewer's last message" (contract §7).
    // Native has no per-room read feed yet, so this is honestly never set (see mission blocker).
    private var unread: Bool { false }

    var body: some View {
        Group { if isHero { hero } else { quiet } }
            .contentShape(Rectangle())
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isButton)
    }

    // The hero: accent-weak fill, accent edge, larger monogram + title, status word, bar.
    private var hero: some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            HStack(alignment: .top, spacing: Theme.s3) {
                Monogram(title: room.title, tint: tint, hero: true)
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: Theme.s2) {
                        Text(room.title).font(.title2.weight(.bold)).foregroundStyle(Theme.ink).lineLimit(1)
                        TypeChip(room: room)
                    }
                    if heroActive {
                        HStack(spacing: 6) {
                            Circle().fill(Theme.live).frame(width: 8, height: 8)
                            Text("active").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.live)
                        }
                    } else if !entry.preview.isEmpty {
                        Text(entry.preview).font(.subheadline).foregroundStyle(Theme.inkSoft).lineLimit(1)
                    }
                }
                Spacer(minLength: Theme.s2)
                Text(RelTime.of(entry.ts)).font(.caption.monospaced()).foregroundStyle(Theme.inkFaint)
            }
            if heroActive { IndeterminateBar() }
        }
        .padding(Theme.s4)
        .cardSurface(fill: Theme.accentWeak, border: Theme.accent.opacity(0.55), edge: Theme.accent)
    }

    // A quiet row: edge, avatar, title + chip, preview, trailing time + dot.
    private var quiet: some View {
        HStack(spacing: Theme.s3) {
            Monogram(title: room.title, tint: tint, hero: false)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: Theme.s2) {
                    Text(room.title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                    TypeChip(room: room)
                }
                if !entry.preview.isEmpty {
                    Text(entry.preview).font(.caption).foregroundStyle(Theme.inkSoft).lineLimit(1)
                }
            }
            Spacer(minLength: Theme.s2)
            VStack(alignment: .trailing, spacing: 6) {
                let age = RelTime.of(entry.ts)
                if !age.isEmpty {
                    Text(age).font(.caption2.monospaced()).foregroundStyle(Theme.inkFaint)
                }
                if unread { Circle().fill(Theme.live).frame(width: 9, height: 9) }
            }
        }
        .padding(.vertical, Theme.s3)
        .padding(.horizontal, Theme.s3)
        .cardSurface(fill: Theme.raised.opacity(0.6), border: Theme.hairline, edge: tint)
    }
}

/// The required PROJECT / MISSION / AGENT chip — CV6 `.tag-pill` metrics verbatim
/// (10px / 700 / .06em / uppercase / 3px 8px / 6px radius) with the contract's tones.
private struct TypeChip: View {
    let room: Room
    private var fg: Color {
        switch room.typeTag { case .project: Theme.violet; case .mission: Theme.teal; case .agent: Theme.accent }
    }
    private var bg: Color {
        switch room.typeTag { case .project: Theme.violetWeak; case .mission: Theme.tealWeak; case .agent: Theme.accentWeak }
    }
    var body: some View {
        Text(room.typeLabel)
            .font(.system(size: 10, weight: .bold))
            .tracking(0.6)
            .foregroundStyle(fg)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(bg, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}

/// The monogram avatar (contract §1 part 2): one hero letter or two quiet letters,
/// uppercased. Never a face. Hero fills with the tint; quiet is an outlined disc.
private struct Monogram: View {
    let title: String
    let tint: Color
    let hero: Bool

    private var size: CGFloat { hero ? 52 : 38 }

    private var glyph: String {
        let words = title.split(separator: " ")
        if hero { return String(title.prefix(1)).uppercased() }
        if words.count >= 2 { return String(words[0].prefix(1) + words[1].prefix(1)).uppercased() }
        return String(title.prefix(2)).uppercased()
    }

    var body: some View {
        Text(glyph)
            .font(hero ? .title3.weight(.bold) : .subheadline.weight(.bold))
            .foregroundStyle(hero ? Theme.ground : Theme.ink)
            .frame(width: size, height: size)
            .background(
                Circle().fill(hero ? tint : Theme.raised)
            )
            .overlay(
                Circle().strokeBorder(hero ? Color.clear : Theme.hairline, lineWidth: 1)
            )
    }
}

/// Files / Tracker as a card row — surfaces, not conversations, so no chip or avatar face.
private struct UtilityRow: View {
    let title: String
    let subtitle: String
    let symbol: String
    var body: some View {
        HStack(spacing: Theme.s3) {
            Image(systemName: symbol)
                .font(.footnote).foregroundStyle(Theme.inkSoft)
                .frame(width: 38, height: 38)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(subtitle).font(.caption).foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(Theme.inkFaint)
        }
        .padding(.vertical, Theme.s3)
        .padding(.horizontal, Theme.s3)
        .cardSurface(fill: Theme.raised.opacity(0.6), border: Theme.hairline, edge: Theme.hairline)
        .contentShape(Rectangle())
    }
}

/// The indeterminate progress bar on the active hero — a segment that travels forever,
/// the honest "something is moving" signal without claiming a percentage.
private struct IndeterminateBar: View {
    @State private var travel = false
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            Capsule().fill(Theme.hairline)
                .overlay(alignment: .leading) {
                    Capsule().fill(Theme.accent)
                        .frame(width: max(24, w * 0.38))
                        .offset(x: travel ? w * 0.66 : -w * 0.38)
                }
                .clipShape(Capsule())
        }
        .frame(height: 4)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) { travel = true }
        }
    }
}

// MARK: - Card + row styling helpers

private extension View {
    /// A rounded card surface with a 3px tinted left edge, clipped to the corner radius.
    func cardSurface(fill: Color, border: Color, edge: Color) -> some View {
        self
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous).fill(fill)
                    Rectangle().fill(edge).frame(width: 3)
                }
                .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .strokeBorder(border, lineWidth: 1)
            )
    }

    /// Plain-list row chrome: no separators, transparent, a small gap between cards.
    func plainCardRow() -> some View {
        self
            .listRowInsets(EdgeInsets(top: Theme.s1, leading: Theme.s4, bottom: Theme.s1, trailing: Theme.s4))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}

/// A small circular monogram avatar, kept for the Assign sheet's agent picker. The home
/// timeline uses `Monogram` (hero/quiet aware); this is the plain reusable disc.
struct RoomAvatar: View {
    let title: String

    var body: some View {
        Text(initials)
            .font(.caption.weight(.bold))
            .foregroundStyle(Theme.ink)
            .frame(width: 34, height: 34)
            .background(Circle().fill(Theme.raised))
            .overlay(Circle().strokeBorder(Theme.hairline, lineWidth: 1))
    }

    private var initials: String {
        let words = title.split(separator: " ")
        if words.count >= 2 { return String(words[0].prefix(1) + words[1].prefix(1)).uppercased() }
        return String(title.prefix(2)).uppercased()
    }
}

// MARK: - Relative time (contract §1 part 6: now / Nm / Nh / Nd, never a clock)

enum RelTime {
    static func of(_ tsMillis: Double) -> String {
        guard tsMillis > 0 else { return "" }
        let deltaMs = Date().timeIntervalSince1970 * 1000 - tsMillis
        if deltaMs < 60_000 { return "now" }
        let minutes = Int((deltaMs / 60_000).rounded())
        if minutes < 60 { return "\(minutes)m" }
        let hours = Int((Double(minutes) / 60).rounded())
        if hours < 24 { return "\(hours)h" }
        return "\(Int((Double(hours) / 24).rounded()))d"
    }
}

#if DEBUG
/// A no-network, no-auth render of the home timeline used ONLY by the design-proof
/// capture (`simctl launch … -homePreview`). The rooms here are synthetic and match the
/// shape the real home produces from `/api/dashboard/room-activity`: projects and missions
/// with real recency and hygiene-cleaned previews, the single active hero on row 1. No
/// production data is touched.
struct HomePreviewHarness: View {
    private let world = "aom"
    private var now: Double { Date().timeIntervalSince1970 * 1000 }

    private func project(_ slug: String, _ title: String) -> Room {
        Room(world: world, kind: .project(slug: slug), title: title, subtitle: "Project")
    }
    private func mission(_ project: String, _ slug: String, _ title: String) -> Room {
        Room(world: world, kind: .mission(slug: "\(project):\(slug)", project: project), title: title, subtitle: Room.prettify(project))
    }

    private var samples: [RoomStore.RecentRoom] {
        [
            .init(room: project("outreach", "Outreach"), ts: now - 25_000, preview: ""),
            .init(room: mission("corner", "native-ios", "Native iOS"), ts: now - 5 * 60_000, preview: "Rebuilt the home to the room-row contract"),
            .init(room: project("ambition-mechanical", "Ambition Mechanical"), ts: now - 22 * 60_000, preview: "Shared a file: proof-page.html"),
            .init(room: mission("corner", "room-organizer", "Room Organizer"), ts: now - 60 * 60_000, preview: "Same answer I just gave you a minute ago"),
            .init(room: project("az-tech-council", "AZ Tech Council"), ts: now - 3 * 3_600_000, preview: "Deliverable approved for the summit page"),
            .init(room: mission("aom", "client-engine", "Client Engine"), ts: now - 6 * 3_600_000, preview: ""),
            .init(room: project("support-desk", "Support Desk"), ts: now - 9 * 3_600_000, preview: "Draft reply is ready for your review"),
        ]
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(samples.enumerated()), id: \.element.id) { index, entry in
                    RoomRowCard(entry: entry, isHero: index == 0).plainCardRow()
                }
                Text("TOOLS")
                    .font(.caption2.weight(.semibold)).tracking(0.8).foregroundStyle(Theme.inkFaint)
                    .padding(.top, Theme.s3).padding(.bottom, Theme.s1).plainCardRow()
                UtilityRow(title: "Files", subtitle: "Everything your crew produced", symbol: "folder").plainCardRow()
                UtilityRow(title: "Tracker", subtitle: "Issues and client tickets", symbol: "checklist").plainCardRow()
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Corner")
        }
        .preferredColorScheme(.dark)
    }
}
#endif
