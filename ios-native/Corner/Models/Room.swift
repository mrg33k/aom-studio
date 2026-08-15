// Room.swift — Corner native iOS
// corner:native-ios Stage 1
//
// The three room kinds CV6 has, mirroring deriveRoomId() in api/_lib/write-message.js:
//
//   agent 1:1  → room_id "<world>:agent:<slug>"
//   project    → room_id "<world>:project:<slug>"
//   mission    → room_id "<world>:mission:<canonical slug>"   (canonical = "<project>:<mission>")
//
// The world is NOT baked in. It comes from the signed-in user's
// `user_metadata.world`, the same source src/dashboard/lib/clientConfig.js reads,
// and when it is missing the app refuses to guess — defaulting to "aom" is exactly
// the cross-tenant leak the web closed on 2026-05-24 (Ben/Karen/Tim seeing AOM's
// world). No world resolved = no rooms rendered, and the account screen says why.

import Foundation

/// The R11 route-provenance stamp: what the front-door router decided when it chose a
/// room ON ITS OWN. Mirrors the `auto` object useIntakeRoute threads into seedRoom —
/// present on an AUTO-open, absent on a room the user picked. Its whole job is to let
/// `api/dashboard/room-activity.js` quarantine an auto-routed exchange out of the room's
/// digest until the user accepts it (see the `routed` stamp in sendBody).
struct RouteProvenance: Equatable {
    let confidence: Double
}

struct Room: Identifiable, Hashable {
    enum Kind: Hashable {
        case agent(slug: String)
        case project(slug: String)
        /// `slug` is the CANONICAL "<project>:<mission>" form; `project` is its project.
        case mission(slug: String, project: String)
    }

    let world: String
    let kind: Kind
    /// Display title. Agents render as TITLES, never persona names
    /// (cv6next/data/agentTitles.js doctrine, 2026-06-23) — "Assistant", not "Rex".
    let title: String
    let subtitle: String

    /// When populated from Convex, this holds the Convex document _id directly.
    /// Convex queries and mutations use this instead of the computed roomID.
    var convexID: String?

    var id: String { roomID }

    /// The canonical room_id rows in this room carry — also the realtime filter value
    /// and the key an APNs payload deep-links with.
    /// When convexID is set (Convex backend), use that instead.
    var roomID: String {
        if let cid = convexID, !cid.isEmpty { return cid }
        switch kind {
        case .agent(let slug):      return "\(world):agent:\(slug)"
        case .project(let slug):    return "\(world):project:\(slug)"
        case .mission(let slug, _): return "\(world):mission:\(slug)"
        }
    }

    // MARK: - Room-row contract §4 — type derived from the room_id kind

    enum TypeTag: Hashable { case project, mission, agent }

    /// The contract's three room types, straight off the room_id kind — never inferred
    /// by a reader from an icon (contract §1 part 4).
    var typeTag: TypeTag {
        switch kind {
        case .agent:   return .agent
        case .project: return .project
        case .mission: return .mission
        }
    }

    /// The required uppercase type chip label.
    var typeLabel: String {
        switch typeTag {
        case .project: return "PROJECT"
        case .mission: return "MISSION"
        case .agent:   return "AGENT"
        }
    }

    /// The key this room is bumped under in `/api/dashboard/room-activity`:
    /// a project by its slug, a mission by "<project>:<bare mission slug>",
    /// an agent 1:1 by its agent slug. All three are now present in the feed (R9).
    var activityKey: (bucket: TypeTag, key: String)? {
        switch kind {
        case .project(let slug):
            return (.project, slug)
        case .mission(let slug, let project):
            let bare = slug.split(separator: ":").last.map(String.init) ?? slug
            return (.mission, "\(project):\(bare)")
        case .agent(let slug):
            return (.agent, slug)
        }
    }

