// HomeComposerView.swift — Corner native iOS
// corner:bridge — the front-door (home) composer, matched to the web mobile intake bar.
//
// A room-LESS composer pinned to the home timeline: type a task, pick Work/Plan, send.
// The message goes through Corner's routing brain (POST /api/dashboard/intake-route) —
// the SAME endpoint and the SAME auto-open bar the web front door uses (useIntakeRoute,
// AUTO_ROUTE_CONFIDENCE 0.85) — and lands in the room it belongs to. On a confident
// match the room opens and the text is seeded automatically; below the bar, or when
// nothing fits, a confirm sheet lets the user place it. Nothing typed is ever lost.
//
// It deliberately does NOT reuse the room composer (ChatView's), which needs an open
// room, its attachment scope, and its outbox/turn machinery. Attachments and voice
// belong INSIDE a room, after routing — same split the web draws.

import SwiftUI

// MARK: - Routing brain contract (api/dashboard/intake-route.js response)

/// The authoritative target the router returns for a matched route. The server rebuilds
/// it from the candidate list and stamps the canonical `room_id`, so a hallucinated name
/// or id can never reach the client — the client only ever trusts `room_id`.
struct IntakeTarget: Decodable {
    let kind: String?
    let id: String?
    let name: String?
    let isProject: Bool?
    let isMission: Bool?
    let projectSlug: String?
    let missionSlug: String?
    let roomID: String?

    enum CodingKeys: String, CodingKey {
        case kind, id, name, isProject, isMission, projectSlug, missionSlug
        case roomID = "room_id"
    }

    /// The room this target names, parsed from the canonical `<world>:<kind>:<slug>`
    /// room_id — the one field the server derives and the client can trust.
    func resolveRoom() -> Room? {
        guard let roomID, !roomID.isEmpty else { return nil }
        return Room.parse(roomID: roomID, title: (name?.isEmpty == false) ? name : nil)
    }
}

struct IntakeDecision: Decodable {
    let route: String?
    let target: IntakeTarget?
    let confidence: Double?
    let source: String?
    let degraded: Bool?
    let reasoning: String?

    /// The web's auto-open bar, matched exactly (useIntakeRoute): a confident LLM match
    /// to an existing room, opened without asking. Everything else confirms first.
    var isAutoRoute: Bool {
        let r = route ?? ""
        return (r == "continue" || r == "existing")
            && target?.resolveRoom() != nil
            && source == "llm"
            && degraded != true
            && (confidence ?? 0) >= 0.85
    }
}

// MARK: - The router

/// The brain-to-room wiring, ported from cv6next/data/useIntakeRoute.js. Owns the
/// submit → route → (auto-open | confirm) flow and the pending text, so the composer
/// bar stays a dumb input.
@MainActor
final class IntakeRouter: ObservableObject {
    enum Phase: Equatable { case idle, routing }

    @Published private(set) var phase: Phase = .idle
    @Published var errorText: String?

    // Confirm-sheet state.
    @Published var showConfirm = false
    /// The below-bar routed target, if the router matched a room but under the auto bar.
    /// Nil means "nothing matched" → the sheet opens straight into the room picker.
    @Published private(set) var suggestion: Room?
    @Published private(set) var reasoning = ""
    @Published private(set) var pendingText = ""
    private var pendingMode = "work"

    private let api = CornerAPI.shared

    /// The one place a routed message opens a room. The host wires this to AppRouter.open.
    var onOpen: (Room) -> Void = { _ in }

    var isBusy: Bool { phase == .routing }

    /// Route a freeform message. `candidates` and `recentRooms` are the same payload the
    /// web assembles from Home's in-memory lists.
    func submit(text: String, mode: String, candidates: [String: Any], recentRooms: [[String: Any]]) {
        let body = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty, phase != .routing else { return }
        pendingText = body
        pendingMode = mode
        errorText = nil
        phase = .routing
        Task { [weak self] in
            guard let self else { return }
            do {
                let decision = try await self.api.routeIntake(
                    message: body, interactionMode: mode,
                    candidates: candidates, recentRooms: recentRooms
                )
                if decision.isAutoRoute, let room = decision.target?.resolveRoom() {
                    // Corner CHOSE this room — stamp the seed with the R11 provenance so
                    // room-activity quarantines the exchange out of the room's digest
                    // until the user accepts it. A room the user picks in the confirm
                    // sheet carries no stamp (openAndSeed's default nil).
                    await self.openAndSeed(room, routed: RouteProvenance(confidence: decision.confidence ?? 0))
                    return
                }
                // Below the auto bar, or unmatched → confirm before anything is sent.
                self.phase = .idle
                self.suggestion = decision.target?.resolveRoom()
                self.reasoning = decision.reasoning ?? ""
                self.showConfirm = true
            } catch {
                // Never lose the text: fall to the picker so the user can place it by hand.
                self.phase = .idle
                self.suggestion = nil
                self.reasoning = ""
                self.errorText = (error as? CornerAPI.APIError)?.errorDescription
                    ?? "Corner couldn't sort this automatically. Pick a room and it'll go."
                self.showConfirm = true
            }
        }
    }

