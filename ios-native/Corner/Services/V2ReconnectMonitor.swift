// V2ReconnectMonitor.swift — Corner native iOS
// corner:corner-v2 R24 (P075).
//
// `replayOutbox` runs on foreground (the view's scenePhase hook) AND on
// reconnect: this single shared path monitor notices the network coming
// back while the app is already foregrounded and tells the thread to flush
// its queue. One monitor per process — views observe, never own.

import Foundation
import Network

/// The offline→online edge as a notification the thread observes.
extension Notification.Name {
    static let v2DidReconnect = Notification.Name("corner.v2DidReconnect")
}

@MainActor
final class V2ReconnectMonitor {
    static let shared = V2ReconnectMonitor()

    private let monitor: NWPathMonitor?
    private let queue = DispatchQueue(label: "corner.v2Reconnect")
    private var wasSatisfied = true

    init(monitor: NWPathMonitor? = NWPathMonitor()) {
        self.monitor = monitor
        monitor?.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                self?.pathChanged(satisfied: path.status == .satisfied)
            }
        }
        if monitor != nil { self.monitor?.start(queue: queue) }
    }

    deinit {
        monitor?.cancel()
    }

    /// The testable core: true exactly on the offline→online edge (and the
    /// initial state never fires — launching online is not a reconnect).
    @discardableResult
    func pathChanged(satisfied: Bool) -> Bool {
        defer { wasSatisfied = satisfied }
        let reconnected = satisfied && !wasSatisfied
        if reconnected {
            NotificationCenter.default.post(name: .v2DidReconnect, object: nil)
        }
        return reconnected
    }
}
