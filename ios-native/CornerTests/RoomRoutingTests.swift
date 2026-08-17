// RoomRoutingTests.swift — Corner native iOS
// corner:native-ios Stage 1
//
// These cover the layer where a mistake is SILENT: get a room_id or a history query
// shape subtly wrong and the app does not crash — it shows a different room's
// conversation, or an empty one, and looks like it is working.

import XCTest
@testable import Corner

final class RoomRoutingTests: XCTestCase {

    // MARK: - room_id derivation (mirrors deriveRoomId in write-message.js)

    func testAgentRoomID() {
        let room = Room(world: "aom", kind: .agent(slug: "rex"), title: "Assistant", subtitle: "")
        XCTAssertEqual(room.roomID, "aom:agent:rex")
    }

    func testProjectRoomID() {
        let room = Room(world: "aom", kind: .project(slug: "corner"), title: "Corner", subtitle: "")
        XCTAssertEqual(room.roomID, "aom:project:corner")
    }

    func testMissionRoomIDUsesCanonicalSlug() {
        let room = Room(
            world: "aom",
            kind: .mission(slug: "corner:native-ios", project: "corner"),
            title: "Native iOS",
            subtitle: ""
        )
        XCTAssertEqual(room.roomID, "aom:mission:corner:native-ios")
    }

    func testWorldIsNotHardcoded() {
        let room = Room(world: "arsenal", kind: .agent(slug: "rex"), title: "Assistant", subtitle: "")
        XCTAssertEqual(room.roomID, "arsenal:agent:rex")
    }

    // MARK: - Parsing back (the deep-link path)

    /// The one that bites: a mission room_id has FOUR colon-separated parts because
    /// the canonical mission slug is itself "<project>:<mission>". A naive split routes
    /// the tap to a project room that may not exist.
    func testParseMissionRoomIDKeepsCanonicalSlugIntact() throws {
        let room = try XCTUnwrap(Room.parse(roomID: "aom:mission:corner:native-ios"))
        guard case .mission(let slug, let project) = room.kind else {
            return XCTFail("expected a mission room, got \(room.kind)")
        }
        XCTAssertEqual(slug, "corner:native-ios")
        XCTAssertEqual(project, "corner")
        XCTAssertEqual(room.world, "aom")
        XCTAssertEqual(room.roomID, "aom:mission:corner:native-ios", "parse must round-trip")
    }

    func testParseAgentRoomIDUsesTitleNotPersonaName() throws {
        let room = try XCTUnwrap(Room.parse(roomID: "aom:agent:rex"))
        // Agents show as TITLES, never persona names (agentTitles.js doctrine).
        XCTAssertEqual(room.title, "Assistant")
        XCTAssertNotEqual(room.title.lowercased(), "rex")
    }

    func testParseRejectsGarbage() {
        XCTAssertNil(Room.parse(roomID: "nonsense"))
        XCTAssertNil(Room.parse(roomID: "aom:unknownkind:thing"))
        XCTAssertNil(Room.parse(roomID: "aom:agent:"))
        XCTAssertNil(Room.parse(roomID: ""))
    }

    func testOffRosterAgentStillGetsATitleNotASlug() {
        XCTAssertEqual(AgentRoster.title(for: "corner"), "Corner")
        XCTAssertEqual(AgentRoster.title(for: "studio"), "Studio")
        // An agent nobody mapped must still never render as a bare lowercase slug.
        XCTAssertEqual(AgentRoster.title(for: "brand-new-agent"), "Brand New Agent")
    }

    func testRosterMatchesDashboardAgentsOrder() {
        // Mirrors DASHBOARD_AGENTS in cv6next/data/agentTitles.js. `corner` and
        // `studio` author rows but are NOT on the visible roster.
        XCTAssertEqual(
            AgentRoster.all.map(\.slug),
            ["director", "bobby", "cleo", "steffen", "gary", "elon",
             "rex", "jacob", "tony", "alex", "steve", "elmo", "pixel"]
        )
    }

    // MARK: - Tenant-scoped roster (mirrors web 750feda9)

    func testAomWorldKeepsHardcodedRoster() {
        // aom world ALWAYS uses the hardcoded doctrine roster regardless of live data.
        AgentRoster.configure(world: "aom", liveAgents: nil)
        XCTAssertEqual(AgentRoster.resolved.count, 13)
        XCTAssertEqual(AgentRoster.resolved.map(\.slug), AgentRoster.all.map(\.slug))
        // Name cache is empty — aom uses the hardcoded titles directly.
        XCTAssertEqual(AgentRoster.title(for: "rex"), "Assistant")
    }

