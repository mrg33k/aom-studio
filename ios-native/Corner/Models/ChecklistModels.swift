// ChecklistModels.swift — Corner native iOS
// corner:native-ios R11 — room checklists
//
// Mirrors the web's room-checklists data shape exactly. The server stores these
// as a blob keyed by (world, room_key); every write action returns the full list
// so the client never guesses at optimistic state.

import Foundation

struct ChecklistItem: Identifiable, Codable {
    let id: String
    var text: String
    var done: Bool
}

struct ChecklistList: Identifiable, Codable {
    let id: String
    var title: String
    var collapsed: Bool
    var items: [ChecklistItem]

    var doneCount: Int { items.filter(\.done).count }
    var openCount: Int { items.filter { !$0.done }.count }
    var progress: Double { items.isEmpty ? 0 : Double(doneCount) / Double(items.count) }
}
