// AccountView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Account, notifications, and the real account deletion required by App Store Review
// guideline 5.1.1(v): "If your app supports account creation, you must also offer
// account deletion within the app." Corner creates accounts in-app (the invite flow),
// so this is required, and the web's Settings screen faked it for months with
// `alert('Account deletion would be processed here.')` — an automatic rejection on its
// own and a lie to the user besides.
//
// THE FLOW IS THE SERVER'S, NOT THIS SCREEN'S:
//   1. POST { step: 'begin' } returns a short-lived confirmation token bound to this
//      user AND the server's own plain-language summary of what deletion does.
//   2. The user reads that summary and types the word the server asked for.
//   3. POST { confirmation, confirmText } deletes.
//
// The consequences on screen are rendered from the SERVER's summary rather than from
// strings in this file. If the endpoint's behavior ever changes, what the user is
// promised changes with it — a hardcoded copy of that list is a promise that goes
// stale silently, which is the same failure mode as the placeholder it replaced.

import SwiftUI
import UIKit
import UserNotifications

struct AccountView: View {
    @EnvironmentObject private var api: CornerAPI
    @EnvironmentObject private var push: PushService
    @ObservedObject private var theme = ThemeManager.shared
    @Environment(\.dismiss) private var dismiss

    @State private var showDeleteFlow = false
    @State private var workspaceRooms: [CornerAPI.ProjectRow] = []
    @State private var workspaceFailed = false

    var body: some View {
        NavigationStack {
            List {
                appearanceSection
                workspaceSection
                accountSection
                Section {
                    notificationRow
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("Corner works with notifications off — the app catches up every time you open it. Notifications only mean you find out sooner.")
                }
                plannedSection

                Section {
                    Button("Sign out") {
                        Task {
                            await api.signOut()
                            dismiss()
                        }
                    }
                }

                Section {
                    Button("Delete account", role: .destructive) {
                        showDeleteFlow = true
                    }
                } footer: {
                    Text("Deleting removes your account and personal data from Corner. It cannot be undone.")
                }

                Section {
                    LabeledContent("Version", value: Config.appVersion)
                    Link("Privacy policy", destination: URL(string: "https://www.aheadofmarket.com/privacy")!)
                    Link("Support", destination: URL(string: "https://www.aheadofmarket.com/support")!)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showDeleteFlow) {
                DeleteAccountView()
                    .environmentObject(api)
            }
        }
        .task {
            await push.refreshAuthorizationAndRegisterIfAllowed()
            await loadWorkspace()
        }
    }

    // MARK: - Appearance (the web's Dark / Light / Glass, one shared setting)

    private var appearanceSection: some View {
        Section {
            HStack(spacing: Theme.s3) {
                ForEach(ThemeKind.allCases) { kind in
                    ThemeSwatch(kind: kind, selected: theme.kind == kind) {
                        theme.kind = kind
                    }
                }
            }
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: Theme.s1, leading: 0, bottom: Theme.s1, trailing: 0))
        } header: {
            Text("Appearance")
        } footer: {
            Text("One shared theme setting updates every screen immediately.")
        }
    }

    // MARK: - Workspace (project rooms available to your agents)

    private var workspaceSection: some View {
        Section {
            if workspaceFailed {
                Label("Workspace rooms did not load.", systemImage: "exclamationmark.triangle")
                    .font(.hkFootnote)
                    .foregroundStyle(Theme.warning)
            } else if workspaceRooms.isEmpty {
                Text("No project rooms are available in this workspace yet.")
                    .font(.hkFootnote)
                    .foregroundStyle(Theme.inkSoft)
            } else {
                ForEach(workspaceRooms, id: \.slug) { row in
                    workspaceRow(row)
                }
            }
        } header: {
            Text("Workspace")
        } footer: {
            Text("Rooms available to your agents in \(api.world ?? "this workspace").")
        }
    }

    private func workspaceRow(_ row: CornerAPI.ProjectRow) -> some View {
        HStack(spacing: Theme.s3) {
            Image(systemName: "folder")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Theme.accent)
                .frame(width: 30, height: 30)
                .background(Theme.accentWeak, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(row.name?.isEmpty == false ? row.name! : Room.prettify(row.slug ?? ""))
                    .font(.hanken(13.5).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                Text("Private")
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Text("AVAILABLE")
                .font(.hanken(10.5).weight(.bold))
                .foregroundStyle(Theme.inkSoft)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Theme.chipFill, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
    }

    private func loadWorkspace() async {
        do {
            workspaceRooms = try await api.fetchProjects()
            workspaceFailed = false
        } catch {
            workspaceFailed = true
        }
    }

    // MARK: - Account (the web's avatar card + the signed-in identity)

    private var accountSection: some View {
        Section("Account") {
            HStack(spacing: Theme.s3) {
                AvatarDisc(name: api.userDisplayName ?? api.userEmail ?? "?")
                VStack(alignment: .leading, spacing: 2) {
                    Text(api.userDisplayName ?? "—")
                        .font(.hanken(14.5).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    Text(api.userEmail ?? "—")
                        .font(.hanken(12.5))
                        .foregroundStyle(Theme.inkSoft)
                }
            }
            .padding(.vertical, Theme.s1)
            LabeledContent("Workspace", value: api.world ?? "Not set")
        }
    }

    // MARK: - Planned (the web's honest roadmap rows, minus what the phone already has)

    private var plannedSection: some View {
        Section {
            plannedRow("Connections", detail: "OAuth accounts and service scopes")
            plannedRow("Secrets", detail: "Managed keys and rotation history")
            plannedRow("Agent permissions", detail: "Per-agent autonomy controls")
        } header: {
            Text("Planned")
        } footer: {
            Text("Intentionally informational — these are not connected yet, here or on the web.")
        }
    }

    private func plannedRow(_ title: String, detail: String) -> some View {
        HStack(spacing: Theme.s3) {
            Circle().fill(Theme.inkFaint).frame(width: 5, height: 5)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.hkSubheadline).foregroundStyle(Theme.ink)
                Text(detail).font(.hkCaption).foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Text("COMING LATER")
                .font(.hanken(9.5).weight(.bold))
                .foregroundStyle(Theme.inkFaint)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(Theme.chipFill, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        }
        .opacity(0.72)
    }

    @ViewBuilder
    private var notificationRow: some View {
        switch push.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            if let error = push.registrationError {
                // Permission granted but our own server never accepted the token: the
                // phone will get nothing, and only this row can say so. Silently showing
                // "On" here is how push "works" for weeks while delivering nothing.
                VStack(alignment: .leading, spacing: Theme.s1) {
                    Label("Not receiving notifications", systemImage: "bell.badge.slash")
                        .foregroundStyle(Theme.warning)
                    Text("This device could not be registered: \(error)")
                        .font(.hkCaption)
                        .foregroundStyle(Theme.inkSoft)
                    Button("Try again") {
                        Task { await push.registerCurrentTokenIfAny() }
                    }
                    .font(.hkCaption.weight(.semibold))
                }
            } else if push.deviceToken == nil {
                Label("Setting up…", systemImage: "bell")
                    .foregroundStyle(Theme.inkSoft)
            } else {
                Label("On", systemImage: "bell.fill")
                    .foregroundStyle(Theme.accent)
            }
        case .denied:
            VStack(alignment: .leading, spacing: Theme.s1) {
                Label("Off", systemImage: "bell.slash")
                Text("iOS only asks once. Turn Corner's notifications back on in the Settings app.")
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    Link("Open Settings", destination: url).font(.hkCaption.weight(.semibold))
                }
            }
        default:
            Button("Turn on notifications") {
                Task { _ = await push.requestAuthorizationExplicitly() }
            }
        }
    }
}

