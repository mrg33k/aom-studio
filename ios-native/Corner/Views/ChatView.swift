// ChatView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// The core screen. All the judgement lives in ChatViewModel; this file is the shape
// of it — and the two rows that matter most are the ones most chat UIs do not have:
// a failed send that is still on screen with a way to retry, and a stalled turn that
// says it stopped instead of quietly dropping its spinner.

import SwiftUI
import PhotosUI
import UniformTypeIdentifiers
import UIKit

// MARK: - Paste chip model
// Mirrors the web's shouldChipPaste threshold: > 1000 chars OR > 15 lines.
// The chip collapses a long paste into a dismissible token above the composer,
// exactly matching Cv6InputBar + PasteChip.jsx.

fileprivate struct PasteChip: Identifiable, Equatable {
    let id: UUID
    let text: String
    let lineCount: Int

    static func make(from text: String) -> PasteChip {
        PasteChip(id: UUID(), text: text, lineCount: text.components(separatedBy: "\n").count)
    }

    /// Web threshold: > 1000 chars OR > 15 lines.
    static func shouldChip(_ text: String) -> Bool {
        text.count > 1000 || text.components(separatedBy: "\n").count > 15
    }
}

/// Extract the text inserted between `old` and `new` using longest-common-prefix/suffix.
/// Returns nil when no clear insertion is found (e.g. deletion).
fileprivate func extractInserted(old: String, new: String) -> String? {
    guard new.count > old.count else { return nil }
    var prefixEnd = old.startIndex
    var newPrefixEnd = new.startIndex
    while prefixEnd < old.endIndex, newPrefixEnd < new.endIndex,
          old[prefixEnd] == new[newPrefixEnd] {
        prefixEnd = old.index(after: prefixEnd)
        newPrefixEnd = new.index(after: newPrefixEnd)
    }
    var oldSufEnd = old.endIndex
    var newSufEnd = new.endIndex
    while oldSufEnd > prefixEnd, newSufEnd > newPrefixEnd {
        let oPrev = old.index(before: oldSufEnd)
        let nPrev = new.index(before: newSufEnd)
        guard old[oPrev] == new[nPrev] else { break }
        oldSufEnd = oPrev
        newSufEnd = nPrev
    }
    let inserted = String(new[newPrefixEnd..<newSufEnd])
    return inserted.isEmpty ? nil : inserted
}

/// Corner v2 conversation context (native Task 4): one surface for both
/// project and mission threads. R23 P071: the title is the mission name only
/// (`Spring launch deck`), the project living on the 12.5px line above —
/// never `Project / Mission` twice. Message rendering is untouched beyond
/// these inputs — Task 5 rewires the model.
struct V2ChatContext {
    let thread: Thread
    let project: ProjectSummary
    let mission: MissionSummary?

    var title: String {
        if let mission { return mission.title }
        return project.name
    }

    /// Compatibility room for the legacy model until Task 5 replaces it with
    /// the v2 event subscription. Never leaves the device as identity: sends
    /// still go through the model's existing transport. Its title keeps the
    /// `Project / Mission` shape so legacy-model identity (and draft keys)
    /// never shifts under the displayed title.
    var compatRoom: Room {
        if let mission {
            Room(
                world: "v2",
                kind: .mission(slug: mission.id, project: project.id),
                title: "\(project.name) / \(mission.title)",
                subtitle: project.name
            )
        } else {
            Room(world: "v2", kind: .project(slug: project.id), title: title, subtitle: "Project")
        }
    }
}

struct ChatView: View {
    @StateObject private var model: ChatViewModel
    /// Corner v2 conversation model (native Task 5). Inert on the legacy
    /// path; the v2 path below is the only thing that ever starts it.
    @StateObject private var v2model: V2ChatModel
    /// Corner v2 Visual Window state (native Task 7). Owned per thread: the
    /// server session is the durable copy, so a rebuild restores via load().
    /// Inert on the legacy path.
    @StateObject private var window: VisualWindowStore
    /// Corner v2 review checklist (native Task 8): pins per artifact, capped
    /// at four, submitted once per Send. Inert on the legacy path.
    @StateObject private var v2review: V2ReviewStore
    /// Dictation for the v2 Record chip (P023): streams into the draft.
    @StateObject private var speech = SpeechService()
    @State private var dictationBase = ""
    // ── R28 composer parity (v2 pill) ──────────────────────────────────────
    // Talk aloud is per-thread state owned by the service; the view holds it
    // once the thread is known (onAppear) so the toggle and the speak-on-
    // reply trigger share one instance.
    @State private var talkAloud: V2TalkAloud?
    /// The armed reply-to quote (long-press a message → Reply). Rides the
    /// next send as the `replyTo` block field, then clears.
    @State private var v2ReplyQuote: V2ReplyQuote?
    /// A hardware Shift+Return just inserted a newline: the soft-Return
    /// submit detector stands down for that one change.
    @State private var v2AllowNewlineOnce = false
    /// The server clear failed: the tray names it plainly with a retry.
    @State private var v2ClearFailed = false
    /// `/` hints inline and submits to the commands sheet (same rows).
    @State private var v2ShowingSlash = false
    /// Model/specialist pickers inside the slash sheet.
    @State private var v2SlashPicking: V2SlashCommand.ID?
    /// `/clear` (and the sheet's Clear row) confirm before anything clears.
    @State private var v2ShowingClearConfirm = false
    /// Generate-an-image prompt sheet (empty-field path).
    @State private var v2ShowingImagePrompt = false
    @State private var v2ImagePromptText = ""
    /// In-flight image-tab opens, keyed by run id, so Stop cancels them.
    @State private var v2ImageTasks: [String: Task<Void, Never>] = [:]
    /// R40 (L030/L032): identity-keyed follow state for the v2 thread —
    /// first paint lands at the bottom, a send pins there, arrivals while
    /// scrolled up raise the pill. The distance feeds it from the
    /// thread's geometry preference (the legacy brain's twin).
    @State private var v2Follow = V2FollowState()
    @State private var v2DistanceFromBottom: CGFloat = 0
    @State private var v2ViewportHeight: CGFloat = 0
    /// The first row id before an "Earlier messages" expansion: after the
    /// wider window lands, the scroll returns to it — the read holds.
    @State private var v2HeldTopID: String?
    /// v2 attach: photo library / files / camera, multiple.
    @State private var v2ShowingPhotoPicker = false
    @State private var v2ShowingFilePicker = false
    @State private var v2PickedPhotos: [PhotosPickerItem] = []
    @State private var v2ShowingCamera = false
    @State private var v2AttachNotice: String?
    @StateObject private var review = ReviewStore.shared
    @EnvironmentObject private var router: AppRouter
    @Environment(\.scenePhase) private var scenePhase
    /// Set only by the v2 initializer; nil on the legacy room path.
    private let v2: V2ChatContext?

    @State private var showingFiles = false
    @State private var showingPhotoPicker = false
    @State private var showingFilePicker = false
    @State private var pickedPhotos: [PhotosPickerItem] = []
    @FocusState private var composerFocused: Bool

    // R5 chat-header parity
    @State private var isSearching = false
    @State private var searchQuery = ""
    @FocusState private var searchFocused: Bool
    @State private var showingSettings = false
    @State private var showingImageGenerator = false
    @State private var showingRename = false
    @State private var highlightedMessageID: String?
    @State private var resolvingMessageFocusID: UUID?
    @State private var messageFocusNotice: String?

    // ── Paste chips (composer extras R6) ─────────────────────────────────────
    // Long pastes (>1000 chars or >15 lines) collapse into removable chips above
    // the input shell. Their text is appended to the message body on send, matching
    // Cv6InputBar + PasteChip.jsx exactly.
    @State private var pasteChips: [PasteChip] = []
    @State private var previewingChip: PasteChip? = nil

    // ── /clear confirm (composer extras R6) ──────────────────────────────────
    @State private var showingClearConfirm = false
    @State private var clearBusy = false
    @State private var clearFailed = false

    // ── Checklist panel (R11) ────────────────────────────────────────────────
    // When checklistOpen, the input shell is replaced by RoomChecklistPanelView.
    // Mirrors web's checklistOpen state in Cv6InputBar: the composer card stays
    // visible with its action row (model pill, checklist toggle, send) while the
    // input area swaps to the checklist panel.
    @State private var checklistOpen = false

    // ── The one scroll brain (R18 N4) ────────────────────────────────────────
    // All scroll decisions run through ScrollBrain; the view only measures and
    // performs. distanceFromBottom is fed by the thread's geometry preference.
    @State private var scrollBrain = ScrollBrain()
    @State private var distanceFromBottom: CGFloat = 0
    @State private var scrollViewportHeight: CGFloat = 0
    @State private var showJump = false
    /// Snapshot the read receipt before this room marks itself read. It pins the one
    /// "New" boundary for this visit even as live receipts advance underneath it.
    @State private var readCutoffOnOpen: Double?
    @State private var capturedReadCutoff = false

    /// Computed ONCE per thread render and handed down to every bubble, rather than each
    /// bubble subscribing to the review store itself.
    private var waitingIDs: Set<String> { review.waitingIDs }

    init(room: Room) {
        _model = StateObject(wrappedValue: ChatViewModel(room: room))
        _v2model = StateObject(wrappedValue: V2ChatModel())
        _window = StateObject(wrappedValue: VisualWindowStore(api: WorkspaceStore.shared.v2api, visualSessionID: "legacy"))
        _v2review = StateObject(wrappedValue: V2ReviewStore(api: WorkspaceStore.shared.v2api))
        v2 = nil
    }

    /// Corner v2 initializer: a `Thread` plus its owning summaries. One
    /// surface for project and mission conversations alike. The v2 model and
    /// the Visual Window share the workspace store's backend (fixture stub
    /// under test).
    init(thread: Thread, project: ProjectSummary, mission: MissionSummary?) {
        let context = V2ChatContext(thread: thread, project: project, mission: mission)
        _model = StateObject(wrappedValue: ChatViewModel(room: context.compatRoom))
        _v2model = StateObject(wrappedValue: V2ChatModel(api: WorkspaceStore.shared.v2api))
        _window = StateObject(wrappedValue: VisualWindowStore(api: WorkspaceStore.shared.v2api, visualSessionID: thread.visualSessionID))
        _v2review = StateObject(wrappedValue: V2ReviewStore(api: WorkspaceStore.shared.v2api))
        v2 = context
    }

    /// The header title: `Project` for a project thread, the mission name only
    /// for a mission thread (R23 P071), the room title on the legacy path.
    private var displayTitle: String { v2?.title ?? model.room.title }

    private var draftStorageKey: String { "chatDraft.\(model.room.roomID)" }

    var body: some View {
        if v2 != nil {
            v2Screen
        } else {
            legacyBody
        }
    }

    // MARK: - Corner v2 conversation screen (native Task 5)

    /// One surface for Project and Mission threads: titled events with
    /// visible agent labels, an offline queue banner, and a composer whose
    /// `@brain` suggestions route server-side. No agent rooms, no specialist
    /// menu, no navigation state — a send never leaves this thread.
    private var v2Screen: some View {
        VisualWindowHost(
            main: { v2Main },
            onCarryOn: { text in
                v2model.startSend(text)
            },
            statusText: v2LastAgentText,
            projectName: v2?.project.name ?? ""
        )
            .environmentObject(window)
            .environmentObject(v2review)
    }

