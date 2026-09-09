// V2ViewStateSync.swift — Corner native iOS
// corner:corner-v2 R56 (P094/P095/C016) — publish what the person is
// looking at, follow the agent's window.
//
// Two directions, one object, no races:
//
// PUBLISH (person → `v2Visual:setViewState`, debounced ~300 ms). The sync
// sinks the eye mode and the selected tab, and takes page turns + reader
// scrolls through `notePosition` (forwarded by the window store). Every
// note re-marks the snapshot dirty; the flush timer is set once and never
// reset, so a continuous scroll sends at most one write per window
// (debounce + throttle in one). The wire carries only changed fields
// (V2ViewSnapshot.diff): a mode tap sends {mode}, a tab select {tabId}, a
// page turn {page}, a scroll {scroll}. A failed write keeps its baseline,
// so the next change re-sends it — view state is awareness, never content,
// and never surfaces an error.
//
// CONSUME (agent → person, via the store's session mirror). Each poll tick
// mirrors tabs THEN the session, sequentially on the main actor — the poll
// itself never publishes, so there is no poll/write race. `applyRemote`:
// - a new active tab the person did not select → select it and raise the
//   window in its persisted mode (FaceTime when hidden — R43's
//   agent-driven-open rule);
// - `mode == hidden` written by the agent (the move-on minimize) → the eye
//   minimises with no tap, no flicker (V2EyeModeStore.set is a no-op when
//   nothing changes, and the overlay guards terminate);
// - last-writer-wins: when the person acted inside the conflict window the
//   remote loses — the local snapshot is re-published instead of adopted.
// Adoptions run under `applyingRemote`, so the sinks swallow their own
// echo and the baseline absorbs the adopted values: no write-back loop.

import Combine
import Foundation

@MainActor
final class V2ViewStateSync: ObservableObject {
    private let api: any CornerV2API
    private var threadID: String?
    private var eye: V2EyeModeStore?
    private var window: VisualWindowStore?
    private var sinks: Set<AnyCancellable> = []

    /// The person's own page/scroll, by tab id. Mode + selection read live
    /// off the eye + window at flush time.
    private var pageByTab: [String: Int] = [:]
    private var scrollByTab: [String: Double] = [:]
    /// The last snapshot the server acknowledged (a failed write keeps the
    /// old one, so the next change re-sends).
    private var lastSent: V2ViewSnapshot?
    private var lastLocalActionAt = Date.distantPast
    private var applyingRemote = false
    private var flushTask: Task<Void, Never>?

    /// Coalesce window: notes inside it merge into one write, and a remote
    /// that lands inside it loses to the person's action (last-writer-wins).
    var debounce: Duration = .milliseconds(300)
    var conflictWindow: TimeInterval = 0.6
    /// Injectable clock — the conflict tests own time, never sleep.
    var now: () -> Date = Date.init

    init(api: any CornerV2API) {
        self.api = api
    }

    // MARK: - lifecycle (owned by the thread view)

    /// Start syncing one thread. The Combine sinks fire their current values
    /// on subscribe, so attaching publishes the baseline snapshot once —
    /// the agent learns what the person opened on, and a re-attach with no
    /// changes diffs clean (silent).
    func attach(threadID: String, eye: V2EyeModeStore, window: VisualWindowStore) {
        detach()
        self.threadID = threadID
        self.eye = eye
        self.window = window
        // removeDuplicates is load-bearing: the store's mirror tick re-sets
        // the selection to its current value on every poll, and a plain
        // @Published fires on every set — without this, each tick would
        // refresh lastLocalActionAt and the consume path would NEVER adopt
        // (measured: both agent UI tests red). Only genuine changes note.
        eye.$mode.removeDuplicates().sink { [weak self] mode in
            self?.noteLocal(mode: mode)
        }.store(in: &sinks)
        window.$selectedTabID.removeDuplicates().sink { [weak self] tabID in
            self?.noteLocal(tabID: tabID)
        }.store(in: &sinks)
        window.onPosition = { [weak self] tabID, page, scroll in
            self?.notePosition(tabID: tabID, page: page, scroll: scroll)
        }
    }

