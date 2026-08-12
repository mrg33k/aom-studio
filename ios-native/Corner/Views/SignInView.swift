// SignInView.swift — Corner native iOS
// corner:native-ios R4 — the web login, on the phone.
//
// This is the same first impression the web gives (src/pages/Login.jsx): a deep
// navy ground with a slow four-blob gradient mesh, four hairline corner marks
// framing the screen, the "Corner." wordmark with its accent period, an
// AI COMMAND CENTER eyebrow, underline-only fields, one emerald gradient
// button, and the pulsing INVITE ONLY footer. The login deliberately keeps the
// web's own emerald accent — the login is its own brand moment on every surface.
//
// Google and Microsoft are account-entry choices only. Mail search is a later,
// explicit permission in onboarding. Because third-party auth is now present,
// Sign in with Apple must be included before App Store submission.

import SwiftUI
import Supabase

struct SignInView: View {
    @EnvironmentObject private var api: CornerAPI

    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var creatingAccount = false
    @State private var errorMessage: String?
    @FocusState private var focus: Field?

    private enum Field { case email, password }

    // The web login's own palette (Login.jsx) — emerald on deep navy, not CV6 blue.
    private static let bg = Color(cv6: 0x040810)
    private static let emerald = Color(cv6: 0x10B981)
    private static let emerald2 = Color(cv6: 0x34D399)
    private static let text = Color(cv6: 0xF8FAFC)
    private static let textMuted = Color.white.opacity(0.30)
    private static let fieldLine = Color.white.opacity(0.10)
    private static let err = Color(cv6: 0xF87171)

    private var canSubmit: Bool {
        !busy
            && !email.trimmingCharacters(in: .whitespaces).isEmpty
            && !password.isEmpty
    }