    /// P054: the sheet's status card shows the latest agent line — real
    /// thread content, never a mock. Nil (no agent text yet) hides the card.
    private var v2LastAgentText: String? {
        for event in v2model.events.reversed() where event.author == .agent {
            for block in event.blocks {
                if case .text(let value) = block,
                   !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    return value
                }
            }
        }
        return nil
    }

    /// R17 P031: the design draws its own 52px nav bar (hamburger, centred
    /// title block, status dot) instead of the system toolbar, so the metrics
    /// match the export and the hamburger opens the drawer. Swipe-back still
    /// pops to the home tree; the drawer is the forward path.
    @State private var v2ShowingDrawer = false

    /// The chat column itself; the host lays the Visual Window beside it on
    /// iPad and over it as a sheet on iPhone. Same store, same selection.
    private var v2Main: some View {
        VStack(spacing: 0) {
            v2NavBar
            v2ThreadList
            if let confirmation = v2model.pendingConfirmation {
                v2ConfirmationCard(confirmation)
            }
            if let decision = v2model.lastDecision, v2ShowsRouteCard(decision) {
                v2RouteCard(decision)
            }
            if !v2model.ledgerProvenance.isEmpty {
                v2SourcesSection
            }
            switch v2model.sendBanner {
            case .none:
                EmptyView()
            case .offline:
                v2OfflineBanner
            case .notSent(let count, let reason):
                v2NotSentBanner(count: count, reason: reason)
            }
            v2Composer
        }
        // P077: the thread ground is the flat `--ground`, never the glass
        // wallpaper's gradient glow (the design thread is flat #0f1319).
        .flatGroundBackground()
        .onReceive(NotificationCenter.default.publisher(for: .v2DidReconnect)) { _ in
            // R24 P075: the network came back while foregrounded — flush.
            Task { await v2model.foreground() }
        }
        // NOTE: no identifier anywhere on this screen's main subtree — an
        // identifier on ANY ancestor view overwrites every identified control
        // below it (measured: with one on the root, the composer field and
        // the send button both read back as the container's id). The screen
        // marker lives on the nav title, a leaf in a separate subtree.
        .toolbar(.hidden, for: .navigationBar)
        .overlay {
            if v2ShowingDrawer {
                V2DrawerView(isPresented: $v2ShowingDrawer, currentThreadID: v2?.thread.id)
            }
        }
        // R19: the commands menu's generator on the v2 path — the same sheet
        // the legacy composer presents. Generation + save/share work; staging
        // into the v2 thread waits on a send-attachments field.
        .sheet(isPresented: $showingImageGenerator) {
            ImageGeneratorSheet(model: model)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        // R28: `/` opens the commands as a sheet (same rows, new host).
        .sheet(isPresented: $v2ShowingSlash) {
            V2SlashSheet(
                draft: v2model.draft,
                hasSpecialist: v2model.specialistRoster.count > 0,
                modelChoice: v2model.modelChoice,
                specialistChoice: v2model.specialistChoice,
                specialistRoster: v2model.specialistRoster,
                picking: $v2SlashPicking,
                onPick: v2SlashPick,
                onSelectModel: { id in
                    v2model.selectModel(id)
                    v2ShowingSlash = false
                },
                onSelectSpecialist: { slug in
                    v2model.selectSpecialist(slug)
                    v2ShowingSlash = false
                },
                onClear: { v2ShowingClearConfirm = true },
                onDismiss: { v2ShowingSlash = false }
            )
            // Large, not medium: all eight rows are visible without
            // scrolling (the UI test addresses the last row directly).
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        // R28: Generate-an-image prompt (empty-field path).
        .sheet(isPresented: $v2ShowingImagePrompt) {
            V2ImagePromptSheet(
                text: $v2ImagePromptText,
                onGenerate: {
                    v2ShowingImagePrompt = false
                    v2GenerateImage(prompt: v2ImagePromptText)
                    v2ImagePromptText = ""
                },
                onCancel: { v2ShowingImagePrompt = false }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $v2ShowingCamera) {
            V2CameraPicker { image in
                v2ShowingCamera = false
                if let image { v2StageCameraImage(image) }
            }
        }
        // R32: `/clear` confirms, then `v2Workspace:clearThread` hides the
        // thread's rows from the surface on every device (the web's copy
        // twin: nothing is deleted, history keeps them). A backend failure
        // changes nothing and raises the tray retry.
        .alert("Clear this chat?", isPresented: $v2ShowingClearConfirm) {
            Button("Cancel", role: .cancel) { }
            Button("Clear chat", role: .destructive) { v2RunClear() }
        } message: {
            Text("Start fresh? This clears the chat on every device. Nothing is deleted — earlier messages stay in history.")
        }
        // R28: Talk aloud speaks each new driver reply once.
        .onChange(of: v2model.events) { _, _ in v2MaybeSpeak() }
        // R32: an upload that finishes opens its tab in the background —
        // the peek bar is the confirmation — and the chip goes away. A
        // failed background open leaves the chip with its Open button.
        .onChange(of: v2model.staged) { _, staged in
            v2OpenFinishedUploads(staged)
        }
        .onAppear {
            if let context = v2 {
                V2RecentStore.shared.record(project: context.project, mission: context.mission)
                // R23 P070: every thread arrival persists the entry — the
                // next cold start opens this thread (or General's).
                router.rememberV2(projectID: context.project.id, missionID: context.mission?.id)
                // R28: Talk aloud is per-thread, like every other thread pref.
                if talkAloud == nil { talkAloud = V2TalkAloud(threadID: context.thread.id) }
                // Setup step 6 stages the first goal here — reviewed, never sent.
                if v2model.draft.isEmpty {
                    if let staged = V2DraftStore.take(threadID: context.thread.id) {
                        v2model.draft = staged
                    } else if let saved = V2ComposerDrafts.load(threadID: context.thread.id) {
                        // R28: the disk draft — survives relaunch, per thread.
                        v2model.draft = saved
                    }
                }
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("-v2PreviewDictation") {
                    speech.previewForceListening()
                }
                #endif
                // R32 UI-test seed: one staged file WITH bytes, so the
                // staged row, its upload, and its remove control run the
                // real pipeline without a picker. The bundled brief stands
                // in for picked-file bytes.
                if ProcessInfo.processInfo.arguments.contains("-v2SeedStaged") {
                    let bytes = Bundle.main.url(forResource: "aster-brief", withExtension: "pdf")
                        .flatMap { try? Data(contentsOf: $0) }
                    v2model.stageAttachment(
                        name: "seed-deck.pdf", kind: .file,
                        data: bytes, mimeType: "application/pdf"
                    )
                }
                Task { await v2model.start(thread: context.thread, project: context.project, mission: context.mission) }
                Task { await window.start(threadID: context.thread.id) }
            }
        }
        .onDisappear {
            v2model.stop()
            window.stop()
            // R28: leaving the thread silences Talk aloud and parks image
            // runs as cancelled (their tabs, if opened, stay open).
            talkAloud?.stop()
            for (id, task) in v2ImageTasks {
                task.cancel()
                v2model.cancelImageRun(id: id)
            }
            v2ImageTasks.removeAll()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active, v2 != nil {
                Task { await v2model.foreground() }
            }
        }
    }

    /// R17 P029–P031: the design's 52px nav bar — a 44pt hamburger, the
    /// centred title block (P022's 12.5px project line over the 16px title),
    /// and the 10px status dot in a 44pt target. Identifiers stay on leaves.
    private var v2NavBar: some View {
        HStack(spacing: 0) {
            Button { v2ShowingDrawer = true } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 20, weight: .regular))
                    .foregroundStyle(Theme.ink)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-drawer-button")
            .accessibilityLabel("Open menu")
            .padding(.leading, 12)
            Spacer(minLength: 0)
            // P022: a mission shows the PROJECT name as the 12.5px line
            // above the title; a project shows the title only. The screen
            // marker stays a 1pt overlay leaf — never on the VStack (R14: a
            // container identifier overwrites its children, and the title
            // must keep its own).
            VStack(spacing: 1) {
                if let mission = v2?.mission {
                    Text(v2?.project.name ?? mission.title)
                        .font(.hanken(12.5).weight(.medium))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                        .accessibilityIdentifier("chat-subtitle")
                }
                Text(v2?.title ?? v2model.displayTitle)
                    .font(.hanken(16).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                    .accessibilityIdentifier("chat-title")
            }
            .overlay(alignment: .top) {
                Color.clear.frame(width: 1, height: 1)
                    .accessibilityIdentifier("chat-screen")
            }
            Spacer(minLength: 0)
            // P030: status as a 10px dot — mission status, or the project's
            // needs-you signal. A project with nothing to say shows no dot.
            // R32 P081: an open run (or a send awaiting its first agent
            // block) paints Working over all of that.
            if let dot = v2StatusDot {
                Circle()
                    .fill(dot)
                    .frame(width: 10, height: 10)
                    .frame(width: 44, height: 44)
                    .accessibilityIdentifier("v2-status-dot")
                    .accessibilityLabel(v2StatusLabel)
            } else {
                Color.clear.frame(width: 44, height: 44)
            }
        }
        .padding(.trailing, 12)
        .frame(height: 52)
    }

    /// R32 P081: an open run — or a send still waiting on its first agent
    /// block — reads as Working (success dot), driven by `runsForThread`
    /// like the brief orders. Otherwise the mission status (or the
    /// project's needs-you signal) paints, as before.
    private var v2Working: Bool {
        v2model.runWorking || v2model.workingLine != nil
    }

    /// The nav dot colour, or nil when this thread carries no status.
    private var v2StatusDot: Color? {
        if v2Working { return Theme.success }
        if let mission = v2?.mission {
            switch mission.status {
            case .live: return Theme.success
            case .blocked: return Theme.warning
            case .ready, .done: return Theme.inkFaint
            }
        } else if let project = v2?.project, project.needsAttention {
            return Theme.warning
        }
        return nil
    }

    /// The dot's accessibility label, so the run state is testable (and
    /// VoiceOver truthful): Working while a run is open or a send awaits
    /// its first agent block.
    private var v2StatusLabel: String {
        if v2Working { return "Working" }
        if let mission = v2?.mission {
            switch mission.status {
            case .live: return "Live"
            case .blocked: return "Blocked"
            case .ready, .done: return "Ready"
            }
        }
        if v2?.project.needsAttention == true { return "Needs you" }
        return "Ready"
    }

    private var v2ThreadList: some View {
        // R32: the reader serves quote tap-to-jump (the quoted message may
        // be screens above). Event ids are already the row ids.
        // R40 (L030/L032): the thread follows by identity, never by count
        // (V2FollowState — the web's R41 lesson). First paint lands at the
        // bottom; a send pins there; arrivals while scrolled up raise the
        // "new messages" pill instead of yanking the scroll.
        ScrollViewReader { proxy in
            ScrollView {
                // P044: the thread column is 348pt (21px gutters), not 16.
                LazyVStack(alignment: .leading, spacing: Theme.s3) {
                    switch v2model.loadState {
                    case .loading:
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.top, Theme.s6)
                    case .error(let message):
                        centeredNotice(message, systemImage: "wifi.exclamationmark")
                    case .empty where v2model.unsentWithoutEcho.isEmpty:
                        centeredNotice("No messages yet — say something.", systemImage: "bubble.left")
                    case .empty, .ready:
                        // R40 L030: the window is full when exactly the
                        // window's rows came back — the web's
                        // `v2-earlier` twin (12.5px semibold faint,
                        // centred, no new visual language).
                        if v2model.hasEarlierPage {
                            Button("Earlier messages") {
                                v2HeldTopID = v2model.events.first?.id
                                Task { await v2model.loadEarlier() }
                            }
                            .font(.hanken(12.5).weight(.semibold))
                            .foregroundStyle(Theme.inkFaint)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .accessibilityIdentifier("v2-earlier-messages")
                        }
                        ForEach(v2model.events) { event in
                            V2EventRow(
                                event: event,
                                threadID: v2?.thread.id ?? "",
                                agentName: v2?.project.name,
                                onSend: { text in
                                    v2model.startSend(text)
                                },
                                onReply: { quote in
                                    v2ReplyQuote = quote
                                },
                                onQuoteTap: { messageID in
                                    withAnimation(.easeOut(duration: 0.25)) {
                                        proxy.scrollTo(messageID, anchor: .top)
                                    }
                                }
                            )
                            .id(event.id)
                        }
                        // R32 P081: the optimistic working line under the
                        // just-sent message — the design's thinking
                        // treatment (pulsing dot, muted text), like the
                        // web's `v2-working-line` twin.
                        if let line = v2model.workingLine {
                            V2WorkingLineView(line: line)
                        }
                        ForEach(v2model.unsentWithoutEcho) { entry in
                            v2QueuedBubble(entry)
                                .id(entry.id)
                        }
                    }
                    Color.clear.frame(height: 1)
                }
                .padding(.horizontal, 21)
                .padding(.top, Theme.s3)
                .padding(.bottom, 28)
                // Continuous measurement for the follow state: content
                // height + offset in the scroll's coordinate space (the
                // legacy thread's ThreadMetricsKey, same math).
                .background(
                    GeometryReader { geo in
                        Color.clear.preference(
                            key: ThreadMetricsKey.self,
                            value: ThreadMetrics(
                                contentHeight: geo.size.height,
                                minY: geo.frame(in: .named("v2Thread")).minY
                            )
                        )
                    }
                )
            }
            .coordinateSpace(name: "v2Thread")
            .background(
                GeometryReader { geo in
                    Color.clear
                        .onAppear { v2ViewportHeight = geo.size.height }
                        .onChange(of: geo.size.height) { _, h in v2ViewportHeight = h }
                }
            )
            .onPreferenceChange(ThreadMetricsKey.self) { metrics in
                v2DistanceFromBottom = max(0, metrics.contentHeight + metrics.minY - v2ViewportHeight)
                // A deliberate scroll up releases the send pin: the next
                // arrival raises the pill instead of yanking the read.
                if v2DistanceFromBottom > 240 { v2Follow.noteUserScrolledUp() }
            }
            // Identity-keyed arrivals (never count): first paint snaps to
            // the bottom, a new newest row follows only while pinned or
            // near the tail.
            .onChange(of: v2model.events) { _, events in
                v2Arrived(events, proxy: proxy)
            }
            // Every send pins to the bottom (the model bumps this on all
            // send paths — composer, option taps, review carry-on).
            .onChange(of: v2model.sendSequence) { _, _ in
                v2Follow.noteSend()
                v2ScrollToBottom(proxy: proxy, animated: true)
            }
            .onAppear { v2Follow.noteOpened() }
            // The R22-style pill: arrivals while reading elsewhere, one
            // tap re-pins to the bottom.
            .overlay(alignment: .bottom) {
                if v2Follow.showsNewMessages, v2DistanceFromBottom > 240 {
                    Button {
                        v2Follow.notePillTapped()
                        v2ScrollToBottom(proxy: proxy, animated: true)
                    } label: {
                        V2NewMessagesPill(count: v2Follow.unseenCount)
                    }
                    .padding(.bottom, Theme.s3)
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                    .accessibilityIdentifier("v2-new-messages")
                    .accessibilityLabel("New messages. Activate to jump to the latest message.")
                }
            }
        }
    }

    /// One arrival batch through the follow state; the scroll moves only
    /// on identity change, after layout (scrolling to the old bottom
    /// before the new height lands strands the reader).
    private func v2Arrived(_ events: [ThreadEvent], proxy: ScrollViewProxy) {
        switch v2Follow.arrivals(
            newestID: events.last?.id, firstID: events.first?.id,
            nearBottom: v2DistanceFromBottom < 200
        ) {
        case .none:
            break
        case .snapInstant:
            DispatchQueue.main.async {
                if let id = v2model.events.last?.id {
                    proxy.scrollTo(id, anchor: .bottom)
                }
            }
        case .followSmooth:
            withAnimation(.easeOut(duration: 0.2)) {
                if let id = events.last?.id {
                    proxy.scrollTo(id, anchor: .bottom)
                }
            }
        }
        // "Earlier messages" held the top: the wider window landed, so
        // return to the previously-first row — the read never jumps.
        if let held = v2HeldTopID, events.contains(where: { $0.id == held }) {
            v2HeldTopID = nil
            DispatchQueue.main.async {
                proxy.scrollTo(held, anchor: .top)
            }
        }
    }

    private func v2ScrollToBottom(proxy: ScrollViewProxy, animated: Bool) {
        guard let id = v2model.events.last?.id else { return }
        if animated {
            withAnimation(.easeOut(duration: 0.2)) {
                proxy.scrollTo(id, anchor: .bottom)
            }
        } else {
            DispatchQueue.main.async {
                proxy.scrollTo(id, anchor: .bottom)
            }
        }
    }

    /// A queued message with no echo on screen (parked while offline, kept
    /// across relaunch by the disk outbox). Retry replays this thread's
    /// queue in order; nothing is ever re-sent twice.
    private func v2QueuedBubble(_ entry: V2OutboxEntry) -> some View {
        HStack {
            Spacer(minLength: 48)
            VStack(alignment: .trailing, spacing: 4) {
                Text(entry.text)
                    .font(.hanken(15))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .accessibilityIdentifier("v2-queued-text")
                // R24 P075: a rejection names its plain reason under the
                // echo (the web's pattern); a network failure waits quietly.
                if case .rejected(let reason) = entry.lastFailure {
                    Text(reason)
                        .font(.hanken(11))
                        .foregroundStyle(Theme.warning)
                        .multilineTextAlignment(.trailing)
                        .accessibilityIdentifier("v2-queued-error")
                } else {
                    Text("Waiting for connection")
                        .font(.hanken(11))
                        .foregroundStyle(Theme.warning)
                }
            }
        }
    }

    private var v2OfflineBanner: some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "wifi.exclamationmark")
                .foregroundStyle(Theme.warning)
            Text(v2model.queued.count == 1
                ? "Offline — 1 message waiting. It sends on reconnect."
                : "Offline — \(v2model.queued.count) messages waiting. They send on reconnect.")
                .font(.hanken(13))
                .foregroundStyle(Theme.ink)
                // The banner marker lives on this leaf Text, never on the
                // HStack: a container identifier would overwrite the Retry
                // button's own identifier (same finding as chat-screen).
                .accessibilityIdentifier("v2-offline-banner")
            Spacer(minLength: 0)
            Button("Retry") {
                Task { await v2model.replayOutbox() }
            }
            .font(.hanken(13).weight(.semibold))
            .foregroundStyle(Theme.accent)
            .accessibilityIdentifier("v2-outbox-retry")
        }
        .padding(.horizontal, Theme.s4)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised)
    }

    /// R24 P079: the routing card belongs to global-input sends only. A
    /// thread send's decision names the thread it is already in
    /// (`destinationThreadID == thread.id`, reason "Already in …") — no
    /// route line, no banner, no Move. The flags stay in the predicate so a
    /// genuine clarification or pending creation still surfaces.
    private func v2ShowsRouteCard(_ decision: RouteDecision) -> Bool {
        if decision.needsClarification || decision.needsCreationConfirmation { return true }
        return decision.destinationThreadID != (v2?.thread.id ?? "")
    }

    /// R24 P075: the rejection banner — "Not sent, tap to retry" with the
    /// plain reason, never "Offline". The leaf-marker convention holds: the
    /// id lives on the Text, never the HStack.
    private func v2NotSentBanner(count: Int, reason: String) -> some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "exclamationmark.circle")
                .foregroundStyle(Theme.warning)
            VStack(alignment: .leading, spacing: 2) {
                Text(count == 1
                    ? "Not sent — tap Retry to send it."
                    : "Not sent — tap Retry to send them (\(count) waiting).")
                    .font(.hanken(13).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .accessibilityIdentifier("v2-notsent-banner")
                Text(reason)
                    .font(.hanken(12))
                    .foregroundStyle(Theme.inkSoft)
                    .accessibilityIdentifier("v2-notsent-reason")
            }
            Spacer(minLength: 0)
            Button("Retry") {
                Task { await v2model.replayOutbox() }
            }
            .font(.hanken(13).weight(.semibold))
            .foregroundStyle(Theme.accent)
            .accessibilityIdentifier("v2-outbox-retry")
        }
        .padding(.horizontal, Theme.s4)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised)
    }

    // MARK: - Corner v2 routing provenance (native Task 6)

    /// The routing verdict as `Project > Mission` plus reason and Move.
    /// Identifiers live on the leaves only — never on these containers (same
    /// finding as chat-screen: a container id overwrites its children).
    private func v2RouteCard(_ decision: RouteDecision) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: Theme.s2) {
                Image(systemName: "arrow.triangle.branch")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.accent)
                Text(v2RouteTitle(decision))
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .accessibilityIdentifier("route-title")
                Spacer(minLength: 0)
                if v2RouteCanMove(decision) {
                    Button("Move") { v2Move(decision) }
                        .font(.hanken(13).weight(.semibold))
                        .foregroundStyle(Theme.accent)
                        .accessibilityIdentifier("route-move")
                }
            }
            Text(decision.reason)
                .font(.hanken(13))
                .foregroundStyle(Theme.inkSoft)
                .accessibilityIdentifier("route-reason")
            if decision.needsCreationConfirmation {
                Text("Needs confirmation — nothing is created until you tap Move.")
                    .font(.hanken(12))
                    .foregroundStyle(Theme.warning)
            } else if decision.needsClarification {
                Text("Needs clarification — this stays here until you pick a destination.")
                    .font(.hanken(12))
                    .foregroundStyle(Theme.warning)
            }
        }
        .padding(.horizontal, Theme.s4)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised)
    }

    private func v2RouteTitle(_ decision: RouteDecision) -> String {
        if let mission = decision.mission {
            return "\(decision.project.name) > \(mission.title)"
        }
        return decision.project.name
    }

    /// Move is offered for a confident destination or a pending creation —
    /// never for a clarification (there is no single place to move to).
    private func v2RouteCanMove(_ decision: RouteDecision) -> Bool {
        if decision.needsCreationConfirmation { return true }
        return !decision.needsClarification && !decision.destinationThreadID.isEmpty
    }

    private func v2Move(_ decision: RouteDecision) {
        Task { @MainActor in
            if decision.needsCreationConfirmation {
                // Confirm the proposal, then open what the server created.
                if let result = try? await WorkspaceStore.shared.confirmCreation(decision) {
                    if let missionID = result.missionID {
                        router.open(.mission(missionID: missionID))
                    } else {
                        router.open(.project(projectID: result.projectID))
                    }
                }
                return
            }
            // A confident route: open the destination thread's home.
            if let context = WorkspaceStore.shared.context(threadID: decision.destinationThreadID) {
                if let mission = context.mission {
                    router.open(.mission(missionID: mission.id))
                } else {
                    router.open(.project(projectID: context.project.id))
                }
            }
        }
    }

    /// A cross-Project write as a single confirmation card, using the
    /// server-issued token. Confirming consumes it (the card disappears); a
    /// failed or expired confirmation makes no write.
    private func v2ConfirmationCard(_ confirmation: CrossProjectWriteConfirmation) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: Theme.s2) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.warning)
                Text("Confirm cross-project write")
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                Spacer(minLength: 0)
                Button("Confirm") {
                    Task { try? await v2model.confirmCrossProjectWrite(confirmation) }
                }
                .font(.hanken(13).weight(.semibold))
                .foregroundStyle(Theme.accent)
                .accessibilityIdentifier("confirm-write")
            }
            Text(confirmation.summary)
                .font(.hanken(13))
                .foregroundStyle(Theme.inkSoft)
                .accessibilityIdentifier("confirm-summary")
        }
        .padding(.horizontal, Theme.s4)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised)
    }

    /// Cross-Project read provenance: the `description` + `subjectIDs` of
    /// `learned` ledger items tied to this thread.
    private var v2SourcesSection: some View {
        DisclosureGroup("Sources · \(v2model.ledgerProvenance.count)") {
            ForEach(v2model.ledgerProvenance) { entry in
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.description)
                        .font(.hanken(13))
                        .foregroundStyle(Theme.ink)
                        .accessibilityIdentifier("provenance-item")
                    if !entry.subjectIDs.isEmpty {
                        Text(entry.subjectIDs.joined(separator: " · "))
                            .font(.hanken(11))
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
                .padding(.vertical, 2)
            }
        }
        .font(.hanken(13).weight(.medium))
        .foregroundStyle(Theme.inkSoft)
        .padding(.horizontal, Theme.s4)
        .padding(.vertical, Theme.s2)
    }

    /// R28: the @mention token being typed, if the caret sits inside one.
    /// Suggestions (`brain` + the thread's specialist roster) appear only
    /// while editing; committed chips render separately above the pill.
    private var mentionToken: String? {
        V2Mentions.currentToken(in: v2model.draft)
    }

    private var mentionSuggestions: [(slug: String, title: String)] {
        guard mentionToken != nil else { return [] }
        let rows = V2Mentions.suggestions(token: mentionToken, roster: v2model.specialistRoster)
        // A fully-typed committed slug is not a suggestion anymore.
        let committed = Set(V2Mentions.committed(in: v2model.draft, roster: v2model.specialistRoster.map(\.slug)))
        return rows.filter { !committed.contains($0.slug) }
    }

    /// R28: the paperclip joins the pill while there is content to send
    /// with (typed text or staged files). Quote-arming alone does not show
    /// it — the empty pill keeps R24 P076's exact layout so the full
    /// placeholder still fits at 390 (the clip's ~33pt would truncate
    /// General's placeholder, measured 201.1pt against ~180pt of room).
    private var v2Composing: Bool {
        !v2model.draft.isEmpty || !v2model.staged.isEmpty
    }

    /// R24 P076: the pill's fixed layout numbers in one place, so the
    /// placeholder-fit test and the view share the same budget. The values
    /// are the shipped ones (outer gutter 21 per P044; 50px round send per
    /// P023): the chip collapse buys the room, not a metric change.
    enum V2ComposerMetrics {
        static let outerPadding: CGFloat = 21
        /// 7, not 10 (R24 P076): toward the placeholder budget; the
        /// pill/send grouping still reads as one control.
        static let sendSpacing: CGFloat = 7
        static let sendSize: CGFloat = 50
        /// 11, not 17 (R24 P076): toward the placeholder budget. The text
        /// origin moves 4pt with it — sub-perceptual against the design.
        static let pillLeading: CGFloat = 11
        /// 3, not 4 (R24 P076): toward the placeholder budget.
        static let pillTrailing: CGFloat = 3
        /// 3, not 4 (R24 P076): toward the placeholder budget.
        static let interSpacing: CGFloat = 3
        static let micWidth: CGFloat = 36
        /// The multiline backing's ~5pt/side text inset, measured on-device
        /// (placeholder starts +4pt in). It is chrome, not text room.
        static let fieldInset: CGFloat = 5
        /// Collapsed (icon-only) chip width: 12pt glyph + 2×4 padding +
        /// hairline. The UI test asserts the collapsed chip stays within it.
        static let collapsedChipWidth: CGFloat = 22
        /// Full placeholder copy for the design's project (P038).
        static let placeholderProject = "Aster"

        /// Field width left for the placeholder at a screen width with the
        /// collapsed chip, minus the backing inset: the placeholder must
        /// fit it without an ellipsis.
        static func fieldWidth(screenWidth: CGFloat, chipWidth: CGFloat) -> CGFloat {
            screenWidth
                - 2 * outerPadding - sendSpacing - sendSize
                - pillLeading - pillTrailing - 2 * interSpacing
                - chipWidth - micWidth
                - 2 * fieldInset
        }

        static func placeholder(project: String) -> String {
            "Tell \(project) what to make next"
        }
    }

    private var v2Composer: some View {
        VStack(spacing: 8) {
            // R28 trays — every row renders ABOVE the pill, never inside it,
            // so the gated composer metrics never move (R27 web's tray rule).
            if !mentionSuggestions.isEmpty {
                v2MentionSuggestionRow
            }
            if !v2CommittedMentions.isEmpty {
                v2MentionChipsRow
            }
            // R28: `/` hints the palette inline (Return opens the sheet).
            if !v2SlashQuick.isEmpty {
                v2SlashQuickRow
            }
            if let quote = v2ReplyQuote {
                v2ReplyChip(quote: quote)
            }
            if !v2model.staged.isEmpty {
                v2StagedRow
            }
            if !v2model.imageRuns.isEmpty {
                v2ImageRunsRow
            }
            if let notice = v2AttachNotice {
                Text(notice)
                    .font(.hanken(12))
                    .foregroundStyle(Theme.warning)
                    .accessibilityIdentifier("v2-attach-notice")
            }
            // R32: a failed server clear changes nothing and offers a
            // retry (the web's `clearFailed` twin).
            if v2ClearFailed {
                HStack(spacing: 8) {
                    Text("Couldn't clear just now. Nothing changed, try again in a moment.")
                        .font(.hanken(12))
                        .foregroundStyle(Theme.warning)
                        .accessibilityIdentifier("v2-clear-failed")
                    Spacer(minLength: 0)
                    Button("Retry") { v2RunClear() }
                        .font(.hanken(12).weight(.semibold))
                        .foregroundStyle(Theme.accent)
                        .accessibilityIdentifier("v2-clear-retry")
                        .accessibilityLabel("Retry clearing this chat")
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            // P023 artifact peek: 60px above the composer while the thread
            // has tabs — the active tab's thumbnail + change count. Tapping
            // opens the sheet/column on the selected tab.
            if !window.tabs.isEmpty {
                v2PeekBar
            }
            // P039: pill + round send sit directly on the ground — the
            // frosted outer card is gone.
            HStack(alignment: .bottom, spacing: V2ComposerMetrics.sendSpacing) {
                // P023: 50px pill with the Record chip inside. The pill fill
                // is surface; the focused ring is the only chrome.
                HStack(spacing: V2ComposerMetrics.interSpacing) {
                    // P038: `Tell Aster what to make next`, not `Message…`.
                    // R24 P076: the multiline axis is UITextView-backed with
                    // a ~5pt/side text inset (measured: placeholder starts
                    // +4pt in) — the placeholder budget below counts that
                    // inset as chrome, not text room.
                    TextField(
                        V2ComposerMetrics.placeholder(project: v2?.project.name ?? "Corner"),
                        text: $v2model.draft, axis: .vertical
                    )
                        // P106's design value (14.5px input), not 15: the
                        // half point is R24 P076's placeholder budget.
                        .font(.hanken(14.5))
                        .lineLimit(1...5)
                        .focused($composerFocused)
                        .foregroundStyle(Theme.ink)
                        .padding(.vertical, 8)
                        .submitLabel(.send)
                        .onSubmit { v2Submit() }
                        .onKeyPress(keys: [.return]) { press in
                            // R32 multiline: hardware Shift+Return inserts
                            // a newline instead of sending. The design
                            // carries no newline key, so the invisible
                            // hardware path is the design-consistent one;
                            // soft Return still sends. Anything unshifted
                            // falls through to the submit path.
                            guard press.modifiers.contains(.shift) else { return .ignored }
                            v2AllowNewlineOnce = true
                            v2model.draft = V2ShiftReturn.newlineDraft(v2model.draft)
                            return .handled
                        }
                        .onChange(of: v2model.draft) { old, new in v2DraftChanged(old: old, new: new) }
                        .accessibilityIdentifier("v2-composer-field")
                        .accessibilityLabel("Message")
                        .accessibilitySortPriority(5)
                    // R28: the paperclip joins the pill once composing begins
                    // (see v2Composing for why it hides while empty).
                    if v2Composing {
                        Menu {
                            Button { v2ShowingPhotoPicker = true } label: {
                                Label("Photo Library", systemImage: "photo.on.rectangle")
                            }
                            Button { v2ShowingFilePicker = true } label: {
                                Label("Choose Files", systemImage: "folder")
                            }
                            Button { v2CameraTapped() } label: {
                                Label("Camera", systemImage: "camera")
                            }
                        } label: {
                            Image(systemName: "paperclip")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(Theme.inkSoft)
                                .frame(width: 30, height: 36)
                        }
                        .accessibilityIdentifier("v2-attach")
                        .accessibilityLabel("Attach and upload files")
                        .accessibilitySortPriority(4)
                    }
                    // R19: the commands chip lives inside the pill, left of
                    // Record — the design's pill with one more chip. R24
                    // P076: icon-only while the field is empty so the full
                    // placeholder fits at 390; the label returns with typing.
                    v2CommandsChip(collapsed: v2model.draft.isEmpty)
                    // R28: the live level meter rides beside Record while
                    // dictating — the CV6 live-meter twin, in the pill.
                    if speech.isListening {
                        V2LevelMeter(level: speech.level)
                            .accessibilityIdentifier("v2-dictation-meter")
                            .accessibilityLabel("Dictation level")
                            .accessibilitySortPriority(1.5)
                    }
                    if speech.supported {
                        // P041: a bare muted glyph — no circle behind it.
                        Button(action: toggleV2Dictation) {
                            Image(systemName: speech.isListening ? "mic.fill" : "mic")
                                .font(.system(size: 17, weight: .regular))
                                .foregroundStyle(speech.isListening ? Color.red : Theme.inkSoft)
                                .frame(width: 36, height: 36)
                        }
                        .accessibilityIdentifier("v2-record")
                        .accessibilityLabel(speech.isListening ? "Stop dictation" : "Speak your message")
                        .accessibilitySortPriority(2)
                    }
                }
                .padding(.leading, V2ComposerMetrics.pillLeading)
                .padding(.trailing, V2ComposerMetrics.pillTrailing)
                .frame(minHeight: 50)
                .background(Theme.raised, in: Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(composerFocused ? Theme.accent : Color.clear, lineWidth: 1)
                )
                // P023 + P040: the 50px round send — always accent with an
                // up-arrow, even with an empty draft. R28: while a send or an
                // image run is generating, it becomes Stop.
                if v2model.isSending || v2model.hasActiveImageRuns {
                    Button {
                        v2StopGenerating()
                    } label: {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color.white)
                            .frame(width: 50, height: 50)
                            .background(Theme.warning, in: Circle())
                    }
                    .accessibilityIdentifier("v2-composer-stop")
                    .accessibilityLabel("Stop generating")
                    .accessibilitySortPriority(1)
                } else {
                    Button {
                        v2Submit()
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(Color.white)
                            .frame(width: 50, height: 50)
                            .background(Theme.accent, in: Circle())
                    }
                    .accessibilityIdentifier("v2-composer-send")
                    .accessibilityLabel("Send message")
                    .accessibilitySortPriority(1)
                    .disabled(!v2CanSend)
                }
            }
        }
        .padding(.horizontal, 21)
        .padding(.bottom, Theme.s2)
        .photosPicker(
            isPresented: $v2ShowingPhotoPicker, selection: $v2PickedPhotos,
            maxSelectionCount: 5, matching: .images
        )
        .onChange(of: v2PickedPhotos) { _, items in
            guard !items.isEmpty else { return }
            v2PickedPhotos = []
            for item in items {
                let name = V2Attachments.nextPhotoName(existing: v2model.staged)
                Task { @MainActor in
                    // Photos carry their bytes: the staged chip uploads at
                    // stage time (the web's attach path). A photo whose
                    // bytes will not load still chips, name-only, so the
                    // person sees what they picked.
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        let mime = item.supportedContentTypes.first?.preferredMIMEType ?? "image/jpeg"
                        v2model.stageAttachment(name: name, kind: .photo, data: data, mimeType: mime)
                    } else {
                        v2model.stageAttachment(name: name, kind: .photo)
                    }
                    v2AttachNotice = nil
                }
            }
        }
        .fileImporter(
            isPresented: $v2ShowingFilePicker,
            allowedContentTypes: [.item], allowsMultipleSelection: true
        ) { result in
            guard case .success(let urls) = result else { return }
            for url in urls {
                let name = url.lastPathComponent
                // Files are read at stage time (security-scoped URLs do not
                // survive the chip's lifetime). An unreadable file still
                // chips, name-only.
                let accessing = url.startAccessingSecurityScopedResource()
                let data = try? Data(contentsOf: url)
                if accessing { url.stopAccessingSecurityScopedResource() }
                let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
                    ?? "application/octet-stream"
                v2model.stageAttachment(name: name, kind: .file, data: data, mimeType: mime)
            }
            v2AttachNotice = nil
        }
    }

    /// Stage camera bytes as JPEG (the simulator has no camera; the guard
    /// above names that before this ever runs).
    private func v2StageCameraImage(_ image: UIImage) {
        guard let data = image.jpegData(compressionQuality: 0.85) else {
            v2AttachNotice = "That photo couldn't be read."
            return
        }
        v2model.stageAttachment(
            name: V2Attachments.nextPhotoName(existing: v2model.staged),
            kind: .camera, data: data, mimeType: "image/jpeg"
        )
        v2AttachNotice = nil
    }

    /// R32: the send carries no bytes — staged files upload as artifacts
    /// of their own — so sendability is the text alone.
    private var v2CanSend: Bool {
        !v2model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: - R28 composer actions

    /// Every send path funnels here: the send button, hardware Return
    /// (onSubmit), and the soft Return key (see v2DraftChanged). Slash
    /// drafts never send — `/clear` confirms, anything else opens the
    /// commands sheet (the same menu, new host).
    private func v2Submit() {
        let trimmed = v2model.draft.trimmingCharacters(in: .whitespacesAndNewlines)
        if V2SlashPalette.isSlashDraft(trimmed) {
            if V2SlashPalette.token(in: trimmed) == "clear" {
                v2model.draft = ""
                v2ShowingSlash = false
                v2ShowingClearConfirm = true
            } else {
                v2ShowingSlash = true
            }
            return
        }
        guard !trimmed.isEmpty else { return }
        if speech.isListening { speech.stop() }
        let quote = v2ReplyQuote
        v2model.startSend(trimmed, quote: quote)
        v2ReplyQuote = nil
        if let threadID = v2?.thread.id {
            V2ComposerDrafts.clear(threadID: threadID)
        }
    }

    /// The soft Return key sends (Slack-style): a single typed `\n` reverts
    /// and submits instead of entering a newline. Pasted text never matches
    /// (a paste inserts more than one character), and `/` drafts route to
    /// the slash flow through v2Submit. Multiline entry arrives via paste
    /// or hardware Shift+Return (see the field's onKeyPress).
    private func v2DraftChanged(old: String, new: String) {
        // R32: a hardware Shift+Return newline stands down the submitter
        // for exactly one change (the flag is set around the insertion).
        if v2AllowNewlineOnce {
            v2AllowNewlineOnce = false
            if let threadID = v2?.thread.id {
                V2ComposerDrafts.save(new, threadID: threadID)
            }
            return
        }
        if let inserted = extractInserted(old: old, new: new), inserted == "\n" {
            v2model.draft = old
            v2Submit()
            return
        }
        // Per-thread disk draft (a send clears it explicitly in v2Submit).
        if let threadID = v2?.thread.id {
            V2ComposerDrafts.save(new, threadID: threadID)
        }
    }

    /// Stop while generating: cancel the send flight and any image-tab
    /// opens (their runs park as cancelled, dismissible).
    private func v2StopGenerating() {
        v2model.stopSending()
        for (id, task) in v2ImageTasks {
            task.cancel()
            v2model.cancelImageRun(id: id)
        }
        v2ImageTasks.removeAll()
    }

    /// The `/clear` confirm runner: server clear first, then the view-local
    /// send state drops (draft, staged, quote, disk draft) so the emptied
    /// surface is all there is. A failure changes nothing and raises the
    /// tray retry (the web's `clearFailed` twin).
    private func v2RunClear() {
        v2ClearFailed = false
        Task { @MainActor in
            do {
                try await v2model.clearThread()
            } catch {
                v2ClearFailed = true
                return
            }
            v2model.clearStaged()
            v2ReplyQuote = nil
            if let threadID = v2?.thread.id {
                V2ComposerDrafts.clear(threadID: threadID)
            }
        }
    }

    /// Talk aloud speaks each new driver reply once (the service dedupes by
    /// event id, so reloads and re-renders stay silent).
    private func v2MaybeSpeak() {
        guard let talk = talkAloud, talk.enabled else { return }
        guard let last = v2model.events.last(where: { $0.author == .agent }) else { return }
        talk.speakReply(eventID: last.id, text: V2SpeakText.speakableText(blocks: last.blocks))
    }

    private func v2CameraTapped() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            v2AttachNotice = "Camera isn't available on this device."
            return
        }
        v2ShowingCamera = true
    }

    // MARK: - R28 slash actions

    private func v2SlashPick(_ command: V2SlashCommand) {
        // Typing `/…` never sends: every pick consumes the slash token.
        // Capture the remainder first (`/image a lighthouse` prompts).
        let remainder = v2SlashRemainder()
        v2model.draft = ""
        if let threadID = v2?.thread.id {
            V2ComposerDrafts.clear(threadID: threadID)
        }
        switch command.id {
        case .plan:
            v2model.setMode("plan")
            v2ShowingSlash = false
        case .work:
            v2model.setMode("work")
            v2ShowingSlash = false
        case .model, .specialist:
            // The pickers live inside the sheet (list + Back to commands).
            v2SlashPicking = command.id
            v2ShowingSlash = true
        case .files:
            v2ShowingSlash = false
            window.isPresented = true
        case .image:
            v2ShowingSlash = false
            v2GenerateImage(prompt: remainder)
        case .talk:
            if let talk = talkAloud { talk.setEnabled(!talk.enabled) }
            v2ShowingSlash = false
        case .integrations:
            v2ShowingSlash = false
            router.showingSettings = true
        case .clear:
            // Clear always confirms (the sheet shows the confirm inline).
            break
        }
    }

    /// The text after the `/token`, for `/image a lighthouse` prompts.
    private func v2SlashRemainder() -> String {
        let trimmed = v2model.draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("/") else { return "" }
        let rest = String(trimmed.dropFirst())
        guard let space = rest.firstIndex(of: " ") else { return "" }
        return String(rest[rest.index(after: space)...]).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Generate an image (the web's `startImageRun` twin): create the
    /// pending photo artifact (`meta.status: "generating"`, no storage),
    /// open its tab, then poll `artifacts` until the bridge's upgrade
    /// lands the bytes and the tab paints. Empty prompt opens the prompt
    /// sheet instead of guessing.
    private func v2GenerateImage(prompt: String) {
        let trimmed = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            v2ShowingImagePrompt = true
            return
        }
        guard let threadID = v2?.thread.id else { return }
        let runID = v2model.startImageRun(prompt: trimmed)
        // Main-actor task: every touch below (window, model, @State) is main
        // state, and cancellation parks the run as cancelled, never failed.
        let task = Task { @MainActor in
            do {
                let artifactID = try await v2model.createImageArtifact(
                    runID: runID, prompt: trimmed, tool: v2ImageTool()
                )
                try await window.open(
                    .photo, threadID: threadID, artifactID: artifactID,
                    title: "Generated image — \(trimmed.prefix(48))\(trimmed.count > 48 ? "…" : "")",
                    state: ["prompt": trimmed, "status": "generating"]
                )
                let ready = await v2model.awaitImageReady(artifactID: artifactID)
                // A cancelled wait parks as cancelled; a ready artifact
                // finishes the run and refreshes the window so the tab
                // paints without a manual reload.
                if Task.isCancelled || !ready {
                    v2model.cancelImageRun(id: runID)
                } else {
                    await window.loadArtifacts(threadID: threadID)
                    v2model.finishImageRun(id: runID)
                }
            } catch is CancellationError {
                v2model.cancelImageRun(id: runID)
            } catch {
                v2model.failImageRun(id: runID, error: "Couldn't start the image — the prompt is kept above.")
            }
            v2ImageTasks.removeValue(forKey: runID)
        }
        v2ImageTasks[runID] = task
    }

    /// The armed image tool for the pending artifact's meta. The commands
    /// menu arms generation per prompt today (there is no standing tool
    /// pick); the meta names the ask honestly.
    private func v2ImageTool() -> String {
        "image"
    }

    /// P023 artifact peek bar (60px): the active tab's live thumbnail and
    /// change count. Tapping opens the sheet/column on the selected tab.
    /// P042–P043: chip fill r16, 13.5/600 title + 11.5 sub, 56×36 thumb.
    private var v2PeekBar: some View {
        Button {
            window.isPresented = true
        } label: {
            HStack(spacing: Theme.s3) {
                v2PeekThumbnail
                VStack(alignment: .leading, spacing: 1) {
                    Text(window.selectedTab?.title ?? "Preview")
                        .font(.hanken(13.5).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Text(v2PeekCountText)
                        .font(.hanken(11.5))
                        .foregroundStyle(Theme.inkSoft)
                        .accessibilityIdentifier("visual-peek-count")
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.up")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.inkFaint)
            }
            .padding(.horizontal, 11)
            .frame(maxWidth: .infinity, minHeight: 60, maxHeight: 60, alignment: .leading)
            .background(Theme.chipFill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .accessibilityIdentifier("visual-peek")
        .accessibilityLabel("Open \(window.selectedTab?.title ?? "preview")")
    }

    private var v2PeekCountText: String {
        let count = v2review.sendablePins.count
        if count == 0 { return "No changes yet" }
        return count == 1 ? "1 change" : "\(count) changes"
    }

    /// The live thumbnail: the photo itself when the active tab is one,
    /// otherwise the kind badge. 56×36 like the export's live frame.
    private var v2PeekThumbnail: some View {
        Group {
            if let tab = window.selectedTab,
               tab.kind == .photo,
               let url = window.artifact(for: tab)?.sourceURL,
               url.isFileURL,
               let image = UIImage(contentsOfFile: url.path) {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 56, height: 36)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            } else {
                Text(V2ArtifactCards.badge(for: window.selectedTab?.kind ?? .document).0)
                    .font(.hanken(9.5).weight(.bold))
                    .foregroundStyle(Color.white)
                    .frame(width: 56, height: 36)
                    .background(
                        V2ArtifactCards.badge(for: window.selectedTab?.kind ?? .document).1,
                        in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                    )
            }
        }
    }

    /// Record inside the pill, mirroring the home composer's dictation
    /// contract: partials replace the dictated tail, typed text is kept.
    private func toggleV2Dictation() {
        if speech.isListening {
            speech.stop()
            return
        }
        dictationBase = SpeechService.dictationBase(for: v2model.draft)
        speech.toggle { transcript in
            v2model.draft = dictationBase + transcript
        }
    }

    // MARK: - R28 composer trays

    private var v2CommittedMentions: [String] {
        V2Mentions.committed(in: v2model.draft, roster: v2model.specialistRoster.map(\.slug))
    }

    /// The slash commands matching the draft's `/token`, for the inline
    /// hint row. Empty when the draft is not a slash draft.
    private var v2SlashQuick: [V2SlashCommand] {
        guard V2SlashPalette.isSlashDraft(v2model.draft) else { return [] }
        return V2SlashPalette.filtered(v2model.draft, hasSpecialist: v2model.specialistRoster.count > 0)
    }

    /// Inline `/` hints: the same rows as the sheet, as tappable chips.
    /// Clear confirms through the alert; the rest act immediately.
    private var v2SlashQuickRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(v2SlashQuick) { command in
                    Button {
                        if command.id == .clear {
                            v2model.draft = ""
                            if let threadID = v2?.thread.id {
                                V2ComposerDrafts.clear(threadID: threadID)
                            }
                            v2ShowingClearConfirm = true
                        } else {
                            v2SlashPick(command)
                        }
                    } label: {
                        Text(command.name)
                            .font(.hanken(13).weight(.semibold))
                            .foregroundStyle(Theme.accent)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Theme.accentWeak, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .accessibilityIdentifier("v2-slashquick-\(command.id.rawValue)")
                    .accessibilityLabel("Slash command \(command.name): \(command.detail)")
                }
            }
        }
    }

    /// The @mention type-ahead row (replaces the brain-only suggestion).
    private var v2MentionSuggestionRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(mentionSuggestions, id: \.slug) { row in
                    Button {
                        v2model.draft = V2Mentions.complete(slug: row.slug, in: v2model.draft)
                    } label: {
                        HStack(spacing: 6) {
                            Text("@\(row.slug)")
                                .font(.hanken(14).weight(.semibold))
                                .foregroundStyle(Theme.accent)
                            Text(row.slug == "brain"
                                 ? "route to a specialist — stays in this conversation"
                                 : row.title)
                                .font(.hanken(12))
                                .foregroundStyle(Theme.inkSoft)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Theme.accentWeak, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .accessibilityIdentifier(row.slug == "brain" ? "v2-mention-brain" : "v2-mention-\(row.slug)")
                    .accessibilityLabel("Mention \(row.slug)")
                }
            }
        }
    }

    /// Committed @mention chips — one per routable slug in the draft, each
    /// removable (the CV6 `composer-chip` twin).
    private var v2MentionChipsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(v2CommittedMentions, id: \.self) { slug in
                    HStack(spacing: 6) {
                        Text("@\(slug)")
                            .font(.hanken(12).weight(.semibold))
                        Button {
                            v2model.draft = V2Mentions.removing(slug: slug, from: v2model.draft)
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .accessibilityLabel("Remove @\(slug) mention")
                    }
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, 10)
                    .frame(height: 26)
                    .background(Theme.accentWeak, in: Capsule())
                    .accessibilityIdentifier("v2-mention-chip-\(slug)")
                }
            }
        }
    }

    /// The reply-to quote chip (long-press a message → Reply). × cancels.
    private func v2ReplyChip(quote: V2ReplyQuote) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "arrowshape.turn.up.left")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.accent)
            VStack(alignment: .leading, spacing: 1) {
                Text("Replying to \(quote.sender)")
                    .font(.hanken(12).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                Text(quote.snippet)
                    .font(.hanken(12))
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Button {
                v2ReplyQuote = nil
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 28, height: 28)
            }
            .accessibilityIdentifier("v2-reply-cancel")
            .accessibilityLabel("Cancel reply")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    /// Staged attachments, as chips above the pill (photos, files, camera
    /// — multiple). R32: each chip tracks its own upload — spinner while
    /// uploading, Retry on failure (the outbox never waits), and a tap to
    /// open the tab once done. The send carries no bytes.
    private var v2StagedRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Array(v2model.staged.enumerated()), id: \.element.id) { index, file in
                    HStack(spacing: 6) {
                        switch file.upload {
                        case .uploading, .queued:
                            ProgressView()
                                .controlSize(.mini)
                                .tint(Theme.accent)
                                .accessibilityIdentifier("v2-staged-uploading-\(index)")
                        case .failed:
                            Image(systemName: "exclamationmark.circle")
                                .font(.system(size: 10, weight: .semibold))
                        case .done:
                            Image(systemName: "checkmark.circle")
                                .font(.system(size: 10, weight: .semibold))
                        }
                        Image(systemName: file.kind == .photo || file.kind == .camera ? "photo" : "doc")
                            .font(.system(size: 10, weight: .semibold))
                        Text(file.name)
                            .font(.hanken(11.5).weight(.semibold))
                            .lineLimit(1)
                        switch file.upload {
                        case .failed(let reason):
                            Button { v2model.retryUpload(id: file.id) } label: {
                                Text("Retry")
                                    .font(.hanken(11).weight(.semibold))
                            }
                            .accessibilityIdentifier("v2-staged-retry-\(index)")
                            .accessibilityLabel("Retry uploading \(file.name). \(reason)")
                        case .done(let artifactID):
                            Button { v2OpenStagedArtifact(file, artifactID: artifactID) } label: {
                                Text("Open")
                                    .font(.hanken(11).weight(.semibold))
                            }
                            .accessibilityIdentifier("v2-staged-open-\(index)")
                            .accessibilityLabel("Open \(file.name)")
                        default:
                            EmptyView()
                        }
                        Button { v2model.removeStaged(id: file.id) } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .accessibilityIdentifier("v2-staged-remove-\(index)")
                        .accessibilityLabel("Remove \(file.name)")
                    }
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, 10)
                    .frame(height: 26)
                    .background(Theme.accentWeak, in: Capsule())
                }
            }
        }
        .accessibilityIdentifier("v2-staged-row")
    }

    /// Open every finished upload's tab in the background, then dismiss
    /// its chip. The server dedupes opens by target, so a repeated change
    /// notification re-selects instead of duplicating.
    private func v2OpenFinishedUploads(_ staged: [V2StagedAttachment]) {
        guard let threadID = v2?.thread.id else { return }
        for file in staged {
            guard case .done(let artifactID) = file.upload else { continue }
            Task { @MainActor in
                do {
                    try await window.openBackground(
                        V2ArtifactKind.from(mimeType: file.mimeType, filename: file.name),
                        threadID: threadID, artifactID: artifactID,
                        title: file.name, state: [:]
                    )
                    v2model.removeStaged(id: file.id)
                } catch {
                    // The chip stays with its Open button: a missed open is
                    // a retry, never a dismissal.
                }
            }
        }
    }

    /// Open an uploaded file's tab, then dismiss its chip — the tab (and
    /// the peek bar) is the confirmation, not the chip.
    private func v2OpenStagedArtifact(_ file: V2StagedAttachment, artifactID: String) {
        guard let threadID = v2?.thread.id else { return }
        Task { @MainActor in
            do {
                try await window.open(
                    V2ArtifactKind.from(mimeType: file.mimeType, filename: file.name),
                    threadID: threadID, artifactID: artifactID,
                    title: file.name, state: [:]
                )
                v2model.removeStaged(id: file.id)
            } catch {
                // The chip stays with its Open: a missed open is a retry,
                // never a dismissal.
            }
        }
    }

    /// Image runs: Generating… with Stop, failures with their reason and a
    /// dismiss. Done hands off to the opened tab and the row goes away.
    private var v2ImageRunsRow: some View {
        VStack(spacing: 6) {
            ForEach(v2model.imageRuns) { run in
                HStack(spacing: 8) {
                    if run.state == .generating {
                        ProgressView()
                            .controlSize(.small)
                            .tint(Theme.accent)
                    } else {
                        Image(systemName: run.state == .failed ? "exclamationmark.circle" : "checkmark.circle")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(run.state == .failed ? Theme.warning : Theme.success)
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        Text(run.state == .generating ? "Generating…" : run.prompt)
                            .font(.hanken(13).weight(.semibold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        Text(run.state == .generating ? run.prompt : (run.error ?? "Stopped"))
                            .font(.hanken(12))
                            .foregroundStyle(Theme.inkSoft)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    if run.state == .generating {
                        Button {
                            v2ImageTasks[run.id]?.cancel()
                            v2ImageTasks.removeValue(forKey: run.id)
                            v2model.cancelImageRun(id: run.id)
                        } label: {
                            Text("Stop")
                                .font(.hanken(13).weight(.semibold))
                                .foregroundStyle(Theme.warning)
                                .frame(minWidth: 44, minHeight: 32)
                        }
                        .accessibilityIdentifier("v2-image-stop")
                        .accessibilityLabel("Stop generating images")
                    } else {
                        Button {
                            v2model.dismissImageRun(id: run.id)
                        } label: {
                            Text("Dismiss")
                                .font(.hanken(13).weight(.medium))
                                .foregroundStyle(Theme.inkSoft)
                                .frame(minWidth: 44, minHeight: 32)
                        }
                        .accessibilityIdentifier("v2-image-dismiss")
                        .accessibilityLabel("Dismiss image run")
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
    }

    private var legacyBody: some View {
        messageList
            .safeAreaInset(edge: .bottom, spacing: 0) {
                VStack(spacing: Theme.s2) {
                    // The turn's living progress — elapsed clock + step list — sits
                    // directly above the composer, pinned, so "is anything happening"
                    // is answerable without scrolling. Hidden while searching.
                    if !isSearching, model.turn != .idle {
                        turnIndicator
                    }
                    // The steward's verdict, with its actions in the same surface.
                    if !isSearching {
                        recoveryNotice
                    }
                    if !isSearching, let notice = model.stopNotice {
                        stopNoticeStrip(notice)
                    }
                    composer
                }
                // Interruptible spring (iOS 17 model): the card can retarget
                // mid-flight when a turn ends the moment another begins.
                .animation(.spring(duration: 0.35, bounce: 0.15), value: model.turn)
            }
            // ONE haptic per state change, never during streaming (chunk arrivals
            // change no state here — the buzz-while-generating anti-pattern is
            // structurally impossible). Reply landed = success; the agent needs
            // you = warning; stuck = error; a turn opening = a light tap.
            .sensoryFeedback(trigger: model.roomStatus) { old, new in
                switch new {
                case .needsYou: return .warning
                case .stuck: return .error
                case .idle: return old == .idle ? nil : .success
                case .thinking, .working, .streaming:
                    return old == .idle ? .impact(weight: .light) : nil
                case .stopping: return .impact(weight: .medium)
                }
            }
            // Search bar slides in at the top of the thread when isSearching is true —
            // sits above the message list so it doesn't collide with the nav bar or the
            // keyboard. Dismissed by the X button or by emptying the query.
            .safeAreaInset(edge: .top, spacing: 0) {
                if isSearching { searchBar }
            }
            .groundBackground()
            .accessibilityIdentifier("chat-screen")
            // Custom title: avatar + room name + live status.
            // Empty string keeps the back-button chevron but clears the default label.
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.ground, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                // ── Principal: avatar + room name + live status ──────────────
                ToolbarItem(placement: .principal) {
                    headerTitle
                }
                // ── Trailing: search + more (⋯) ─────────────────────────────
                ToolbarItemGroup(placement: .topBarTrailing) {
                    // Search toggle
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isSearching.toggle()
                            searchQuery = ""
                            if isSearching { searchFocused = true }
                        }
                    } label: {
                        Image(systemName: isSearching ? "magnifyingglass.circle.fill" : "magnifyingglass")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(isSearching ? Theme.accent : Theme.inkSoft)
                    }
                    .accessibilityLabel(isSearching ? "Cancel search" : "Search conversation")

                    // More menu (⋯) — files, rename, settings
                    Menu {
                        Button { showingFiles = true } label: {
                            Label("Files", systemImage: "folder")
                        }
                        Button { showingRename = true } label: {
                            Label("Rename room", systemImage: "pencil")
                        }
                        Button { showingSettings = true } label: {
                            Label("Room settings", systemImage: "gearshape")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(Theme.inkSoft)
                    }
                    .accessibilityIdentifier("room-more-options")
                    .accessibilityLabel("More options")
                }
            }
            .sheet(isPresented: $showingFiles) {
                RoomFilesView(room: model.room)
            }
            .sheet(isPresented: $showingSettings) {
                RoomSettingsView(
                    room: model.room,
                    modelChoice: model.modelChoice,
                    onSelectModel: { id in await model.selectModel(id) },
                    onOpenFiles: { showingSettings = false; showingFiles = true },
                    onClearRoom: {
                        let ok = await model.clearRoom()
                        return ok
                    },
                    roomAgentChoice: model.roomAgentChoice,
                    roomAgentRoster: model.roomAgentRoster,
                    onSelectAgent: { slug in await model.selectRoomAgent(slug) }
                )
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showingImageGenerator) {
                ImageGeneratorSheet(model: model)
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showingRename) {
                RenameRoomSheet(room: model.room) { _ in
                    // Title updates optimistically inside the sheet; reload to reflect
                    // server truth and refresh the header without waiting for the rail poll.
                    Task { await model.load() }
                }
            }
            // Paste chip preview sheet — full scrollable pre of the pasted text.
            .sheet(item: $previewingChip) { chip in
                PastePreviewSheet(chip: chip, onRemove: {
                    pasteChips.removeAll { $0.id == chip.id }
                    previewingChip = nil
                })
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            // ── /clear confirmation ──────────────────────────────────────────
            .alert("Start \(model.room.title) fresh?", isPresented: $showingClearConfirm) {
                Button("Cancel", role: .cancel) { clearFailed = false }
                Button("Clear chat", role: .destructive) { runClear() }
            } message: {
                Text("Nothing is deleted — messages stay in History. The agent will receive a scoped reset.")
            }
            .onAppear {
                router.remember(model.room)
                model.start()
                // The waiting set marks files inside the thread too, so it loads with the
                // room rather than only when the review screen is opened.
                Task { await review.load() }
                Task { await model.loadModelPreference() }
                Task { await model.loadRoomAgentPreference() }
                // Capture the prior receipt before advancing it; the transcript uses
                // this stable value to draw the one "New" boundary for this visit.
                if !capturedReadCutoff {
                    let previous = ReadStateStore.shared.lastRead(for: model.room.roomID)
                    readCutoffOnOpen = previous > 0 ? previous : nil
                    capturedReadCutoff = true
                }
                if model.draft.isEmpty,
                   let savedDraft = UserDefaults.standard.string(forKey: draftStorageKey) {
                    model.draft = savedDraft
                }
                // Stamp the per-room read time so the home dot clears immediately.
                let now = Date().timeIntervalSince1970 * 1000
                ReadStateStore.shared.markRead(roomID: model.room.roomID, ts: now)
                PushService.shared.markRoomRead(model.room.roomID)
                // And tell the server, so the badge clears on the web too rather than
                // this phone being the only place that knows the room was read.
                Task { await ReadStateStore.shared.markReadRemote(roomID: model.room.roomID, at: now) }
            }
            .onDisappear { model.stop() }
            // Re-stamp when new messages arrive while the room is open — keeps the dot
            // clear if a push notification arrived while the user was already in here.
            .onChange(of: model.rows.count) { _, _ in
                // Local only. The remote receipt is sent on room open and throttled —
                // a mutation per arriving message would be a database write every 2.5s
                // per open room, which is real money on this backend's I/O budget.
                ReadStateStore.shared.markRead(
                    roomID: model.room.roomID,
                    ts: Date().timeIntervalSince1970 * 1000
                )
            }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { model.handleForeground() }
            }
            // ── Paste chip detection ─────────────────────────────────────────
            // When the draft grows by more than the chip threshold in a single change
            // (i.e. a paste rather than typing), extract the inserted text and convert
            // it to a chip rather than filling the field with a wall of text.
            .onChange(of: model.draft) { old, new in
                if new.isEmpty {
                    UserDefaults.standard.removeObject(forKey: draftStorageKey)
                } else {
                    UserDefaults.standard.set(new, forKey: draftStorageKey)
                }
                guard new.count - old.count > 50 else { return } // cheap early exit
                guard let inserted = extractInserted(old: old, new: new) else { return }
                guard PasteChip.shouldChip(inserted) else { return }
                // Revert the draft to its pre-paste state and create a chip.
                let chip = PasteChip.make(from: inserted)
                pasteChips.append(chip)
                model.draft = old
            }
    }

    // MARK: - /clear helpers

    private func runClear() {
        guard !clearBusy else { return }
        clearBusy = true
        Task { @MainActor in
            let ok = await model.clearRoom()
            clearBusy = false
            clearFailed = !ok
        }
    }

    // MARK: - Custom nav title (R5 chat-header parity)

    /// Avatar + room name + live status — the web's desktop-room-header, compressed
    /// for the phone's nav bar. Tapping it opens room settings.
    ///
    /// Corner v2 (native Task 5): the "Switch specialist" agent menu is gone.
    /// There are no agent rooms, filters, or destinations anywhere in v2 — a
    /// header that swaps this conversation for a specialist's is navigation
    /// state the contract forbids. `@brain` mentions still route server-side.
    private var headerTitle: some View {
        Button { showingSettings = true } label: {
            HStack(spacing: 8) {
                RoomAvatarView(room: model.room, size: 30, isActive: model.isAwaiting)
                VStack(alignment: .leading, spacing: 1) {
                    Text(displayTitle)
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .accessibilityIdentifier("chat-title")
                    // Status line: THE one vocabulary word while the room has
                    // something to say — Thinking / Working / Writing / Stopping… /
                    // Needs you / Stuck — else the room's subtitle. Same derivation
                    // every surface uses; the header can never disagree with the card.
                    HStack(spacing: 4) {
                        let status = model.roomStatus
                        if status != .idle {
                            // Single presence dot lives on the avatar (RoomAvatarView);
                            // the pill carries only the status label text (mirrors web
                            // ce7ad25a — one dot, not two).
                            Text(status.label)
                                .font(.hanken(10.5).weight(.medium))
                                .foregroundStyle(status.tone == .blocked ? Theme.warning : Theme.live)
                        } else {
                            let sub = model.room.subtitle.isEmpty
                                ? model.room.typeLabel.lowercased()
                                : model.room.subtitle
                            Text(sub)
                                .font(.hanken(10.5).weight(.medium))
                                .foregroundStyle(Theme.inkSoft)
                        }
                    }
                    .animation(.easeOut(duration: 0.2), value: model.roomStatus)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(model.room.title) — open room settings")
    }

    // MARK: - Search bar (R5)

    /// An inline search field that appears at the top of the message list.
    /// Mirrors the web's "Search conversation" from the more menu.
    private var searchBar: some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundStyle(Theme.inkSoft)

            TextField("Search messages…", text: $searchQuery)
                .font(.hanken(14))
                .foregroundStyle(Theme.ink)
                .focused($searchFocused)
                .autocorrectionDisabled()
                .onSubmit { } // keep keyboard visible while typing

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                    searchFocused = true
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.inkSoft)
                }
                .accessibilityLabel("Clear search")
            }

            Button {
                withAnimation(.easeInOut(duration: 0.18)) {
                    isSearching = false
                    searchQuery = ""
                }
            } label: {
                Text("Cancel")
                    .font(.hanken(13).weight(.medium))
                    .foregroundStyle(Theme.accent)
            }
        }
        .padding(.horizontal, Theme.s4)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised)
        .overlay(
            Divider(), alignment: .bottom
        )
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    // MARK: - Thread

    /// Scroll metrics for the one scroll brain (R18 N4): the thread content's
    /// height and its offset inside the scroll viewport, measured continuously.
    private struct ThreadMetrics: Equatable {
        var contentHeight: CGFloat = 0
        var minY: CGFloat = 0
    }

    private struct ThreadMetricsKey: PreferenceKey {
        static let defaultValue = ThreadMetrics()
        static func reduce(value: inout ThreadMetrics, nextValue: () -> ThreadMetrics) {
            value = nextValue()
        }
    }

    /// The id the tail actions scroll to: the draft while one is writing, else
    /// the newest thread row. (The old "turn-indicator" anchor was a silent
    /// no-op — the indicator left the scroll for the pinned inset long ago.)
    private var tailAnchorID: String? {
        if model.liveDraft != nil { return "stream-draft" }
        return model.thread.last?.id
    }

    /// Height-growth signature: live steps + draft length change the thread's
    /// height WITHOUT changing its count — the exact case the len-guard alone
    /// would strand the reader on (the web's liveKey + contentKey, joined).
    private var growthKey: Int {
        var hasher = Hasher()
        for step in model.liveSteps {
            hasher.combine(step.id)
            hasher.combine(step.text)
            hasher.combine(step.timestamp)
        }
        hasher.combine(model.liveDraft?.count ?? 0)
        return hasher.finalize()
    }

    private func performScroll(_ action: ScrollBrain.Action, proxy: ScrollViewProxy) {
        guard let anchor = tailAnchorID else { return }
        switch action {
        case .none:
            break
        case .snapInstant:
            // After layout (the web's requestAnimationFrame) — snapping before
            // the new height lands scrolls to the OLD bottom.
            DispatchQueue.main.async {
                proxy.scrollTo(anchor, anchor: .bottom)
            }
        case .followSmooth:
            withAnimation(.easeOut(duration: 0.2)) {
                proxy.scrollTo(anchor, anchor: .bottom)
            }
        }
    }

    private func updateJumpPill() {
        let show = scrollBrain.showJump(
            awaiting: model.turnIsOpen,
            distanceFromBottom: distanceFromBottom
        )
        if show != showJump {
            withAnimation(.spring(duration: 0.3, bounce: 0.2)) { showJump = show }
        }
    }

    /// The active thread, filtered by `searchQuery` when search is open.
    /// Outbox items are excluded from search results — they haven't landed yet.
    private var visibleThread: [ThreadItem] {
        let full = model.thread
        guard isSearching, !searchQuery.isEmpty else { return full }
        let q = searchQuery.lowercased()
        return full.filter { item in
            switch item {
            case .message(let row):
                return (row.text ?? "").lowercased().contains(q)
            case .outbox(let pending):
                return pending.text.lowercased().contains(q)
            }
        }
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Theme.s3) {
                    switch model.loadState {
                    case .loading:
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.top, Theme.s6)
                    case .error(let message):
                        centeredNotice(message, systemImage: "wifi.exclamationmark")
                    case .empty:
                        centeredNotice("No messages yet — say something.", systemImage: "bubble.left")
                    case .ready:
                        if let messageFocusNotice {
                            messageFocusBanner(
                                messageFocusNotice,
                                canRetry: router.messageFocus != nil,
                                retry: {
                                    if let focus = router.messageFocus {
                                        attemptMessageFocus(focus, proxy: proxy)
                                    }
                                }
                            )
                        }
                        if model.isShowingCachedThread {
                            cachedThreadBanner
                        }
                        if let notice = model.catchUpNotice {
                            catchUpBanner(notice)
                        }
                        let thread = visibleThread
                        // Search empty state
                        if isSearching, !searchQuery.isEmpty, thread.isEmpty {
                            centeredNotice("No messages match \"\(searchQuery)\"", systemImage: "magnifyingglass")
                        } else {
                            ForEach(Array(thread.enumerated()), id: \.element.id) { index, item in
                                if opensDay(at: index, in: thread), let date = threadDate(item) {
                                    dayDivider(for: date)
                                }
                                if opensUnread(at: index, in: thread) {
                                    unreadDivider
                                }
                                switch item {
                                case .message(let row):
                                    MessageBubbleView(
                                        row: row,
                                        onOption: { model.draftOption($0) },
                                        room: model.room,
                                        waitingIDs: waitingIDs,
                                        showsAuthor: opensGroup(at: index, in: thread),
                                        roomAgent: model.roomAgentChoice
                                    )
                                    .background(
                                        RoundedRectangle(cornerRadius: Theme.s2, style: .continuous)
                                            .fill(highlightedMessageID == row.id ? Theme.accent.opacity(0.14) : Color.clear)
                                            .padding(.horizontal, -Theme.s2)
                                            .padding(.vertical, -Theme.s1)
                                    )
                                    .animation(.easeInOut(duration: 0.22), value: highlightedMessageID)
                                    // R53: message-arrive spring — matches web's cv6MsgIn (spring-bounce, 220ms)
                                    .transition(.asymmetric(
                                        insertion: .opacity.combined(with: .scale(scale: 0.97)).combined(with: .offset(y: 6)),
                                        removal: .opacity
                                    ))
                                    .id(row.id)
                                case .outbox(let pending):
                                    OutboxBubbleView(
                                        item: pending,
                                        retry: { model.retry(pending) },
                                        discard: { model.discard(pending) }
                                    )
                                    // R53: outbox send spring — user's message pops up from composer
                                    .transition(.asymmetric(
                                        insertion: .opacity.combined(with: .scale(scale: 0.95)).combined(with: .offset(y: 10)),
                                        removal: .opacity
                                    ))
                                    .id(pending.id)
                                }
                            }
                        }
                        // The live partial reply rides the thread tail — above
                        // the pinned work card by construction (the card is
                        // outside the scroll). Gated on the open turn; the real
                        // row replaces it in the same engine pass it lands.
                        if !isSearching, let draftText = model.liveDraft {
                            StreamingDraftBubble(
                                authorTitle: model.room.title,
                                text: draftText
                            )
                            .id("stream-draft")
                        }
                        Color.clear.frame(height: 1)
                    }
                }
                .padding(.horizontal, Theme.s4)
                .padding(.top, Theme.s3)
                // 24pt clear air + composer reserve so messages never reach the input
                // — the tail used to sit 10pt above the card and could scroll under the
                // translucent composer on long threads (Patrik 2026-08-14).
                .padding(.bottom, 28)
                // Continuous measurement for the scroll brain: content height +
                // offset in the scroll's coordinate space.
                .background(
                    GeometryReader { geo in
                        Color.clear.preference(
                            key: ThreadMetricsKey.self,
                            value: ThreadMetrics(
                                contentHeight: geo.size.height,
                                minY: geo.frame(in: .named("chatThread")).minY
                            )
                        )
                    }
                )
            }
            .coordinateSpace(name: "chatThread")
            .onAppear {
                if let focus = router.messageFocus {
                    attemptMessageFocus(focus, proxy: proxy)
                }
            }
            .onChange(of: router.messageFocus) { _, focus in
                guard let focus else { return }
                attemptMessageFocus(focus, proxy: proxy)
            }
            .background(
                GeometryReader { geo in
                    Color.clear
                        .onAppear { scrollViewportHeight = geo.size.height }
                        .onChange(of: geo.size.height) { _, h in scrollViewportHeight = h }
                }
            )
            .onPreferenceChange(ThreadMetricsKey.self) { metrics in
                let distance = max(0, metrics.contentHeight + metrics.minY - scrollViewportHeight)
                distanceFromBottom = distance
                updateJumpPill()
            }
            .defaultScrollAnchor(.bottom)
            .scrollDismissesKeyboard(.interactively)
            // Landing in a room means landing at the BOTTOM — the anchor alone can
            // settle a hair short once images and cards size in, so the first ready
            // render pins the tail explicitly. (The old "turn-indicator" anchor was
            // a silent no-op; the tail anchor is real.)
            .onChange(of: model.loadState) { _, state in
                if case .ready = state {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                        if let anchor = tailAnchorID {
                            proxy.scrollTo(anchor, anchor: .bottom)
                        }
                    }
                }
            }
            // Rule 1 — count changes go through the brain: identical counts never
            // move, live turns follow, idle follows only near the tail. The old
            // yank-on-every-change is dead.
            .onChange(of: model.thread.count) { _, count in
                guard !isSearching else { return }
                performScroll(
                    scrollBrain.onCountChange(
                        count: count,
                        awaiting: model.turnIsOpen,
                        distanceFromBottom: distanceFromBottom
                    ),
                    proxy: proxy
                )
                updateJumpPill()
            }
            // Rule 2 — steps and the draft grow height without a count change;
            // re-pin the follower at the tail, after layout.
            .onChange(of: growthKey) { _, _ in
                guard !isSearching else { return }
                performScroll(
                    scrollBrain.onContentGrowth(
                        awaiting: model.turnIsOpen,
                        distanceFromBottom: distanceFromBottom
                    ),
                    proxy: proxy
                )
            }
            .onChange(of: model.turn) { _, _ in
                updateJumpPill()
            }
            // Rule 3 — the jump pill, anchored to the scroll container (never the
            // window): idle + far from the tail, one tap re-pins.
            .overlay(alignment: .bottom) {
                if showJump, !isSearching {
                    Button {
                        withAnimation(.easeOut(duration: 0.25)) {
                            if let anchor = tailAnchorID {
                                proxy.scrollTo(anchor, anchor: .bottom)
                            }
                        }
                    } label: {
                        JumpToLatestPill()
                    }
                    .padding(.bottom, Theme.s3)
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                    .accessibilityLabel("Jump to the latest message")
                }
            }
            .refreshable { await model.load() }
            // Horizontal flick → the recency carousel: right toward the more recent
            // room, left toward the older one. Files deliberately does NOT live on
            // this scroll view: an upward thread scroll must never open a sheet.
            .simultaneousGesture(
                DragGesture(minimumDistance: 40)
                    .onEnded { value in
                        let dx = value.translation.width
                        let dy = value.translation.height
                        if abs(dx) >= 56, abs(dx) > abs(dy) * 1.67 {
                            router.swipeChat(from: model.room, toMoreRecent: dx > 0)
                        }
                    }
            )
        }
    }

    /// The author a thread item belongs to, for sender grouping. Every outbox item and
    /// every user row is "you"; an agent row is keyed by its qualified title so a run of
    /// one specialist's replies groups under a single avatar + name.
    private func authorKey(_ item: ThreadItem) -> String {
        switch item {
        case .message(let row): return row.isUser ? "__you" : row.qualifiedDisplayName(room: model.room, roomAgent: model.roomAgentChoice)
        case .outbox: return "__you"
        }
    }

    /// True when this row starts a new sender group (first row, or a different author
    /// than the one above it) — the signal that drives the avatar + name header.
    private func opensGroup(at index: Int, in thread: [ThreadItem]) -> Bool {
        guard index > 0 else { return true }
        return authorKey(thread[index - 1]) != authorKey(thread[index])
    }

    private func threadDate(_ item: ThreadItem) -> Date? {
        switch item {
        case .message(let row): return row.date
        case .outbox(let pending): return pending.createdAt
        }
    }

    private var phoenixCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Phoenix") ?? .current
        return calendar
    }

    private func opensDay(at index: Int, in thread: [ThreadItem]) -> Bool {
        guard let current = threadDate(thread[index]) else { return false }
        guard index > 0, let previous = threadDate(thread[index - 1]) else { return true }
        return !phoenixCalendar.isDate(current, inSameDayAs: previous)
    }

    private func opensUnread(at index: Int, in thread: [ThreadItem]) -> Bool {
        guard let cutoff = readCutoffOnOpen,
              let current = threadDate(thread[index]),
              current.timeIntervalSince1970 * 1000 > cutoff
        else { return false }
        guard index > 0, let previous = threadDate(thread[index - 1]) else { return true }
        return previous.timeIntervalSince1970 * 1000 <= cutoff
    }

    private func dayDivider(for date: Date) -> some View {
        let calendar = phoenixCalendar
        let label: String
        if calendar.isDateInToday(date) {
            label = "Today"
        } else if calendar.isDateInYesterday(date) {
            label = "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.timeZone = calendar.timeZone
            formatter.dateFormat = "EEEE, MMM d"
            label = formatter.string(from: date)
        }
        return HStack(spacing: Theme.s3) {
            Rectangle().fill(Theme.hairline).frame(height: 1)
            Text(label)
                .font(.hkCaption.weight(.semibold))
                .foregroundStyle(Theme.inkSoft)
            Rectangle().fill(Theme.hairline).frame(height: 1)
        }
        .padding(.vertical, Theme.s2)
        .accessibilityLabel("Messages from \(label)")
    }

    private var unreadDivider: some View {
        HStack(spacing: Theme.s3) {
            Rectangle().fill(Theme.accent).frame(height: 1)
            Text("New")
                .font(.hkCaption.weight(.bold))
                .foregroundStyle(Theme.accent)
            Rectangle().fill(Theme.accent).frame(height: 1)
        }
        .padding(.vertical, Theme.s2)
        .accessibilityLabel("New messages")
    }


    // MARK: - Turn indicator

    private var turnIndicator: some View {
        TurnIndicatorView(
            turn: model.turn,
            steps: model.liveSteps,
            startedAt: model.turnStartedAt,
            quiet: model.turnIsQuiet,
            healthState: model.turnHealth?.state,
            stopControl: model.stopControl,
            onStop: { Task { await model.stopTurn() } },
            resend: { model.resendStalled() },
            dismiss: { model.dismissStalled() }
        )
        .padding(.horizontal, Theme.s3)
    }

    /// The recovery notice (R18 N2): the steward said needs_attention or
    /// recovering, and the room says WHY, with the action in the same surface —
    /// Restart on the allowlisted causes, resend/status-ask on agent_silent,
    /// Start fresh when repair has given up.
    @ViewBuilder
    private var recoveryNotice: some View {
        if let health = model.turnHealth,
           health.state == "needs_attention" || health.state == "recovering" {
            RoomRecoveryNoticeView(
                health: health,
                canResend: model.turn == .idle,
                onRestart: { Task { await model.repairTurn() } },
                onResend: { model.resendAfterRecovery() },
                onAskStatus: { model.askForStatus() },
                onStartFresh: { Task { _ = await model.clearRoom(); model.dismissRecovery() } },
                onDismiss: { model.dismissRecovery() }
            )
            .padding(.horizontal, Theme.s3)
        }
    }

    /// The stop honesty strip: a stop was accepted but nothing confirmed it.
    private func stopNoticeStrip(_ text: String) -> some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 12))
            Text(text).font(.hkCaption)
            Spacer(minLength: 0)
            Button("Dismiss") { model.dismissRecovery() }
                .font(.hkCaption.weight(.semibold))
        }
        .foregroundStyle(Theme.warning)
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                .strokeBorder(Theme.warning.opacity(0.35), lineWidth: 1)
        )
        .padding(.horizontal, Theme.s3)
    }

    private func catchUpBanner(_ text: String) -> some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "arrow.down.circle")
            Text(text).font(.hkCaption)
            Spacer()
            Button("Dismiss") { model.catchUpNotice = nil }
                .font(.hkCaption)
        }
        .foregroundStyle(Theme.inkSoft)
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.s2, style: .continuous))
    }

    private func messageFocusBanner(
        _ text: String,
        canRetry: Bool,
        retry: @escaping () -> Void
    ) -> some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "exclamationmark.bubble")
            Text(text).font(.hkCaption)
            Spacer(minLength: Theme.s2)
            if canRetry {
                Button("Try again", action: retry)
                    .font(.hkCaption.weight(.semibold))
                    .buttonStyle(.borderless)
            }
        }
        .foregroundStyle(Theme.inkSoft)
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.s2, style: .continuous))
    }

    private func attemptMessageFocus(_ focus: MessageFocus, proxy: ScrollViewProxy) {
        guard focus.roomID == model.room.roomID,
              resolvingMessageFocusID != focus.id
        else { return }
        resolvingMessageFocusID = focus.id
        messageFocusNotice = nil
        Task { @MainActor in
            let resolution = await model.resolveMessageReference(focus.messageID)
            guard router.messageFocus?.id == focus.id else {
                resolvingMessageFocusID = nil
                return
            }
            switch resolution {
            case .found(let rowID):
                // A lookup can insert an older row into the LazyVStack. Give SwiftUI
                // one layout turn to materialize its scroll id before asking the
                // proxy to center it; an immediate scroll is a silent no-op.
                try? await Task.sleep(for: .milliseconds(50))
                guard router.messageFocus?.id == focus.id else {
                    resolvingMessageFocusID = nil
                    return
                }
                withAnimation(.easeOut(duration: 0.28)) {
                    proxy.scrollTo(rowID, anchor: .center)
                }
                highlightedMessageID = rowID
                router.consumeMessageFocus(focus.id)
                UIAccessibility.post(notification: .announcement, argument: "Opened notification message")
                Task { @MainActor in
                    try? await Task.sleep(for: .seconds(2))
                    if highlightedMessageID == rowID {
                        highlightedMessageID = nil
                    }
                }
            case .notFound:
                messageFocusNotice = "That message is no longer available in this room."
                router.consumeMessageFocus(focus.id)
            case .unavailable:
                messageFocusNotice = "Couldn't load that message."
            }
            resolvingMessageFocusID = nil
        }
    }

    private var cachedThreadBanner: some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "wifi.slash")
            VStack(alignment: .leading, spacing: 1) {
                Text("Not syncing — showing saved messages")
                    .font(.hkCaption.weight(.semibold))
                if let verified = model.cachedThreadVerifiedAt {
                    Text("Last synced \(verified.formatted(.relative(presentation: .named)))")
                        .font(.hkCaption2)
                }
            }
            Spacer(minLength: Theme.s2)
            Button("Try again") { Task { await model.load() } }
                .font(.hkCaption.weight(.semibold))
                .buttonStyle(.borderless)
        }
        .foregroundStyle(Theme.inkSoft)
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.s2, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private func centeredNotice(_ text: String, systemImage: String) -> some View {
        VStack(spacing: Theme.s2) {
            Image(systemName: systemImage).font(.hkTitle2)
            Text(text)
                .font(.hkFootnote)
                .multilineTextAlignment(.center)
        }
        .foregroundStyle(Theme.inkSoft)
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.s6)
    }

    // MARK: - Composer (the web's two-row card, .cv6-floating-composer)

    private var canSend: Bool {
        let trimmed = model.draft.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty || !model.staged.isEmpty || !pasteChips.isEmpty
    }

    /// Wrapped send: appends paste chip text then fires model.send(). The composer stays
    /// present so one send never hides the primary action for the next.
    private func sendWithChips() {
        let trimmed = model.draft.trimmingCharacters(in: .whitespacesAndNewlines)
        // /clear detection — arm the confirm bar instead of sending.
        if trimmed == "/clear" && pasteChips.isEmpty && model.staged.isEmpty {
            model.draft = ""
            showingClearConfirm = true
            return
        }
        // Append any paste chips to the draft before handing off to the view model.
        if !pasteChips.isEmpty {
            let suffix = "\n\n" + pasteChips.map(\.text).joined(separator: "\n\n")
            model.draft += suffix
            pasteChips = []
        }
        model.send()
    }

    // MARK: - Checklist helpers

    /// Send a text from the checklist panel without collapsing the composer —
    /// the user stays in the checklist so they can play more items.
    private func sendChecklistText(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        model.draft = trimmed
        model.send()
        // The checklist panel stays open after play.
    }

    private var composer: some View {
        VStack(spacing: 10) {
            if let error = model.uploadError { uploadErrorRow(error) }
            // When the checklist panel is open, the input area is replaced.
            if checklistOpen {
                RoomChecklistPanelView(
                    room: model.room,
                    onSend: sendChecklistText,
                    onClose: {
                        withAnimation(.spring(response: 0.24, dampingFraction: 0.8)) {
                            checklistOpen = false
                        }
                    }
                )
            } else {
                if !model.staged.isEmpty { stagedChips }
                // Paste chips sit between file chips and the input shell.
                if !pasteChips.isEmpty { pasteChipBar }
                inputShell
            }
            actionRow
        }
        .padding(Theme.s2)
        .background {
            // Opaque composer so messages scrolling underneath never show through
            // — prevents the overlap reads-through on long threads (Patrik 2026-08-14).
            Theme.frostedSurface(
                fallback: Theme.composer,
                tint: Color(cv6: 0x111820, opacity: 0.45),
                in: RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous)
            )
        }
        .overlay(
            RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.55), radius: 21, y: 9)
        .padding(.horizontal, Theme.s3)
        .padding(.bottom, Theme.s2)
        .contentShape(RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous))
        // Patrik's R16 correction: Files opens only from a deliberate upward
        // gesture that STARTS on the composer card. Keeping the recognizer here
        // makes ordinary conversation scrolling incapable of triggering it.
        .simultaneousGesture(
            DragGesture(minimumDistance: 52, coordinateSpace: .local)
                .onEnded { value in
                    let dx = value.translation.width
                    let dy = value.translation.height
                    if dy <= -72, abs(dy) > abs(dx) * 1.5 {
                        showingFiles = true
                    }
                }
        )
        .photosPicker(
            isPresented: $showingPhotoPicker, selection: $pickedPhotos,
            maxSelectionCount: 5, matching: .images
        )
        .onChange(of: pickedPhotos) { _, items in
            guard !items.isEmpty else { return }
            pickedPhotos = []
            Task { await stagePhotos(items) }
        }
        .fileImporter(
            isPresented: $showingFilePicker,
            allowedContentTypes: [.item], allowsMultipleSelection: true
        ) { result in
            guard case .success(let urls) = result else { return }
            Task { await stageFiles(urls) }
        }
    }

    /// Row 1 — the input shell: attach + growing field on the composer-card surface,
    /// accent border + soft ring while focused, spring scale so it lifts slightly like iOS.
    private var inputShell: some View {
        HStack(alignment: .bottom, spacing: 6) {
            Menu {
                Button { showingPhotoPicker = true } label: {
                    Label("Photo Library", systemImage: "photo.on.rectangle")
                }
                Button { showingFilePicker = true } label: {
                    Label("Choose Files", systemImage: "folder")
                }
            } label: {
                Group {
                    if model.isUploading {
                        ProgressView().controlSize(.small).tint(Theme.accent).scaleEffect(0.85).frame(width: 20, height: 20).frame(width: 44, height: 44)
                    } else {
                        Image(systemName: "paperclip")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
                .frame(width: 44, height: 44)
            }
            .disabled(model.isUploading)
            .accessibilityLabel("Attach and upload files")

            TextField("Message \(model.room.title)…", text: $model.draft, axis: .vertical)
                .font(.hanken(16))
                .lineLimit(1...5)
                .focused($composerFocused)
                .foregroundStyle(Theme.ink)
                .padding(.vertical, 8)
                .padding(.trailing, Theme.s2)
                // The UI acceptance test needs to tell THIS composer apart from the Home
                // intake box. Without it the test typed its message on the home screen,
                // never entered a room, and then reported that the message "never appeared
                // in the conversation" — a false failure that looked exactly like a real
                // send bug. Identify the room composer explicitly.
                .accessibilityIdentifier("chat-composer")
        }
        .padding(.leading, Theme.s1)
        .frame(minHeight: 44)
        .background(Theme.composerCard, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(composerFocused ? Theme.accent : Theme.hairline, lineWidth: 1)
        )
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(composerFocused ? Theme.accentWeak : Color.clear)
                .padding(-2)
        )
        .scaleEffect(composerFocused ? 1.005 : 1)
        .animation(.spring(response: 0.22, dampingFraction: 0.78), value: composerFocused)
    }

    /// Row 2 — the action row: ONE commands menu on the left (the web popover's
    /// consolidation: Work/Plan, Model, Files), the checklist toggle, send on the
    /// right. Attach stays in Row 1; send stays standalone.
    private var actionRow: some View {
        HStack(spacing: 6) {
            commandsMenu

            // ── Checklist toggle (R11) ─────────────────────────────────────────
            // Tapping swaps the input shell for RoomChecklistPanelView, matching
            // the web's checklist-toggle button in Cv6InputBar exactly.
            Button {
                withAnimation(.spring(response: 0.24, dampingFraction: 0.8)) {
                    checklistOpen.toggle()
                }
            } label: {
                Image(systemName: "checklist")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(checklistOpen ? Theme.accent : Theme.inkSoft)
                    .frame(width: 34, height: 30)
                    .background(
                        checklistOpen ? Theme.accentWeak : Theme.raised2,
                        in: RoundedRectangle(cornerRadius: 7, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .strokeBorder(checklistOpen ? Theme.accent : Theme.hairline, lineWidth: 1)
                    )
            }
            .accessibilityLabel(checklistOpen ? "Close room checklists" : "Open room checklists")

            Spacer(minLength: 0)

            Button(action: sendWithChips) {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(canSend ? Color.white : Theme.inkFaint)
                    .frame(width: 44, height: 44)
                    .background(
                        canSend ? Theme.accent : Theme.raised2,
                        in: RoundedRectangle(cornerRadius: canSend ? 14 : 11, style: .continuous)
                    )
                    .overlay {
                        if !canSend { RoundedRectangle(cornerRadius: 11, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1) }
                    }
                    .shadow(color: canSend ? Theme.accent.opacity(0.28) : .clear, radius: 6, y: 3)
            }
            .frame(width: 44, height: 44)
            .scaleEffect(canSend ? 1 : 0.92)
            .opacity(canSend ? 1 : 0.42)
            .animation(.spring(response: 0.28, dampingFraction: 0.72), value: canSend)
            // The send control had no name a test could address. The UI acceptance run
            // therefore fell back to pressing return, and this composer is multiline
            // (axis: .vertical), so return inserts a newline and sends nothing. The test
            // then reported "the message never appeared in the conversation", which reads
            // as a broken send on a send that was never triggered.
            .accessibilityIdentifier("send")
            .accessibilityLabel("Send message")
            .disabled(!canSend)
            .accessibilityLabel("Send")
        }
    }

    /// The web's Commands popover, as one native menu behind the sparkles chip:
    /// the Work/Plan mode toggle, the Model submenu, and "Files in this
    /// conversation". R19: this content builder is THE menu — the legacy room
    /// composer and the v2 pill share it through their adapters, so there is
    /// no second menu to drift. The chip's label stays live — model
    /// short-name, plus "Plan" whenever the non-default mode is armed, so
    /// neither choice hides just because its control moved into a menu.
    @MainActor
    private func commandsMenuContent<S: CommandsMenuState>(state: S) -> some View {
        Group {
            // Work / Plan — a Picker renders as inline checkmark rows in a Menu,
            // the native shape of the web's segmented toggle.
            Picker("Mode", selection: Binding(
                get: { state.chatMode },
                set: { state.setMode($0) }
            )) {
                Label("Work", systemImage: "hammer").tag("work")
                Label("Plan", systemImage: "list.bullet.rectangle").tag("plan")
            }
            // The web's caption under its toggle, verbatim.
            Text(state.chatMode == "plan"
                 ? "Corner will propose a plan first"
                 : "Corner gets to work directly")

            // Model submenu — the same options and checkmark the old chip menu had.
            Menu {
                ForEach(ChatView.modelOptions, id: \.id) { option in
                    Button {
                        Task { await state.selectModel(option.id) }
                    } label: {
                        if option.id == state.modelChoice {
                            Label(option.label, systemImage: "checkmark")
                        } else {
                            Text(option.label)
                        }
                    }
                }
            } label: {
                Label("Model — \(ChatView.shortModelLabel(state.modelChoice))", systemImage: "cpu")
            }

            if state.hasSpecialist {
                Menu {
                    Button {
                        Task { await state.selectSpecialist("default") }
                    } label: {
                        if state.specialistChoice == "default" {
                            Label(state.specialistDefaultTitle, systemImage: "checkmark")
                        } else {
                            Text(state.specialistDefaultTitle)
                        }
                    }
                    ForEach(state.specialistRoster, id: \.slug) { specialist in
                        Button {
                            Task { await state.selectSpecialist(specialist.slug) }
                        } label: {
                            if specialist.slug == state.specialistChoice {
                                Label(specialist.title, systemImage: "checkmark")
                            } else {
                                Text(specialist.title)
                            }
                        }
                    }
                } label: {
                    Label("Specialist — \(state.specialistTitle)", systemImage: "person.crop.circle")
                }
            }

            Button { state.openFiles() } label: {
                Label("Files in this conversation", systemImage: "folder")
            }

            Button { state.openImageGenerator() } label: {
                Label("Generate an image", systemImage: "photo.badge.plus")
            }
        }
    }

    /// The legacy room path's adapter: server-persisted prefs on the room.
    private var legacyCommandsState: LegacyCommandsState {
        LegacyCommandsState(
            model: model,
            onOpenFiles: { showingFiles = true },
            onOpenImageGenerator: { showingImageGenerator = true }
        )
    }

    private var commandsMenu: some View {
        Menu {
            commandsMenuContent(state: legacyCommandsState)
        } label: {
            HStack(spacing: 7) {
                Image(systemName: "sparkles")
                    .font(.system(size: 13, weight: .medium))
                Text(commandsChipLabel)
                    .font(.hanken(11.5).weight(.bold))
            }
            .foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 10)
            .frame(height: 30)
            .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
        }
        .accessibilityLabel("Commands — specialist, mode, model, files, image generation")
    }

    private var commandsChipLabel: String {
        let primary = model.room.agentPreferenceKey == nil
            ? ChatView.shortModelLabel(model.modelChoice)
            : model.roomAgentTitle
        return model.chatMode == "plan" ? "\(primary) · Plan" : primary
    }

    /// The v2 pill's adapter: per-thread persisted prefs on the v2 model;
    /// Files opens the conversation's Visual Window. R28: Generate an image
    /// runs the v2 image flow (Generating… run + a real artifact tab, or the
    /// prompt sheet when the field is empty) — never the legacy room sheet.
    private var v2CommandsState: V2CommandsState {
        V2CommandsState(
            model: v2model,
            onOpenFiles: { window.isPresented = true },
            onOpenImageGenerator: { v2GenerateImage(prompt: v2model.draft) }
        )
    }

    /// The v2 chip label: the thread's model short-name (or its specialist
    /// when one is picked), plus "Plan" when Plan is armed — the same live
    /// rule as the legacy chip.
    private var v2CommandsChipLabel: String {
        let primary = v2model.specialistChoice == "default"
            ? ChatView.shortModelLabel(v2model.modelChoice)
            : v2model.specialistTitle
        return v2model.chatMode == "plan" ? "\(primary) · Plan" : primary
    }

    /// R19: the commands chip INSIDE the v2 pill, left of Record. Its look
    /// follows the design's Record chip (32pt height, 8pt radius, 12px label)
    /// so the pill still reads as the design with one more chip. R24 P076:
    /// icon-only while the field is empty (same height/radius/glyph, tighter
    /// padding) so the full placeholder fits at 390; the label returns the
    /// moment there is text to send.
    private func v2CommandsChip(collapsed: Bool) -> some View {
        Menu {
            commandsMenuContent(state: v2CommandsState)
            // R28: Talk aloud lives in the menu (R27 web's placement — a bar
            // button would overflow narrow composers), plus checklist
            // playback of the filled review notes.
            Divider()
            Toggle(isOn: Binding(
                get: { talkAloud?.enabled ?? false },
                set: { talkAloud?.setEnabled($0) }
            )) {
                Label("Talk aloud", systemImage: "speaker.wave.2")
            }
            Button {
                talkAloud?.speakChecklist(texts: v2review.sendablePins.map(\.text))
            } label: {
                Label("Read checklist aloud", systemImage: "list.bullet")
            }
            .disabled(v2review.sendablePins.isEmpty)
        } label: {
            HStack(spacing: 5) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12, weight: .medium))
                if !collapsed {
                    Text(v2CommandsChipLabel)
                        .font(.hanken(12).weight(.semibold))
                }
            }
            .foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, collapsed ? 4 : 10)
            .frame(height: 32)
            .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
        }
        .accessibilityIdentifier("v2-commands")
        .accessibilityValue(collapsed ? "collapsed" : "expanded")
        .accessibilityLabel("Commands — specialist, mode, model, files, image generation")
        .accessibilitySortPriority(3)
    }

    /// Staged files, as removable chips above the shell — the web's pinned-chip row.
    private var stagedChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(model.staged) { file in
                    HStack(spacing: 6) {
                        Image(systemName: "doc")
                            .font(.system(size: 10, weight: .semibold))
                        Text(file.name)
                            .font(.hanken(11.5).weight(.semibold))
                            .lineLimit(1)
                        Button { model.removeStaged(file) } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .accessibilityLabel("Remove \(file.name)")
                    }
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, 10)
                    .frame(height: 26)
                    .background(Theme.accentWeak, in: Capsule())
                }
            }
        }
    }

    /// Paste chips — long pastes collapsed into dismissible tokens.
    /// Mirrors PasteChip.jsx: clipboard icon, "Pasted text · N lines", X.
    /// Tapping the label opens the full-text preview sheet.
    private var pasteChipBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(pasteChips) { chip in
                    HStack(spacing: 6) {
                        Image(systemName: "doc.on.clipboard")
                            .font(.system(size: 10, weight: .semibold))
                        Button {
                            previewingChip = chip
                        } label: {
                            Text("Pasted text · \(chip.lineCount) lines")
                                .font(.hanken(11.5).weight(.semibold))
                                .lineLimit(1)
                        }
                        .buttonStyle(.plain)
                        Button {
                            pasteChips.removeAll { $0.id == chip.id }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .accessibilityLabel("Remove pasted text")
                    }
                    .foregroundStyle(Theme.accent)
                    .padding(.horizontal, 10)
                    .frame(height: 26)
                    .background(Theme.accentWeak, in: Capsule())
                }
            }
        }
    }

    private func uploadErrorRow(_ message: String) -> some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 11))
            Text(message).font(.hanken(12))
            Spacer(minLength: 0)
            Button("Dismiss") { model.uploadError = nil }
                .font(.hanken(12).weight(.semibold))
        }
        .foregroundStyle(Theme.danger)
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, 6)
        .background(Theme.danger.opacity(0.12), in: RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous))
    }

    // MARK: - Picking + staging

    private func stagePhotos(_ items: [PhotosPickerItem]) async {
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else {
                model.uploadError = "That photo could not be read."
                continue
            }
            let type = item.supportedContentTypes.first
            let ext = type?.preferredFilenameExtension ?? "jpg"
            let mime = type?.preferredMIMEType ?? "image/jpeg"
            let stamp = Int(Date().timeIntervalSince1970)
            await model.stageFile(data: data, filename: "photo-\(stamp).\(ext)", mime: mime)
        }
    }

    private func stageFiles(_ urls: [URL]) async {
        for url in urls {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else {
                model.uploadError = "\(url.lastPathComponent) could not be read."
                continue
            }
            let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
                ?? "application/octet-stream"
            await model.stageFile(data: data, filename: url.lastPathComponent, mime: mime)
        }
    }

    // MARK: - Model options (chatConstants.js MODEL_OPTIONS)

    // Mirrors aom-studio/src/dashboard/data/models.json — single source in
    // api/dashboard/agent-model.js ALLOWED_MODELS. Keep labels identical to
    // web's MODEL_OPTIONS so a shared spec never diverges.
    static let modelOptions: [(id: String, label: String)] = [
        ("default", "Auto (Claude → Codex)"),
        ("opus", "Claude Opus"),
        ("sonnet", "Claude Sonnet"),
        ("haiku", "Claude Haiku"),
        ("muse-spark", "Muse Spark"),
        ("openai-gpt-5.6", "OpenAI GPT-5.6"),
        ("codex-local", "Codex on this computer"),
    ]

    static func shortModelLabel(_ id: String) -> String {
        switch id {
        case "default": return "Auto"
        case "opus": return "Opus"
        case "sonnet": return "Sonnet"
        case "haiku": return "Haiku"
        case "muse-spark": return "Spark"
        case "openai-gpt-5.6": return "GPT-5.6"
        case "codex-local": return "Codex"
        default: return id
        }
    }
}

