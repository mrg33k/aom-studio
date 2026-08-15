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

struct ChatView: View {
    @StateObject private var model: ChatViewModel
    @StateObject private var review = ReviewStore.shared
    @EnvironmentObject private var router: AppRouter
    @Environment(\.scenePhase) private var scenePhase

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

    // ── Composer collapse → FAB (composer extras R6) ──────────────────────────
    // Composer starts open; collapses 120ms after a successful send.
    // FAB (pencil icon) taps to re-expand and focus. Resets on room navigation.
    @State private var composerCollapsed = false
    @State private var collapseWorkItem: DispatchWorkItem? = nil

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

    /// Computed ONCE per thread render and handed down to every bubble, rather than each
    /// bubble subscribing to the review store itself.
    private var waitingIDs: Set<String> { review.waitingIDs }

    init(room: Room) {
        _model = StateObject(wrappedValue: ChatViewModel(room: room))
    }

    var body: some View {
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
                    // Collapse: 0-height clear placeholder keeps the thread from
                    // resizing when we swap composer ↔ nothing.
                    if composerCollapsed {
                        Color.clear.frame(height: 0)
                    } else {
                        composer
                    }
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
            // ── FAB — appears when the composer is collapsed ─────────────────
            .overlay(alignment: .bottomTrailing) {
                if composerCollapsed {
                    Button {
                        expandComposer()
                    } label: {
                        ZStack {
                            Circle()
                                .fill(Theme.accent)
                                .frame(width: 52, height: 52)
                                .shadow(color: .black.opacity(0.45), radius: 10, y: 5)
                            Image(systemName: "pencil")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(Color.white)
                        }
                        .frame(width: 52, height: 52)
                    }
                    .padding(.trailing, Theme.s4)
                    .safeAreaPadding(.bottom, Theme.s4)
                    .accessibilityLabel("Open composer — type a message")
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.28, dampingFraction: 0.72), value: composerCollapsed)
            .groundBackground()
            // Custom title: avatar + room name + live status.
            // Empty string keeps the back-button chevron but clears the default label.
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
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

                    // More menu (⋯) — files, settings
                    Menu {
                        Button { showingFiles = true } label: {
                            Label("Files", systemImage: "folder")
                        }
                        Button { showingSettings = true } label: {
                            Label("Room settings", systemImage: "gearshape")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(Theme.inkSoft)
                    }
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
                model.start()
                // The waiting set marks files inside the thread too, so it loads with the
                // room rather than only when the review screen is opened.
                Task { await review.load() }
                Task { await model.loadModelPreference() }
                Task { await model.loadRoomAgentPreference() }
                // Stamp the per-room read time so the home dot clears immediately.
                ReadStateStore.shared.markRead(
                    roomID: model.room.roomID,
                    ts: Date().timeIntervalSince1970 * 1000
                )
            }
            .onDisappear { model.stop() }
            // Re-stamp when new messages arrive while the room is open — keeps the dot
            // clear if a push notification arrived while the user was already in here.
            .onChange(of: model.rows.count) { _, _ in
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
                guard new.count - old.count > 50 else { return } // cheap early exit
                guard let inserted = extractInserted(old: old, new: new) else { return }
                guard PasteChip.shouldChip(inserted) else { return }
                // Revert the draft to its pre-paste state and create a chip.
                let chip = PasteChip.make(from: inserted)
                pasteChips.append(chip)
                model.draft = old
            }
    }

    // MARK: - Composer collapse helpers

