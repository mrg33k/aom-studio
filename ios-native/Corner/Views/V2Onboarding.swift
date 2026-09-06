// V2Onboarding.swift — Corner native iOS
// corner:corner-v2 R17 (P061–P062).
//
// The phone Setup flow (§5) and Empty home: 6 steps with progress segments,
// 50px Continue/Take-me-to-Corner CTAs and Skip; the empty home with its two
// CTAs and the sample link. Copy follows HANDOFF §5 and the phone export.
//
// Honest-data rules: Look drives ThemeManager (real); step 6 creates the
// project for real (v2Projects:createProject) and stashes the goal as the
// new thread's composer draft; Invite reads/writes the real invites table
// (admin-gated server-side); Connect states come from the arcade table when
// a real backend is in play. Anything the server cannot do yet says so
// inline instead of faking it.

import SwiftUI
import UIKit

// MARK: - stores

/// Setup completion. Migration-safe: devices that already opened a room
/// (legacy `navigation.lastRoomID`) never see the flow unprompted.
@MainActor
final class V2SetupStore: ObservableObject {
    static let shared = V2SetupStore()
    private static let key = "corner.v2.setup-done"

    var isDone: Bool {
        get { UserDefaults.standard.bool(forKey: Self.key) }
        set { UserDefaults.standard.set(newValue, forKey: Self.key) }
    }

    /// Escape hatches: -v2SkipSetup for real-backend suites, and fixture mode
    /// itself — hermetic tests meet the signed-in app directly, never the
    /// first-run flow.
    static var suppressed: Bool {
        let args = ProcessInfo.processInfo.arguments
        return args.contains("-v2SkipSetup") || args.contains("-v2FixtureUITest")
    }

    static var needsSetup: Bool {
        guard !suppressed, !shared.isDone else { return false }
        return UserDefaults.standard.string(forKey: "navigation.lastRoomID") == nil
    }

    func reset() { isDone = false }
}

/// Act-without-asking toggles, shared by Setup step 4 and Settings.
/// Local-only, like the desktop this round ("toggles are not saved").
@MainActor
final class V2PermissionsStore: ObservableObject {
    static let shared = V2PermissionsStore()
    private static let key = "corner.v2.permissions"

    @Published var draft = true
    @Published var file = true
    @Published var send = false
    @Published var publish = false

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.key),
           let saved = try? JSONDecoder().decode([String: Bool].self, from: data) {
            draft = saved["draft"] ?? true
            file = saved["file"] ?? true
            send = saved["send"] ?? false
            publish = saved["publish"] ?? false
        }
    }

    func save() {
        let saved = ["draft": draft, "file": file, "send": send, "publish": publish]
        if let data = try? JSONEncoder().encode(saved) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }
}

/// The step-6 goal, delivered as the new thread's composer draft (consumed
/// once by ChatView). No surprise sends: the user reviews and taps send.
@MainActor
enum V2DraftStore {
    private static func key(_ threadID: String) -> String { "corner.v2.pending-draft.\(threadID)" }

    static func stash(_ text: String, threadID: String) {
        UserDefaults.standard.set(text, forKey: key(threadID))
    }

    static func take(threadID: String) -> String? {
        let k = key(threadID)
        let text = UserDefaults.standard.string(forKey: k)
        UserDefaults.standard.removeObject(forKey: k)
        return (text?.isEmpty == false) ? text : nil
    }
}

// MARK: - setup

/// The 6-step phone setup. Steps 2–5 follow HANDOFF §5 (the rail only shows
/// steps 1 and 6, so the prose is the truth for the middle steps).
struct V2SetupView: View {
    @EnvironmentObject private var router: AppRouter
    @ObservedObject private var v2 = WorkspaceStore.shared
    @State private var step: Int
    @State private var skipped = false
    var onDone: () -> Void = {}

    init(initialStep: Int = 0, onDone: @escaping () -> Void = {}) {
        _step = State(initialValue: min(max(initialStep, 0), 5))
        self.onDone = onDone
    }

