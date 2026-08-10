// OrganizeTests.swift — Corner native iOS
// corner:native-ios Stage 3
//
// The Files surface, against the shapes the endpoint actually returns.
//
// The fixtures below are not invented. `project_files` rows were read live from the
// database on 2026-08-10 (`disk://` storage refs, null last_editor, `missions` as a real
// project slug) and the truth snapshot's field names come from api/_lib/filesTruth.js.
// A decoder tested against a shape nobody has seen proves nothing.

import XCTest
@testable import Corner

final class OrganizeTests: XCTestCase {

    private func envelope(_ json: String) throws -> OrganizeEnvelope {
        try JSONDecoder().decode(OrganizeEnvelope.self, from: Data(json.utf8))
    }

    // MARK: - Decoding

    /// A real payload: two mirror rows, one upload, one ghost, the counts block.
    func testOrganizePayloadDecodes() throws {
        let e = try envelope("""
        {
          "files": [
            {"id":"20c56023-c103-48db-93db-1ba3ac80d764","project":"agent-hooks","rel_path":"logs",
             "name":"hook-fires.jsonl","ext":"jsonl","kind":"doc","size":698239,
             "updated_at":"2026-08-10T18:42:50.805943+00:00","last_editor":null,
             "storage_ref":"disk://aom/agent-hooks/logs/hook-fires.jsonl"},
            {"id":"cb171fe0","project":"agent-hooks","rel_path":"missions/website/drafts",
             "name":"hero.png","ext":"png","kind":"image","size":48211,
             "updated_at":"2026-08-09T10:00:00+00:00","last_editor":"Design","storage_ref":null,
             "needs_review":true,"review_id":"https://rag.aheadofmarket.com/files/aom/hero.png",
             "review_ts":"2026-08-09T10:01:00+00:00"}
          ],
          "uploads": [
            {"id":"https://rag.aheadofmarket.com/files/aom/brief.pdf",
             "url":"https://rag.aheadofmarket.com/files/aom/brief.pdf","name":"brief.pdf",
             "project":"agent-hooks","mission":"agent-hooks:website","mime":"application/pdf",
             "size":90210,"date":"2026-08-08T09:00:00+00:00","uploader":"Patrik"}
          ],
          "files_truth": {
            "ghosts": [
              {"id":"https://rag.aheadofmarket.com/files/aom/gone.md","name":"gone.md",
               "project":"agent-hooks","mission":"website","date":"2026-08-07T08:00:00+00:00",
               "mime":null,"size":null,"needs_review":true,"review_ts":"2026-08-07T08:00:00+00:00"}
            ],
            "counts": {"files": 3, "needsReview": 2, "waitingTotal": 9}
          },
          "truncated": false
        }
        """)
        XCTAssertEqual(e.files.count, 2)
        XCTAssertEqual(e.uploads.count, 1)
        XCTAssertEqual(e.ghosts.count, 1)
        XCTAssertEqual(e.waitingTotal, 9, "the pill's number is the WORLD total, not what is on screen")
        // A null last_editor is the common case on the live table, and it must not throw
        // away the row that carries it.
        XCTAssertEqual(e.files[0].asFile().editor, "System")
    }

    /// A `mime: null` and a `size: null` are explicit in the ghost shape. Losing the row
    /// over them would silently drop a file that is waiting on a verdict.
    func testNullsCostAFieldNotARow() throws {
        let e = try envelope("""
        {"files":[],"uploads":[],"files_truth":{"ghosts":[
          {"id":"https://x/a.md","name":null,"project":"","mission":null,"date":null,"mime":null,"size":null}
        ],"counts":{"waitingTotal":1}}}
        """)
        let ghost = try XCTUnwrap(e.ghosts.first).asFile()
        XCTAssertEqual(ghost.name, "a.md", "a nameless row falls back to its own filename")
        XCTAssertEqual(ghost.project, OrganizeProject.personalID, "an unfiled ghost belongs to Personal")
        XCTAssertTrue(ghost.needsReview)
    }

    /// The endpoint's response shape has moved once already; an unknown key must not be
    /// the thing that empties a folder.
    func testAnUnknownKeyDoesNotEmptyTheFolder() throws {
        let e = try envelope("""
        {"files":[{"id":"1","project":"p","rel_path":"","name":"a.md","kind":"doc","size":1,
          "updated_at":"2026-08-10T00:00:00Z","last_editor":"","storage_ref":null,
          "future_field":{"nested":true}}],"uploads":[],"truncated":true}
        """)
        XCTAssertEqual(e.files.count, 1)
        XCTAssertTrue(e.truncated, "a capped list must be able to say so")
    }

