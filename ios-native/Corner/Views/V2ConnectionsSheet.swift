// V2ConnectionsSheet.swift — Corner native iOS
// corner:corner-v2 — Agent connections panel (Patrik 2026-09-08).
//
// A compact "what's in this agent's toolkit, and is it on?" panel. Two entry
// points, one panel:
//   • Global — the drawer footer, beside the person mark (every agent).
//   • Per-room — the chat nav, left of the eye (this room's agent).
//
// Each row carries TWO signals Patrik asked for, kept distinct on purpose:
//   • a status dot — the TRUTH: is the tool actually reachable right now
//     (green connected / grey available / amber needs attention).
//   • a toggle — the CONTROL: allow this agent to use it. The toggle captures
//     intent and persists (UserDefaults); enforcing it in the bridge/agent is
//     the next round. Both live together so you can flip access AND see at a
//     glance what the agent could reach — Patrik's exact ask: "turn on or off,
//     but also know that the agent had access to these things."

import SwiftUI
import UIKit
import AuthenticationServices

// MARK: - Model

/// Live reachability of a tool. The dot, not the toggle — the toggle is intent.
enum V2ToolStatus {
    case connected   // reachable now
    case available   // known/configured, no live probe this session
    case attention   // configured but down right now

    @MainActor var dot: Color {
        switch self {
        case .connected: return Theme.success
        case .available: return Theme.inkFaint
        case .attention: return Theme.warning
        }
    }
    var label: String {
        switch self {
        case .connected: return "Connected"
        case .available: return "Available"
        case .attention: return "Needs attention"
        }
    }
}

/// One tool in an agent's kit. `detail` names the account/machine so a row is
/// honest about *which* mailbox or *which* computer.
struct V2Tool: Identifiable {
    let id: String
    let name: String
    let detail: String
    let icon: String
    let tint: Color
    var status: V2ToolStatus
    /// R67: when set, this tool connects via Arcade OAuth (the Connect button).
    /// The value is the Arcade service key ("gmail", "outlook", "github", …).
    var arcadeService: String? = nil
}

struct V2ToolGroup: Identifiable {
    let id: String
    let title: String
    let tools: [V2Tool]
}

// MARK: - Store

/// The toolkit definition + the per-tool allow switch. The definition is seeded
/// from what the AOM agents actually reach for (browser, mail, GitHub, this Mac,
/// image-gen, Resolve); the allow switch is device-persisted so a flip sticks.
@MainActor
final class V2ToolkitStore: ObservableObject {
    static let shared = V2ToolkitStore()

    @Published private(set) var groups: [V2ToolGroup]
    @Published private var enabled: [String: Bool]

    private static let key = "corner.v2.toolkit.enabled"

    init() {
        self.groups = V2ToolkitStore.seed()
        if let data = UserDefaults.standard.data(forKey: Self.key),
           let map = try? JSONDecoder().decode([String: Bool].self, from: data) {
            self.enabled = map
        } else {
            self.enabled = [:]
        }
    }

    /// Default is allowed — a tool the agent already has is on until you say no.
    func isOn(_ id: String) -> Bool { enabled[id] ?? true }

    func setOn(_ id: String, _ on: Bool) {
        enabled[id] = on
        if let data = try? JSONEncoder().encode(enabled) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }

    var allTools: [V2Tool] { groups.flatMap { $0.tools } }
    var onCount: Int { allTools.filter { isOn($0.id) }.count }
    var total: Int { allTools.count }

