// NewRoomSheet.swift — Corner native iOS
// corner:native-ios — "+ New" creation flow (native counterpart of NewComposer.jsx).
//
// One sheet, two tabs via a Picker: "Start a mission" and "New project". Matches the
// web's cv6next/NewComposer.jsx fields exactly so the same endpoints and the same
// guarantees apply — the web and the phone create rooms through an identical contract.
//
// Mission: optional name, required goal, project selector, agent selector, priority
// (Low / Med / High), when (Now / This week). Goal is posted as the opening note so
// nothing typed is lost (same as createMissionInProject).
//
// Project: required name, optional about. About is posted into the new room so the
// agent can self-build around it (same as createProjectFromHome).
//
// On a confirmed create the sheet dismisses and the caller's onCreated(Room) handler
// fires — the caller opens the room and refreshes the rail.

import SwiftUI

// MARK: - Sheet view model

@MainActor
final class NewRoomModel: ObservableObject {

    enum Mode: String, CaseIterable {
        case mission = "mission"
        case project = "project"
    }

    enum Phase: Equatable { case idle, creating, done }

    @Published var mode: Mode = .mission

    // Mission fields
    @Published var missionName = ""
    @Published var goal = ""
    @Published var selectedProjectSlug: String = ""
    @Published var selectedAgentId: String = "__auto"   // "__auto" = no assignment
    @Published var priority: String = "med"             // low / med / high
    @Published var whenValue: String = "now"            // now / this-week

    // Project fields
    @Published var projectName = ""
    @Published var about = ""

    // Data
    @Published var projects: [CornerAPI.ProjectRow] = []
    @Published var loadingProjects = true

    // Submit state
    @Published var phase: Phase = .idle
    @Published var errorText: String?

    private let api = CornerAPI.shared

    // Agents: Auto first, then the resolved roster by title.
    var agentOptions: [(id: String, title: String)] {
        [("__auto", "Auto")] + AgentRoster.resolved.map { ($0.slug, $0.title) }
    }

    func loadProjects() async {
        loadingProjects = true
        let rows = (try? await api.fetchProjects()) ?? []
        projects = rows
        if selectedProjectSlug.isEmpty, let first = rows.first {
            selectedProjectSlug = first.slug ?? ""
        }
        loadingProjects = false
    }

    var canSubmit: Bool {
        switch mode {
        case .mission: return !goal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !selectedProjectSlug.isEmpty && phase == .idle
        case .project: return !projectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && phase == .idle
        }
    }

    func submit(onCreated: @escaping (Room) -> Void) {
        guard canSubmit else { return }
        errorText = nil
        phase = .creating
        Task { [weak self] in
            guard let self else { return }
            do {
                let room: Room
                switch self.mode {
                case .mission:
                    let agentName = self.selectedAgentId == "__auto" ? "" :
                        (AgentRoster.resolved.first { $0.slug == self.selectedAgentId }?.title ?? "")
                    let priLabel: String = switch self.priority {
                        case "low": "Low"; case "high": "High"; default: "Medium"
                    }
                    let whenLabel: String = self.whenValue == "this-week" ? "This week" : "Now"
                    room = try await self.api.createMission(
                        projectSlug: self.selectedProjectSlug,
                        title: self.missionName.trimmingCharacters(in: .whitespacesAndNewlines),
                        goal: self.goal.trimmingCharacters(in: .whitespacesAndNewlines),
                        agentName: agentName,
                        priority: priLabel,
                        when: whenLabel
                    )
                case .project:
                    room = try await self.api.createProject(
                        name: self.projectName.trimmingCharacters(in: .whitespacesAndNewlines),
                        about: self.about.trimmingCharacters(in: .whitespacesAndNewlines)
                    )
                }
                self.phase = .done
                onCreated(room)
            } catch let err as CornerAPI.APIError {
                self.errorText = err.errorDescription ?? "Something went wrong."
                self.phase = .idle
            } catch {
                self.errorText = error.localizedDescription
                self.phase = .idle
            }
        }
    }
}

// MARK: - The sheet

