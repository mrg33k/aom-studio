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

    #if DEBUG
    /// UI-test seed (`-v2SeedChecklists`, same precedent as `-v2SeedStaged`):
    /// one canned list so the panel's build/add/Play flow runs hermetically
    /// on the simulator without the checklists endpoint. Mutations below
    /// apply locally while seeded.
    private var seeded = false
    #endif

    func load(room: Room) async {
        guard status != .loading else { return }
        status = .loading
        errorMessage = nil
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-v2SeedChecklists") {
            lists = [ChecklistList(
                id: "seed-list-1", title: "Seed list", collapsed: false,
                items: [ChecklistItem(id: "seed-item-1", text: "Seeded first step", done: false),
                        ChecklistItem(id: "seed-item-2", text: "Seeded second step", done: false)])]
            seeded = true
            status = .ready
            return
        }
        #endif
        do {
            lists = try await api.fetchChecklists(room: room)
            status = .ready
        } catch {
            status = .error
            errorMessage = "Couldn't open room lists."
        }
    }

    #if DEBUG
    /// Local mirror of the server's pure actions (same contract as the
    /// `/api/dashboard/room-checklists` seam): create-list, add-item,
    /// toggle-item. Returns false for anything else, which falls through
    /// to the network path below.
    private func applySeeded(action: String, fields: [String: Any]) -> Bool {
        func text(_ key: String) -> String {
            ((fields[key] as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        }
        switch action {
        case "create-list":
            let title = text("title")
            guard !title.isEmpty else { return true }
            lists.append(ChecklistList(id: UUID().uuidString, title: title,
                                       collapsed: false, items: []))
            return true
        case "add-item":
            let body = text("text")
            guard !body.isEmpty,
                  let idx = lists.firstIndex(where: { $0.id == text("list_id") })
            else { return true }
            lists[idx].items.append(ChecklistItem(id: UUID().uuidString, text: body, done: false))
            return true
        case "toggle-item":
            guard let li = lists.firstIndex(where: { $0.id == text("list_id") }),
                  let ii = lists[li].items.firstIndex(where: { $0.id == text("item_id") })
            else { return true }
            lists[li].items[ii].done.toggle()
            return true
        default:
            return false
        }
    }
    #endif

    @discardableResult
    func mutate(room: Room, action: String, fields: [String: Any] = [:]) async -> Bool {
        status = .saving
        errorMessage = nil
        #if DEBUG
        if seeded, applySeeded(action: action, fields: fields) {
            status = .ready
            return true
        }
        #endif
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