    /// The honest starting kit. When a real per-machine registry lands (the
    /// ledger/gateway work), this becomes server-authoritative; today it mirrors
    /// what's genuinely wired on the Studio Mac.
    static func seed() -> [V2ToolGroup] {
        [
            V2ToolGroup(id: "web", title: "Browsing", tools: [
                V2Tool(id: "browser", name: "Browser",
                       detail: "Robot Chrome · signed in",
                       icon: "safari", tint: Theme.teal, status: .connected)
            ]),
            V2ToolGroup(id: "email", title: "Email", tools: [
                V2Tool(id: "gmail", name: "Gmail",
                       detail: "Connect to read + send",
                       icon: "envelope", tint: Theme.accent, status: .available,
                       arcadeService: "gmail"),
                V2Tool(id: "outlook", name: "Outlook",
                       detail: "Connect to read + send",
                       icon: "envelope", tint: Theme.accent, status: .available,
                       arcadeService: "outlook")
            ]),
            V2ToolGroup(id: "code", title: "Code", tools: [
                V2Tool(id: "github", name: "GitHub",
                       detail: "Connect your repos",
                       icon: "chevron.left.forwardslash.chevron.right",
                       tint: Theme.violet, status: .available,
                       arcadeService: "github")
            ]),
            V2ToolGroup(id: "computers", title: "Computers", tools: [
                V2Tool(id: "mac-studio", name: "Studio Mac",
                       detail: "This machine · gateway live",
                       icon: "desktopcomputer", tint: Theme.success, status: .connected),
                V2Tool(id: "mac-personal", name: "Personal Mac",
                       detail: "Not connected yet",
                       icon: "laptopcomputer", tint: Theme.inkFaint, status: .available)
            ]),
            V2ToolGroup(id: "tools", title: "Tools", tools: [
                V2Tool(id: "kie", name: "Image generation",
                       detail: "KIE.ai",
                       icon: "photo.on.rectangle.angled", tint: Theme.pink, status: .connected),
                V2Tool(id: "resolve", name: "DaVinci Resolve",
                       detail: "Editing bridge",
                       icon: "film", tint: Theme.amber, status: .attention)
            ])
        ]
    }
}

// MARK: - Arcade connect flow

/// R67: the OAuth connect flow for Arcade-backed tools (Gmail, Outlook, GitHub,
/// …). Tap Connect → the corner-convex `arcade:initiateAuth` action returns a
/// provider OAuth URL → open it in Safari → poll `arcade:checkAuth` until the
/// user finishes approving. Verified live: the action returns a real Google
/// sign-in. Needs ARCADE_API_KEY set on the backend + a deploy (Patrik).
/// The connector picker for "Add another account" — mirrors the backend
/// catalog in `convex/arcade.ts` CONNECTORS. Gmail first (the common case),
/// then whatever else Arcade already lists for this workspace.
struct V2ArcadeProvider: Identifiable {
    let service: String
    let name: String
    let icon: String
    var id: String { service }
}

let v2ArcadeProviders: [V2ArcadeProvider] = [
    V2ArcadeProvider(service: "gmail", name: "Gmail", icon: "envelope"),
    V2ArcadeProvider(service: "googlecalendar", name: "Calendar", icon: "calendar"),
    V2ArcadeProvider(service: "googledrive", name: "Drive", icon: "folder"),
    V2ArcadeProvider(service: "slack", name: "Slack", icon: "message"),
    V2ArcadeProvider(service: "github", name: "GitHub", icon: "chevron.left.forwardslash.chevron.right"),
    V2ArcadeProvider(service: "notion", name: "Notion", icon: "doc.text"),
    V2ArcadeProvider(service: "figma", name: "Figma", icon: "paintbrush"),
    V2ArcadeProvider(service: "dropbox", name: "Dropbox", icon: "shippingbox"),
    V2ArcadeProvider(service: "linear", name: "Linear", icon: "checklist"),
    V2ArcadeProvider(service: "outlook", name: "Outlook", icon: "envelope.badge"),
]

/// 2026-09-15 (Patrik: "it takes you to Arcade instead of back to the app"):
/// runs the Arcade authorize URL in the system auth sheet so a successful
/// sign-in returns to Corner on its own — no Safari hand-off, no dead end on
/// account.arcade.dev. The verifier route redirects to `corner://connections`,
/// which is this app's own callback scheme, so the session closes itself.
@MainActor
final class V2ArcadeAuthPresenter: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = V2ArcadeAuthPresenter()
    private var session: ASWebAuthenticationSession?

    func present(_ url: URL) {
        session?.cancel()
        let s = ASWebAuthenticationSession(url: url, callbackURLScheme: "corner") { callbackURL, error in
            // The app's own URL handler (AppRouter.handle(url:)) already reacts
            // to corner://connections — this callback only needs to let the
            // sheet close; nothing else to do with callbackURL/error here.
            if let callbackURL { AppRouter.shared.handle(url: callbackURL) }
        }
        s.presentationContextProvider = self
        s.prefersEphemeralWebBrowserSession = false
        session = s
        s.start()
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first ?? ASPresentationAnchor()
    }
}

