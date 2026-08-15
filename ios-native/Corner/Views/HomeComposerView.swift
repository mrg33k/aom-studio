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
// room, its attachment scope, and its outbox/turn machinery. Attachments belong
// INSIDE a room, after routing — same split the web draws. Voice dictation, though,
// lives right here (R7): the web's mobile bar puts a mic on the front door, so the
// native front door carries one too — SpeechService streams the transcript into this
// bar's text field and the routed send path stays exactly the same.

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
    /// Bumped by the top bar's voice chip — each change starts dictation here,
    /// so "voice" in the navigation lands the user talking into the composer.
    var voiceTrigger: Int = 0

    @State private var text = ""
    /// Same semantic key the web persists the intake mode under (localStorage
    /// "cv6.chatMode.intake"); AppStorage is the native store, one setting per device.
    @AppStorage("cv6.chatMode.intake") private var mode = "work"
    @FocusState private var focused: Bool

    @StateObject private var speech = SpeechService()
    /// The draft as it stood when the mic was tapped; each partial transcript is
    /// appended to THIS, so dictation adds to what was typed instead of replacing it.
    @State private var dictationBase = ""

    /// The web dictation red — `var(--danger, #e5484d)` on the mic and recording chip
    /// (ChatLifecycle.jsx / Cv6InputBar.jsx). Deliberately not Theme.danger: this is
    /// the one place CV6 uses the raw fallback value, and the phone matches it.
    private static let dictationRed = Color(cv6: 0xE5484D)

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !intake.isBusy
    }
    private var isPlan: Bool { mode == "plan" }

    var body: some View {
        VStack(spacing: Theme.s2) {
            if speech.isListening {
                listeningChip
            } else if speech.guidance != nil {
                guidanceRow
            }

            TextField(
                speech.isListening ? "Listening…" : "Type a task, a question, or a half-formed idea…",
                text: $text, axis: .vertical
            )
                .lineLimit(1...5)
                .focused($focused)
                .font(.hkBody)
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, Theme.s3)
                .padding(.vertical, 14)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(focused ? Theme.accent.opacity(0.7) : Theme.hairline, lineWidth: 1)
                )
                .scaleEffect(focused ? 1.005 : 1)
                .animation(.spring(response: 0.22, dampingFraction: 0.78), value: focused)

            HStack(spacing: Theme.s2) {
                Button {
                    mode = isPlan ? "work" : "plan"
                } label: {
                    Text(isPlan ? "Plan" : "Work")
                        .font(.hkCaption.weight(.bold))
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
                    .font(.hkCaption2)
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(1)

                Spacer(minLength: 0)

                // The mic, in the web mobile bar's slot (left of send). Collapses when typing so Send owns the thumb zone — iOS-like.
                if speech.supported {
                    Button(action: toggleDictation) {
                        Image(systemName: speech.isListening ? "mic.fill" : "mic")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(speech.isListening ? Color.white : Theme.inkSoft)
                            .frame(width: 40, height: 40)
                            .background(speech.isListening ? Self.dictationRed : Theme.raised, in: Circle())
                            .overlay {
                                if !speech.isListening { Circle().strokeBorder(Theme.hairline, lineWidth: 1) }
                            }
                            .background {
                                if speech.isListening {
                                    Circle().fill(Self.dictationRed.opacity(0.18)).padding(-4)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .frame(width: canSend ? 0 : 40, height: 40)
                    .opacity(canSend ? 0 : 1)
                    .scaleEffect(canSend ? 0.8 : 1)
                    .clipped()
                    .allowsHitTesting(!canSend)
                    .animation(.spring(response: 0.28, dampingFraction: 0.72), value: canSend)
                    .accessibilityLabel(speech.isListening ? "Stop dictation" : "Speak your message")
                    .accessibilityHidden(canSend)
                }

                Button(action: send) {
                    if intake.isBusy {
                        ProgressView().controlSize(.small).frame(width: 44, height: 44)
                    } else {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(canSend ? Color.white : Theme.inkFaint)
                            .frame(width: 44, height: 44)
                            .background(canSend ? Theme.accent : Theme.raised, in: RoundedRectangle(cornerRadius: canSend ? 14 : 11, style: .continuous))
                            .overlay {
                                if !canSend { RoundedRectangle(cornerRadius: 11, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1) }
                            }
                            .shadow(color: canSend ? Theme.accent.opacity(0.28) : .clear, radius: 6, y: 3)
                    }
                }
                .frame(width: 44, height: 44)
                .scaleEffect(canSend ? 1 : 0.92)
                .opacity(canSend ? 1 : 0.42)
                .animation(.spring(response: 0.28, dampingFraction: 0.72), value: canSend)
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
        // The top bar's voice chip lands here: each bump starts dictation (never
        // stops it — stopping stays an explicit tap on the mic or the chip).
        .onChange(of: voiceTrigger) { _, _ in
            if speech.supported, !speech.isListening { toggleDictation() }
        }
        #if DEBUG
        .onAppear {
            // Design-proof rig only: the PreviewHarness launches force the recording /
            // denied visuals so they can be captured without a live mic session.
            let args = ProcessInfo.processInfo.arguments
            if args.contains("-composerListeningPreview") { speech.previewForceListening() }
            if args.contains("-composerDeniedPreview") { speech.previewForceDenied() }
        }
        #endif
    }

    /// The web's recording chip (Cv6InputBar.jsx): pulsing dot + "tap to stop", the
    /// whole chip a stop button. Sits above the input, where the web pins its chips.
    private var listeningChip: some View {
        Button(action: toggleDictation) {
            HStack(spacing: 7) {
                PulsingDot(color: Self.dictationRed)
                Text("Listening… tap to stop")
                    .font(.hanken(11.5).weight(.semibold))
            }
            .foregroundStyle(Self.dictationRed)
            .padding(.horizontal, 10)
            .frame(height: 26)
            .background(Self.dictationRed.opacity(0.14), in: Capsule())
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityLabel("Stop dictation")
    }

    /// Permission guidance — a denied mic never turns into a button that does nothing.
    /// Names what is off, offers the jump to Settings, dismissible with the ✕.
    private var guidanceRow: some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "mic.slash.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Self.dictationRed)
            Text(speech.guidance?.text ?? "")
                .font(.hkCaption)
                .foregroundStyle(Theme.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: Theme.s2)
            if speech.guidance?.needsSettings == true {
                Button {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Text("Open Settings")
                        .font(.hkCaption.weight(.bold))
                        .foregroundStyle(Theme.accent)
                }
                .buttonStyle(.plain)
            }
            Button { speech.clearGuidance() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Theme.inkFaint)
                    .frame(width: 22, height: 22)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(Self.dictationRed.opacity(0.10), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func toggleDictation() {
        if speech.isListening {
            speech.stop()
            return
        }
        // Append after whatever is typed; the base is frozen at mic-tap, so each
        // partial replaces only the dictated tail, never the typed text.
        dictationBase = SpeechService.dictationBase(for: text)
        speech.toggle { transcript in
            text = dictationBase + transcript
        }
    }

    private func send() {
        guard canSend else { return }
        // Sending while the mic is hot ends the session — the field holds the last
        // partial the user just read, and a dead mic must not keep streaming into
        // a box that was just cleared.
        if speech.isListening { speech.stop() }
        let payload = text
        focused = false
        intake.submit(text: payload, mode: mode, candidates: candidates(), recentRooms: recentRooms())
        // Clear immediately for a responsive feel. If routing needs a confirm, the sheet
        // holds the text (intake.pendingText); nothing is lost by clearing the box.
        text = ""
    }
}

/// The web's `statPulse` dot, in SwiftUI: a 7pt disc breathing between full and dim.
private struct PulsingDot: View {
    let color: Color
    @State private var dim = false

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 7, height: 7)
            .opacity(dim ? 0.3 : 1)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true)) { dim = true }
            }
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
                            .font(.hkFootnote)
                            .foregroundStyle(Theme.warning)
                    }

                    if let room = intake.suggestion, !showPicker {
                        suggestionCard(room)
                    } else {
                        picker
                    }

                    if !intake.pendingText.isEmpty {
                        Text("“\(intake.pendingText)”")
                            .font(.hkFootnote.italic())
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
                .font(.hkCaption)
                .foregroundStyle(Theme.inkSoft)
            HStack(spacing: Theme.s2) {
                Text(room.title).font(.hkTitle3.weight(.bold)).foregroundStyle(Theme.ink)
                SheetTypeChip(room: room)
            }
            if !intake.reasoning.isEmpty {
                Text(intake.reasoning).font(.hkFootnote).foregroundStyle(Theme.inkSoft)
            }
            Button {
                Task { await intake.openAndSeed(room) }
            } label: {
                Text("Open \(room.title)")
                    .font(.hkSubheadline.weight(.semibold))
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
                    .font(.hkSubheadline.weight(.medium))
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
                .font(.hkSubheadline.weight(.semibold))
                .foregroundStyle(Theme.ink)

            HStack(spacing: Theme.s2) {
                Image(systemName: "magnifyingglass").font(.hkFootnote).foregroundStyle(Theme.inkFaint)
                TextField("Search rooms", text: $query)
                    .font(.hkBody).foregroundStyle(Theme.ink)
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
                                Text(room.title).font(.hkBody.weight(.medium)).foregroundStyle(Theme.ink).lineLimit(1)
                                if !room.subtitle.isEmpty {
                                    Text(room.subtitle).font(.hkCaption2).foregroundStyle(Theme.inkFaint).lineLimit(1)
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
                .font(.hkCaption2)
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
            .font(.hanken(9.5).weight(.bold))
            .tracking(0.6)
            .foregroundStyle(fg)
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .background(bg, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}
