// V2HomeWelcome.swift — Corner native iOS
// corner:corner-v2 R41 — the phone's home is a welcome screen.
//
// Home IS the General thread when it has no messages: centred logo,
// illustration, "Welcome <first name>", three suggestion cards drawn from
// the organization ledger, and the docked composer. The nav keeps its
// layout and simply shows no title on home (Patrik, 2026-09-07).

import Combine
import Foundation
import SwiftUI

// MARK: - Suggestion

/// One home card. Ledger cards open a project thread with the composer
/// pre-filled (never sent); onboarding fills pre-fill this thread's
/// composer the same reviewed-not-sent way.
struct HomeSuggestion: Equatable, Identifiable {
    var id: String
    /// The ledger subject slug, or the onboarding slot ("onboarding-0"…).
    var subject: String
    /// Card title: the project name from navigation.
    var projectTitle: String
    /// Newest ledger sentence, trimmed to one line — or the onboarding sub.
    var subline: String
    var projectID: String
    var projectThreadID: String
    var tintHex: String?
    var isOnboarding: Bool
    /// Ledger cards: "Pick up where we left off on <project>." Onboarding
    /// cards: the starter prompt. Staged as a draft, never sent.
    var prefillText: String
    /// SF Symbol for onboarding tiles; nil on ledger cards (initial tile).
    var iconName: String?
}

// MARK: - Builder (pure; unit-pinned)

enum HomeSuggestions {
    /// `ledger:latest` window the home reads (the brief's limit).
    static let ledgerLimit = 60
    /// Always three cards.
    static let cardCount = 3

    /// Run noise the reader drops itself (the R48 server filter covers
    /// these too, but an older backend still serves them — and the brief
    /// orders the client to filter until R48).
    static let noisePrefixes = [
        "Started a corner-v2-chat run",
        "Finished a corner-v2-chat run",
        "Opened ",
        "Closed ",
        "Pinned ",
    ]

    static func isNoise(_ what: String) -> Bool {
        let s = what.trimmingCharacters(in: .whitespacesAndNewlines)
        return noisePrefixes.contains { s.hasPrefix($0) }
    }

    /// The account's first name for "Welcome NAME". A bare "Welcome" when
    /// there is none — never an email, never a "+" string (some accounts
    /// carry the email prefix or a phone-ish handle as the name).
    static func welcomeFirstName(displayName: String?) -> String? {
        guard let raw = displayName?.trimmingCharacters(in: .whitespacesAndNewlines),
              !raw.isEmpty,
              !raw.contains("@"), !raw.contains("+") else { return nil }
        let first = raw.split(whereSeparator: \.isWhitespace).first.map(String.init) ?? ""
        return first.isEmpty ? nil : first
    }