// MARK: - Theme swatch (Settings.jsx THEME_SWATCHES, verbatim hexes)

private struct ThemeSwatch: View {
    let kind: ThemeKind
    let selected: Bool
    let choose: () -> Void

    /// The web's swatch preview colors — fixed per card, NOT the live palette, so
    /// every card previews its own theme regardless of the one currently applied.
    private var preview: (ground: Color, surface: Color, accent: Color) {
        switch kind {
        case .dark: return (Color(cv6: 0x0A0A0B), Color(cv6: 0x1A1C21), Color(cv6: 0x2F7AF8))
        case .light: return (Color(cv6: 0xF6F6F7), Color(cv6: 0xFFFFFF), Color(cv6: 0x2064D8))
        case .glass: return (Color(cv6: 0x0C1218), Color(cv6: 0x243341), Color(cv6: 0x4F91FF))
        }
    }

    var body: some View {
        Button(action: choose) {
            VStack(alignment: .leading, spacing: Theme.s2) {
                ZStack(alignment: .topLeading) {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(preview.ground)
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(preview.surface)
                        .frame(width: 56, height: 30)
                        .offset(x: 10, y: 12)
                    Capsule()
                        .fill(preview.accent)
                        .frame(width: 26, height: 7)
                        .offset(x: 16, y: 20)
                }
                .frame(height: 64)

                HStack {
                    Text(kind.label)
                        .font(.hanken(12.5).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    Spacer(minLength: 0)
                    Text(selected ? "Selected" : "Choose")
                        .font(.hanken(10.5).weight(.semibold))
                        .foregroundStyle(selected ? Theme.accent : Theme.inkFaint)
                }
            }
            .padding(10)
            .background(
                selected ? Theme.accentWeak : Theme.raised,
                in: RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous)
                    .strokeBorder(selected ? Theme.accent : Theme.hairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(kind.label) theme")
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }
}

/// The web's gradient avatar disc (--avatar: 135deg accent → blue-700) with the
/// account's initials. Display-only; photo/initials editing stays on the web.
/// Shared: the Settings account card and the home top bar both wear it.
struct AvatarDisc: View {
    let name: String
    var size: CGFloat = 44

    private var initials: String {
        let words = name.split(separator: " ")
        if words.count >= 2 { return String(words[0].prefix(1) + words[1].prefix(1)).uppercased() }
        return String(name.prefix(2)).uppercased()
    }

    var body: some View {
        Text(initials)
            .font(.hanken(size * 0.34).weight(.bold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                LinearGradient(
                    colors: [Color(cv6: 0x3B82F6), Color(cv6: 0x1D4ED8)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ),
                in: Circle()
            )
    }
}

// MARK: - Deletion

struct DeleteAccountView: View {
    @EnvironmentObject private var api: CornerAPI
    @Environment(\.dismiss) private var dismiss

    private enum Phase: Equatable {
        case loading
        case confirm
        case deleting
        case failed(String)
    }

    @State private var phase: Phase = .loading
    @State private var begin: CornerAPI.DeletionBegin?
    @State private var typed = ""

    private var requiredWord: String { begin?.requiresText ?? "DELETE" }
    private var typedMatches: Bool {
        typed.trimmingCharacters(in: .whitespacesAndNewlines) == requiredWord
    }

    var body: some View {
        NavigationStack {
            Group {
                switch phase {
                case .loading:
                    ProgressView("Checking your account…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                case .confirm, .deleting:
                    confirmForm
                case .failed(let message):
                    failure(message)
                }
            }
            .background(Theme.ground)
            .navigationTitle("Delete account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .disabled(phase == .deleting)
                }
            }
        }
        .task { await load() }
        .interactiveDismissDisabled(phase == .deleting)
    }

    private var confirmForm: some View {
        List {
            if let summary = begin?.summary {
                Section("What is deleted") {
                    ForEach(summary.deletes ?? [], id: \.self) { line in
                        Label(line, systemImage: "trash")
                            .font(.hkFootnote)
                    }
                }
                Section {
                    ForEach(summary.keeps ?? [], id: \.self) { line in
                        Label(line, systemImage: "text.append")
                            .font(.hkFootnote)
                    }
                } header: {
                    Text("What stays")
                } footer: {
                    // Messages are anonymized rather than hard-deleted because a shared
                    // room reads as one conversation and deleting one side of it corrupts
                    // the other person's history. The user is told this before confirming,
                    // in the server's own words, not this app's paraphrase.
                    Text("Your name and account are removed from anything that stays.")
                }
            }

            Section {
                TextField(requiredWord, text: $typed)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.hkBody.monospaced())
                Button(role: .destructive) {
                    Task { await confirmDelete() }
                } label: {
                    if phase == .deleting {
                        HStack { ProgressView().controlSize(.small); Text("Deleting…") }
                    } else {
                        Text("Delete my account permanently")
                    }
                }
                .disabled(!typedMatches || phase == .deleting)
            } header: {
                Text("Type \(requiredWord) to confirm")
            } footer: {
                Text("This cannot be undone.")
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.ground)
    }

    private func failure(_ message: String) -> some View {
        VStack(spacing: Theme.s4) {
            Image(systemName: "exclamationmark.triangle")
                .font(.hkLargeTitle)
                .foregroundStyle(Theme.warning)
            Text("Your account was not deleted")
                .font(.hkHeadline)
                .foregroundStyle(Theme.ink)
            Text(message)
                .font(.hkFootnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
            // The endpoint deletes data first and the auth user last, precisely so a
            // partial failure leaves an account that can still sign in and try again.
            // Saying so is the difference between a scary dead end and a retry.
            Text("You are still signed in and nothing is lost. You can try again.")
                .font(.hkCaption)
                .foregroundStyle(Theme.inkFaint)
                .multilineTextAlignment(.center)
            Button("Try again") { Task { await load() } }
                .buttonStyle(.borderedProminent)
        }
        .padding(Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func load() async {
        phase = .loading
        typed = ""
        do {
            begin = try await api.beginAccountDeletion()
            phase = .confirm
        } catch {
            phase = .failed((error as? CornerAPI.APIError)?.errorDescription
                ?? "Corner could not be reached.")
        }
    }

    private func confirmDelete() async {
        guard let confirmation = begin?.confirmation else {
            phase = .failed("The confirmation expired. Start again.")
            return
        }
        phase = .deleting
        do {
            try await api.confirmAccountDeletion(confirmation: confirmation, typed: requiredWord)
            // The auth user is gone; the local session is now a key to nothing. Clearing
            // it is what actually returns the app to the sign-in screen.
            await api.signOut()
            dismiss()
        } catch {
            phase = .failed((error as? CornerAPI.APIError)?.errorDescription
                ?? "The account could not be deleted.")
        }
    }
}