    func testNonAomWorldRendersOnlyLiveAgents() {
        // A tenant with one agent in agent_status should see exactly that one.
        let live = [CornerAPI.RoomAgentOption(slug: "ea", title: "Demo EA", role: "Your assistant")]
        AgentRoster.configure(world: "demo", liveAgents: live)

        XCTAssertEqual(AgentRoster.resolved.count, 1)
        XCTAssertEqual(AgentRoster.resolved.first?.slug, "ea")
        XCTAssertEqual(AgentRoster.resolved.first?.title, "Demo EA")
        XCTAssertEqual(AgentRoster.resolved.first?.subtitle, "Your assistant")

        // title(for:) uses the live name, not prettify.
        XCTAssertEqual(AgentRoster.title(for: "ea"), "Demo EA")
        // Unrecognized slugs still prettify (no crash, no bare slug).
        XCTAssertEqual(AgentRoster.title(for: "unknown-agent"), "Unknown Agent")

        // rooms() builds Room objects from the resolved entries.
        let rooms = AgentRoster.rooms(world: "demo")
        XCTAssertEqual(rooms.count, 1)
        XCTAssertEqual(rooms.first?.roomID, "demo:agent:ea")
        XCTAssertEqual(rooms.first?.title, "Demo EA")

        // Restore defaults so other tests are unaffected.
        AgentRoster.configure(world: "aom", liveAgents: nil)
    }

    func testNonAomEndpointFailureGivesEmptyRoster() {
        // Endpoint failing for a non-aom world should produce an empty roster
        // (beats showing 13 fake agents).
        AgentRoster.configure(world: "demo", liveAgents: nil)
        XCTAssertTrue(AgentRoster.resolved.isEmpty)
        XCTAssertTrue(AgentRoster.rooms(world: "demo").isEmpty)

        // Restore defaults.
        AgentRoster.configure(world: "aom", liveAgents: nil)
    }

    func testNameCacheUsedByTitleForSlug() {
        let live = [CornerAPI.RoomAgentOption(slug: "ea", title: "Demo EA", role: "assistant")]
        AgentRoster.configure(world: "demo", liveAgents: live)

        // The name cache takes priority over prettify for known slugs.
        XCTAssertEqual(AgentRoster.title(for: "ea"), "Demo EA")
        XCTAssertEqual(AgentRoster.title(for: "EA"), "Demo EA") // case-insensitive

        // Off-roster titles still work (corner/studio).
        XCTAssertEqual(AgentRoster.title(for: "corner"), "Corner")

        // Restore defaults.
        AgentRoster.configure(world: "aom", liveAgents: nil)
    }

    // MARK: - History query shapes (must match useRoomThread exactly)

    private func items(_ room: Room) -> [String: String] {
        Dictionary(uniqueKeysWithValues: room.historyQueryItems.map { ($0.name, $0.value ?? "") })
    }

    func testAgentHistoryQuery() {
        let q = items(Room(world: "aom", kind: .agent(slug: "rex"), title: "", subtitle: ""))
        XCTAssertEqual(q["client"], "aom")
        XCTAssertEqual(q["agent"], "rex")
        XCTAssertNil(q["project"])
    }

    func testProjectHistoryQueryCarriesProjectOnly() {
        let q = items(Room(world: "aom", kind: .project(slug: "corner"), title: "", subtitle: ""))
        XCTAssertEqual(q["project"], "corner")
        // Without project_only the project room shows its missions' traffic too.
        XCTAssertEqual(q["project_only"], "1")
    }

    func testMissionHistoryQueryCarriesBothSlugAndProject() {
        let q = items(Room(
            world: "aom",
            kind: .mission(slug: "corner:native-ios", project: "corner"),
            title: "", subtitle: ""
        ))
        XCTAssertEqual(q["mission_slug"], "corner:native-ios")
        XCTAssertEqual(q["project"], "corner")
    }

    // MARK: - Send body shapes

    func testAgentSendBody() {
        let body = Room(world: "aom", kind: .agent(slug: "rex"), title: "", subtitle: "")
            .sendBody(text: "hello")
        XCTAssertEqual(body["client_id"] as? String, "aom")
        XCTAssertEqual(body["agent"] as? String, "rex")
        XCTAssertEqual(body["role"] as? String, "user")
        XCTAssertEqual(body["source"] as? String, "corner-native-ios")
        XCTAssertNil(body["project"])
    }