    // MARK: - Addresses

    /// The bytes of a mirror row live behind a corner path built from project + rel_path.
    func testMirrorRowDerivesItsCornerPath() throws {
        let e = try envelope("""
        {"files":[{"id":"1","project":"agent-hooks","rel_path":"logs","name":"hook-fires.jsonl",
          "kind":"doc","size":1,"updated_at":"","last_editor":"","storage_ref":"disk://aom/agent-hooks/logs/hook-fires.jsonl"}],
         "uploads":[]}
        """)
        let file = try XCTUnwrap(e.files.first).asFile()
        XCTAssertEqual(file.address(world: "aom"), "corner/users/aom/projects/agent-hooks/logs/hook-fires.jsonl")
    }

    /// `ea://` wins over the derived path. Corner's own platform missions are mirrored
    /// from OUTSIDE the users tree, so deriving their path points at a directory that
    /// does not exist and the file 404s.
    func testEAStorageRefOverridesTheDerivedPath() throws {
        let e = try envelope("""
        {"files":[{"id":"1","project":"corner","rel_path":"missions/native-ios","name":"BUILD.md",
          "kind":"doc","size":1,"updated_at":"","last_editor":"","storage_ref":"ea://corner/missions/native-ios/BUILD.md"}],
         "uploads":[]}
        """)
        let file = try XCTUnwrap(e.files.first).asFile()
        XCTAssertEqual(file.address(world: "aom"), "corner/missions/native-ios/BUILD.md")
    }

    /// The `missions` pseudo-project files tenant-level missions at a different root, and
    /// its FIRST path segment is the mission slug rather than the literal "missions".
    func testMissionsPseudoProjectHasItsOwnRootAndMissionKey() throws {
        let e = try envelope("""
        {"files":[{"id":"1","project":"missions","rel_path":"master-loop/deliverables",
          "name":"missions-registry-live.json","kind":"doc","size":1,"updated_at":"","last_editor":"","storage_ref":null}],
         "uploads":[]}
        """)
        let file = try XCTUnwrap(e.files.first).asFile()
        XCTAssertEqual(file.address(world: "aom"), "corner/users/aom/missions/master-loop/deliverables/missions-registry-live.json")
        XCTAssertEqual(file.missionKey, "master-loop")
    }

    func testMissionKeyComesFromTheFolderPath() throws {
        let e = try envelope("""
        {"files":[
          {"id":"1","project":"p","rel_path":"missions/website/drafts","name":"a.md","kind":"doc","size":1,"updated_at":"","last_editor":"","storage_ref":null},
          {"id":"2","project":"p","rel_path":"logs","name":"b.md","kind":"doc","size":1,"updated_at":"","last_editor":"","storage_ref":null},
          {"id":"3","project":"p","rel_path":"","name":"c.md","kind":"doc","size":1,"updated_at":"","last_editor":"","storage_ref":null}
        ],"uploads":[]}
        """)
        let files = e.files.map { $0.asFile() }
        XCTAssertEqual(files[0].missionKey, "website")
        XCTAssertNil(files[1].missionKey, "a plain folder is not a mission")
        XCTAssertNil(files[2].missionKey)
    }

    /// An upload's mission arrives colon-joined and may repeat the project. It is
    /// expressed as a folder path so mission narrowing works on ONE rule.
    func testUploadMissionShedsItsProjectSegment() throws {
        let e = try envelope("""
        {"files":[],"uploads":[{"url":"https://x/brief.pdf","name":"brief.pdf","project":"corner",
          "mission":"corner:native-ios","mime":"application/pdf","size":1,"date":"","uploader":"Patrik"}]}
        """)
        let file = try XCTUnwrap(e.uploads.first).asFile(projectFallback: "corner")
        XCTAssertEqual(file.missionKey, "native-ios")
        XCTAssertEqual(file.address(world: "aom"), "https://x/brief.pdf", "an upload keeps its own store URL")
        XCTAssertTrue(file.isUpload)
    }

    // MARK: - Merge

