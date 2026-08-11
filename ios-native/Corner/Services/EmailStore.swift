// EmailStore.swift — corner:native-ios R16 E1/E2

import Foundation

@MainActor
final class EmailStore: ObservableObject {
    enum LoadState: Equatable { case loading, ready, empty, error(String) }

    @Published private(set) var needsYou: [EmailItem] = []
    @Published private(set) var watching: [EmailItem] = []
    @Published private(set) var autoReply: AutoReplyStatus?
    @Published private(set) var state: LoadState = .loading
    @Published private(set) var actionBusy = false
    @Published var actionError: String?

    private let api: CornerAPI
    init(api: CornerAPI? = nil) { self.api = api ?? .shared }

    func load() async {
        if needsYou.isEmpty && watching.isEmpty { state = .loading }
        do {
            async let wishes = api.fetchEmailWishes()
            async let mailboxes = api.fetchEmailMailboxes()
            async let auto = api.fetchAutoReplyStatus()
            let shaped = Self.shape(wishes: try await wishes, mailboxes: try await mailboxes)
            needsYou = shaped.needs
            watching = shaped.watching
            autoReply = try? await auto
            state = needsYou.isEmpty && watching.isEmpty ? .empty : .ready
        } catch {
            if needsYou.isEmpty && watching.isEmpty { state = .error(error.localizedDescription) }
        }
    }

    func setAutoReplyPaused(_ paused: Bool) async {
        actionBusy = true; actionError = nil
        defer { actionBusy = false }
        do { autoReply = try await api.setAutoReply(action: paused ? "off" : "restore") }
        catch { actionError = error.localizedDescription }
    }

    func resolve(_ item: EmailItem) async -> Bool {
        guard case .wish(let wish) = item.source else { return false }
        return await act { try await api.resolveEmail(wishID: wish.id) }
    }

    func reply(_ item: EmailItem, text: String, suggestion: EmailSuggestion?) async -> Bool {
        guard case .wish(let wish) = item.source else { return false }
        let cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return false }
        return await act {
            if let staged = suggestion?.staged,
               let stagedBody = staged.body?.trimmingCharacters(in: .whitespacesAndNewlines),
               stagedBody == cleaned {
                try await api.sendStagedEmail(wishID: wish.id, draftID: staged.draftId, connectionID: staged.connectionId)
            } else {
                try await api.replyToEmail(wishID: wish.id, text: cleaned)
            }
        }
    }

    private func act(_ operation: () async throws -> Void) async -> Bool {
        actionBusy = true; actionError = nil
        defer { actionBusy = false }
        do {
            try await operation()
            await load()
            return true
        } catch {
            actionError = error.localizedDescription
            return false
        }
    }

    static func shape(wishes: [EmailWish], mailboxes: [EmailMailbox], now: Date = Date()) -> (needs: [EmailItem], watching: [EmailItem]) {
        var needs: [EmailItem] = []
        var watching: [EmailItem] = []
        for wish in wishes where !["dismissed", "spam"].contains(wish.status) {
            let parsed = parseWish(wish.message ?? "")
            let staged = parsed.staged && wish.status != "resolved"
            let item = EmailItem(
                id: "wish-\(wish.id)", source: .wish(wish),
                sender: wish.name?.nonempty ?? wish.email?.nonempty ?? "Someone",
                address: wish.email ?? "", subject: parsed.subject.nonempty ?? "New request",
                snippet: cleanSnippet(parsed.original.nonempty ?? wish.message ?? ""),
                createdAt: wish.createdAt, status: wish.status, hasStaged: staged,
                urgency: urgency(kind: "wish", status: wish.status, createdAt: wish.createdAt, hasStaged: staged, autoSendAt: wish.autoSendAt, now: now)
            )
            if wish.status == "resolved" { watching.append(item) } else { needs.append(item) }
        }
        let noise = try! NSRegularExpression(pattern: "(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce[@+]|notifications?@|newsletter@|marketing@|mailchimp|sendgrid|klaviyo|hubspot)", options: .caseInsensitive)
        for box in mailboxes {
            for (resolved, message) in box.needs.map({ (false, $0) }) + box.replied.map({ (true, $0) }) {
                let address = message.email ?? message.from ?? ""
                let range = NSRange(address.startIndex..., in: address)
                guard noise.firstMatch(in: address, range: range) == nil else { continue }
                guard let threadID = message.threadId, !threadID.isEmpty else { continue }
                let created = message.lastInbound?.date ?? message.date
                let item = EmailItem(
                    id: "mail-\(box.email)-\(threadID)", source: .mailbox(threadID: threadID, account: box.email),
                    sender: message.from?.nonempty ?? message.email?.nonempty ?? "Sender", address: message.email ?? "",
                    subject: message.subject?.nonempty ?? "(no subject)",
                    snippet: cleanSnippet(message.lastInbound?.body ?? message.lastInbound?.snippet ?? message.snippet ?? ""),
                    createdAt: created, status: resolved ? "resolved" : "open", hasStaged: false,
                    urgency: urgency(kind: "email", status: resolved ? "resolved" : "open", createdAt: created, hasStaged: false, autoSendAt: nil, now: now)
                )
                if resolved { watching.append(item) } else { needs.append(item) }
            }
        }
        needs.sort { $0.urgency == $1.urgency ? ($0.createdAt ?? "") > ($1.createdAt ?? "") : $0.urgency > $1.urgency }
        watching.sort { ($0.createdAt ?? "") > ($1.createdAt ?? "") }
        return (needs, watching)
    }

    private static func parseWish(_ raw: String) -> (subject: String, original: String, staged: Bool) {
        let staged = raw.range(of: #"\[staged_draft:[^|\]]+\|conn:[^\]]+\]"#, options: .regularExpression) != nil
        let cleaned = raw.replacingOccurrences(of: #"\[staged_draft:[^|\]]+\|conn:[^\]]+\]"#, with: "", options: .regularExpression)
        let parts = cleaned.components(separatedBy: "--- ORIGINAL MESSAGE ---")
        let subject = parts.first?.split(separator: "\n").map(String.init).first(where: { !$0.trimmingCharacters(in: .whitespaces).hasPrefix("•") }) ?? ""
        return (subject.trimmingCharacters(in: .whitespacesAndNewlines), parts.dropFirst().joined(separator: "--- ORIGINAL MESSAGE ---").trimmingCharacters(in: .whitespacesAndNewlines), staged)
    }

    private static func cleanSnippet(_ value: String) -> String {
        value.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines).prefix(180).description
    }

    /// Exact native port of useSupportInbox.js urgencyScore().
    private static func urgency(kind: String, status: String, createdAt: String?, hasStaged: Bool, autoSendAt: String?, now: Date) -> Int {
        if status == "resolved" { return 2 }
        var score = kind == "email" ? 5 : 4
        if let created = parseDate(createdAt) {
            let hours = max(0, now.timeIntervalSince(created) / 3600)
            if hours >= 1 { score += 1 }; if hours >= 4 { score += 1 }; if hours >= 24 { score += 2 }
        }
        if hasStaged { score += 1 }
        if let sendAt = parseDate(autoSendAt) {
            let remaining = sendAt.timeIntervalSince(now)
            if remaining > 0 && remaining <= 1800 { score += 1 }
        }
        return min(10, max(1, score))
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        return ISO8601DateFormatter().date(from: value)
    }
}

private extension String {
    var nonempty: String? { isEmpty ? nil : self }
}