@MainActor
final class V2ArcadeConnectStore: ObservableObject {
    static let shared = V2ArcadeConnectStore()

    /// Set by the Arcade verifier's return trip (corner://connections?...) so
    /// the sheet can show "Connected <name>" once, then clear it.
    @Published var justConnected: String? = nil

    enum ConnectState: Equatable { case idle, connecting, connected, failed(String) }

    @Published private(set) var byService: [String: ConnectState] = [:]
    private var polls: [String: Task<Void, Never>] = [:]

    func state(for service: String) -> ConnectState { byService[service] ?? .idle }

    private struct AuthResp: Decodable { let authUrl: String; let authId: String; let status: String? }
    private struct StatusResp: Decodable { let status: String }

    /// Mailboxes the person added in the app (2026-09-14): label + the
    /// integrations service key ("gmail:work") they live under.
    @Published private(set) var extraMailboxes: [(service: String, label: String)] = []

    /// Services with a Remove in flight right now, so the row can disable its
    /// button instead of racing a second tap.
    @Published private(set) var removing: Set<String> = []

    /// The signed-in person's email: the default Arcade user id.
    static var viewerEmail: String {
        CornerAPI.shared.userEmail ?? ConvexAuth.shared.load()?.user.email ?? ""
    }

    /// One row from `arcade:listIntegrationsByStringId` — only the fields the
    /// sheet reads.
    private struct IntegrationRow: Decodable {
        let service: String
        let status: String?
        let email: String?
    }

    /// R69 (2026-09-15, "Connections must be truthful"): pure — same status
    /// string always answers the same way, no store/network involved, so it's
    /// tested on its own.
    static func isConnectedStatus(_ status: String?) -> Bool {
        status == "connected" || status == "active"
    }

    /// R69: pure — the label a "gmail:<slug>" row shows when it has no saved
    /// email. Tested on its own for the same reason as `isConnectedStatus`.
    static func mailboxLabel(service: String, email: String?) -> String {
        if let email, !email.trimmingCharacters(in: .whitespaces).isEmpty { return email }
        let slug = service.split(separator: ":", maxSplits: 1).last.map(String.init) ?? service
        let words = slug.replacingOccurrences(of: "-", with: " ").replacingOccurrences(of: "_", with: " ")
        return words.isEmpty ? service : words.capitalized
    }

    /// R69: the sheet's on-appear truth read. Reads every integrations row for
    /// the signed-in user and folds it into local state — so "Gmail" reads
    /// Connected, and an added mailbox survives a relaunch, because both now
    /// come from what Convex actually has instead of only this session's
    /// memory. Never downgrades a state this session already knows is better
    /// (an in-flight connect, a fresh failure) — it only upgrades to connected.
    func loadIntegrations() async {
        guard let userId = ConvexAuth.shared.load()?.user.id, !userId.isEmpty else { return }
        do {
            let rows: [IntegrationRow] = try await ConvexService.shared.query(
                "arcade:listIntegrationsByStringId", args: ["userId": userId],
                preserveClientIdentity: true)
            var mailboxes: [(service: String, label: String)] = []
            for row in rows where Self.isConnectedStatus(row.status) {
                if row.service.hasPrefix("gmail:") {
                    let label = Self.mailboxLabel(service: row.service, email: row.email)
                    if !mailboxes.contains(where: { $0.service == row.service }) {
                        mailboxes.append((service: row.service, label: label))
                    }
                } else {
                    byService[row.service] = .connected
                }
            }
            extraMailboxes = mailboxes
        } catch {
            NSLog("[arcade] listIntegrationsByStringId failed: %@", String(describing: error))
        }
        // 2026-09-15: the default Gmail may have been authorized straight with
        // Arcade before Corner ever stored a row (Patrik's own mailbox). Ask
        // Arcade once: an already-authorized user gets status "completed" with
        // no link, which is the truth; store it so the next open is instant.
        if state(for: "gmail") != .connected {
            let arcadeUser = Self.viewerEmail
            guard !arcadeUser.isEmpty else { return }
            do {
                let resp: AuthResp = try await ConvexService.shared.actionWithResult(
                    "arcade:initiateAuth", args: ["userId": arcadeUser, "service": "gmail"],
                    preserveClientIdentity: true)
                if resp.status == "completed" {
                    byService["gmail"] = .connected
                    record(service: "gmail", arcadeUserId: arcadeUser, label: arcadeUser)
                }
            } catch {
                NSLog("[arcade] gmail truth probe failed: %@", String(describing: error))
            }
        }
    }

