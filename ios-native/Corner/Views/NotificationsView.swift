// NotificationsView.swift — Corner native iOS
// corner:native-ios R8 — the basic notification list.
//
// Patrik 2026-08-11: the "Waiting on you" block at the top of home "gives anxiety" —
// gone. In its place, plain notifications: a file (or batch of files) delivered to a
// room, and messages that landed. A file notification opens THAT file's review
// directly; a message notification opens THAT chat, which lands at the bottom.
// Nothing here is a new data source — files come from the same review store the
// queue reads, messages from the same recency feed the home renders — so this list
// can never disagree with the surfaces it links to.

import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject private var router: AppRouter
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
                if review.items.isEmpty && messageEntries.isEmpty {
                    Text("You're all caught up.")
                        .font(.hkFootnote)
                        .foregroundStyle(Theme.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, Theme.s6)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }

                if !review.items.isEmpty {
                    Section("Files") {
                        ForEach(review.items) { item in
                            Button { previewing = item } label: {
                                fileRow(item)
                            }
                        }
                    }
                }

                if !messageEntries.isEmpty {
                    Section("Messages") {
                        ForEach(messageEntries, id: \.id) { entry in
                            Button {
                                dismiss()
                                router.open(entry.room)
                            } label: {
                                messageRow(entry)
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Notifications")
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
        .task { await review.load() }
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

    private func messageRow(_ entry: RoomStore.RecentRoom) -> some View {
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
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            Text(RelTime.of(entry.ts))
                .font(.hkCaption2.monospaced())
                .foregroundStyle(Theme.inkFaint)
        }
    }
}