// MARK: - Turn indicator

/// The honest answer to "is anything happening" — and a LIVING one. While a turn is
/// open it shows an animated working mark plus an elapsed clock that visibly counts
/// ("Working — 2m 10s"), and when the bridge is emitting real steps they render as a
/// compact progress list: latest line always visible, the full run behind a
/// disclosure. Zero steps (today's reality for phone turns) means the timer alone —
/// never an empty list. Only after ten minutes of TOTAL silence does the soft
/// "still quiet" notice appear, and any reply clears it on the spot: a reply is the
/// conversation continuing, never a resurrection.
// MARK: - Corner v2 event rows (native Task 5)
//
// One `ThreadEvent` on screen. Agent events carry a visible label (the
// provider-neutral `agentLabel`); the label is paint, never a destination —
// tapping it does nothing, because there is nowhere to go. Every block the
// backend emits renders; question options send their title as a new message.

/// R17 phone-thread clock: `6:41`.
private enum V2ThreadClock {
    static func string(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "h:mm"
        return f.string(from: date)
    }
}

struct V2EventRow: View {
    let event: ThreadEvent
    let threadID: String
    /// The owning project name — the design's agent line reads `Aster 6:41`.
    let agentName: String?
    let onSend: (String) -> Void
    /// R28 reply-to: long-press a message → Reply arms the composer's quote
    /// chip. Defaults to no-op so previews stay untouched.
    var onReply: (V2ReplyQuote) -> Void = { _ in }
    /// R32 reply-to: tap the rendered quote to jump to the quoted message.
    /// Defaults to no-op so previews stay untouched.
    var onQuoteTap: (String) -> Void = { _ in }

