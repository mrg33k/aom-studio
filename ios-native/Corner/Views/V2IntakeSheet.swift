// V2IntakeSheet.swift — Corner native iOS
// corner:corner-v2 R23 (P070).
//
// The drawer's "New mission" composer. The retired home tree owned the global
// intake field (`Message Corner…`); with the tree gone the drawer raises this
// sheet instead. Same transport (WorkspaceStore.sendIntake → confirm → open
// the thread), same confirm sheet (V2IntakeConfirmSheet), same test
// identifiers the flow suite already speaks (global-intake-field /
// global-intake-send / intake-project-context) — only the field's host moved.
//
// Raised from anywhere the drawer is: the sheet itself is hosted once, at the
// entry (RootView), so it survives thread-to-thread replaces.

import SwiftUI

/// The intake sheet's state. A shared instance because the drawer (an overlay
/// inside whatever thread is showing) and the sheet host (the entry) are
/// different views — the same pattern as V2RecentStore / WorkspaceStore.
@MainActor
final class V2IntakeStore: ObservableObject {
    static let shared = V2IntakeStore()

    @Published var isPresented = false
    @Published var projectID: String?
    @Published var text = ""
    @Published var sending = false
    @Published var errorText: String?
    @Published var pendingDecision: RouteDecision?
    @Published var showingConfirm = false
    @Published var confirmBusy = false
    @Published var confirmError: String?

    /// Raise the composer. A project id scopes it ("New mission in Aster");
    /// nil is the unscoped "New mission".
    func open(projectID: String? = nil) {
        self.projectID = projectID
        text = ""
        errorText = nil
        isPresented = true
    }

    func close() {
        isPresented = false
        showingConfirm = false
        pendingDecision = nil
    }

    /// The tree's v2Submit, moved verbatim: route a room-less message, confirm
    /// a proposal, open a confident route's thread.
    func submit() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !sending else { return }
        sending = true
        errorText = nil
        let preferred = projectID
        Task {
            defer { sending = false }
            do {
                let decision = try await WorkspaceStore.shared.sendIntake(
                    trimmed, preferredProjectID: preferred
                )
                text = ""
                if decision.needsCreationConfirmation || decision.needsClarification {
                    confirmError = nil
                    pendingDecision = decision
                    showingConfirm = true
                } else {
                    isPresented = false
                    Self.navigate(to: decision)
                }
            } catch {
                errorText = "Corner couldn't sort this automatically. Try again."
            }
        }
    }

    /// A confident route opens its thread: the owning mission when the
    /// decision names one, else the owning project. (The tree's
    /// navigateToDecision, moved verbatim.)
    static func navigate(to decision: RouteDecision) {
        if let mission = decision.mission {
            AppRouter.shared.open(.mission(missionID: mission.id))
        } else if !decision.destinationThreadID.isEmpty,
                  let context = WorkspaceStore.shared.context(threadID: decision.destinationThreadID),
                  let mission = context.mission {
            AppRouter.shared.open(.mission(missionID: mission.id))
        } else {
            AppRouter.shared.open(.project(projectID: decision.project.id))
        }
    }

    /// The tree's v2ConfirmCreate, moved verbatim.
    func confirmCreate() {
        guard let decision = pendingDecision, !confirmBusy else { return }
        confirmBusy = true
        confirmError = nil
        Task {
            defer { confirmBusy = false }
            do {
                let result = try await WorkspaceStore.shared.confirmCreation(decision)
                showingConfirm = false
                pendingDecision = nil
                isPresented = false
                if let missionID = result.missionID {
                    AppRouter.shared.open(.mission(missionID: missionID))
                }
            } catch {
                confirmError = "Could not create it. Try again."
            }
        }
    }
}

/// The composer sheet: the tree's intake row (field + send + project context
/// + error), upright in a sheet with a Close control.
struct V2IntakeSheetView: View {
    @ObservedObject private var store = V2IntakeStore.shared
    @ObservedObject private var workspace = WorkspaceStore.shared
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Theme.s3) {
                Text(store.projectID == nil
                    ? "New mission"
                    : "New mission in \(workspace.projectName(id: store.projectID) ?? "project")")
                    .font(.hanken(20).weight(.bold))
                    .foregroundStyle(Theme.ink)
                HStack(spacing: Theme.s2) {
                    TextField("Message Corner…", text: $store.text, axis: .vertical)
                        .font(.hkBody)
                        .foregroundStyle(Theme.ink)
                        .focused($focused)
                        .submitLabel(.send)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.sentences)
                        .accessibilityIdentifier("global-intake-field")
                        .accessibilityLabel(store.projectID == nil
                            ? "Message Corner"
                            : "New mission in \(workspace.projectName(id: store.projectID) ?? "project")")
                        .onSubmit { store.submit() }
                    Button { store.submit() } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(store.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.sending ? Theme.inkFaint : Theme.accent)
                    }
                    .buttonStyle(.plain)
                    .disabled(store.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.sending)
                    .accessibilityIdentifier("global-intake-send")
                    .accessibilityLabel("Send")
                }
                .padding(.horizontal, Theme.s3)
                .frame(minHeight: 48)
                .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Theme.hairline, lineWidth: 1)
                )
                if store.projectID != nil {
                    Button { store.projectID = nil } label: {
                        HStack(spacing: 4) {
                            Text("New mission in \(workspace.projectName(id: store.projectID) ?? "project")")
                                .font(.hkCaption)
                                .foregroundStyle(Theme.accent)
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.inkSoft)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("intake-project-context")
                }
                if let error = store.errorText {
                    Text(error)
                        .font(.hkCaption)
                        .foregroundStyle(Theme.warning)
                }
                Spacer(minLength: 0)
            }
            .padding(Theme.s4)
            .groundBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { store.close() }
                        .accessibilityIdentifier("intake-close")
                }
            }
            .onAppear { focused = true }
        }
        .sheet(isPresented: $store.showingConfirm) {
            if let decision = store.pendingDecision {
                V2IntakeConfirmSheet(
                    decision: decision,
                    workspace: workspace.workspace,
                    busy: store.confirmBusy,
                    errorText: store.confirmError,
                    onConfirm: { store.confirmCreate() },
                    onCancel: {
                        store.showingConfirm = false
                        store.pendingDecision = nil
                    },
                    onOpenThread: { threadID in
                        store.showingConfirm = false
                        store.pendingDecision = nil
                        store.isPresented = false
                        if let context = workspace.context(threadID: threadID) {
                            if let mission = context.mission {
                                AppRouter.shared.open(.mission(missionID: mission.id))
                            } else {
                                AppRouter.shared.open(.project(projectID: context.project.id))
                            }
                        }
                    }
                )
            }
        }
    }
}
