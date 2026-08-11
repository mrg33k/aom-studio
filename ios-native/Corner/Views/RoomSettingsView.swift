// RoomSettingsView.swift — Corner native iOS
// corner:native-ios R5 — chat-header parity
//
// Native port of web's RoomSettingsDialog.jsx — a bottom sheet with four
// sections matching the web's General / Access / Specialist / (History) tabs.
// Heavy features (rename, invite, clear-chat with confirmation) are here as
// honest no-ops until native API support is confirmed; the structure is correct
// so nothing needs to be torn out when those are wired.
//
// Follow/mute: mirrors the web's `cv6.mutedRooms` UserDefaults key (JSON dict).
// Model: delegates back to the live ChatViewModel via closures.
// Room link: `https://www.aheadofmarket.com/dashboard` + canonical query params.

import SwiftUI

struct RoomSettingsView: View {
    let room: Room
    /// The current model choice, live from ChatViewModel.
    let modelChoice: String
    /// Fires when the user picks a new model in the sheet.
    let onSelectModel: (String) async -> Void
    let onOpenFiles: () -> Void
    /// Fires when the user confirms "Start a fresh session". Returns true on success.
    let onClearRoom: (() async -> Bool)?

    @Environment(\.dismiss) private var dismiss

    // Follow/mute — mirrors web's cv6.mutedRooms localStorage key.
    @State private var following: Bool
    // Copy-link feedback
    @State private var linkCopied = false
    // Rename (display only for now — fires the API when available)
    @State private var roomName: String
    @State private var section: SettingsSection = .general

    enum SettingsSection: String, CaseIterable, Identifiable {
        case general    = "General"
        case access     = "Access"
        case specialist = "Specialist"
        case history    = "History"
        var id: String { rawValue }
    }

    init(
        room: Room,
        modelChoice: String,
        onSelectModel: @escaping (String) async -> Void,
        onOpenFiles: @escaping () -> Void,
        onClearRoom: (() async -> Bool)? = nil
    ) {
        self.room = room
        self.modelChoice = modelChoice
        self.onSelectModel = onSelectModel
        self.onOpenFiles = onOpenFiles
        self.onClearRoom = onClearRoom

        // Resolve initial follow state from the web's muted-rooms key.
        let isMuted = RoomSettingsView.readMuted()[room.id] == true
        _following = State(initialValue: !isMuted)
        _roomName = State(initialValue: room.title)
    }