    func testAnUploadThatWasAlsoCommittedShowsOnce() throws {
        let e = try envelope("""
        {"files":[{"id":"1","project":"p","rel_path":"missions/website/Uploads","name":"brief.pdf",
          "kind":"pdf","size":10,"updated_at":"2026-08-10T00:00:00Z","last_editor":"","storage_ref":null}],
         "uploads":[{"url":"https://x/brief.pdf","name":"brief.pdf","project":"p","mission":"website",
          "mime":"application/pdf","size":10,"date":"2026-08-09T00:00:00Z","uploader":"Patrik"}]}
        """)
        let merged = OrganizeStore.merge(e, into: "p")
        XCTAssertEqual(merged.count, 1)
        XCTAssertEqual(merged.first?.origin, .mirror, "the disk row wins; the upload copy is the duplicate")
    }

    /// `type=organize` scopes its FILE query by project but builds its review truth from
    /// the whole world. An unfiltered ghost list would show another project's waiting
    /// files as if they lived in this folder.
    func testGhostsFromOtherProjectsAreNotShownInThisFolder() throws {
        let e = try envelope("""
        {"files":[],"uploads":[],"files_truth":{"ghosts":[
          {"id":"https://x/mine.md","name":"mine.md","project":"p","mission":"","date":"","mime":null,"size":null},
          {"id":"https://x/theirs.md","name":"theirs.md","project":"other","mission":"","date":"","mime":null,"size":null}
        ],"counts":{"waitingTotal":2}}}
        """)
        let merged = OrganizeStore.merge(e, into: "p")
        XCTAssertEqual(merged.map(\.name), ["mine.md"])
    }

    // MARK: - Chips

    private func file(
        _ name: String,
        origin: OrganizeFile.Origin = .mirror,
        mime: String = "",
        needsReview: Bool = false,
        mission: String? = nil,
        updated: String = "2026-08-10T00:00:00Z",
        reviewTS: String = ""
    ) -> OrganizeFile {
        OrganizeFile(
            id: name, name: name, project: "p",
            relPath: mission.map { "missions/\($0)" } ?? "",
            origin: origin, sizeBytes: 1, updatedAt: updated, editor: "System", mime: mime,
            storageRef: "", absoluteURL: origin == .mirror ? "" : "https://x/\(name)",
            needsReview: needsReview, reviewID: name, reviewTimestamp: reviewTS, declaredKind: ""
        )
    }

    /// THE INVARIANT THIS SCREEN EXISTS TO KEEP. A chip reading 3 over a list showing 0
    /// was a real defect (2026-07-13, the dead-pill finding). Count and list are computed
    /// from one pass, so this must hold for EVERY chip at every scope.
    func testEveryChipCountEqualsWhatTheListShows() {
        let files = [
            file("a.md"),
            file("b.png", mime: "image/png"),
            file("c.mp4", mime: "video/mp4", needsReview: true, reviewTS: "2026-08-10T02:00:00Z"),
            file("d.pdf", mime: "application/pdf", mission: "website"),
            file("e.wav", mime: "audio/wav"),
            file("up.md", origin: .upload),
            file("ghost.md", origin: .ghost, needsReview: true, reviewTS: "2026-08-10T03:00:00Z"),
        ]
        for missionKey in [nil, "website", OrganizeStore.rootMissionKey] {
            for filter in OrganizeFilter.allCases {
                let shown = OrganizeStore.visible(files, filter: filter, missionKey: missionKey, query: "")
                let counted = OrganizeStore.missionScoped(files, missionKey: missionKey)
                    .filter { OrganizeStore.matches($0, filter) }
                XCTAssertEqual(
                    shown.count, counted.count,
                    "\(filter.label) at mission \(missionKey ?? "all") counts \(counted.count) but shows \(shown.count)"
                )
            }
        }
    }

    /// A ghost's disk row is gone, so it is not a browse artefact. It belongs under the
    /// needs filter and nowhere else, or the browse dimensions stop being disk-truth.
    func testGhostsAppearOnlyUnderNeedsReview() {
        let files = [file("a.md"), file("ghost.md", origin: .ghost, needsReview: true)]
        XCTAssertEqual(OrganizeStore.visible(files, filter: .recent, missionKey: nil, query: "").map(\.name), ["a.md"])
        XCTAssertEqual(OrganizeStore.visible(files, filter: .docs, missionKey: nil, query: "").map(\.name), ["a.md"])
        XCTAssertEqual(OrganizeStore.visible(files, filter: .needs, missionKey: nil, query: "").map(\.name), ["ghost.md"])
    }

