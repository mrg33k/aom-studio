// TrackerView.swift — Corner native iOS
// corner:native-ios Stage 3
//
// Tracker: the boards, what is open on them, and the three writes that are real.
//
// A BOARD SAYS WHAT IT CAN DO. Three different systems land on this screen and they have
// different permissions — the CV6 board is ours and fully editable, Space Rising's ticket
// board is a read-only mirror of a client's own system, and a custom tracker can take a
// new row but has no addressable cell to edit. Controls appear only where the write
// exists, so nothing on screen is a button that quietly fails.
//
// THE STATUS CONTROL IS THE ONE PLACE OPTIMISM SHOWS. Tapping Done flips the chip before
// the server answers, because the write is one field on a row the server already has. If
// it refuses, the chip goes BACK and a notice says so. A chip that stays flipped over a
// refused write is a lie the user acts on tomorrow.
//
// PRIORITY HERE IS NOT THE WEB'S PRIORITY. The live board files bugs with severities the
// web's mapping drops into "Med" — including `blocker`. See TrackerModels.swift: the word
// wins when it means something, the numeric rank is the fallback. This screen sorts open
// work by that, so a blocker is at the top where a person triaging can see it.

import SwiftUI

struct TrackerView: View {
    @EnvironmentObject private var api: CornerAPI
    @StateObject private var store = TrackerStore()

    @State private var showingSwitcher = false
    @State private var showingNewIssue = false
    @State private var openIssue: TrackerIssue?

    var body: some View {
        Group {
            if api.world == nil {
                NoWorkspaceNotice()
            } else {
                content
            }
        }
        .groundBackground()
        .navigationTitle("Tracker")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingSwitcher = true } label: {
                    Image(systemName: "square.stack.3d.up")
                }
                .accessibilityLabel("Switch board")
            }
            if store.activeBoard?.canAddIssue == true {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingNewIssue = true } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("New issue")
                }
            }
        }
        .task { if !store.hasLoadedOnce { await store.load() } }
        .sheet(isPresented: $showingSwitcher) {
            TrackerSwitcher(store: store)
        }
        .sheet(isPresented: $showingNewIssue) {
            NewIssueSheet(store: store)
        }
        .sheet(item: $openIssue) { issue in
            IssueDetailSheet(store: store, issue: issue)
                .environmentObject(api)
        }
        .overlay(alignment: .bottom) { noticeBar }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        switch store.state {
        case .idle, .loading:
            VStack(spacing: Theme.s3) {
                ProgressView()
                Text("Loading the boards…").font(.hkFootnote).foregroundStyle(Theme.inkSoft)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .error(let message):
            VStack(spacing: Theme.s3) {
                Image(systemName: "exclamationmark.triangle").font(.hkTitle).foregroundStyle(Theme.warning)
                Text(message)
                    .font(.hkFootnote)
                    .foregroundStyle(Theme.inkSoft)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.s5)
                Button("Try again") { Task { await store.load() } }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .ready:
            // Split from the navigation chrome for the same reason ReviewDecisionForm was
            // (Stage 2): ImageRenderer cannot draw a NavigationStack, and a board state
            // nobody can render is a board state nobody ever looks at before a user does.
            TrackerBoardBody(store: store, onOpenSwitcher: { showingSwitcher = true }, onOpenIssue: { openIssue = $0 })
        }
    }

    @ViewBuilder
    private var noticeBar: some View {
        if let notice = store.notice {
            Text(notice.text)
                .font(.hkCaption.weight(.medium))
                .foregroundStyle(notice.isFailure ? Theme.danger : Theme.ink)
                .padding(.horizontal, Theme.s4)
                .padding(.vertical, Theme.s2)
                .background(.ultraThinMaterial, in: Capsule())
                .padding(.bottom, Theme.s4)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .onTapGesture { store.notice = nil }
        }
    }
}

// MARK: - The board

struct TrackerBoardBody: View {
    @ObservedObject var store: TrackerStore
    var onOpenSwitcher: () -> Void = {}
    var onOpenIssue: (TrackerIssue) -> Void = { _ in }

    var body: some View {
        VStack(spacing: 0) {
            boardHeader
            if store.issues.isEmpty { emptyState } else { list }
        }
    }

