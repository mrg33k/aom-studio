// AssignSheet.swift — Corner native iOS
// corner:native-ios Stage 3
//
// Hand a file or an issue to an agent.
//
// THERE IS NO ASSIGNMENT TABLE, and that is not a gap — it is the design. Assigning
// posts a message into the agent's own room through the one write path
// (cv6kit/AssignButton.jsx does exactly this). The bridge picks the row up, the agent
// works it, and the row is the platform's permanent record that the ask was made. So the
// confirm step says where the ask is going to LAND, in the user's terms, because the
// consequence of the button is a real message in a real room that someone will answer.
//
// AGENTS ARE TITLES, NEVER PERSONA NAMES (agentTitles.js doctrine, 2026-06-23). The
// picker shows "Design", not "Steffen" — and the owner stamped back onto a board row is
// the title too, so a tracker never grows a column of first names.
//
// THE NOTES FIELD IS THE BRIEF. Whatever is typed here is what the agent reads under
// "Notes:" — it is not a comment attached to something the agent has to go and find. An
// empty one is allowed and produces a short, honest ask rather than a manufactured one.

import SwiftUI

struct AssignSheet: View {

    /// What is being handed over. `type` is the web's own vocabulary and rides into the
    /// message's `(ref: …)` line and its metadata, so the agent can locate the artifact.
    let artifactType: String
    let artifactID: String
    let label: String
    var project: String?
    var initialNotes: String = ""
    /// Called with the assigned agent's TITLE after the message landed, for surfaces that
    /// persist an owner (the bug board stamps it onto the row).
    var onAssigned: ((String) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var api: CornerAPI

    @State private var selected: AgentRoster.Entry?
    @State private var notes: String = ""
    @State private var sending = false
    @State private var failure: String?
    @State private var sent = false

    var body: some View {
        NavigationStack {
            Group {
                if sent {
                    confirmation
                } else if let agent = selected {
                    confirm(agent)
                } else {
                    picker
                }
            }
            .background(Theme.ground)
            .navigationTitle(sent ? "Assigned" : "Assign")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(sent ? "Done" : "Cancel") { dismiss() }
                        .disabled(sending)
                }
            }
        }
        .onAppear { if notes.isEmpty { notes = initialNotes } }
    }

    // MARK: - Pick

    private var picker: some View {
        List {
            Section {
                Text(label)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
            } header: {
                Text("Handing over")
            }
            .listRowBackground(Theme.raised.opacity(0.6))

            Section("Who takes it") {
                ForEach(AgentRoster.all, id: \.slug) { agent in
                    Button {
                        selected = agent
                    } label: {
                        HStack(spacing: Theme.s3) {
                            RoomAvatar(title: agent.title)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(agent.title)
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(Theme.ink)
                                Text(agent.subtitle)
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
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    // MARK: - Confirm

    private func confirm(_ agent: AgentRoster.Entry) -> some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: Theme.s2) {
                    Text(label)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    // Says what the button DOES, not what it is called. The ask becomes a
                    // message in a room a person can open and read.
                    Text("This posts the ask into \(agent.title)'s room. They pick it up there.")
                        .font(.caption)
                        .foregroundStyle(Theme.inkSoft)
                }
                .padding(.vertical, Theme.s1)
            } header: {
                Text("\(agent.title) takes it")
            }
            .listRowBackground(Theme.raised.opacity(0.6))

            Section {
                TextEditor(text: $notes)
                    .frame(minHeight: 110)
                    .scrollContentBackground(.hidden)
                    .font(.callout)
                    .foregroundStyle(Theme.ink)
            } header: {
                Text("What they need to know")
            } footer: {
                Text("Optional. Whatever is here is what they read.")
                    .font(.caption2)
                    .foregroundStyle(Theme.inkFaint)
            }
            .listRowBackground(Theme.raised.opacity(0.6))

            if let failure {
                Section {
                    VStack(alignment: .leading, spacing: Theme.s1) {
                        Text("Nothing was sent")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Theme.danger)
                        Text(failure)
                            .font(.caption)
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
                .listRowBackground(Theme.raised.opacity(0.6))
            }

            Section {
                Button {
                    Task { await send(to: agent) }
                } label: {
                    HStack {
                        if sending { ProgressView().controlSize(.small) }
                        Text(sending ? "Sending…" : "Send it to \(agent.title)")
                            .font(.body.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(sending)

                Button("Pick someone else") { selected = nil }
                    .font(.footnote)
                    .disabled(sending)
            }
            .listRowBackground(Color.clear)
        }
        .scrollContentBackground(.hidden)
    }

    private var confirmation: some View {
        VStack(spacing: Theme.s3) {
            Image(systemName: "checkmark.circle")
                .font(.largeTitle)
                .foregroundStyle(Theme.accent)
            Text("\(selected?.title ?? "The agent") has it")
                .font(.headline)
                .foregroundStyle(Theme.ink)
            Text("The ask is in their room. Open it to follow along.")
                .font(.footnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
        }
        .padding(Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Send

    private func send(to agent: AgentRoster.Entry) async {
        sending = true
        failure = nil
        defer { sending = false }
        do {
            try await api.assign(
                artifactType: artifactType,
                artifactID: artifactID,
                label: label,
                details: notes.trimmingCharacters(in: .whitespacesAndNewlines),
                project: project,
                toAgentSlug: agent.slug
            )
            sent = true
            onAssigned?(agent.title)
        } catch {
            failure = (error as? LocalizedError)?.errorDescription ?? "The message could not be posted."
        }
    }
}
