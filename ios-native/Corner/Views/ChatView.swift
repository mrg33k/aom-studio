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
    @State private var nearBottom = false
    @FocusState private var composerFocused: Bool

    // R5 chat-header parity
    @State private var isSearching = false
    @State private var searchQuery = ""
    @FocusState private var searchFocused: Bool
    @State private var showingSettings = false

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

    /// Computed ONCE per thread render and handed down to every bubble, rather than each
    /// bubble subscribing to the review store itself.
    private var waitingIDs: Set<String> { review.waitingIDs }

    init(room: Room) {
        _model = StateObject(wrappedValue: ChatViewModel(room: room))
    }

    var body: some View {
        messageList
            .safeAreaInset(edge: .bottom, spacing: 0) {
                // Collapse: 0-height clear placeholder keeps the thread from
                // resizing when we swap composer ↔ nothing.
                if composerCollapsed {
                    Color.clear.frame(height: 0)
                } else {
                    composer
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
                        Image(systemName: "pencil.circle.fill")
                            .font(.system(size: 52))
                            .foregroundStyle(Theme.accent)
                            .shadow(color: .black.opacity(0.45), radius: 10, y: 5)
                    }
                    .padding(.trailing, Theme.s4)
                    .safeAreaPadding(.bottom, Theme.s4)
                    .accessibilityLabel("Open composer — type a message")
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.28, dampingFraction: 0.72), value: composerCollapsed)
            .background(Theme.ground)
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
                    onOpenFiles: { showingSettings = false; showingFiles = true }
                )
                .presentationDetents([.medium, .large])
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
    private var headerTitle: some View {
        Button {
            showingSettings = true
        } label: {
            HStack(spacing: 8) {
                RoomAvatarView(room: model.room, size: 30, isActive: model.isAwaiting)
                VStack(alignment: .leading, spacing: 1) {
                    Text(model.room.title)
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    // Status line: "active" with a live dot when a turn is running,
                    // else the room's subtitle (specialist / project / mission).
                    HStack(spacing: 4) {
                        if model.isAwaiting {
                            Circle()
                                .fill(Theme.live)
                                .frame(width: 6, height: 6)
                            Text("active")
                                .font(.hanken(10.5).weight(.medium))
                                .foregroundStyle(Theme.live)
                        } else {
                            let sub = model.room.subtitle.isEmpty
                                ? model.room.typeLabel.lowercased()
                                : model.room.subtitle
                            Text(sub)
                                .font(.hanken(10.5).weight(.medium))
                                .foregroundStyle(Theme.inkSoft)
                        }
                    }
                    .animation(.easeOut(duration: 0.2), value: model.isAwaiting)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Room settings for \(model.room.title)")
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
                                        showsAuthor: opensGroup(at: index, in: thread)
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
                            if !isSearching {
                                turnIndicator
                            }
                        }
                        // Tail sentinel: arms the swipe-up-for-files gesture only when
                        // the user is actually looking at the end of the thread — the
                        // same guard the web's overscroll-up uses.
                        Color.clear.frame(height: 1)
                            .onAppear { nearBottom = true }
                            .onDisappear { nearBottom = false }
                    }
                }
                .padding(.horizontal, Theme.s4)
                .padding(.vertical, Theme.s3)
            }
            .defaultScrollAnchor(.bottom)
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: model.thread.count) { _, _ in
                if !isSearching { scrollToEnd(proxy) }
            }
            .onChange(of: model.turn) { _, _ in
                if !isSearching { scrollToEnd(proxy) }
            }
            .refreshable { await model.load() }
            // Patrik's R4 gesture spec. Swipe UP at the tail → this chat's files.
            // Horizontal flick → the recency carousel: right toward the more recent
            // room, left toward the older one. Thresholds are the web's own
            // (useChatSwipe.js: 56pt distance, 1.67× dominance).
            .simultaneousGesture(
                DragGesture(minimumDistance: 40)
                    .onEnded { value in
                        let dx = value.translation.width
                        let dy = value.translation.height
                        if nearBottom, dy < -58, abs(dy) > abs(dx) * 1.25 {
                            showingFiles = true
                            return
                        }
                        if abs(dx) >= 56, abs(dx) > abs(dy) * 1.67 {
                            router.swipeChat(from: model.room, toMoreRecent: dx > 0)
                        }
                    }
            )
        }
    }

    /// The author a thread item belongs to, for sender grouping. Every outbox item and
    /// every user row is "you"; an agent row is keyed by its display title so a run of
    /// one specialist's replies groups under a single avatar + name.
    private func authorKey(_ item: ThreadItem) -> String {
        switch item {
        case .message(let row): return row.isUser ? "__you" : row.displayName
        case .outbox: return "__you"
        }
    }

    /// True when this row starts a new sender group (first row, or a different author
    /// than the one above it) — the signal that drives the avatar + name header.
    private func opensGroup(at index: Int, in thread: [ThreadItem]) -> Bool {
        guard index > 0 else { return true }
        return authorKey(thread[index - 1]) != authorKey(thread[index])
    }

    private func scrollToEnd(_ proxy: ScrollViewProxy) {
        let anchor: String? = {
            switch model.turn {
            case .idle: return model.thread.last?.id
            case .working, .stalled: return "turn-indicator"
            }
        }()
        guard let anchor else { return }
        withAnimation(.easeOut(duration: 0.2)) {
            proxy.scrollTo(anchor, anchor: .bottom)
        }
    }

    // MARK: - Turn indicator

    private var turnIndicator: some View {
        TurnIndicatorView(
            turn: model.turn,
            resend: { model.resendStalled() },
            dismiss: { model.dismissStalled() }
        )
        .id("turn-indicator")
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

    private var composer: some View {
        VStack(spacing: 10) {
            if let error = model.uploadError { uploadErrorRow(error) }
            if !model.staged.isEmpty { stagedChips }
            // Paste chips sit between file chips and the input shell.
            if !pasteChips.isEmpty { pasteChipBar }
            inputShell
            actionRow
        }
        .padding(Theme.s2)
        .background(Theme.composer, in: RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.55), radius: 21, y: 9)
        .padding(.horizontal, Theme.s3)
        .padding(.bottom, Theme.s2)
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
    /// accent border + soft ring while focused, exactly the web's focus behavior.
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
                        ProgressView().controlSize(.small).tint(Theme.accent)
                    } else {
                        Image(systemName: "paperclip")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
                .frame(width: 32, height: 32)
            }
            .disabled(model.isUploading)
            .accessibilityLabel("Attach and upload files")

            TextField("Message \(model.room.title)…", text: $model.draft, axis: .vertical)
                .font(.hanken(16))
                .lineLimit(1...5)
                .focused($composerFocused)
                .foregroundStyle(Theme.ink)
                .padding(.vertical, 7)
                .padding(.trailing, Theme.s2)
        }
        .padding(.leading, Theme.s1)
        .frame(minHeight: 40)
        .background(Theme.composerCard, in: RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous)
                .strokeBorder(composerFocused ? Theme.accent : Theme.hairline, lineWidth: 1)
        )
        .background(
            RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous)
                .fill(composerFocused ? Theme.accentWeak : Color.clear)
                .padding(-2)
        )
        .animation(.easeOut(duration: 0.2), value: composerFocused)
    }

    /// Row 2 — the action row: Work/Plan toggle + model choice on the left, send on the right.
    private var actionRow: some View {
        HStack(spacing: 6) {
            // Work / Plan toggle — always visible so mode is never buried in a menu.
            // Matches the web's Commands → Work / Plan segmented control.
            modePicker

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
                HStack(spacing: 7) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 13, weight: .medium))
                    Text(ChatView.shortModelLabel(model.modelChoice))
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
            .accessibilityLabel("Model")

            Button { showingFiles = true } label: {
                Image(systemName: "folder")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 34, height: 30)
                    .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .strokeBorder(Theme.hairline, lineWidth: 1)
                    )
            }
            .accessibilityLabel("Files in this room")

            Spacer(minLength: 0)

            Button(action: sendWithChips) {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(canSend ? Color.white : Theme.inkFaint)
                    .frame(width: 34, height: 34)
                    .background(
                        canSend ? Theme.accent : Theme.raised2,
                        in: RoundedRectangle(cornerRadius: Theme.shellRadius, style: .continuous)
                    )
                    .opacity(canSend ? 1 : 0.72)
            }
            .disabled(!canSend)
            .accessibilityLabel("Send")
        }
    }

    /// Two-button Work / Plan segmented pill.
    /// Active pill: surface card background + border + full-weight ink.
    /// Inactive pill: transparent + muted ink. Height matches the model chip (30pt).
    private var modePicker: some View {
        HStack(spacing: 0) {
            ForEach(["work", "plan"], id: \.self) { mode in
                let active = model.chatMode == mode
                Button {
                    model.setMode(mode)
                } label: {
                    Text(mode.capitalized)
                        .font(.hanken(11.5).weight(.bold))
                        .foregroundStyle(active ? Theme.ink : Theme.inkSoft)
                        .frame(maxWidth: .infinity)
                        .frame(height: 24)
                        .background(
                            active ? Theme.composerCard : Color.clear,
                            in: RoundedRectangle(cornerRadius: 6, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .strokeBorder(
                                    active ? Theme.hairline : Color.clear,
                                    lineWidth: 1
                                )
                        )
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(active ? [.isSelected] : [])
                .animation(.easeOut(duration: 0.12), value: model.chatMode)
            }
        }
        .padding(3)
        .frame(width: 110, height: 30)
        .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 9, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
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

    static let modelOptions: [(id: String, label: String)] = [
        ("default", "Auto (Claude + fallback)"),
        ("opus", "Claude Opus"),
        ("sonnet", "Claude Sonnet"),
        ("haiku", "Claude Haiku"),
    ]

    static func shortModelLabel(_ id: String) -> String {
        switch id {
        case "default": return "Auto"
        case "opus": return "Opus"
        case "sonnet": return "Sonnet"
        case "haiku": return "Haiku"
        default: return id
        }
    }
}

// MARK: - Turn indicator

/// The honest answer to "is anything happening". Its own view so it can be rendered
/// with each state on purpose rather than only ever being seen by accident.
struct TurnIndicatorView: View {
    let turn: TurnState
    var resend: () -> Void = {}
    var dismiss: () -> Void = {}

    var body: some View {
        switch turn {
        case .idle:
            EmptyView()

        case .working(let detail):
            HStack(spacing: Theme.s2) {
                ProgressView().controlSize(.small)
                Text(detail ?? "Working…")
                    .font(.hkFootnote)
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(2)
            }
            .padding(.horizontal, Theme.s3)
            .padding(.vertical, Theme.s2)
            .background(Theme.raised, in: Capsule())
            .transition(.opacity)

        case .stalled(let sentText):
            // THE ROW THIS APP EXISTS FOR. Three minutes of complete silence — no step,
            // no reply. The spinner does NOT just disappear here, because a spinner that
            // disappears reads as "finished". It says the turn stopped, and offers the
            // only two things worth offering.
            RaisedCard(tint: Theme.warning.opacity(0.4)) {
                VStack(alignment: .leading, spacing: Theme.s2) {
                    Label("No reply — this turn stopped", systemImage: "exclamationmark.triangle.fill")
                        .font(.hkFootnote.weight(.semibold))
                        .foregroundStyle(Theme.warning)
                    Text("Nothing came back for three minutes. Your message was delivered; the agent never answered it.")
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