    /// Open a room and seed the pending text into it, matching the web's openAndSeed —
    /// seed first so the row is already in the room's initial load, then navigate.
    ///
    /// `routed` is non-nil only on an AUTO-open (the router chose the room); a room the
    /// user picked in the confirm sheet passes nil, so it is never quarantined — the exact
    /// split seedRoom draws with its `auto` argument.
    func openAndSeed(_ room: Room, routed: RouteProvenance? = nil) async {
        let text = pendingText
        let mode = pendingMode
        guard !text.isEmpty else { reset(); return }
        do {
            _ = try await api.send(text: text, room: room, interactionMode: mode, routed: routed)
            reset()
            onOpen(room)
        } catch {
            errorText = (error as? CornerAPI.APIError)?.errorDescription ?? "Could not reach Corner."
            showConfirm = true
        }
    }

    func reset() {
        phase = .idle
        showConfirm = false
        suggestion = nil
        reasoning = ""
        pendingText = ""
        errorText = nil
    }

    #if DEBUG
    /// Seed the confirm state directly, for the no-network design proof only.
    func previewSeed(suggestion: Room?, reasoning: String, pendingText: String) {
        self.suggestion = suggestion
        self.reasoning = reasoning
        self.pendingText = pendingText
        self.showConfirm = true
    }
    #endif
}

// MARK: - The pinned bar

/// The intake bar itself: the growing input, the Work/Plan toggle, and the send button.
/// Visual match to the web IntakeComposer (cv6next/IntakeComposer.jsx). Kept on native
/// tokens rather than the web's blue accent — see the mission note on the accent fork.
struct HomeComposerBar: View {
    @ObservedObject var intake: IntakeRouter
    /// Rebuilt lazily on send so a room-list poll never rebinds the bar mid-type.
    let candidates: () -> [String: Any]
    let recentRooms: () -> [[String: Any]]

    @State private var text = ""
    /// Same semantic key the web persists the intake mode under (localStorage
    /// "cv6.chatMode.intake"); AppStorage is the native store, one setting per device.
    @AppStorage("cv6.chatMode.intake") private var mode = "work"
    @FocusState private var focused: Bool

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !intake.isBusy
    }
    private var isPlan: Bool { mode == "plan" }

    var body: some View {
        VStack(spacing: Theme.s2) {
            TextField("Type a task, a question, or a half-formed idea…", text: $text, axis: .vertical)
                .lineLimit(1...5)
                .focused($focused)
                .font(.body)
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, Theme.s3)
                .padding(.vertical, Theme.s3)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(focused ? Theme.accent.opacity(0.7) : Theme.hairline, lineWidth: 1)
                )

            HStack(spacing: Theme.s2) {
                Button {
                    mode = isPlan ? "work" : "plan"
                } label: {
                    Text(isPlan ? "Plan" : "Work")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(isPlan ? Theme.accent : Theme.inkSoft)
                        .padding(.horizontal, Theme.s3)
                        .frame(height: 32)
                        .background(
                            isPlan ? Theme.accentWeak : Theme.raised,
                            in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 9, style: .continuous)
                                .strokeBorder(isPlan ? Theme.accent.opacity(0.6) : Theme.hairline, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(isPlan ? "Plan mode. Switch to Work." : "Work mode. Switch to Plan.")

                Text(isPlan ? "Corner will propose a plan first" : "Corner will get started")
                    .font(.caption2)
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(1)

                Spacer(minLength: 0)

                Button(action: send) {
                    if intake.isBusy {
                        ProgressView().controlSize(.small).frame(width: 40, height: 40)
                    } else {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(canSend ? Color.white : Theme.inkFaint)
                            .frame(width: 40, height: 40)
                            .background(canSend ? Theme.accent : Theme.raised, in: Circle())
                            .overlay {
                                if !canSend { Circle().strokeBorder(Theme.hairline, lineWidth: 1) }
                            }
                    }
                }
                .disabled(!canSend)
                .accessibilityLabel("Send")
            }
        }
        .padding(Theme.s3)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Theme.raised.opacity(0.96))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .strokeBorder(Theme.hairline, lineWidth: 1)
                )
        )
        .padding(.horizontal, Theme.s3)
        .padding(.top, Theme.s2)
        .padding(.bottom, Theme.s1)
    }

    private func send() {
        guard canSend else { return }
        let payload = text
        focused = false
        intake.submit(text: payload, mode: mode, candidates: candidates(), recentRooms: recentRooms())
        // Clear immediately for a responsive feel. If routing needs a confirm, the sheet
        // holds the text (intake.pendingText); nothing is lost by clearing the box.
        text = ""
    }
}

