// R41HomeWelcomeTests.swift — Corner native iOS
// corner:corner-v2 R41 — the phone's home is a welcome screen.
//
// Pins: the suggestion builder (noise dropped, grouping, freshest-three,
// nav resolution, onboarding fill order), the welcome-name rule (never an
// email or a "+" string), the title→slug join key, the two endpoints, the
// home model (world/limit plumbing, failure → onboarding), and the wire
// decode of both DTOs.

import XCTest
@testable import Corner

@MainActor
final class R41HomeWelcomeTests: XCTestCase {
    // MARK: - helpers

    private func item(
        _ id: String, what: String, subjects: [String], atSeconds: TimeInterval
    ) -> WorldLedgerItem {
        WorldLedgerItem(
            id: id, what: what, subjects: subjects,
            atMs: atSeconds * 1000
        )
    }

    private func projectNode(_ title: String, tint: String = "#5B9BFF") -> V2NavNode {
        let slug = V2NavNode(
            id: "x", threadId: "x", kind: "project", title: title, projectId: "x"
        ).slugifiedTitle
        return V2NavNode(
            id: "proj-\(slug)", threadId: "thread-\(slug)", kind: "project",
            title: title, projectId: "proj-\(slug)", tint: tint
        )
    }

    private func missionNode(_ title: String, parent: V2NavNode) -> V2NavNode {
        let slug = V2NavNode(
            id: "x", threadId: "x", kind: "project", title: title, projectId: "x"
        ).slugifiedTitle
        return V2NavNode(
            id: "mission-\(slug)", threadId: "thread-\(slug)", kind: "mission",
            title: title, projectId: parent.id, parentProjectId: parent.id,
            tint: parent.tint
        )
    }

    private var aster: V2NavNode { projectNode("Aster") }
    private var general: V2NavNode { projectNode("General", tint: "#8B5CF6") }

    // MARK: - noise

    func testRunAndWindowNoiseDrops() {
        let nodes = [general, aster]
        let items = [
            item("n1", what: "Started a corner-v2-chat run for the deck.", subjects: ["aster"], atSeconds: 300),
            item("n2", what: "Finished a corner-v2-chat run.", subjects: ["aster"], atSeconds: 290),
            item("n3", what: "Opened the deck in the Visual Window.", subjects: ["aster"], atSeconds: 280),
            item("n4", what: "Closed the brief on the phone.", subjects: ["aster"], atSeconds: 270),
            item("n5", what: "Pinned the hero to the board.", subjects: ["aster"], atSeconds: 260),
            item("r1", what: "Shipped the Aster home page hero.", subjects: ["aster"], atSeconds: 100),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: nodes)
        XCTAssertEqual(cards[0].subject, "aster")
        XCTAssertEqual(cards[0].subline, "Shipped the Aster home page hero.")
    }

    func testNoiseNeverBeatsRecency() {
        // The noise row is newer than the real one and must still lose.
        let items = [
            item("n1", what: "Finished a corner-v2-chat run.", subjects: ["aster"], atSeconds: 500),
            item("r1", what: "Shipped the Aster home page hero.", subjects: ["aster"], atSeconds: 100),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: [aster])
        XCTAssertEqual(cards[0].subline, "Shipped the Aster home page hero.")
    }

    // MARK: - grouping + freshest three

    func testGroupsBySubjectFreshestFirst() {
        let nodes = [general, aster, projectNode("Northwind")]
        let items = [
            item("a1", what: "Old Aster note.", subjects: ["aster"], atSeconds: 100),
            item("n1", what: "Scoped Northwind.", subjects: ["northwind"], atSeconds: 200),
            item("a2", what: "New Aster note.", subjects: ["aster"], atSeconds: 300),
            item("g1", what: "Tidied General.", subjects: ["general"], atSeconds: 150),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: nodes)
        XCTAssertEqual(cards.map(\.subject), ["aster", "northwind", "general"])
        XCTAssertEqual(cards[0].subline, "New Aster note.")
    }

    func testOneItemServesEverySubject() {
        let nodes = [general, aster]
        let items = [
            item("m1", what: "Cut the launch deck.", subjects: ["aster", "general"], atSeconds: 100),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: nodes)
        XCTAssertEqual(cards[0].subject, "aster")
        XCTAssertEqual(cards[1].subject, "general")
        XCTAssertEqual(cards[1].subline, "Cut the launch deck.")
    }

    func testSubjectWithoutNavigationIsSkipped() {
        let items = [
            item("f1", what: "Did something elsewhere.", subjects: ["faraway"], atSeconds: 400),
            item("a1", what: "Shipped the Aster home page hero.", subjects: ["aster"], atSeconds: 100),
        ]
        let cards = HomeSuggestions.build(items: items, nodes: [aster])
        XCTAssertEqual(cards[0].subject, "aster")
        XCTAssertTrue(cards[1].isOnboarding, "the foreign subject must not take a card")
    }