    // NOTE: no identifier on these layout containers — it would overwrite
    // the agent label's and block text's own identifiers (same finding as
    // chat-screen). Tests address the leaves directly.

    /// The agent line: a specialist label on the event wins; otherwise the
    /// project name (the default agent), then the event label, then Corner.
    private var displayAgentName: String {
        if let label = event.agentLabel, label != "Corner" { return label }
        return agentName ?? event.agentLabel ?? "Corner"
    }

    /// Who wrote this row, for the quote chip ("You" for own messages).
    private var replySender: String {
        event.author == .user ? "You" : displayAgentName
    }

    /// The quotable text of this row, if it carries any.
    private var replyQuote: V2ReplyQuote? {
        V2ReplyQuote.quote(messageID: event.id, sender: replySender, blocks: event.blocks)
    }
    /// R32 reply-to: the quote this message answers, rendered from the
    /// block payload (the server-stored `replyTo`), never from text.
    private func quoteCard(_ quote: V2ReplyQuote, isUser: Bool) -> some View {
        Button {
            onQuoteTap(quote.messageID)
        } label: {
            HStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(isUser ? Color.white.opacity(0.7) : Theme.accent)
                    .frame(width: 3)
                VStack(alignment: .leading, spacing: 1) {
                    Text(quote.sender)
                        .font(.hanken(11).weight(.semibold))
                        .foregroundStyle(isUser ? Color.white.opacity(0.85) : Theme.inkSoft)
                        .lineLimit(1)
                    Text(quote.snippet)
                        .font(.hanken(12))
                        .foregroundStyle(isUser ? Color.white : Theme.inkSoft)
                        .lineLimit(1)
                }
                .padding(.leading, 8)
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("v2-event-quote")
        .accessibilityLabel("Quoted message from \(quote.sender). Activate to jump to it.")
    }

    var body: some View {
        if event.author == .user {
            VStack(alignment: .trailing, spacing: 4) {
                if let quote = event.replyQuote {
                    quoteCard(quote, isUser: true)
                }
                HStack {
                    Spacer(minLength: 48)
                    VStack(alignment: .trailing, spacing: 4) {
                        ForEach(Array(event.blocks.enumerated()), id: \.offset) { _, block in
                            V2BlockView(block: block, threadID: threadID, isUser: event.author == .user, onSend: onSend)
                        }
                    }
                }
                // P045: the design stamps every message `6:41`.
                Text(V2ThreadClock.string(event.createdAt))
                    .font(.hanken(10.5))
                    .foregroundStyle(Theme.inkFaint)
                    .accessibilityIdentifier("v2-event-time")
            }
            .v2ReplyMenu(quote: replyQuote, onReply: onReply)
        } else {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .bottom, spacing: 8) {
                    VStack(alignment: .leading, spacing: 4) {
                        // P033: `Aster` 14/600 fg + the 12px faint clock.
                        // The line reads the agent: the project name for the
                        // default agent, the specialist's own label when the
                        // event names one (the @research flow).
                        HStack(spacing: 6) {
                            Text(displayAgentName)
                                .font(.hanken(14).weight(.semibold))
                                .foregroundStyle(Theme.ink)
                                .accessibilityIdentifier("v2-agent-label")
                            Text(V2ThreadClock.string(event.createdAt))
                                .font(.hanken(12))
                                .foregroundStyle(Theme.inkFaint)
                                .accessibilityIdentifier("v2-event-time")
                        }
                        if let quote = event.replyQuote {
                            quoteCard(quote, isUser: false)
                        }
                        ForEach(Array(event.blocks.enumerated()), id: \.offset) { _, block in
                            V2BlockView(block: block, threadID: threadID, isUser: event.author == .user, onSend: onSend)
                        }
                    }
                    Spacer(minLength: 48)
                }
            }
            .v2ReplyMenu(quote: replyQuote, onReply: onReply)
        }
    }
}

