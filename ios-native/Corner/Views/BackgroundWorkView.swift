// BackgroundWorkView.swift — Corner native iOS
// corner:native-ios R12 — Background work panel
//
// Phone equivalent of the web's WorkersShell. Opens as a sheet from the home
// rail's timer-icon toolbar button.
//
// Two sections, same honesty rule as the web (no fake UI):
//   Working in the background — dispatched jobs, status building | running
//   Coming back to you        — pending follow-ups (agent committed, not proven)
//
// Promise actions: Start it · Chase it · Dismiss — same semantics as the web.
// Start/Chase post a real message into the promise's own room and confirm only
// when the POST succeeds. Dismiss calls dismiss-followup and rolls back on failure.
//
// Design: HK Grotesk + CV6 tokens (Theme). Matches the language and tone of the
// web panel, adapted for native list rows. The pulsing dot on the toolbar button
// (in RoomListView) signals work is in flight without opening the sheet.

import SwiftUI

// MARK: - Helpers

/// Convert a slug or raw string to a human-readable label, matching the web's
/// `titleCaseName()` in WorkersShell.jsx.
private func titleCaseBgWork(_ s: String?) -> String {
    guard let s, !s.isEmpty else { return "" }
    return s.replacingOccurrences(of: #"[-_]"#, with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespaces)
        .split(separator: " ")
        .map { $0.prefix(1).uppercased() + $0.dropFirst() }
        .joined(separator: " ")
}

/// The room label shown for a task or promise: mission tail → project → agent.
/// Mirrors WorkersShell's `roomLabel()`.
private func roomLabel(mission: String?, project: String?, who: String?) -> String {
    if let mission, !mission.isEmpty {
        let tail = mission.contains(":")
            ? String(mission.split(separator: ":", maxSplits: 1).dropFirst().joined(separator: ":"))
            : mission
        return titleCaseBgWork(tail)
    }
    if let project, !project.isEmpty { return titleCaseBgWork(project) }
    if let who, !who.isEmpty { return titleCaseBgWork(who) }
    return ""
}

/// Format a duration — "2m", "1h 5m", "3d 4h" — matching web's fmtSpan.
private func fmtSpan(seconds: Int) -> String {
    let totalMin = seconds / 60
    let m = abs(totalMin)
    if m < 60 { return "\(m)m" }
    if m < 1440 {
        let h = m / 60; let rem = m % 60
        return rem > 0 ? "\(h)h \(rem)m" : "\(h)h"
    }
    let d = m / 1440; let remH = (m % 1440) / 60
    return remH > 0 ? "\(d)d \(remH)h" : "\(d)d"
}

private func secondsSince(_ iso: String?, relativeTo now: Date) -> Int? {
    guard let iso else { return nil }
    let fmt = ISO8601DateFormatter()
    fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let date = fmt.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    guard let date else { return nil }
    return max(0, Int(now.timeIntervalSince(date)))
}

private func isOverdue(due: String?, relativeTo now: Date) -> Bool {
    guard let due else { return false }
    let fmt = ISO8601DateFormatter()
    fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let date = fmt.date(from: due) ?? ISO8601DateFormatter().date(from: due)
    return date.map { $0 < now } ?? false
}

private func overdueSeconds(due: String?, relativeTo now: Date) -> Int {
    guard let due else { return 0 }
    let fmt = ISO8601DateFormatter()
    fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let date = fmt.date(from: due) ?? ISO8601DateFormatter().date(from: due) else { return 0 }
    return max(0, Int(now.timeIntervalSince(date)))
}

// MARK: - Section header

private struct SectionHeader: View {
    let label: String
    let count: Int
    let dim: Bool      // outlined dot (Coming back to you) vs filled (Working)

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(dim ? Color.clear : Theme.accent)
                    .frame(width: 8, height: 8)
                if dim {
                    Circle()
                        .strokeBorder(Theme.accent, lineWidth: 1.5)
                        .frame(width: 8, height: 8)
                }
            }
            .shadow(color: dim ? .clear : Theme.accent.opacity(0.3), radius: 4)

            Text(count > 1 ? "\(label) · \(count)" : label)
                .font(.hkCaption.weight(.semibold))
                .foregroundStyle(Theme.inkSoft)
                .textCase(.uppercase)
                .tracking(0.6)
        }
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
    }
}

// MARK: - Task row

