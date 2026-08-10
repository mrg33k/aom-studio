// SignInView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Email + password against Supabase Auth — the same credentials as the web dashboard
// (src/dashboard/lib/auth.js signInWithPassword). supabase-swift keeps the session in
// the Keychain, which is sturdier than the Capacitor wrap's WKWebView localStorage;
// iOS evicts that, which is a real and recurring "why am I signed out again" class.
//
// Auth stays first-party on purpose. Guideline 4.8 requires Sign in with Apple only
// when a THIRD-PARTY or social login sets up the primary account, and exempts apps
// that "exclusively use your company's own account setup and sign-in systems". The
// moment a Google button appears anywhere in this app, that exemption is gone.

import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var api: CornerAPI

    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var errorMessage: String?
    @FocusState private var focus: Field?

    private enum Field { case email, password }

    private var canSubmit: Bool {
        !busy
            && !email.trimmingCharacters(in: .whitespaces).isEmpty
            && !password.isEmpty
    }

    var body: some View {
        ZStack {
            // The living ASCII flow field replaces the flat ground. A soft
            // center scrim underneath the form keeps the fields legible over it
            // (comprehension before decoration — the animation is the stage, the
            // login is the actor).
            ASCIIBackground()

            RadialGradient(
                colors: [Theme.ground.opacity(0.82), Theme.ground.opacity(0.0)],
                center: .center, startRadius: 8, endRadius: 320
            )
            .ignoresSafeArea()

            VStack(spacing: Theme.s5) {
                Spacer()

                VStack(spacing: Theme.s2) {
                    Text("Corner")
                        .font(.system(size: 44, weight: .heavy))
                        .foregroundStyle(Theme.ink)
                    // One bronze rule. The first screen every user sees was otherwise
                    // pure greyscale — an unbranded login is a missed introduction, and
                    // this is the smallest true mark that carries the accent.
                    Capsule()
                        .fill(Theme.accent)
                        .frame(width: 44, height: 3)
                        .padding(.top, Theme.s1)
                    Text("Sign in with your Corner account")
                        .font(.subheadline)
                        .foregroundStyle(Theme.inkSoft)
                        .padding(.top, Theme.s1)
                }

                VStack(spacing: Theme.s3) {
                    field {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focus, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focus = .password }
                    }
                    field {
                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .focused($focus, equals: .password)
                            .submitLabel(.go)
                            .onSubmit(signIn)
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(Theme.danger)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, alignment: .center)
                }

                Button(action: signIn) {
                    Group {
                        if busy { ProgressView().tint(Theme.ground) }
                        else { Text("Sign in").fontWeight(.semibold) }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Theme.s4)
                }
                .buttonStyle(.borderedProminent)
                .disabled(!canSubmit)
                // A disabled .borderedProminent button in dark mode is a mid-grey slab
                // with full-strength white text — it reads as an ENABLED grey button
                // whose tint failed, not as one that is waiting for input. Dimming it
                // is what makes "not yet" legible.
                .opacity(canSubmit ? 1 : 0.45)

                Spacer()
                Spacer()
            }
            .padding(.horizontal, Theme.s5)
            .foregroundStyle(Theme.ink)
        }
    }

    @ViewBuilder
    private func field<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content()
            .padding(Theme.s3)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.s3, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.s3, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .foregroundStyle(Theme.ink)
    }

    private func signIn() {
        guard !busy else { return }
        busy = true
        errorMessage = nil
        focus = nil
        Task {
            defer { busy = false }
            do {
                try await api.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
                password = ""
            } catch {
                // Deliberately not echoing the auth server's wording: it distinguishes
                // "no such user" from "wrong password", which is an account-enumeration
                // oracle for anyone typing addresses into a login screen.
                errorMessage = "That email and password did not match an account."
            }
        }
    }
}
