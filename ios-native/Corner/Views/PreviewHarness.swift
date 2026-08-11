// PreviewHarness.swift — Corner native iOS
// corner:bridge — DEBUG-only, no-network design proofs for the chat parity work.
//
// These render the REAL components (MessageBubbleView, TurnIndicatorView, HomeComposerBar)
// against synthetic fixtures so the message-row anatomy and the home composer can be
// captured on the simulator without a signed-in session or any production data. Launched
// with `simctl launch … -chatPreview` / `-composerPreview`. Debug builds only.

#if DEBUG
import SwiftUI

// MARK: - Fixture decoding

enum PreviewFixtures {
    /// Decode an array of `messages` rows from a JSON string — the same shape the real
    /// history endpoint returns — so fixtures exercise MessageRow's real decoder.
    static func rows(_ json: String) -> [MessageRow] {
        guard let data = json.data(using: .utf8),
              let rows = try? JSONDecoder().decode([MessageRow].self, from: data) else { return [] }
        return rows
    }

    static let chatRows: [MessageRow] = rows("""
    [
      {"id":"u0","role":"user","user_name":"Patrik","text":"Bring the native chat up to the web thread — avatars, author names, the blocks.","timestamp":"2026-08-10T18:28:00Z"},
      {"id":"a1","role":"assistant","agent":"director","text":"On it. The agent turns now carry a two-letter monogram and the author name above the bubble, matching the web mobile thread.","timestamp":"2026-08-10T18:29:00Z"},
      {"id":"a2","role":"assistant","agent":"director","text":"A run of my replies groups under one avatar — this second line drops the header so it reads as one voice.","timestamp":"2026-08-10T18:29:30Z"},
      {"id":"u1","role":"user","user_name":"Patrik","text":"Good. Show me a link card and a block too.","timestamp":"2026-08-10T18:31:00Z"},
      {"id":"a3","role":"assistant","agent":"director","text":"Here's the live proof page. https://www.aheadofmarket.com/dashboard","timestamp":"2026-08-10T18:31:40Z"},
      {"id":"a4","role":"assistant","agent":"director","text":"","timestamp":"2026-08-10T18:32:10Z","metadata":{"blocks":[{"type":"success","title":"Message-row parity","detail":"Avatar, author, bubble, timestamp — matched."},{"type":"data","title":"Recency window","rows":[1,2,3,4,5,6]}]}},
      {"id":"a5","role":"assistant","agent":"director","text":"Anything this build can't draw falls through to a labelled card instead of a blank bubble.","timestamp":"2026-08-10T18:32:40Z","metadata":{"blocks":[{"type":"whiteboard","title":"Unknown block kind"}]}}
    ]
    """)
}

// MARK: - Chat thread proof

/// The message thread on its own — the real MessageBubbleView rows with sender grouping,
/// a live "working" turn indicator, and a static replica of the shipped composer.
struct ChatPreviewHarness: View {
    private let rows = PreviewFixtures.chatRows

    private func opensGroup(_ i: Int) -> Bool {
        guard i > 0 else { return true }
        func key(_ r: MessageRow) -> String { r.isUser ? "__you" : r.displayName }
        return key(rows[i - 1]) != key(rows[i])
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: Theme.s3) {
                        ForEach(Array(rows.enumerated()), id: \.element.id) { i, row in
                            MessageBubbleView(row: row, room: nil, showsAuthor: opensGroup(i))
                        }
                        TurnIndicatorView(turn: .working(detail: "Checking the mobile renderer"))
                    }
                    .padding(.horizontal, Theme.s4)
                    .padding(.vertical, Theme.s3)
                }
                composerReplica
            }
            .background(Theme.ground)
            .navigationTitle("Design")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }

    // A visual replica of ChatView.composer for the proof (the real one needs a room +
    // view model). Same tokens, same two-row card, so the capture is faithful.
    private var composerReplica: some View {
        VStack(spacing: 10) {
            HStack(alignment: .bottom, spacing: 6) {
                Image(systemName: "paperclip")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 32, height: 32)
                Text("Message Design…")
                    .font(.hanken(16))
                    .foregroundStyle(Theme.inkFaint)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 7)
            }
            .padding(.leading, Theme.s1)
            .frame(minHeight: 40)
            .background(Theme.composerCard, in: RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))

            HStack(spacing: 6) {
                HStack(spacing: 7) {
                    Image(systemName: "sparkles").font(.system(size: 13, weight: .medium))
                    Text("Auto").font(.hanken(11.5).weight(.bold))
                }
                .foregroundStyle(Theme.inkSoft)
                .padding(.horizontal, 10)
                .frame(height: 30)
                .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))

                Image(systemName: "folder")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 34, height: 30)
                    .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))

                Spacer(minLength: 0)

                Image(systemName: "paperplane.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.inkFaint)
                    .frame(width: 34, height: 34)
                    .background(Theme.raised2, in: RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous))
                    .opacity(0.72)
            }
        }
        .padding(Theme.s2)
        .background(Theme.composer, in: RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))
        .shadow(color: .black.opacity(0.55), radius: 21, y: 9)
        .padding(.horizontal, Theme.s3)
        .padding(.bottom, Theme.s2)
    }
}

// MARK: - Home composer proof

/// The home timeline (reusing HomePreviewHarness's look) with the real HomeComposerBar
/// pinned at the bottom, so the front-door composer can be captured. The router has no
/// world here, so submit is inert — this proves the bar's render, not its routing.
struct HomeComposerPreviewHarness: View {
    @StateObject private var intake = IntakeRouter()

    var body: some View {
        HomePreviewHarness()
            .safeAreaInset(edge: .bottom, spacing: 0) {
                HomeComposerBar(intake: intake, candidates: { [:] }, recentRooms: { [] })
                    .background(Theme.ground)
            }
            .preferredColorScheme(.dark)
    }
}

/// The confirm sheet — the below-bar / unmatched branch — seeded with a fabricated
/// suggestion and a synthetic room list so the routing UI can be captured without a
/// network round-trip.
struct ConfirmPreviewHarness: View {
    @StateObject private var intake = IntakeRouter()

    private let rooms: [Room] = [
        Room(world: "aom", kind: .mission(slug: "corner:native-ios", project: "corner"), title: "Native iOS", subtitle: "Corner"),
        Room(world: "aom", kind: .project(slug: "outreach"), title: "Outreach", subtitle: "Project"),
        Room(world: "aom", kind: .mission(slug: "corner:room-organizer", project: "corner"), title: "Room Organizer", subtitle: "Corner"),
        Room(world: "aom", kind: .project(slug: "ambition-mechanical"), title: "Ambition Mechanical", subtitle: "Project"),
        Room(world: "aom", kind: .agent(slug: "director"), title: "Creative", subtitle: "Creative direction"),
    ]

    var body: some View {
        IntakeConfirmSheet(intake: intake, allRooms: rooms)
            .task {
                intake.previewSeed(
                    suggestion: rooms[0],
                    reasoning: "You've been cutting the native chat here all week.",
                    pendingText: "tighten the composer spacing on mobile"
                )
            }
            .preferredColorScheme(.dark)
    }
}
#endif