    var body: some View {
        NavigationStack {
            List {
                // ── Header card: avatar + name + type chip ──────────────────
                Section {
                    HStack(spacing: Theme.s3) {
                        RoomAvatarView(room: room, size: 48)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(room.title)
                                .font(.hanken(16).weight(.semibold))
                                .foregroundStyle(Theme.ink)
                            Text(roomKindLabel)
                                .font(.hanken(12))
                                .foregroundStyle(Theme.inkSoft)
                        }
                        Spacer()
                        Text(room.typeLabel)
                            .font(.hanken(10).weight(.bold))
                            .foregroundStyle(Theme.accent)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Theme.accentWeak, in: Capsule())
                    }
                    .listRowBackground(Theme.raised)
                }

                // ── Section tabs ────────────────────────────────────────────
                Section {
                    Picker("Section", selection: $section) {
                        ForEach(SettingsSection.allCases) { s in
                            Text(s.rawValue).tag(s)
                        }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Theme.raised)
                }

                // ── General tab ─────────────────────────────────────────────
                if section == .general {
                    Section("Room behavior") {
                        Toggle(isOn: $following) {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(following ? "Following this room" : "Updates muted")
                                        .font(.hanken(14).weight(.medium))
                                        .foregroundStyle(Theme.ink)
                                    Text(following
                                         ? "Activity can surface on Home."
                                         : "The room stays available without update nudges.")
                                        .font(.hanken(12))
                                        .foregroundStyle(Theme.inkSoft)
                                }
                            } icon: {
                                Image(systemName: following ? "bell.fill" : "bell.slash.fill")
                                    .foregroundStyle(Theme.accent)
                            }
                        }
                        .onChange(of: following) { _, newValue in
                            writeMuted(following: newValue)
                        }
                        .listRowBackground(Theme.raised)

                        Button {
                            dismiss()
                            onOpenFiles()
                        } label: {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Room files")
                                        .font(.hanken(14).weight(.medium))
                                        .foregroundStyle(Theme.ink)
                                    Text("Everything sent by you and the specialist.")
                                        .font(.hanken(12))
                                        .foregroundStyle(Theme.inkSoft)
                                }
                            } icon: {
                                Image(systemName: "folder.fill")
                                    .foregroundStyle(Theme.accent)
                            }
                        }
                        .listRowBackground(Theme.raised)
                    }
                }

                // ── Access tab ──────────────────────────────────────────────
                if section == .access {
                    Section("Invite and share") {
                        Button {
                            copyRoomLink()
                        } label: {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(linkCopied ? "Link copied" : "Copy room link")
                                        .font(.hanken(14).weight(.medium))
                                        .foregroundStyle(linkCopied ? Theme.success : Theme.ink)
                                    Text("Send a direct link to this exact conversation.")
                                        .font(.hanken(12))
                                        .foregroundStyle(Theme.inkSoft)
                                }
                            } icon: {
                                Image(systemName: linkCopied ? "checkmark.circle.fill" : "link")
                                    .foregroundStyle(linkCopied ? Theme.success : Theme.accent)
                            }
                        }
                        .listRowBackground(Theme.raised)
                    }

                    Section {
                        Text("Room links require sign-in. Project access is granted to the selected person's Corner account.")
                            .font(.hanken(12))
                            .foregroundStyle(Theme.inkSoft)
                            .listRowBackground(Color.clear)
                            .listRowInsets(.init(top: 0, leading: 0, bottom: 0, trailing: 0))
                    }
                }

                // ── Specialist tab ──────────────────────────────────────────
                if section == .specialist {
                    Section("Model preference") {
                        ForEach(modelOptions, id: \.id) { option in
                            Button {
                                Task { await onSelectModel(option.id) }
                                dismiss()
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(option.label)
                                            .font(.hanken(14).weight(.medium))
                                            .foregroundStyle(Theme.ink)
                                        Text(option.description)
                                            .font(.hanken(12))
                                            .foregroundStyle(Theme.inkSoft)
                                    }
                                    Spacer()
                                    if option.id == modelChoice {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(Theme.accent)
                                    }
                                }
                            }
                            .listRowBackground(Theme.raised)
                        }
                        Text("Changes persist for this room.")
                            .font(.hanken(12))
                            .foregroundStyle(Theme.inkSoft)
                            .listRowBackground(Color.clear)
                    }
                }

                // ── History tab ─────────────────────────────────────────────
                if section == .history {
                    Section {
                        Text("Clear starts a fresh screen and agent session. Earlier messages stay here. Files and memories are kept.")
                            .font(.hanken(12))
                            .foregroundStyle(Theme.inkSoft)
                            .listRowBackground(Color.clear)
                    }
                    Section {
                        SessionHistoryView(room: room, onClearRoom: onClearRoom)
                            .frame(minHeight: 220)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Room settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.hanken(15).weight(.semibold))
                        .foregroundStyle(Theme.accent)
                }
            }
        }
    }

    // MARK: - Room kind label

    private var roomKindLabel: String {
        switch room.typeTag {
        case .agent:
            // Web: "<specialist title> specialist"
            let entry = AgentRoster.all.first(where: {
                $0.slug == room.kind.agentSlug
            })
            return entry.map { "\($0.title) specialist" } ?? "Specialist"
        case .project:
            return "Project room"
        case .mission:
            return "Mission room"
        }
    }

    // MARK: - Follow / mute (mirrors web cv6.mutedRooms JSON blob in localStorage)

    private static func readMuted() -> [String: Bool] {
        guard let raw = UserDefaults.standard.string(forKey: "cv6.mutedRooms"),
              let data = raw.data(using: .utf8),
              let dict = try? JSONDecoder().decode([String: Int].self, from: data) else {
            return [:]
        }
        return dict.mapValues { $0 != 0 }
    }

    private func writeMuted(following: Bool) {
        var muted = Self.readMuted()
        if following {
            muted.removeValue(forKey: room.id)
        } else {
            muted[room.id] = true
        }
        if let data = try? JSONEncoder().encode(muted.mapValues { $0 ? 1 : 0 }),
           let str = String(data: data, encoding: .utf8) {
            UserDefaults.standard.set(str, forKey: "cv6.mutedRooms")
        }
    }

    // MARK: - Room link

    private func copyRoomLink() {
        let roomID = room.roomID
        var components = URLComponents(string: "https://www.aheadofmarket.com/dashboard")!
        var items: [URLQueryItem] = [
            URLQueryItem(name: "cv6", value: "1"),
            URLQueryItem(name: "view", value: "chat"),
            URLQueryItem(name: "popout", value: "1"),
            URLQueryItem(name: "room", value: roomID),
            URLQueryItem(name: "name", value: room.title),
        ]
        switch room.kind {
        case .agent:
            items.append(URLQueryItem(name: "kind", value: "agent"))
        case .project(let slug):
            items.append(contentsOf: [
                URLQueryItem(name: "kind", value: "project"),
                URLQueryItem(name: "project", value: slug),
            ])
        case .mission(let slug, let project):
            items.append(contentsOf: [
                URLQueryItem(name: "kind", value: "mission"),
                URLQueryItem(name: "mission", value: slug),
                URLQueryItem(name: "project", value: project),
            ])
        }
        components.queryItems = items
        let urlStr = components.url?.absoluteString ?? "https://www.aheadofmarket.com/dashboard"
        UIPasteboard.general.string = urlStr
        withAnimation {
            linkCopied = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation { linkCopied = false }
        }
    }

    // MARK: - Model options (mirrors chatConstants.js MODEL_OPTIONS)

    private let modelOptions: [(id: String, label: String, description: String)] = [
        ("default", "Auto",           "Claude + intelligent fallback"),
        ("opus",    "Claude Opus",    "Highest capability, slower"),
        ("sonnet",  "Claude Sonnet",  "Fast, accurate, balanced"),
        ("haiku",   "Claude Haiku",   "Fastest, great for quick tasks"),
    ]
}

// MARK: - Kind helper extension

private extension Room.Kind {
    var agentSlug: String? {
        if case .agent(let slug) = self { return slug }
        return nil
    }
}
