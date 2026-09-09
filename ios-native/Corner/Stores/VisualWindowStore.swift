// VisualWindowStore.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// One shared tab store for the Visual Window. Tabs live in the Thread's
// shared visual session on the SERVER: `load()` mirrors `visualTabs`, `open`
// appends (the server dedupes by target and returns the existing row),
// `close(id:)` removes only that id, and `select` only changes the id — it
// never touches the network. The window is never one mutable `previewFile`.
//
// Backend wins over the plan's snippets (R15 table):
// - `state` keys are page/timecodeMs/codeLine/siteViewport/reviewing; they
//   ride the `open` call. v2Native exposes NO update-state mutation
//   (setTabPositionCore/setReviewCore exist in v2Visual.ts only), so renderer
//   state after open is cached locally per tab id and re-applied on load.
// - Selection is client-side: the session row has activeTabId but v2Native
//   never reads it back, so the store persists the selected id per session in
//   UserDefaults and restores it while the tab is still open.

import Combine
import Foundation

@MainActor
final class VisualWindowStore: ObservableObject {
    @Published private(set) var tabs: [VisualWindowTab] = []
    @Published var selectedTabID: String?
    @Published var isPresented = false
    /// The thread's artifacts, for file cards and sourceURL resolution.
    @Published private(set) var artifacts: [Artifact] = []

    private let api: any CornerV2API
    private let visualSessionID: String
    /// The owning thread, for Context-tab opens. Set by `start(threadID:)`.
    private(set) var threadID: String?
    /// Renderer state cached locally per tab id (see header: no mutation).
    private var localState: [String: [String: String]] = [:]
    private var poll: Task<Void, Never>?
    /// R43 P095 (agent-driven open): every tab id the mirror has ever held,
    /// and the ids the person opened themselves. A fresh id that was never
    /// adopted locally is the agent talking about a file — the eye's hidden
    /// mode returns to facetime for it. `start` baselines silently (the
    /// first mirror is history, not an arrival); only later loads report.
    private var seenTabIDs: Set<String> = []
    private var adoptedTabIDs: Set<String> = []
    private var baselineEstablished = false
    /// Fired (main actor) when agent-opened tabs arrive. Nil by default.
    var onExternalTabs: (() -> Void)?

    init(api: any CornerV2API, visualSessionID: String) {
        self.api = api
        self.visualSessionID = visualSessionID
    }

    var selectedTab: VisualWindowTab? {
        tabs.first { $0.id == selectedTabID }
    }

    /// Server state overlaid with the local renderer cache.
    func effectiveState(for tab: VisualWindowTab) -> [String: String] {
        var merged = tab.state
        for (key, value) in localState[tab.id] ?? [:] { merged[key] = value }
        return merged
    }

    func artifact(for tab: VisualWindowTab) -> Artifact? {
        guard let id = tab.artifactID else { return nil }
        return artifacts.first { $0.id == id }
    }

    func artifact(id: String) -> Artifact? {
        artifacts.first { $0.id == id }
    }

    // MARK: - loading

    /// Mirror the server session; restore the persisted selection while its
    /// tab is still open, else keep a surviving selection, else take the
    /// first tab. Never invents tabs, never clears local renderer state.
    /// R43 P095: ids never seen before that the person never adopted are
    /// agent arrivals — reported through `onExternalTabs` once the start
    /// baseline is established.
    func load() async throws {
        let fresh = try await api.visualTabs(visualSessionID: visualSessionID)
        tabs = fresh
        let freshIDs = Set(fresh.map(\.id))
        let arrivals = freshIDs.subtracting(seenTabIDs).subtracting(adoptedTabIDs)
        seenTabIDs.formUnion(freshIDs)
        if let saved = Self.persistedSelection(sessionID: visualSessionID),
           fresh.contains(where: { $0.id == saved }) {
            selectedTabID = saved
        } else if let current = selectedTabID, fresh.contains(where: { $0.id == current }) {
            selectedTabID = current
        } else {
            selectedTabID = fresh.first?.id
        }
        if baselineEstablished, !arrivals.isEmpty {
            onExternalTabs?()
        }
    }

    func loadArtifacts(threadID: String) async {
        artifacts = (try? await api.artifacts(threadID: threadID)) ?? []
    }

