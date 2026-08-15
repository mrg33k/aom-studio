// RenameRoomSheet.swift — Corner native iOS
// Mirrors web `RenameRoomDialog.jsx` + `RoomSettingsDialog.jsx:saveName`
// Three endpoints, same as web:
//   agent 1:1 → PATCH /api/dashboard/room-title { client_id, agent, title }
//   project  → PATCH /api/dashboard/project-update { client_id, slug, name }
//   mission  → PATCH /api/dashboard/mission-update { client_id, project_slug, mission_slug, name, path }

import SwiftUI

struct RenameRoomSheet: View {
    let room: Room
    let onRenamed: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var busy = false
    @State private var error: String?

    init(room: Room, onRenamed: @escaping (String) -> Void) {
        self.room = room
        self.onRenamed = onRenamed
        _title = State(initialValue: room.title)
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Theme.s3) {
                Text(headerCopy)
                    .font(.hanken(12.5))
                    .foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(alignment: .leading, spacing: 6) {
                    Text("ROOM NAME")
                        .font(.hanken(11).weight(.semibold))
                        .tracking(0.6)
                        .foregroundStyle(Theme.inkFaint)
                    TextField("Room name", text: $title)
                        .font(.hanken(16))
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 12)
                        .frame(height: 44)
                        .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 11, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.words)
                        .disabled(busy)
                        .onSubmit { Task { await save() } }
                }

                if let error {
                    Text(error)
                        .font(.hanken(12))
                        .foregroundStyle(Color.red.opacity(0.9))
                }

                Spacer(minLength: Theme.s4)

                Button {
                    Task { await save() }
                } label: {
                    HStack {
                        if busy { ProgressView().tint(.white) }
                        Text(busy ? "Saving…" : "Save name")
                            .font(.hanken(15).weight(.semibold))
                    }
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(canSave ? Theme.accent : Theme.inkFaint, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                }
                .disabled(!canSave || busy)
            }
            .padding(Theme.s4)
            .background(Theme.ground)
            .navigationTitle("Rename \(room.typeLabel.lowercased())")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }.disabled(busy)
                }
            }
        }
    }

    private var headerCopy: String {
        switch room.kind {
        case .agent:
            return "Give this conversation a useful name. The specialist stays the same."
        case .project, .mission:
            return "This changes the display name; the room and its history stay intact."
        }
    }

    private var canSave: Bool {
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return !t.isEmpty && t.count <= 80 && t != room.title
    }

    private func save() async {
        let next = title.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !next.isEmpty else {
            error = "Give the room a name."
            return
        }
        guard next.count <= 80 else {
            error = "Keep the name to 80 characters or fewer."
            return
        }
        busy = true
        error = nil
        do {
            try await CornerAPI.shared.renameRoom(room: room, newTitle: next)
            onRenamed(next)
            dismiss()
        } catch let e as CornerAPI.APIError {
            error = e.errorDescription ?? "Could not rename this room."
        } catch {
            error = error.localizedDescription
        }
        busy = false
    }
}