    private func expandComposer() {
        withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) {
            composerCollapsed = false
        }
        // Focus after the spring animation completes so the keyboard opens cleanly.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.06) {
            composerFocused = true
        }
    }

    private func scheduleCollapse() {
        collapseWorkItem?.cancel()
        let item = DispatchWorkItem {
            withAnimation(.easeOut(duration: 0.2)) {
                composerCollapsed = true
            }
        }
        collapseWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12, execute: item)
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
    /// The slug of this room's specialist when it IS a 1:1 agent room, else nil.
    private var currentAgentSlug: String? {
        if case .agent(let slug) = model.room.kind { return slug }
        return nil
    }

    // The title is the specialist switcher — CV4's ContextNav click-to-switch
    // dropdown, native. Tap the header, pick a specialist, and AppRouter's
    // replace-don't-stack rule swaps this chat for theirs in place. Room
    // settings rides at the bottom (the header tap used to open it directly;
    // it also stays in the ⋯ menu).
    private var headerTitle: some View {
        Menu {
            Section("Switch specialist") {
                ForEach(AgentRoster.resolved, id: \.slug) { entry in
                    Button {
                        router.open(Room(world: model.room.world,
                                         kind: .agent(slug: entry.slug),
                                         title: entry.title,
                                         subtitle: entry.subtitle))
                    } label: {
                        if entry.slug == currentAgentSlug {
                            Label(entry.title, systemImage: "checkmark")
                        } else {
                            Text(entry.title)
                        }
                    }
                }
            }
            Divider()
            Button { showingSettings = true } label: {
                Label("Room settings", systemImage: "gearshape")
            }
        } label: {
            HStack(spacing: 8) {
                RoomAvatarView(room: model.room, size: 30, isActive: model.isAwaiting)
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        Text(model.room.title)
                            .font(.hanken(15).weight(.semibold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Theme.inkSoft)
                    }
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
        .accessibilityLabel("\(model.room.title) — switch specialist or open room settings")
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
                        if let notice = model.catchUpNotice {
                            catchUpBanner(notice)
                        }
                        let thread = visibleThread
                        // Search empty state
                        if isSearching, !searchQuery.isEmpty, thread.isEmpty {
                            centeredNotice("No messages match \"\(searchQuery)\"", systemImage: "magnifyingglass")
                        } else {
                            ForEach(Array(thread.enumerated()), id: \.element.id) { index, item in
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
                                    .id(row.id)
                                case .outbox(let pending):
                                    OutboxBubbleView(
                                        item: pending,
                                        retry: { model.retry(pending) },
                                        discard: { model.discard(pending) }
                                    )
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

    /// Wrapped send: appends paste chip text then fires model.send(), then collapses.
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
        scheduleCollapse()
    }

    // MARK: - Checklist helpers

    /// Send a text from the checklist panel without collapsing the composer —
    /// the user stays in the checklist so they can play more items.
    private func sendChecklistText(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        model.draft = trimmed
        model.send()
        // No scheduleCollapse(): checklist panel stays open after play.
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
            .disabled(!canSend)
            .accessibilityLabel("Send")
        }
    }

    /// The web's Commands popover, as one native menu behind the sparkles chip:
    /// the Work/Plan mode toggle, the Model submenu, and "Files in this room".
    /// The chip's label stays live — model short-name, plus "Plan" whenever the
    /// non-default mode is armed, so neither choice hides just because its control
    /// moved into a menu.
    private var commandsMenu: some View {
        Menu {
            // Work / Plan — a Picker renders as inline checkmark rows in a Menu,
            // the native shape of the web's segmented toggle.
            Picker("Mode", selection: Binding(
                get: { model.chatMode },
                set: { model.setMode($0) }
            )) {
                Label("Work", systemImage: "hammer").tag("work")
                Label("Plan", systemImage: "list.bullet.rectangle").tag("plan")
            }

            // Model submenu — the same options and checkmark the old chip menu had.
            Menu {
                ForEach(ChatView.modelOptions, id: \.id) { option in
                    Button {
                        Task { await model.selectModel(option.id) }
                    } label: {
                        if option.id == model.modelChoice {
                            Label(option.label, systemImage: "checkmark")
                        } else {
                            Text(option.label)
                        }
                    }
                }
            } label: {
                Label("Model — \(ChatView.shortModelLabel(model.modelChoice))", systemImage: "cpu")
            }

            if model.room.agentPreferenceKey != nil {
                Menu {
                    Button {
                        Task { await model.selectRoomAgent("default") }
                    } label: {
                        if model.roomAgentChoice == "default" {
                            Label("Room default", systemImage: "checkmark")
                        } else {
                            Text("Room default")
                        }
                    }
                    ForEach(model.roomAgentRoster) { specialist in
                        Button {
                            Task { await model.selectRoomAgent(specialist.slug) }
                        } label: {
                            if specialist.slug == model.roomAgentChoice {
                                Label(specialist.title, systemImage: "checkmark")
                            } else {
                                Text(specialist.title)
                            }
                        }
                    }
                } label: {
                    Label("Specialist — \(model.roomAgentTitle)", systemImage: "person.crop.circle")
                }
            }

            Button { showingFiles = true } label: {
                Label("Files in this room", systemImage: "folder")
            }

            Button { showingImageGenerator = true } label: {
                Label("Generate an image", systemImage: "photo.badge.plus")
            }
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
            withAnimation(.easeInOut(duration: 0.55).repeatForever(autoreverses: true)) {
                caretOn = false
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
            .animation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true), value: pulsing)
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
                    Text("Sending…")
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