/// R32 P081: the optimistic "<driver> is on it…" line — the design's
/// thinking treatment (8px success pulsing dot, 13px muted text), the
/// web's `v2-working-line` twin. Quiet (past 45 s, still no reply) is
/// still, never silent: the dot rests and the text says the reply will
/// land here.
private struct V2WorkingLineView: View {
    let line: V2WorkingLine

    var body: some View {
        HStack(spacing: 8) {
            if !line.quiet {
                Circle()
                    .fill(Theme.success)
                    .frame(width: 8, height: 8)
                    .modifier(V2PulseModifier())
                    .accessibilityHidden(true)
            }
            Text(V2RunState.workingText(driver: line.driver, quiet: line.quiet))
                .font(.hanken(13))
                .foregroundStyle(line.quiet ? Theme.inkFaint : Theme.inkSoft)
                .lineLimit(2)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("v2-working-line")
        .accessibilityLabel(V2RunState.workingText(driver: line.driver, quiet: line.quiet))
    }
}

/// The design's pulse: 1.6 s ease-in-out infinite (the web's `v2-pulse`
/// twin). Static under the frozen tour (`-screenTour`) so gate pixels are
/// deterministic, and off under Reduce Motion.
private struct V2PulseModifier: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulsing = false

    func body(content: Content) -> some View {
        content
            .opacity(Config.screenTour || reduceMotion ? 1 : (pulsing ? 0.35 : 1))
            .onAppear {
                guard !Config.screenTour, !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    pulsing = true
                }
            }
    }
}