    /// The agent slug a live-step lookup keys on. Project and mission rooms are
    /// answered by `corner`, matching what the send body says.
    var stepAgentSlug: String {
        switch kind {
        case .agent(let slug): return slug
        case .project, .mission: return "corner"
        }
    }

    var stepProjectSlug: String? {
        switch kind {
        case .agent: return nil
        case .project(let slug): return slug
        case .mission(_, let project): return project
        }
    }

    /// Query items for GET /api/dashboard/supabase-messages, matching the web's
    /// useRoomThread param shapes exactly. Any drift here silently returns a
    /// DIFFERENT room's thread, which is worse than an error.
    var historyQueryItems: [URLQueryItem] {
        var items = [URLQueryItem(name: "client", value: world)]
        switch kind {
        case .agent(let slug):
            items.append(URLQueryItem(name: "agent", value: slug))
        case .project(let slug):
            items.append(URLQueryItem(name: "project", value: slug))
            items.append(URLQueryItem(name: "project_only", value: "1"))
        case .mission(let slug, let project):
            items.append(URLQueryItem(name: "mission_slug", value: slug))
            items.append(URLQueryItem(name: "project", value: project))
        }
        return items
    }

    /// The POST body for a send. Shapes copied from useRoomThread.send() — the
    /// canonical "<project>:<mission>" slug rides in metadata so the mission never
    /// enters the bare-slug first-wins lottery server-side.
    ///
    /// `routed` is the R11 provenance stamp, and it is present ONLY when Corner's router
    /// auto-opened this room from the home composer — never when the user picked it. It
    /// mirrors seedRoom's `metadata.routed { auto: true, confidence }` byte-for-byte, and
    /// it is the single thing that makes room-activity.js hold the exchange out of the
    /// room's digest until the user accepts it. Without it a native auto-route immediately
    /// shapes the room's description, so one misroute teaches the router to repeat itself
    /// ("the rule protects a room exactly once", R10/R11).
    /// The web's `_bareMissionSlug`: upload scope wants "native-ios", never
    /// "corner:native-ios" — the rag-server joins project + mission itself.
    static func bareMissionSlug(_ slug: String, project: String) -> String {
        slug.hasPrefix(project + ":") ? String(slug.dropFirst(project.count + 1)) : slug
    }

    /// The key this room's model preference lives under — data/modelPreferences.js
    /// verbatim: agent rooms use the agent slug; project AND mission rooms share the
    /// project's key. A mission inherits its project's model on the web, and the
    /// phone must not invent a second convention.
    var modelPreferenceKey: String {
        switch kind {
        case .agent(let slug): return slug
        case .project(let slug): return "project:\(slug)"
        case .mission(_, let project): return "project:\(project)"
        }
    }

    /// Canonical key shared by native, web, /api/dashboard/room-agent, and the
    /// room bridge. A mission keeps its own staffing choice instead of inheriting
    /// the whole project's choice. Agent 1:1 rooms are already the specialist.
    var agentPreferenceKey: String? {
        switch kind {
        case .agent:
            return nil
        case .project(let slug):
            return "project:\(slug)"
        case .mission(let slug, _):
            return "mission:\(slug)"
        }
    }

    /// The room key for the private checklist store — mirrors roomChecklistKey() in
    /// src/dashboard/cv6next/data/roomKeys.js. Missions carry the canonical
    /// "<project>:<mission>" slug that is already baked into `kind.mission.slug`.
    var checklistRoomKey: String {
        switch kind {
        case .agent(let slug):   return "agent:\(slug)"
        case .project(let slug): return "project:\(slug)"
        case .mission(let slug, _): return "mission:\(slug)"
        }
    }

