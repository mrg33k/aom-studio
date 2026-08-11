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
    @Environment(\.dismiss) private var dismiss

    @State private var showDeleteFlow = false

    var body: some View {
        NavigationStack {
            List {
                Section("Signed in") {
                    LabeledContent("Email", value: api.userEmail ?? "—")
                    if let name = api.userDisplayName {
                        LabeledContent("Name", value: name)
                    }
                    LabeledContent("Workspace", value: api.world ?? "Not set")
                }

                Section {
                    notificationRow
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("Corner works with notifications off — the app catches up every time you open it. Notifications only mean you find out sooner.")
                }

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
            .navigationTitle("Account")
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
        .task { await push.refreshAuthorizationAndRegisterIfAllowed() }
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
