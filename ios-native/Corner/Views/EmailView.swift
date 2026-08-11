// EmailView.swift — corner:native-ios R16 E1/E2
// AOM-owner triage: read, approve/reply, resolve, and pause/restore auto-reply.

import SwiftUI

struct EmailView: View {
    @StateObject private var store = EmailStore()
    @State private var tab = 0

    private var items: [EmailItem] { tab == 0 ? store.needsYou : store.watching }

    var body: some View {
        List {
            autoReplyStrip
            Picker("Mailbox", selection: $tab) {
                Text("Needs you \(store.needsYou.count)").tag(0)
                Text("Watching \(store.watching.count)").tag(1)
            }
            .pickerStyle(.segmented)
            .plainCardRow()

            switch store.state {
            case .loading:
                ProgressView("Preparing your inbox").plainCardRow()
            case .error(let message):
                ContentUnavailableView("Inbox unavailable", systemImage: "wifi.exclamationmark", description: Text(message))
                    .plainCardRow()
            case .empty where items.isEmpty:
                ContentUnavailableView("You're all caught up", systemImage: "checkmark.circle", description: Text("Nothing needs you right now."))
                    .plainCardRow()
            default:
                ForEach(items) { item in
                    NavigationLink(value: EmailDestination(item: item)) { EmailRow(item: item) }
                        .plainCardRow()
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .groundBackground()
        .navigationTitle("Email")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: EmailDestination.self) { destination in
            EmailDetailView(item: destination.item, store: store)
        }
        .refreshable { await store.load() }
        .task { await store.load() }
    }

    @ViewBuilder private var autoReplyStrip: some View {
        let state = store.autoReply?.fileState
        let actual = state?.mode ?? "unknown"
        let pending = store.autoReply?.control != nil
        let live = ["live", "test"].contains(actual)
        HStack(spacing: Theme.s3) {
            Image(systemName: live ? "bolt.fill" : "pause.fill")
                .foregroundStyle(live ? Theme.live : Theme.inkSoft)
            VStack(alignment: .leading, spacing: 2) {
                Text("Auto-reply · \(pending ? "Applying" : label(actual, answer: state?.answerMode))")
                    .font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(statusDetail(actual, syncedAt: state?.syncedAt))
                    .font(.hkCaption).foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Button(live ? "Pause" : "Restore") {
                Task { await store.setAutoReplyPaused(live) }
            }
            .font(.hkFootnote.weight(.semibold))
            .disabled(store.actionBusy || (!live && store.autoReply?.canRestore != true))
            .buttonStyle(.bordered)
        }
        .padding(Theme.s3)
        .cardSurface(fill: Theme.raised, border: Theme.hairline, edge: live ? Theme.live : Theme.inkFaint)
        .plainCardRow()
    }

    private func label(_ mode: String, answer: String?) -> String {
        if mode == "live" { return "Live" }; if mode == "test" { return "Test" }
        if answer == "draft" { return "Draft only" }; if mode == "off" { return "Off" }
        return "Status unknown"
    }

    private func statusDetail(_ mode: String, syncedAt: String?) -> String {
        guard let synced = EmailView.date(syncedAt) else { return mode == "unknown" ? "Waiting for the mail watcher" : "Watcher status has no timestamp" }
        if Date().timeIntervalSince(synced) > 300 { return "Watcher status is stale" }
        return "Confirmed by the mail watcher"
    }

    static func date(_ raw: String?) -> Date? {
        guard let raw else { return nil }; return ISO8601DateFormatter().date(from: raw)
    }
}

private struct EmailDestination: Hashable {
    let id: String
    let item: EmailItem
    init(item: EmailItem) { id = item.id; self.item = item }
    static func == (lhs: Self, rhs: Self) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

private struct EmailRow: View {
    let item: EmailItem
    var body: some View {
        HStack(spacing: Theme.s3) {
            ZStack {
                Circle().fill(Theme.tint(for: item.address).opacity(0.18)).frame(width: 42, height: 42)
                Text(initials).font(.hkFootnote.weight(.bold)).foregroundStyle(Theme.tint(for: item.address))
            }
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(item.sender).font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                    Spacer()
                    Text("\(item.urgency)/10").font(.hkCaption2.monospacedDigit()).foregroundStyle(item.urgency >= 8 ? Theme.warning : Theme.inkFaint)
                }
                Text(item.subject).font(.hkSubheadline).foregroundStyle(Theme.inkSoft).lineLimit(1)
                Text(item.snippet).font(.hkCaption).foregroundStyle(Theme.inkFaint).lineLimit(2)
                if item.hasStaged { Label("Draft ready", systemImage: "paperplane.fill").font(.hkCaption2.weight(.semibold)).foregroundStyle(Theme.success) }
            }
        }
        .padding(.vertical, Theme.s2)
        .contentShape(Rectangle())
    }
    private var initials: String {
        let parts = item.sender.split(separator: " "); return parts.prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
    }
}

private struct EmailDetailView: View {
    let item: EmailItem
    @ObservedObject var store: EmailStore
    @State private var thread: [EmailThreadMessage] = []
    @State private var suggestion: EmailSuggestion?
    @State private var reply = ""
    @State private var loading = true
    @State private var sent = false
    @Environment(\.dismiss) private var dismiss

    private var wishID: String? { if case .wish(let wish) = item.source { return wish.id }; return nil }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.s4) {
                VStack(alignment: .leading, spacing: Theme.s2) {
                    Text(item.subject).font(.hkTitle2).foregroundStyle(Theme.ink)
                    Text("\(item.sender) · \(item.address)").font(.hkFootnote).foregroundStyle(Theme.inkSoft)
                }
                if loading { ProgressView("Loading conversation…") }
                ForEach(thread) { message in
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Text(message.direction == "out" ? "You" : (message.from ?? item.sender))
                            .font(.hkCaption.weight(.semibold)).foregroundStyle(message.direction == "out" ? Theme.accent : Theme.inkSoft)
                        Text(message.body ?? "").font(.hkBody).foregroundStyle(Theme.ink).textSelection(.enabled)
                    }
                    .padding(Theme.s3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
                }
                if let suggestion {
                    if !suggestion.recommendation.isEmpty {
                        VStack(alignment: .leading, spacing: Theme.s2) {
                            Text("Agent read").font(.hkCaption.weight(.bold)).foregroundStyle(Theme.accent)
                            ForEach(suggestion.recommendation, id: \.self) { Text("• \($0)").font(.hkFootnote).foregroundStyle(Theme.inkSoft) }
                        }
                        .padding(Theme.s3).background(Theme.accentWeak, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
                    }
                    if wishID != nil {
                        TextField("Reply…", text: $reply, axis: .vertical)
                            .font(.hkBody).lineLimit(4...10).padding(Theme.s3)
                            .background(Theme.raised2, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
                        Button(suggestion.staged?.body?.trimmingCharacters(in: .whitespacesAndNewlines) == reply.trimmingCharacters(in: .whitespacesAndNewlines) ? "Approve and send draft" : "Send reply") {
                            Task { if await store.reply(item, text: reply, suggestion: suggestion) { sent = true; dismiss() } }
                        }
                        .buttonStyle(.borderedProminent).disabled(reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.actionBusy)
                    }
                }
                if wishID != nil {
                    Button("Resolve without replying", role: .destructive) {
                        Task { if await store.resolve(item) { dismiss() } }
                    }
                    .disabled(store.actionBusy)
                }
                if let error = store.actionError { Text(error).font(.hkFootnote).foregroundStyle(Theme.danger) }
            }
            .padding(Theme.s4)
        }
        .groundBackground()
        .navigationTitle("Email")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        async let chain = CornerAPI.shared.fetchEmailThread(item: item)
        if let wishID { async let suggested = CornerAPI.shared.fetchEmailSuggestion(wishID: wishID); suggestion = try? await suggested }
        thread = (try? await chain) ?? []
        if let body = suggestion?.staged?.body { reply = body }
        loading = false
    }
}
