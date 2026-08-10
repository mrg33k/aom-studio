// RoomListView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// The rooms rail: agents, then projects fanned to their missions.
//
// Agents render as TITLES, never persona names (cv6next/data/agentTitles.js doctrine,
// 2026-06-23) — "Assistant", not "Rex". A name is a liability as Corner goes public
// and tells a new user nothing; a role tells them what the room is for.

import SwiftUI

struct RoomListView: View {
    @EnvironmentObject private var api: CornerAPI
    @EnvironmentObject private var router: AppRouter
    @StateObject private var store = RoomStore()

    @StateObject private var review = ReviewStore.shared

    @State private var query = ""
    @State private var showAccount = false
    @State private var showReview = false
    @State private var expanded: Set<String> = []

    var body: some View {
        List {
            if api.world == nil {
                noWorldNotice
            } else if query.isEmpty {
                waitingSection
                agentSection
                projectSections
                if let error = store.railError { railErrorRow(error) }
            } else {
                searchResults
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Theme.ground)
        .navigationTitle("Corner")
        .searchable(text: $query, prompt: "Search rooms")
        .refreshable { await store.load() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showAccount = true
                } label: {
                    Image(systemName: "person.crop.circle")
                }
                .accessibilityLabel("Account")
            }
        }
        .sheet(isPresented: $showAccount) {
            AccountView()
                .environmentObject(api)
                .environmentObject(PushService.shared)
        }
        .navigationDestination(isPresented: $showReview) {
            ReviewQueueView()
        }
        .task {
            if !store.hasLoadedOnce { await store.load() }
            review.startPolling()
        }
        .onChange(of: api.world) { _, _ in store.refresh() }
    }

    // MARK: - Sections

    /// The queue gets a row only when something is actually in it. A permanent
    /// "Waiting on you — 0" is a nav item pretending to be a signal, and after a week of
    /// showing zero it stops being read at all — which is the one time it matters.
    @ViewBuilder
    private var waitingSection: some View {
        if review.waitingCount > 0 {
            Section {
                Button { showReview = true } label: {
                    HStack(spacing: Theme.s3) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 9, style: .continuous)
                                .fill(Theme.warning.opacity(0.16))
                                .frame(width: 34, height: 34)
                            Image(systemName: "tray.full")
                                .font(.footnote)
                                .foregroundStyle(Theme.warning)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Waiting on you")
                                .font(.body.weight(.semibold))
                                .foregroundStyle(Theme.ink)
                            Text(review.waitingCount == 1
                                 ? "1 file needs a verdict"
                                 : "\(review.waitingCount) files need a verdict")
                                .font(.caption)
                                .foregroundStyle(Theme.inkSoft)
                        }
                        Spacer(minLength: 0)
                        Text("\(review.waitingCount)")
                            .font(.caption.weight(.bold).monospacedDigit())
                            .foregroundStyle(Theme.ground)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Theme.warning, in: Capsule())
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .listRowBackground(Theme.raised.opacity(0.6))
            }
        }
    }

    private var agentSection: some View {
        Section("Agents") {
            ForEach(store.agents) { room in
                roomRow(room)
            }
        }
    }

    @ViewBuilder
    private var projectSections: some View {
        if store.isLoading && store.projects.isEmpty {
            Section("Projects") {
                HStack(spacing: Theme.s2) {
                    ProgressView().controlSize(.small)
                    Text("Loading projects…").font(.footnote).foregroundStyle(Theme.inkSoft)
                }
            }
        } else if !store.projects.isEmpty {
            Section("Projects") {
                ForEach(store.projects) { group in
                    roomRow(group.room, trailing: group.missions.isEmpty ? nil : AnyView(
                        Button {
                            toggle(group.room.roomID)
                        } label: {
                            Image(systemName: expanded.contains(group.room.roomID) ? "chevron.down" : "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Theme.inkFaint)
                                .padding(.leading, Theme.s2)
                        }
                        .buttonStyle(.plain)
                    ))
                    if expanded.contains(group.room.roomID) {
                        ForEach(group.missions) { mission in
                            roomRow(mission, indented: true)
                        }
                    }
                }
            }
        }
    }

    private var searchResults: some View {
        let matches = store.allRooms.filter {
            $0.title.localizedCaseInsensitiveContains(query)
                || $0.subtitle.localizedCaseInsensitiveContains(query)
        }
        return Section(matches.isEmpty ? "No rooms match" : "Results") {
            ForEach(matches) { roomRow($0) }
        }
    }

    private var noWorldNotice: some View {
        Section {
            VStack(alignment: .leading, spacing: Theme.s2) {
                Text("No workspace on this account")
                    .font(.headline)
                    .foregroundStyle(Theme.ink)
                // The app refuses to guess a workspace. Guessing is how one tenant ends
                // up reading another's rooms (fixed on the web 2026-05-24) and on a
                // phone it would be completely silent.
                //
                // The copy leads with the LIKELY cause rather than the rare one. Four
                // of the twenty live accounts carry no workspace and three of those
                // belong to the same person, so "you signed in with the wrong one of
                // your logins" is the common case by a wide margin. The web hides this
                // behind a super-admin world override that this app does not have and
                // should not grow one of before world switching exists.
                Text("If you have more than one Corner login, sign out and use the one you sign in with on the web.")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkSoft)
                Text("If this is your only login, ask whoever invited you to finish setting up your account.")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkFaint)
                Button("Sign out") {
                    Task { await api.signOut() }
                }
                .font(.footnote.weight(.semibold))
                .padding(.top, Theme.s1)
            }
            .padding(.vertical, Theme.s2)
        }
    }

    private func railErrorRow(_ message: String) -> some View {
        Section {
            Label(message, systemImage: "exclamationmark.triangle")
                .font(.footnote)
                .foregroundStyle(Theme.warning)
        }
    }

    // MARK: - Row

    private func roomRow(_ room: Room, indented: Bool = false, trailing: AnyView? = nil) -> some View {
        HStack(spacing: Theme.s3) {
            if indented {
                Rectangle()
                    .fill(Theme.hairline)
                    .frame(width: 1, height: 28)
                    .padding(.leading, Theme.s3)
            }
            RoomAvatar(title: room.title, isMission: room.isMission)
            VStack(alignment: .leading, spacing: 2) {
                Text(room.title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Theme.ink)
                if !room.subtitle.isEmpty {
                    Text(room.subtitle)
                        .font(.caption)
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: Theme.s2)
            if let trailing { trailing }
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
        // A tap gesture rather than a NavigationLink: the project rows carry their own
        // expand button, and a Button nested inside a NavigationLink's label is a
        // well-known SwiftUI dead zone — the row would swallow the disclosure tap.
        .onTapGesture { router.open(room) }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .listRowBackground(Theme.raised.opacity(0.6))
    }

    private func toggle(_ id: String) {
        if expanded.contains(id) { expanded.remove(id) } else { expanded.insert(id) }
    }
}

private extension Room {
    var isMission: Bool {
        if case .mission = kind { return true }
        return false
    }
}

struct RoomAvatar: View {
    let title: String
    var isMission = false

    var body: some View {
        Text(initials)
            .font(.caption.weight(.bold))
            .foregroundStyle(isMission ? Theme.accent : Theme.ink)
            .frame(width: 34, height: 34)
            .background(
                RoundedRectangle(cornerRadius: isMission ? 9 : 17, style: .continuous)
                    .fill(Theme.raised)
            )
            .overlay(
                RoundedRectangle(cornerRadius: isMission ? 9 : 17, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
    }

    private var initials: String {
        let words = title.split(separator: " ")
        if words.count >= 2 {
            return String(words[0].prefix(1) + words[1].prefix(1)).uppercased()
        }
        return String(title.prefix(2)).uppercased()
    }
}
