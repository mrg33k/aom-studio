// RoomChecklistStore.swift — Corner native iOS
// corner:native-ios R11 — room checklists
//
// ObservableObject wrapper around the /api/dashboard/room-checklists API.
// Mirrors useRoomChecklists.js: loads on appear, exposes a mutate() handle that
// returns true on success and updates `lists` from the server's canonical reply.

import Foundation

@MainActor
final class RoomChecklistStore: ObservableObject {

    enum Status { case idle, loading, ready, saving, error }

    @Published var lists: [ChecklistList] = []
    @Published var status: Status = .idle
    @Published var errorMessage: String?

    private let api: CornerAPI

    init() {
        self.api = CornerAPI.shared
    }

    func load(room: Room) async {
        guard status != .loading else { return }
        status = .loading
        errorMessage = nil
        do {
            lists = try await api.fetchChecklists(room: room)
            status = .ready
        } catch {
            status = .error
            errorMessage = "Couldn't open room lists."
        }
    }

    @discardableResult
    func mutate(room: Room, action: String, fields: [String: Any] = [:]) async -> Bool {
        status = .saving
        errorMessage = nil
        do {
            lists = try await api.mutateChecklist(room: room, action: action, fields: fields)
            status = .ready
            return true
        } catch {
            status = .error
            errorMessage = "Couldn't save that change. Your list is still here."
            return false
        }
    }
}