    var body: some View {
        VStack(spacing: 0) {
            logoRow
            stepRow
            segments
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    stepContent
                }
                .padding(.horizontal, 19)
            }
            bottomCTA
        }
        .groundBackground()
        // NOTE: leaf marker, not a container id (same finding as chat-screen).
        .overlay {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("v2-setup")
        }
    }

    private var logoRow: some View {
        HStack(spacing: 8) {
            Image("CornerLogo")
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .frame(width: 24, height: 24)
                .foregroundStyle(Theme.ink)
            Text("Corner")
                .font(.hanken(19).weight(.bold))
                .foregroundStyle(Theme.ink)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 21)
        .padding(.top, 12)
        .accessibilityHidden(true)
    }

    private var stepRow: some View {
        HStack(spacing: 8) {
            if step > 0 {
                Button { step -= 1 } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.inkSoft)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("v2-setup-back")
                .accessibilityLabel("Back")
            }
            Text("Step \(step + 1) of 6")
                .font(.hanken(12))
                .foregroundStyle(Theme.inkFaint)
                .accessibilityIdentifier("v2-setup-step")
            Spacer(minLength: 0)
            Button { finish(skipped: true) } label: {
                Text("Skip")
                    .font(.hanken(13))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(height: 32)
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("v2-setup-skip")
            .accessibilityLabel("Skip setup")
        }
        .padding(.horizontal, 13)
        .padding(.top, 4)
    }

    private var segments: some View {
        HStack(spacing: 6) {
            ForEach(0..<6, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(i <= step ? Theme.accent : Color.white.opacity(0.12))
                    .frame(height: 3)
            }
        }
        .padding(.horizontal, 21)
        .padding(.top, 8)
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private var stepContent: some View {
        switch step {
        case 0: V2SetupConnect()
        case 1: V2SetupImport()
        case 2: V2SetupInvite()
        case 3: V2SetupPermissions()
        case 4: V2SetupLook()
        default: V2SetupFirstProject(onFinish: { finish(skipped: false) })
        }
    }

    @ViewBuilder
    private var bottomCTA: some View {
        // Step 6 owns its CTA (it needs the project name to create it).
        if step < 5 {
            Button("Continue") { step += 1 }
                .font(.hanken(15).weight(.semibold))
                .foregroundStyle(Color.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Theme.accent, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .buttonStyle(.plain)
                .padding(.horizontal, 21)
                .padding(.top, 12)
                .padding(.bottom, 8)
                .accessibilityIdentifier("v2-setup-continue")
        }
    }

    private func finish(skipped: Bool) {
        V2SetupStore.shared.isDone = true
        onDone()
    }
}

/// Setup headlines, shared by every step.
private struct V2SetupHead: View {
    let title: String
    let sub: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.hanken(22).weight(.bold))
                .foregroundStyle(Theme.ink)
                .padding(.top, 16)
                .accessibilityIdentifier("v2-setup-headline")
            Text(sub)
                .font(.hanken(14))
                .foregroundStyle(Theme.inkSoft)
                .padding(.top, 6)
        }
    }
}

// MARK: - step 1 · Connect

/// The five §5 connections. States are real (arcade table, real backend);
/// OAuth itself lives on the web, and the footnote says so.
private struct V2SetupConnect: View {
    @EnvironmentObject private var api: CornerAPI
    @StateObject private var connections = V2ConnectionsStore()
    @State private var noticeShown = false

