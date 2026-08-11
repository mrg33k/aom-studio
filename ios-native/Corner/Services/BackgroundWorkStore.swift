// BackgroundWorkStore.swift — Corner native iOS
// corner:native-ios R12 — Background work panel (phone equivalent of web's WorkersShell).
//
// Two kinds of in-flight work, because tasks alone would miss the common case where
// the room agent is working inside a turn and nothing in the tasks table reflects it:
//
//   tasks[]    — dispatched sub-agent jobs actively executing (status building | running).
//   promises[] — pending come-backs (followups table, status pending): the agent said
//                it would report back and hasn't yet.
//
// The honesty rule carries from the web: "Working in the background" means a job IS
// running; "Coming back to you" means the agent COMMITTED to come back — not proof
// that CPU is burning. They are always shown as separate sections and never merged.
//
// Polls every 30 seconds (matching useRunningTasks.js) with an immediate first fetch.
// Three actions on a promise (mirroring WorkersShell's PromiseActions):
//   Start it  — sends "Go ahead and start this now: <title>" into the promise's room.
//   Chase it  — sends "Where are you on this? <title>" into the promise's room.
//   Dismiss   — calls /api/dashboard/dismiss-followup; hides the row immediately.

import Foundation

// MARK: - Models

struct BackgroundTask: Identifiable, Decodable, Equatable {
    let id: String
    let title: String
    let who: String?
    let project: String?
    let since: String?
    let status: String?
}

struct BackgroundPromise: Identifiable, Decodable, Equatable {
    let id: String
    let title: String
    let who: String?
    let project: String?
    let mission: String?
    let since: String?
    let due: String?
}

// MARK: - Store

@MainActor
final class BackgroundWorkStore: ObservableObject {

    static let shared = BackgroundWorkStore()

    @Published private(set) var tasks: [BackgroundTask] = []
    @Published private(set) var promises: [BackgroundPromise] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: String?

    /// Ids of promises the server confirmed dismissed — hidden immediately, the next
    /// poll makes it permanent (following the web's `cleared` set pattern).
    @Published private(set) var dismissed: Set<String> = []

    var livePromises: [BackgroundPromise] { promises.filter { !dismissed.contains($0.id) } }
    var total: Int { tasks.count + livePromises.count }

    private let api: CornerAPI
    private var poller: Task<Void, Never>?

    init(api: CornerAPI? = nil) {
        self.api = api ?? .shared
    }

    // MARK: - Polling

    func startPolling() {
        guard poller == nil else { return }
        poller = Task { [weak self] in
            while !Task.isCancelled {
                await self?.load()
                try? await Task.sleep(nanoseconds: 30_000_000_000) // 30 s
            }
        }
    }

    func stopPolling() {
        poller?.cancel()
        poller = nil
    }

    func load() async {
        if tasks.isEmpty && promises.isEmpty { isLoading = true }
        do {
            let (t, p) = try await api.fetchRunningTasks()
            tasks = t
            promises = p
            // Clear dismissed ids that no longer appear (the server's own poll confirmed).
            dismissed = dismissed.filter { id in p.contains { $0.id == id } }
            error = nil
        } catch {
            let msg = (error as? LocalizedError)?.errorDescription ?? "Could not load background work."
            if tasks.isEmpty { self.error = msg }
        }
        isLoading = false
    }

    // MARK: - Actions on promises

    /// Mark a promise dismissed client-side immediately and confirm with the server.
    /// Returns true when the server recorded the dismiss.
    @discardableResult
    func dismiss(promise: BackgroundPromise) async -> Bool {
        dismissed.insert(promise.id)              // optimistic hide
        let ok = await api.dismissFollowup(id: promise.id)
        if !ok { dismissed.remove(promise.id) }   // roll back on failure
        return ok
    }

    /// Send a message into the promise's own room.
    /// Returns true when the POST was accepted.
    @discardableResult
    func sendToPromiseRoom(promise: BackgroundPromise, text: String) async -> Bool {
        await api.sendToPromiseRoom(promise: promise, text: text)
    }
}