    func sendBody(
        text: String,
        interactionMode: String = "work",
        routed: RouteProvenance? = nil,
        attachments: [Attachment] = [],
        roomAgent: String? = nil,
        clientMessageID: String? = nil
    ) -> [String: Any] {
        var body: [String: Any] = [
            "client_id": world,
            "text": text,
            "role": "user",
            "source": Config.messageSource,
        ]
        var metadata: [String: Any] = ["interaction_mode": interactionMode]
        if let clientMessageID { metadata["client_message_id"] = clientMessageID }
        if !attachments.isEmpty {
            // metadata.attachments[] — shape 1 of the four Attachment.swift parses,
            // the structured one every surface (web thread, web Files panel, native
            // bubbles, native crossings) reads first.
            metadata["attachments"] = attachments.map {
                ["url": $0.url, "name": $0.name, "mime": $0.mime, "size": $0.size] as [String: Any]
            }
        }
        switch kind {
        case .agent(let slug):
            body["agent"] = slug
        case .project(let slug):
            body["agent"] = Self.dispatchAgent(roomAgent)
            body["project"] = slug
        case .mission(let slug, let project):
            body["agent"] = Self.dispatchAgent(roomAgent)
            body["project"] = project
            metadata["mission_slug"] = slug
        }
        if let routed {
            // Match seedRoom's shape exactly: { auto: true, confidence: <number> }. The
            // absence of `accepted` IS the pending state — there is no `accepted: false`.
            metadata["routed"] = ["auto": true, "confidence": routed.confidence]
        }
        body["metadata"] = metadata
        return body
    }

    private static func dispatchAgent(_ selection: String?) -> String {
        let slug = (selection ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return slug.isEmpty || slug == "default" ? "corner" : slug
    }

    // MARK: - Parsing a room_id back into a Room (the deep-link path)

    /// Reverse of `roomID`, for `corner://room/<room_id>` taps.
    ///
    /// Mission room ids legitimately contain FOUR colon-separated parts —
    /// "aom:mission:corner:native-ios" — because the canonical mission slug is
    /// itself "<project>:<mission>". So this splits on the first two colons only
    /// and treats the remainder as one value; splitting naively would route a
    /// mission tap to a project room that may not even exist.
    static func parse(roomID: String, title: String? = nil, subtitle: String = "") -> Room? {
        let parts = roomID.split(separator: ":", maxSplits: 2, omittingEmptySubsequences: false)
        guard parts.count == 3 else { return nil }
        let world = String(parts[0])
        let kindToken = String(parts[1])
        let rest = String(parts[2])
        guard !world.isEmpty, !rest.isEmpty else { return nil }

        switch kindToken {
        case "agent":
            return Room(
                world: world,
                kind: .agent(slug: rest),
                title: title ?? AgentRoster.title(for: rest),
                subtitle: subtitle
            )
        case "project":
            return Room(
                world: world,
                kind: .project(slug: rest),
                title: title ?? prettify(rest),
                subtitle: subtitle
            )
        case "mission":
            let project = rest.split(separator: ":").first.map(String.init) ?? rest
            let leaf = rest.split(separator: ":").last.map(String.init) ?? rest
            return Room(
                world: world,
                kind: .mission(slug: rest, project: project),
                title: title ?? prettify(leaf),
                subtitle: subtitle.isEmpty ? prettify(project) : subtitle
            )
        default:
            return nil
        }
    }

    static func prettify(_ slug: String) -> String {
        slug
            .replacingOccurrences(of: "-", with: " ")
            .replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }
}

// MARK: - Agent roster

/// Mirror of DASHBOARD_AGENTS (order) + TITLE_OVERRIDES (labels) in
/// aom-studio/src/dashboard/cv6next/data/agentTitles.js.
///
/// The hardcoded AOM roster is product doctrine — the 13 titles that changed on a deploy,
/// not tenant data. For the `aom` world this is still the single source; for every OTHER
/// world `resolved` is populated from the live `/api/dashboard/room-agent` endpoint so
/// Apple's demo reviewer (or any tenant) sees only their own `agent_status` rows.
///
/// Consumers iterate `AgentRoster.resolved` (never `.all`) and call `title(for:)` which
/// checks the live name cache first, so message-author labels and file attributions
/// automatically use the server-provided display name for non-aom worlds.
enum AgentRoster {
    struct Entry: Equatable {
        let slug: String
        let title: String
        let subtitle: String
    }

