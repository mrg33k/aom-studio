// V2SettingsView.swift — Corner native iOS
// corner:corner-v2 R17 (P063) — the design's phone Settings.
//
// Back + left `Settings` title, the 52px identity (avatar, 17px name,
// 12.5px email), the five 52px rows with hairline dividers, and Re-run
// setup at the bottom. Every row lands somewhere real: Profile (name,
// email, sign out), Environment (the arcade connections), Permissions (the
// shared local store), Notifications (system authorization + the Settings
// app), Appearance (ThemeManager). Re-run setup clears the setup flag and
// asks RootView to present the flow again.

import SwiftUI
import UserNotifications

extension Notification.Name {
    /// V2SettingsView asks RootView to present the setup flow again.
    static let v2RerunSetup = Notification.Name("corner.v2.rerun-setup")
}

struct V2SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var path: [String] = []

    var body: some View {
        NavigationStack(path: $path) {
            settingsRoot
                .navigationDestination(for: String.self) { key in
                    switch key {
                    case "profile": V2SettingsProfile()
                    case "environment": V2SettingsEnvironment()
                    case "permissions": V2SettingsPermissions()
                    case "notifications": V2SettingsNotifications()
                    case "appearance": V2SettingsAppearance()
                    default: EmptyView()
                    }
                }
        }
        .groundBackground()
        // NOTE: leaf marker, not a container id (same finding as chat-screen).
        .overlay {
            Color.clear.frame(width: 1, height: 1)
                .accessibilityIdentifier("settings-screen")
        }
    }

    private var settingsRoot: some View {
        VStack(alignment: .leading, spacing: 0) {
            navBar(title: "Settings", back: { dismiss() })
            identityHeader
            settingsRow("Profile", id: "profile")
            settingsRow("Environment", id: "environment")
            settingsRow("Permissions", id: "permissions")
            settingsRow("Notifications", id: "notifications")
            settingsRow("Appearance", id: "appearance")
            Button {
                V2SetupStore.shared.reset()
                dismiss()
                // The dismiss needs a turn before RootView re-presents.
                Task { @MainActor in
                    try? await Task.sleep(nanoseconds: 400_000_000)
                    NotificationCenter.default.post(name: .v2RerunSetup, object: nil)
                }
            } label: {
                Text("Re-run setup")
                    .font(.hanken(15))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(height: 52, alignment: .leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("settings-rerun")
            .accessibilityLabel("Re-run setup")
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 21)
    }

    private var identityHeader: some View {
        HStack(spacing: 12) {
            Text(initial)
                .font(.hanken(20).weight(.bold))
                .foregroundStyle(Color.white)
                .frame(width: 52, height: 52)
                .background(Theme.avatarGradient, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName)
                    .font(.hanken(17).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .accessibilityIdentifier("settings-name")
                Text(userEmail)
                    .font(.hanken(12.5))
                    .foregroundStyle(Theme.inkSoft)
                    .accessibilityIdentifier("settings-email")
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 16)
    }

    private var displayName: String { CornerAPI.shared.userDisplayName ?? "Corner" }
    private var userEmail: String { CornerAPI.shared.userEmail ?? "" }
    private var initial: String {
        String((CornerAPI.shared.userDisplayName ?? "C").prefix(1).uppercased())
    }

    private func settingsRow(_ title: String, id: String) -> some View {
        Button { path.append(id) } label: {
            HStack(spacing: 0) {
                Text(title)
                    .font(.hanken(15).weight(.medium))
                    .foregroundStyle(Theme.ink)
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(Theme.inkFaint)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(height: 52)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.divider).frame(height: 1)
        }
        .accessibilityIdentifier("settings-row-\(id)")
        .accessibilityLabel(title)
    }
}

/// The phone settings nav: 44pt back + the left 15/600 title (the design's
/// title sits left, not centred).
@MainActor
private func v2SettingsNavBar(title: String, back: @escaping () -> Void) -> some View {
    HStack(spacing: 8) {
        Button(action: back) {
            Image(systemName: "chevron.left")
                .font(.system(size: 17, weight: .regular))
                .foregroundStyle(Theme.ink)
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("settings-back")
        .accessibilityLabel("Back")
        .padding(.leading, -12)
        Text(title)
            .font(.hanken(15).weight(.semibold))
            .foregroundStyle(Theme.ink)
        Spacer(minLength: 0)
    }
    .frame(height: 52)
}

@MainActor
private func navBar(title: String, back: @escaping () -> Void) -> some View {
    v2SettingsNavBar(title: title, back: back)
}

// MARK: - sub-screens

private struct V2SettingsProfile: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var router: AppRouter
    @State private var signingOut = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            navBar(title: "Profile") { dismiss() }
            Text(CornerAPI.shared.userDisplayName ?? "Corner")
                .font(.hanken(17).weight(.semibold))
                .foregroundStyle(Theme.ink)
                .padding(.top, 16)
                .accessibilityIdentifier("settings-profile-name")
            Text(CornerAPI.shared.userEmail ?? "")
                .font(.hanken(14))
                .foregroundStyle(Theme.inkSoft)
                .padding(.top, 4)
                .accessibilityIdentifier("settings-profile-email")
            Button {
                signingOut = true
                Task {
                    await CornerAPI.shared.signOut()
                    V2RecentStore.shared.clear()
                    signingOut = false
                    router.closeAll()
                    dismiss()
                }
            } label: {
                Text(signingOut ? "Signing out…" : "Sign out")
                    .font(.hanken(15).weight(.medium))
                    .foregroundStyle(Theme.danger)
                    .frame(height: 52, alignment: .leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(signingOut)
            .padding(.top, 16)
            .accessibilityIdentifier("settings-signout")
            Text(appVersion)
                .font(.hanken(12))
                .foregroundStyle(Theme.inkFaint)
                .padding(.top, 16)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 21)
        .groundBackground()
        .navigationBarHidden(true)
    }

    private var appVersion: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "Corner \(v) (\(b))"
    }
}

private struct V2SettingsEnvironment: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var connections = V2ConnectionsStore()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            navBar(title: "Environment") { dismiss() }
            if !connections.loaded {
                Text("Loading…")
                    .font(.hanken(14))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(height: 52)
            } else if connections.rows.isEmpty {
                Text("No connections yet. Connect Gmail, Drive, or Figma on the web and they show up here.")
                    .font(.hanken(14))
                    .foregroundStyle(Theme.inkSoft)
                    .padding(.top, 16)
                    .accessibilityIdentifier("settings-env-empty")
            } else {
                ForEach(Array(connections.rows.enumerated()), id: \.offset) { _, row in
                    HStack(spacing: 0) {
                        Text(row.service ?? "Service")
                            .font(.hanken(15).weight(.medium))
                            .foregroundStyle(Theme.ink)
                        Spacer(minLength: 0)
                        Text(row.status ?? "")
                            .font(.hanken(13))
                            .foregroundStyle(Theme.inkSoft)
                    }
                    .frame(height: 52)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(Theme.divider).frame(height: 1)
                    }
                    .accessibilityIdentifier("settings-env-row")
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 21)
        .groundBackground()
        .navigationBarHidden(true)
        .task {
            await connections.load(userID: CornerAPI.shared.session?.user.id)
        }
    }
}