    var body: some View {
        ZStack {
            Self.bg.ignoresSafeArea()
            MeshBlobBackground()
            // The living flow field — Corner is a machine that never sleeps, and
            // the first screen reads like looking INTO it. Emerald embers to match
            // the login's own accent; the center scrim keeps the form the hero.
            ASCIIBackground(ember: Self.emerald2)
            RadialGradient(
                colors: [Self.bg.opacity(0.85), Self.bg.opacity(0.0)],
                center: .center, startRadius: 8, endRadius: 330
            )
            .ignoresSafeArea()
            CornerMarks()

            VStack(spacing: 0) {
                Spacer()

                VStack(alignment: .leading, spacing: 0) {
                    wordmark
                    eyebrow
                        .padding(.top, 6)

                    if let errorMessage {
                        errorStrip(errorMessage)
                            .padding(.top, Theme.s5)
                    }

                    providerButton("Continue with Google", provider: .google, symbol: "G")
                        .padding(.top, Theme.s5)
                    providerButton("Continue with Microsoft", provider: .azure, symbol: "M")
                        .padding(.top, Theme.s2)
                    providerButton("Continue with Apple", provider: .apple, symbol: "●")
                        .padding(.top, Theme.s2)

                    HStack { Rectangle().frame(height: 1); Text("OR USE EMAIL"); Rectangle().frame(height: 1) }
                        .font(.hanken(9).weight(.bold)).tracking(1.2)
                        .foregroundStyle(Self.textMuted)
                        .padding(.top, Theme.s5)

                    labelled("EMAIL", focused: focus == .email) {
                        TextField("", text: $email, prompt: prompt("you@company.com"))
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focus, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focus = .password }
                    }
                    .padding(.top, Theme.s5 + Theme.s2)

                    labelled("PASSWORD", focused: focus == .password) {
                        SecureField("", text: $password, prompt: prompt("••••••••"))
                            .textContentType(.password)
                            .focused($focus, equals: .password)
                            .submitLabel(.go)
                            .onSubmit(signIn)
                    }
                    .padding(.top, Theme.s5)

                    signInButton
                        .padding(.top, Theme.s5 + Theme.s1)

                    Button(creatingAccount ? "Already have an account? Sign in" : "New to Corner? Create a free account") {
                        creatingAccount.toggle(); errorMessage = nil
                    }
                    .font(.hanken(11).weight(.semibold)).foregroundStyle(Self.textMuted)
                    .frame(maxWidth: .infinity).padding(.top, Theme.s3)
                }
                .frame(maxWidth: 320)

                Spacer()

                inviteOnly
                    .padding(.bottom, Theme.s5)
            }
            .padding(.horizontal, Theme.s6)
        }
    }

    // MARK: - Pieces

    private var wordmark: some View {
        HStack(spacing: 0) {
            Text("Corner")
                .font(.hanken(22).weight(.semibold))
                .foregroundStyle(Self.text)
            Text(".")
                .font(.hanken(22).weight(.semibold))
                .foregroundStyle(Self.emerald2)
        }
    }

    private var eyebrow: some View {
        Text("AI COMMAND CENTER")
            .font(.hanken(10).weight(.semibold))
            .tracking(1.8)
            .foregroundStyle(Self.textMuted)
    }

    private func prompt(_ text: String) -> Text {
        Text(text).font(.hanken(16)).foregroundStyle(Self.textMuted)
    }

    private func labelled<Content: View>(
        _ label: String, focused: Bool, @ViewBuilder _ content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text(label)
                .font(.hanken(9).weight(.bold))
                .tracking(1.3)
                .foregroundStyle(focused ? Self.emerald2 : Self.textMuted)
                .animation(.easeOut(duration: 0.15), value: focused)
            content()
                .font(.hanken(16))
                .foregroundStyle(Self.text)
                .tint(Self.emerald2)
                .padding(.bottom, 10)
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(focused ? Self.emerald2.opacity(0.7) : Self.fieldLine)
                        .frame(height: 1)
                }
        }
    }

    private func errorStrip(_ message: String) -> some View {
        Text(message)
            .font(.hanken(12))
            .foregroundStyle(Self.err)
            .padding(.vertical, Theme.s2)
            .padding(.horizontal, Theme.s3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Self.err.opacity(0.08))
            .overlay(alignment: .leading) { Rectangle().fill(Self.err).frame(width: 2) }
    }

    private var signInButton: some View {
        Button(action: signIn) {
            Group {
                if busy { ProgressView().tint(.white) }
                else {
                    Text(creatingAccount ? "Create free account" : "Sign in")
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(.white.opacity(canSubmit ? 1 : 0.55))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            // The waiting state mutes the gradient but stays OPAQUE — a see-through
            // button over the glyph field reads as watermarked, not as disabled.
            .background(
                LinearGradient(
                    colors: [Self.emerald.opacity(canSubmit ? 1 : 0.38),
                             Self.emerald2.opacity(canSubmit ? 1 : 0.38)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 10, style: .continuous)
            )
            .background(Self.bg, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .shadow(color: Self.emerald.opacity(canSubmit ? 0.20 : 0), radius: 11, y: 6)
        }
        .disabled(!canSubmit)
    }

    private func providerButton(_ title: String, provider: Provider, symbol: String) -> some View {
        Button {
            guard !busy else { return }
            busy = true; errorMessage = nil
            Task {
                defer { busy = false }
                do { try await api.signIn(provider: provider) }
                catch { errorMessage = "\(title.replacingOccurrences(of: "Continue with ", with: "")) sign-in is not available yet." }
            }
        } label: {
            HStack(spacing: 10) {
                Text(symbol).font(.hanken(14).weight(.bold)).foregroundStyle(Self.emerald2)
                Text(title).font(.hanken(14).weight(.semibold)).foregroundStyle(Self.text)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 12)
            .background(Color.white.opacity(0.035), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Self.fieldLine))
        }
        .disabled(busy)
    }

    private var inviteOnly: some View {
        HStack(spacing: Theme.s2) {
            PulsingDot(color: Self.emerald2)
            Text("YOUR WORK, ORGANIZED")
                .font(.hanken(9).weight(.semibold))
                .tracking(1.8)
                .foregroundStyle(Self.textMuted)
        }
    }

    private func signIn() {
        guard !busy else { return }
        busy = true
        errorMessage = nil
        focus = nil
        Task {
            defer { busy = false }
            do {
                if creatingAccount {
                    let signedIn = try await api.signUp(email: email.trimmingCharacters(in: .whitespaces), password: password)
                    if !signedIn {
                        errorMessage = "Check your email to confirm your account, then come back to sign in."
                    }
                } else {
                    try await api.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
                }
                password = ""
            } catch {
                // Deliberately not echoing the auth server's wording: it distinguishes
                // "no such user" from "wrong password", which is an account-enumeration
                // oracle for anyone typing addresses into a login screen.
                errorMessage = creatingAccount
                    ? "That account could not be created. Check the email and password, then try again."
                    : "That email and password did not match an account."
            }
        }
    }
}

// MARK: - The mesh

/// The web login's animated background: four soft radial blobs drifting slowly
/// around the frame. Drawn with a TimelineView so it costs one gradient pass per
/// frame and nothing when the app is backgrounded.
private struct MeshBlobBackground: View {
    private struct Blob {
        let color: Color
        let opacity: Double
        let radius: CGFloat
        let cx: Double, cy: Double     // orbit center, unit space
        let ax: Double, ay: Double     // orbit amplitude, unit space
        let speed: Double, phase: Double
    }

    private let blobs: [Blob] = [
        Blob(color: Color(cv6: 0x10B981), opacity: 0.13, radius: 0.62,
             cx: 0.22, cy: 0.24, ax: 0.10, ay: 0.07, speed: 0.11, phase: 0.0),
        Blob(color: Color(cv6: 0x0E7490), opacity: 0.11, radius: 0.55,
             cx: 0.82, cy: 0.30, ax: 0.08, ay: 0.10, speed: 0.09, phase: 1.9),
        Blob(color: Color(cv6: 0x34D399), opacity: 0.08, radius: 0.50,
             cx: 0.70, cy: 0.78, ax: 0.11, ay: 0.06, speed: 0.13, phase: 3.7),
        Blob(color: Color(cv6: 0x1E293B), opacity: 0.55, radius: 0.70,
             cx: 0.30, cy: 0.88, ax: 0.07, ay: 0.09, speed: 0.07, phase: 5.2),
    ]

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                for blob in blobs {
                    let x = (blob.cx + blob.ax * sin(t * blob.speed * 2 * .pi + blob.phase)) * size.width
                    let y = (blob.cy + blob.ay * cos(t * blob.speed * 2 * .pi + blob.phase)) * size.height
                    let r = blob.radius * min(size.width, size.height)
                    let rect = CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)
                    context.fill(
                        Path(ellipseIn: rect),
                        with: .radialGradient(
                            Gradient(colors: [blob.color.opacity(blob.opacity), .clear]),
                            center: CGPoint(x: x, y: y),
                            startRadius: 0, endRadius: r
                        )
                    )
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

// MARK: - Corner marks

/// Four hairline L-shapes framing the screen — the web login's quiet signature.
private struct CornerMarks: View {
    private let inset: CGFloat = 18
    private let arm: CGFloat = 14
    private let line = Color.white.opacity(0.14)

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            Path { p in
                // top-left
                p.move(to: CGPoint(x: inset, y: inset + arm)); p.addLine(to: CGPoint(x: inset, y: inset)); p.addLine(to: CGPoint(x: inset + arm, y: inset))
                // top-right
                p.move(to: CGPoint(x: w - inset - arm, y: inset)); p.addLine(to: CGPoint(x: w - inset, y: inset)); p.addLine(to: CGPoint(x: w - inset, y: inset + arm))
                // bottom-right
                p.move(to: CGPoint(x: w - inset, y: h - inset - arm)); p.addLine(to: CGPoint(x: w - inset, y: h - inset)); p.addLine(to: CGPoint(x: w - inset - arm, y: h - inset))
                // bottom-left
                p.move(to: CGPoint(x: inset + arm, y: h - inset)); p.addLine(to: CGPoint(x: inset, y: h - inset)); p.addLine(to: CGPoint(x: inset, y: h - inset - arm))
            }
            .stroke(line, lineWidth: 1)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

/// The 4pt pulsing presence dot beside INVITE ONLY.
private struct PulsingDot: View {
    let color: Color
    @State private var on = false
    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 4, height: 4)
            .opacity(on ? 1 : 0.35)
            .animation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true), value: on)
            .onAppear { on = true }
    }
}
