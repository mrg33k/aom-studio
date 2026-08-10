// OrganizeFile.swift — Corner native iOS
// corner:native-ios Stage 3
//
// One row of the Files/Organize surface, and the envelope it arrives in.
//
// THE SURFACE, IN THE WEB'S OWN TERMS (cv6next/data/useOrganize.js): a project's files
// come from three places that must read as ONE list —
//   1. the disk mirror   (`project_files` rows: everything an agent wrote to disk)
//   2. your chat uploads (`messages` rows carrying metadata.attachment(s))
//   3. review ghosts     (files still waiting on a verdict whose disk row is gone —
//                         deleted after the hand-off, or shared from outside the tree)
// Ghosts exist because the needs-review count and the needs-review list have to agree.
// A badge saying 3 over a list showing 0 is the 2026-07-13 dead-pill defect, and it is
// the reason the server ships them in `files_truth.ghosts` rather than making each
// client re-derive them.
//
// WHY THIS APP ASKS PER PROJECT AND THE WEB ASKS FOR EVERYTHING. `type=organize` takes
// an optional `project=` and scopes BOTH its mirror read and its upload read to it
// (api/dashboard/files.js). The web never passes it: it downloads the whole world every
// 30 seconds. That world is 18,545 rows for `aom` today — counted live, not estimated —
// and shipping all of it to a phone on cellular to show one folder would be indefensible.
// The picker is served by `/api/dashboard/projects`, which carries no file payload at
// all, and files arrive only for the project actually opened.
//
// A COUNT THIS SCREEN DELIBERATELY DOES NOT SHOW. Because the picker never downloads a
// world's files, it cannot print "42 files" under each project without inventing it. The
// web can, and does, at the cost of the whole payload. Here the picker shows what it
// genuinely knows — the waiting-review count, which comes from the queue — and the file
// count appears the moment a project is opened and the number is real.

import Foundation

/// A project row on the picker. `id` is the slug the file query is scoped by.
struct OrganizeProject: Identifiable, Equatable, Hashable {
    let id: String
    let name: String
    /// The synthetic bucket for 1:1 chat uploads that belong to no project. Pinned at
    /// the top by the web too — hiding those files was the old behaviour and it was
    /// dishonest about where a dropped file went.
    var isPersonal: Bool { id == OrganizeProject.personalID }

    static let personalID = "__personal"

    static let personal = OrganizeProject(id: personalID, name: "Personal")
}

/// One file in a project's list. Mirror rows, uploads and ghosts all land here so the
/// list has ONE row type and the UI cannot accidentally treat them differently.
struct OrganizeFile: Identifiable, Equatable {
    enum Origin: Equatable {
        /// A `project_files` row — bytes live on disk behind the corner path.
        case mirror
        /// A chat upload — its id IS its absolute store URL.
        case upload
        /// A waiting review item with no disk row left. Surfaces only under the
        /// needs-review filter, never under Recent or the type chips: the browse
        /// dimensions stay disk-truth.
        case ghost
    }

    let id: String
    let name: String
    let project: String
    /// Folder path inside the project (no filename). "" at the project root.
    let relPath: String
    let origin: Origin
    let sizeBytes: Int
    let updatedAt: String
    let editor: String
    let mime: String
    /// `disk://` / `ea://` / nil, exactly as the mirror row carried it.
    let storageRef: String
    /// Absolute store URL for uploads and ghosts; "" for mirror rows.
    let absoluteURL: String
    let needsReview: Bool
    /// The deliverable id a verdict must be posted against — the queue's own id when the
    /// file is waiting, otherwise the file's own identity.
    let reviewID: String
    let reviewTimestamp: String
    let declaredKind: String

    var kind: FileKind { FileKind.of(name: name, mime: mime, url: absoluteURL) }

    var date: Date? { updatedAt.isEmpty ? nil : MessageRow.parseTimestamp(updatedAt) }

    var isUpload: Bool { origin == .upload }
    var isGhost: Bool { origin == .ghost }

