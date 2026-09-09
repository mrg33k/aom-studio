// SignInView.swift — Corner native iOS
// corner:corner-v2 R17 (P059–P060) — the design's phone Login, not the
// legacy emerald wordmark screen.
//
// Corner logo + 25px headline + sub, the Google / Apple / SSO 50px rows,
// the or-divider, the 50px email field, the accent Continue, and the terms
// footnote. Email is the working path (the server speaks password auth —
// see convex/auth.ts, Password provider only). The SSO rows are drawn per
// the design and say plainly they are not connected yet; a silent dead
// button would be worse. All three rows ship together, so the 4.8 exemption
// note on the old screen no longer applies.

import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var api: CornerAPI

    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var busy = false
    @State private var errorMessage: String?
    @State private var notice: String?
    @FocusState private var focus: Field?
    /// R68 (Patrik 2026-09-09): the slick entrance. The logo + content settle in
    /// with a soft staggered rise while the project-tint glow breathes behind —
    /// the brand's own V2LoadingMark/glow language, not a generic slide.
    @State private var entered = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private enum Field { case email, password }

    private var canContinue: Bool {
        !busy && !email.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private var canSubmit: Bool {
        !busy
            && !email.trimmingCharacters(in: .whitespaces).isEmpty
            && !password.isEmpty
    }

    var body: some View {
        ZStack {
            Theme.ground.ignoresSafeArea()
            // R68: a soft breathing glow high behind the logo — the room feels
            // alive the moment you land, before you've done anything.
            V2AmbientGlow(tint: Theme.accent, boost: entered)
                .frame(height: 280)
                .frame(maxWidth: .infinity, alignment: .top)
                .opacity(reduceMotion ? 0.5 : (entered ? 0.7 : 0))
                .offset(y: -160)
                .allowsHitTesting(false)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.9), value: entered)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    logoRow
                        .padding(.top, 114)
                        .staggerReveal(entered, 0, reduce: reduceMotion)
                    Text("Make things with an agent that knows your work.")
                        .font(.hanken(25).weight(.bold))
                        .foregroundStyle(Theme.ink)
                        .padding(.top, 22)
                        .accessibilityIdentifier("login-headline")
                        .staggerReveal(entered, 1, reduce: reduceMotion)
                    Text("Decks, sites, film, brand assets. One conversation, one review, one send.")
                        .font(.hanken(14.5))
                        .foregroundStyle(Theme.inkSoft)
                        .padding(.top, 8)
                        .accessibilityIdentifier("login-sub")
                        .staggerReveal(entered, 2, reduce: reduceMotion)
                    if !showPassword {
                        Group {
                            ssoRow(
                                id: "login-sso-google",
                                label: "Continue with Google",
                                icon: AnyView(
                                    // R19: the design's multicolor G (LOGO set),
                                    // not a monochrome letter.
                                    Image("brand-google-g")
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 19, height: 19)
                                        .accessibilityHidden(true)
                                )
                            ) { ssoNotice("Google") }
                            ssoRow(
                                id: "login-sso-apple",
                                label: "Continue with Apple",
                                icon: AnyView(
                                    Image(systemName: "apple.logo")
                                        .font(.system(size: 17, weight: .medium))
                                        .foregroundStyle(Theme.ink)
                                )
                            ) { ssoNotice("Apple") }
                            ssoRow(
                                id: "login-sso-sso",
                                label: "Continue with SSO",
                                icon: AnyView(
                                    Image(systemName: "command")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundStyle(Theme.ink)
                                )
                            ) { ssoNotice("SSO") }
                            orDivider
                                .padding(.top, 8)
                            emailField
                                .padding(.top, 8)
                        }
                        .staggerReveal(entered, 3, reduce: reduceMotion)
                    } else {
                        passwordStep
                            .padding(.top, 16)
                    }
                    if let notice {
                        Text(notice)
                            .font(.hanken(13))
                            .foregroundStyle(Theme.warning)
                            .padding(.top, 12)
                            .accessibilityIdentifier("login-notice")
                    }
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.hanken(13))
                            .foregroundStyle(Theme.danger)
                            .padding(.top, 12)
                            .accessibilityIdentifier("login-error")
                    }
                    if !showPassword {
                        Button {
                            focus = nil
                            showPassword = true
                            focus = .password
                        } label: {
                            Text("Continue with email")
                                .font(.hanken(15).weight(.semibold))
                                .foregroundStyle(.white.opacity(canContinue ? 1 : 0.55))
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(
                                    Theme.accent.opacity(canContinue ? 1 : 0.45),
                                    in: RoundedRectangle(cornerRadius: 13, style: .continuous)
                                )
                        }
                        .buttonStyle(.plain)
                        .disabled(!canContinue)
                        .padding(.top, 8)
                        .accessibilityIdentifier("login-email-continue")
                        .staggerReveal(entered, 4, reduce: reduceMotion)
                    }
                    Text("By continuing you agree to the terms. Corner reads only what you scope to a project.")
                        .font(.hanken(12))
                        .foregroundStyle(Theme.inkFaint)
                        .padding(.top, 22)
                        .accessibilityIdentifier("login-terms")
                        .staggerReveal(entered, 5, reduce: reduceMotion)
                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 21)
            }
        }
        .onAppear {
            // Each row carries its own delayed spring (see StaggerReveal); we
            // only trip the flag. Under Reduce Motion the modifier shows
            // everything at rest, so the same flip is correct there too.
            guard !entered else { return }
            entered = true
        }
    }

    // MARK: pieces

    // The asset is the whole logo (mark + wordmark, 277x60 @3x), so it is the
    // only thing here: no second "Corner" text beside it (Patrik, 2026-09-07).
    private var logoRow: some View {
        Image("CornerLogo")
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(height: 24)
            .foregroundStyle(Theme.ink)
            .accessibilityLabel("Corner")
    }

    private func ssoRow(id: String, label: String, icon: AnyView, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 0) {
                icon
                    .frame(width: 24, height: 24)
                    .padding(.leading, 16)
                Text(label)
                    .font(.hanken(15).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .padding(.leading, 11)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
        }
        .buttonStyle(.plain)
        .padding(.top, 8)
        .accessibilityIdentifier(id)
        .accessibilityLabel(label)
    }

    private var orDivider: some View {
        HStack(spacing: 10) {
            Rectangle().fill(Theme.divider).frame(height: 1)
            Text("or")
                .font(.hanken(11.5))
                .foregroundStyle(Theme.inkFaint)
            Rectangle().fill(Theme.divider).frame(height: 1)
        }
        .accessibilityHidden(true)
    }

    private var emailField: some View {
        TextField("", text: $email, prompt: prompt("you@studio.com"))
            .textContentType(.emailAddress)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .font(.hanken(15))
            .foregroundStyle(Theme.ink)
            .focused($focus, equals: .email)
            .submitLabel(.continue)
            .onSubmit {
                if canContinue {
                    focus = nil
                    showPassword = true
                    focus = .password
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 50)
            .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            .accessibilityIdentifier("login-email")
            .accessibilityLabel("Email")
    }

    private var passwordStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                showPassword = false
                errorMessage = nil
                focus = .email
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.inkSoft)
                    Text(email.trimmingCharacters(in: .whitespaces))
                        .font(.hanken(14))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("login-back")
            .accessibilityLabel("Back to email")
            SecureField("", text: $password, prompt: prompt("Password (8+ characters)"))
                .textContentType(.password)
                .font(.hanken(15))
                .foregroundStyle(Theme.ink)
                .focused($focus, equals: .password)
                .submitLabel(.go)
                .onSubmit(signIn)
                .padding(.horizontal, 16)
                .frame(height: 50)
                .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                .padding(.top, 12)
                .accessibilityIdentifier("login-password")
                .accessibilityLabel("Password")
            Button(action: signIn) {
                Group {
                    if busy { ProgressView().tint(.white) }
                    else {
                        Text("Sign in")
                            .font(.hanken(15).weight(.semibold))
                            .foregroundStyle(.white.opacity(canSubmit ? 1 : 0.55))
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    Theme.accent.opacity(canSubmit ? 1 : 0.45),
                    in: RoundedRectangle(cornerRadius: 13, style: .continuous)
                )
            }
            .buttonStyle(.plain)
            .disabled(!canSubmit)
            .padding(.top, 8)
            .accessibilityIdentifier("login-signin")
            .accessibilityLabel("Sign in")
        }
    }

    private func prompt(_ text: String) -> Text {
        Text(text).font(.hanken(15)).foregroundStyle(Theme.inkFaint)
    }

    /// The server speaks password auth only: say so in one plain sentence.
    private func ssoNotice(_ provider: String) {
        errorMessage = nil
        notice = "\(provider) sign-in isn't connected to this workspace yet — continue with email."
    }

    private func signIn() {
        guard !busy else { return }
        busy = true
        errorMessage = nil
        notice = nil
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

// R68: the entrance. Each element rises a few points and fades in on a spring,
// staggered by its position (index) so the screen assembles top-down instead
// of popping in whole. Under Reduce Motion it renders instantly at rest — no
// offset, no fade, no animation.
private struct StaggerReveal: ViewModifier {
    let shown: Bool
    let index: Int
    let reduce: Bool

    /// Gap between each element's start — small enough to feel like one gesture.
    private static let step: Double = 0.07

    func body(content: Content) -> some View {
        if reduce {
            content
        } else {
            content
                .opacity(shown ? 1 : 0)
                .offset(y: shown ? 0 : 12)
                .animation(
                    .spring(response: 0.62, dampingFraction: 0.85)
                        .delay(Double(index) * Self.step),
                    value: shown
                )
        }
    }
}

private extension View {
    func staggerReveal(_ shown: Bool, _ index: Int, reduce: Bool) -> some View {
        modifier(StaggerReveal(shown: shown, index: index, reduce: reduce))
    }
}
