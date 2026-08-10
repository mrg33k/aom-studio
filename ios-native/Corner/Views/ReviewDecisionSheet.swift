// ReviewDecisionSheet.swift — Corner native iOS
// corner:native-ios Stage 2
//
// The three verdicts, and the honesty about which of them can be taken back.
//
// APPROVE AND REQUEST CHANGES ARE PERMANENT. review-decision.js accepts its `undo`
// action for dismiss rows only — "Only dismiss decisions can be undone" — and by the
// time a request-changes response lands, a `tasks` row is already queued and a worker
// may already have claimed it. So neither gets a swipe, neither gets an "Undo" toast
// that would not work, and approve asks once before it fires.
//
// REQUEST CHANGES WANTS WORDS. The server will happily queue a task with no notes; the
// worker then reads "(no written notes — check the pin-comments below)" and goes looking
// for pin comments a phone never wrote. An empty note is a task nobody can action, so
// the button stays disabled until there is something to act on.
//
// AND THE FAILURE PATH IS LOUD. When the decision POST fails, nothing was recorded —
// the endpoint 500s rather than half-writing a request-changes whose task never queued.
// The sheet stays open with the error on it. Closing it would look exactly like success.

import SwiftUI

struct ReviewDecisionSheet: View {
    let attachment: Attachment
    let project: String
    let mission: String

    @Environment(\.dismiss) private var dismiss
    @StateObject private var review = ReviewStore.shared

    @State private var notes = ""
    @State private var mode: Mode = .choosing
    @State private var failure: String?
    @State private var busy = false

    private enum Mode: Equatable {
        case choosing
        case writingChanges
        case confirmingApprove
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s4) {
                    fileHeader

                    switch mode {
                    case .choosing:         choices
                    case .writingChanges:   changesForm
                    case .confirmingApprove: approveConfirmation
                    }

                    if let failure {
                        RaisedCard(tint: Theme.danger.opacity(0.5)) {
                            VStack(alignment: .leading, spacing: Theme.s1) {
                                Text("Nothing was recorded")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(Theme.danger)
                                Text(failure)
                                    .font(.caption)
                                    .foregroundStyle(Theme.inkSoft)
                            }
                        }
                    }
                }
                .padding(Theme.s4)
            }
            .background(Theme.ground)
            .navigationTitle("Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }.disabled(busy)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Pieces

    private var fileHeader: some View {
        HStack(spacing: Theme.s3) {
            Image(systemName: attachment.kind.symbol)
                .font(.title3)
                .foregroundStyle(Theme.accent)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(attachment.name)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                if !locationLabel.isEmpty {
                    Text(locationLabel)
                        .font(.caption2)
                        .foregroundStyle(Theme.inkFaint)
                }
            }
            Spacer(minLength: 0)
        }
    }

    private var locationLabel: String {
        if !project.isEmpty && !mission.isEmpty { return "\(project) / \(mission)" }
        return project.isEmpty ? mission : project
    }

    private var choices: some View {
        VStack(spacing: Theme.s2) {
            Button {
                mode = .confirmingApprove
            } label: {
                decisionRow(
                    icon: "checkmark.circle.fill",
                    tint: Theme.accent,
                    title: "Approve",
                    detail: "Tells the room it's good. This can't be taken back."
                )
            }
            .buttonStyle(.plain)

            Button {
                mode = .writingChanges
            } label: {
                decisionRow(
                    icon: "arrow.uturn.backward.circle.fill",
                    tint: Theme.warning,
                    title: "Request changes",
                    detail: "Writes the agent a real task with your notes in it."
                )
            }
            .buttonStyle(.plain)

            Button {
                Task { await submit(.dismiss) }
            } label: {
                decisionRow(
                    icon: "xmark.circle",
                    tint: Theme.inkSoft,
                    title: "Not for review",
                    detail: "Takes it off the list without a verdict. Reversible on the web."
                )
            }
            .buttonStyle(.plain)
            .disabled(busy)
        }
    }

    private func decisionRow(icon: String, tint: Color, title: String, detail: String) -> some View {
        RaisedCard(tint: tint.opacity(0.3)) {
            HStack(alignment: .top, spacing: Theme.s3) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(tint)
                    .frame(width: 24)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(Theme.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var changesForm: some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            Text("What needs to change?")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Theme.ink)
            // The words here become the worker's brief verbatim. Saying so is the
            // difference between a comment and an instruction.
            Text("This becomes the agent's task, word for word.")
                .font(.caption)
                .foregroundStyle(Theme.inkFaint)

            TextEditor(text: $notes)
                .frame(minHeight: 130)
                .scrollContentBackground(.hidden)
                .padding(Theme.s2)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.s2, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.s2, style: .continuous)
                        .strokeBorder(Theme.hairline, lineWidth: 1)
                )
                .foregroundStyle(Theme.ink)
                .font(.body)

            HStack(spacing: Theme.s3) {
                Button("Back") { mode = .choosing; failure = nil }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .disabled(busy)
                Spacer(minLength: 0)
                Button {
                    Task { await submit(.requestChanges) }
                } label: {
                    if busy { ProgressView().controlSize(.small) } else { Text("Send to the agent") }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .disabled(busy || notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    private var approveConfirmation: some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            RaisedCard(tint: Theme.accent.opacity(0.35)) {
                VStack(alignment: .leading, spacing: Theme.s1) {
                    Text("Approve this?")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    // Say the actual consequence, in the user's terms: the room hears it
                    // under their name, and there is no undo.
                    Text("The room sees that you approved it, under your name. Approvals can't be undone — only \"not for review\" can.")
                        .font(.caption)
                        .foregroundStyle(Theme.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            HStack(spacing: Theme.s3) {
                Button("Back") { mode = .choosing; failure = nil }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .disabled(busy)
                Spacer(minLength: 0)
                Button {
                    Task { await submit(.approve) }
                } label: {
                    if busy { ProgressView().controlSize(.small) } else { Text("Approve") }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .disabled(busy)
            }
        }
    }

    // MARK: - Submit

    private func submit(_ action: ReviewAction) async {
        busy = true
        failure = nil
        let ok = await review.decide(
            attachment: attachment,
            action: action,
            notes: action == .requestChanges ? notes.trimmingCharacters(in: .whitespacesAndNewlines) : nil,
            project: project,
            mission: mission
        )
        busy = false
        if ok {
            dismiss()
        } else {
            // The store already wrote the precise reason into its notice; surface it
            // here too, because this sheet is where the user is looking.
            failure = review.notice?.text ?? "The server did not record the decision."
        }
    }
}
