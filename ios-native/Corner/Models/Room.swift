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

    var id: String { roomID }

    /// The canonical room_id rows in this room carry — also the realtime filter value
    /// and the key an APNs payload deep-links with.
    var roomID: String {
        switch kind {
        case .agent(let slug):      return "\(world):agent:\(slug)"
        case .project(let slug):    return "\(world):project:\(slug)"
        case .mission(let slug, _): return "\(world):mission:\(slug)"
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
    func sendBody(text: String, interactionMode: String = "work") -> [String: Any] {
        var body: [String: Any] = [
            "client_id": world,
            "text": text,
            "role": "user",
            "source": Config.messageSource,
        ]
        switch kind {
        case .agent(let slug):
            body["agent"] = slug
            body["metadata"] = ["interaction_mode": interactionMode]
        case .project(let slug):
            body["agent"] = "corner"
            body["project"] = slug
            body["metadata"] = ["interaction_mode": interactionMode]
        case .mission(let slug, let project):
            body["agent"] = "corner"
            body["project"] = project
            body["metadata"] = ["mission_slug": slug, "interaction_mode": interactionMode]
        }
        return body
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
/// This is a hardcoded mirror on purpose, and it is the one piece of rail data that
/// is: the roster is product doctrine that changes on a deploy, not tenant data, and
/// there is no endpoint that serves it. Projects and missions below it come from the
/// live APIs. When agentTitles.js changes, this list changes with it.
enum AgentRoster {
    struct Entry {
        let slug: String
        let title: String
        let subtitle: String
    }

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

    /// Titles for slugs that are NOT on the visible roster but can still author a row —
    /// `corner` answers every project and mission room, `studio` dispatches. A reply
    /// from one of them must not render as a bare slug, and it must never render as a
    /// persona name either.
    private static let offRosterTitles: [String: String] = [
        "corner": "Corner",
        "studio": "Studio",
    ]

    static func title(for slug: String) -> String {
        let key = slug.lowercased()
        if let entry = all.first(where: { $0.slug == key }) { return entry.title }
        if let off = offRosterTitles[key] { return off }
        return Room.prettify(key)
    }

    static func rooms(world: String) -> [Room] {
        all.map { Room(world: world, kind: .agent(slug: $0.slug), title: $0.title, subtitle: $0.subtitle) }
    }
}
