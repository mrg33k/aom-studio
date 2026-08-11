// MessageBubbleView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// One row of the thread: prose, link cards, blocks, and an image attachment.
//
// Markdown is parsed with AttributedString's own inline parser rather than a
// dependency. It handles the things agents actually emit — **bold**, `code`,
// [links](…) — and when a string fails to parse the plain text is used instead, so a
// malformed asterisk can never cost a message its content.

import SwiftUI
import UIKit

struct MessageBubbleView: View {
    let row: MessageRow
    var onOption: (String) -> Void = { _ in }
    /// The room this bubble is in, so a file tapped here can carry a review verdict
    /// filed against the right project and mission. Absent in previews and tests.
    var room: Room?
    /// Deliverable ids still waiting on a verdict, passed DOWN as a value rather than
    /// observed here. A bubble that subscribes to the review store means every row in a
    /// long thread re-renders on each 60s queue refresh; the thread is the hottest view
    /// in the app and it has no reason to redraw because a file in another room was
    /// approved. ChatView observes once and hands the answer down.
    var waitingIDs: Set<String> = []
    /// Whether this row opens a new sender group. When false (the previous row is
    /// from the SAME author) the avatar and the author name are suppressed and the
    /// avatar column collapses to a clear spacer, so a run of one agent's replies
    /// reads as one voice — the web mobile thread's per-sender grouping, matched.
    var showsAuthor: Bool = true

    @State private var previewing: Attachment?

    private var content: MessageContent { MessageContent.build(from: row) }

    var body: some View {
        let content = self.content
        Group {
            if row.isUser {
                // The user's own turn: right-aligned, no avatar (it is them), time
                // below the bubble. Matches the web mobile user turn.
                HStack(spacing: 0) {
                    Spacer(minLength: 44)
                    VStack(alignment: .trailing, spacing: Theme.s2) {
                        payload(content, alignment: .trailing)
                        timeBelow(alignment: .trailing)
                    }
                }
            } else {
                // An agent turn: left 2-letter monogram avatar, the author name above
                // the bubble (once per group), then the bubble and its files/blocks,
                // then the time. Matches the web mobile agent turn anatomy.
                HStack(alignment: .top, spacing: Theme.s2) {
                    TurnAvatar(name: row.displayName, visible: showsAuthor)
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        if showsAuthor {
                            Text(row.displayName)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.ink)
                        }
                        payload(content, alignment: .leading)
                        timeBelow(alignment: .leading)
                    }
                    Spacer(minLength: Theme.s3)
                }
            }
        }
        .sheet(item: $previewing) { attachment in
            FilePreviewView(
                attachment: attachment,
                reviewContext: row.isUser ? nil : FilePreviewView.ReviewContext(
                    project: room?.reviewProject ?? "",
                    mission: room?.reviewMission ?? "",
                    isWaiting: waitingIDs.contains(attachment.url)
                )
            )
        }
    }

    /// The bubble (or the "cannot display" fallback) plus every renderable payload the
    /// row carries — files, link cards, blocks — in the shared order.
    @ViewBuilder
    private func payload(_ content: MessageContent, alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: Theme.s2) {
            if !content.prose.isEmpty {
                Text(MessageBubbleView.attributed(content.prose))
                    .font(.body)
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, Theme.s3)
                    .padding(.vertical, 10)
                    .background(
                        row.isUser ? Theme.userBubble : Theme.agentBubble,
                        in: RoundedRectangle(cornerRadius: Theme.bubbleRadius, style: .continuous)
                    )
                    .textSelection(.enabled)
                    .contextMenu {
                        Button {
                            UIPasteboard.general.string = content.prose
                        } label: {
                            Label("Copy", systemImage: "doc.on.doc")
                        }
                    }
            } else if content.isEmpty {
                // A row with no text and no renderable payload is not blank by
                // intent — it is something this build cannot show. Say that rather
                // than render an empty bubble the user reads as a bug.
                Text("Nothing this version can display")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkFaint)
                    .padding(.horizontal, Theme.s3)
                    .padding(.vertical, Theme.s2)
                    .background(Theme.agentBubble, in: RoundedRectangle(cornerRadius: Theme.bubbleRadius, style: .continuous))
            }

            // Files in the thread. An image renders as the image — a photo the
            // agent sent arriving as a grey "photo.png" row is the single most
            // common way a delivered picture reads as a broken delivery.
            ForEach(content.attachments) { attachment in
                AttachmentCardView(
                    attachment: attachment,
                    isWaiting: !row.isUser && waitingIDs.contains(attachment.url)
                ) {
                    previewing = attachment
                }
                .frame(maxWidth: 280)
            }

            ForEach(content.links) { card in
                LinkCardView(card: card)
                    .frame(maxWidth: 320)
            }

            ForEach(content.blocks) { block in
                BlockView(block: block, onOption: onOption) { previewing = $0 }
                    .frame(maxWidth: 340)
            }
        }
    }

    @ViewBuilder
    private func timeBelow(alignment: HorizontalAlignment) -> some View {
        if let time = timeLabel {
            Text(time)
                .font(.caption2.monospaced())
                .foregroundStyle(Theme.inkFaint)
                .frame(maxWidth: .infinity, alignment: alignment == .trailing ? .trailing : .leading)
        }
    }

    /// Phoenix time for everyone, like the web (America/Phoenix, no DST). A message's
    /// timestamp should be the same fact regardless of where the phone is standing,
    /// and older messages carry their date so a three-week-old row never reads as if
    /// it just arrived.
    private var timeLabel: String? {
        guard let date = row.date else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        let zone = TimeZone(identifier: "America/Phoenix") ?? .current
        calendar.timeZone = zone

        let formatter = DateFormatter()
        formatter.timeZone = zone
        if calendar.isDateInToday(date) {
            formatter.dateFormat = "h:mm a"
        } else {
            formatter.dateFormat = "MMM d, h:mm a"
        }
        return formatter.string(from: date)
    }

    static func attributed(_ raw: String) -> AttributedString {
        if let parsed = try? AttributedString(
            markdown: raw,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) {
            return parsed
        }
        return AttributedString(raw)
    }
}

