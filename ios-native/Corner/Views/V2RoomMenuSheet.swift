// V2RoomMenuSheet.swift — Corner native iOS
// Patrik 2026-09-15: tapping the room name/bubble in the header opens this
// room's menu. Redesigned per Patrik's ask into the room's full context
// view: what the agent has at its disposal, organized and bubbly — Truth,
// Notes, Files by category, Journal, Instructions, and a real room menu
// (rename, move, sub-mission, archive). Backed by v2Workspace:roomContext,
// built in parallel by the backend lane; every section degrades to empty
// rather than erroring the whole sheet if that query throws or is missing.

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

    @State private var roomContext: RoomContext?
    @State private var contextLoaded = false
    @State private var appeared = false

    // Manage room
    @State private var renaming = false
    @State private var newName = ""
    @State private var moving = false
    @State private var archiving = false
    @State private var busy = false

    private var isHome: Bool { context.mission == nil && context.project.kind == .general }
    private var roomKey: String { "assistant-instructions:\(context.thread.id)" }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    header
                        .roomMenuReveal(appeared, index: 0)

                    if !isHome {
                        contextSections
                    }

                    instructionsCard
                        .roomMenuReveal(appeared, index: 5)

                    if isHome {
                        responseStyleCard
                            .roomMenuReveal(appeared, index: 6)
                    } else {
                        manageCard
                            .roomMenuReveal(appeared, index: 6)
                    }

                    settingsRow
                        .roomMenuReveal(appeared, index: 7)
                }
                .padding(16)
            }
            .background(Theme.ground)
            .navigationTitle(isHome ? "Assistant" : "Room")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Done") { Task { await save() } }
                        .disabled(saving)
                }
            }
            .alert("Rename room", isPresented: $renaming) {
                TextField("Name", text: $newName)
                Button("Cancel", role: .cancel) {}
                Button("Save") { Task { await renameRoom() } }
            }
            .confirmationDialog("Move to another project", isPresented: $moving, titleVisibility: .visible) {
                ForEach(moveTargets) { project in
                    Button(project.name) { Task { await moveRoom(to: project) } }
                }
                Button("Cancel", role: .cancel) {}
            }
            .confirmationDialog("Archive this room?", isPresented: $archiving, titleVisibility: .visible) {
                Button("Archive", role: .destructive) { Task { await archiveRoom() } }
                Button("Cancel", role: .cancel) {}
            }
        }
        .task {
            await load()
            await loadRoomContext()
            withAnimation(.easeOut(duration: 0.32)) { appeared = true }
        }
        .accessibilityIdentifier("v2-room-menu")
    }

    private var settingsRow: some View {
        Button {
            dismiss()
            router.showingSettings = true
        } label: {
            Label("App settings", systemImage: "gearshape")
                .font(.hanken(14).weight(.medium))
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var header: some View {
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
        .padding(14)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Truth / Notes / Journal

    @ViewBuilder
    private var contextSections: some View {
        truthCard.roomMenuReveal(appeared, index: 1)
        notesCard.roomMenuReveal(appeared, index: 2)
        filesCard.roomMenuReveal(appeared, index: 3)
        journalCard.roomMenuReveal(appeared, index: 4)
    }

    private var truthCard: some View {
        let facts = roomContext?.facts ?? []
        return RoomContextCard(
            title: "Truth", icon: "checkmark.seal.fill", tint: Theme.accent,
            count: facts.count, emptyText: "No standing facts saved for this room yet."
        ) {
            ForEach(facts) { fact in
                RoomContextRow(icon: "checkmark.seal", tint: Theme.accent, title: fact.text, subtitle: nil)
            }
        }
    }

    private var notesCard: some View {
        let notes = roomContext?.notes ?? []
        return RoomContextCard(
            title: "Notes", icon: "note.text", tint: .yellow,
            count: notes.count, emptyText: "No notes for this room yet."
        ) {
            ForEach(notes) { note in
                RoomContextRow(icon: "note.text", tint: .yellow, title: note.title, subtitle: note.text)
            }
        }
    }

    private var journalCard: some View {
        let entries = roomContext?.journal ?? []
        return RoomContextCard(
            title: "Journal", icon: "clock.arrow.circlepath", tint: .purple,
            count: entries.count, emptyText: "Nothing logged in this room's journal yet."
        ) {
            ForEach(entries) { entry in
                RoomContextRow(icon: "circle.fill", tint: .purple.opacity(0.7), title: entry.text,
                               subtitle: V2RoomMenuSheet.dayLabel(entry.date), compact: true)
            }
        }
    }

    // MARK: - Files

    private var filesCard: some View {
        let files = roomContext?.files ?? []
        let grouped = V2RoomMenuSheet.grouped(files)
        return RoomContextCard(
            title: "Files",
            icon: "folder.fill",
            tint: .blue,
            count: files.count,
            emptyText: "Nothing here yet. Files you send or the assistant makes land here."
        ) {
            ForEach(grouped, id: \.category.title) { group in
                FileCategoryGroup(group: group) { file in
                    Task {
                        try? await window.open(file.tabKind, threadID: context.thread.id,
                                               artifactID: file.id, title: file.title, state: [:])
                        dismiss()
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
            .padding(.top, 2)
        }
    }

    static func grouped(_ files: [RoomContextFile]) -> [(category: FileCategory, files: [RoomContextFile])] {
        var buckets: [FileCategory: [RoomContextFile]] = [:]
        for file in files { buckets[file.category, default: []].append(file) }
        return FileCategory.allCases.compactMap { cat in
            guard let items = buckets[cat], !items.isEmpty else { return nil }
            return (cat, items)
        }
    }

    static func dayLabel(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return "Today" }
        if Calendar.current.isDateInYesterday(date) { return "Yesterday" }
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f.string(from: date)
    }

    // MARK: - Instructions / response style

    private var instructionsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(isHome ? "Assistant instructions" : "Instructions for this room")
                .font(.hanken(14).weight(.semibold))
                .foregroundStyle(Theme.ink)
            TextEditor(text: isHome ? $globalInstructions : $roomInstructions)
                .font(.hanken(14))
                .foregroundStyle(Theme.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 96)
                .padding(8)
                .background(Theme.ground, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            Text(isHome
                 ? "Standing instructions the assistant follows in every room."
                 : "What the assistant should keep in mind here. Adds to the standing instructions.")
                .font(.hanken(12))
                .foregroundStyle(Theme.inkSoft)
        }
        .padding(14)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var responseStyleCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Response style")
                .font(.hanken(14).weight(.semibold))
                .foregroundStyle(Theme.ink)
            TextEditor(text: $responseStyle)
                .font(.hanken(14))
                .foregroundStyle(Theme.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 80)
                .padding(8)
                .background(Theme.ground, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            Text("How you like answers shaped. Example: short bullet points with a three-sentence intro per section.")
                .font(.hanken(12))
                .foregroundStyle(Theme.inkSoft)
        }
        .padding(14)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Manage room

    private var moveTargets: [ProjectSummary] {
        (WorkspaceStore.shared.workspace?.projects ?? []).filter { $0.id != context.project.id }
    }

    private var manageCard: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Manage room")
                .font(.hanken(14).weight(.semibold))
                .foregroundStyle(Theme.ink)
                .padding(.bottom, 8)

            manageRow(icon: "pencil", label: "Rename") {
                newName = context.title
                renaming = true
            }
            Divider().overlay(Theme.hairline)
            manageRow(icon: "folder.badge.gearshape", label: "Move to another project", disabled: moveTargets.isEmpty) {
                moving = true
            }
            Divider().overlay(Theme.hairline)
            manageRow(icon: "arrow.triangle.branch", label: "Convert to sub-mission", disabled: true, note: "Coming soon") {}
            Divider().overlay(Theme.hairline)
            manageRow(icon: "archivebox", label: "Archive", tint: Theme.warning) {
                archiving = true
            }
        }
        .padding(14)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .disabled(busy)
        .opacity(busy ? 0.6 : 1)
    }

    private func manageRow(icon: String, label: String, tint: Color? = nil, disabled: Bool = false,
                            note: String? = nil, action: @escaping () -> Void) -> some View {
        let tint = tint ?? Theme.ink
        return Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon).foregroundStyle(disabled ? Theme.inkFaint : tint).frame(width: 22)
                Text(label)
                    .font(.hanken(14))
                    .foregroundStyle(disabled ? Theme.inkFaint : tint)
                Spacer(minLength: 0)
                if let note {
                    Text(note).font(.hanken(12)).foregroundStyle(Theme.inkFaint)
                }
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .disabled(disabled)
    }

    // MARK: - Load

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

    private func loadRoomContext() async {
        guard !contextLoaded, !isHome else { contextLoaded = true; return }
        guard let endpoint = try? ConvexEndpoint(kind: .query, path: "v2Workspace:roomContext", args: ["threadId": context.thread.id]) else {
            contextLoaded = true
            return
        }
        // Every section degrades to empty rather than the sheet erroring —
        // the backend query is still landing when this lane ships.
        roomContext = try? await ConvexService.shared.request(endpoint, as: RoomContext.self)
        contextLoaded = true
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

    private func renameRoom() async {
        let name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        busy = true
        defer { busy = false }
        let path = context.mission != nil ? "v2Projects:renameMission" : "v2Projects:renameProject"
        let idKey = context.mission != nil ? "missionId" : "projectId"
        let idValue = context.mission?.id ?? context.project.id
        if let endpoint = try? ConvexEndpoint(kind: .mutation, path: path, args: [idKey: idValue, "name": name]) {
            _ = try? await ConvexService.shared.request(endpoint, as: AnyCodableValue.self)
        }
    }

    private func moveRoom(to project: ProjectSummary) async {
        guard let missionID = context.mission?.id else { return }
        busy = true
        defer { busy = false }
        if let endpoint = try? ConvexEndpoint(kind: .mutation, path: "v2Projects:moveMission",
                                               args: ["missionId": missionID, "targetProjectId": project.id]) {
            _ = try? await ConvexService.shared.request(endpoint, as: AnyCodableValue.self)
            dismiss()
        }
    }

    private func archiveRoom() async {
        busy = true
        defer { busy = false }
        let path = context.mission != nil ? "v2Projects:archiveMission" : "v2Projects:archiveProject"
        let idKey = context.mission != nil ? "missionId" : "projectId"
        let idValue = context.mission?.id ?? context.project.id
        if let endpoint = try? ConvexEndpoint(kind: .mutation, path: path, args: [idKey: idValue]) {
            _ = try? await ConvexService.shared.request(endpoint, as: AnyCodableValue.self)
            dismiss()
        }
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
}

// MARK: - Reveal animation

private struct RoomMenuReveal: ViewModifier {
    let appeared: Bool
    let index: Int
    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 10)
            .animation(.spring(response: 0.45, dampingFraction: 0.85).delay(Double(index) * 0.04), value: appeared)
    }
}

private extension View {
    func roomMenuReveal(_ appeared: Bool, index: Int) -> some View {
        modifier(RoomMenuReveal(appeared: appeared, index: index))
    }
}

// MARK: - Section card

private struct RoomContextCard<Content: View>: View {
    let title: String
    let icon: String
    let tint: Color
    let count: Int
    let emptyText: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.hanken(13).weight(.semibold))
                    .foregroundStyle(tint)
                    .frame(width: 26, height: 26)
                    .background(tint.opacity(0.16), in: Circle())
                Text(title)
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                if count > 0 {
                    Text("\(count)")
                        .font(.hanken(11).weight(.bold).monospacedDigit())
                        .foregroundStyle(Theme.inkFaint)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Theme.ground, in: Capsule())
                }
                Spacer(minLength: 0)
            }
            if count == 0 {
                Text(emptyText)
                    .font(.hanken(13))
                    .foregroundStyle(Theme.inkSoft)
            } else {
                VStack(alignment: .leading, spacing: 8) { content }
            }
        }
        .padding(14)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct RoomContextRow: View {
    let icon: String
    let tint: Color
    let title: String
    let subtitle: String?
    var compact: Bool = false

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.hanken(11))
                .foregroundStyle(tint)
                .frame(width: 16)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.hanken(compact ? 12 : 14))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(compact ? 2 : 3)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.hanken(11))
                        .foregroundStyle(Theme.inkFaint)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

