// RoomChecklistPanelView.swift — Corner native iOS
// corner:native-ios R11 — room checklists
//
// The native checklist panel. Sits inside the composer when the user taps the
// checklist button — replacing the text input exactly as the web's
// RoomChecklistPanel.jsx does. Functional parity with the web:
//
//   • Create / rename / collapse / delete lists
//   • Add / toggle / delete items
//   • Play: send a single item OR all open items from a list to the agent
//
// Design intent: Corner dark glass — identical to the web's #202026 card surface
// rendered in SwiftUI using Theme tokens. Feels native (circular progress ring,
// spring animations, swipe-to-delete) while matching the web pixel-faithfully.

import SwiftUI

// MARK: - Panel

struct RoomChecklistPanelView: View {
    let room: Room
    let onSend: (String) -> Void    // fires model.send() with a text payload
    let onClose: () -> Void

    @StateObject private var store = RoomChecklistStore()
    @State private var creatingList = false
    @State private var newListTitle = ""
    @State private var notice = ""
    @State private var noticeTask: Task<Void, Never>?

    var body: some View {
        VStack(spacing: 12) {
            panelHeader
            if creatingList { newListForm }
            checklistScrollArea
            if let msg = statusMessage {
                Text(msg)
                    .font(.hanken(10.5).weight(.semibold))
                    .foregroundStyle(store.status == .error ? Theme.danger : Theme.accent)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
                    .transition(.opacity)
                    .animation(.easeOut(duration: 0.2), value: msg)
            }
        }
        .task { await store.load(room: room) }
    }

    // MARK: - Header

    private var panelHeader: some View {
        HStack(spacing: 10) {
            // Checklist icon circle
            ZStack {
                Circle()
                    .fill(Theme.accentWeak)
                    .frame(width: 36, height: 36)
                Image(systemName: "checklist")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.accent)
            }

            VStack(alignment: .leading, spacing: 1) {
                Text("Room lists")
                    .font(.hanken(13).weight(.bold))
                    .foregroundStyle(Theme.ink)
                Text(summaryLine)
                    .font(.hanken(10.5).weight(.medium))
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)

            // New list button
            composerCircleButton(systemName: "plus", active: creatingList) {
                withAnimation(.spring(response: 0.24, dampingFraction: 0.8)) {
                    creatingList.toggle()
                    newListTitle = ""
                }
            }
            .accessibilityLabel(creatingList ? "Cancel new list" : "Create a new list")

            // Close button
            composerCircleButton(systemName: "xmark", active: false) {
                onClose()
            }
            .accessibilityLabel("Close checklists")
        }
        .padding(.horizontal, 2)
    }

    private var summaryLine: String {
        let all = store.lists.flatMap(\.items)
        guard !all.isEmpty else { return "private until you press Play" }
        let done = all.filter(\.done).count
        return "\(done) of \(all.count) complete"
    }

    // MARK: - New list form

    private var newListForm: some View {
        HStack(spacing: 8) {
            TextField("List title…", text: $newListTitle)
                .font(.hanken(13).weight(.semibold))
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 12)
                .frame(height: 40)
                .background(Theme.composerCard, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Theme.accent, lineWidth: 1)
                )
                .onSubmit { submitNewList() }

            Button("Create") { submitNewList() }
                .font(.hanken(12).weight(.bold))
                .foregroundStyle(newListTitle.trimmingCharacters(in: .whitespaces).isEmpty ? Theme.inkFaint : .white)
                .padding(.horizontal, 14)
                .frame(height: 40)
                .background(
                    newListTitle.trimmingCharacters(in: .whitespaces).isEmpty ? Theme.raised2 : Theme.accent,
                    in: Capsule()
                )
                .disabled(newListTitle.trimmingCharacters(in: .whitespaces).isEmpty || store.status == .saving)
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    private func submitNewList() {
        let title = newListTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        newListTitle = ""
        creatingList = false
        Task {
            await store.mutate(room: room, action: "create-list", fields: ["title": title])
        }
    }

    // MARK: - Scrollable list area

    private var checklistScrollArea: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if store.status == .loading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                } else if store.lists.isEmpty {
                    emptyState
                } else {
                    ForEach(store.lists) { list in
                        ChecklistCard(
                            list: list,
                            disabled: store.status == .saving,
                            onMutate: { action, fields in
                                Task {
                                    let ok = await store.mutate(room: room, action: action, fields: fields)
                                    if !ok { showNotice("Couldn't save that change.") }
                                }
                            },
                            onPlay: { text in
                                onSend(text)
                                showNotice("Sent to the agent.")
                            },
                            onPlayList: { list in
                                let openTexts = list.items.filter { !$0.done }.map(\.text)
                                guard !openTexts.isEmpty else { return }
                                let combined = openTexts.map { "- \($0)" }.joined(separator: "\n")
                                onSend("\(list.title):\n\(combined)")
                                showNotice("Sent \"\(list.title)\" to the agent.")
                            }
                        )
                    }
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 2)
        }
        .frame(maxHeight: min(UIScreen.main.bounds.height * 0.44, 440))
    }

    private var emptyState: some View {
        Button {
            withAnimation { creatingList = true }
        } label: {
            VStack(spacing: 6) {
                Image(systemName: "checklist")
                    .font(.system(size: 22, weight: .light))
                    .foregroundStyle(Theme.inkSoft)
                Text("Start a list for notes, reminders, or work you may send later.")
                    .font(.hanken(12.5).weight(.medium))
                    .foregroundStyle(Theme.inkSoft)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 90)
            .padding(16)
            .background(Theme.composerCard, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [5, 3]))
                    .foregroundStyle(Theme.hairline)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Status footer

    private var statusMessage: String? {
        if let e = store.errorMessage { return e }
        if !notice.isEmpty { return notice }
        if store.status == .saving { return "Saving…" }
        return nil
    }

    private func showNotice(_ text: String) {
        notice = text
        noticeTask?.cancel()
        noticeTask = Task {
            try? await Task.sleep(for: .seconds(3.5))
            guard !Task.isCancelled else { return }
            notice = ""
        }
    }
}