private struct V2SettingsPermissions: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var perms = V2PermissionsStore.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            navBar(title: "Permissions") { dismiss() }
            permRow("Draft", "Write copy and lay out pages", $perms.draft)
            permRow("File", "Move and rename project files", $perms.file)
            permRow("Send", "Email a client directly", $perms.send)
            permRow("Publish", "Push a site live", $perms.publish)
            Text("Stored on this device.")
                .font(.hanken(12))
                .foregroundStyle(Theme.inkFaint)
                .padding(.top, 8)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 21)
        .groundBackground()
        .navigationBarHidden(true)
        .onChange(of: perms.draft) { _, _ in perms.save() }
        .onChange(of: perms.file) { _, _ in perms.save() }
        .onChange(of: perms.send) { _, _ in perms.save() }
        .onChange(of: perms.publish) { _, _ in perms.save() }
    }

    private func permRow(_ title: String, _ detail: String, _ on: Binding<Bool>) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.hanken(15).weight(.medium))
                    .foregroundStyle(Theme.ink)
                Text(detail)
                    .font(.hanken(12.5))
                    .foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Toggle("", isOn: on)
                .labelsHidden()
                .tint(Theme.accent)
                .accessibilityIdentifier("settings-perm-\(title.lowercased())")
                .accessibilityLabel("\(title) permission")
        }
        .frame(height: 62)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.divider).frame(height: 1)
        }
    }
}

private struct V2SettingsNotifications: View {
    @Environment(\.dismiss) private var dismiss
    @State private var status = "Checking…"

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            navBar(title: "Notifications") { dismiss() }
            Text("Push: \(status)")
                .font(.hanken(14))
                .foregroundStyle(Theme.inkSoft)
                .padding(.top, 16)
                .accessibilityIdentifier("settings-push-status")
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .font(.hanken(15).weight(.semibold))
            .foregroundStyle(Theme.accent)
            .frame(height: 52, alignment: .leading)
            .buttonStyle(.plain)
            .accessibilityIdentifier("settings-open-system")
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 21)
        .groundBackground()
        .navigationBarHidden(true)
        .task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: status = "on"
            case .denied: status = "off"
            default: status = "not asked"
            }
        }
    }
}

private struct V2SettingsAppearance: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var theme = ThemeManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            navBar(title: "Appearance") { dismiss() }
            ForEach(ThemeKind.allCases) { kind in
                Button { theme.kind = kind } label: {
                    HStack(spacing: 12) {
                        Text(kind.label)
                            .font(.hanken(15).weight(.medium))
                            .foregroundStyle(Theme.ink)
                        Spacer(minLength: 0)
                        if theme.kind == kind {
                            Image(systemName: "checkmark")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .frame(height: 52)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(Theme.divider).frame(height: 1)
                }
                .accessibilityIdentifier("settings-appearance-\(kind.rawValue)")
                .accessibilityLabel("\(kind.label) theme")
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 21)
        .groundBackground()
        .navigationBarHidden(true)
    }
}