    private let services: [(name: String, icon: String)] = [
        ("Gmail", "envelope.fill"),
        ("Drive", "folder.fill"),
        ("Figma", "pen.ruler.fill"),
        ("Slack", "number.square.fill"),
        ("GitHub", "chevron.left.forwardslash.chevron.right"),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            V2SetupHead(
                title: "Connect what your work lives in.",
                sub: "Email, files, design. Corner reads only what you scope to a project."
            )
            ForEach(services, id: \.name) { service in
                connectRow(service.name, icon: service.icon)
            }
            .padding(.top, 12)
            if noticeShown {
                Text("To connect, open Corner on the web — the app can't do OAuth yet.")
                    .font(.hanken(13))
                    .foregroundStyle(Theme.warning)
                    .padding(.top, 8)
                    .accessibilityIdentifier("v2-setup-connect-note")
            }
        }
        .task {
            await connections.load(userID: api.session?.user.id)
        }
    }

    private func integration(for service: String) -> V2IntegrationRow? {
        connections.rows.first {
            ($0.service ?? "").lowercased().contains(service.lowercased())
        }
    }

    private func connectRow(_ service: String, icon: String) -> some View {
        let row = integration(for: service)
        let connected = (row?.status ?? "").lowercased().contains("connect")
            || (row?.status ?? "").lowercased() == "active"
        return HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Theme.inkSoft)
                .frame(width: 29, height: 29)
            VStack(alignment: .leading, spacing: 2) {
                Text(service)
                    .font(.hanken(15).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                Text(connected ? (row?.service ?? service) : "Not connected")
                    .font(.hanken(12.5))
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            if connected {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(Theme.success)
                    Text("Connected")
                        .font(.hanken(13.5))
                        .foregroundStyle(Theme.ink)
                }
            } else {
                Button { noticeShown = true } label: {
                    Text("Connect")
                        .font(.hanken(13.5).weight(.semibold))
                        .foregroundStyle(Theme.accent)
                        .frame(width: 83.6, height: 36)
                        .overlay(
                            RoundedRectangle(cornerRadius: 9, style: .continuous)
                                .strokeBorder(Theme.hairline, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .frame(minHeight: 68)
        .accessibilityIdentifier("v2-setup-connect-\(service.lowercased())")
        .accessibilityLabel("\(service), \(connected ? "connected" : "not connected")")
    }
}

// MARK: - step 2 · Import

/// Copy-prompt + paste + word-count summary (the desktop heuristic, local).
private struct V2SetupImport: View {
    @State private var pasted = ""
    @State private var copied = false

    /// The prompt the desktop Import step copies — static helper copy.
    static let importPrompt =
        "Summarize the projects you know about me: each client's name, what we made, and where things stand. Plain text, no preamble."

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            V2SetupHead(
                title: "Bring in your context.",
                sub: "Paste what another assistant knew about you. Corner counts the words and gets to work."
            )
            Button {
                UIPasteboard.general.string = Self.importPrompt
                copied = true
            } label: {
                Text(copied ? "Copied" : "Copy the import prompt")
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.accent)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(Theme.hairline, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
            .padding(.top, 16)
            .accessibilityIdentifier("v2-setup-import-copy")
            TextEditor(text: $pasted)
                .font(.hanken(15))
                .foregroundStyle(Theme.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 120)
                .padding(8)
                .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                .padding(.top, 12)
                .accessibilityIdentifier("v2-setup-import-paste")
                .accessibilityLabel("Paste prior context")
            if !pasted.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text("\(wordCount) words — Corner will fold this into your first project.")
                    .font(.hanken(13))
                    .foregroundStyle(Theme.inkSoft)
                    .padding(.top, 8)
                    .accessibilityIdentifier("v2-setup-import-summary")
            }
        }
    }

    private var wordCount: Int {
        pasted.split { $0.isWhitespace || $0.isNewline }.count
    }
}

// MARK: - step 3 · Invite

/// Real invites (convex/invites.ts, admin-gated server-side).
private struct V2SetupInvite: View {
    @ObservedObject private var v2 = WorkspaceStore.shared
    @State private var email = ""
    @State private var rows: [(email: String, url: String)] = []
    @State private var busy = false
    @State private var errorText: String?
    @State private var copiedEmail: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            V2SetupHead(
                title: "Invite your team.",
                sub: "Teammates land in this workspace with a link. Only admins can invite."
            )
            HStack(spacing: 8) {
                TextField("", text: $email, prompt: Text("teammate@studio.com").font(.hanken(15)).foregroundStyle(Theme.inkFaint))
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.hanken(15))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 16)
                    .frame(height: 50)
                    .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                    .accessibilityIdentifier("v2-setup-invite-field")
                    .accessibilityLabel("Invite email")
                Button {
                    Task { await invite() }
                } label: {
                    Text("Add")
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(Color.white)
                        .frame(width: 72, height: 50)
                        .background(Theme.accent, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(busy || !email.contains("@"))
                .accessibilityIdentifier("v2-setup-invite-add")
            }
            .padding(.top, 16)
            ForEach(rows, id: \.email) { row in
                HStack(spacing: 8) {
                    Text(row.email)
                        .font(.hanken(14))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    Button {
                        if row.url.hasPrefix("http") {
                            UIPasteboard.general.string = row.url
                            copiedEmail = row.email
                        } else {
                            errorText = "That invite link opens on the web."
                        }
                    } label: {
                        Text(copiedEmail == row.email ? "Copied" : "Copy link")
                            .font(.hanken(13.5).weight(.semibold))
                            .foregroundStyle(Theme.accent)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("v2-setup-invite-link")
                }
                .frame(minHeight: 44)
            }
            if let errorText {
                Text(errorText)
                    .font(.hanken(13))
                    .foregroundStyle(Theme.warning)
                    .padding(.top, 8)
                    .accessibilityIdentifier("v2-setup-invite-error")
            }
        }
        .task { await refresh() }
    }

    private struct CreatedInvite: Decodable {
        var email: String
        var url: String
    }

    private struct ListedInvite: Decodable {
        var email: String
    }

    private func invite() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            guard let workspaceID = v2.workspace?.id else {
                errorText = "The workspace isn't loaded yet."
                return
            }
            let created: CreatedInvite = try await ConvexService.shared.mutationWithResult(
                "invites:create",
                args: ["worldId": workspaceID, "email": email.trimmingCharacters(in: .whitespaces)]
            )
            email = ""
            errorText = nil
            await refresh(adding: (created.email, created.url))
        } catch {
            errorText = "Couldn't invite that address."
        }
    }

    private func refresh(adding: (email: String, url: String)? = nil) async {
        if let adding, !rows.contains(where: { $0.email == adding.email }) {
            rows.append(adding)
        }
        guard let workspaceID = v2.workspace?.id else { return }
        if let listed: [ListedInvite] = try? await ConvexService.shared.query(
            "invites:list", args: ["worldId": workspaceID]
        ) {
            for item in listed where !rows.contains(where: { $0.email == item.email }) {
                rows.append((item.email, ""))
            }
        }
    }
}