// MARK: - Turn avatar

/// The 2-letter monogram beside an agent turn (room-row-contract §1 part 2: two
/// letters, uppercased, never a face). Tinted from the author name with the same
/// stable-hash palette the home timeline uses, so one agent keeps one colour across
/// both surfaces. `visible: false` collapses it to a clear 30pt spacer that keeps
/// grouped replies aligned under the first one's bubble.
private struct TurnAvatar: View {
    let name: String
    var visible: Bool = true

    private var glyph: String {
        let words = name.split(separator: " ")
        if words.count >= 2 { return String(words[0].prefix(1) + words[1].prefix(1)).uppercased() }
        return String(name.prefix(2)).uppercased()
    }

    var body: some View {
        Text(visible ? glyph : "")
            .font(.caption.weight(.bold))
            .foregroundStyle(Theme.tint(for: name))
            .frame(width: 30, height: 30)
            .background(
                visible ? Theme.raised : Color.clear,
                in: RoundedRectangle(cornerRadius: 9, style: .continuous)
            )
            .overlay {
                if visible {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(Theme.hairline, lineWidth: 1)
                }
            }
            .accessibilityHidden(true)
    }
}

// MARK: - Link card

/// Finished work lands as a tappable card, never as a bare URL buried in a sentence
/// (Patrik 2026-07-13).
struct LinkCardView: View {
    let card: LinkCard

    private var title: String { card.summary.isEmpty ? card.label : card.summary }

    var body: some View {
        Link(destination: card.url) {
            RaisedCard {
                HStack(spacing: Theme.s3) {
                    Image(systemName: "arrow.up.right.square")
                        .font(.title3)
                        .foregroundStyle(Theme.accent)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        // The host line is context for the title, not a second copy of
                        // it. A live-site artifact names itself by its domain, so the
                        // card was printing "ambition-mechanical.com" twice, one line
                        // under the other, which reads as a rendering bug.
                        if title.caseInsensitiveCompare(card.host) != .orderedSame {
                            Text(card.host)
                                .font(.caption2)
                                .foregroundStyle(Theme.inkFaint)
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Attachment card

/// A file in the thread. Images render as images; everything else gets a card with its
/// name, kind and size. Both open the same preview — a file card that only offered a
/// link would hand the user Safari and a download, which is the web's answer, not the
/// phone's.
struct AttachmentCardView: View {
    let attachment: Attachment
    var isWaiting: Bool = false
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            VStack(alignment: .leading, spacing: 0) {
                if attachment.kind == .photo {
                    thumbnail
                }
                caption
            }
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .strokeBorder(isWaiting ? Theme.warning.opacity(0.45) : Theme.hairline, lineWidth: 1)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(attachment.kind.label): \(attachment.name)")
    }

    /// The thumbnail loads straight off the same host the bytes come from, so a picture
    /// appears without waiting for a full download. Failure falls back to the file card
    /// rather than an empty frame: "this is a PNG called X and it did not load" is
    /// information; a grey rectangle is not.
    private var thumbnail: some View {
        AsyncImage(url: FileStore.sources(for: attachment).first?.url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFit()
            case .failure:
                HStack(spacing: Theme.s2) {
                    Image(systemName: "photo.badge.exclamationmark").foregroundStyle(Theme.warning)
                    Text("Preview didn't load — tap to open")
                        .font(.caption2)
                        .foregroundStyle(Theme.inkSoft)
                }
                .frame(maxWidth: .infinity, minHeight: 64)
                .padding(.vertical, Theme.s2)
            default:
                ZStack {
                    Theme.agentBubble
                    ProgressView().controlSize(.small)
                }
                .frame(height: 150)
            }
        }
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: Theme.cardRadius,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: 0,
                topTrailingRadius: Theme.cardRadius,
                style: .continuous
            )
        )
    }

    private var caption: some View {
        HStack(spacing: Theme.s2) {
            // The gutter is RESERVED even when there is no glyph. An image card needs
            // no icon — the picture above it is the icon — but dropping the column
            // moved its filename 18pt left of every other card's, and a stack of file
            // cards with two different left edges reads as a layout bug rather than a
            // decision.
            Group {
                if attachment.kind == .photo {
                    Color.clear
                } else {
                    Image(systemName: attachment.kind.symbol)
                        .font(.footnote)
                        .foregroundStyle(Theme.accent)
                }
            }
            .frame(width: 18)
            VStack(alignment: .leading, spacing: 1) {
                Text(attachment.name)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            if isWaiting {
                Text("Review")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Theme.warning)
            }
        }
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2 + 2)
    }

    private var subtitle: String {
        [attachment.kind.label, attachment.sizeLabel]
            .compactMap { $0 }
            .joined(separator: " · ")
    }
}