    /// The AOM-product roster (unchanged, doctrine).
    static let all: [Entry] = [
        Entry(slug: "director", title: "Creative",   subtitle: "Creative direction"),
        Entry(slug: "bobby",    title: "Web",        subtitle: "Sites and frontends"),
        Entry(slug: "cleo",     title: "Content",    subtitle: "Video and content"),
        Entry(slug: "steffen",  title: "Design",     subtitle: "Brand and design"),
        Entry(slug: "gary",     title: "Operations", subtitle: "Runs the business"),
        Entry(slug: "elon",     title: "Systems",    subtitle: "Platform and infra"),
        Entry(slug: "rex",      title: "Assistant",  subtitle: "Executive assistant"),
        Entry(slug: "jacob",    title: "Outreach",   subtitle: "Cold outreach"),
        Entry(slug: "tony",     title: "Social",     subtitle: "Social media"),
        Entry(slug: "alex",     title: "Strategy",   subtitle: "Deals and strategy"),
        Entry(slug: "steve",    title: "Advisory",   subtitle: "AI advisory"),
        Entry(slug: "elmo",     title: "QA",         subtitle: "Quality gate"),
        Entry(slug: "pixel",    title: "Media",      subtitle: "Media production"),
    ]

    /// The roster views should iterate — `all` for aom, the live endpoint result for
    /// everyone else. Set once during RoomStore.load(); all views read it after that.
    static var resolved: [Entry] = all

    /// Slug-to-display-name from the live roster endpoint. Non-empty only for non-aom
    /// worlds. `title(for:)` checks here first so message author labels and file
    /// attribution automatically pick up server-provided names like "Demo EA".
    private(set) static var nameCache: [String: String] = [:]

    /// Titles for slugs that are NOT on the visible roster but can still author a row —
    /// `corner` answers every project and mission room, `studio` dispatches. A reply
    /// from one of them must not render as a bare slug, and it must never render as a
    /// persona name either.
    private static let offRosterTitles: [String: String] = [
        "corner": "Corner",
        "studio": "Studio",
    ]

    /// Resolve a slug to a human-readable title. Checks the live name cache first (for
    /// non-aom worlds), then the hardcoded roster, then off-roster overrides, then
    /// falls through to prettify so a bare slug never leaks to UI.
    static func title(for slug: String) -> String {
        let key = slug.lowercased()
        if let cached = nameCache[key] { return cached }
        if let entry = all.first(where: { $0.slug == key }) { return entry.title }
        if let off = offRosterTitles[key] { return off }
        return Room.prettify(key)
    }

    static func rooms(world: String) -> [Room] {
        rooms(world: world, entries: resolved)
    }

    static func rooms(world: String, entries: [Entry]) -> [Room] {
        entries.map { Room(world: world, kind: .agent(slug: $0.slug), title: $0.title, subtitle: $0.subtitle) }
    }

    /// Called by RoomStore.load() — sets the resolved entries and name cache for
    /// the current world. AOM keeps doctrine; everyone else gets live data.
    static func configure(world: String, liveAgents: [CornerAPI.RoomAgentOption]?) {
        if world == "aom" {
            resolved = all
            nameCache = [:]
        } else if let agents = liveAgents, !agents.isEmpty {
            resolved = agents.map { Entry(slug: $0.slug, title: $0.title, subtitle: $0.role) }
            nameCache = Dictionary(uniqueKeysWithValues: agents.map { ($0.slug.lowercased(), $0.title) })
        } else {
            // Endpoint failed: empty roster + retry on next load beats 13 fake agents.
            resolved = []
            nameCache = [:]
        }
    }
}