// MARK: - step 4 · Permissions

private struct V2SetupPermissions: View {
    @ObservedObject private var perms = V2PermissionsStore.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            V2SetupHead(
                title: "What Corner may do alone.",
                sub: "Stored on this device. You can change these later in Settings."
            )
            permRow("Draft", "Write copy and lay out pages", $perms.draft)
            permRow("File", "Move and rename project files", $perms.file)
            permRow("Send", "Email a client directly", $perms.send)
            permRow("Publish", "Push a site live", $perms.publish)
        }
        .onChange(of: perms.draft) { _, _ in perms.save() }
        .onChange(of: perms.file) { _, _ in perms.save() }
        .onChange(of: perms.send) { _, _ in perms.save() }
        .onChange(of: perms.publish) { _, _ in perms.save() }
    }

    private func permRow(_ title: String, _ detail: String, _ on: Binding<Bool>) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.hanken(15).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                Text(detail)
                    .font(.hanken(12.5))
                    .foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Toggle("", isOn: on)
                .labelsHidden()
                .tint(Theme.accent)
                .accessibilityIdentifier("v2-setup-perm-\(title.lowercased())")
                .accessibilityLabel("\(title) permission")
        }
        .frame(minHeight: 68)
    }
}

// MARK: - step 5 · Look

private struct V2SetupLook: View {
    @ObservedObject private var theme = ThemeManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            V2SetupHead(
                title: "Make it yours.",
                sub: "One shared theme — every screen updates immediately. Change it later in Settings."
            )
            ForEach(ThemeKind.allCases) { kind in
                Button {
                    theme.kind = kind
                } label: {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(kind == .light ? Color.white : kind == .glass ? Color(cv6: 0x5B9BFF) : Color(cv6: 0x0F1319))
                            .frame(width: 22, height: 22)
                            .overlay(Circle().strokeBorder(Theme.hairline, lineWidth: 1))
                        Text(kind.label)
                            .font(.hanken(15).weight(.semibold))
                            .foregroundStyle(Theme.ink)
                        Spacer(minLength: 0)
                        if theme.kind == kind {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 20, weight: .regular))
                                .foregroundStyle(Theme.success)
                        }
                    }
                    .padding(.horizontal, 16)
                    .frame(maxWidth: .infinity, minHeight: 57, alignment: .leading)
                    .background(Theme.raised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.top, 8)
                .accessibilityIdentifier("v2-setup-look-\(kind.rawValue)")
                .accessibilityLabel("\(kind.label) theme")
            }
        }
    }
}

// MARK: - step 6 · First project