    func testProjectSendBodyIsAnsweredByCorner() {
        let body = Room(world: "aom", kind: .project(slug: "corner"), title: "", subtitle: "")
            .sendBody(text: "hello")
        XCTAssertEqual(body["agent"] as? String, "corner")
        XCTAssertEqual(body["project"] as? String, "corner")
    }

    func testProjectSendBodyUsesSelectedRoomSpecialist() {
        let room = Room(world: "aom", kind: .project(slug: "corner"), title: "", subtitle: "")
        let body = room.sendBody(text: "hello", roomAgent: "elon")
        XCTAssertEqual(body["agent"] as? String, "elon")
        XCTAssertEqual(body["project"] as? String, "corner")
        XCTAssertEqual(room.agentPreferenceKey, "project:corner")
    }

    func testMissionRoomSpecialistKeyIsCanonicalAndIndependent() {
        let room = Room(
            world: "aom",
            kind: .mission(slug: "corner:native-ios", project: "corner"),
            title: "", subtitle: ""
        )
        XCTAssertEqual(room.agentPreferenceKey, "mission:corner:native-ios")
        XCTAssertEqual(room.sendBody(text: "hello", roomAgent: "default")["agent"] as? String, "corner")
        XCTAssertEqual(room.sendBody(text: "hello", roomAgent: "rex")["agent"] as? String, "rex")
    }

    /// The canonical slug must ride in metadata. Sending the bare tail drops the
    /// mission into the server's first-wins slug lottery.
    func testMissionSendBodyCarriesCanonicalSlugInMetadata() throws {
        let body = Room(
            world: "aom",
            kind: .mission(slug: "corner:native-ios", project: "corner"),
            title: "", subtitle: ""
        ).sendBody(text: "hello")
        XCTAssertEqual(body["agent"] as? String, "corner")
        XCTAssertEqual(body["project"] as? String, "corner")
        let meta = try XCTUnwrap(body["metadata"] as? [String: String])
        XCTAssertEqual(meta["mission_slug"], "corner:native-ios")
        XCTAssertEqual(meta["interaction_mode"], "work")
    }

    // MARK: - R11 route-provenance stamp (mirrors seedRoom's metadata.routed)

    /// An AUTO-routed send — the front door chose the room — must carry the R11 stamp
    /// so room-activity.js quarantines the exchange out of the room's digest until the
    /// user accepts it. Without it one native misroute re-teaches the router (R10/R11).
    func testAutoRoutedSendBodyCarriesRoutedStamp() throws {
        let body = Room(
            world: "aom",
            kind: .mission(slug: "corner:native-ios", project: "corner"),
            title: "", subtitle: ""
        ).sendBody(text: "hello", routed: RouteProvenance(confidence: 0.91))
        let meta = try XCTUnwrap(body["metadata"] as? [String: Any])
        let routed = try XCTUnwrap(meta["routed"] as? [String: Any])
        XCTAssertEqual(routed["auto"] as? Bool, true)
        XCTAssertEqual(routed["confidence"] as? Double, 0.91)
        // The canonical slug + mode still ride alongside the stamp.
        XCTAssertEqual(meta["mission_slug"] as? String, "corner:native-ios")
        XCTAssertEqual(meta["interaction_mode"] as? String, "work")
    }

    /// A room the USER picked (or the room composer) carries NO stamp — matching
    /// seedRoom, where only an automatic choice is provisional. Absence IS the accepted
    /// state; there is no `accepted: false`.
    func testUserPickedSendBodyHasNoRoutedStamp() throws {
        let body = Room(world: "aom", kind: .project(slug: "corner"), title: "", subtitle: "")
            .sendBody(text: "hello")
        let meta = try XCTUnwrap(body["metadata"] as? [String: Any])
        XCTAssertNil(meta["routed"])
    }

    // MARK: - Rooms with no canonical key (gauntlet R1)
    //
    // Every shape below is a REAL row copied off rooms:listRooms on the live
    // deployment, where 24 of 391 rooms carry no legacyRoomId. The reader used to
    // require that field, so those rooms — Wolfpack, AOM, and everything made with
    // "+ New" — could never appear on the phone at all.

    private func convexRoom(_ json: String) throws -> RoomStore.ConvexRoom {
        try JSONDecoder().decode(RoomStore.ConvexRoom.self, from: Data(json.utf8))
    }

