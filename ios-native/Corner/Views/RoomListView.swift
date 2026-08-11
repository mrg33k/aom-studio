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
    /// The front-door router: turns a room-less message typed into the pinned composer
    /// into an opened, seeded room, the same way the web front door does.
    @StateObject private var intake = IntakeRouter()

    @State private var query = ""
    @State private var showingNewRoom = false

    /// The web chat directory's filter chips (All / Agents / Projects). Agents IS the
    /// per-conversation agent picker: every specialist as their own conversation row.
    private enum HomeFilter: String, CaseIterable {
        case all = "All", agents = "Agents", projects = "Projects"
    }
    @State private var filter: HomeFilter = .all

    var body: some View {
        List {
            if api.world == nil {
                noWorldNotice
            } else if query.isEmpty {
                eyebrowRow
                filterChips
                switch filter {
                case .all:
                    if review.waitingCount > 0 { waitingRow }
                    recencyRows
                    toolsRows
                    if let error = store.railError { railErrorRow(error) }
                case .agents:
                    agentRows
                case .projects:
                    projectRows
                }
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
            // "+ New" lives in the leading position to match the web rail's placement.
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    showingNewRoom = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .semibold))
                        Text("New")
                            .font(.hkCaption.weight(.semibold))
                    }
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(Theme.accentWeak, in: Capsule())
                }
                .accessibilityLabel("New room")
            }
            // The web mobile home's top bar (TopBar contract, R209): theme chip,
            // bell with the needs-you dot, gradient avatar. Search stays native
            // (the pull-down field). Every control does its real thing — the bell
            // opens the review queue and its dot IS review.waitingCount.
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { cycleTheme() } label: {
                    Image(systemName: themeGlyph)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Theme.inkSoft)
                }
                .accessibilityLabel("Theme")

                Button { router.open(.review) } label: {
                    Image(systemName: "bell")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Theme.inkSoft)
                        .overlay(alignment: .topTrailing) {
                            if review.waitingCount > 0 {
                                Circle()
                                    .fill(Theme.warning)
                                    .frame(width: 8, height: 8)
                                    .offset(x: 2, y: -2)
                            }
                        }
                }
                .accessibilityLabel(review.waitingCount > 0
                    ? "Review queue — \(review.waitingCount) waiting"
                    : "Review queue")

                Button { router.showingSettings = true } label: {
                    AvatarDisc(name: api.userDisplayName ?? api.userEmail ?? "?", size: 30)
                }
                .accessibilityLabel("Settings")
            }
        }
        .sheet(isPresented: $router.showingSettings) {
            AccountView()
                .environmentObject(api)
                .environmentObject(PushService.shared)
        }
        // The front-door composer, pinned above the timeline (and above the keyboard).
        // Hidden while searching — search is a different intent from starting work.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if api.world != nil && query.isEmpty {
                HomeComposerBar(intake: intake, candidates: intakeCandidates, recentRooms: intakeRecentRooms)
                    .background(Theme.ground)
            }
        }
        .sheet(isPresented: $intake.showConfirm) {
            IntakeConfirmSheet(intake: intake, allRooms: store.allRooms)
        }
        .sheet(isPresented: $showingNewRoom) {
            NewRoomSheet { newRoom in
                // Reload the rail to surface the new room, then open it.
                store.refresh()
                router.open(newRoom)
            }
            .environmentObject(api)
        }
        .task {
            intake.onOpen = { router.open($0) }
            if !store.hasLoadedOnce { await store.load() }
            review.startPolling()
        }
        .onChange(of: api.world) { _, _ in store.refresh() }
    }

    // MARK: - Eyebrow + filter chips (the web mobile home's top of list)

    private var eyebrowRow: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("ALL ROOMS")
                .font(.hanken(12).weight(.semibold))
                .tracking(1.2)
                .foregroundStyle(Theme.inkSoft)
            Text("Projects and specialists")
                .font(.hkFootnote)
                .foregroundStyle(Theme.inkFaint)
        }
        .padding(.top, Theme.s2)
        .plainCardRow()
    }

    private var chipCount: [HomeFilter: Int] {
        let agents = AgentRoster.all.count
        let projects = store.projects.count
        return [.all: agents + projects, .agents: agents, .projects: projects]
    }

    private var filterChips: some View {
        HStack(spacing: Theme.s2) {
            ForEach(HomeFilter.allCases, id: \.self) { f in
                Button {
                    withAnimation(.easeOut(duration: 0.15)) { filter = f }
                } label: {
                    HStack(spacing: 6) {
                        Text(f.rawValue)
                            .font(.hanken(14).weight(.semibold))
                        if let n = chipCount[f], n > 0 {
                            Text("\(n)")
                                .font(.hanken(12).weight(.semibold).monospacedDigit())
                                .opacity(0.75)
                        }
                    }
                    .foregroundStyle(filter == f ? Color.white : Theme.inkSoft)
                    .padding(.horizontal, 14)
                    .frame(height: 38)
                    .background(filter == f ? Theme.accent : Theme.raised2, in: Capsule())
                    .overlay(Capsule().strokeBorder(filter == f ? Color.clear : Theme.hairline, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(filter == f ? [.isSelected] : [])
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, Theme.s1)
        .plainCardRow()
    }

    // MARK: - The agent picker (web chat directory's AGENTS section, per conversation)

    @ViewBuilder
    private var agentRows: some View {
        sectionLabel("Agents")
        ForEach(AgentRoster.all, id: \.slug) { entry in
            Button {
                if let world = api.world {
                    router.open(Room(world: world, kind: .agent(slug: entry.slug), title: entry.title, subtitle: entry.subtitle))
                }
            } label: {
                AgentPickerRow(entry: entry)
            }
            .buttonStyle(CardButtonStyle())
            .plainCardRow()
        }
    }

    @ViewBuilder
    private var projectRows: some View {
        sectionLabel("Projects")
        ForEach(store.projects, id: \.room.id) { group in
            Button { router.open(group.room) } label: {
                RoomRowCard(
                    entry: RoomStore.RecentRoom(room: group.room, ts: 0, preview: group.room.subtitle),
                    isHero: false
                )
            }
            .buttonStyle(CardButtonStyle())
            .plainCardRow()
        }
    }

    // MARK: - Theme cycle (SharedNav's ThemeCycle: Light → Dark → Glass)

    private var themeGlyph: String {
        switch ThemeManager.shared.kind {
        case .dark: return "moon"
        case .light: return "sun.max"
        case .glass: return "sparkle"
        }
    }

    private func cycleTheme() {
        let all = ThemeKind.allCases
        let current = ThemeManager.shared.kind
        let next = all[(all.firstIndex(of: current)! + 1) % all.count]
        ThemeManager.shared.kind = next
    }

    // MARK: - Intake payloads (candidates the routing brain ranks against)

    /// The rooms the router chooses among, straight from the rail's own lists — the
    /// native equivalent of assembleCandidates() in useIntakeRoute.js. Rooms that have
    /// recent activity carry their timestamp and a one-line hint so the router's recency
    /// cut and subject-matter matching are real; dormant rooms arrive bare (the endpoint
    /// tolerates it). Rebuilt on send, never on every list poll.
    private func intakeCandidates() -> [String: Any] {
        let recentByID = Dictionary(store.recent.map { ($0.room.roomID, $0) }, uniquingKeysWith: { a, _ in a })
        func hintFields(_ room: Room) -> [String: Any] {
            guard let entry = recentByID[room.roomID] else { return [:] }
            var out: [String: Any] = [:]
            if entry.ts > 0 { out["last_message_at"] = RoomListView.isoFromMillis(entry.ts) }
            if !entry.preview.isEmpty { out["hint"] = entry.preview }
            return out
        }
        var projects: [[String: Any]] = []
        var missions: [[String: Any]] = []
        for group in store.projects {
            if case .project(let slug) = group.room.kind {
                let base: [String: Any] = ["slug": slug, "name": group.room.title]
                projects.append(base.merging(hintFields(group.room)) { a, _ in a })
            }
            for mission in group.missions {
                if case .mission(let canonical, let project) = mission.kind {
                    let bare = canonical.split(separator: ":").last.map(String.init) ?? canonical
                    let base: [String: Any] = ["slug": bare, "project_slug": project, "name": mission.title]
                    missions.append(base.merging(hintFields(mission)) { a, _ in a })
                }
            }
        }
        let agents: [[String: Any]] = AgentRoster.all.map { ["slug": $0.slug, "name": $0.title] }
        return ["projects": projects, "missions": missions, "agents": agents]
    }

    /// The recent-rooms list the router biases "continue" toward — the top of the home
    /// timeline, in the shape recent_rooms expects.
    private func intakeRecentRooms() -> [[String: Any]] {
        store.recent.prefix(6).map { entry in
            let room = entry.room
            switch room.kind {
            case .mission(let canonical, let project):
                let bare = canonical.split(separator: ":").last.map(String.init) ?? canonical
                return ["id": bare, "name": room.title, "isMission": true, "isProject": false, "missionSlug": canonical, "projectSlug": project]
            case .project(let slug):
                return ["id": slug, "name": room.title, "isMission": false, "isProject": true, "missionSlug": "", "projectSlug": ""]
            case .agent(let slug):
                return ["id": slug, "name": room.title, "isMission": false, "isProject": false, "missionSlug": "", "projectSlug": ""]
            }
        }
    }

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime]; return f
    }()
    static func isoFromMillis(_ ms: Double) -> String {
        isoFormatter.string(from: Date(timeIntervalSince1970: ms / 1000))
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
                Button { router.open(entry.room) } label: {
                    RoomRowCard(entry: entry, isHero: index == 0)
                }
                .buttonStyle(CardButtonStyle())
                .plainCardRow()
            }
        }
    }

    // MARK: - Files / Tracker (surfaces, not rooms)

    @ViewBuilder
    private var toolsRows: some View {
        sectionLabel("Tools")
        Button { router.open(.organize) } label: {
            UtilityRow(title: "Files", subtitle: "Everything your crew produced", symbol: "folder")
        }
        .buttonStyle(CardButtonStyle())
        .plainCardRow()
        Button { router.open(.tracker) } label: {
            UtilityRow(title: "Tracker", subtitle: "Issues and client tickets", symbol: "checklist")
        }
        .buttonStyle(CardButtonStyle())
        .plainCardRow()
    }

    // MARK: - Waiting on you (gated to > 0 — a permanent zero is a signal that stops being read)

    private var waitingRow: some View {
        Button { router.open(.review) } label: { waitingCard }
            .buttonStyle(CardButtonStyle())
            .plainCardRow()
    }

    private var waitingCard: some View {
        HStack(spacing: Theme.s3) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Theme.warning.opacity(0.16))
                    .frame(width: 40, height: 40)
                Image(systemName: "tray.full").font(.hkFootnote).foregroundStyle(Theme.warning)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Waiting on you").font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(review.waitingCount == 1 ? "1 file needs a verdict" : "\(review.waitingCount) files need a verdict")
                    .font(.hkCaption).foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Text("\(review.waitingCount)")
                .font(.hkCaption.weight(.bold).monospacedDigit())
                .foregroundStyle(Theme.ground)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(Theme.warning, in: Capsule())
        }
        .padding(Theme.s3)
        .cardSurface(fill: Theme.warning.opacity(0.10), border: Theme.warning.opacity(0.35), edge: Theme.warning)
        .contentShape(Rectangle())
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
                Button { router.open(room) } label: {
                    RoomRowCard(entry: RoomStore.RecentRoom(room: room, ts: 0, preview: ""), isHero: false)
                }
                .buttonStyle(CardButtonStyle())
                .plainCardRow()
            }
        }
    }

    // MARK: - Sundry rows

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.hkCaption2.weight(.semibold))
            .tracking(0.8)
            .foregroundStyle(Theme.inkFaint)
            .padding(.top, Theme.s3)
            .padding(.bottom, Theme.s1)
            .plainCardRow()
    }

    private var loadingRow: some View {
        HStack(spacing: Theme.s2) {
            ProgressView().controlSize(.small)
            Text("Loading your rooms…").font(.hkFootnote).foregroundStyle(Theme.inkSoft)
        }
        .padding(.vertical, Theme.s3)
        .plainCardRow()
    }

    private var emptyRow: some View {
        VStack(alignment: .leading, spacing: Theme.s1) {
            Text("No recent rooms").font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink)
            Text("Search above to open a project, mission, or agent room.")
                .font(.hkFootnote).foregroundStyle(Theme.inkSoft)
        }
        .padding(Theme.s3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(fill: Theme.raised.opacity(0.6), border: Theme.hairline, edge: Theme.hairline)
        .plainCardRow()
    }

    private var noWorldNotice: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text("No workspace on this account").font(.hkHeadline).foregroundStyle(Theme.ink)
            Text("If you have more than one Corner login, sign out and use the one you sign in with on the web.")
                .font(.hkFootnote).foregroundStyle(Theme.inkSoft)
            Text("If this is your only login, ask whoever invited you to finish setting up your account.")
                .font(.hkFootnote).foregroundStyle(Theme.inkFaint)
            Button("Sign out") { Task { await api.signOut() } }
                .font(.hkFootnote.weight(.semibold))
                .padding(.top, Theme.s1)
        }
        .padding(.vertical, Theme.s2)
        .plainCardRow()
    }

    private func railErrorRow(_ message: String) -> some View {
        Label(message, systemImage: "exclamationmark.triangle")
            .font(.hkFootnote).foregroundStyle(Theme.warning)
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

    // The hero, per the LIVE web mobile home (webview-mobile-home.png): solid accent
    // disc + single letter, no type chip, soft fill, blue edge, status word + track.
    private var hero: some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            HStack(alignment: .top, spacing: Theme.s3) {
                Monogram(title: room.title, tint: tint, hero: true)
                VStack(alignment: .leading, spacing: 6) {
                    Text(room.title).font(.hkTitle2.weight(.bold)).foregroundStyle(Theme.ink).lineLimit(1)
                    if heroActive {
                        HStack(spacing: 6) {
                            Circle().fill(Theme.live).frame(width: 8, height: 8)
                            Text("active").font(.hkSubheadline.weight(.semibold)).foregroundStyle(Theme.live)
                        }
                    } else if !entry.preview.isEmpty {
                        Text(entry.preview).font(.hkSubheadline).foregroundStyle(Theme.inkSoft).lineLimit(1)
                    }
                }
                Spacer(minLength: Theme.s2)
                Text(RelTime.of(entry.ts)).font(.hkCaption.monospaced()).foregroundStyle(Theme.inkFaint)
            }
            if heroActive { IndeterminateBar() }
        }
        .padding(Theme.s4)
        .cardSurface(fill: Theme.accentWeak, border: Theme.accent.opacity(0.35), edge: Theme.accent)
    }

    // A quiet row, per the live web mobile home: edge, single-letter avatar, title,
    // preview, trailing time + dot. No type chip — the web home dropped them.
    private var quiet: some View {
        HStack(spacing: Theme.s3) {
            Monogram(title: room.title, tint: tint, hero: false)
            VStack(alignment: .leading, spacing: 3) {
                Text(room.title).font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                if !entry.preview.isEmpty {
                    Text(entry.preview).font(.hkCaption).foregroundStyle(Theme.inkSoft).lineLimit(1)
                }
            }
            Spacer(minLength: Theme.s2)
            VStack(alignment: .trailing, spacing: 6) {
                let age = RelTime.of(entry.ts)
                if !age.isEmpty {
                    Text(age).font(.hkCaption2.monospaced()).foregroundStyle(Theme.inkFaint)
                }
                if unread { Circle().fill(Theme.live).frame(width: 9, height: 9) }
            }
        }
        .padding(.vertical, Theme.s3)
        .padding(.horizontal, Theme.s3)
        .cardSurface(fill: Theme.raised.opacity(0.6), border: Theme.hairline, edge: tint)
    }
}

