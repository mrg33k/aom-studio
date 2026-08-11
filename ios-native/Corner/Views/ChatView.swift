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

    /// Computed ONCE per thread render and handed down to every bubble, rather than each
    /// bubble subscribing to the review store itself.
    private var waitingIDs: Set<String> { review.waitingIDs }

    init(room: Room) {
        _model = StateObject(wrappedValue: ChatViewModel(room: room))
    }

    var body: some View {
        messageList
            .safeAreaInset(edge: .bottom, spacing: 0) { composer }
            .background(Theme.ground)
            .navigationTitle(model.room.title)
            .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                // This chat's files live one tap from the chat, never in a separate
                // destination — the crossings ARE this conversation, narrowed. Folder
                // glyph to match the web chat header's Files button.
                Button { showingFiles = true } label: {
                    Image(systemName: "folder")
                }
                .accessibilityLabel("Files in this chat")
            }
        }
        .sheet(isPresented: $showingFiles) {
            RoomFilesView(room: model.room)
        }
        .onAppear {
            model.start()
            // The waiting set marks files inside the thread too, so it loads with the
            // room rather than only when the review screen is opened.
            Task { await review.load() }
            Task { await model.loadModelPreference() }
        }
        .onDisappear { model.stop() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { model.handleForeground() }
        }
    }

    // MARK: - Thread

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
                        let thread = model.thread
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
                        turnIndicator
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
            .onChange(of: model.thread.count) { _, _ in scrollToEnd(proxy) }
            .onChange(of: model.turn) { _, _ in scrollToEnd(proxy) }
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
        !model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !model.staged.isEmpty
    }

    private var composer: some View {
        VStack(spacing: 10) {
            if let error = model.uploadError { uploadErrorRow(error) }
            if !model.staged.isEmpty { stagedChips }
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

    /// Row 2 — the action row: the model choice on the left, send on the right.
    private var actionRow: some View {
        HStack(spacing: 6) {
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

            Button(action: model.send) {
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
