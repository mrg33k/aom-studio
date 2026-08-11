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
                    .font(.hkFootnote.weight(.semibold))
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
                                    .font(.hkBody.weight(.semibold))
                                    .foregroundStyle(Theme.ink)
                                Text(agent.subtitle)
                                    .font(.hkCaption)
                                    .foregroundStyle(Theme.inkSoft)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.hkCaption.weight(.semibold))
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
        AssignConfirmForm(
            agent: agent,
            label: label,
            notes: $notes,
            sending: sending,
            failure: failure,
            send: { Task { await send(to: agent) } },
            pickAgain: { selected = nil }
        )
    }

    private var confirmation: some View {
        VStack(spacing: Theme.s3) {
            Image(systemName: "checkmark.circle")
                .font(.hkLargeTitle)
                .foregroundStyle(Theme.accent)
            Text("\(selected?.title ?? "The agent") has it")
                .font(.hkHeadline)
                .foregroundStyle(Theme.ink)
            Text("The ask is in their room. Open it to follow along.")
                .font(.hkFootnote)
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

// MARK: - The confirm step

/// Split from the sheet's NavigationStack so it can be RENDERED and judged. This is the
/// consequential screen — the one that says where the ask lands and then sends it — and
/// the failure card on it only ever appears in production when the write already failed.
struct AssignConfirmForm: View {
    let agent: AgentRoster.Entry
    let label: String
    @Binding var notes: String
    var sending: Bool
    var failure: String?
    var send: () -> Void = {}
    var pickAgain: () -> Void = {}

    var body: some View {
        Form {
            Section {
                AssignConsequenceCard(agent: agent, label: label)
            } header: {
                Text("\(agent.title) takes it")
            }
            .listRowBackground(Theme.raised.opacity(0.6))

            Section {
                TextEditor(text: $notes)
                    .frame(minHeight: 110)
                    .scrollContentBackground(.hidden)
                    .font(.hkCallout)
                    .foregroundStyle(Theme.ink)
            } header: {
                Text("What they need to know")
            } footer: {
                Text("Optional. Whatever is here is what they read.")
                    .font(.hkCaption2)
                    .foregroundStyle(Theme.inkFaint)
            }
            .listRowBackground(Theme.raised.opacity(0.6))

            if let failure {
                Section {
                    AssignFailureCard(reason: failure)
                }
                .listRowBackground(Theme.raised.opacity(0.6))
            }

            Section {
                Button(action: send) {
                    HStack {
                        if sending { ProgressView().controlSize(.small) }
                        Text(sending ? "Sending…" : "Send it to \(agent.title)")
                            .font(.hkBody.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(sending)

                Button("Pick someone else", action: pickAgain)
                    .font(.hkFootnote)
                    .disabled(sending)
            }
            .listRowBackground(Color.clear)
        }
        .scrollContentBackground(.hidden)
    }
}

/// What the confirm step promises, in the user's terms: the ask becomes a message in a
/// room a person can open and read. Says what the button DOES, not what it is called.
struct AssignConsequenceCard: View {
    let agent: AgentRoster.Entry
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text(label)
                .font(.hkSubheadline.weight(.semibold))
                .foregroundStyle(Theme.ink)
            Text("This posts the ask into \(agent.title)'s room. They pick it up there.")
                .font(.hkCaption)
                .foregroundStyle(Theme.inkSoft)
        }
        .padding(.vertical, Theme.s1)
    }
}

/// The card a user only ever sees after a write already failed. Leads with the fact —
/// nothing was sent — because "an error occurred" leaves them guessing whether the agent
/// got it.
struct AssignFailureCard: View {
    let reason: String

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.s1) {
            Text("Nothing was sent")
                .font(.hkFootnote.weight(.semibold))
                .foregroundStyle(Theme.danger)
            Text(reason)
                .font(.hkCaption)
                .foregroundStyle(Theme.inkSoft)
        }
    }
}
