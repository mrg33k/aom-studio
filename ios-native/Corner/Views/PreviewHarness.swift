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
      {"id":"f1","role":"user","user_name":"Patrik","text":"[FOLLOWUP TRIGGER — do not repeat this prefix in your reply] The scheduled check-in time has arrived (was: 2026-08-10T18:33:00Z). Report progress on the open work.","timestamp":"2026-08-10T18:33:00Z"},
      {"id":"a5","role":"assistant","agent":"director","text":"Anything this build can't draw falls through to a labelled card instead of a blank bubble.","timestamp":"2026-08-10T18:33:40Z","metadata":{"blocks":[{"type":"whiteboard","title":"Unknown block kind"}]}}
    ]
    """)

    /// Live steps for the progressive turn indicator — the same decoder the real
    /// steps endpoint feeds, so the card proof exercises MessageStep for real.
    static func steps(_ json: String) -> [MessageStep] {
        guard let data = json.data(using: .utf8),
              let steps = try? JSONDecoder().decode([MessageStep].self, from: data) else { return [] }
        return steps
    }

    static let turnSteps: [MessageStep] = steps("""
    [
      {"id":"s1","parent_message_id":"u1","step_index":0,"text":"Picking this up"},
      {"id":"s2","parent_message_id":"u1","step_index":1,"text":"Reading the room's canon"},
      {"id":"s3","parent_message_id":"u1","step_index":2,"text":"Rendering the mobile thread against the web tokens"}
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
                    }
                    .padding(.horizontal, Theme.s4)
                    .padding(.vertical, Theme.s3)
                }
                // Open at the tail like the real thread, so the capture shows the
                // newest rows — including the follow-up check-in chip.
                .defaultScrollAnchor(.bottom)
                // The progressive working state, pinned above the composer exactly
                // as ChatView places it: elapsed clock counting from 2m10s ago,
                // real steps with the latest highlighted.
                TurnIndicatorView(
                    turn: .working(detail: PreviewFixtures.turnSteps.last?.text),
                    steps: PreviewFixtures.turnSteps,
                    startedAt: Date().addingTimeInterval(-130)
                )
                .padding(.horizontal, Theme.s3)
                .padding(.bottom, Theme.s2)
                composerReplica
            }
            .groundBackground()
            .navigationTitle("Design")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(ThemeManager.shared.colorScheme)
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

            // The consolidated action row: ONE commands chip (mode + model + files
            // live behind it), the checklist toggle, send. Matches ChatView.actionRow.
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

                Image(systemName: "checklist")
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

// MARK: - Turn states proof (R18 N1)

/// Every word the room can say, and the three faces of the pre-step indicator —
/// one frame, so the status vocabulary ships with its visual proof. The pill rows
/// replicate the chat header's status line exactly (6pt dot + 10.5 medium label,
/// live vs blocked tone); the cards are the REAL TurnIndicatorView.
struct TurnStatesPreviewHarness: View {
    private let statuses: [RoomStatus] = [.thinking, .working, .streaming, .stopping, .needsYou, .stuck]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s3) {
                    Text("THE ONE STATUS VOCABULARY")
                        .font(.hanken(11).weight(.bold))
                        .foregroundStyle(Theme.inkFaint)
                    ForEach(statuses, id: \.self) { status in
                        HStack(spacing: Theme.s3) {
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(status.tone == .blocked ? Theme.warning : Theme.live)
                                    .frame(width: 6, height: 6)
                                Text(status.label)
                                    .font(.hanken(10.5).weight(.medium))
                                    .foregroundStyle(status.tone == .blocked ? Theme.warning : Theme.live)
                            }
                            Spacer()
                            Text(status.rawValue)
                                .font(.hanken(10))
                                .foregroundStyle(Theme.inkFaint)
                        }
                        .padding(.horizontal, Theme.s3)
                        .padding(.vertical, 6)
                        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }

                    Text("OPENERS — FIRST 8 SECONDS")
                        .font(.hanken(11).weight(.bold))
                        .foregroundStyle(Theme.inkFaint)
                        .padding(.top, Theme.s3)
                    TurnIndicatorView(
                        turn: .working(detail: nil), steps: [],
                        startedAt: Date().addingTimeInterval(-4), healthState: "accepted"
                    )

                    Text("WAKING — ACCEPTED, NO STEP AFTER 8s")
                        .font(.hanken(11).weight(.bold))
                        .foregroundStyle(Theme.inkFaint)
                        .padding(.top, Theme.s3)
                    TurnIndicatorView(
                        turn: .working(detail: nil), steps: [],
                        startedAt: Date().addingTimeInterval(-23), healthState: "accepted"
                    )

                    Text("WORKING — REAL STEPS")
                        .font(.hanken(11).weight(.bold))
                        .foregroundStyle(Theme.inkFaint)
                        .padding(.top, Theme.s3)
                    TurnIndicatorView(
                        turn: .working(detail: PreviewFixtures.turnSteps.last?.text),
                        steps: PreviewFixtures.turnSteps,
                        startedAt: Date().addingTimeInterval(-130)
                    )
                }
                .padding(Theme.s4)
            }
            .groundBackground()
            .navigationTitle("Turn states")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(ThemeManager.shared.colorScheme)
    }
}