    private var boardHeader: some View {
        Button { onOpenSwitcher() } label: {
            HStack(spacing: Theme.s2) {
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: Theme.s2) {
                        Text(store.activeBoard?.name ?? "Tracker")
                            .font(.hkSubheadline.weight(.bold))
                            .foregroundStyle(Theme.ink)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Theme.inkFaint)
                    }
                    Text(headerSubtitle)
                        .font(.hkCaption2)
                        .foregroundStyle(Theme.inkSoft)
                }
                Spacer(minLength: 0)
                if store.activeBoard?.isReadOnly == true {
                    Text("READ ONLY")
                        .font(.hanken(9).weight(.bold))
                        .foregroundStyle(Theme.inkFaint)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .overlay(Capsule().strokeBorder(Theme.hairline, lineWidth: 1))
                }
            }
            .padding(.horizontal, Theme.s4)
            .padding(.vertical, Theme.s3)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .background(Theme.ground)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.hairline).frame(height: 1) }
    }

    private var headerSubtitle: String {
        guard let board = store.activeBoard else { return "" }
        // A board that could not be READ has no count, and printing "0 open of 0" above
        // "This board could not be read" states two contradictory things one line apart.
        // Say the scope; the body says what happened.
        if store.emptyReason != nil { return board.scope }
        let open = store.issues.filter { $0.status != .done }.count
        let scope = board.scope.isEmpty ? "" : "\(board.scope) · "
        return "\(scope)\(open) open of \(store.issues.count)"
    }

    private var list: some View {
        List {
            ForEach(store.issues) { issue in
                Button { onOpenIssue(issue) } label: { TrackerIssueRow(issue: issue) }
                    .buttonStyle(.plain)
                    .listRowBackground(Theme.raised.opacity(0.6))
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .refreshable { await store.load() }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.s2) {
            Text(store.emptyReason == nil ? "Nothing on this board" : "This board could not be read")
                .font(.hkHeadline)
                .foregroundStyle(Theme.ink)
            Text(store.emptyReason ?? "New issues land here.")
                .font(.hkFootnote)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
        }
        .padding(Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    static func priorityColor(_ priority: IssuePriority) -> Color {
        switch priority {
        case .high:   return Theme.danger
        case .medium: return Theme.warning
        case .low:    return Theme.inkFaint
        }
    }

    /// THREE STATES MUST READ AS THREE STATES. Theme.warning and Theme.accent are two
    /// warm golds a few points apart — at 9pt caps, OPEN and IN PROGRESS rendered as the
    /// same colour, which is the one thing a status chip cannot do. Amber is "waiting on
    /// someone", bright ivory is "live right now", faint is closed. No new colour, three
    /// distinguishable states.
    static func statusColor(_ status: IssueStatus) -> Color {
        switch status {
        case .open:     return Theme.warning
        case .progress: return Theme.ink
        case .done:     return Theme.inkFaint
        }
    }
}


// MARK: - Row
//
// A content view, outside the List. ImageRenderer draws a List as an unsupported-content
// marker, so a row nobody can render is a row nobody looks at before a user does.

struct TrackerIssueRow: View {
    let issue: TrackerIssue

    var body: some View {
        // Top-aligned: a two-line title used to push the priority dot to the vertical
        // middle of the block, where it read as belonging to neither line. It marks the
        // issue, so it sits with the issue's first line.
        HStack(alignment: .top, spacing: Theme.s3) {
            Circle()
                .fill(TrackerBoardBody.priorityColor(issue.priority))
                .frame(width: 8, height: 8)
                .opacity(issue.status == .done ? 0.3 : 1)
                .padding(.top, 6)
            VStack(alignment: .leading, spacing: 3) {
                Text(issue.title)
                    .font(.hkSubheadline.weight(.semibold))
                    .foregroundStyle(issue.status == .done ? Theme.inkFaint : Theme.ink)
                    .lineLimit(2)
                HStack(spacing: Theme.s2) {
                    Text(issue.statusLabel.uppercased())
                        .font(.hanken(9).weight(.bold))
                        .foregroundStyle(TrackerBoardBody.statusColor(issue.status))
                    if !issue.area.isEmpty {
                        Text(issue.area)
                            .font(.hkCaption2)
                            .foregroundStyle(Theme.inkFaint)
                            .lineLimit(1)
                    }
                }
            }
            Spacer(minLength: Theme.s2)
            if !issue.owner.isEmpty {
                Text(issue.ownerInitials)
                    .font(.hanken(10).weight(.bold))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 26, height: 26)
                    .background(Theme.ground, in: Circle())
                    .overlay(Circle().strokeBorder(Theme.hairline, lineWidth: 1))
            }
        }
        .padding(.vertical, 3)
        .contentShape(Rectangle())
    }
}

// MARK: - Switcher

struct TrackerSwitcher: View {
    @ObservedObject var store: TrackerStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.boards) { board in
                    Button {
                        store.switchBoard(board.id)
                        dismiss()
                    } label: {
                        HStack(spacing: Theme.s3) {
                            Circle()
                                .fill(board.id == store.activeBoardID ? Theme.accent : Theme.inkFaint.opacity(0.4))
                                .frame(width: 8, height: 8)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(board.name)
                                    .font(.hkBody.weight(.semibold))
                                    .foregroundStyle(Theme.ink)
                                if !board.scope.isEmpty {
                                    Text(board.scope)
                                        .font(.hkCaption)
                                        .foregroundStyle(Theme.inkSoft)
                                }
                            }
                            Spacer(minLength: 0)
                            if board.openCount > 0 {
                                Text("\(board.openCount)")
                                    .font(.hkCaption.monospacedDigit())
                                    .foregroundStyle(Theme.inkFaint)
                            }
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(Theme.raised.opacity(0.6))
                }
            } // Creating a tracker is not offered here: the create form's `template`
              // decides where a tracker files itself, and getting that wrong makes a
              // board that never appears where the user looks for it. Boards are made on
              // the web; this app works the ones that exist.
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Boards")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Issue detail

struct IssueDetailSheet: View {
    @ObservedObject var store: TrackerStore
    let issue: TrackerIssue

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var api: CornerAPI
    @State private var status: IssueStatus
    @State private var assigning = false

    init(store: TrackerStore, issue: TrackerIssue) {
        self.store = store
        self.issue = issue
        _status = State(initialValue: issue.status)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(issue.title)
                        .font(.hkHeadline)
                        .foregroundStyle(Theme.ink)
                    if !issue.detail.isEmpty {
                        Text(issue.detail)
                            .font(.hkFootnote)
                            .foregroundStyle(Theme.inkSoft)
                    }
                }
                .listRowBackground(Theme.raised.opacity(0.6))

                Section("Status") {
                    if store.activeBoard?.canEditIssue == true {
                        Picker("Status", selection: $status) {
                            ForEach(IssueStatus.allCases, id: \.self) { value in
                                Text(value.label).tag(value)
                            }
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: status) { _, next in
                            guard next != issue.status else { return }
                            Task { await store.setStatus(next, on: issue) }
                        }
                    } else {
                        // The board's own word, not ours. Rewriting a client's vocabulary
                        // makes the two systems harder to talk about across, not easier.
                        LabeledContent("Status", value: issue.statusLabel)
                            .foregroundStyle(Theme.ink)
                        Text(store.activeBoard?.isReadOnly == true
                             ? "This board mirrors the client's own tracker. Changes are made there."
                             : "This tracker's rows can be added to but not edited from here.")
                            .font(.hkCaption2)
                            .foregroundStyle(Theme.inkFaint)
                    }
                }
                .listRowBackground(Theme.raised.opacity(0.6))

                Section("Facts") {
                    LabeledContent("Priority", value: issue.priority.label)
                    if !issue.area.isEmpty { LabeledContent("Area", value: issue.area) }
                    LabeledContent("Owner", value: issue.owner.isEmpty ? "Unassigned" : issue.owner)
                    ForEach(issue.columns, id: \.0) { column, value in
                        LabeledContent(column, value: value)
                    }
                    if !issue.link.isEmpty, let url = URL(string: issue.link) {
                        // An external destination on someone else's site. It leaves the
                        // app to Safari on purpose — nothing about the wider web belongs
                        // embedded inside a product surface.
                        Link("Open the page this is about", destination: url)
                            .font(.hkFootnote)
                    }
                }
                .foregroundStyle(Theme.ink)
                .listRowBackground(Theme.raised.opacity(0.6))

                if store.activeBoard?.canEditIssue == true {
                    Section {
                        Button {
                            assigning = true
                        } label: {
                            Label("Hand it to an agent", systemImage: "person.crop.circle.badge.plus")
                        }
                    }
                    .listRowBackground(Theme.raised.opacity(0.6))
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Issue")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $assigning) {
                AssignSheet(
                    artifactType: "bug",
                    artifactID: issue.id,
                    label: issue.title,
                    project: nil,
                    initialNotes: issue.detail,
                    onAssigned: { title in
                        Task { await store.stampOwner(title, on: issue.id) }
                    }
                )
                .environmentObject(api)
            }
        }
    }
}