    /// Top-level mission this file belongs to, from its folder path. Port of missionOf()
    /// in useOrganize.js, including the `missions` pseudo-project special case where the
    /// FIRST path segment is the mission slug rather than the literal "missions".
    var missionKey: String? {
        let segments = relPath.split(separator: "/").map(String.init).filter { !$0.isEmpty }
        guard !segments.isEmpty else { return nil }
        if project == "missions" { return segments[0] }
        if segments[0] == "missions", segments.count > 1 { return segments[1] }
        // Uploads are filed under "missions/<slug>/Uploads" or "Uploads" by the same rule.
        return nil
    }

    var sizeLabel: String {
        if sizeBytes <= 0 { return "" }
        if sizeBytes < 1024 { return "\(sizeBytes) B" }
        if sizeBytes < 1024 * 1024 { return "\(Int((Double(sizeBytes) / 1024).rounded())) KB" }
        return String(format: "%.1f MB", Double(sizeBytes) / 1_048_576)
    }

    /// The address the byte layer resolves. Uploads and ghosts carry an absolute store
    /// URL; a mirror row's address is its corner path, derived the same way
    /// cornerPathOf() derives it in useOrganize.js — including the `ea://` override,
    /// which exists because Corner's own platform missions are mirrored from OUTSIDE the
    /// users tree and deriving their path from project + rel_path points at a directory
    /// that does not exist.
    func address(world: String) -> String {
        if !absoluteURL.isEmpty { return absoluteURL }
        if storageRef.hasPrefix("ea://") { return String(storageRef.dropFirst(5)) }
        guard !project.isEmpty, !name.isEmpty, !world.isEmpty else { return "" }
        let folder = relPath.isEmpty ? "" : "\(relPath)/"
        let root = project == "missions" ? "missions" : "projects/\(project)"
        return "corner/users/\(world)/\(root)/\(folder)\(name)"
    }

    /// The attachment shape the preview, share and review layers already speak, so an
    /// Organize row and a chat crossing open through exactly one code path.
    func asAttachment(world: String) -> Attachment {
        Attachment(
            url: address(world: world),
            name: name,
            mime: mime,
            size: sizeBytes,
            gateStatus: "",
            sha256: "",
            sourcePath: origin == .mirror ? address(world: world) : ""
        )
    }
}

// MARK: - Decoding the endpoint

/// GET /api/dashboard/files?type=organize — the backend-owned truth snapshot.
///
/// Read tolerantly on purpose. `files_truth` is a versioned contract
/// (`corner.files_truth.v1`) that has already moved once; a field appearing or going
/// null must cost one row's detail, never the whole folder.
struct OrganizeEnvelope: Decodable {
    let files: [MirrorRow]
    let uploads: [UploadRow]
    let ghosts: [GhostRow]
    let waitingTotal: Int
    let truncated: Bool

    enum CodingKeys: String, CodingKey {
        case files, uploads, truncated
        case filesTruth = "files_truth"
        case review
    }

    struct TruthBlock: Decodable {
        let ghosts: [GhostRow]?
        let counts: Counts?
        struct Counts: Decodable { let waitingTotal: Int? }
    }

    struct ReviewBlock: Decodable {
        let total: Int?
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        files = (try? c.decodeIfPresent([MirrorRow].self, forKey: .files)) ?? []
        uploads = (try? c.decodeIfPresent([UploadRow].self, forKey: .uploads)) ?? []
        let truth = try? c.decodeIfPresent(TruthBlock.self, forKey: .filesTruth)
        ghosts = truth?.ghosts ?? []
        let review = try? c.decodeIfPresent(ReviewBlock.self, forKey: .review)
        waitingTotal = truth?.counts?.waitingTotal ?? review?.total ?? 0
        truncated = (try? c.decodeIfPresent(Bool.self, forKey: .truncated)) ?? false
    }

