// RoomFilesStore.swift — Corner native iOS
// corner:native-ios Stage 2
//
// This chat's files, kept fresh while the panel is open.
//
// FIVE SECONDS, NOT THIRTY. The web polls this at 5s for a stated reason: "it's in your
// Files panel" landing before the card does is exactly the complaint this panel exists
// to answer, and a file that takes half a minute to appear reads as a lie even when the
// delivery was perfect. The phone has the same contract.
//
// BUT ONLY WHILE VISIBLE. A 5s poll that keeps running behind a dismissed sheet is a
// battery bug, so the timer starts on appear and stops on disappear — and the store is
// per-room, created with the sheet, not a singleton accumulating rooms.

import Foundation

@MainActor
final class RoomFilesStore: ObservableObject {

    enum LoadState: Equatable {
        case loading
        case ready
        case empty
        case error(String)
    }

    @Published private(set) var fromAgent: [RoomFile] = []
    @Published private(set) var youSent: [RoomFile] = []
    @Published private(set) var state: LoadState = .loading
    /// The server returned a full window, so there are older files this list cannot show.
    @Published private(set) var windowFull = false
    /// Deliverable ids the review queue says are still waiting. Drives the amber mark on
    /// a crossing — the SAME set the badges use, never a second opinion computed here.
    @Published var waitingIDs: Set<String> = []

    let room: Room
    private var timer: Task<Void, Never>?
    private let api: CornerAPI

    /// `api` resolves inside the initializer, not as a default argument — a default
    /// argument is evaluated at the call site, which is not always on the main actor.
    init(room: Room, api: CornerAPI? = nil) {
        self.room = room
        self.api = api ?? .shared
    }

    var isEmpty: Bool { fromAgent.isEmpty && youSent.isEmpty }

    var waitingCount: Int { fromAgent.filter { isWaiting($0) }.count }

    /// A crossing is waiting when the queue names it. The queue keys on the deliverable
    /// id (the url) and the file name; both are checked because a corner-path reference
    /// and a store URL for the same file are the same deliverable to a human.
    func isWaiting(_ file: RoomFile) -> Bool {
        guard !file.isUser else { return false }   // your own uploads never wait (server rule)
        return waitingIDs.contains(file.attachment.url) || waitingIDs.contains(file.name)
    }

    func start() {
        guard timer == nil else { return }
        timer = Task { [weak self] in
            while !Task.isCancelled {
                await self?.load()
                try? await Task.sleep(nanoseconds: 5_000_000_000)
            }
        }
    }

    func stop() {
        timer?.cancel()
        timer = nil
    }

    func load() async {
        do {
            let result = try await api.fetchRoomFiles(room: room)
            let crossings = RoomFile.crossings(in: result.rows, roomTitle: room.title)
            fromAgent = crossings.filter { !$0.isUser }
            youSent = crossings.filter { $0.isUser }
            windowFull = result.windowFull
            state = crossings.isEmpty ? .empty : .ready
        } catch {
            // A refresh failure over an already-loaded list must not blank the list.
            // The files did not go anywhere; the network did.
            if fromAgent.isEmpty && youSent.isEmpty {
                state = .error((error as? LocalizedError)?.errorDescription ?? "Couldn't load this chat's files.")
            }
        }
    }
}
