// R42NativeCV6Tests.swift — Corner native iOS
// corner:corner-v2 R42 — the phone thread wears the CV6 design.
//
// Pure pins for the R42 numbers: the thread's fixed type/space (P092), the
// project-tinted glow source (P093), and the command card's sections (P090).
// The pixels themselves are locked by the UI suites + the design-vs-sim gate.

import XCTest
@testable import Corner

final class R42NativeCV6Tests: XCTestCase {

    // MARK: - P092 thread numbers

    /// The design at 390: 16pt gutters, 14pt between rows.
    func testThreadSpacing() {
        XCTAssertEqual(V2ThreadType.gutter, 16)
        XCTAssertEqual(V2ThreadType.rowSpacing, 14)
    }

    /// Agent name 12.5, time 11, body 15/22 — the design's fixed sizes.
    func testThreadTypeSizes() {
        XCTAssertEqual(V2ThreadType.agentName, 12.5)
        XCTAssertEqual(V2ThreadType.time, 11)
        XCTAssertEqual(V2ThreadType.body, 15)
        XCTAssertEqual(V2ThreadType.bodyLineHeight, 22)
        XCTAssertGreaterThan(V2ThreadType.bodyLineSpacing, 0)
    }

    /// The user bubble: accent, 16pt radius, capped at 74 % of the thread.
    func testUserBubbleCap() {
        XCTAssertEqual(V2ThreadType.bubbleRadius, 16)
        XCTAssertEqual(V2ThreadType.bubbleMaxFraction, 0.74)
        XCTAssertEqual(
            V2ThreadType.bubbleMaxWidth(columnWidth: 390), 390 * 0.74, accuracy: 0.01
        )
        XCTAssertLessThan(V2ThreadType.bubbleMaxWidth(columnWidth: 390), 390 - 2 * 16)
    }

    // MARK: - P093 glow tint

    private func project(kind: ProjectKind, tintHex: String) -> ProjectSummary {
        ProjectSummary(
            id: "proj-test", workspaceID: "ws", name: "Test", kind: kind,
            tintHex: tintHex, needsAttention: false, threadID: "thread-test", missions: []
        )
    }

    /// General wears the app accent, never a stored tint.
    func testGeneralGlowsAccent() {
        XCTAssertEqual(
            V2ProjectGlow.tint(for: project(kind: .general, tintHex: "#8B5CF6")),
            .appAccent
        )
    }

    /// A project glows its sidebar avatar colour.
    func testProjectGlowsItsTint() {
        XCTAssertEqual(
            V2ProjectGlow.tint(for: project(kind: .standard, tintHex: "#2DD4BF")),
            .hex("#2DD4BF")
        )
    }

    /// A garbage tint falls back to the accent — never a clear glow.
    func testBadTintGlowsAccent() {
        XCTAssertEqual(
            V2ProjectGlow.tint(for: project(kind: .standard, tintHex: "nope")),
            .appAccent
        )
        XCTAssertEqual(
            V2ProjectGlow.tint(for: project(kind: .standard, tintHex: "")),
            .appAccent
        )
    }

    /// The drift loop is slow (8–12 s) and the entrance is ~600 ms.
    func testGlowTiming() {
        XCTAssertTrue((8...12).contains(V2AmbientGlow.driftSeconds))
        XCTAssertEqual(V2LoadingMark.enterSeconds, 0.6, accuracy: 0.01)
    }

    // MARK: - P090 card sections

    private func cardData() -> V2CommandsCardData {
        V2CommandsCardData(
            chatMode: "work", modelChoice: "default", modelSub: "Auto (Claude → Codex)",
            hasSpecialist: true, specialistTitle: "Paige", specialistCount: 12,
            talkEnabled: false, canReadChecklist: false
        )
    }

    /// Four groups in the desktop menu's rhythm: mode, Model/Specialist,
    /// Files/Image, Talk.
    func testCardSections() {
        let groups = V2CommandsCardSections.sections(cardData())
        XCTAssertEqual(groups.count, 4)
        XCTAssertEqual(groups[0], [.work, .plan])
        XCTAssertEqual(groups[1], [.model, .specialist])
        XCTAssertEqual(groups[2], [.files, .image])
        XCTAssertEqual(groups[3], [.talk, .readChecklist])
    }

    /// No roster, no Specialist row — never faked.
    func testCardSectionsWithoutSpecialist() {
        var data = cardData()
        data.hasSpecialist = false
        XCTAssertEqual(V2CommandsCardSections.sections(data)[1], [.model])
    }

    /// The mode caption is the web's copy, verbatim, both ways.
    func testCardModeCaption() {
        XCTAssertEqual(
            V2CommandsCardSections.modeCaption(chatMode: "work"),
            "Corner gets to work directly"
        )
        XCTAssertEqual(
            V2CommandsCardSections.modeCaption(chatMode: "plan"),
            "Corner will propose a plan first"
        )
    }

    /// The card is phone width (~260pt).
    func testCardWidth() {
        XCTAssertEqual(V2CommandsCard.width, 260)
    }
}
