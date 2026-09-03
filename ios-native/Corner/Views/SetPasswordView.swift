// SetPasswordView.swift — Corner native iOS
// corner:retire-supabase R3 (2026-09-03)
//
// Shown once, right after the first sign-in following the Convex cutover.
// Accounts were seeded with a one-time password (passwords never left the old
// system), so the person picks their own here before anything else opens.

import SwiftUI

struct SetPasswordView: View {
    @EnvironmentObject private var api: CornerAPI

    @State private var password = ""
    @State private var confirm = ""
    @State private var busy = false
    @State private var errorMessage: String?

    private var canSubmit: Bool {
        !busy && password.count >= 8 && password == confirm
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Spacer(minLength: 40)

            Text("Set your password")
                .font(.system(size: 28, weight: .bold))

            Text("You signed in with a temporary password. Pick your own to keep going. At least 8 characters.")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                SecureField("New password", text: $password)
                    .textContentType(.newPassword)
                    .padding(14)
                    .background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
                SecureField("Confirm password", text: $confirm)
                    .textContentType(.newPassword)
                    .padding(14)
                    .background(Color.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
            }

            if !confirm.isEmpty, password != confirm {
                Text("Those two do not match.")
                    .font(.system(size: 14))
                    .foregroundStyle(.red)
            }
            if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 14))
                    .foregroundStyle(.red)
            }

            Button {
                submit()
            } label: {
                HStack {
                    Spacer()
                    if busy { ProgressView().tint(.white) } else { Text("Save password").fontWeight(.semibold) }
                    Spacer()
                }
                .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canSubmit)

            Button("Sign out instead") {
                Task { await api.signOut() }
            }
            .font(.system(size: 14))
            .foregroundStyle(.secondary)

            Spacer()
        }
        .padding(24)
        .groundBackground()
    }

    private func submit() {
        guard canSubmit else { return }
        busy = true
        errorMessage = nil
        Task {
            defer { busy = false }
            do {
                try await api.changePassword(newPassword: password)
                password = ""
                confirm = ""
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "That did not save. Try again."
            }
        }
    }
}