    /// One line, however the sentence arrived.
    static func oneLine(_ s: String) -> String {
        s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// The desktop "new" screen's three onboarding rows, in order — the
    /// fill when the ledger holds fewer than three subjects, and the whole
    /// home when it holds none.
    static func onboarding() -> [HomeSuggestion] {
        [
            HomeSuggestion(
                id: "onboarding-0", subject: "onboarding-0",
                projectTitle: "Bring in your context",
                subline: "One prompt into your old assistant, one paste here.",
                projectID: "", projectThreadID: "",
                tintHex: nil, isOnboarding: true,
                prefillText: "Here's my context: ",
                iconName: "tray.and.arrow.down"
            ),
            HomeSuggestion(
                id: "onboarding-1", subject: "onboarding-1",
                projectTitle: "Connect where the work lives",
                subline: "Mail, drive, design files. You choose what Corner can read.",
                projectID: "", projectThreadID: "",
                tintHex: nil, isOnboarding: true,
                prefillText: "I want to connect my tools: ",
                iconName: "link"
            ),
            HomeSuggestion(
                id: "onboarding-2", subject: "onboarding-2",
                projectTitle: "Start your first project",
                subline: "Name the client, say the first thing to make.",
                projectID: "", projectThreadID: "",
                tintHex: nil, isOnboarding: true,
                prefillText: "I want to start a new project: ",
                iconName: "plus"
            ),
        ]
    }

    /// Drop noise, group by subject, take the three freshest DISTINCT
    /// projects that resolve to navigation, fill the rest with onboarding
    /// rows in order. A mission subject resolves to its parent project
    /// (that project's thread is what the tap opens); a subject with no
    /// navigation node is skipped — its title must come from navigation.
    /// R43 P096: subjects that resolve to the same destination project
    /// collapse to their freshest — never the same project twice.
    static func build(
        items: [WorldLedgerItem], nodes: [V2NavNode], max: Int = HomeSuggestions.cardCount
    ) -> [HomeSuggestion] {
        var newestBySubject: [String: WorldLedgerItem] = [:]
        for item in items {
            let what = oneLine(item.what)
            guard !what.isEmpty, !isNoise(what), !item.subjects.isEmpty else { continue }
            for subject in item.subjects {
                let key = subject.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                guard !key.isEmpty else { continue }
                if let known = newestBySubject[key] {
                    if item.freshness > known.freshness { newestBySubject[key] = item }
                } else {
                    newestBySubject[key] = item
                }
            }
        }
        // Freshest first; the subject breaks ties so the order is stable.
        let ordered = newestBySubject.sorted {
            if $0.value.freshness != $1.value.freshness { return $0.value.freshness > $1.value.freshness }
            return $0.key < $1.key
        }
        var out: [HomeSuggestion] = []
        // The tap destination, not the subject: two subjects in one project
        // open the same thread, so the second never takes a card.
        var usedDestinations: Set<String> = []
        for (subject, item) in ordered {
            guard out.count < max else { break }
            guard let card = card(subject: subject, item: item, nodes: nodes) else { continue }
            let destination = card.projectID.isEmpty ? card.id : card.projectID
            guard usedDestinations.insert(destination).inserted else { continue }
            out.append(card)
        }
        // Fill with the desktop's onboarding rows, in order.
        for fill in onboarding() {
            if out.count >= max { break }
            out.append(fill)
        }
        return out
    }

    private static func card(subject: String, item: WorldLedgerItem, nodes: [V2NavNode]) -> HomeSuggestion? {
        let matches = nodes.filter { $0.slugifiedTitle == subject }
        guard !matches.isEmpty else { return nil }
        // A project beats a same-named mission; otherwise nav order wins.
        let node = matches.sorted { $0.isProject && !$1.isProject }.first!
        let project: V2NavNode
        if node.isProject {
            project = node
        } else if let parent = nodes.first(where: {
            $0.isProject && ($0.id == (node.parentProjectId ?? node.projectId))
        }) {
            project = parent
        } else {
            // A mission whose parent left the tree: the mission's own
            // thread, rather than dropping a fresh subject.
            project = node
        }
        return HomeSuggestion(
            id: "ledger-\(subject)", subject: subject,
            projectTitle: project.title,
            // R60 (Patrik phone review 2026-09-08): a proactive OFFER, not a
            // changelog line. The raw deed ("Confirmed R15…", "Added GMB
            // photos…") read like a GitHub update; the card now invites the
            // next step, and the tap pre-fills "Pick up where we left off".
            subline: "Pick up where you left off",
            projectID: project.isProject ? project.id : (node.parentProjectId ?? node.projectId),
            projectThreadID: project.threadId,
            tintHex: project.tint,
            isOnboarding: false,
            prefillText: "Pick up where we left off on \(project.title).",
            iconName: nil
        )
    }
}

// MARK: - Model

/// The home's two reads (`ledger:latest` + `getNavigation`) and the built
/// cards. A failure on either read is the "none" case: three onboarding
/// rows, never an error over the welcome.
@MainActor
final class V2HomeModel: ObservableObject {
    @Published private(set) var suggestions: [HomeSuggestion] = []
    @Published private(set) var welcomeText = "Welcome"
    @Published private(set) var loaded = false

    private let api: (any CornerV2API)?

    init(api: (any CornerV2API)? = nil) {
        self.api = api
    }

