// RoomFilesView.swift — Corner native iOS
// corner:native-ios Stage 2
//
// This chat's files. Everything that crossed this conversation. Nothing else.
//
// TWO SECTIONS, NOT ONE LIST. "From agent" is work delivered to you; "You sent" is
// material you handed over. Only the first can be waiting on your review (Patrik,
// 2026-07-13: "things agents send me need review — my own uploads don't"), so collapsing
// them into one chronological list would put an amber mark next to a photo you took.
// The timeline view is still there under the toggle, because a single ordering is the
// one thing two grouped sections cannot show.
//
// THE EMPTY STATE IS A SENTENCE, NOT A SHRUG. "No files have crossed this chat yet" says
// what the panel actually contains and why it is empty — which is the entire point of a
// crossings model over a folder listing.

import SwiftUI

struct RoomFilesView: View {
    let room: Room

    @StateObject private var store: RoomFilesStore
    @StateObject private var review = ReviewStore.shared
    @Environment(\.dismiss) private var dismiss

    @State private var grouped = true
    @State private var preview: RoomFile?

    init(room: Room) {
        self.room = room
        _store = StateObject(wrappedValue: RoomFilesStore(room: room))
    }

    var body: some View {
        NavigationStack {
            Group {
                if store.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
            .background(Theme.ground)
            .navigationTitle("Files")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Picker("Grouping", selection: $grouped) {
                        Text("By sender").tag(true)
                        Text("In order").tag(false)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 180)
                }
            }
        }
        .onAppear {
            store.waitingIDs = review.waitingIDs
            store.start()
        }
        .onDisappear { store.stop() }
        .onChange(of: review.items) { _, _ in store.waitingIDs = review.waitingIDs }
        .sheet(item: $preview) { file in
            FilePreviewView(
                attachment: file.attachment,
                reviewContext: file.isUser ? nil : FilePreviewView.ReviewContext(
                    project: room.reviewProject,
                    mission: room.reviewMission,
                    isWaiting: store.isWaiting(file)
                )
            )
        }
    }

    // MARK: - List

    private var list: some View {
        List {
            Section {
                Text("Everything that crossed this chat. Nothing else.")
                    .font(.caption)
                    .foregroundStyle(Theme.inkFaint)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }

            if grouped {
                if !store.fromAgent.isEmpty {
                    Section(fromLabel) {
                        ForEach(store.fromAgent) { row($0) }
                    }
                }
                if !store.youSent.isEmpty {
                    Section("You sent") {
                        ForEach(store.youSent) { row($0) }
                    }
                }
            } else {
                Section {
                    ForEach(timeline) { row($0) }
                }
            }

            if store.windowFull {
                Section {
                    Text("Showing the newest files in this chat. Older ones exist — ask the agent for one by name.")
                        .font(.caption2)
                        .foregroundStyle(Theme.inkFaint)
                        .listRowBackground(Color.clear)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .refreshable { await store.load() }
    }

    /// One canonical ordering (newest first, name breaking ties) so the two views are
    /// exact mirrors. Ties are real here: several files delivered on ONE message carry
    /// identical timestamps, and an unstable tiebreak makes the toggle look half-broken.
    private var timeline: [RoomFile] {
        (store.fromAgent + store.youSent).sorted {
            let a = $0.timestamp ?? .distantPast
            let b = $1.timestamp ?? .distantPast
            if a != b { return a > b }
            return $0.name < $1.name
        }
    }

    private var fromLabel: String {
        let senders = Set(store.fromAgent.map(\.who))
        if senders.count == 1, let only = senders.first { return "From \(only)" }
        return "From agents"
    }

    private func row(_ file: RoomFile) -> some View {
        Button {
            preview = file
        } label: {
            HStack(spacing: Theme.s3) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Theme.raised)
                        .frame(width: 38, height: 38)
                    Image(systemName: file.kind.symbol)
                        .font(.footnote)
                        .foregroundStyle(file.kind == .photo ? Theme.accent : Theme.inkSoft)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(file.name)
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Text(file.metaLine)
                        .font(.caption2)
                        .foregroundStyle(Theme.inkFaint)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                if store.isWaiting(file) {
                    Text("Review")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Theme.warning)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Theme.warning.opacity(0.14), in: Capsule())
                } else if !file.attachment.gateStatus.isEmpty && file.attachment.gateStatus != "pass" && file.attachment.gateStatus != "not_applicable" {
                    // Patrik 2026-07-27: always deliver, mark it. A file that shipped
                    // without its gate pass says so on its own card rather than being
                    // silently withheld.
                    Text("Ungated")
                        .font(.caption2)
                        .foregroundStyle(Theme.inkFaint)
                }
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(Theme.inkFaint)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(Theme.raised.opacity(0.5))
    }

    // MARK: - Empty / error

    private var emptyState: some View {
        VStack(spacing: Theme.s3) {
            switch store.state {
            case .loading:
                ProgressView()
            case .error(let message):
                Image(systemName: "wifi.exclamationmark").font(.title2).foregroundStyle(Theme.inkSoft)
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
                    .multilineTextAlignment(.center)
                Text("They're safe — this retries on its own.")
                    .font(.caption2)
                    .foregroundStyle(Theme.inkFaint)
            default:
                Image(systemName: "tray").font(.title2).foregroundStyle(Theme.inkFaint)
                Text("No files have crossed this chat yet.")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
                Text("Files an agent sends you, and files you send them, land here.")
                    .font(.caption2)
                    .foregroundStyle(Theme.inkFaint)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Room review scoping

extension Room {
    /// The project a review decision made inside this room should be filed under.
    ///
    /// This matters more than it looks: review-decision.js puts the project into
    /// tasks.project, metadata.repo AND project_path, and it REFUSES (403) a
    /// request-changes whose project the caller cannot act in. An agent 1:1 room has no
    /// project, so it sends none and lets the server derive one from the deliverable
    /// path — which is exactly what the endpoint does when the field is absent.
    var reviewProject: String {
        switch kind {
        case .agent:                 return ""
        case .project(let slug):     return slug
        case .mission(_, let project): return project
        }
    }

    /// The BARE mission leaf. review-decision.js canonicalises it back to
    /// "<project>:<mission>" itself, and its own comment records that passing an
    /// already-composite slug is what made the old template double-prefix it.
    var reviewMission: String {
        guard case .mission(let slug, _) = kind else { return "" }
        return slug.split(separator: ":").last.map(String.init) ?? slug
    }
}
