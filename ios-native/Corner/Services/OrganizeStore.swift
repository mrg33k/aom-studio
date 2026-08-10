// OrganizeStore.swift — Corner native iOS
// corner:native-ios Stage 3
//
// The Files/Organize surface's state: which project is open, what is in it, and what
// the chips currently narrow it to.
//
// TWO LOADS, NOT ONE, AND THE SPLIT IS THE POINT.
//   picker  → GET /api/dashboard/projects        (no file payload at all)
//   folder  → GET /api/dashboard/files?type=organize&client=<world>&project=<slug>
// The web issues the second call with no `project` and pulls every file in the world —
// 18,545 rows for `aom`, counted live — every 30 seconds. The endpoint has always
// accepted `project=` and scopes both its mirror read and its upload read by it. On a
// phone the scoped call is not an optimisation, it is the difference between a folder
// that opens and a folder that times out on cellular.
//
// PERSONAL IS A DIFFERENT QUERY, because it is a different thing. The Personal bucket is
// chat uploads that belong to no project, and asking `type=organize` for them would drag
// the entire mirror along for files that are not in it. `type=uploads` returns uploads
// alone, tenant-gated the same way.
//
// GHOSTS ARE SCOPED CLIENT-SIDE ON PURPOSE. `type=organize` builds its review truth from
// the WHOLE world even when the file query is scoped (collectFromMessages takes only the
// tenant), so `files_truth.ghosts` can carry waiting items filed to other projects. The
// web narrows them the same way — `ghosts.filter(it => it.whoRaw === openProject.id)` —
// and without that narrowing an opened folder would show another project's waiting files
// as if they lived here.
//
// THE COUNTS AND THE LIST COME FROM ONE PASS. A needs-review chip that says 3 over a
// list showing 0 is the exact defect the ghost mechanism exists to prevent, so every
// chip count in this store is computed from the same scoped array the list is built
// from, never from a second source.

import Foundation

@MainActor
final class OrganizeStore: ObservableObject {

    enum LoadState: Equatable {
        case idle
        case loading
        case ready
        case error(String)
    }

    // Picker
    @Published private(set) var projects: [OrganizeProject] = []
    @Published private(set) var pickerState: LoadState = .idle

    // Folder
    @Published private(set) var openProject: OrganizeProject?
    @Published private(set) var files: [OrganizeFile] = []
    @Published private(set) var folderState: LoadState = .idle
    /// True when the server hit its own row cap. Said out loud rather than implied:
    /// a silently short list is the worst kind of wrong.
    @Published private(set) var truncated = false
    /// Waiting-review total across the WHOLE world, from the server. Not the count of
    /// what is on screen — the pill's whole job is to say what is waiting elsewhere.
    @Published private(set) var waitingTotal = 0

    // Narrowing
    @Published var filter: OrganizeFilter = .recent
    @Published var missionKey: String?
    @Published var query = ""

    private let api: CornerAPI

    init(api: CornerAPI? = nil) {
        self.api = api ?? .shared
    }

    /// A store already holding a folder, for previews and the render gallery. The gallery
    /// exists to LOOK at states nobody normally looks at on purpose (an empty triage list,
    /// a folder of ghosts), and those states cannot be reached through a network call in a
    /// test. It seeds state only — every rule that shapes the list is still the real one.
    init(previewProject: OrganizeProject, files: [OrganizeFile], waitingTotal: Int = 0, filter: OrganizeFilter = .recent) {
        self.api = .shared
        self.openProject = previewProject
        self.files = files
        self.waitingTotal = waitingTotal
        self.filter = filter
        self.folderState = .ready
        self.pickerState = .ready
        self.projects = [.personal, previewProject]
    }

    var hasLoadedPicker: Bool {
        if case .ready = pickerState { return true }
        if case .error = pickerState { return true }
        return false
    }

    // MARK: - Picker

    /// Build scaffolding, not places a person keeps files. Port of the CRUFT regex in
    /// useOrganize.js — `(^|-)(smoke|proj-tool|loop-test|test-project|lr2test)` — written
    /// as a plain check so it cannot throw at a call site that has no way to recover.
    nonisolated static func isCruft(_ slug: String) -> Bool {
        let markers = ["smoke", "proj-tool", "loop-test", "test-project", "lr2test"]
        let lower = slug.lowercased()
        return markers.contains { marker in
            lower.hasPrefix(marker) || lower.contains("-\(marker)")
        }
    }

    func loadProjects() async {
        if projects.isEmpty { pickerState = .loading }
        do {
            let rows = try await api.fetchProjects()
            var out: [OrganizeProject] = [.personal]
            for row in rows {
                guard let slug = row.slug, !slug.isEmpty else { continue }
                if OrganizeStore.isCruft(slug) { continue }
                out.append(OrganizeProject(id: slug, name: row.name?.isEmpty == false ? row.name! : Room.prettify(slug)))
            }
            // Alphabetical by display name, Personal pinned above it — scannable rather
            // than arriving in the table's recency order.
            let rest = out.dropFirst().sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            projects = [.personal] + rest
            pickerState = .ready
        } catch {
            let message = (error as? LocalizedError)?.errorDescription ?? "Your projects could not be loaded."
            pickerState = projects.isEmpty ? .error(message) : .ready
        }
    }

    // MARK: - Folder

    func open(_ project: OrganizeProject) {
        guard openProject?.id != project.id else { return }
        openProject = project
        files = []
        filter = .recent
        missionKey = nil
        query = ""
        truncated = false
        folderState = .idle
    }

    func closeFolder() {
        openProject = nil
        files = []
        folderState = .idle
    }