// MARK: - Files by category

enum FileCategory: String, CaseIterable {
    case documents, decks, images, video, web, code, email, other

    var title: String {
        switch self {
        case .documents: return "Documents"
        case .decks: return "Decks"
        case .images: return "Images"
        case .video: return "Video"
        case .web: return "Web"
        case .code: return "Code"
        case .email: return "Email"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .documents: return "doc.text.fill"
        case .decks: return "rectangle.stack.fill"
        case .images: return "photo.fill"
        case .video: return "film.fill"
        case .web: return "globe"
        case .code: return "chevron.left.forwardslash.chevron.right"
        case .email: return "envelope.fill"
        case .other: return "doc.fill"
        }
    }

    var tint: Color {
        switch self {
        case .documents: return .blue
        case .decks: return .orange
        case .images: return .pink
        case .video: return .red
        case .web: return .teal
        case .code: return .green
        case .email: return .indigo
        case .other: return .gray
        }
    }
}

private struct FileCategoryGroup: View {
    let group: (category: FileCategory, files: [RoomContextFile])
    let open: (RoomContextFile) -> Void
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: group.category.icon)
                    .font(.hanken(10))
                    .foregroundStyle(group.category.tint)
                Text(group.category.title)
                    .font(.hanken(12).weight(.semibold))
                    .foregroundStyle(Theme.inkSoft)
                Text("\(group.files.count)")
                    .font(.hanken(10).weight(.bold).monospacedDigit())
                    .foregroundStyle(Theme.inkFaint)
            }
            ForEach(Array(group.files.prefix(expanded ? group.files.count : 6))) { file in
                Button { open(file) } label: {
                    HStack(spacing: 8) {
                        Text(file.title)
                            .font(.hanken(13))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                    }
                    .contentShape(Rectangle())
                }
            }
            if group.files.count > 6 {
                Button(expanded ? "Show less" : "Show all \(group.files.count)") {
                    withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
                }
                .font(.hanken(12).weight(.medium))
                .foregroundStyle(Theme.accent)
            }
        }
    }
}