    /// Triage reads newest HAND-OFF first, which is not the same order as newest edit —
    /// a file edited today can have been handed over last week.
    func testNeedsReviewSortsByHandoffNotByEdit() {
        let files = [
            file("old-edit-new-handoff.md", needsReview: true, updated: "2026-01-01T00:00:00Z", reviewTS: "2026-08-10T09:00:00Z"),
            file("new-edit-old-handoff.md", needsReview: true, updated: "2026-08-10T23:00:00Z", reviewTS: "2026-08-01T09:00:00Z"),
        ]
        XCTAssertEqual(
            OrganizeStore.visible(files, filter: .needs, missionKey: nil, query: "").map(\.name),
            ["old-edit-new-handoff.md", "new-edit-old-handoff.md"]
        )
        XCTAssertEqual(
            OrganizeStore.visible(files, filter: .recent, missionKey: nil, query: "").first?.name,
            "new-edit-old-handoff.md"
        )
    }

    /// `docs` is the catch-all, so no file is unreachable: a spreadsheet or an unknown
    /// type lands there rather than in a dimension nothing can reach.
    func testEveryFileIsReachableFromSomeTypeChip() {
        let files = [
            file("a.xlsx"), file("b.zip"), file("c.png", mime: "image/png"),
            file("d.mov", mime: "video/quicktime"), file("e.pdf", mime: "application/pdf"),
            file("f.m4a", mime: "audio/mp4"),
        ]
        let typeChips: [OrganizeFilter] = [.images, .video, .audio, .pdfs, .docs]
        for one in files {
            XCTAssertTrue(
                typeChips.contains { OrganizeStore.matches(one, $0) },
                "\(one.name) is in no type chip and would be invisible"
            )
        }
    }

    func testSearchNarrowsWithinTheActiveChip() {
        let files = [file("hero.png", mime: "image/png"), file("hero-notes.md"), file("other.md")]
        XCTAssertEqual(
            OrganizeStore.visible(files, filter: .recent, missionKey: nil, query: "hero").map(\.name).sorted(),
            ["hero-notes.md", "hero.png"]
        )
        XCTAssertEqual(
            OrganizeStore.visible(files, filter: .docs, missionKey: nil, query: "hero").map(\.name),
            ["hero-notes.md"]
        )
    }

    func testCruftProjectsNeverReachThePicker() {
        XCTAssertTrue(OrganizeStore.isCruft("smoke-test"))
        XCTAssertTrue(OrganizeStore.isCruft("corner-loop-test"))
        XCTAssertTrue(OrganizeStore.isCruft("lr2test"))
        XCTAssertFalse(OrganizeStore.isCruft("ambition-mechanical"))
        XCTAssertFalse(OrganizeStore.isCruft("aheadofmarket.com"))
        // Mid-word is NOT cruft: "mission-control" contains no marker at a boundary.
        XCTAssertFalse(OrganizeStore.isCruft("mission-control"))
    }

    /// A QUIRK KEPT ON PURPOSE, written down so nobody "fixes" it into a divergence. The
    /// web's CRUFT pattern is `(^|-)(smoke|…)` with no word boundary, so a project called
    /// "smokehouse" is hidden from Organize on the web today. This port matches. Which
    /// projects exist has to be ONE answer across surfaces; a phone that shows a project
    /// the web hides is a worse bug than a hypothetical name nobody has used.
    func testTheWebsBoundarylessCruftMatchIsMirroredRatherThanQuietlyImproved() {
        XCTAssertTrue(OrganizeStore.isCruft("smokehouse"))
    }

    // MARK: - Preview routing

    /// Corner's files are overwhelmingly text, and QuickLook has no preview generator for
    /// extensions it does not know — a .jsonl research log would open on "No preview
    /// available". These are the ones this app reads itself.
    func testTextFilesAreReadNativelyAndDocumentsAreNot() {
        for name in ["notes.md", "log.jsonl", "data.json", "config.yaml", "rooms-2026-08-09.MD"] {
            XCTAssertTrue(TextFileReader.canRead(name: name), "\(name) should read as text")
        }
        for name in ["deck.pdf", "shot.png", "cut.mov", "brief.docx", "archive.zip"] {
            XCTAssertFalse(TextFileReader.canRead(name: name), "\(name) belongs to QuickLook")
        }
        XCTAssertFalse(TextFileReader.canRead(name: "no-extension"))
    }
}