    func testEmptySubjectsNeverGroup() {
        let items = [item("e1", what: "A sentence with no subject.", subjects: [], atSeconds: 400)]
        let cards = HomeSuggestions.build(items: items, nodes: [aster])
        XCTAssertTrue(cards.allSatisfy(\.isOnboarding))
    }

    // MARK: - resolution

    func testMissionResolvesToItsParentProject() {
        let deck = missionNode("Spring launch deck", parent: aster)
        let items = [item("d1", what: "Reviewed the deck status.", subjects: ["spring-launch-deck"], atSeconds: 100)]
        let cards = HomeSuggestions.build(items: items, nodes: [aster, deck])
        XCTAssertEqual(cards[0].projectTitle, "Aster")
        XCTAssertEqual(cards[0].projectThreadID, "thread-aster")
        XCTAssertEqual(cards[0].prefillText, "Pick up where we left off on Aster.")
        XCTAssertFalse(cards[0].isOnboarding)
    }

    func testProjectBeatsSameNamedMission() {
        let dup = V2NavNode(
            id: "mission-aster", threadId: "thread-mission-aster", kind: "mission",
            title: "Aster", projectId: "proj-other", parentProjectId: "proj-other"
        )
        let items = [item("a1", what: "A note.", subjects: ["aster"], atSeconds: 100)]
        let cards = HomeSuggestions.build(items: items, nodes: [dup, aster])
        XCTAssertEqual(cards[0].projectThreadID, "thread-aster")
    }

    func testOrphanedMissionFallsBackToItself() {
        let orphan = V2NavNode(
            id: "mission-gone", threadId: "thread-gone", kind: "mission",
            title: "Gone", projectId: "proj-gone", parentProjectId: "proj-gone"
        )
        let items = [item("g1", what: "A note.", subjects: ["gone"], atSeconds: 100)]
        let cards = HomeSuggestions.build(items: items, nodes: [orphan])
        XCTAssertEqual(cards[0].projectTitle, "Gone")
        XCTAssertEqual(cards[0].projectThreadID, "thread-gone")
    }

    // MARK: - fill order

    func testFillsWithOnboardingInOrder() {
        let items = [item("a1", what: "Shipped it.", subjects: ["aster"], atSeconds: 100)]
        let cards = HomeSuggestions.build(items: items, nodes: [aster])
        XCTAssertEqual(cards.count, 3)
        XCTAssertEqual(cards[0].subject, "aster")
        XCTAssertEqual(cards[1].projectTitle, "Bring in your context")
        XCTAssertEqual(cards[2].projectTitle, "Connect where the work lives")
        XCTAssertTrue(cards[1].isOnboarding && cards[2].isOnboarding)
    }

    func testNoneMeansThreeOnboardingRows() {
        let cards = HomeSuggestions.build(items: [], nodes: [])
        XCTAssertEqual(cards.map(\.projectTitle), [
            "Bring in your context",
            "Connect where the work lives",
            "Start your first project",
        ])
    }

    // MARK: - name rule

    func testWelcomeNameRule() {
        XCTAssertEqual(HomeSuggestions.welcomeFirstName(displayName: "Patrik Matheson"), "Patrik")
        XCTAssertEqual(HomeSuggestions.welcomeFirstName(displayName: "Patrik"), "Patrik")
        XCTAssertEqual(HomeSuggestions.welcomeFirstName(displayName: "  Patrik  "), "Patrik")
        XCTAssertNil(HomeSuggestions.welcomeFirstName(displayName: nil))
        XCTAssertNil(HomeSuggestions.welcomeFirstName(displayName: ""))
        XCTAssertNil(HomeSuggestions.welcomeFirstName(displayName: "   "))
        // Never an email…
        XCTAssertNil(HomeSuggestions.welcomeFirstName(displayName: "patrik@example.com"))
        XCTAssertNil(HomeSuggestions.welcomeFirstName(displayName: "Patrik Matheson patrik@example.com"))
        // …or a "+" string (some accounts carry the email prefix as the name).
        XCTAssertNil(HomeSuggestions.welcomeFirstName(displayName: "corner-v2-e2e+20260906t201253"))
        XCTAssertNil(HomeSuggestions.welcomeFirstName(displayName: "+14155550123"))
    }

    // MARK: - slug join key