// MARK: - Room context DTOs

struct RoomFact: Codable, Identifiable {
    let id: String
    let text: String
    let at: Double
}

struct RoomNote: Codable, Identifiable {
    let id: String
    let title: String
    let text: String
    let at: Double
}

struct RoomJournalEntry: Codable, Identifiable {
    let id: String
    let text: String
    let at: Double
    var date: Date { Date(timeIntervalSince1970: at / 1000) }
}

struct RoomContextFile: Codable, Identifiable {
    let id: String
    let title: String
    let kind: String
    let at: Double

    var tabKind: VisualTabKind {
        VisualTabKind(rawValue: kind) ?? .genericFile
    }

    var category: FileCategory {
        switch kind {
        case "pdf", "document": return .documents
        case "deck": return .decks
        case "photo": return .images
        case "video", "youtube": return .video
        case "web": return .web
        case "code": return .code
        case "email": return .email
        default: return .other
        }
    }
}

struct RoomContext: Codable {
    struct ProjectRef: Codable { let id: String; let name: String }
    struct MissionRef: Codable { let id: String; let title: String }

    let project: ProjectRef?
    let mission: MissionRef?
    let facts: [RoomFact]
    let notes: [RoomNote]
    let journal: [RoomJournalEntry]
    let files: [RoomContextFile]
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
