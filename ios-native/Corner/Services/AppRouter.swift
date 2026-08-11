// AppRouter.swift — Corner native iOS
// corner:native-ios Stages 1 + 3
//
// Where the app is, and how a notification tap or a `corner://` URL changes it.
//
// THE FOUR ROUTES (Stage 3). Every surface this app has is addressable, because a push
// or a widget that can only ever open a room can only ever be about a room:
//
//   corner://room/<percent-encoded room_id>   one conversation
//   corner://review                           the verdict queue
//   corner://organize                         the files browser
//   corner://tracker                          the issue boards
//
// The room form is what api/_lib/apns.js sends today, and the payload ALSO carries
// room_id, agent, project and mission_slug as separate fields. Both are read: the URL is
// the contract, the flat fields are the belt-and-braces, and the flat fields are what let
// a mission room resolve its project without inferring one from the slug.
//
// A ROUTE THIS BUILD DOES NOT KNOW MUST SAY SO. `corner://settings` is refused rather
// than silently swallowed — a notification or a widget tap that appears to do nothing is
// the worst possible answer, and the one that trains people to stop tapping.

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

// MARK: - Routes

/// Every destination the navigation stack can hold. Hashable because it IS the
/// NavigationStack path — SwiftUI needs value identity to diff it.
enum Route: Hashable {
    case room(Room)
    case review
    case organize
    case tracker

    var roomID: String? {
        if case .room(let room) = self { return room.roomID }
        return nil
    }

    /// The URL this route is reachable at, so a push or a widget can be pointed at it.
    /// Kept next to the parser so a new route cannot be added in only one direction.
    var url: URL? {
        switch self {
        case .room(let room):
            let encoded = room.roomID.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? room.roomID
            return URL(string: "\(Config.urlScheme)://room/\(encoded)")
        case .review:   return URL(string: "\(Config.urlScheme)://review")
        case .organize: return URL(string: "\(Config.urlScheme)://organize")
        case .tracker:  return URL(string: "\(Config.urlScheme)://tracker")
        }
    }
}

/// What a `corner://` URL resolved to. `.rooms` is the server's own fallback when a row
/// carried no room_id (api/_lib/apns.js sends `corner://rooms`) and it means "the rail",
/// which is a real answer and better than doing nothing.
enum DeepLinkTarget: Equatable {
    case room(DeepLink)
    case route(Route)
    case rail

    init?(url: URL) {
        guard url.scheme?.lowercased() == Config.urlScheme else { return nil }
        switch url.host?.lowercased() {
        case "room":
            guard let link = DeepLink(url: url) else { return nil }
            self = .room(link)
        case "review":   self = .route(.review)
        case "organize", "files": self = .route(.organize)
        case "tracker":  self = .route(.tracker)
        case "rooms":    self = .rail
        default: return nil
        }
    }

    /// From an APNs payload: the flat fields win (they carry more), and the `deep_link`
    /// string is the fallback — which is also how a future non-room push would arrive,
    /// since the flat fields only ever describe a message row.
    init?(userInfo: [AnyHashable: Any]) {
        if let link = DeepLink(userInfo: userInfo) {
            self = .room(link)
            return
        }
        guard let raw = userInfo["deep_link"] as? String,
              let url = URL(string: raw),
              let target = DeepLinkTarget(url: url)
        else { return nil }
        self = target
    }
}

@MainActor
final class AppRouter: ObservableObject {

    static let shared = AppRouter()

    /// The navigation stack. One element deep in practice, but a path rather than a
    /// binding so a notification tap can replace the destination outright instead of
    /// pushing a second copy of a screen already on screen.
    @Published var path: [Route] = []

    /// Set when a deep link names a destination this app cannot construct — a world the
    /// user is not in, or a route that did not exist when this build shipped. Surfaced as
    /// a message rather than swallowed.
    @Published var unresolvedLink: String?

    /// Not private: the routing rules (replace-don't-stack, refuse-don't-guess) are worth
    /// testing, and a singleton nothing can instantiate is a singleton whose rules are
    /// only ever exercised in production.
    init() {}

    var openRoom: Room? {
        if case .room(let room) = path.last { return room }
        return nil
    }

    /// The home timeline's recency order, published by RoomStore on every load so the
    /// chat swipe carousel knows its neighbors without a second fetch.
    @Published var recencyOrder: [Room] = []

    /// Settings-sheet presentation lives HERE, not in a view's @State: picking a theme
    /// re-identifies the whole tree (CornerApp `.id(theme.kind)`), and view state that
    /// dies in that rebuild would slam the sheet shut mid-choice.
    @Published var showingSettings = false

    /// The swipe carousel (Patrik's R4 gesture spec): the open chat is one card in the
    /// recency stack — swiping toward "more recent" replaces it with the room above it
    /// on home, the other way with the room below. Replacing the top of the path keeps
    /// the stack one-room-deep, exactly like tapping home rows one after another.
    func swipeChat(from current: Room, toMoreRecent: Bool) {
        guard case .room = path.last else { return }
        guard let idx = recencyOrder.firstIndex(where: { $0.roomID == current.roomID }) else {
            // Not on the recency list (deep-linked agent room): land on the most
            // recent room rather than doing nothing.
            if !toMoreRecent, let first = recencyOrder.first { path[path.count - 1] = .room(first) }
            return
        }
        let target = toMoreRecent ? idx - 1 : idx + 1
        guard recencyOrder.indices.contains(target) else { return }
        path[path.count - 1] = .room(recencyOrder[target])
    }

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
        open(.room(room))
    }

    func open(_ route: Route) {
        unresolvedLink = nil
        if path.last == route { return }
        // Replace rather than stack: tapping three banners for three rooms should leave
        // one screen open, not a three-deep back stack the user has to unwind.
        path = [route]
    }

    /// The one entry point for anything arriving from outside the app — a URL, a
    /// notification tap, a widget. Everything funnels here so "what does a tap do" has
    /// exactly one answer.
    func handle(_ target: DeepLinkTarget) {
        switch target {
        case .room(let link): open(link)
        case .route(let route): open(route)
        case .rail: closeAll()
        }
    }

    /// Refuses rather than guesses. Returns false when the URL is not ours or names a
    /// route this build has no screen for, so the caller can say so out loud.
    @discardableResult
    func handle(url: URL) -> Bool {
        guard url.scheme?.lowercased() == Config.urlScheme else { return false }
        guard let target = DeepLinkTarget(url: url) else {
            unresolvedLink = url.absoluteString
            return false
        }
        handle(target)
        return true
    }

    func closeAll() {
        path = []
        unresolvedLink = nil
    }
}
