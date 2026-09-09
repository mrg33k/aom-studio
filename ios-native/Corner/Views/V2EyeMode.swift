// V2EyeMode.swift — Corner native iOS
// corner:corner-v2 R43 (P094/P095) — the eye icon cycles the Visual Window.
//
// Every chat carries the eye top-right. One tap moves one step, always in
// the same order:
//
//   hidden → facetime → full → hidden …
//
// - facetime: the sheet is down and a small floating window top-right
//   (~110×160pt) shows the current tab live, draggable in the safe area.
// - full: today's sheet (Preview/Context, review, Send) — the drawer
//   context window.
// - hidden: nothing on screen. The icon stays; the agent can pull the
//   window back up (an agent-opened tab while hidden returns to facetime).
//
// The mode persists per thread, so a thread keeps the window the way its
// person left it.

import Combine
import Foundation
import SwiftUI

/// The three Visual Window presentations behind the eye icon.
enum V2EyeMode: String, Equatable, CaseIterable {
    case hidden
    case facetime
    case full

    /// The next step of the eye cycle.
    var next: V2EyeMode {
        switch self {
        case .hidden: return .facetime
        case .facetime: return .full
        case .full: return .hidden
        }
    }
}

/// Per-thread persisted eye mode. Threads that never set one start hidden,
/// so the brief's "tap 1 → FaceTime" holds from a fresh thread.
@MainActor
final class V2EyeModeStore: ObservableObject {
    @Published private(set) var mode: V2EyeMode

    let threadID: String

    init(threadID: String) {
        self.threadID = threadID
        self.mode = Self.read(threadID: threadID)
    }

    /// One eye tap: advance the cycle and persist it.
    func cycle() {
        set(mode.next)
    }

    /// Set explicitly (sheet dismissals, agent-driven opens). A no-op when
    /// nothing changes, so the view's onChange loops terminate.
    func set(_ next: V2EyeMode) {
        guard next != mode else { return }
        mode = next
        Self.write(next, threadID: threadID)
    }

    var iconName: String {
        switch mode {
        case .hidden: return "eye.slash"
        case .facetime: return "eye"
        case .full: return "eye.fill"
        }
    }

    var accessibilityLabel: String {
        switch mode {
        case .hidden: return "Visual window: hidden"
        case .facetime: return "Visual window: FaceTime"
        case .full: return "Visual window: full"
        }
    }

    // MARK: - persistence

    nonisolated static func key(threadID: String) -> String {
        "corner.v2.eye-mode.\(threadID)"
    }

    private static func read(threadID: String) -> V2EyeMode {
        guard let raw = UserDefaults.standard.string(forKey: key(threadID: threadID)),
              let mode = V2EyeMode(rawValue: raw) else { return .hidden }
        return mode
    }

    private static func write(_ mode: V2EyeMode, threadID: String) {
        UserDefaults.standard.set(mode.rawValue, forKey: key(threadID: threadID))
    }
}

// MARK: - View wiring

/// The eye's contract with the sheet, as one modifier so the thread view
/// stays a tractable expression (a separate type-checked unit). Order in
/// the chain matters: apply BEFORE the drawer overlay so the drawer stays
/// the top layer.
///
/// - Every sheet raise lands in full mode — file cards, peek bar, Files
///   rows, image runs — with no edits at their call sites.
/// - The person closing the full window (close circle, swipe down, last
///   tab closed) means hidden: on iPhone the sheet covers the eye, so the
///   close IS the ring's full→hidden step. The floating companion is the
///   AGENT's close (move on) and the agent's open — never the person's
///   dismissal.
/// - full with no tabs shows nothing; facetime/hidden drop the sheet.
/// Every branch guards on the current value, so the mode/presented
/// onChange pair always terminates.
struct V2EyeOverlay: ViewModifier {
    @ObservedObject var eye: V2EyeModeStore
    @EnvironmentObject private var window: VisualWindowStore
    var review: V2ReviewStore?

    func body(content: Content) -> some View {
        content
            .overlay {
                V2FaceTimeWindow(eye: eye, review: review)
            }
            .onChange(of: eye.mode) { _, _ in sync() }
            .onChange(of: window.isPresented) { _, presented in
                if presented {
                    eye.set(.full)
                } else if eye.mode == .full {
                    eye.set(.hidden)
                }
            }
            .onChange(of: window.tabs.count) { _, _ in sync() }
            .onChange(of: window.selectedTabID) { _, _ in sync() }
    }

    private func sync() {
        if eye.mode == .full, window.selectedTab != nil {
            if !window.isPresented { window.isPresented = true }
        } else if window.isPresented {
            window.isPresented = false
        }
    }
}
