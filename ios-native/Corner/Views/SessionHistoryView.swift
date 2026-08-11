// SessionHistoryView.swift — Corner native iOS
// corner:native-ios R13
//
// "History of past chat sessions and Start a fresh room session, natively."
//
// The web's RoomSettingsDialog History tab shows archivedMessages (everything
// before the last room_reset marker) and a "Start a fresh room session" action.
// This file is the native equivalent:
//   • Fetches the full message history (limit 500).
//   • Splits it into sessions separated by room_reset rows.
//   • Shows past sessions as collapsible cards (date + count + first-message
//     preview). The current session is already visible in the main thread, so
//     only sessions BEFORE the last reset appear here.
//   • "Start fresh" → POST /api/dashboard/room-reset, then reloads the thread.

import SwiftUI

// MARK: - Session model

/// One bounded exchange group — everything between two consecutive room_reset rows,
/// or everything before the first reset.
struct SessionGroup: Identifiable {
    let id: UUID
    let messages: [MessageRow]

    var startDate: Date? { messages.first?.date }
    var endDate: Date? { messages.last?.date }
    var messageCount: Int { messages.filter { !$0.isSystemNoise }.count }

    /// First non-system user-readable line for the card preview.
    var preview: String? {
        messages
            .filter { !$0.isSystemNoise }
            .compactMap { $0.text?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty }
            .map { String($0.prefix(120)) }
    }
}

private extension MessageRow {
    /// Rows the user doesn't need to see in the history list.
    var isSystemNoise: Bool {
        source == "room_reset"
            || source == "session_restart"
            || source == "probe"
            || role == "system"
    }
}

// MARK: - History view

struct SessionHistoryView: View {
    let room: Room
    let onClearRoom: (() async -> Bool)?

    @State private var loadState: LoadState = .idle
    @State private var sessions: [SessionGroup] = []
    @State private var expandedSessionID: UUID? = nil
    @State private var clearState: ClearState = .idle

    private enum LoadState: Equatable {
        case idle, loading, ready, empty, error(String)
    }
    private enum ClearState: Equatable {
        case idle, confirm, busy, done, failed
    }

    var body: some View {
        Group {
            switch loadState {
            case .idle, .loading:
                VStack(spacing: 12) {
                    ProgressView()
                        .tint(Theme.accent)
                    Text("Loading session history…")
                        .font(.hanken(13))
                        .foregroundStyle(Theme.inkSoft)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.ground)

            case .error(let msg):
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.circle")
                        .font(.system(size: 28))
                        .foregroundStyle(Theme.inkSoft)
                    Text(msg)
                        .font(.hanken(13))
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(Theme.s4)

            case .empty:
                VStack(spacing: 10) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 32))
                        .foregroundStyle(Theme.inkSoft)
                    Text("No archived sessions yet")
                        .font(.hanken(14).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    Text("Starting a fresh session will move the current conversation here.")
                        .font(.hanken(13))
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(Theme.s4)
                .padding(.top, Theme.s4)

            case .ready:
                ScrollView {
                    LazyVStack(spacing: 10, pinnedViews: []) {
                        ForEach(sessions.reversed()) { session in
                            SessionCard(
                                session: session,
                                isExpanded: expandedSessionID == session.id
                            ) {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    expandedSessionID = expandedSessionID == session.id
                                        ? nil : session.id
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Theme.s3)
                    .padding(.top, 4)
                    .padding(.bottom, 16)
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            startFreshButton
        }
        .task {
            await loadHistory()
        }
    }

    // MARK: - Session cards

    // MARK: - Start fresh

    @ViewBuilder
    private var startFreshButton: some View {
        if onClearRoom != nil {
            VStack(spacing: 0) {
                Divider()
                    .background(Theme.hairline)
                VStack(spacing: 10) {
                    switch clearState {
                    case .idle:
                        Button {
                            withAnimation { clearState = .confirm }
                        } label: {
                            Text("Start a fresh session")
                                .font(.hanken(14).weight(.semibold))
                                .foregroundStyle(Theme.ink)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .strokeBorder(Theme.hairline, lineWidth: 0.5)
                                )
                        }

                    case .confirm:
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Clear the current screen?")
                                .font(.hanken(14).weight(.semibold))
                                .foregroundStyle(Theme.ink)
                            Text("Messages will move to History and the agent will receive a scoped reset. Files and memories are kept.")
                                .font(.hanken(12))
                                .foregroundStyle(Theme.inkSoft)
                        }
                        HStack(spacing: 10) {
                            Button {
                                withAnimation { clearState = .idle }
                            } label: {
                                Text("Cancel")
                                    .font(.hanken(14).weight(.medium))
                                    .foregroundStyle(Theme.inkSoft)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 11)
                                    .background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .strokeBorder(Theme.hairline, lineWidth: 0.5)
                                    )
                            }
                            Button {
                                Task { await doClear() }
                            } label: {
                                Text("Confirm clear")
                                    .font(.hanken(14).weight(.semibold))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 11)
                                    .background(
                                        Color.red.opacity(0.75),
                                        in: RoundedRectangle(cornerRadius: 10)
                                    )
                            }
                        }

                    case .busy:
                        HStack(spacing: 8) {
                            ProgressView().tint(Theme.inkSoft)
                            Text("Clearing…")
                                .font(.hanken(14))
                                .foregroundStyle(Theme.inkSoft)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                    case .done:
                        Label("Room cleared. Previous session archived above.", systemImage: "checkmark.circle.fill")
                            .font(.hanken(13))
                            .foregroundStyle(Theme.success)

                    case .failed:
                        Label("Could not clear this room. Nothing was removed.", systemImage: "exclamationmark.triangle")
                            .font(.hanken(13))
                            .foregroundStyle(Color.red.opacity(0.8))
                        Button {
                            withAnimation { clearState = .idle }
                        } label: {
                            Text("Try again")
                                .font(.hanken(13))
                                .foregroundStyle(Theme.accent)
                        }
                    }
                }
                .padding(.horizontal, Theme.s3)
                .padding(.top, 12)
                .padding(.bottom, 16)
                .background(Theme.ground)
            }
        }
    }

    // MARK: - Actions

    private func loadHistory() async {
        loadState = .loading
        do {
            let all = try await CornerAPI.shared.fetchMessages(room: room, limit: 500)
            let parsed = parseSessions(from: all)
            sessions = parsed
            loadState = parsed.isEmpty ? .empty : .ready
        } catch {
            loadState = .error("Could not load session history.")
        }
    }

    private func parseSessions(from rows: [MessageRow]) -> [SessionGroup] {
        // Split the full history at every room_reset row, oldest-first.
        // The last batch (after the most recent reset) = current thread — excluded.
        // Only sessions BEFORE the first reset appear as "past sessions".
        var groups: [SessionGroup] = []
        var current: [MessageRow] = []

        for row in rows {
            let isReset = row.source == "room_reset"
                || (row.metadata?.objectValue?["room_reset"]?.boolValue == true)
            if isReset {
                // This reset closes the current batch as a completed session.
                if !current.isEmpty {
                    groups.append(SessionGroup(id: UUID(), messages: current))
                }
                current = []
            } else {
                current.append(row)
            }
        }
        // `current` after the loop = messages from the CURRENT session (after the
        // last reset). We do NOT include these — they're already in the main thread.
        // If there was never any reset, `groups` is empty → show the empty state.
        return groups
    }

    private func doClear() async {
        clearState = .busy
        let ok = await onClearRoom?() ?? false
        if ok {
            clearState = .done
            // Reload history to show the just-archived session.
            await loadHistory()
        } else {
            clearState = .failed
        }
    }
}