    func load(world: String, accountName: String?) async {
        guard !loaded else { return }
        loaded = true
        if let first = HomeSuggestions.welcomeFirstName(displayName: accountName) {
            welcomeText = "Welcome \(first)"
        }
        let api = self.api ?? WorkspaceStore.shared.v2api
        async let ledger = api.ledgerLatest(world: world, limit: HomeSuggestions.ledgerLimit)
        async let nav = api.navigation()
        do {
            suggestions = HomeSuggestions.build(items: try await ledger, nodes: try await nav)
        } catch {
            suggestions = HomeSuggestions.build(items: [], nodes: [])
        }
    }
}

// MARK: - View

/// The welcome column: centred logo, illustration, welcome line, three
/// cards. Lives inside the thread's scroll column; the composer stays
/// docked below it. Identifiers stay on leaves (the R14 finding).
struct V2HomeWelcomeView: View {
    @ObservedObject var home: V2HomeModel
    var onOpenProject: (HomeSuggestion) -> Void
    var onPrefill: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            // The whole logo asset, ink, centred — part of the welcome,
            // not a nav change (Patrik, 2026-09-07).
            Image("CornerLogo")
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .frame(height: 24)
                .foregroundStyle(Theme.ink)
                .accessibilityIdentifier("v2-home-logo")
                .accessibilityLabel("Corner")
                .frame(maxWidth: .infinity)
                .padding(.top, 28)
            // A light, friendly mark in the app's own language: the
            // project-tile treatment, floating over a soft accent glow.
            ZStack {
                Circle()
                    .fill(Theme.accent.opacity(0.12))
                    .frame(width: 132, height: 132)
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(Theme.accent.opacity(0.16))
                    .frame(width: 88, height: 88)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28, style: .continuous)
                            .strokeBorder(Theme.accent.opacity(0.35), lineWidth: 1)
                    )
                Image(systemName: "sparkles")
                    .font(.system(size: 38, weight: .medium))
                    .foregroundStyle(Theme.accent)
            }
            .accessibilityIdentifier("v2-home-illustration")
            .accessibilityLabel("Welcome illustration")
            .padding(.top, 20)
            Text(home.welcomeText)
                .font(.hanken(28).weight(.semibold))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.top, 12)
                .accessibilityIdentifier("v2-home-welcome")
            // R60 (Patrik phone review 2026-09-08): the suggestions sit JUST
            // above the composer, not mid-screen. The welcome fills the scroll
            // viewport and this spacer pushes the cards to the bottom.
            Spacer(minLength: 24)
            VStack(spacing: 12) {
                ForEach(Array(home.suggestions.enumerated()), id: \.element.id) { index, suggestion in
                    homeCard(suggestion, index: index)
                }
            }
            // R60 (Patrik phone review 2026-09-08): clear the composer so the
            // bottom suggestion is never cut off, while still sitting just
            // above it.
            .padding(.bottom, 20)
        }
        .containerRelativeFrame(.vertical, alignment: .top)
        .onAppear {
            Task {
                await home.load(
                    world: CornerAPI.shared.world ?? "aom",
                    accountName: CornerAPI.shared.userDisplayName
                )
            }
        }
    }

    /// One full-width card: 56pt tile, 15 semibold title, 13 muted sub on
    /// one line, chevron. Surface on ground, hairline, 12pt radius — the
    /// drawer's rhythm, the desktop new screen's rows.
    private func homeCard(_ suggestion: HomeSuggestion, index: Int) -> some View {
        Button {
            if suggestion.isOnboarding {
                onPrefill(suggestion.prefillText)
            } else {
                onOpenProject(suggestion)
            }
        } label: {
            HStack(spacing: 12) {
                homeTile(suggestion)
                VStack(alignment: .leading, spacing: 2) {
                    Text(suggestion.projectTitle)
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Text(suggestion.subline)
                        .font(.hanken(13))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(Theme.inkFaint)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.raised)
            }
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("v2-home-card-\(index)")
        .accessibilityLabel(suggestion.projectTitle)
    }

    private func homeTile(_ suggestion: HomeSuggestion) -> some View {
        Group {
            if suggestion.isOnboarding {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
                    .overlay {
                        Image(systemName: suggestion.iconName ?? "plus")
                            .font(.system(size: 22, weight: .regular))
                            .foregroundStyle(Theme.ink)
                    }
            } else {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(hexString: suggestion.tintHex ?? "") ?? Theme.accent)
                    .overlay {
                        Text(String(suggestion.projectTitle.prefix(1)).uppercased())
                            .font(.hanken(22).weight(.bold))
                            .foregroundStyle(Color.white)
                    }
            }
        }
        .frame(width: 56, height: 56)
    }
}
