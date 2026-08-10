// OrganizeView.swift — Corner native iOS
// corner:native-ios Stage 3
//
// Files: pick a project, browse it, open a file, decide on it or hand it to someone.
//
// TWO SCREENS, NOT THREE. The web's mobile Organize is picker → browse → a bespoke
// full-screen viewer with its own PDF canvas stack, docx converter, pinch-zoom rig and
// pin overlay. On iOS the third screen is the system's: QuickLook already renders
// images, PDFs, video, audio and Office documents with gestures nobody has to build, and
// FilePreviewView (Stage 2) already wraps it with the review bar and the share sheet. So
// a file tapped here opens through the SAME sheet a file tapped in a room opens through,
// which is the reason a verdict given in either place behaves identically.
//
// WHAT THE NEEDS-REVIEW CHIP MEANS. It is the one chip whose count can exceed the files
// on disk, because a waiting deliverable whose disk row is gone still wants a verdict —
// the server ships those as ghosts and they appear under this chip and nowhere else. A
// chip reading 3 over a list of 0 was a real defect (2026-07-13); the count and the list
// here are computed from one array in one pass so they cannot disagree.
//
// MOVE IS NOT HERE, AND THAT IS DELIBERATE. There is no endpoint that moves a file. The
// web's own Organize wires the control to `moveFile: () => {}` — an inert handler behind
// a real-looking button. The endpoints that do exist (`mission-move`, `project-update`)
// move MISSIONS and rename PROJECTS, which is a different, destructive surface. A button
// that silently does nothing is worse than no button, so this screen ships the actions
// that are real — open, review, assign — and says nothing it cannot do.

import SwiftUI

struct OrganizeView: View {
    @EnvironmentObject private var api: CornerAPI
    @StateObject private var store = OrganizeStore()
    @StateObject private var review = ReviewStore.shared