// MARK: - Stop + recovery proof (R18 N2)

/// The stop control's two faces on the real card, the honesty strip, and the three
/// recovery notices — one frame, real components.
struct StopRecoveryPreviewHarness: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s3) {
                    caption("WORKING — STOP READY")
                    TurnIndicatorView(
                        turn: .working(detail: PreviewFixtures.turnSteps.last?.text),
                        steps: PreviewFixtures.turnSteps,
                        startedAt: Date().addingTimeInterval(-95),
                        stopControl: .ready
                    )

                    caption("STOP ASKED — STOPPING")
                    TurnIndicatorView(
                        turn: .working(detail: PreviewFixtures.turnSteps.last?.text),
                        steps: PreviewFixtures.turnSteps,
                        startedAt: Date().addingTimeInterval(-101),
                        stopControl: .stopping
                    )

                    caption("UNCONFIRMED — THE HONESTY STRIP")
                    HStack(spacing: Theme.s2) {
                        Image(systemName: "exclamationmark.circle").font(.system(size: 12))
                        Text("Couldn't confirm the stop — the turn may still be running.")
                            .font(.hkCaption)
                        Spacer(minLength: 0)
                        Text("Dismiss").font(.hkCaption.weight(.semibold))
                    }
                    .foregroundStyle(Theme.warning)
                    .padding(.horizontal, Theme.s3)
                    .padding(.vertical, Theme.s2)
                    .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                            .strokeBorder(Theme.warning.opacity(0.35), lineWidth: 1)
                    )

                    caption("STUCK — RESTARTABLE CAUSE")
                    RoomRecoveryNoticeView(
                        health: RoomHealth(state: "needs_attention", cause: "runner_failed", repaired: false)
                    )

                    caption("NEEDS YOU — AGENT SILENT")
                    RoomRecoveryNoticeView(
                        health: RoomHealth(state: "needs_attention", cause: "agent_silent", repaired: false),
                        canResend: true
                    )

                    caption("REPAIR GAVE UP — START FRESH OFFERED")
                    RoomRecoveryNoticeView(
                        health: RoomHealth(state: "needs_attention", cause: "settled_without_reply",
                                           repaired: false, repairCount: 3, suggestedAction: "room_reset")
                    )
                }
                .padding(Theme.s4)
            }
            // `-tail` flips the capture to the bottom of the sheet so the cards
            // below the first fold get their own judged frame.
            .defaultScrollAnchor(
                ProcessInfo.processInfo.arguments.contains("-tail") ? .bottom : .top
            )
            .groundBackground()
            .navigationTitle("Stop + recovery")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(ThemeManager.shared.colorScheme)
    }

    private func caption(_ text: String) -> some View {
        Text(text)
            .font(.hanken(11).weight(.bold))
            .foregroundStyle(Theme.inkFaint)
            .padding(.top, Theme.s2)
    }
}

// MARK: - Streaming draft proof (R18 N3)