/// Names the client, stages the goal as the new thread's draft, and creates
/// the project for real. Empty name = enter without creating.
private struct V2SetupFirstProject: View {
    @EnvironmentObject private var router: AppRouter
    @ObservedObject private var v2 = WorkspaceStore.shared
    @State private var name = ""
    @State private var goal = ""
    @State private var busy = false
    @State private var errorText: String?
    var onFinish: () -> Void = {}

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            V2SetupHead(
                title: "Start with a project.",
                sub: "Name the client, say the first thing to make. Corner asks two questions, then works."
            )
            Text("Client or project")
                .font(.hanken(12).weight(.semibold))
                .foregroundStyle(Theme.inkSoft)
                .padding(.top, 16)
            TextField("", text: $name, prompt: Text("e.g. Harbor Coffee").font(.hanken(15)).foregroundStyle(Theme.inkFaint))
                .font(.hanken(15))
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 16)
                .frame(height: 50)
                .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                .padding(.top, 6)
                .accessibilityIdentifier("v2-setup-name")
                .accessibilityLabel("Client or project")
            Text("The first thing to make")
                .font(.hanken(12).weight(.semibold))
                .foregroundStyle(Theme.inkSoft)
                .padding(.top, 12)
            TextEditor(text: $goal)
                .font(.hanken(15))
                .foregroundStyle(Theme.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 96)
                .padding(8)
                .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                .padding(.top, 6)
                .accessibilityIdentifier("v2-setup-goal")
                .accessibilityLabel("The first thing to make")
            if let errorText {
                Text(errorText)
                    .font(.hanken(13))
                    .foregroundStyle(Theme.warning)
                    .padding(.top, 8)
                    .accessibilityIdentifier("v2-setup-error")
            }
            Spacer(minLength: 24)
            Rectangle().fill(Theme.divider).frame(height: 1)
            Button("Take me to Corner") {
                Task { await finish() }
            }
            .font(.hanken(15).weight(.semibold))
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Theme.accent.opacity(busy ? 0.5 : 1), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .buttonStyle(.plain)
            .disabled(busy)
            .padding(.top, 12)
            .padding(.bottom, 8)
            .accessibilityIdentifier("v2-setup-finish")
        }
    }

    private struct CreatedProject: Decodable {
        var projectId: String
        var threadId: String
    }

    private func finish() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            onFinish()
            return
        }
        do {
            guard let workspaceID = v2.workspace?.id else {
                errorText = "The workspace isn't loaded yet."
                return
            }
            let created: CreatedProject = try await ConvexService.shared.mutationWithResult(
                "v2Projects:createProject",
                args: ["workspaceId": workspaceID, "name": trimmed]
            )
            let staged = goal.trimmingCharacters(in: .whitespacesAndNewlines)
            if !staged.isEmpty {
                V2DraftStore.stash(staged, threadID: created.threadId)
            }
            await v2.refresh()
            onFinish()
            router.open(.project(projectID: created.projectId))
        } catch {
            errorText = "Couldn't create that project."
        }
    }
}

// MARK: - empty home

/// The no-projects home: logo + avatar, the 24px headline, the two CTAs,
/// and the sample link. Shown when the workspace holds no real projects.
struct V2EmptyHomeView: View {
    @EnvironmentObject private var router: AppRouter
    @State private var notice: String?
    var onStartProject: () -> Void = {}
    var onBringContext: () -> Void = {}

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image("CornerLogo")
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 24, height: 24)
                    .foregroundStyle(Theme.ink)
                Text("Corner")
                    .font(.hanken(19).weight(.bold))
                    .foregroundStyle(Theme.ink)
                Spacer(minLength: 0)
                Button { router.showingSettings = true } label: {
                    Text("P")
                        .font(.hanken(12).weight(.bold))
                        .foregroundStyle(Color.white)
                        .frame(width: 32, height: 32)
                        .background(Theme.avatarGradient, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("v2-empty-avatar")
                .accessibilityLabel("Settings")
            }
            .padding(.horizontal, 21)
            .padding(.top, 12)
            Spacer().frame(height: 150)
            VStack(alignment: .leading, spacing: 0) {
                Text("Let's get started.")
                    .font(.hanken(24).weight(.bold))
                    .foregroundStyle(Theme.ink)
                    .accessibilityIdentifier("v2-empty-headline")
                Text("Start a project and say what you want made. Corner asks two questions, then gets to work.")
                    .font(.hanken(14.5))
                    .foregroundStyle(Theme.inkSoft)
                    .padding(.top, 8)
                Button("Start a project") { onStartProject() }
                    .font(.hanken(16).weight(.semibold))
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Theme.accent, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .buttonStyle(.plain)
                    .padding(.top, 16)
                    .accessibilityIdentifier("v2-empty-start")
                Button("Bring in my context") { onBringContext() }
                    .font(.hanken(16).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .buttonStyle(.plain)
                    .padding(.top, 8)
                    .accessibilityIdentifier("v2-empty-context")
                Button("Look at a sample workspace") {
                    notice = "There is no sample workspace on this server yet."
                }
                .font(.hanken(14).weight(.medium))
                .foregroundStyle(Theme.inkSoft)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .buttonStyle(.plain)
                .padding(.top, 4)
                .accessibilityIdentifier("v2-empty-sample")
                if let notice {
                    Text(notice)
                        .font(.hanken(13))
                        .foregroundStyle(Theme.warning)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 4)
                        .accessibilityIdentifier("v2-empty-notice")
                }
            }
            .padding(.horizontal, 21)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .groundBackground()
        // NOTE: leaf marker, not a container id (same finding as chat-screen).
        .overlay {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("v2-empty")
        }
    }
}
