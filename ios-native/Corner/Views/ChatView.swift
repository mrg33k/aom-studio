// ChatView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// The core screen. All the judgement lives in ChatViewModel; this file is the shape
// of it — and the two rows that matter most are the ones most chat UIs do not have:
// a failed send that is still on screen with a way to retry, and a stalled turn that
// says it stopped instead of quietly dropping its spinner.

import SwiftUI

struct ChatView: View {
    @StateObject private var model: ChatViewModel
    @StateObject private var review = ReviewStore.shared
    @Environment(\.scenePhase) private var scenePhase

    @State private var showingFiles = false

    /// Computed ONCE per thread render and handed down to every bubble, rather than each
    /// bubble subscribing to the review store itself.
    private var waitingIDs: Set<String> { review.waitingIDs }

    init(room: Room) {
        _model = StateObject(wrappedValue: ChatViewModel(room: room))
    }

    var body: some View {
        VStack(spacing: 0) {
            messageList
            composer
        }
        .background(Theme.ground)
        .navigationTitle(model.room.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                // This chat's files live one tap from the chat, never in a separate
                // destination — the crossings ARE this conversation, narrowed.
                Button { showingFiles = true } label: {
                    Image(systemName: "paperclip")
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
            Text(text).font(.caption)
            Spacer()
            Button("Dismiss") { model.catchUpNotice = nil }
                .font(.caption)
        }
        .foregroundStyle(Theme.inkSoft)
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.s2, style: .continuous))
    }

    private func centeredNotice(_ text: String, systemImage: String) -> some View {
        VStack(spacing: Theme.s2) {
            Image(systemName: systemImage).font(.title2)
            Text(text)
                .font(.footnote)
                .multilineTextAlignment(.center)
        }
        .foregroundStyle(Theme.inkSoft)
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.s6)
    }

    // MARK: - Composer

    private var composer: some View {
        let canSend = !model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return HStack(alignment: .bottom, spacing: Theme.s2) {
            TextField("Message \(model.room.title)…", text: $model.draft, axis: .vertical)
                .lineLimit(1...6)
                .padding(.horizontal, Theme.s4)
                .padding(.vertical, 10)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(Theme.hairline, lineWidth: 1)
                )
                .foregroundStyle(Theme.ink)

            // The send affordance the web mobile composer uses: a circular button with a
            // paper-plane, filled with the accent when there is something to send and a
            // quiet outlined disc when the box is empty.
            Button(action: model.send) {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(canSend ? Color.white : Theme.inkFaint)
                    .frame(width: 36, height: 36)
                    .background(canSend ? Theme.accent : Theme.raised, in: Circle())
                    .overlay {
                        if !canSend {
                            Circle().strokeBorder(Theme.hairline, lineWidth: 1)
                        }
                    }
            }
            .disabled(!canSend)
            .accessibilityLabel("Send")
        }
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .background(Theme.raised.opacity(0.9))
        .overlay(alignment: .top) { Rectangle().fill(Theme.hairline).frame(height: 1) }
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
                    .font(.footnote)
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
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.warning)
                    Text("Nothing came back for three minutes. Your message was delivered; the agent never answered it.")
                        .font(.caption)
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
                    .font(.body)
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, Theme.s3)
                    .padding(.vertical, 10)
                    .background(
                        Theme.userBubble,
                        in: RoundedRectangle(cornerRadius: Theme.bubbleRadius, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.bubbleRadius, style: .continuous)
                            .strokeBorder(item.isFailed ? Theme.danger.opacity(0.8) : Color.clear, lineWidth: 1)
                    )
                    .opacity(item.isFailed ? 1 : 0.55)
                    .textSelection(.enabled)

                if let failure = item.failureMessage {
                    VStack(alignment: .trailing, spacing: Theme.s1) {
                        Text("Not sent — \(failure)")
                            .font(.caption2)
                            .foregroundStyle(Theme.danger)
                            .multilineTextAlignment(.trailing)
                        HStack(spacing: Theme.s3) {
                            // Stated, not inherited. Retry is the action that gets the
                            // user's message where it was going; it must not depend on
                            // an ambient tint set three views up to look like the
                            // primary choice.
                            Button("Retry", action: retry)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Theme.accent)
                            Button("Discard", role: .destructive, action: discard)
                                .font(.caption)
                                .foregroundStyle(Theme.inkSoft)
                        }
                    }
                } else {
                    Text("Sending…")
                        .font(.caption2)
                        .foregroundStyle(Theme.inkFaint)
                }
            }
        }
    }
}
