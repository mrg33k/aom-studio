// AirPodsVoiceView.swift — native Corner conversation controls.

import SwiftUI

struct AirPodsVoiceView: View {
    @StateObject private var voice = AirPodsVoiceService()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.s5) {
                Spacer(minLength: Theme.s3)
                waveform
                VStack(spacing: Theme.s2) {
                    Text(statusTitle).font(.hkTitle2).foregroundStyle(Theme.ink)
                    Label(voice.routeName, systemImage: "airpodspro")
                        .font(.hkFootnote).foregroundStyle(Theme.inkSoft)
                }

                if let turn = voice.transcript.last {
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Text(turn.role == "user" ? "You" : "Corner")
                            .font(.hkCaption.weight(.bold)).foregroundStyle(turn.role == "user" ? Theme.inkSoft : Theme.accent)
                        Text(turn.text).font(.hkBody).foregroundStyle(Theme.ink).lineLimit(6)
                    }
                    .padding(Theme.s4).frame(maxWidth: .infinity, alignment: .leading)
                    .background {
                        Theme.frostedSurface(fallback: Theme.raised, tint: Color(cv6: 0x161A21, opacity: 0.30), in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
                    }
                    .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous).strokeBorder(Theme.hairline))
                } else {
                    Text(voice.isActive ? "Tell me what outcome you want." : "A live conversation with Corner through your current audio device.")
                        .font(.hkBody).foregroundStyle(Theme.inkSoft).multilineTextAlignment(.center)
                }

                if case .error(let message) = voice.mode {
                    Label(message, systemImage: "exclamationmark.triangle.fill")
                        .font(.hkFootnote).foregroundStyle(Theme.danger).multilineTextAlignment(.center)
                }
                if let confirmation = voice.pendingConfirmation {
                    confirmationCard(confirmation)
                }
                Spacer()
                controls
            }
            .padding(Theme.s5)
            .groundBackground()
            .navigationTitle("Corner Voice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { voice.stop(); dismiss() } } }
        }
        .interactiveDismissDisabled(voice.isActive)
        .onDisappear { voice.stop() }
    }

    private func confirmationCard(_ confirmation: AirPodsVoiceService.PendingConfirmation) -> some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            Label("Confirmation required", systemImage: "exclamationmark.shield.fill")
                .font(.hkBody.weight(.bold)).foregroundStyle(Theme.warning)
            Text(confirmation.summary).font(.hkBody).foregroundStyle(Theme.ink)
            HStack {
                Button("Cancel", role: .cancel) {
                    Task { await voice.resolveConfirmation(confirmed: false) }
                }
                .buttonStyle(.bordered)
                Spacer()
                Button("Confirm") {
                    Task { await voice.resolveConfirmation(confirmed: true) }
                }
                .buttonStyle(.borderedProminent).tint(Theme.warning)
            }
        }
        .padding(Theme.s4).frame(maxWidth: .infinity, alignment: .leading)
        .background {
            Theme.frostedSurface(fallback: Theme.raised, tint: Theme.warning.opacity(0.08), in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        }
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous).strokeBorder(Theme.warning.opacity(0.45)))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Confirmation required for \(confirmation.action.replacingOccurrences(of: "_", with: " "))")
    }

    private var waveform: some View {
        HStack(alignment: .center, spacing: 5) {
            ForEach(0..<9, id: \.self) { index in
                let bias = 0.35 + Double((index * 7) % 5) * 0.12
                Capsule().fill(voice.isActive ? Theme.accent : Theme.inkFaint)
                    .frame(width: 5, height: 12 + 52 * max(voice.level, bias * (voice.isActive ? 0.35 : 0)))
                    .animation(.easeOut(duration: 0.12), value: voice.level)
            }
        }
        .frame(height: 76)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(statusTitle)
    }

    @ViewBuilder private var controls: some View {
        if voice.isActive {
            HStack(spacing: Theme.s5) {
                Button { voice.toggleMute() } label: {
                    Label(voice.muted ? "Resume" : "Pause", systemImage: voice.muted ? "mic.fill" : "mic.slash.fill")
                }
                .buttonStyle(.bordered)
                Button(role: .destructive) { voice.stop() } label: {
                    Label("End", systemImage: "phone.down.fill")
                }
                .buttonStyle(.borderedProminent).tint(Theme.danger)
            }
        } else {
            Button { Task { await voice.start() } } label: {
                Label(isError ? "Retry conversation" : "Start conversation", systemImage: "airpodspro")
                    .font(.hkBody.weight(.semibold)).frame(maxWidth: .infinity).frame(height: 48)
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var isError: Bool { if case .error = voice.mode { return true }; return false }
    private var statusTitle: String {
        switch voice.mode {
        case .idle: return "Ready when you are"
        case .connecting: return "Connecting…"
        case .listening: return voice.muted ? "Paused" : "Listening"
        case .thinking: return "Thinking"
        case .speaking: return "Corner is speaking"
        case .error: return "Connection issue"
        }
    }
}