// MARK: - Session card

private struct SessionCard: View {
    let session: SessionGroup
    let isExpanded: Bool
    let onToggle: () -> Void

    private static let dayFmt: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()
    private static let timeFmt: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ── Card header ──────────────────────────────────────────────────
            Button(action: onToggle) {
                HStack(spacing: Theme.s2) {
                    // Session date badge
                    VStack(alignment: .leading, spacing: 2) {
                        Text(dateLabel)
                            .font(.hanken(12).weight(.semibold))
                            .foregroundStyle(Theme.ink)
                        Text(countLabel)
                            .font(.hanken(11))
                            .foregroundStyle(Theme.inkSoft)
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.inkSoft)
                }
                .padding(.horizontal, Theme.s3)
                .padding(.vertical, 12)
            }
            .buttonStyle(.plain)

            if !isExpanded {
                // Preview of first message
                if let preview = session.preview {
                    Text(preview)
                        .font(.hanken(12))
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(2)
                        .padding(.horizontal, Theme.s3)
                        .padding(.bottom, 12)
                }
            } else {
                // Expanded: full message list (scrollable within the card)
                Divider()
                    .background(Theme.hairline)
                    .padding(.horizontal, Theme.s3)

                VStack(alignment: .leading, spacing: 0) {
                    ForEach(session.messages.filter { !$0.isSystemNoise }) { msg in
                        SessionMessageRow(row: msg)
                        if msg.id != session.messages.filter({ !$0.isSystemNoise }).last?.id {
                            Divider()
                                .background(Theme.hairline)
                                .padding(.leading, Theme.s3)
                        }
                    }
                }
            }
        }
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Theme.hairline, lineWidth: 0.5)
        )
        .clipped()
    }

    private var dateLabel: String {
        guard let start = session.startDate else { return "Archived session" }
        let day = Self.dayFmt.string(from: start)
        if let end = session.endDate, !Calendar.current.isDate(start, inSameDayAs: end) {
            let endDay = Self.dayFmt.string(from: end)
            return "\(day) – \(endDay)"
        }
        return day
    }

    private var countLabel: String {
        let n = session.messageCount
        return "\(n) \(n == 1 ? "message" : "messages")"
    }
}

// MARK: - Session message row

private struct SessionMessageRow: View {
    let row: MessageRow

    private static let timeFmt: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(row.displayName)
                    .font(.hanken(11).weight(.semibold))
                    .foregroundStyle(row.isUser ? Theme.accent : Theme.inkSoft)
                Spacer()
                if let date = row.date {
                    Text(Self.timeFmt.string(from: date))
                        .font(.hanken(10))
                        .foregroundStyle(Theme.inkSoft)
                }
            }
            if let text = row.text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(text)
                    .font(.hanken(12))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(6)
            } else {
                Text("Attachment or structured result")
                    .font(.hanken(12))
                    .foregroundStyle(Theme.inkSoft)
                    .italic()
            }
        }
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, 10)
    }
}