/// The live partial reply as the user sees it mid-write: the last exchange, the
/// draft bubble with its caret, and the work card pinned under it with the Stop
/// control — the whole "the agent is writing" moment in one frame.
struct StreamingPreviewHarness: View {
    private let rows: [MessageRow] = PreviewFixtures.rows("""
    [
      {"id":"u0","role":"user","user_name":"Patrik","text":"Walk me through what the smoothness pass changes on the phone.","timestamp":"2026-08-12T20:41:00Z"}
    ]
    """)

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: Theme.s3) {
                        ForEach(rows) { row in
                            MessageBubbleView(row: row, room: nil, showsAuthor: true)
                        }
                        StreamingDraftBubble(
                            authorTitle: "Assistant",
                            text: "Three things change the feel: replies now stream in as they are written instead of landing whole, the room always says one honest word about what it is doing, and a running turn can be stopped from the card below. The text you are reading is the draft bubble doing exactly"
                        )
                    }
                    .padding(.horizontal, Theme.s4)
                    .padding(.vertical, Theme.s3)
                }
                .defaultScrollAnchor(.bottom)
                TurnIndicatorView(
                    turn: .working(detail: "Writing the reply"),
                    steps: PreviewFixtures.steps("""
                    [
                      {"id":"s1","parent_message_id":"u0","step_index":0,"text":"Picking this up","phase":"thinking"},
                      {"id":"s2","parent_message_id":"u0","step_index":1,"text":"Writing the reply","phase":"streaming"}
                    ]
                    """),
                    startedAt: Date().addingTimeInterval(-41),
                    stopControl: .ready
                )
                .padding(.horizontal, Theme.s3)
                .padding(.bottom, Theme.s2)
            }
            .groundBackground()
            .navigationTitle("Writing")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(ThemeManager.shared.colorScheme)
    }
}

// MARK: - Scroll brain proof (R18 N4)

/// The reading-history moment: the thread scrolled up (top-anchored here), the
/// REAL JumpToLatestPill riding the scroll container's bottom edge — the state
/// rule 3 exists for. No live turn in frame: the pill never shows during one.
struct ScrollPreviewHarness: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Theme.s3) {
                    ForEach(Array(PreviewFixtures.chatRows.enumerated()), id: \.element.id) { i, row in
                        MessageBubbleView(row: row, room: nil, showsAuthor: i == 0 || PreviewFixtures.chatRows[i - 1].isUser != row.isUser)
                    }
                }
                .padding(.horizontal, Theme.s4)
                .padding(.vertical, Theme.s3)
            }
            .defaultScrollAnchor(.top)
            .overlay(alignment: .bottom) {
                JumpToLatestPill()
                    // The real view floats the pill above the composer band; the
                    // harness has no composer, so reserve its height to keep the
                    // proof faithful to the shipped offset.
                    .padding(.bottom, Theme.s3 + 58)
            }
            .groundBackground()
            .navigationTitle("Reading history")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(ThemeManager.shared.colorScheme)
    }
}

// MARK: - Live Activity proof (R18 N7)

/// Starts a FIXTURE running-turn Live Activity on launch so the capture can
/// background the app and photograph the Dynamic Island / lock screen banner.
/// Fixture data only; no network, no auth.
struct LiveActivityPreviewHarness: View {
    @State private var started = false

    var body: some View {
        VStack(spacing: Theme.s4) {
            Image(systemName: started ? "checkmark.circle" : "hourglass")
                .font(.system(size: 40))
                .foregroundStyle(started ? Theme.live : Theme.inkSoft)
            Text(started
                 ? "Live Activity started — background the app and look at the Dynamic Island."
                 : "Starting the fixture Live Activity…")
                .font(.hkFootnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.s6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .groundBackground()
        .task {
            TurnActivityService.shared.turnBegan(
                roomTitle: "Native iOS",
                ask: "Ship the smoothness pass"
            )
            try? await Task.sleep(for: .seconds(1))
            TurnActivityService.shared.update(
                statusWord: "Working",
                stepLabel: "Rendering the mobile thread against the web tokens",
                startedAt: Date().addingTimeInterval(-127)
            )
            started = true
        }
        .preferredColorScheme(ThemeManager.shared.colorScheme)
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
            .preferredColorScheme(ThemeManager.shared.colorScheme)
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
            .preferredColorScheme(ThemeManager.shared.colorScheme)
    }
}
#endif