    func loadOpenFolder() async {
        guard let project = openProject else { return }
        if files.isEmpty { folderState = .loading }
        do {
            if project.isPersonal {
                let rows = try await api.fetchUploads()
                // Personal = uploads with no project home. An upload that HAS one belongs
                // to that project's folder and showing it in both places would double it.
                files = rows
                    .filter { $0.project.trimmingCharacters(in: .whitespaces).isEmpty }
                    .map { $0.asFile(projectFallback: OrganizeProject.personalID) }
                truncated = false
            } else {
                let envelope = try await api.fetchOrganize(project: project.id)
                files = OrganizeStore.merge(envelope, into: project.id)
                truncated = envelope.truncated
                waitingTotal = envelope.waitingTotal
            }
            folderState = .ready
        } catch {
            let message = (error as? LocalizedError)?.errorDescription ?? "This folder could not be loaded."
            // A failed refresh never blanks a good list — same rule as the room files.
            folderState = files.isEmpty ? .error(message) : .ready
        }
    }

    // MARK: - Derivation (pure, so it is testable without a network)

    nonisolated static let rootMissionKey = "__root"

    /// One project's three sources merged into one list. Static and pure: the merge rules
    /// (dedupe, ghost scoping) are the part most likely to be got wrong, and they should
    /// be exercisable without standing up an API.
    nonisolated static func merge(_ envelope: OrganizeEnvelope, into project: String) -> [OrganizeFile] {
        var out = envelope.files.map { $0.asFile() }
        out.append(contentsOf: envelope.uploads.map { $0.asFile(projectFallback: project) })
        // Dedupe an upload that also got committed to disk: same name in the same mission
        // is the same file wearing two origins, and the web drops the upload copy for
        // exactly this reason.
        var seen = Set<String>()
        var deduped: [OrganizeFile] = []
        for file in out {
            let key = "\(file.name.lowercased())|\(file.missionKey ?? "")"
            if file.isUpload, seen.contains(key) { continue }
            seen.insert(key)
            deduped.append(file)
        }
        // Ghosts only for THIS project. `type=organize` builds its review truth from the
        // whole world even when the file query is scoped, so an unfiltered ghost list
        // would show another project's waiting files as if they lived here.
        deduped.append(contentsOf: envelope.ghosts
            .filter { ($0.project.isEmpty ? OrganizeProject.personalID : $0.project) == project }
            .map { $0.asFile() })
        return deduped
    }

    /// Mission narrowing. Chip counts and the list are both computed from the result, so
    /// a chip can never advertise files the list will not show.
    nonisolated static func missionScoped(_ files: [OrganizeFile], missionKey: String?) -> [OrganizeFile] {
        guard let key = missionKey else { return files }
        if key == rootMissionKey { return files.filter { $0.missionKey == nil } }
        return files.filter { $0.missionKey == key }
    }

    /// Whether a file belongs to a chip. A ghost is a review artefact, not a browse
    /// artefact: it appears under the needs filter and nowhere else, so the browse
    /// dimensions stay disk-truth.
    nonisolated static func matches(_ file: OrganizeFile, _ filter: OrganizeFilter) -> Bool {
        if file.isGhost { return filter == .needs }
        return filter.matches(file)
    }

    nonisolated static func visible(
        _ files: [OrganizeFile],
        filter: OrganizeFilter,
        missionKey: String?,
        query: String
    ) -> [OrganizeFile] {
        let base = missionScoped(files, missionKey: missionKey).filter { matches($0, filter) }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let searched = q.isEmpty ? base : base.filter { $0.name.lowercased().contains(q) }
        if filter == .needs {
            // Triage order is newest HAND-OFF first, not newest file edit.
            return searched.sorted { $0.reviewTimestamp > $1.reviewTimestamp }
        }
        return searched.sorted { $0.updatedAt > $1.updatedAt }
    }

    var missionScoped: [OrganizeFile] {
        OrganizeStore.missionScoped(files, missionKey: missionKey)
    }

    /// The list the folder screen renders.
    var visible: [OrganizeFile] {
        OrganizeStore.visible(files, filter: filter, missionKey: missionKey, query: query)
    }

    func count(for filter: OrganizeFilter) -> Int {
        missionScoped.filter { OrganizeStore.matches($0, filter) }.count
    }

    /// Chips that would show a permanent zero are dropped. Recent is the reset so it
    /// always shows; "My uploads" always shows because a chip that comes and goes reads
    /// as removed (Patrik 2026-07-12); needs-review stays visible while it is the active
    /// filter so a cleared triage list keeps its own empty state.
    var availableFilters: [OrganizeFilter] {
        OrganizeFilter.allCases.filter { candidate in
            switch candidate {
            case .recent, .uploads: return true
            case .needs: return count(for: .needs) > 0 || filter == .needs
            default: return count(for: candidate) > 0
            }
        }
    }

    /// Mission chips built from the files themselves, so picking one can never land on an
    /// empty column. Sorted by size, with the root bucket last.
    var missionChips: [(key: String, label: String, count: Int)] {
        var counts: [String: Int] = [:]
        var rootCount = 0
        for file in files {
            if let key = file.missionKey { counts[key, default: 0] += 1 } else { rootCount += 1 }
        }
        guard !counts.isEmpty else { return [] }
        var out = counts
            .sorted { $0.value == $1.value ? $0.key < $1.key : $0.value > $1.value }
            .map { (key: $0.key, label: Room.prettify($0.key), count: $0.value) }
        if rootCount > 0 {
            out.append((key: OrganizeStore.rootMissionKey, label: "Other", count: rootCount))
        }
        return out
    }

    var needsReviewCount: Int { count(for: .needs) }
}