    func detach() {
        sinks.removeAll()
        if window?.onPosition != nil { window?.onPosition = nil }
        eye = nil
        window = nil
        threadID = nil
        flushTask?.cancel()
        flushTask = nil
    }

    // MARK: - local notes (publish path)

    private func noteLocal(mode: V2EyeMode) {
        guard !applyingRemote else { return }
        lastLocalActionAt = now()
        schedule()
    }

    private func noteLocal(tabID: String?) {
        guard !applyingRemote else { return }
        lastLocalActionAt = now()
        // A (re)selected tab reads from the top server-side: any scroll the
        // person left on it earlier is stale. Page persists per tab.
        if let tabID { scrollByTab.removeValue(forKey: tabID) }
        schedule()
    }

    /// A renderer reports the person's move: a PDF page turn (page set) or
    /// a site-reader scroll (scroll set). Always exactly one of them.
    func notePosition(tabID: String, page: Int?, scroll: Double?) {
        guard !applyingRemote else { return }
        lastLocalActionAt = now()
        if let page { pageByTab[tabID] = page }
        if let scroll { scrollByTab[tabID] = scroll }
        schedule()
    }

    private func schedule() {
        guard threadID != nil else { return }
        guard flushTask == nil else { return }
        // Set once, never reset: notes inside the window coalesce into the
        // pending write instead of postponing it (throttle, not just
        // debounce — a long scroll sends every ~300 ms, never never).
        let wait = debounce
        flushTask = Task { [weak self] in
            try? await Task.sleep(for: wait)
            guard !Task.isCancelled else { return }
            await self?.flush()
            self?.flushTask = nil
        }
    }

    private func currentSnapshot() -> V2ViewSnapshot? {
        guard let eye, let window else { return nil }
        let tabID = window.selectedTabID
        let serverPage: Int? = {
            guard let tab = window.selectedTab else { return nil }
            return Int(window.effectiveState(for: tab)["page"] ?? "")
        }()
        return V2ViewSnapshot(
            mode: eye.mode,
            tabId: tabID,
            page: tabID.flatMap { pageByTab[$0] } ?? serverPage,
            scroll: tabID.flatMap { scrollByTab[$0] }
        )
    }

    /// Build the diff and write it. Internal (not private) so the unit
    /// tests flush deterministically instead of sleeping the debounce.
    func flush() async {
        guard let tid = threadID, let current = currentSnapshot() else { return }
        guard let diff = current.diff(since: lastSent), !diff.isEmpty else { return }
        do {
            try await api.setViewState(threadID: tid, diff: diff)
            lastSent = current
        } catch {
            // Silence: the next change re-sends (lastSent keeps the old
            // baseline). View state must never banner, retry-loop, or
            // outbox — the offline banner owns failures.
        }
    }

    // MARK: - remote sessions (consume path)

    /// Apply one mirrored `getSession`. Remote mode/tab writes drive the
    /// UI; the person's action inside the conflict window wins instead and
    /// is re-published. Never publishes on its own — the only write this
    /// path can cause is the last-writer-wins re-assertion.
    func applyRemote(_ session: V2VisualSession) {
        guard let eye, let window, !applyingRemote else { return }
        let freshLocal = now().timeIntervalSince(lastLocalActionAt) < conflictWindow

        let remoteMode = session.eyeMode
        if remoteMode != eye.mode {
            if freshLocal {
                // The person's tap/gesture is still in flight: re-assert it
                // once it settles instead of flickering to the agent's.
                schedule()
            } else {
                applyingRemote = true
                eye.set(remoteMode)
                applyingRemote = false
            }
        }

        if let active = session.activeTabId,
           active != window.selectedTabID,
           window.tabs.contains(where: { $0.id == active }) {
            if freshLocal {
                schedule()
            } else {
                applyingRemote = true
                window.select(id: active)
                // R43's agent-driven-open rule, via the session instead of
                // the arrival detector: a hidden window returns as FaceTime;
                // facetime/full stay (the overlay raises the sheet in full).
                if eye.mode == .hidden { eye.set(.facetime) }
                applyingRemote = false
            }
        }

        if !freshLocal {
            // Adopted (or already equal): the baseline absorbs the remote
            // values, so no echo write follows.
            lastSent = currentSnapshot()
        }
    }
}
