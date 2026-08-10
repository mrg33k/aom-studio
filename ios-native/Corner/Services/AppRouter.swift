// AppRouter.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Where the app is, and how a notification tap or a `corner://` URL changes it.
//
// The deep link the server sends is `corner://room/<percent-encoded room_id>`
// (api/_lib/apns.js), and the payload ALSO carries room_id, agent, project and
// mission_slug as separate fields. Both are read: the URL is the contract, the flat
// fields are the belt-and-braces, and the flat fields are what let a mission room
// resolve its project without inferring one from the slug.

import Foundation

struct DeepLink: Equatable {
    let roomID: String
    let messageID: String?
    let project: String?
    let missionSlug: String?

    /// From an APNs payload.
    init?(userInfo: [AnyHashable: Any]) {
        let flatRoom = (userInfo["room_id"] as? String)?.trimmingCharacters(in: .whitespaces)
        let fromURL = DeepLink.roomID(fromDeepLinkString: userInfo["deep_link"] as? String)
        guard let room = (flatRoom?.isEmpty == false ? flatRoom : fromURL), !room.isEmpty else {
            return nil
        }
        roomID = room
        messageID = userInfo["message_id"] as? String
        project = userInfo["project"] as? String
        missionSlug = userInfo["mission_slug"] as? String
    }

    /// From a `corner://` URL opened by the system.
    init?(url: URL) {
        guard url.scheme?.lowercased() == Config.urlScheme else { return nil }
        guard url.host == "room" else { return nil }
        let path = url.path.hasPrefix("/") ? String(url.path.dropFirst()) : url.path
        let decoded = path.removingPercentEncoding ?? path
        guard !decoded.isEmpty else { return nil }
        roomID = decoded
        messageID = nil
        project = nil
        missionSlug = nil
    }

    init(roomID: String) {
        self.roomID = roomID
        self.messageID = nil
        self.project = nil
        self.missionSlug = nil
    }

    private static func roomID(fromDeepLinkString raw: String?) -> String? {
        guard let raw, let url = URL(string: raw) else { return nil }
        return DeepLink(url: url)?.roomID
    }

    /// Resolve to a Room. Mission rooms take their project from the payload when it is
    /// there; otherwise the canonical "<project>:<mission>" slug inside the room_id
    /// carries it, which is why `Room.parse` splits on only the first two colons.
    func resolveRoom() -> Room? {
        guard var room = Room.parse(roomID: roomID) else { return nil }
        if case .mission(let slug, let derivedProject) = room.kind {
            let project = (project?.isEmpty == false ? project! : derivedProject)
            room = Room(
                world: room.world,
                kind: .mission(slug: slug, project: project),
                title: room.title,
                subtitle: room.subtitle
            )
        }
        return room
    }
}

@MainActor
final class AppRouter: ObservableObject {

    static let shared = AppRouter()

    /// The navigation stack of rooms. One element deep in practice, but a path rather
    /// than a binding so a notification tap can replace the destination outright
    /// instead of pushing a second copy of a room already on screen.
    @Published var path: [Room] = []

    /// Set when a deep link names a room this app cannot construct — a world the user
    /// is not in, or a room kind that did not exist when this build shipped. Surfaced
    /// as a message rather than swallowed: a tap that does nothing is the worst answer.
    @Published var unresolvedLink: String?

    /// Not private: the routing rules (replace-don't-stack, refuse-don't-guess) are
    /// worth testing, and a singleton nothing can instantiate is a singleton whose
    /// rules are only ever exercised in production.
    init() {}

    var openRoom: Room? { path.last }

    func isShowing(_ link: DeepLink?) -> Bool {
        guard let link, let open = openRoom else { return false }
        return open.roomID == link.roomID
    }

    func open(_ link: DeepLink) {
        guard let room = link.resolveRoom() else {
            unresolvedLink = link.roomID
            return
        }
        open(room)
    }

    func open(_ room: Room) {
        unresolvedLink = nil
        if path.last?.roomID == room.roomID { return }
        // Replace rather than stack: tapping three banners for three rooms should leave
        // one room open, not a three-deep back stack the user has to unwind.
        path = [room]
    }

    func closeAll() {
        path = []
        unresolvedLink = nil
    }
}