    /// Load once, then poll the session like `threadEvents` (the brief's
    /// subscribe contract) so agent-opened tabs arrive without a relaunch.
    /// R43 P095: the first load baselines the arrival detector silently —
    /// history is not an arrival.
    func start(threadID: String) async {
        self.threadID = threadID
        baselineEstablished = false
        try? await load()
        baselineEstablished = true
        await loadArtifacts(threadID: threadID)
        poll?.cancel()
        poll = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                guard !Task.isCancelled else { return }
                await self?.tick(threadID: threadID)
            }
        }
    }

    func stop() {
        poll?.cancel()
        poll = nil
    }

    private func tick(threadID: String) async {
        try? await load()
        await loadArtifacts(threadID: threadID)
    }

    // MARK: - open / select / close

    /// Selecting an artifact always opens: append when the server minted a
    /// row, reselect when it deduped to an existing tab. Either way the
    /// opened tab becomes selected and the window presents.
    func open(
        _ kind: VisualTabKind, threadID: String, artifactID: String?,
        title: String, state: [String: String]
    ) async throws {
        try await adopt(
            try await api.openVisualTab(
                kind: kind, threadID: threadID, artifactID: artifactID,
                title: title, state: state
            ),
            state: state
        )
        isPresented = true
    }

    /// R32 uploads: the tab opens without presenting — the peek bar is the
    /// confirmation, not a sheet yank per file. A person opening the window
    /// finds the new tab selected.
    func openBackground(
        _ kind: VisualTabKind, threadID: String, artifactID: String?,
        title: String, state: [String: String]
    ) async throws {
        try await adopt(
            try await api.openVisualTab(
                kind: kind, threadID: threadID, artifactID: artifactID,
                title: title, state: state
            ),
            state: state
        )
    }

    private func adopt(_ tab: VisualWindowTab, state: [String: String]) async {
        // R43 P095: the person's own opens are never agent arrivals —
        // adopted before the next mirror can mistake them for one.
        adoptedTabIDs.insert(tab.id)
        seenTabIDs.insert(tab.id)
        if !state.isEmpty {
            var cached = localState[tab.id] ?? [:]
            for (key, value) in state { cached[key] = value }
            localState[tab.id] = cached
        }
        if !tabs.contains(where: { $0.id == tab.id }) {
            tabs.append(tab)
        }
        selectedTabID = tab.id
        Self.persistSelection(tab.id, sessionID: visualSessionID)
    }

    /// Selection only: no network, no reorder, unknown ids ignored.
    func select(id: String) {
        guard tabs.contains(where: { $0.id == id }) else { return }
        selectedTabID = id
        Self.persistSelection(id, sessionID: visualSessionID)
    }

    /// Only `close(id:)` removes a tab. Everything else keeps its order; a
    /// closed selection falls to the first survivor; the last close dismisses.
    func close(id: String) async throws {
        try await api.closeVisualTab(id: id)
        tabs.removeAll { $0.id == id }
        localState.removeValue(forKey: id)
        if selectedTabID == id {
            selectedTabID = tabs.first?.id
            if let next = selectedTabID {
                Self.persistSelection(next, sessionID: visualSessionID)
            } else {
                Self.clearSelection(sessionID: visualSessionID)
                isPresented = false
            }
        }
    }

    /// Renderer state write-back. Local only: v2Native has no update-state
    /// mutation, so this caches per tab id (survives `load`) and is sent on
    /// the next `open` of the same target.
    func updateState(tabID: String, key: String, value: String) {
        var cached = localState[tabID] ?? [:]
        cached[key] = value
        localState[tabID] = cached
    }

    // MARK: - selection persistence

    nonisolated static func selectionKey(sessionID: String) -> String {
        "corner.v2.visual-selection.\(sessionID)"
    }

    private static func persistedSelection(sessionID: String) -> String? {
        UserDefaults.standard.string(forKey: selectionKey(sessionID: sessionID))
    }

    private static func persistSelection(_ id: String, sessionID: String) {
        UserDefaults.standard.set(id, forKey: selectionKey(sessionID: sessionID))
    }

    private static func clearSelection(sessionID: String) {
        UserDefaults.standard.removeObject(forKey: selectionKey(sessionID: sessionID))
    }
}