struct NewRoomSheet: View {
    @StateObject private var model = NewRoomModel()
    let onCreated: (Room) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s4) {

                    // Mode tabs — same two-tab shape as the web (mission | project).
                    Picker("", selection: $model.mode) {
                        Label("Mission", systemImage: "scope").tag(NewRoomModel.Mode.mission)
                        Label("Project", systemImage: "folder").tag(NewRoomModel.Mode.project)
                    }
                    .pickerStyle(.segmented)
                    .padding(.top, Theme.s1)

                    // Error banner
                    if let err = model.errorText {
                        Label(err, systemImage: "exclamationmark.triangle.fill")
                            .font(.hkFootnote.weight(.medium))
                            .foregroundStyle(Theme.warning)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if model.mode == .mission {
                        missionForm
                    } else {
                        projectForm
                    }
                }
                .padding(Theme.s4)
            }
            .background(Theme.ground)
            .navigationTitle(model.mode == .mission ? "Start a mission" : "New project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(model.phase == .creating)
                }
                ToolbarItem(placement: .confirmationAction) {
                    submitButton
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task { await model.loadProjects() }
    }

    // MARK: - Submit button

    private var submitButton: some View {
        Group {
            if model.phase == .creating {
                ProgressView().controlSize(.small)
            } else {
                Button(model.mode == .mission ? "Start" : "Create") {
                    model.submit { room in
                        dismiss()
                        onCreated(room)
                    }
                }
                .fontWeight(.semibold)
                .disabled(!model.canSubmit)
            }
        }
    }

    // MARK: - Mission form

    private var missionForm: some View {
        VStack(alignment: .leading, spacing: Theme.s4) {
            // Name (optional — the web's "blank = named from the goal")
            field("Mission name · optional") {
                TextField("e.g. Print framing lock", text: $model.missionName)
                    .composerInput()
            }

            // Goal (required)
            field("What should the room get done?", required: true) {
                TextField("e.g. Lock the print framing before Apr 29",
                          text: $model.goal, axis: .vertical)
                    .lineLimit(2...5)
                    .composerInput()
            }

            // Project selector
            if model.loadingProjects {
                HStack(spacing: Theme.s2) {
                    ProgressView().controlSize(.small)
                    Text("Loading projects…").font(.hkCaption).foregroundStyle(Theme.inkSoft)
                }
            } else if model.projects.isEmpty {
                field("Project") {
                    Text("No projects yet. Create a project first.")
                        .font(.hkFootnote).foregroundStyle(Theme.inkFaint)
                        .padding(Theme.s3)
                }
            } else {
                field("Project", required: true) {
                    projectPicker
                }
            }

            // Agent picker (Assign to)
            field("Assign to") {
                agentPicker
            }

            // Priority + When in two columns
            HStack(alignment: .top, spacing: Theme.s3) {
                field("Priority") {
                    segmentedRow(
                        options: [("low", "Low"), ("med", "Med"), ("high", "High")],
                        selected: $model.priority
                    )
                }
                field("When") {
                    segmentedRow(
                        options: [("now", "Now"), ("this-week", "Week")],
                        selected: $model.whenValue
                    )
                }
            }
        }
    }

    // MARK: - Project form

    private var projectForm: some View {
        VStack(alignment: .leading, spacing: Theme.s4) {
            field("Project name", required: true) {
                TextField("e.g. Space Rising", text: $model.projectName)
                    .composerInput()
            }

            field("What's it about? · gives agents the gist") {
                TextField("A line or two on what this project is for",
                          text: $model.about, axis: .vertical)
                    .lineLimit(2...5)
                    .composerInput()
            }

            Text("A new room opens immediately and the agent will help you set it up.")
                .font(.hkCaption2)
                .foregroundStyle(Theme.inkFaint)
        }
    }

    // MARK: - Project picker (card list, single selection)

    private var projectPicker: some View {
        LazyVStack(spacing: 6) {
            ForEach(model.projects, id: \.slug) { row in
                let slug = row.slug ?? ""
                let name = row.name ?? Row.prettify(slug)
                let picked = model.selectedProjectSlug == slug
                Button {
                    model.selectedProjectSlug = slug
                } label: {
                    HStack(spacing: Theme.s2) {
                        Image(systemName: "folder")
                            .font(.hkCaption)
                            .foregroundStyle(Theme.inkSoft)
                            .frame(width: 20, height: 20)
                        Text(name)
                            .font(.hkBody.weight(.medium))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        if picked {
                            Image(systemName: "checkmark")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    .padding(.horizontal, Theme.s3)
                    .padding(.vertical, 10)
                    .background(
                        picked ? Theme.accentWeak : Theme.raised.opacity(0.6),
                        in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(picked ? Theme.accent.opacity(0.6) : Theme.hairline, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Agent picker (card list, single selection)

    private var agentPicker: some View {
        LazyVStack(spacing: 6) {
            ForEach(model.agentOptions, id: \.id) { agent in
                let picked = model.selectedAgentId == agent.id
                Button {
                    model.selectedAgentId = agent.id
                } label: {
                    HStack(spacing: Theme.s2) {
                        Text(agent.title)
                            .font(.hkBody.weight(.medium))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        if picked {
                            Image(systemName: "checkmark")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    .padding(.horizontal, Theme.s3)
                    .padding(.vertical, 10)
                    .background(
                        picked ? Theme.accentWeak : Theme.raised.opacity(0.6),
                        in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(picked ? Theme.accent.opacity(0.6) : Theme.hairline, lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Segmented button row (priority / when)

    private func segmentedRow(options: [(value: String, label: String)], selected: Binding<String>) -> some View {
        HStack(spacing: 6) {
            ForEach(options, id: \.value) { opt in
                let picked = selected.wrappedValue == opt.value
                Button { selected.wrappedValue = opt.value } label: {
                    Text(opt.label)
                        .font(.hkCaption.weight(.semibold))
                        .foregroundStyle(picked ? .white : Theme.inkSoft)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            picked ? Theme.accent : Theme.raised,
                            in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 9, style: .continuous)
                                .strokeBorder(picked ? Color.clear : Theme.hairline, lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Field wrapper

    @ViewBuilder
    private func field<Content: View>(
        _ label: String,
        required: Bool = false,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text(label.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(Theme.inkSoft)
                if required {
                    Text("*")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Theme.accent)
                }
            }
            content()
        }
    }
}

// MARK: - Composer input style

private extension View {
    func composerInput() -> some View {
        self
            .font(.hkBody)
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Namespace alias (avoid referencing the non-existent Row type)

private enum Row {
    static func prettify(_ slug: String) -> String { Room.prettify(slug) }
}