/// R28 reply-to: the long-press menu on a v2 message row. A row with no
/// quotable text (steps-only, artifacts-only) offers no Reply — a menu that
/// cannot quote would be a dead end.
private extension View {
    func v2ReplyMenu(quote: V2ReplyQuote?, onReply: @escaping (V2ReplyQuote) -> Void) -> some View {
        contextMenu {
            if let quote {
                Button {
                    onReply(quote)
                } label: {
                    Label("Reply", systemImage: "arrowshape.turn.up.left")
                }
                .accessibilityIdentifier("v2-reply-action")
                .accessibilityLabel("Reply to this message")
            }
        }
    }
}

/// R24 P078 (web L011 twin): step rows with no label paint as blank rows,
/// and an empty steps card paints an empty card. Filter first; nothing
/// paintable means nothing painted.
enum V2StepsPrepare {
    static func rows(from steps: [StepState]) -> [StepState] {
        steps.filter { !$0.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
}

private struct V2BlockView: View {
    let block: ThreadBlock
    let threadID: String
    /// User text rides the accent bubble; agent text is unbubbled body.
    let isUser: Bool
    let onSend: (String) -> Void
    /// R24 P080: the tapped option stays selected (radio fills) while its
    /// text goes to the thread. Server-recommended reads selected too.
    @State private var selectedOptionID: String?

    var body: some View {
        switch block {
        case .text(let value):
            if isUser {
                // P032: 16px white on accent, 18px corners with the 6px tail.
                Text(value)
                    .font(.hanken(16))
                    .foregroundStyle(Color.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        Theme.accent,
                        in: UnevenRoundedRectangle(
                            topLeadingRadius: 18, bottomLeadingRadius: 18,
                            bottomTrailingRadius: 6, topTrailingRadius: 18,
                            style: .continuous
                        )
                    )
                    .accessibilityIdentifier("v2-event-text")
            } else {
                // P034: agent body is unbubbled 16px.
                Text(value)
                    .font(.hanken(16))
                    .foregroundStyle(Theme.ink)
                    .accessibilityIdentifier("v2-event-text")
            }
        case .question(_, let text, let options):
            VStack(alignment: .leading, spacing: 6) {
                Text(text)
                    .font(.hanken(16))
                    .foregroundStyle(Theme.ink)
                ForEach(options) { option in
                    // P035: 57px option cards — 22px radio, 14/600 title,
                    // 12px muted detail. Recommended reads selected, and so
                    // does the tapped option (R24 P080: the tap selects the
                    // radio AND sends the option text into this thread —
                    // `onSend` is the thread send, never a global route).
                    let picked = option.recommended || selectedOptionID == option.id
                    Button {
                        selectedOptionID = option.id
                        onSend(option.title)
                    } label: {
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .strokeBorder(
                                        picked ? Theme.accent : Theme.inkFaint,
                                        lineWidth: 1.5
                                    )
                                    .frame(width: 22, height: 22)
                                if picked {
                                    Circle()
                                        .fill(Theme.accent)
                                        .frame(width: 11, height: 11)
                                }
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(option.title)
                                    .font(.hanken(14).weight(.semibold))
                                    .foregroundStyle(Theme.ink)
                                if !option.detail.isEmpty {
                                    Text(option.detail)
                                        .font(.hanken(12))
                                        .foregroundStyle(Theme.inkSoft)
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 12)
                        .frame(maxWidth: .infinity, minHeight: 57, alignment: .leading)
                        .background(
                            picked ? Theme.accentWeak : Theme.raised,
                            in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                        )
                    }
                    .accessibilityIdentifier("v2-option-\(option.id)")
                    .accessibilityValue(picked ? "selected" : "not selected")
                }
            }
        case .steps(let steps):
            // P036: plain rows — 16px check + 14.5px muted text, no card.
            // R24 P078: label-less rows never paint (web L011 twin); an
            // empty steps card paints nothing, not an empty card.
            let rows = V2StepsPrepare.rows(from: steps)
            if !rows.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(rows) { step in
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(step.state == "done"
                                    ? Theme.success.opacity(0.16) : Color.clear)
                                .frame(width: 16, height: 16)
                            if step.state == "done" {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(Theme.success)
                            } else {
                                Circle()
                                    .strokeBorder(Theme.inkFaint, lineWidth: 1.5)
                                    .frame(width: 16, height: 16)
                            }
                        }
                        Text(step.label)
                            .font(.hanken(14.5))
                            .foregroundStyle(Theme.inkSoft)
                        }
                    }
                }
            }
        case .success(let text, _):
            Text(text)
                .font(.hanken(16))
                .foregroundStyle(Theme.success)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        case .snag(let text, let options):
            VStack(alignment: .leading, spacing: 6) {
                Text(text)
                    .font(.hanken(16))
                    .foregroundStyle(Theme.warning)
                ForEach(options) { option in
                    Button { onSend(option.title) } label: {
                        Text(option.title)
                            .font(.hanken(14).weight(.medium))
                            .foregroundStyle(Theme.accent)
                    }
                    .accessibilityIdentifier("v2-option-\(option.id)")
                }
            }
        case .artifact(let artifactIDs):
            // File cards open durable Visual Window tabs (Task 7). Before
            // the artifacts load, the old count line holds the row's place.
            V2ArtifactCards(ids: artifactIDs, threadID: threadID, count: artifactIDs.count)
        case .checklist(let pinIDs):
            Label(
                pinIDs.count == 1 ? "1 review note" : "\(pinIDs.count) review notes",
                systemImage: "checklist"
            )
            .font(.hanken(13))
            .foregroundStyle(Theme.inkSoft)
        }
    }
}

