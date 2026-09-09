// V2ViewState.swift — Corner native iOS
// corner:corner-v2 R56 (P094/P095/C016) — the phone publishes what it is
// showing and follows the agent's window.
//
// The backend (live, do not edit) owns the per-thread view state:
// - `v2Visual:setViewState({threadId, mode, tabId, page, scroll})` —
//   authenticated, tenant scoped. Naming a new tab resets its scroll to 0.
// - `v2Visual:getSession({threadId})` — returns `mode`, `activeTabId`,
//   `activeTab {tabId,title,kind,page,scroll}`, and `scroll`.
// The chat bridge reads this ("BOTH LOOKING AT: <title> …"); the agent's
// move-on writes `mode=hidden` (the minimize event); agent opens still
// arrive as `v2Visual.openTab` rows in the same visualTabs table the native
// mirror already polls.
//
// This file is the pure half: the wire DTO plus the snapshot/diff math the
// sync object (V2ViewStateSync) and the unit tests share. No network, no
// clock, no SwiftUI.

import Foundation

// MARK: - the session the agent (and the person) last wrote

/// `v2Visual:getSession` for one thread. Lenient by design: the client only
/// needs `mode` + the active tab id, so unknown siblings never break the
/// decode — a backend that grows the shape keeps working.
struct V2VisualSession: Codable, Equatable {
    /// facetime | full | hidden. Sessions written before the field existed
    /// read back as "full" server-side; an unknown value falls back to full
    /// here too (today's drawer), never to hidden — an unrecognised string
    /// must never minimise the window.
    var mode: String
    var activeTabId: String?
    var scroll: Double?
    var activeTab: V2SessionTab?

    struct V2SessionTab: Codable, Equatable {
        var tabId: String
        var title: String
        var kind: String
        var page: Int?
        var scroll: Double?
    }

    init(mode: String = "full", activeTabId: String? = nil, scroll: Double? = nil, activeTab: V2SessionTab? = nil) {
        self.mode = mode
        self.activeTabId = activeTabId
        self.scroll = scroll
        self.activeTab = activeTab
    }

    enum CodingKeys: String, CodingKey {
        case mode, activeTabId, scroll, activeTab
    }

    init(from decoder: Decoder) throws {
        let box = try decoder.container(keyedBy: CodingKeys.self)
        mode = (try box.decodeIfPresent(String.self, forKey: .mode)) ?? "full"
        activeTabId = try box.decodeIfPresent(String.self, forKey: .activeTabId)
        scroll = try box.decodeIfPresent(Double.self, forKey: .scroll)
        activeTab = try box.decodeIfPresent(V2SessionTab.self, forKey: .activeTab)
    }

    /// The session's mode as an eye mode, with the unknown-string fallback.
    var eyeMode: V2EyeMode {
        V2EyeMode(rawValue: mode) ?? .full
    }
}

// MARK: - what the person is looking at right now

/// One publishable snapshot: the eye mode, the selected tab, and that tab's
/// page/scroll when known. Page comes from the tab's renderer state (PDF
/// arrows); scroll is observed from the site reader (nothing else reports
/// one — QuickLook owns its controller, so deck/document scroll stays off).
struct V2ViewSnapshot: Equatable {
    var mode: V2EyeMode
    var tabId: String?
    var page: Int?
    var scroll: Double?

    /// The `setViewState` args for exactly the fields that changed since
    /// `lastSent`. Nil means "nothing changed — send nothing". Field-level
    /// diffs keep the wire shapes the brief names: a mode tap sends {mode},
    /// a tab select sends {tabId} (the server resets that tab's scroll),
    /// a page turn sends {page}, a scroll sends {scroll} — never a stale
    /// field re-asserted alongside.
    func diff(since lastSent: V2ViewSnapshot?) -> V2ViewStateDiff? {
        let changedMode = lastSent?.mode != mode
        let changedTab = lastSent?.tabId != tabId
        // Page/scroll ride only against a stable tab: a tab change carries
        // no position (the server zeroes the new tab's scroll anyway).
        let changedPage = !changedTab && lastSent?.page != page && page != nil
        let changedScroll = !changedTab && lastSent?.scroll != scroll && scroll != nil
        guard changedMode || changedTab || changedPage || changedScroll else { return nil }
        let diff = V2ViewStateDiff(
            mode: changedMode ? mode : nil,
            tabId: changedTab ? tabId : nil,
            page: changedPage ? page : nil,
            scroll: changedScroll ? scroll : nil
        )
        // A deselect (tabId → nil) names nothing the server can take: no
        // write, the next select carries the tab.
        return diff.isEmpty ? nil : diff
    }
}

/// The wire args for one `setViewState` call. Every field is optional and
/// unset fields are omitted from the mutation args (the strict-envelope
/// rule: only known fields ever ride).
struct V2ViewStateDiff: Equatable {
    var mode: V2EyeMode?
    var tabId: String?
    var page: Int?
    var scroll: Double?

    var isEmpty: Bool {
        mode == nil && tabId == nil && page == nil && scroll == nil
    }
}