/// One agent conversation in the picker — the web chat directory's AGENTS row:
/// gradient disc + single letter, the agent's TITLE (never a persona name), the
/// READY state chip, the specialist's one-line domain.
private struct AgentPickerRow: View {
    let entry: AgentRoster.Entry

    var body: some View {
        HStack(spacing: Theme.s3) {
            Text(String(entry.title.prefix(1)).uppercased())
                .font(.hanken(17).weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(
                    LinearGradient(
                        colors: [Color(cv6: 0x3B82F6), Color(cv6: 0x1D4ED8)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ),
                    in: Circle()
                )
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: Theme.s2) {
                    Text(entry.title).font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink)
                    HStack(spacing: 5) {
                        Circle().fill(Theme.inkFaint).frame(width: 6, height: 6)
                        Text("READY")
                            .font(.hanken(10).weight(.bold))
                            .tracking(0.8)
                            .foregroundStyle(Theme.inkSoft)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Theme.chipFill, in: Capsule())
                }
                Text(entry.subtitle).font(.hkCaption).foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.hkCaption.weight(.semibold)).foregroundStyle(Theme.inkFaint)
        }
        .padding(.vertical, Theme.s3)
        .padding(.horizontal, Theme.s3)
        .cardSurface(fill: Theme.raised.opacity(0.6), border: Theme.hairline, edge: Theme.accent)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }
}


