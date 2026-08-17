// ReviewQueueView.swift — Corner native iOS
// corner:native-ios Stage 2
//
// Everything waiting on a verdict, across every room.
//
// This is the ONE screen in the app that is a list of work rather than a conversation,
// and it earns that because the queue is the thing you cannot see from inside a room:
// the deliverable waiting in a project you have not opened this week is invisible until
// something aggregates it.
//
// TAPPING OPENS THE FILE, NOT A FORM. You cannot review what you have not looked at, so
// a row opens the preview with the verdict bar on it — the same FilePreviewView a room
// crossing opens, not a parallel screen that would drift from it.

import SwiftUI

struct ReviewQueueView: View {
    @StateObject private var review = ReviewStore.shared
    @State private var preview: ReviewItem?

    var body: some View {
        Group {
            switch review.state {
            case .loading where review.items.isEmpty:
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            case .error(let message):
                message_(message)
            default:
                if review.items.isEmpty { emptyState } else { list }
            }
        }
        .groundBackground()
        .navigationTitle("Waiting on you")
        .navigationBarTitleDisplayMode(.inline)
        // The same number the Files headline card prints, off the same property. The
        // two screens disagreeing about the size of the backlog is what made the count
        // unreadable in the first place — there is now only one number to disagree with.
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if review.waitingCount > 0 {
                    Text(review.waitingCountLabel)
                        .font(.hkCaption.weight(.bold).monospacedDigit())
                        .foregroundStyle(Theme.ground)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Theme.warning, in: Capsule())
                        .accessibilityLabel("\(review.waitingCountLabel) waiting for review")
                }
            }
        }
        .task { await review.load() }
        .refreshable { await review.load() }
        .sheet(item: $preview) { item in
            FilePreviewView(
                attachment: item.asAttachment,
                reviewContext: FilePreviewView.ReviewContext(
                    project: item.project,
                    mission: item.mission,
                    isWaiting: true
                )
            )
        }
        .overlay(alignment: .bottom) { noticeBar }
    }

    private var list: some View {
        List {
            Section {
                ForEach(review.items) { item in
                    Button { preview = item } label: { row(item) }
                        .buttonStyle(.plain)
                        .listRowBackground(Theme.raised.opacity(0.5))
                }
            } footer: {
                if review.total > review.items.count {
                    Text("Showing \(review.items.count) of \(review.total).")
                        .font(.hkCaption2)
                        .foregroundStyle(Theme.inkFaint)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    private func row(_ item: ReviewItem) -> some View {
        HStack(spacing: Theme.s3) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Theme.raised)
                    .frame(width: 38, height: 38)
                Image(systemName: item.kind.symbol)
                    .font(.hkFootnote)
                    .foregroundStyle(Theme.accent)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.hkFootnote.weight(.medium))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text([item.location, RoomFile.relativeAge(item.date)]
                    .filter { !$0.isEmpty }
                    .joined(separator: " · "))
                    .font(.hkCaption2)
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            if review.deciding.contains(item.id) {
                ProgressView().controlSize(.small)
            } else {
                Image(systemName: "chevron.right")
                    .font(.hkCaption2)
                    .foregroundStyle(Theme.inkFaint)
            }
        }
        .contentShape(Rectangle())
    }

    /// The result of the last verdict, including the task id for a request-changes.
    /// A failure sits in danger red and says nothing was recorded, because the endpoint
    /// really does record nothing when it fails and a soft grey toast would read as
    /// "probably fine".
    @ViewBuilder
    private var noticeBar: some View {
        if let notice = review.notice {
            HStack(spacing: Theme.s2) {
                Image(systemName: notice.isFailure ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .foregroundStyle(notice.isFailure ? Theme.danger : Theme.accent)
                Text(notice.text)
                    .font(.hkCaption)
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Button { review.notice = nil } label: {
                    Image(systemName: "xmark").font(.hkCaption2)
                }
                .foregroundStyle(Theme.inkFaint)
            }
            .padding(Theme.s3)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
            .padding(Theme.s4)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.s2) {
            Image(systemName: "checkmark.circle").font(.hkTitle2).foregroundStyle(Theme.accent)
            Text("Nothing is waiting on you.")
                .font(.hkFootnote)
                .foregroundStyle(Theme.inkSoft)
            Text("Files agents hand you show up here until you give a verdict.")
                .font(.hkCaption2)
                .foregroundStyle(Theme.inkFaint)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func message_(_ text: String) -> some View {
        VStack(spacing: Theme.s2) {
            Image(systemName: "wifi.exclamationmark").font(.hkTitle2).foregroundStyle(Theme.inkSoft)
            Text(text).font(.hkFootnote).foregroundStyle(Theme.inkSoft).multilineTextAlignment(.center)
        }
        .padding(.horizontal, Theme.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
