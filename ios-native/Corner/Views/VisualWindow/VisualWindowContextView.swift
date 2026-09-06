// VisualWindowContextView.swift — Corner native iOS
// corner:corner-v2 R17 (P024 sheet tabs).
//
// The sheet's Context pane, mirroring the desktop ContextView: the thread's
// files, its connections, and the act-without-asking toggles. Files come
// from the window store (already loaded); connections read the arcade table
// when a real backend is in play and stay empty in fixture mode (hermetic:
// no network from fixture tests); permission toggles are local-only, exactly
// like the desktop's ("Static this round; toggles are not saved").

import SwiftUI

/// One arcade integration row — only the fields the pane reads.
/// Internal: the setup Connect step shares the row shape.
struct V2IntegrationRow: Decodable {
    var service: String?
    var status: String?
}

/// Connections for the Context pane. Real backend only; fixture stays empty.
@MainActor
final class V2ConnectionsStore: ObservableObject {
    @Published private(set) var rows: [V2IntegrationRow] = []
    @Published private(set) var loaded = false

    func load(userID: String?) async {
        guard let userID, !userID.isEmpty,
              ProcessInfo.processInfo.environment["UITEST_REAL_BACKEND"] == "1"
                || ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] == nil
        else {
            loaded = true
            return
        }
        if let rows: [V2IntegrationRow] = try? await ConvexService.shared.query(
            "arcade:listIntegrationsByStringId", args: ["userId": userID]
        ) {
            self.rows = rows
        }
        loaded = true
    }
}

struct VisualWindowContextView: View {
    @EnvironmentObject private var window: VisualWindowStore
    @EnvironmentObject private var api: CornerAPI
    @StateObject private var connections = V2ConnectionsStore()
    /// Act-without-asking toggles: local-only, like the desktop (P024 note).
    @State private var perms = (draft: true, file: true, send: false, publish: false)
    /// READ IN {PROJECT} needs the project name; the sheet passes it through.
    var projectName: String = ""
    /// Opening a file selects its tab, or opens one when none exists yet.
    var onOpenFile: ((Artifact) -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            section("READ IN \(projectName.uppercased())") {
                if window.artifacts.isEmpty {
                    emptyRow("No files on this thread yet.")
                } else {
                    ForEach(window.artifacts) { artifact in
                        Button {
                            onOpenFile?(artifact)
                        } label: {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(Theme.success)
                                    .frame(width: 6, height: 6)
                                Text(artifact.title)
                                    .font(.hanken(14))
                                    .foregroundStyle(Theme.ink)
                                    .lineLimit(1)
                                Spacer(minLength: 0)
                                Text(kindDetail(artifact))
                                    .font(.hanken(12))
                                    .foregroundStyle(Theme.inkFaint)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("context-file-\(artifact.id)")
                        .accessibilityLabel(artifact.title)
                    }
                }
            }
            section("CONNECTIONS") {
                if !connections.loaded {
                    emptyRow("Loading…")
                } else if connections.rows.isEmpty {
                    emptyRow("No connections yet.")
                } else {
                    ForEach(Array(connections.rows.enumerated()), id: \.offset) { _, row in
                        HStack(spacing: 12) {
                            Text(row.service ?? "Service")
                                .font(.hanken(14).weight(.medium))
                                .foregroundStyle(Theme.ink)
                            Spacer(minLength: 0)
                            Text(row.status ?? "")
                                .font(.hanken(12))
                                .foregroundStyle(Theme.inkFaint)
                        }
                        .frame(minHeight: 50)
                        .accessibilityIdentifier("context-connection")
                    }
                }
            }
            section("MAY ACT WITHOUT ASKING") {
                permRow("Draft", "Write copy and lay out pages", $perms.draft)
                permRow("File", "Move and rename project files", $perms.file)
                permRow("Send", "Email a client directly", $perms.send)
                permRow("Publish", "Push a site live", $perms.publish)
                Text("Toggles are not saved yet.")
                    .font(.hanken(12))
                    .foregroundStyle(Theme.inkFaint)
                    .padding(.top, 4)
            }
        }
        .padding(.horizontal, 21)
        .task {
            await connections.load(userID: api.session?.user.id)
        }
    }

    private func kindDetail(_ artifact: Artifact) -> String {
        switch artifact.kind {
        case .pdf: "PDF"
        case .photo: "Photo"
        case .video, .youtube: "Video"
        case .web: "Site"
        case .code: "Code"
        case .deck: "Deck"
        default: "File"
        }
    }

    private func section<Content: View>(
        _ title: String, @ViewBuilder _ content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.hanken(10.5).weight(.semibold))
                .foregroundStyle(Theme.inkFaint)
                .padding(.top, 18)
                .padding(.bottom, 6)
                .accessibilityIdentifier("context-section")
            content()
        }
    }

    private func emptyRow(_ text: String) -> some View {
        Text(text)
            .font(.hanken(14))
            .foregroundStyle(Theme.inkSoft)
            .frame(minHeight: 44, alignment: .leading)
    }

    private func permRow(_ title: String, _ detail: String, _ on: Binding<Bool>) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.hanken(14).weight(.medium))
                    .foregroundStyle(Theme.ink)
                Text(detail)
                    .font(.hanken(12))
                    .foregroundStyle(Theme.inkSoft)
            }
            Spacer(minLength: 0)
            Toggle("", isOn: on)
                .labelsHidden()
                .tint(Theme.accent)
                .accessibilityIdentifier("context-perm-\(title.lowercased())")
                .accessibilityLabel("\(title) permission")
        }
        .frame(minHeight: 50)
    }
}