    var body: some View {
        Group {
            if api.world == nil {
                NoWorkspaceNotice()
            } else if store.openProject == nil {
                projectPicker
            } else {
                folder
            }
        }
        .background(Theme.ground)
        .navigationTitle(store.openProject?.name ?? "Files")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if store.openProject != nil {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        store.closeFolder()
                    } label: {
                        Label("Projects", systemImage: "chevron.left")
                    }
                }
            }
        }
        .task {
            if !store.hasLoadedPicker { await store.loadProjects() }
            review.startPolling()
        }
    }

    // MARK: - Picker

    @ViewBuilder
    private var projectPicker: some View {
        List {
            if review.waitingCount > 0 {
                Section {
                    Button {
                        // Straight into triage: the first waiting file's project, with the
                        // needs filter already on. Landing on a picker when something is
                        // waiting makes the user do the routing themselves.
                        let first = review.items.first
                        let slug = (first?.project.isEmpty == false) ? first!.project : OrganizeProject.personalID
                        let project = store.projects.first { $0.id == slug } ?? .personal
                        store.open(project)
                        store.filter = .needs
                    } label: {
                        HStack(spacing: Theme.s3) {
                            Image(systemName: "tray.full")
                                .font(.footnote)
                                .foregroundStyle(Theme.warning)
                                .frame(width: 34, height: 34)
                                .background(Theme.warning.opacity(0.16), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(review.waitingCount == 1 ? "1 file needs your review" : "\(review.waitingCount) files need your review")
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(Theme.ink)
                                Text("Start with the newest hand-off")
                                    .font(.caption)
                                    .foregroundStyle(Theme.inkSoft)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Theme.inkFaint)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(Theme.raised.opacity(0.6))
                }
            }

            switch store.pickerState {
            case .loading:
                Section {
                    HStack(spacing: Theme.s2) {
                        ProgressView().controlSize(.small)
                        Text("Loading your projects…").font(.footnote).foregroundStyle(Theme.inkSoft)
                    }
                }
                .listRowBackground(Theme.raised.opacity(0.6))
            case .error(let message):
                Section {
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Label(message, systemImage: "exclamationmark.triangle")
                            .font(.footnote)
                            .foregroundStyle(Theme.warning)
                        Button("Try again") { Task { await store.loadProjects() } }
                            .font(.footnote.weight(.semibold))
                    }
                }
                .listRowBackground(Theme.raised.opacity(0.6))
            default:
                Section("Projects") {
                    ForEach(store.projects) { project in
                        Button { store.open(project) } label: {
                            HStack(spacing: Theme.s3) {
                                Image(systemName: project.isPersonal ? "person.crop.square" : "folder")
                                    .font(.footnote)
                                    .foregroundStyle(project.isPersonal ? Theme.accent : Theme.inkSoft)
                                    .frame(width: 34, height: 34)
                                    .background(Theme.raised, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name)
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(Theme.ink)
                                    if project.isPersonal {
                                        Text("Files you dropped into 1:1 chats")
                                            .font(.caption)
                                            .foregroundStyle(Theme.inkSoft)
                                    }
                                }
                                Spacer(minLength: 0)
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Theme.inkFaint)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Theme.raised.opacity(0.6))
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .refreshable { await store.loadProjects() }
    }

    // MARK: - Folder

    @ViewBuilder
    private var folder: some View {
        OrganizeFolderView(store: store, world: api.world ?? "")
            .task(id: store.openProject?.id) { await store.loadOpenFolder() }
    }
}

// MARK: - The folder

/// Split out of `OrganizeView` so the file list can be rendered on its own — by the
/// gallery, and by anything that wants the folder without the navigation chrome.
struct OrganizeFolderView: View {
    @ObservedObject var store: OrganizeStore
    let world: String

    @State private var opened: OrganizeFile?
    @State private var assigning: OrganizeFile?

    var body: some View {
        VStack(spacing: 0) {
            chips
            list
        }
        .background(Theme.ground)
        .sheet(item: $opened) { file in
            FilePreviewView(
                attachment: file.asAttachment(world: world),
                reviewContext: FilePreviewView.ReviewContext(
                    project: file.project == OrganizeProject.personalID ? "" : file.project,
                    mission: file.missionKey ?? "",
                    // Your own uploads are never in the waiting set — the server's rule,
                    // not a guess here: agent deliverables need review, your uploads do not.
                    isWaiting: file.needsReview
                ),
                onAssign: { assigning = file }
            )
        }
        .sheet(item: $assigning) { file in
            AssignSheet(
                artifactType: "file",
                artifactID: file.reviewID.isEmpty ? file.address(world: world) : file.reviewID,
                label: file.name,
                project: file.project == OrganizeProject.personalID ? nil : file.project
            )
            .environmentObject(CornerAPI.shared)
        }
    }

    // MARK: Chips

    private var chips: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.s2) {
                    ForEach(store.availableFilters) { filter in
                        chip(
                            label: filter.label,
                            count: filter == .recent ? store.missionScoped.count : store.count(for: filter),
                            isOn: store.filter == filter,
                            tint: filter == .needs ? Theme.warning : Theme.accent
                        ) { store.filter = filter }
                    }
                }
                .padding(.horizontal, Theme.s4)
            }
            if !store.missionChips.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.s2) {
                        chip(label: "All", count: store.files.count, isOn: store.missionKey == nil, tint: Theme.accent) {
                            store.missionKey = nil
                        }
                        ForEach(store.missionChips, id: \.key) { mission in
                            chip(
                                label: mission.label,
                                count: mission.count,
                                isOn: store.missionKey == mission.key,
                                tint: Theme.accent
                            ) { store.missionKey = mission.key }
                        }
                    }
                    .padding(.horizontal, Theme.s4)
                }
            }
        }
        .padding(.vertical, Theme.s3)
        .background(Theme.ground)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.hairline).frame(height: 1) }
    }

    private func chip(label: String, count: Int, isOn: Bool, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: Theme.s1 + 2) {
                Text(label)
                    .font(.caption.weight(.semibold))
                if count > 0 {
                    Text("\(count)")
                        .font(.caption2.weight(.bold).monospacedDigit())
                        .foregroundStyle(isOn ? Theme.ground.opacity(0.7) : Theme.inkFaint)
                }
            }
            .foregroundStyle(isOn ? Theme.ground : Theme.ink)
            .padding(.horizontal, Theme.s3)
            .padding(.vertical, 6)
            .background(isOn ? tint : Theme.raised, in: Capsule())
            .overlay(Capsule().strokeBorder(Theme.hairline, lineWidth: isOn ? 0 : 1))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? [.isButton, .isSelected] : .isButton)
    }

    // MARK: List

    @ViewBuilder
    private var list: some View {
        switch store.folderState {
        case .idle, .loading:
            VStack(spacing: Theme.s3) {
                ProgressView()
                Text("Opening \(store.openProject?.name ?? "the folder")…")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .error(let message):
            VStack(spacing: Theme.s3) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.title)
                    .foregroundStyle(Theme.warning)
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.s5)
                Button("Try again") { Task { await store.loadOpenFolder() } }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .ready:
            if store.visible.isEmpty {
                emptyState
            } else {
                List {
                    if store.truncated {
                        // The server hit its own row cap. Said out loud, because a
                        // silently short list is the worst kind of wrong.
                        Label("This folder has more files than one load can carry. Search narrows it.", systemImage: "info.circle")
                            .font(.caption)
                            .foregroundStyle(Theme.inkSoft)
                            .listRowBackground(Theme.raised.opacity(0.6))
                    }
                    ForEach(store.visible) { file in
                        Button { opened = file } label: { row(file) }
                            .buttonStyle(.plain)
                            .listRowBackground(Theme.raised.opacity(0.6))
                            .swipeActions(edge: .trailing) {
                                Button {
                                    assigning = file
                                } label: {
                                    Label("Assign", systemImage: "person.crop.circle.badge.plus")
                                }
                                .tint(Theme.accent)
                            }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .searchable(text: $store.query, prompt: "Search this folder")
                .refreshable { await store.loadOpenFolder() }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.s2) {
            Text(emptyTitle)
                .font(.headline)
                .foregroundStyle(Theme.ink)
            Text(emptyBody)
                .font(.footnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
        }
        .padding(Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyTitle: String {
        if store.filter == .needs { return "Nothing here to review" }
        if !store.query.isEmpty { return "No file matches" }
        if store.openProject?.isPersonal == true { return "Nothing personal yet" }
        return "No files here yet"
    }

    private var emptyBody: String {
        if store.filter == .needs {
            let elsewhere = store.waitingTotal
            if elsewhere > 0 {
                return elsewhere == 1
                    ? "One file is waiting in another room."
                    : "\(elsewhere) files are waiting across your other rooms."
            }
            return "Nothing your crew flagged is waiting on you."
        }
        if !store.query.isEmpty { return "Try a shorter search." }
        if store.openProject?.isPersonal == true { return "Files you drop into 1:1 chats land here." }
        return "Files your crew produces in this room will land here."
    }

    // MARK: Row

    private func row(_ file: OrganizeFile) -> some View {
        HStack(spacing: Theme.s3) {
            Image(systemName: file.kind.symbol)
                .font(.footnote)
                .foregroundStyle(file.needsReview ? Theme.warning : Theme.inkSoft)
                .frame(width: 32, height: 32)
                .background(
                    (file.needsReview ? Theme.warning.opacity(0.14) : Theme.ground),
                    in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(file.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Text(subtitle(for: file))
                    .font(.caption2)
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(1)
            }
            Spacer(minLength: Theme.s2)
            if file.needsReview {
                Text("REVIEW")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Theme.ground)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Theme.warning, in: Capsule())
            }
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
    }

    /// Everything true about a row, in the order it is useful, and NOTHING that is not.
    /// A ghost says so: its bytes may be gone, and finding that out by tapping is worse
    /// than being told.
    private func subtitle(for file: OrganizeFile) -> String {
        var parts: [String] = []
        if file.isGhost { parts.append("Shared for review") }
        else if file.isUpload { parts.append("You sent") }
        if !file.sizeLabel.isEmpty { parts.append(file.sizeLabel) }
        if let mission = file.missionKey { parts.append(Room.prettify(mission)) }
        if let date = file.date { parts.append(OrganizeFolderView.relative.localizedString(for: date, relativeTo: Date())) }
        return parts.joined(separator: " · ")
    }

    static let relative: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .short
        return f
    }()
}

// MARK: - Shared notice

/// The app refuses to guess a workspace — defaulting one is the cross-tenant leak the
/// web closed on 2026-05-24, and on a phone it would be completely silent.
struct NoWorkspaceNotice: View {
    var body: some View {
        VStack(spacing: Theme.s2) {
            Text("No workspace on this account")
                .font(.headline)
                .foregroundStyle(Theme.ink)
            Text("Sign in with the login you use on the web, or ask whoever invited you to finish setting up your account.")
                .font(.footnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
        }
        .padding(Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