    /// GET …&type=uploads returns only `{ files: [...] }` in the UPLOAD row shape. That
    /// is what the Personal bucket needs and it costs none of the mirror.
    struct UploadsOnly: Decodable {
        let files: [UploadRow]?
    }
}

struct MirrorRow: Decodable {
    let id: String
    let project: String
    let relPath: String
    let name: String
    let kind: String
    let size: Int
    let updatedAt: String
    let lastEditor: String
    let storageRef: String
    let mime: String
    let needsReview: Bool
    let reviewID: String
    let reviewTS: String
    /// Only present on the single-file fetch, where it carries the file's text.
    let content: String?

    enum CodingKeys: String, CodingKey {
        case id, project, name, kind, size, content, mime
        case relPath = "rel_path"
        case updatedAt = "updated_at"
        case lastEditor = "last_editor"
        case storageRef = "storage_ref"
        case needsReview = "needs_review"
        case reviewID = "review_id"
        case reviewTS = "review_ts"
        case fileRef = "file_ref"
    }

    struct FileRef: Decodable {
        let mime: String?
        let kind: String?
        let sizeBytes: Int?
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func str(_ key: CodingKeys) -> String { (try? c.decodeIfPresent(String.self, forKey: key)) ?? "" }
        func int(_ key: CodingKeys) -> Int { (try? c.decodeIfPresent(Int.self, forKey: key)) ?? 0 }
        let ref = try? c.decodeIfPresent(FileRef.self, forKey: .fileRef)
        id = str(.id)
        project = str(.project)
        relPath = str(.relPath)
        name = str(.name)
        kind = str(.kind).isEmpty ? (ref?.kind ?? "") : str(.kind)
        let declaredSize = int(.size)
        size = declaredSize > 0 ? declaredSize : (ref?.sizeBytes ?? 0)
        updatedAt = str(.updatedAt)
        lastEditor = str(.lastEditor)
        storageRef = str(.storageRef)
        mime = str(.mime).isEmpty ? (ref?.mime ?? "") : str(.mime)
        needsReview = (try? c.decodeIfPresent(Bool.self, forKey: .needsReview)) ?? false
        reviewID = str(.reviewID)
        reviewTS = str(.reviewTS)
        content = try? c.decodeIfPresent(String.self, forKey: .content)
    }

    func asFile() -> OrganizeFile {
        OrganizeFile(
            id: id,
            name: name.isEmpty ? "Untitled" : name,
            project: project,
            relPath: relPath,
            origin: .mirror,
            sizeBytes: size,
            updatedAt: updatedAt,
            editor: lastEditor.isEmpty ? "System" : lastEditor,
            mime: mime,
            storageRef: storageRef,
            absoluteURL: "",
            needsReview: needsReview,
            reviewID: reviewID,
            reviewTimestamp: reviewTS,
            declaredKind: kind
        )
    }
}

struct UploadRow: Decodable {
    let url: String
    let name: String
    let project: String
    let mission: String
    let mime: String
    let size: Int
    let date: String
    let uploader: String
    let needsReview: Bool
    let reviewID: String
    let reviewTS: String

    enum CodingKeys: String, CodingKey {
        case url, name, project, mission, mime, size, date, uploader, id
        case needsReview = "needs_review"
        case reviewID = "review_id"
        case reviewTS = "review_ts"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func str(_ key: CodingKeys) -> String { (try? c.decodeIfPresent(String.self, forKey: key)) ?? "" }
        let declaredURL = str(.url)
        url = declaredURL.isEmpty ? str(.id) : declaredURL
        let declaredName = str(.name)
        name = declaredName.isEmpty ? Attachment.displayName(from: url) : declaredName
        project = str(.project)
        mission = str(.mission)
        mime = str(.mime)
        size = (try? c.decodeIfPresent(Int.self, forKey: .size)) ?? 0
        date = str(.date)
        uploader = str(.uploader)
        needsReview = (try? c.decodeIfPresent(Bool.self, forKey: .needsReview)) ?? false
        reviewID = str(.reviewID)
        reviewTS = str(.reviewTS)
    }