    /// Drops one added mailbox: calls `arcade:removeIntegration`, then updates
    /// the list only once the server confirms it (never optimistic — a failed
    /// remove must still show the mailbox, or "Remove" would lie too).
    func removeMailbox(service: String) async {
        guard let userId = ConvexAuth.shared.load()?.user.id, !userId.isEmpty else { return }
        guard !removing.contains(service) else { return }
        removing.insert(service)
        defer { removing.remove(service) }
        do {
            try await ConvexService.shared.mutation(
                "arcade:removeIntegration", args: ["userId": userId, "service": service],
                preserveClientIdentity: true)
            extraMailboxes.removeAll { $0.service == service }
        } catch {
            NSLog("[arcade] removeIntegration(%@) failed: %@", service, String(describing: error))
        }
    }

    /// 2026-09-14 (Patrik: "users need to add multiple gmails, in app"),
    /// generalized 2026-09-15 (Patrik: "'Add another account', you pick the
    /// account"): a second account of any Arcade-backed provider is
    /// authorized under its own Arcade user id ("<viewer>::<label>") and
    /// recorded as integrations service "<provider>:<label>", so the
    /// assistant reads every account and names it. Gmail keeps the bare
    /// "gmail:<slug>" shape other code already keys off of; every other
    /// provider gets the same "<service>:<slug>" pattern.
    func addAccount(provider: V2ArcadeProvider, label rawLabel: String) {
        let label = rawLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !label.isEmpty else { return }
        let slug = label.lowercased().replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        let service = "\(provider.service):\(slug.isEmpty ? "account" : slug)"
        connect(service: service, arcadeService: provider.service,
                arcadeUserId: "\(Self.viewerEmail)::\(slug)", label: label)
    }

    /// Back-compat for the one call site (deep-link tests, older builds)
    /// that only ever added Gmail.
    func addMailbox(label rawLabel: String) {
        addAccount(provider: v2ArcadeProviders.first(where: { $0.service == "gmail" })!, label: rawLabel)
    }

    /// Record a completed authorization in Convex so every device and the
    /// bridge see the mailbox. Never fails the connect itself.
    private func record(service: String, arcadeUserId: String, label: String?) {
        guard let userId = ConvexAuth.shared.load()?.user.id, !userId.isEmpty else { return }
        Task { @MainActor in
            do {
                // R69: needs preserveClientIdentity — `userId` here is who to
                // save the row under, not an auth assertion, and the default
                // sanitizer used to strip it, so this write silently never
                // reached Convex (root cause of mailboxes vanishing on relaunch).
                try await ConvexService.shared.mutation(
                    "arcade:upsertIntegration",
                    args: ["userId": userId, "service": service, "arcadeAuthId": "app",
                           "status": "connected", "email": label ?? Self.viewerEmail,
                           "connectionId": arcadeUserId] as [String: Any],
                    preserveClientIdentity: true)
                if service.contains(":"), let label, !extraMailboxes.contains(where: { $0.service == service }) {
                    extraMailboxes.append((service: service, label: label))
                }
            } catch {
                NSLog("[arcade] upsertIntegration(%@) failed: %@", service, String(describing: error))
            }
        }
    }

    func connect(service: String) {
        connect(service: service, arcadeService: service, arcadeUserId: nil, label: nil)
    }