private struct TaskRow: View {
    let task: BackgroundTask
    let now: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .top, spacing: 8) {
                Text(task.title)
                    .font(.hkSubheadline)
                    .foregroundStyle(Theme.ink)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let secs = secondsSince(task.since, relativeTo: now) {
                    Text("running \(fmtSpan(seconds: secs))")
                        .font(.hkCaption)
                        .foregroundStyle(Theme.inkFaint)
                        .monospacedDigit()
                }
            }

            let who = titleCaseBgWork(task.who)
            let where_ = roomLabel(mission: nil, project: task.project, who: task.who)
            let parts = [who.isEmpty ? nil : who, where_.isEmpty ? nil : "in \(where_)"].compactMap { $0 }
            if !parts.isEmpty {
                Text(parts.joined(separator: " · "))
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Promise row

private struct PromiseRow: View {
    let promise: BackgroundPromise
    let now: Date

    @State private var tapped: String?  // "start" | "chase" | "dismiss"
    @State private var failed: String?

    @EnvironmentObject private var store: BackgroundWorkStore

    private var rightLabel: String {
        if isOverdue(due: promise.due, relativeTo: now) {
            let secs = overdueSeconds(due: promise.due, relativeTo: now)
            return "overdue \(fmtSpan(seconds: secs))"
        }
        if let secs = secondsSince(promise.since, relativeTo: now) {
            return "waiting \(fmtSpan(seconds: secs))"
        }
        return ""
    }

    private var rightOverdue: Bool { isOverdue(due: promise.due, relativeTo: now) }

    private var firstLine: String {
        String(promise.title.split(separator: "\n").first ?? Substring(promise.title)).trimmingCharacters(in: .whitespaces)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 8) {
                Text(promise.title)
                    .font(.hkSubheadline)
                    .foregroundStyle(Theme.ink)
                    .lineLimit(3)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if !rightLabel.isEmpty {
                    Text(rightLabel)
                        .font(.hkCaption)
                        .foregroundStyle(rightOverdue ? Theme.accent : Theme.inkFaint)
                        .monospacedDigit()
                }
            }

            let where_ = roomLabel(mission: promise.mission, project: promise.project, who: promise.who)
            if !where_.isEmpty {
                Text("in \(where_)")
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)
            }

            // Actions
            if tapped == "start" || tapped == "chase" {
                Text(tapped == "start" ? "Told them to start it." : "Asked where they are.")
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)
                    .padding(.top, 2)
            } else {
                if let failure = failed {
                    Text(failure)
                        .font(.hkCaption)
                        .foregroundStyle(Theme.danger)
                        .padding(.top, 2)
                }
                HStack(spacing: 8) {
                    Button { sendAction("start", text: "Go ahead and start this now: \(firstLine)") } label: {
                        Text("Start it")
                            .font(.hkCaption.weight(.semibold))
                            .foregroundStyle(Theme.accent)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.buttonRadius, style: .continuous)
                                    .strokeBorder(Theme.accent, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                    .disabled(tapped != nil)

                    Button { sendAction("chase", text: "Where are you on this? \(firstLine)") } label: {
                        Text("Chase it")
                            .font(.hkCaption.weight(.semibold))
                            .foregroundStyle(Theme.inkSoft)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                    .disabled(tapped != nil)

                    Button { dismissAction() } label: {
                        Text(tapped == "dismiss" ? "Clearing…" : "Dismiss")
                            .font(.hkCaption.weight(.semibold))
                            .foregroundStyle(Theme.inkSoft)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                    .disabled(tapped != nil)
                }
                .padding(.top, 2)
            }
        }
        .padding(.vertical, 6)
    }

    private func sendAction(_ kind: String, text: String) {
        guard tapped == nil else { return }
        tapped = kind
        failed = nil
        Task {
            let ok = await store.sendToPromiseRoom(promise: promise, text: text)
            if !ok {
                tapped = nil
                failed = "Didn't send. Try again."
            }
        }
    }

    private func dismissAction() {
        guard tapped == nil else { return }
        tapped = "dismiss"
        failed = nil
        Task {
            let ok = await store.dismiss(promise: promise)
            if !ok {
                tapped = nil
                failed = "Couldn't clear it. Try again."
            }
        }
    }
}

// MARK: - Main view

struct BackgroundWorkView: View {
    @ObservedObject private var store = BackgroundWorkStore.shared
    @EnvironmentObject private var theme: ThemeManager
    @State private var now = Date()

    var body: some View {
        NavigationStack {
            Group {
                if store.isLoading && store.total == 0 {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Theme.ground)
                } else if store.total == 0 {
                    emptyState
                } else {
                    list
                }
            }
            .navigationTitle("Background work")
            .navigationBarTitleDisplayMode(.inline)
            .background(Theme.ground)
        }
        .task {
            store.startPolling()
            // Tick every second while the sheet is open so durations stay live.
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                now = Date()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock")
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(Theme.inkFaint)
            Text("Nothing is running in the background right now.")
                .font(.hkSubheadline)
                .foregroundStyle(Theme.inkSoft)
                .multilineTextAlignment(.center)
            Text("Jobs your agents hand off, and things they promise to come back with, show up here.")
                .font(.hkCaption)
                .foregroundStyle(Theme.inkFaint)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.ground)
    }

    private var list: some View {
        List {
            if !store.tasks.isEmpty {
                Section {
                    ForEach(store.tasks) { task in
                        TaskRow(task: task, now: now)
                            .listRowBackground(Theme.raised.opacity(0.5))
                            .listRowInsets(EdgeInsets(top: 2, leading: 16, bottom: 2, trailing: 16))
                    }
                } header: {
                    SectionHeader(
                        label: "Working in the background",
                        count: store.tasks.count,
                        dim: false
                    )
                }
            }

            if !store.livePromises.isEmpty {
                Section {
                    ForEach(store.livePromises) { promise in
                        PromiseRow(promise: promise, now: now)
                            .environmentObject(store)
                            .listRowBackground(Theme.raised.opacity(0.5))
                            .listRowInsets(EdgeInsets(top: 2, leading: 16, bottom: 2, trailing: 16))
                    }
                } header: {
                    SectionHeader(
                        label: "Coming back to you",
                        count: store.livePromises.count,
                        dim: true
                    )
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Theme.ground)
        .refreshable { await store.load() }
    }
}