    /// Uploads live outside the mirrored tree, so the mission is expressed as a folder
    /// path here for the SAME reason the web synthesizes one: mission narrowing then
    /// works on one rule instead of two. A colon-joined slug ("project:mission[:sub]")
    /// sheds its project segment first.
    func asFile(projectFallback: String) -> OrganizeFile {
        let slug = project.isEmpty ? projectFallback : project
        var segments = mission.split(separator: ":").map(String.init).filter { !$0.isEmpty }
        if segments.first == slug { segments.removeFirst() }
        let missionKey = segments.first
        let folder = missionKey.map { "missions/\($0)/Uploads" } ?? "Uploads"
        return OrganizeFile(
            id: url.isEmpty ? name : url,
            name: name,
            project: slug,
            relPath: folder,
            origin: .upload,
            sizeBytes: size,
            updatedAt: date,
            editor: uploader.isEmpty ? "You" : uploader,
            mime: mime,
            storageRef: "",
            absoluteURL: url,
            needsReview: needsReview,
            reviewID: reviewID.isEmpty ? url : reviewID,
            reviewTimestamp: reviewTS,
            declaredKind: ""
        )
    }
}

/// A waiting review item with no disk row. The server builds these (filesTruth.js) so
/// the count and the list are computed once, in one place.
struct GhostRow: Decodable {
    let id: String
    let name: String
    let project: String
    let mission: String
    let date: String
    let mime: String
    let size: Int
    let reviewTS: String

    enum CodingKeys: String, CodingKey {
        case id, name, project, mission, date, mime, size
        case reviewTS = "review_ts"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func str(_ key: CodingKeys) -> String { (try? c.decodeIfPresent(String.self, forKey: key)) ?? "" }
        id = str(.id)
        let declaredName = str(.name)
        name = declaredName.isEmpty ? Attachment.displayName(from: id) : declaredName
        project = str(.project)
        mission = str(.mission)
        date = str(.date)
        mime = str(.mime)
        size = (try? c.decodeIfPresent(Int.self, forKey: .size)) ?? 0
        reviewTS = str(.reviewTS)
    }

    func asFile() -> OrganizeFile {
        OrganizeFile(
            id: id,
            name: name,
            project: project.isEmpty ? OrganizeProject.personalID : project,
            relPath: mission.isEmpty ? "" : "missions/\(mission)",
            origin: .ghost,
            sizeBytes: size,
            updatedAt: date,
            editor: "Agent",
            mime: mime,
            storageRef: "",
            absoluteURL: id,
            needsReview: true,
            reviewID: id,
            reviewTimestamp: reviewTS.isEmpty ? date : reviewTS,
            declaredKind: ""
        )
    }
}

// MARK: - Filters

/// The chip row, in the web's order and with its exact semantics. `docs` is the
/// catch-all so no file is unreachable: a spreadsheet or an unknown type lands there
/// rather than in a dimension nothing can reach.
enum OrganizeFilter: String, CaseIterable, Identifiable {
    case needs, recent, uploads, images, video, audio, pdfs, docs

    var id: String { rawValue }

    var label: String {
        switch self {
        case .needs:   return "Needs review"
        case .recent:  return "Recent"
        case .uploads: return "My uploads"
        case .images:  return "Images"
        case .video:   return "Video"
        case .audio:   return "Audio"
        case .pdfs:    return "PDFs"
        case .docs:    return "Docs"
        }
    }

    func matches(_ file: OrganizeFile) -> Bool {
        switch self {
        case .needs:   return file.needsReview
        case .recent:  return true
        case .uploads: return file.isUpload
        case .images:  return file.kind == .photo
        case .video:   return file.kind == .video
        case .audio:   return file.kind == .audio
        case .pdfs:    return file.kind == .pdf
        case .docs:    return ![.photo, .video, .audio, .pdf].contains(file.kind)
        }
    }
}