    func connect(service: String, arcadeService: String, arcadeUserId: String?, label: String?) {
        // 2026-09-13: CornerAPI's session can lag the Keychain session at
        // launch, so fall back to the stored viewer — a signed-in phone must
        // never see "Sign in first" here.
        let userId = arcadeUserId ?? Self.viewerEmail
        guard !userId.isEmpty else {
            NSLog("[arcade] connect(%@): no signed-in email available", service)
            byService[service] = .failed("Sign in first"); return
        }
        byService[service] = .connecting
        Task { @MainActor in
            do {
                let resp: AuthResp = try await ConvexService.shared.actionWithResult(
                    "arcade:initiateAuth", args: ["userId": userId, "service": arcadeService],
                    preserveClientIdentity: true)
                // Already authorized with Arcade: no link comes back, the
                // status is simply "completed". That is a success, not a fault.
                if resp.status == "completed" {
                    byService[service] = .connected
                    record(service: service, arcadeUserId: userId, label: label)
                    return
                }
                guard !resp.authUrl.isEmpty, let url = URL(string: resp.authUrl) else {
                    byService[service] = .failed("No sign-in link came back")
                    return
                }
                // 2026-09-15: the system auth sheet (ASWebAuthenticationSession),
                // not plain Safari — a completed sign-in returns to the app on
                // its own via the verifier's corner://connections redirect,
                // instead of stranding the person on account.arcade.dev.
                V2ArcadeAuthPresenter.shared.present(url)
                poll(service: service, authId: resp.authId, arcadeUserId: userId, label: label)
            } catch {
                NSLog("[arcade] initiateAuth(%@) failed: %@", service, String(describing: error))
                byService[service] = .failed("Couldn't start")
            }
        }
    }

    private func poll(service: String, authId: String, arcadeUserId: String, label: String?) {
        polls[service]?.cancel()
        guard !authId.isEmpty else { return }
        polls[service] = Task { @MainActor in
            for _ in 0..<40 { // ~2 minutes at 3s
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                if Task.isCancelled { return }
                do {
                    let s: StatusResp = try await ConvexService.shared.actionWithResult(
                        "arcade:checkAuth", args: ["authId": authId])
                    if s.status == "completed" {
                        byService[service] = .connected
                        record(service: service, arcadeUserId: arcadeUserId, label: label)
                        return
                    }
                    if s.status == "failed" { byService[service] = .failed("Authorization failed"); return }
                } catch { /* transient — keep polling */ }
            }
            if state(for: service) == .connecting { byService[service] = .idle }
        }
    }
}

// MARK: - Sheet