    /// legacyRoomId always wins. The backend is minting canonical keys for these rows;
    /// the moment one carries a real key this reader must use it and stop guessing.
    func testCanonicalKeyPrefersLegacyRoomID() throws {
        let cr = try convexRoom("""
        {"_id":"jn74dg7","legacyRoomId":"aom:mission:corner:convex-multi-agent",
         "kind":"mission","project":"corner","title":"convex-multi-agent"}
        """)
        XCTAssertEqual(RoomStore.canonicalKey(for: cr, world: "aom"), "aom:mission:corner:convex-multi-agent")
    }

    /// A key-less project room derives the key the writer would have written — verified
    /// against the deployment: "aom:project:wolfpack" returns Wolfpack's real thread.
    func testKeylessProjectRoomDerivesItsCanonicalKey() throws {
        let cr = try convexRoom("""
        {"_id":"jn7aftk570t2f4d9cs19s6jam98ch202","kind":"project","project":"wolfpack","title":"Wolfpack"}
        """)
        XCTAssertEqual(RoomStore.canonicalKey(for: cr, world: "aom"), "aom:project:wolfpack")
        let room = try XCTUnwrap(RoomStore.room(from: cr, world: "aom"))
        XCTAssertEqual(room.roomID, "aom:project:wolfpack")
        XCTAssertEqual(room.title, "Wolfpack")
        XCTAssertEqual(room.convexID, "jn7aftk570t2f4d9cs19s6jam98ch202")
    }

    /// A mission with a project and a title but no slug: the canonical mission key is
    /// two parts, "<project>:<mission>". "aom:mission:corner:native-ios" resolves a real
    /// thread on the live deployment.
    func testKeylessMissionRoomDerivesProjectAndLeaf() throws {
        let cr = try convexRoom("""
        {"_id":"jn739ekyk0892yr90xd53n2mxh8chtnr","kind":"mission","project":"corner","title":"Native iOS"}
        """)
        XCTAssertEqual(RoomStore.canonicalKey(for: cr, world: "aom"), "aom:mission:corner:native-ios")
        let room = try XCTUnwrap(RoomStore.room(from: cr, world: "aom"))
        XCTAssertEqual(room.kind, .mission(slug: "corner:native-ios", project: "corner"))
    }

    /// A dot is part of a real project slug and must survive slugification.
    func testProjectSlugKeepsItsDot() throws {
        let cr = try convexRoom("""
        {"_id":"jn76h1r","kind":"mission","project":"aheadofmarket.com","title":"Home"}
        """)
        XCTAssertEqual(RoomStore.canonicalKey(for: cr, world: "aom"), "aom:mission:aheadofmarket.com:home")
    }

    func testKeylessAgentRoomDerivesFromSpecialist() throws {
        let cr = try convexRoom("""
        {"_id":"jn79wtv","kind":"agent","specialist":"corner","title":"Corner"}
        """)
        XCTAssertEqual(RoomStore.canonicalKey(for: cr, world: "aom"), "aom:agent:corner")
    }

    /// "New Room" — created with "+ New", no project, no slug, no name yet. Nothing can
    /// be derived, so it falls back to the bare Convex id, which the server DOES resolve
    /// as a room key. The old reader dropped it entirely and it could never be reopened.
    func testUnnameableRoomFallsBackToTheBareConvexID() throws {
        let cr = try convexRoom("""
        {"_id":"jn76ap85bbhvaepj318wxxyt8s8cj2ts","kind":"project","title":"New Room"}
        """)
        XCTAssertNil(RoomStore.canonicalKey(for: cr, world: "aom"))
        let room = try XCTUnwrap(RoomStore.room(from: cr, world: "aom"))
        XCTAssertEqual(room.roomID, "jn76ap85bbhvaepj318wxxyt8s8cj2ts",
                       "the bare id is the key — a prefixed 'aom:project:<id>' returns no messages")
        XCTAssertEqual(room.title, "New Room")
    }

    /// nil and 0 are different answers. Absent means the backend has no read-state yet
    /// and the row must fall back to its own dot, not render "all caught up".
    func testUnreadCountIsAbsentUntilTheServerSendsIt() throws {
        XCTAssertNil(try convexRoom(#"{"_id":"a","kind":"project","project":"corner"}"#).unreadCount)
        XCTAssertEqual(try convexRoom(#"{"_id":"a","kind":"project","project":"corner","unreadCount":0}"#).unreadCount, 0)
        XCTAssertEqual(try convexRoom(#"{"_id":"a","kind":"project","project":"corner","unreadCount":12}"#).unreadCount, 12)
    }
}
