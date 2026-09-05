// NotificationsView.swift — Corner native iOS
// corner:native-ios R8 — the notification list.
//
// Primary content is ACTIVITY: messages that need attention, completed tasks,
// agent actions — room name, what happened, when. Files stay as a secondary
// section below. A file notification opens THAT file's review directly; an
// activity notification opens THAT chat at the bottom. Nothing here is a new
// data source — files come from the same review store the queue reads, activity
// from the same recency feed the home renders — so this list can never disagree
// with the surfaces it links to.

import SwiftUI
import UIKit

struct NotificationsView: View {
    @EnvironmentObject private var router: AppRouter
    @EnvironmentObject private var push: PushService
    @ObservedObject private var review = ReviewStore.shared
    /// The home's recency entries, handed in so the two surfaces share one fetch.
    let recent: [RoomStore.RecentRoom]
    @Environment(\.dismiss) private var dismiss

    @State private var previewing: ReviewItem?

    private var messageEntries: [RoomStore.RecentRoom] {
        recent.filter { !$0.preview.isEmpty }.prefix(12).map { $0 }
    }

    var body: some View {
        NavigationStack {
            List {
                if push.authorizationStatus == .denied {
                    Section("Alerts") {
                        Label("Notifications are off", systemImage: "bell.slash")
                            .foregroundStyle(Theme.warning)
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            Link("Open iOS Settings", destination: url)
                        }
                    }
                } else if push.authorizationStatus == .notDetermined {
                    Section("Alerts") {
                        Button {
                            Task { _ = await push.requestAuthorizationExplicitly() }
                        } label: {
                            Label("Turn on notifications", systemImage: "bell.badge")
                        }
                    }
                } else if let error = push.registrationError {
                    Section("Alerts") {
                        Label("This phone is not registered", systemImage: "bell.badge.slash")
                            .foregroundStyle(Theme.warning)
                        Text(error)
                            .font(.hkCaption)
                            .foregroundStyle(Theme.inkSoft)
                        Button("Try registration again") {
                            Task { await push.registerCurrentTokenIfAny() }
                        }
                    }
                } else if push.deviceToken == nil {
                    Section("Alerts") {
                        HStack {
                            ProgressView().controlSize(.small)
                            Text("Registering this phone…")
                        }
                    }
                }

                if review.items.isEmpty && messageEntries.isEmpty {
                    Text("You're all caught up.")
                        .font(.hkFootnote)
                        .foregroundStyle(Theme.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, Theme.s6)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }

                // PRIMARY: activity — messages that need attention, agent replies, task completions.
                if !messageEntries.isEmpty {
                    Section("Activity") {
                        ForEach(messageEntries, id: \.id) { entry in
                            Button {
                                dismiss()
                                router.open(entry.room)
                            } label: {
                                activityRow(entry)
                            }
                        }
                    }
                }

                // SECONDARY: files — delivered attachments awaiting review.
                if !review.items.isEmpty {
                    Section("Files") {
                        ForEach(review.items) { item in
                            Button { previewing = item } label: {
                                fileRow(item)
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .groundBackground()
            .navigationTitle("Notifications")
            .accessibilityIdentifier("notifications-sheet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(item: $previewing) { item in
                // Straight to the review of that file — the same preview + verdict
                // bar the queue and the thread use.
                FilePreviewView(
                    attachment: item.asAttachment,
                    reviewContext: FilePreviewView.ReviewContext(
                        project: item.project,
                        mission: item.mission,
                        isWaiting: true
                    )
                )
            }
        }
        .task {
            await review.load()
            await push.refreshAuthorizationAndRegisterIfAllowed()
            await push.registerCurrentTokenIfAny()
        }
    }

    private func fileRow(_ item: ReviewItem) -> some View {
        HStack(spacing: Theme.s3) {
            Image(systemName: "doc.fill")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Theme.accent)
                .frame(width: 34, height: 34)
                .background(Theme.accentWeak, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Text(item.location)
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.hkCaption.weight(.semibold))
                .foregroundStyle(Theme.inkFaint)
        }
    }

    private func activityRow(_ entry: RoomStore.RecentRoom) -> some View {
        HStack(spacing: Theme.s3) {
            Monogram(title: entry.room.title, tint: Theme.tint(for: entry.room.title), hero: false)
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.room.title)
                    .font(.hanken(14).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                Text(entry.preview)
                    .font(.hkCaption)
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 4) {
                Text(RelTime.of(entry.ts))
                    .font(.hkCaption2.monospaced())
                    .foregroundStyle(Theme.inkFaint)
                Image(systemName: "chevron.right")
                    .font(.hkCaption2.weight(.semibold))
                    .foregroundStyle(Theme.inkFaint)
            }
        }
    }

    // Kept for backward compat if referenced elsewhere — delegates to activityRow.
    private func messageRow(_ entry: RoomStore.RecentRoom) -> some View {
        activityRow(entry)
    }
}