struct V2ConnectionsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var store = V2ToolkitStore.shared
    @ObservedObject private var connect = V2ArcadeConnectStore.shared

    /// nil = global (opened from the menu); a room name scopes the copy to that
    /// room's agent (opened from the chat nav).
    var scopeTitle: String? = nil

    private var subtitle: String {
        if let scope = scopeTitle {
            return "What \(scope)'s agent can use"
        }
        return "What every agent can use"
    }

    @State private var showingAddProvider = false
    @State private var showingAddMailbox = false
    @State private var addMailboxLabel = ""
    @State private var addMailboxProvider: V2ArcadeProvider = v2ArcadeProviders[0]

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(store.groups) { group in
                        sectionLabel(group.title)
                        VStack(spacing: 0) {
                            ForEach(Array(group.tools.enumerated()), id: \.element.id) { idx, tool in
                                toolRow(tool)
                                if idx < group.tools.count - 1 {
                                    Rectangle()
                                        .fill(Theme.divider)
                                        .frame(height: 1)
                                        .padding(.leading, 46)
                                }
                            }
                            if group.id == "email" {
                                // 2026-09-14: more than one Gmail, added here,
                                // never on a Mac.
                                ForEach(connect.extraMailboxes, id: \.service) { box in
                                    Rectangle().fill(Theme.divider).frame(height: 1).padding(.leading, 46)
                                    HStack(spacing: 12) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 9, style: .continuous)
                                                .fill(Theme.accent.opacity(0.16))
                                                .frame(width: 34, height: 34)
                                            Image(systemName: "envelope")
                                                .font(.system(size: 15, weight: .medium))
                                                .foregroundStyle(Theme.accent)
                                        }
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("\(v2ArcadeProviders.first(where: { box.service.hasPrefix($0.service + ":") })?.name ?? "Gmail") · \(box.label)")
                                                .font(.hanken(15).weight(.semibold))
                                                .foregroundStyle(Theme.ink)
                                            HStack(spacing: 5) {
                                                Circle().fill(Theme.success).frame(width: 6, height: 6)
                                                Text("Connected · the assistant reads it too")
                                                    .font(.hanken(12))
                                                    .foregroundStyle(Theme.inkFaint)
                                            }
                                        }
                                        Spacer(minLength: 8)
                                        if connect.removing.contains(box.service) {
                                            ProgressView().controlSize(.small)
                                        } else {
                                            Button {
                                                Task { await connect.removeMailbox(service: box.service) }
                                            } label: {
                                                Text("Remove")
                                                    .font(.hanken(12.5).weight(.semibold))
                                                    .foregroundStyle(Theme.inkFaint)
                                            }
                                            .buttonStyle(.plain)
                                            .accessibilityIdentifier("v2-remove-mailbox-\(box.service)")
                                            .accessibilityLabel("Remove \(box.label)")
                                        }
                                    }
                                    .padding(.horizontal, 12)
                                    .frame(minHeight: 56)
                                    .accessibilityIdentifier("v2-mailbox-\(box.service)")
                                }
                                Rectangle().fill(Theme.divider).frame(height: 1).padding(.leading, 46)
                                Button {
                                    showingAddProvider = true
                                } label: {
                                    HStack(spacing: 12) {
                                        Image(systemName: "plus.circle")
                                            .font(.system(size: 17, weight: .medium))
                                            .foregroundStyle(Theme.accent)
                                            .frame(width: 34, height: 34)
                                        Text("Add another account")
                                            .font(.hanken(15).weight(.semibold))
                                            .foregroundStyle(Theme.accent)
                                        Spacer(minLength: 8)
                                    }
                                    .padding(.horizontal, 12)
                                    .frame(minHeight: 52)
                                }
                                .buttonStyle(.plain)
                                .accessibilityIdentifier("v2-add-mailbox")
                            }
                        }
                        .background(Theme.raised2, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
                        .padding(.bottom, 18)
                    }
                    footnote
                }
                .padding(.horizontal, 16)
                .padding(.top, 4)
            }
        }
        .overlay(alignment: .top) {
            if let name = connect.justConnected {
                Text("Connected \(name)")
                    .font(.hanken(13).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 14).padding(.vertical, 9)
                    .background(Theme.raised2, in: Capsule())
                    .shadow(radius: 6, y: 2)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        Task {
                            try? await Task.sleep(nanoseconds: 2_500_000_000)
                            withAnimation { connect.justConnected = nil }
                        }
                    }
            }
        }
        .background(Theme.ground.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .task { await connect.loadIntegrations() }
        // Patrik 2026-09-15: "Instead of 'Add another Gmail account' it
        // should say 'Add another account', you pick the account" — a
        // provider picker comes first, then the existing name prompt.
        .confirmationDialog("Add another account", isPresented: $showingAddProvider, titleVisibility: .visible) {
            ForEach(v2ArcadeProviders) { provider in
                Button(provider.name) {
                    addMailboxProvider = provider
                    addMailboxLabel = ""
                    showingAddMailbox = true
                }
            }
            Button("Cancel", role: .cancel) { }
        }
        .alert("Add a \(addMailboxProvider.name) account", isPresented: $showingAddMailbox) {
            TextField("Name it (Work, Personal, hello@)", text: $addMailboxLabel)
            Button("Cancel", role: .cancel) { }
            Button("Connect") { connect.addAccount(provider: addMailboxProvider, label: addMailboxLabel) }
        } message: {
            Text("You'll sign in to that \(addMailboxProvider.name) account, then land right back here. The assistant will read it alongside your other accounts and name it when it answers.")
        }
    }

    // MARK: header

    private var header: some View {
        HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Image(systemName: "point.3.connected.trianglepath.dotted")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(Theme.accent)
                    Text("Connections")
                        .font(.hanken(20).weight(.bold))
                        .foregroundStyle(Theme.ink)
                }
                Text(subtitle)
                    .font(.hanken(13))
                    .foregroundStyle(Theme.inkSoft)
                Text("\(store.onCount) of \(store.total) on")
                    .font(.hanken(12).weight(.medium))
                    .foregroundStyle(Theme.inkFaint)
                    .padding(.top, 1)
                    .accessibilityIdentifier("v2-connections-summary")
            }
            Spacer(minLength: 0)
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-connections-close")
            .accessibilityLabel("Close connections")
        }
        .padding(.horizontal, 16)
        .padding(.top, 18)
        .padding(.bottom, 12)
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.hanken(10.5).weight(.semibold))
            .foregroundStyle(Theme.inkFaint)
            .padding(.bottom, 6)
            .padding(.leading, 2)
    }

    private func toolRow(_ tool: V2Tool) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(tool.tint.opacity(0.16))
                    .frame(width: 34, height: 34)
                Image(systemName: tool.icon)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(tool.tint)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(tool.name)
                    .font(.hanken(15).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                HStack(spacing: 5) {
                    Circle()
                        .fill(rowStatus(tool).dot)
                        .frame(width: 6, height: 6)
                    Text("\(rowStatus(tool).label) · \(rowDetail(tool))")
                        .font(.hanken(12))
                        .foregroundStyle(Theme.inkFaint)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 8)
            trailingControl(tool)
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 56)
    }

    /// A failed connect says *why* in the row instead of the generic detail
    /// (2026-09-13: "Needs attention" alone told Patrik nothing).
    private func rowDetail(_ tool: V2Tool) -> String {
        if let svc = tool.arcadeService, case .failed(let why) = connect.state(for: svc) {
            return why
        }
        return tool.detail
    }

    /// The live status: an Arcade tool reflects its connect state; everything
    /// else keeps its seeded status.
    private func rowStatus(_ tool: V2Tool) -> V2ToolStatus {
        guard let svc = tool.arcadeService else { return tool.status }
        switch connect.state(for: svc) {
        case .connected: return .connected
        case .failed: return .attention
        default: return tool.status // .available until connected
        }
    }

    /// Arcade tools show a Connect button until connected (then the allow
    /// toggle, like everything else). Non-Arcade tools keep the toggle.
    @ViewBuilder
    private func trailingControl(_ tool: V2Tool) -> some View {
        if let svc = tool.arcadeService, connect.state(for: svc) != .connected {
            switch connect.state(for: svc) {
            case .connecting:
                HStack(spacing: 6) {
                    ProgressView().controlSize(.small)
                    Text("Connecting…").font(.hanken(12.5)).foregroundStyle(Theme.inkFaint)
                }
            default:
                Button {
                    connect.connect(service: svc)
                } label: {
                    Text(isFailed(svc) ? "Retry" : "Connect")
                        .font(.hanken(13).weight(.semibold))
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 14)
                        .frame(height: 30)
                        .background(Theme.accent, in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("v2-connections-connect-\(svc)")
                .accessibilityLabel("Connect \(tool.name)")
            }
        } else {
            Toggle("", isOn: Binding(
                get: { store.isOn(tool.id) },
                set: { store.setOn(tool.id, $0) }
            ))
            .labelsHidden()
            .tint(Theme.accent)
            .accessibilityIdentifier("v2-connections-toggle-\(tool.id)")
            .accessibilityLabel("\(tool.name), \(store.isOn(tool.id) ? "on" : "off")")
        }
    }

    private func isFailed(_ svc: String) -> Bool {
        if case .failed = connect.state(for: svc) { return true }
        return false
    }

    private var footnote: some View {
        Text("Off means this agent may not reach the tool. The dot shows what's actually connected right now.")
            .font(.hanken(11.5))
            .foregroundStyle(Theme.inkFaint)
            .padding(.horizontal, 4)
            .padding(.bottom, 24)
    }
}

// MARK: - Entry button

/// The connection icon that opens the panel — one control for both the drawer
/// footer (global) and the chat nav (per-room). Sizes to the 44pt nav target by
/// default; the drawer footer passes a tighter size.
struct V2ConnectionsButton: View {
    var size: CGFloat = 44
    var glyphSize: CGFloat = 20
    /// Distinct per placement so a UI test can address the room vs the menu
    /// button unambiguously (both share the glyph and the panel).
    var identifier: String = "v2-connections-button"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "point.3.connected.trianglepath.dotted")
                .font(.system(size: glyphSize, weight: .regular))
                .foregroundStyle(Theme.inkSoft)
                .frame(width: size, height: size)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(identifier)
        .accessibilityLabel("Agent connections")
    }
}