/// File cards for an artifact block: one tappable row per artifact. Tapping
/// opens the durable Visual Window tab (always `open`, even when another tab
/// is selected — the server dedupes by target). Identifiers on the leaf
/// buttons only.
// NOTE: internal, not private — the sheet's file strip (P051) shares the
// kind marks below.
struct V2ArtifactCards: View {
    let ids: [String]
    let threadID: String
    let count: Int

    @EnvironmentObject private var window: VisualWindowStore

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if window.artifacts.isEmpty {
                Label(
                    count == 1 ? "1 attachment" : "\(count) attachments",
                    systemImage: "paperclip"
                )
                .font(.hanken(13))
                .foregroundStyle(Theme.inkSoft)
            } else {
                ForEach(ids, id: \.self) { id in
                    if let artifact = window.artifact(id: id) {
                        Button {
                            Task {
                                try? await window.open(
                                    artifact.kind, threadID: threadID,
                                    artifactID: artifact.id, title: artifact.title, state: [:]
                                )
                            }
                        } label: {
                            // P037: 52px surface-2 cards — the kind badge
                            // (HANDOFF §2 file colours) + 13.5/600 title.
                            HStack(spacing: 12) {
                                Text(Self.badge(for: artifact.kind).0)
                                    .font(.hanken(9.5).weight(.bold))
                                    .foregroundStyle(Color.white)
                                    .frame(width: 32, height: 32)
                                    .background(
                                        Self.badge(for: artifact.kind).1,
                                        in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    )
                                Text(artifact.title)
                                    .font(.hanken(13.5).weight(.semibold))
                                    .foregroundStyle(Theme.ink)
                                    .lineLimit(1)
                                Spacer(minLength: 0)
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.inkFaint)
                            }
                            .padding(.horizontal, 12)
                            .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                            .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .accessibilityIdentifier("visual-open-\(artifact.id)")
                        .accessibilityLabel(artifact.title)
                    }
                }
            }
        }
    }

    static func icon(for kind: VisualTabKind) -> String {
        switch kind {
        case .pdf: "doc.richtext"
        case .web: "globe"
        case .video, .youtube: "play.rectangle"
        case .photo: "photo"
        case .code: "chevron.left.forwardslash.chevron.right"
        default: "doc"
        }
    }

    /// P037: the file-badge colours are HANDOFF §2, not approximations.
    static func badge(for kind: VisualTabKind) -> (String, Color) {
        switch kind {
        case .pdf: ("PDF", Color(cv6: 0xE5484D))
        case .photo: ("IMG", Color(cv6: 0x2F9E6E))
        case .video: ("MP4", Color(cv6: 0x7C5CFF))
        case .youtube: ("YT", Color(cv6: 0xE5484D))
        case .web: ("URL", Color(cv6: 0x3B82F6))
        case .code: ("{}", Color(cv6: 0x5B5F66))
        default: ("FILE", Theme.inkFaint)
        }
    }
}

struct TurnIndicatorView: View {
    let turn: TurnState
    var steps: [MessageStep] = []
    var startedAt: Date? = nil
    var quiet: Bool = false
    /// The steward's current state word — the waking line keys off "accepted".
    var healthState: String? = nil
    /// The Stop control (R18 N2) — lives ON the card, right-aligned, because the
    /// action belongs in the same surface as the state it acts on.
    var stopControl: ChatViewModel.StopControl = .hidden
    var onStop: () -> Void = {}
    var resend: () -> Void = {}
    var dismiss: () -> Void = {}

    @State private var stepsExpanded = false

    /// The deduped, collapsed, ordered projection — the ONLY step list this
    /// card renders (raw steps re-emit and repeat; see WorkProjection).
    private var projectedSteps: [MessageStep] { WorkProjection.projected(steps) }

    var body: some View {
        switch turn {
        case .idle:
            EmptyView()

        case .working:
            VStack(alignment: .leading, spacing: Theme.s2) {
                HStack(spacing: Theme.s2) {
                    WorkingMark()
                    // TimelineView redraws the label every second so the clock
                    // visibly counts — a frozen "Working…" reads as a hang.
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text(workingLabel(now: context.date))
                            .font(.hkFootnote.weight(.medium))
                            .monospacedDigit()
                            .foregroundStyle(Theme.inkSoft)
                    }
                    Spacer(minLength: 0)
                    if projectedSteps.count > 1 {
                        Button {
                            withAnimation(.easeOut(duration: 0.2)) { stepsExpanded.toggle() }
                        } label: {
                            HStack(spacing: 4) {
                                Text("\(projectedSteps.count) steps")
                                Image(systemName: stepsExpanded ? "chevron.down" : "chevron.up")
                                    .imageScale(.small)
                            }
                            .font(.hkCaption.weight(.semibold))
                            .foregroundStyle(Theme.accent)
                        }
                        .accessibilityLabel(stepsExpanded ? "Collapse steps" : "Show all steps")
                    }
                    if stopControl != .hidden {
                        // Ghost stop, the web's card-header treatment: 1px border,
                        // quiet ink, disabled + "Stopping…" while the ask is live.
                        Button(action: onStop) {
                            Text(stopControl == .stopping ? "Stopping…" : "Stop")
                                .font(.hanken(11).weight(.semibold))
                                .foregroundStyle(stopControl == .stopping ? Theme.inkFaint : Theme.inkSoft)
                                .padding(.horizontal, 9)
                                .padding(.vertical, 3)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                                        .strokeBorder(Theme.hairline, lineWidth: 1)
                                )
                        }
                        .disabled(stopControl == .stopping)
                        .accessibilityLabel(stopControl == .stopping ? "Stopping this turn" : "Stop this turn")
                    }
                }
                let projected = projectedSteps
                if !projected.isEmpty {
                    if stepsExpanded {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(projected) { step in
                                stepRow(step, isLatest: step.id == projected.last?.id)
                            }
                        }
                    } else if let latest = projected.last {
                        // The current line: action glyph + label, cross-fading
                        // 500ms on change (the web card's ghost swap) inside a
                        // stable-height slot so the card never jitters.
                        ZStack(alignment: .topLeading) {
                            currentLine(latest)
                                .id(latest.text ?? "")
                                .transition(.opacity)
                        }
                        .animation(.easeInOut(duration: 0.5), value: latest.text)
                        .frame(minHeight: 18, alignment: .topLeading)
                    }
                    // Honest progress: a bar ONLY when the latest label carries a
                    // real N-of-M count. No count, no bar — an invented fraction
                    // is fake UI (the pulsing mark already says "alive").
                    if let fraction = WorkProjection.checklistProgress(in: projected.last?.text ?? "") {
                        ProgressView(value: fraction)
                            .tint(fraction >= 1.0 ? Theme.live : Theme.accent)
                            .animation(.easeOut(duration: 0.4), value: fraction)
                    }
                }
                if quiet {
                    // Steps have gone silent for a few minutes but the turn is NOT
                    // being called dead — long gaps are normal on real turns.
                    HStack(spacing: 6) {
                        Image(systemName: "hourglass")
                            .font(.system(size: 10))
                        Text("Nothing new for a few minutes — still checking.")
                            .font(.hkCaption)
                    }
                    .foregroundStyle(Theme.inkFaint)
                }
            }
            .padding(.horizontal, Theme.s3)
            .padding(.vertical, Theme.s2 + 2)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .transition(.opacity)

        case .stalled(let sentText):
            // Ten minutes of complete silence — no step, no interim row, no reply.
            // Softened on purpose: real turns have gone quiet for 18 minutes and
            // finished fine, so this is a notice with a way out, not a death
            // certificate. Polling continues underneath and the model clears this
            // state the instant anything arrives.
            RaisedCard(tint: Theme.warning.opacity(0.4)) {
                VStack(alignment: .leading, spacing: Theme.s2) {
                    Label("Still quiet after 10 minutes", systemImage: "clock.badge.questionmark")
                        .font(.hkFootnote.weight(.semibold))
                        .foregroundStyle(Theme.warning)
                    Text("Your message was delivered, but nothing has come back yet. The agent may still be working — this clears itself the moment anything arrives. You can also send the message again.")
                        .font(.hkCaption)
                        .foregroundStyle(Theme.inkSoft)
                    HStack(spacing: Theme.s3) {
                        if sentText?.isEmpty == false {
                            Button("Send again", action: resend)
                                .buttonStyle(.borderedProminent)
                                .controlSize(.small)
                        }
                        Button("Dismiss", action: dismiss)
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    .padding(.top, Theme.s1)
                }
            }
        }
    }

    /// "Working — 2m 10s", counting from the turn's open. No start date (an older
    /// API deploy answered without the row) degrades to the plain word.
    ///
    /// Before the first step arrives the word rotates through the web's openers on
    /// a 2.5s wall clock — and after 8 seconds of an ACCEPTED turn with no step it
    /// says the honest thing instead: a quiet room is waking up, which can take a
    /// minute. Cycling thinking phrases over dead air is the lie this replaces.
    private func workingLabel(now: Date) -> String {
        guard let startedAt else { return "Working…" }
        let seconds = max(0, Int(now.timeIntervalSince(startedAt)))
        let clock = seconds < 60 ? "\(seconds)s" : "\(seconds / 60)m \(seconds % 60)s"
        if steps.isEmpty {
            if healthState == "accepted", TimeInterval(seconds) > Config.wakingThreshold {
                return "Waking the room — \(clock)"
            }
            let openers = ["Reading your message", "Thinking it through", "Working out the approach"]
            let index = Int(now.timeIntervalSince1970 / 2.5) % openers.count
            return "\(openers[index]) — \(clock)"
        }
        return "Working — \(clock)"
    }

    /// The collapsed card's current line: the label's action glyph + the label.
    private func currentLine(_ step: MessageStep) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.s2) {
            Image(systemName: WorkProjection.glyph(for: step.text ?? ""))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Theme.accent)
            Text(step.text ?? "")
                .font(.hkCaption)
                .foregroundStyle(Theme.ink)
                .lineLimit(2)
        }
    }

    /// One step line in the expanded run: a check for a finished step, the
    /// action glyph on the latest.
    private func stepRow(_ step: MessageStep, isLatest: Bool) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.s2) {
            Image(systemName: isLatest
                ? WorkProjection.glyph(for: step.text ?? "")
                : "checkmark.circle.fill")
                .font(.system(size: isLatest ? 11 : 9, weight: .medium))
                .foregroundStyle(isLatest ? Theme.accent : Theme.inkFaint)
            Text(step.text ?? "")
                .font(.hkCaption)
                .foregroundStyle(isLatest ? Theme.ink : Theme.inkSoft)
                .lineLimit(isLatest ? 2 : 1)
        }
    }
}

