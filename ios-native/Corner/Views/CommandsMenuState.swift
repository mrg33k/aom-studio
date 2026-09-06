// CommandsMenuState.swift — Corner native iOS
// corner:corner-v2 R19 — one commands menu, two composers.
//
// `commandsMenuContent(state:)` in ChatView.swift is THE menu (Work/Plan,
// Model, Specialist, Files, Generate an image). These adapters supply the
// conversation-scoped state behind it: the legacy room path persists prefs
// on the server through ChatViewModel; the v2 pill persists per thread on
// V2ChatModel (mode rides the send when the backend accepts it).

import Foundation

/// The state one commands menu needs, whichever composer hosts it.
@MainActor
protocol CommandsMenuState {
    var chatMode: String { get }
    func setMode(_ mode: String)
    var modelChoice: String { get }
    func selectModel(_ id: String) async
    var hasSpecialist: Bool { get }
    var specialistDefaultTitle: String { get }
    var specialistTitle: String { get }
    var specialistRoster: [(slug: String, title: String)] { get }
    var specialistChoice: String { get }
    func selectSpecialist(_ slug: String) async
    func openFiles()
    func openImageGenerator()
}

/// The legacy room path: ChatViewModel's server-persisted prefs.
@MainActor
struct LegacyCommandsState: CommandsMenuState {
    let model: ChatViewModel
    let onOpenFiles: () -> Void
    let onOpenImageGenerator: () -> Void
    func openFiles() { onOpenFiles() }
    func openImageGenerator() { onOpenImageGenerator() }

    var chatMode: String { model.chatMode }
    func setMode(_ mode: String) { model.setMode(mode) }
    var modelChoice: String { model.modelChoice }
    func selectModel(_ id: String) async { await model.selectModel(id) }
    var hasSpecialist: Bool { model.room.agentPreferenceKey != nil }
    var specialistDefaultTitle: String { "Room default" }
    var specialistTitle: String { model.roomAgentTitle }
    var specialistRoster: [(slug: String, title: String)] {
        model.roomAgentRoster.map { ($0.slug, $0.title) }
    }
    var specialistChoice: String { model.roomAgentChoice }
    func selectSpecialist(_ slug: String) async { await model.selectRoomAgent(slug) }
}

/// The v2 pill: V2ChatModel's per-thread persisted prefs. Model/specialist
/// picks label the chip and persist; only mode has a send field today.
@MainActor
struct V2CommandsState: CommandsMenuState {
    let model: V2ChatModel
    let onOpenFiles: () -> Void
    let onOpenImageGenerator: () -> Void
    func openFiles() { onOpenFiles() }
    func openImageGenerator() { onOpenImageGenerator() }

    var chatMode: String { model.chatMode }
    func setMode(_ mode: String) { model.setMode(mode) }
    var modelChoice: String { model.modelChoice }
    func selectModel(_ id: String) async { model.selectModel(id) }
    var hasSpecialist: Bool { !model.specialistRoster.isEmpty }
    var specialistDefaultTitle: String { "Thread default" }
    var specialistTitle: String { model.specialistTitle }
    var specialistRoster: [(slug: String, title: String)] { model.specialistRoster }
    var specialistChoice: String { model.specialistChoice }
    func selectSpecialist(_ slug: String) async { model.selectSpecialist(slug) }
}