// MARK: - The confirm sheet

/// The editable, non-blocking confirm — the native counterpart of IntakeConfirm.jsx.
/// A below-bar suggestion is offered for one tap; "Choose another room" (or a pure
/// no-match) drops into a searchable picker over every room the rail knows. Creating a
/// brand-new project or mission is deferred to the web for now (native has no creation
/// flow yet) and said so plainly rather than faked.
struct IntakeConfirmSheet: View {
    @ObservedObject var intake: IntakeRouter
    let allRooms: [Room]

    @State private var query = ""
    @State private var showPicker = false

    private var filtered: [Room] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return allRooms }
        return allRooms.filter {
            $0.title.localizedCaseInsensitiveContains(q) || $0.subtitle.localizedCaseInsensitiveContains(q)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s4) {
                    if let error = intake.errorText {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(Theme.warning)
                    }

                    if let room = intake.suggestion, !showPicker {
                        suggestionCard(room)
                    } else {
                        picker
                    }

                    if !intake.pendingText.isEmpty {
                        Text("“\(intake.pendingText)”")
                            .font(.footnote.italic())
                            .foregroundStyle(Theme.inkSoft)
                            .padding(.leading, Theme.s3)
                            .overlay(alignment: .leading) {
                                Rectangle().fill(Theme.hairline).frame(width: 2)
                            }
                    }
                }
                .padding(Theme.s4)
            }
            .background(Theme.ground)
            .navigationTitle("Where should this go?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { intake.reset() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func suggestionCard(_ room: Room) -> some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            Text("Looks like this belongs to")
                .font(.caption)
                .foregroundStyle(Theme.inkSoft)
            HStack(spacing: Theme.s2) {
                Text(room.title).font(.title3.weight(.bold)).foregroundStyle(Theme.ink)
                SheetTypeChip(room: room)
            }
            if !intake.reasoning.isEmpty {
                Text(intake.reasoning).font(.footnote).foregroundStyle(Theme.inkSoft)
            }
            Button {
                Task { await intake.openAndSeed(room) }
            } label: {
                Text("Open \(room.title)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.ground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Theme.accent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            Button {
                showPicker = true
            } label: {
                Text("Choose another room")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(Theme.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))
    }

    private var picker: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text("Send this into a room")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.ink)

            HStack(spacing: Theme.s2) {
                Image(systemName: "magnifyingglass").font(.footnote).foregroundStyle(Theme.inkFaint)
                TextField("Search rooms", text: $query)
                    .font(.body).foregroundStyle(Theme.ink)
            }
            .padding(.horizontal, Theme.s3)
            .padding(.vertical, 10)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))

            LazyVStack(spacing: Theme.s1) {
                ForEach(filtered.prefix(40)) { room in
                    Button {
                        Task { await intake.openAndSeed(room) }
                    } label: {
                        HStack(spacing: Theme.s3) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(room.title).font(.body.weight(.medium)).foregroundStyle(Theme.ink).lineLimit(1)
                                if !room.subtitle.isEmpty {
                                    Text(room.subtitle).font(.caption2).foregroundStyle(Theme.inkFaint).lineLimit(1)
                                }
                            }
                            Spacer(minLength: Theme.s2)
                            SheetTypeChip(room: room)
                        }
                        .padding(.horizontal, Theme.s3)
                        .padding(.vertical, Theme.s2 + 2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.raised.opacity(0.6), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }

            Text("Starting a brand-new project or mission happens on the web for now.")
                .font(.caption2)
                .foregroundStyle(Theme.inkFaint)
                .padding(.top, Theme.s1)
        }
    }
}

/// The PROJECT / MISSION / AGENT chip, in the confirm sheet's smaller register. Same
/// contract tones as the home timeline's chip.
private struct SheetTypeChip: View {
    let room: Room
    private var fg: Color {
        switch room.typeTag { case .project: Theme.violet; case .mission: Theme.teal; case .agent: Theme.accent }
    }
    private var bg: Color {
        switch room.typeTag { case .project: Theme.violetWeak; case .mission: Theme.tealWeak; case .agent: Theme.accentWeak }
    }
    var body: some View {
        Text(room.typeLabel)
            .font(.system(size: 9.5, weight: .bold))
            .tracking(0.6)
            .foregroundStyle(fg)
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .background(bg, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}
