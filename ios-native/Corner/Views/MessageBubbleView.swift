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

struct MessageBubbleView: View {
    let row: MessageRow
    var onOption: (String) -> Void = { _ in }

    private var content: MessageContent { MessageContent.build(from: row) }

    var body: some View {
        let content = self.content
        HStack {
            if row.isUser { Spacer(minLength: 44) }

            VStack(alignment: row.isUser ? .trailing : .leading, spacing: Theme.s2) {
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

                if let url = content.attachmentURL {
                    AttachmentView(url: url, isImage: content.attachmentIsImage)
                        .frame(maxWidth: 280)
                }

                ForEach(content.links) { card in
                    LinkCardView(card: card)
                        .frame(maxWidth: 320)
                }

                ForEach(content.blocks) { block in
                    BlockView(block: block, onOption: onOption)
                        .frame(maxWidth: 340)
                }

                metaLine
            }

            if !row.isUser { Spacer(minLength: 44) }
        }
    }

    private var metaLine: some View {
        HStack(spacing: Theme.s1 + 2) {
            Text(row.displayName)
            if let time = timeLabel {
                Text("·")
                Text(time)
            }
        }
        .font(.caption2)
        .foregroundStyle(Theme.inkFaint)
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

// MARK: - Link card

/// Finished work lands as a tappable card, never as a bare URL buried in a sentence
/// (Patrik 2026-07-13).
struct LinkCardView: View {
    let card: LinkCard

    var body: some View {
        Link(destination: card.url) {
            RaisedCard {
                HStack(spacing: Theme.s3) {
                    Image(systemName: "arrow.up.right.square")
                        .font(.title3)
                        .foregroundStyle(Theme.accent)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(card.summary.isEmpty ? card.label : card.summary)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Text(card.host)
                            .font(.caption2)
                            .foregroundStyle(Theme.inkFaint)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Attachment

struct AttachmentView: View {
    let url: URL
    let isImage: Bool

    var body: some View {
        if isImage {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFit()
                case .failure:
                    fileChip(label: "Image could not be loaded", system: "photo.badge.exclamationmark")
                default:
                    ZStack {
                        Theme.raised
                        ProgressView().controlSize(.small)
                    }
                    .frame(height: 160)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        } else {
            Link(destination: url) {
                fileChip(label: url.lastPathComponent, system: "doc")
            }
            .buttonStyle(.plain)
        }
    }

    private func fileChip(label: String, system: String) -> some View {
        RaisedCard {
            Label(label, systemImage: system)
                .font(.footnote)
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
        }
    }
}
