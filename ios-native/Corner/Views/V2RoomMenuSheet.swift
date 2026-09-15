// V2RoomMenuSheet.swift — Corner native iOS
// Patrik 2026-09-15: tapping the room name/bubble in the header opens this
// room's menu — the live agent, this room's files, and the assistant's
// settings (instructions for this room; on the Assistant home, the
// response-style preference too). Stored per user in `preferences` so the
// bridge reads them into the system prompt.

import SwiftUI

struct V2RoomMenuSheet: View {
    let context: V2ChatContext
    @EnvironmentObject private var window: VisualWindowStore
    @EnvironmentObject private var router: AppRouter
    @Environment(\.dismiss) private var dismiss

    @State private var roomInstructions = ""
    @State private var globalInstructions = ""
    @State private var responseStyle = ""
    @State private var loaded = false
    @State private var saving = false

    /// Newest of each title (re-deliveries of the same report stack up).
    private var dedupedArtifacts: [Artifact] {
        var seen = Set<String>()
        return window.artifacts.filter { seen.insert($0.title.lowercased()).inserted }
    }

    private var isHome: Bool { context.mission == nil && context.project.kind == .general }
    private var roomKey: String { "assistant-instructions:\(context.thread.id)" }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 14) {
                        LiveAgentAvatarView(size: 64)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(isHome ? "Assistant" : context.title)
                                .font(.hanken(18).weight(.semibold))
                                .foregroundStyle(Theme.ink)
                            Text(isHome ? "Your one assistant, everywhere." : (context.mission != nil ? context.project.name : "Project room"))
                                .font(.hanken(13))
                                .foregroundStyle(Theme.inkSoft)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.vertical, 6)
                    .listRowBackground(Theme.raised)
                }

                if !isHome {
                    Section("Files in this room") {
                        if window.artifacts.isEmpty {
                            Text("Nothing here yet. Files you send or the assistant makes land here.")
                                .font(.hanken(13))
                                .foregroundStyle(Theme.inkSoft)
                        } else {
                            ForEach(dedupedArtifacts.prefix(12)) { artifact in
                                Button {
                                    Task {
                                        try? await window.open(artifact.kind, threadID: context.thread.id,
                                                               artifactID: artifact.id, title: artifact.title, state: [:])
                                        dismiss()
                                    }
                                } label: {
                                    HStack(spacing: 10) {
                                        Image(systemName: V2RoomMenuSheet.icon(for: artifact.kind))
                                            .foregroundStyle(Theme.accent)
                                            .frame(width: 22)
                                        Text(artifact.title)
                                            .font(.hanken(14))
                                            .foregroundStyle(Theme.ink)
                                            .lineLimit(1)
                                        Spacer(minLength: 0)
                                    }
                                }
                            }
                        }
                        Button {
                            dismiss()
                            router.open(.organize)
                        } label: {
                            Label("All files", systemImage: "folder")
                                .font(.hanken(14).weight(.medium))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    .listRowBackground(Theme.raised)
                }

                Section(isHome ? "Assistant instructions" : "Instructions for this room") {
                    TextEditor(text: isHome ? $globalInstructions : $roomInstructions)
                        .font(.hanken(14))
                        .foregroundStyle(Theme.ink)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 96)
                    Text(isHome
                         ? "Standing instructions the assistant follows in every room."
                         : "What the assistant should keep in mind here. Adds to the standing instructions.")
                        .font(.hanken(12))
                        .foregroundStyle(Theme.inkSoft)
                }
                .listRowBackground(Theme.raised)

                if isHome {
                    Section("Response style") {
                        TextEditor(text: $responseStyle)
                            .font(.hanken(14))
                            .foregroundStyle(Theme.ink)
                            .scrollContentBackground(.hidden)
                            .frame(minHeight: 80)
                        Text("How you like answers shaped. Example: short bullet points with a three-sentence intro per section.")
                            .font(.hanken(12))
                            .foregroundStyle(Theme.inkSoft)
                    }
                    .listRowBackground(Theme.raised)
                }

                Section {
                    Button {
                        dismiss()
                        router.showingSettings = true
                    } label: {
                        Label("App settings", systemImage: "gearshape")
                            .font(.hanken(14).weight(.medium))
                            .foregroundStyle(Theme.ink)
                    }
                }
                .listRowBackground(Theme.raised)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle(isHome ? "Assistant" : "Room")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Done") { Task { await save() } }
                        .disabled(saving)
                }
            }
        }
        .task { await load() }
        .accessibilityIdentifier("v2-room-menu")
    }

    static func icon(for kind: VisualTabKind) -> String {
        switch kind {
        case .photo: return "photo"
        case .video, .youtube: return "film"
        case .pdf, .document, .deck: return "doc.text"
        case .web: return "globe"
        case .code: return "chevron.left.forwardslash.chevron.right"
        case .email: return "envelope"
        case .tracker: return "checklist"
        case .genericFile: return "doc"
        }
    }

    private func load() async {
        guard !loaded else { return }
        let all = (try? await ConvexService.shared.request(
            ConvexEndpoint(kind: .query, path: "preferences:getAll", args: [:]),
            as: [String: AnyCodableValue].self)) ?? [:]
        globalInstructions = all["assistant-instructions"]?.stringValue ?? ""
        responseStyle = all["assistant-response-style"]?.stringValue ?? ""
        roomInstructions = all[roomKey]?.stringValue ?? ""
        loaded = true
    }

    private func save() async {
        saving = true
        defer { saving = false }
        var pairs: [(String, String)] = []
        if isHome {
            pairs.append(("assistant-instructions", globalInstructions))
            pairs.append(("assistant-response-style", responseStyle))
        } else {
            pairs.append((roomKey, roomInstructions))
        }
        for (key, value) in pairs {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            let path = trimmed.isEmpty ? "preferences:remove" : "preferences:set"
            var args: [String: Any] = ["key": key]
            if !trimmed.isEmpty { args["value"] = trimmed }
            if let endpoint = try? ConvexEndpoint(kind: .mutation, path: path, args: args) {
                _ = try? await ConvexService.shared.request(endpoint, as: AnyCodableValue.self)
            }
        }
        dismiss()
    }
}

/// Minimal JSON value so `preferences:getAll` (a `[String: any]`) decodes
/// without a fixed shape; only strings are read here.
enum AnyCodableValue: Decodable {
    case string(String), number(Double), bool(Bool), null, other

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null; return }
        if let s = try? c.decode(String.self) { self = .string(s); return }
        if let b = try? c.decode(Bool.self) { self = .bool(b); return }
        if let n = try? c.decode(Double.self) { self = .number(n); return }
        self = .other
    }

    var stringValue: String? {
        if case .string(let s) = self { return s }
        return nil
    }
}