    func testSlugifiedTitleMirrorsBackendSlugify() {
        func slug(_ title: String) -> String {
            V2NavNode(id: "x", threadId: "x", kind: "project", title: title, projectId: "x").slugifiedTitle
        }
        XCTAssertEqual(slug("General"), "general")
        XCTAssertEqual(slug("Harbor Coffee Live"), "harbor-coffee-live")
        XCTAssertEqual(slug("Spring launch deck"), "spring-launch-deck")
        XCTAssertEqual(slug("  Wolfpack_Q3!  "), "wolfpack-q3")
        XCTAssertEqual(slug("R20 team protocol probe"), "r20-team-protocol-probe")
    }

    // MARK: - endpoints

    func testLedgerLatestEndpoint() {
        let endpoint = ConvexEndpoint.ledgerLatest(world: "aom", limit: 60)
        XCTAssertEqual(endpoint.path, "ledger:latest")
        XCTAssertEqual(endpoint.args["world"] as? String, "aom")
        XCTAssertEqual(endpoint.args["limit"] as? Int, 60)
    }

    func testNavigationEndpoint() {
        XCTAssertEqual(ConvexEndpoint.v2Navigation.path, "v2Workspace:getNavigation")
    }

    // MARK: - model

    func testModelLoadsLedgerCardsAndPassesWorldThrough() async throws {
        let api = CornerV2APIFake()
        api.ledgerLatestHandler = { _, _ in
            [self.item("a1", what: "Shipped it.", subjects: ["aster"], atSeconds: 100)]
        }
        let nodes = [self.aster, self.general]
        api.navigationHandler = { nodes }
        let home = V2HomeModel(api: api)
        await home.load(world: "aom", accountName: "Patrik Matheson")
        XCTAssertEqual(home.welcomeText, "Welcome Patrik")
        XCTAssertEqual(home.suggestions.count, 3)
        XCTAssertEqual(home.suggestions[0].projectTitle, "Aster")
        XCTAssertEqual(api.ledgerLatestCalls.count, 1)
        XCTAssertEqual(api.ledgerLatestCalls[0].world, "aom")
        XCTAssertEqual(api.ledgerLatestCalls[0].limit, 60)
    }

    func testModelWithNoNameSaysWelcomeAlone() async throws {
        let api = CornerV2APIFake()
        api.ledgerLatestHandler = { _, _ in [] }
        api.navigationHandler = { [] }
        let home = V2HomeModel(api: api)
        await home.load(world: "aom", accountName: "corner-v2-e2e+20260906t201253")
        XCTAssertEqual(home.welcomeText, "Welcome")
        XCTAssertTrue(home.suggestions.allSatisfy(\.isOnboarding))
    }

    func testModelFailureIsOnboardingNeverAnError() async throws {
        struct Boom: Error {}
        let api = CornerV2APIFake()
        api.ledgerLatestHandler = { _, _ in throw Boom() }
        api.navigationHandler = { [] }
        let home = V2HomeModel(api: api)
        await home.load(world: "aom", accountName: nil)
        XCTAssertTrue(home.loaded)
        XCTAssertEqual(home.suggestions.map(\.projectTitle), [
            "Bring in your context",
            "Connect where the work lives",
            "Start your first project",
        ])
    }

    // MARK: - wire decode

    func testWorldLedgerItemDecodesTheWireShape() throws {
        let json = """
        {"id": "abc", "world": "aom", "who": "worker", "surface": "phone",
         "what": "Shipped it.", "subjects": ["aster"], "kind": "did",
         "atMs": 1785712800000, "at": "2026-09-07T18:40:00.000Z"}
        """.data(using: .utf8)!
        let row = try JSONDecoder.corner.decode(WorldLedgerItem.self, from: json)
        XCTAssertEqual(row.what, "Shipped it.")
        XCTAssertEqual(row.subjects, ["aster"])
        XCTAssertEqual(row.freshness, 1785712800, accuracy: 0.001)
    }

    func testNavigationNodeDecodesTheWireShape() throws {
        let json = """
        {"id": "m1", "threadId": "t1", "kind": "mission", "title": "Spring launch deck",
         "projectId": "p1", "parentProjectId": "p1", "tint": "#5B9BFF",
         "needsYou": true, "lastActivityAt": 1785712800000}
        """.data(using: .utf8)!
        let node = try JSONDecoder.corner.decode(V2NavNode.self, from: json)
        XCTAssertEqual(node.slugifiedTitle, "spring-launch-deck")
        XCTAssertTrue(node.needsYou)
        // Missing optionals never fail the row.
        let bare = """
        {"id": "p1", "threadId": "t0", "kind": "project", "title": "Aster", "projectId": "p1"}
        """.data(using: .utf8)!
        let plain = try JSONDecoder.corner.decode(V2NavNode.self, from: bare)
        XCTAssertEqual(plain.title, "Aster")
        XCTAssertNil(plain.tint)
        XCTAssertFalse(plain.needsYou)
    }
}