/// The steward's verdict as a card (R18 N2 — RoomRecoveryNotice port). Cause-keyed
/// plain words, and every state carries its ACTION in the same surface: Restart on
/// the allowlisted causes, Send again / Ask for a status on agent_silent, Start
/// fresh when repair has given up (suggested_action room_reset).
struct RoomRecoveryNoticeView: View {
    let health: RoomHealth
    var canResend: Bool = false
    var onRestart: () -> Void = {}
    var onResend: () -> Void = {}
    var onAskStatus: () -> Void = {}
    var onStartFresh: () -> Void = {}
    var onDismiss: () -> Void = {}

    private var isRecovering: Bool { health.state == "recovering" }

    var body: some View {
        RaisedCard(tint: (isRecovering ? Theme.accent : Theme.warning).opacity(0.4)) {
            VStack(alignment: .leading, spacing: Theme.s2) {
                HStack(spacing: Theme.s2) {
                    Label(
                        RoomRecovery.header(state: health.state),
                        systemImage: isRecovering ? "arrow.triangle.2.circlepath" : "exclamationmark.triangle"
                    )
                    .font(.hkFootnote.weight(.semibold))
                    .foregroundStyle(isRecovering ? Theme.accent : Theme.warning)
                    Spacer(minLength: 0)
                    // Dismiss lives on the header line so the action row keeps its
                    // buttons on ONE line — a wrapped two-line pill next to
                    // single-line siblings reads as a layout accident.
                    if !isRecovering {
                        Button(action: onDismiss) {
                            Image(systemName: "xmark")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Theme.inkFaint)
                        }
                        .accessibilityLabel("Dismiss this notice")
                    }
                }

                Text(RoomRecovery.message(cause: health.cause))
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)

                if !isRecovering {
                    HStack(spacing: Theme.s3) {
                        if RoomRecovery.showsRestart(cause: health.cause) {
                            Button("Restart this turn", action: onRestart)
                                .buttonStyle(.borderedProminent)
                                .controlSize(.small)
                        }
                        if health.cause == "agent_silent" {
                            if canResend {
                                Button("Send it again", action: onResend)
                                    .buttonStyle(.borderedProminent)
                                    .controlSize(.small)
                            }
                            Button("Ask for a status", action: onAskStatus)
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                                .lineLimit(1)
                        }
                        if health.suggestedAction == "room_reset" {
                            Button("Start fresh", action: onStartFresh)
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                        }
                    }
                    .padding(.top, Theme.s1)
                }
            }
        }
    }
}

/// The jump-to-latest pill (R18 N4) — the web's `.jumplive` capsule: accent
/// ground, white 12.5/600 label, down arrow. Anchored by its caller to the
/// SCROLL CONTAINER, never the window (the decision record's own doubt #3).
struct JumpToLatestPill: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "arrow.down")
                .font(.system(size: 12, weight: .semibold))
            Text("Jump to latest")
                .font(.hanken(12.5).weight(.semibold))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 14)
        .frame(height: 34)
        .background(Theme.accent, in: Capsule())
        .shadow(color: .black.opacity(0.35), radius: 8, y: 3)
    }
}

/// R40: the v2 thread's "new messages" pill (the web's R22 affordance
/// twin) — arrivals while the user reads elsewhere, one tap re-pins to
/// the bottom. Same anatomy as JumpToLatestPill, the thread's own copy.
struct V2NewMessagesPill: View {
    let count: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "arrow.down")
                .font(.system(size: 12, weight: .semibold))
            Text(count > 1 ? "\(count) new messages" : "New messages")
                .font(.hanken(12.5).weight(.semibold))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 14)
        .frame(height: 34)
        .background(Theme.accent, in: Capsule())
        .shadow(color: .black.opacity(0.35), radius: 8, y: 3)
    }
}

/// The live partial reply (R18 N3) — the same anatomy as an agent turn (monogram,
/// author line, agent-bubble surface) plus a blinking caret. It renders the draft
/// as PLAIN text on purpose: re-parsing markdown on every reveal tick is the jank
/// the research warned about, and the durable row that replaces this bubble
/// arrives fully rendered. Never a message; never persisted.
struct StreamingDraftBubble: View {
    let authorTitle: String
    let text: String
    var showsAuthor: Bool = true

    @State private var caretOn = true

    var body: some View {
        HStack(alignment: .top, spacing: Theme.s2) {
            TurnAvatar(name: authorTitle, visible: showsAuthor)
            VStack(alignment: .leading, spacing: Theme.s2) {
                if showsAuthor {
                    Text(authorTitle)
                        .font(.hkSubheadline.weight(.semibold))
                        .foregroundStyle(Theme.ink)
                }
                (Text(text) + Text(" \u{258D}")
                    .foregroundStyle(Theme.accent.opacity(caretOn ? 1 : 0.15)))
                    .font(.hkBody)
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, Theme.s4)
                    .padding(.vertical, 10)
                    .background(Theme.agentBubble, in: MessageBubbleView.bubbleShape(user: false))
                    .overlay(
                        MessageBubbleView.bubbleShape(user: false)
                            .strokeBorder(Theme.hairline, lineWidth: 1)
                    )
            }
            Spacer(minLength: Theme.s3)
        }
        .onAppear {
            // Screen tour: caret stays put so the main thread idles.
            if !Config.screenTour {
                withAnimation(.easeInOut(duration: 0.55).repeatForever(autoreverses: true)) {
                    caretOn = false
                }
            }
        }
        .accessibilityLabel("\(authorTitle) is writing a reply")
    }
}

/// The animated working mark: a soft accent pulse. Motion is the message — a static
/// dot next to a static label is exactly the "is it hung?" ambiguity this replaces.
private struct WorkingMark: View {
    @State private var pulsing = false

    var body: some View {
        Circle()
            .fill(Theme.accent)
            .frame(width: 8, height: 8)
            .scaleEffect(pulsing ? 1.0 : 0.55)
            .opacity(pulsing ? 1 : 0.45)
            // Screen tour: no pulse so the main thread idles (static end state).
            .animation(Config.screenTour ? nil : .easeInOut(duration: 0.7).repeatForever(autoreverses: true), value: pulsing)
            .onAppear { pulsing = true }
            .accessibilityHidden(true)
    }
}

// MARK: - Outbox bubble

/// A message that has not landed. `sending` is the ordinary dimmed echo; `failed` is
/// the one that matters — it keeps what the user typed, on screen, with a retry. The
/// web drops it, and a message that vanishes on a failed POST is indistinguishable
/// from one that was never typed.
struct OutboxBubbleView: View {
    let item: OutboxItem
    let retry: () -> Void
    let discard: () -> Void

    var body: some View {
        HStack {
            Spacer(minLength: 48)
            VStack(alignment: .trailing, spacing: Theme.s1) {
                Text(item.text)
                    .font(.hkBody)
                    .foregroundStyle(Theme.userBubbleInk)
                    .padding(.horizontal, Theme.s4)
                    .padding(.vertical, 10)
                    .background(
                        Theme.userBubble,
                        in: MessageBubbleView.bubbleShape(user: true)
                    )
                    .overlay(
                        MessageBubbleView.bubbleShape(user: true)
                            .strokeBorder(item.isFailed ? Theme.danger.opacity(0.8) : Color.clear, lineWidth: 1)
                    )
                    .opacity(item.isFailed ? 1 : 0.55)
                    .textSelection(.enabled)

                if let failure = item.failureMessage {
                    VStack(alignment: .trailing, spacing: Theme.s1) {
                        Text("Not sent — \(failure)")
                            .font(.hkCaption2)
                            .foregroundStyle(Theme.danger)
                            .multilineTextAlignment(.trailing)
                        HStack(spacing: Theme.s3) {
                            // Stated, not inherited. Retry is the action that gets the
                            // user's message where it was going; it must not depend on
                            // an ambient tint set three views up to look like the
                            // primary choice.
                            Button("Retry", action: retry)
                                .font(.hkCaption.weight(.semibold))
                                .foregroundStyle(Theme.accent)
                            Button("Discard", role: .destructive, action: discard)
                                .font(.hkCaption)
                                .foregroundStyle(Theme.inkSoft)
                        }
                    }
                } else {
                    Text(item.isAwaitingConfirmation ? "Sent — waiting to sync…" : "Sending…")
                        .font(.hkCaption2)
                        .foregroundStyle(Theme.inkFaint)
                }
            }
        }
    }
}

// MARK: - Image generation

/// Native image generation uses the same authenticated server router as desktop.
/// A successful result is uploaded and staged before this sheet says it is ready,
/// so dismissing the sheet can never strand an expiring provider URL.
fileprivate struct ImageGeneratorSheet: View {
    @ObservedObject var model: ChatViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var prompt = ""
    @State private var tool = "openai"
    @State private var generatedData: Data?
    @State private var shareURL: URL?
    @State private var saved = false

    private let tools = [
        ("openai", "OpenAI"),
        ("gemini", "Gemini"),
        ("ideogram", "Ideogram"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s4) {
                    Text("Describe the image you want. Corner will add the finished PNG to this message so you can send it with context.")
                        .font(.hkBody)
                        .foregroundStyle(Theme.inkSoft)

                    Picker("Generator", selection: $tool) {
                        ForEach(tools, id: \.0) { value, label in Text(label).tag(value) }
                    }
                    .pickerStyle(.segmented)

                    TextField("A quiet editorial workspace at dawn…", text: $prompt, axis: .vertical)
                        .font(.hkBody)
                        .foregroundStyle(Theme.ink)
                        .lineLimit(4...9)
                        .padding(Theme.s3)
                        .background(Theme.raised2, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous).strokeBorder(Theme.hairline))

                    Button {
                        Task {
                            guard let image = await model.generateAndStageImage(tool: tool, prompt: prompt.trimmingCharacters(in: .whitespacesAndNewlines)) else { return }
                            generatedData = image.data
                            shareURL = makeShareURL(image.data)
                            saved = false
                        }
                    } label: {
                        HStack {
                            if model.isGeneratingImage { ProgressView().tint(.white) }
                            Text(model.isGeneratingImage ? "Generating and adding…" : "Generate image")
                        }
                        .font(.hkBody.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .foregroundStyle(Color.white)
                        .background(Theme.accent, in: RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous))
                    }
                    .disabled(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.isGeneratingImage)
                    .opacity(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.55 : 1)

                    if let error = model.imageGenerationError {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.hkFootnote)
                            .foregroundStyle(Theme.danger)
                            .accessibilityLabel("Image generation failed: \(error)")
                    }

                    if let data = generatedData, let image = UIImage(data: data) {
                        VStack(alignment: .leading, spacing: Theme.s3) {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                                .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
                                .accessibilityLabel("Generated image preview")
                            Label("Added to your message", systemImage: "checkmark.circle.fill")
                                .font(.hkFootnote.weight(.semibold))
                                .foregroundStyle(Theme.success)
                            HStack(spacing: Theme.s2) {
                                Button {
                                    UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
                                    saved = true
                                } label: {
                                    Label(saved ? "Saved" : "Save Image", systemImage: saved ? "checkmark" : "square.and.arrow.down")
                                }
                                .buttonStyle(.bordered)
                                if let shareURL {
                                    ShareLink(item: shareURL) {
                                        Label("Share", systemImage: "square.and.arrow.up")
                                    }
                                    .buttonStyle(.bordered)
                                }
                            }
                        }
                        .padding(Theme.s3)
                        .background {
                            Theme.frostedSurface(
                                fallback: Theme.raised,
                                tint: Color(cv6: 0x161A21, opacity: 0.28),
                                in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                            )
                        }
                    }
                }
                .padding(Theme.s4)
            }
            .groundBackground()
            .navigationTitle("Generate Image")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
        }
    }

    private func makeShareURL(_ data: Data) -> URL? {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("corner-generated-\(UUID().uuidString).png")
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }
}

// MARK: - Paste preview sheet

/// Full-text view of a paste chip. Mirrors PasteChip.jsx's modal: monospace pre,
/// scrollable, with a header showing line count + char count.
fileprivate struct PastePreviewSheet: View {
    let chip: PasteChip
    let onRemove: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                Text(chip.text)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Theme.s4)
                    .textSelection(.enabled)
            }
            .background(Theme.ground)
            .navigationTitle("Pasted Text")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("Pasted Text")
                            .font(.hanken(14).weight(.semibold))
                            .foregroundStyle(Theme.ink)
                        Text("\(chip.lineCount) lines · \(chip.text.count.formatted()) chars")
                            .font(.hanken(11))
                            .foregroundStyle(Theme.accent)
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                        .font(.hanken(14).weight(.medium))
                        .foregroundStyle(Theme.accent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(role: .destructive) {
                        onRemove()
                    } label: {
                        Text("Remove")
                            .font(.hanken(14).weight(.medium))
                            .foregroundStyle(Theme.danger)
                    }
                }
            }
        }
    }
}

// MARK: - R28 composer parity subviews

/// `/` opens the commands as a sheet: the same rows as the commands menu
/// (Work/Plan, Model, Specialist, Files, Generate an image) plus Talk aloud,
/// Integrations, and Clear chat with its confirm. Model/Specialist pick from
/// an inline list with a labeled Back to commands (R27 web's placement
/// rule); Clear never acts on the pick — it confirms inline first.
struct V2SlashSheet: View {
    let draft: String
    let hasSpecialist: Bool
    let modelChoice: String
    let specialistChoice: String
    let specialistRoster: [(slug: String, title: String)]
    @Binding var picking: V2SlashCommand.ID?
    let onPick: (V2SlashCommand) -> Void
    let onSelectModel: (String) -> Void
    let onSelectSpecialist: (String) -> Void
    let onClear: () -> Void
    let onDismiss: () -> Void

    @State private var confirmingClear = false

    private var rows: [V2SlashCommand] {
        V2SlashPalette.filtered(draft.isEmpty ? "/" : draft, hasSpecialist: hasSpecialist)
    }

    var body: some View {
        NavigationStack {
            Group {
                if picking == .model {
                    List(ChatView.modelOptions, id: \.id) { option in
                        Button {
                            onSelectModel(option.id)
                            picking = nil
                        } label: {
                            HStack {
                                Text(option.label)
                                Spacer()
                                if option.id == modelChoice {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                        .accessibilityIdentifier("v2-slash-model-\(option.id)")
                    }
                } else if picking == .specialist {
                    List(specialistRoster, id: \.slug) { row in
                        Button {
                            onSelectSpecialist(row.slug)
                            picking = nil
                        } label: {
                            HStack {
                                Text(row.title)
                                Spacer()
                                if row.slug == specialistChoice {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                        .accessibilityIdentifier("v2-slash-specialist-\(row.slug)")
                    }
                } else {
                    List {
                        ForEach(rows) { command in
                            if command.id == .clear {
                                Button {
                                    confirmingClear = true
                                } label: {
                                    HStack {
                                        Text(command.title)
                                            .foregroundStyle(Theme.warning)
                                        Spacer()
                                    }
                                }
                                .accessibilityIdentifier("v2-slash-clear")
                            } else {
                                Button {
                                    onPick(command)
                                } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(command.title)
                                            .foregroundStyle(Theme.ink)
                                        Text(command.detail)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .accessibilityIdentifier("v2-slash-\(command.id.rawValue)")
                            }
                        }
                        if confirmingClear {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Clear what you typed and staged here. Messages stay in this thread.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                HStack {
                                    Button("Cancel", role: .cancel) { confirmingClear = false }
                                    Button("Clear chat", role: .destructive) {
                                        confirmingClear = false
                                        onClear()
                                    }
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }
            }
            .navigationTitle(picking == nil ? "Commands" : (picking == .model ? "Model" : "Specialist"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if picking != nil {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Back to commands") { picking = nil }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { onDismiss() }
                }
            }
        }
        .accessibilityIdentifier("v2-slash-sheet")
    }
}

/// Generate-an-image prompt sheet (the empty-field path: no prompt to run).
struct V2ImagePromptSheet: View {
    @Binding var text: String
    let onGenerate: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                TextField("Describe the image…", text: $text, axis: .vertical)
                    .lineLimit(2...5)
                    .accessibilityIdentifier("v2-image-prompt-field")
                    .accessibilityLabel("Image description")
                Button {
                    onGenerate()
                } label: {
                    Text("Generate image")
                        .frame(maxWidth: .infinity)
                }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .accessibilityIdentifier("v2-image-generate")
            }
            .navigationTitle("Generate an image")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { onCancel() }
                }
            }
        }
        .accessibilityIdentifier("v2-image-prompt")
    }
}

/// The pill's live dictation meter: four bars lit by the tap's RMS level.
/// Decorative beside its labelled container — VoiceOver names the level.
struct V2LevelMeter: View {
    let level: Float

    private var lit: Int {
        min(4, max(0, Int((level * 4).rounded(.up))))
    }

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<4, id: \.self) { bar in
                RoundedRectangle(cornerRadius: 1, style: .continuous)
                    .fill(bar < lit ? Color.red : Theme.inkFaint.opacity(0.35))
                    .frame(width: 3, height: 6 + CGFloat(bar) * 3)
            }
        }
        .frame(width: 24, height: 20)
        .accessibilityValue("\(Int((min(1, max(0, level)) * 100).rounded())) percent")
    }
}

/// Camera capture for the v2 attach menu. The caller guards availability;
/// cancel stages nothing.
struct V2CameraPicker: UIViewControllerRepresentable {
    let onDone: (UIImage?) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onDone: onDone) }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onDone: (UIImage?) -> Void
        init(onDone: @escaping (UIImage?) -> Void) { self.onDone = onDone }
        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            onDone(info[.originalImage] as? UIImage)
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onDone(nil)
        }
    }
}