// MARK: - New issue

struct NewIssueSheet: View {
    @ObservedObject var store: TrackerStore
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var detail = ""
    @State private var priority: IssuePriority = .high
    @State private var status: IssueStatus = .open
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("What is wrong") {
                    TextField("One line", text: $title, axis: .vertical)
                        .lineLimit(1...3)
                }
                .listRowBackground(Theme.raised.opacity(0.6))

                Section {
                    TextEditor(text: $detail)
                        .frame(minHeight: 90)
                        .scrollContentBackground(.hidden)
                        .font(.hkCallout)
                } header: {
                    Text("What should happen instead")
                } footer: {
                    Text("This becomes the row's expected result — what \"fixed\" means.")
                        .font(.hkCaption2)
                        .foregroundStyle(Theme.inkFaint)
                }
                .listRowBackground(Theme.raised.opacity(0.6))

                Section("How urgent") {
                    Picker("Priority", selection: $priority) {
                        Text("High").tag(IssuePriority.high)
                        Text("Med").tag(IssuePriority.medium)
                        Text("Low").tag(IssuePriority.low)
                    }
                    .pickerStyle(.segmented)
                    Picker("Status", selection: $status) {
                        ForEach(IssueStatus.allCases, id: \.self) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                .listRowBackground(Theme.raised.opacity(0.6))
            }
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("New issue")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }.disabled(saving)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(saving ? "Filing…" : "File it") {
                        Task {
                            saving = true
                            let ok = await store.createIssue(
                                title: title,
                                detail: detail,
                                priority: priority,
                                status: status,
                                owner: ""
                            )
                            saving = false
                            if ok { dismiss() }
                        }
                    }
                    // An issue with no title is a row nobody can act on, so the control
                    // is off until there is one rather than failing after the tap.
                    .disabled(saving || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