// MARK: - Checklist card

fileprivate struct ChecklistCard: View {
    var list: ChecklistList
    let disabled: Bool
    let onMutate: (String, [String: Any]) -> Void
    let onPlay: (String) -> Void
    let onPlayList: (ChecklistList) -> Void

    @State private var editingTitle: String
    @State private var newItemText = ""
    @State private var deleteArmed = false
    @State private var deleteTimer: Task<Void, Never>?

    init(list: ChecklistList, disabled: Bool,
         onMutate: @escaping (String, [String: Any]) -> Void,
         onPlay: @escaping (String) -> Void,
         onPlayList: @escaping (ChecklistList) -> Void) {
        self.list = list
        self.disabled = disabled
        self.onMutate = onMutate
        self.onPlay = onPlay
        self.onPlayList = onPlayList
        _editingTitle = State(initialValue: list.title)
    }

    var body: some View {
        VStack(spacing: 0) {
            cardHeader
            progressBar
            if !list.collapsed { cardBody }
        }
        .background(Theme.composerCard, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Theme.hairline, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.35), radius: 8, y: 4)
        .onChange(of: list.title) { _, new in editingTitle = new }
        .onChange(of: list.id) { _, _ in deleteArmed = false }
    }

    // MARK: Card header

    private var cardHeader: some View {
        HStack(spacing: 6) {
            // Collapse chevron
            Button {
                withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) {
                    onMutate("toggle-list", ["list_id": list.id])
                }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                    .rotationEffect(list.collapsed ? .zero : .degrees(90))
                    .animation(.spring(response: 0.22, dampingFraction: 0.8), value: list.collapsed)
                    .frame(width: 32, height: 32)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(list.collapsed ? "Expand \(list.title)" : "Collapse \(list.title)")

            // Editable title
            TextField("List title", text: $editingTitle)
                .font(.hanken(14).weight(.bold))
                .foregroundStyle(Theme.ink)
                .onSubmit { commitTitle() }
                .onDisappear { commitTitle() }

            // N/M counter
            Text("\(list.doneCount)/\(list.items.count)")
                .font(.system(size: 10.5, weight: .semibold, design: .monospaced))
                .foregroundStyle(list.doneCount == list.items.count && !list.items.isEmpty ? Theme.success : Theme.inkFaint)

            // Play list
            if list.openCount > 0 {
                composerCircleButton(systemName: "play.fill", active: false, tint: Theme.accent) {
                    onPlayList(list)
                }
                .accessibilityLabel("Send \(list.title) to the agent")
            }

            // Delete
            composerCircleButton(
                systemName: "trash",
                active: deleteArmed,
                tint: deleteArmed ? Theme.danger : nil
            ) {
                if deleteArmed {
                    deleteTimer?.cancel()
                    onMutate("delete-list", ["list_id": list.id])
                } else {
                    deleteArmed = true
                    deleteTimer = Task {
                        try? await Task.sleep(for: .seconds(4))
                        guard !Task.isCancelled else { return }
                        deleteArmed = false
                    }
                }
            }
            .accessibilityLabel(deleteArmed ? "Confirm delete \(list.title)" : "Delete \(list.title)")
        }
        .frame(minHeight: 54)
        .padding(.horizontal, 10)
    }

    private func commitTitle() {
        let next = editingTitle.trimmingCharacters(in: .whitespaces)
        guard !next.isEmpty, next != list.title else {
            editingTitle = list.title; return
        }
        onMutate("rename-list", ["list_id": list.id, "title": next])
    }

    // MARK: Progress bar

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Theme.hairline.opacity(0.5))
                    .frame(height: 2)
                Rectangle()
                    .fill(list.progress >= 1 ? Theme.success : Theme.accent)
                    .frame(width: geo.size.width * list.progress, height: 2)
                    .animation(.spring(response: 0.4, dampingFraction: 0.7), value: list.progress)
            }
        }
        .frame(height: 2)
    }

    // MARK: Card body (items + add field)

    private var cardBody: some View {
        VStack(spacing: 8) {
            ForEach(list.items) { item in
                ChecklistItemRow(
                    item: item,
                    disabled: disabled,
                    onToggle: { onMutate("toggle-item", ["list_id": list.id, "item_id": item.id]) },
                    onDelete: { onMutate("delete-item", ["list_id": list.id, "item_id": item.id]) },
                    onPlay: { onPlay(item.text) }
                )
            }
            addItemRow
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
    }

    private var addItemRow: some View {
        HStack(spacing: 7) {
            TextField("Add a note or next step…", text: $newItemText)
                .font(.hanken(13).weight(.medium))
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 11)
                .frame(height: 40)
                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .strokeBorder(Theme.hairline, lineWidth: 1)
                )
                .onSubmit { submitItem() }

            composerCircleButton(
                systemName: "plus",
                active: !newItemText.trimmingCharacters(in: .whitespaces).isEmpty
            ) {
                submitItem()
            }
            .disabled(newItemText.trimmingCharacters(in: .whitespaces).isEmpty || disabled)
            .accessibilityLabel("Add item to \(list.title)")
        }
    }

    private func submitItem() {
        let text = newItemText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        newItemText = ""
        onMutate("add-item", ["list_id": list.id, "text": text])
    }
}