/// The monogram avatar (contract §1 part 2): two letters on every row including the hero,
/// uppercased. Never a face. Hero fills with the tint; quiet is an outlined disc.
private struct Monogram: View {
    let title: String
    let tint: Color
    let hero: Bool

    private var size: CGFloat { hero ? 52 : 38 }

    // Two-letter monogram for EVERY row including the hero (room-row-contract §1 part 2,
    // Patrik 2026-08-10 — resolved the 1-vs-2 fork in favour of 2 everywhere). Same
    // derivation as the web `roomMonogram()` (CornerCV6.jsx) so both surfaces produce the
    // identical initials for the same room name: first letters of the first two words,
    // else the first two letters of the single word.
    private var glyph: String {
        let words = title.split(separator: " ")
        if words.count >= 2 { return String(words[0].prefix(1) + words[1].prefix(1)).uppercased() }
        return String(title.prefix(2)).uppercased()
    }

    var body: some View {
        Text(glyph)
            .font(hero ? Font.hanken(20).weight(.bold) : Font.hanken(15).weight(.bold))
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
                .font(.hkFootnote).foregroundStyle(Theme.inkSoft)
                .frame(width: 38, height: 38)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(subtitle).font(.hkCaption).foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.hkCaption.weight(.semibold)).foregroundStyle(Theme.inkFaint)
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

/// Pressed feedback for card rows: the card dims and settles the moment the finger
/// lands. A row without this reads as a dead screen for the ~300ms before the push,
/// which is exactly the "taps don't do anything" complaint.
struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.82 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

private extension View {
    /// A rounded card surface with a 3px tinted left edge, clipped to the corner radius.
    /// Home rows ride the web's --radius-tile (18) — the mobile home's pill-ish cards.
    func cardSurface(fill: Color, border: Color, edge: Color) -> some View {
        self
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous).fill(fill)
                    Rectangle().fill(edge).frame(width: 3)
                }
                .clipShape(RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.tileRadius, style: .continuous)
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
            .font(.hkCaption.weight(.bold))
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
                VStack(alignment: .leading, spacing: 3) {
                    Text("ALL ROOMS")
                        .font(.hanken(12).weight(.semibold)).tracking(1.2).foregroundStyle(Theme.inkSoft)
                    Text("Projects and specialists")
                        .font(.hkFootnote).foregroundStyle(Theme.inkFaint)
                }
                .padding(.top, Theme.s2)
                .plainCardRow()
                HStack(spacing: Theme.s2) {
                    ForEach(["All 20", "Agents 13", "Projects 7"], id: \.self) { label in
                        let selected = label.hasPrefix("All")
                        Text(label)
                            .font(.hanken(14).weight(.semibold))
                            .foregroundStyle(selected ? Color.white : Theme.inkSoft)
                            .padding(.horizontal, 14)
                            .frame(height: 38)
                            .background(selected ? Theme.accent : Theme.raised2, in: Capsule())
                            .overlay(Capsule().strokeBorder(selected ? Color.clear : Theme.hairline, lineWidth: 1))
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, Theme.s1)
                .plainCardRow()
                ForEach(Array(samples.enumerated()), id: \.element.id) { index, entry in
                    RoomRowCard(entry: entry, isHero: index == 0).plainCardRow()
                }
                AgentPickerRow(entry: AgentRoster.all[0]).plainCardRow()
                Text("TOOLS")
                    .font(.hkCaption2.weight(.semibold)).tracking(0.8).foregroundStyle(Theme.inkFaint)
                    .padding(.top, Theme.s3).padding(.bottom, Theme.s1).plainCardRow()
                UtilityRow(title: "Files", subtitle: "Everything your crew produced", symbol: "folder").plainCardRow()
                UtilityRow(title: "Tracker", subtitle: "Issues and client tickets", symbol: "checklist").plainCardRow()
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Corner")
            // The same top bar the real home ships (theme / bell / avatar) with
            // sample state — a waiting dot on the bell, Patrik's initial — so the
            // design capture proves the bar, not just the list.
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Image(systemName: "moon")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Theme.inkSoft)
                    Image(systemName: "bell")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Theme.inkSoft)
                        .overlay(alignment: .topTrailing) {
                            Circle().fill(Theme.warning).frame(width: 8, height: 8).offset(x: 2, y: -2)
                        }
                    AvatarDisc(name: "Patrik", size: 30)
                }
            }
        }
        .preferredColorScheme(ThemeManager.shared.colorScheme)
    }
}
#endif