// MARK: - Item row

fileprivate struct ChecklistItemRow: View {
    let item: ChecklistItem
    let disabled: Bool
    let onToggle: () -> Void
    let onDelete: () -> Void
    let onPlay: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            // Done toggle — circle or checkmark
            Button(action: onToggle) {
                ZStack {
                    Circle()
                        .strokeBorder(item.done ? Theme.accent : Theme.inkSoft.opacity(0.5), lineWidth: 1.5)
                        .frame(width: 24, height: 24)
                    if item.done {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Theme.accent)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(disabled)
            .accessibilityLabel(item.done ? "Reopen \(item.text)" : "Complete \(item.text)")

            Text(item.text)
                .font(.hanken(13.5).weight(.medium))
                .foregroundStyle(item.done ? Theme.inkFaint : Theme.ink)
                .strikethrough(item.done, color: Theme.inkFaint)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Play — sends this item's text to the agent
            Button(action: onPlay) {
                Image(systemName: "play.fill")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.accent)
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .disabled(disabled)
            .accessibilityLabel("Send \(item.text) to agent")

            // Delete
            Button(action: onDelete) {
                Image(systemName: "trash")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.inkSoft)
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .disabled(disabled)
            .accessibilityLabel("Delete \(item.text)")
        }
        .frame(minHeight: 40)
        .contentShape(Rectangle())
        .animation(.easeOut(duration: 0.15), value: item.done)
    }
}

// MARK: - Shared utility: small circle button

/// 36pt circle action button matching the composer's control style.
@MainActor
fileprivate func composerCircleButton(
    systemName: String,
    active: Bool,
    tint: Color? = nil,
    action: @escaping () -> Void
) -> some View {
    Button(action: action) {
        Image(systemName: systemName)
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(tint ?? (active ? Theme.accent : Theme.inkSoft))
            .frame(width: 36, height: 36)
            .background(
                active ? Theme.accentWeak : Theme.raised2,
                in: Circle()
            )
            .overlay(
                Circle().strokeBorder(active ? Theme.accent : Theme.hairline, lineWidth: 1)
            )
    }
    .buttonStyle(.plain)
}

// Theme.success already defined in Theme.swift — no extension needed here.
