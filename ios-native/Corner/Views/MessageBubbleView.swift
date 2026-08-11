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
    /// Measured natural height of the prose text (set on first appear by the ghost overlay).
    /// Starts at 0 so no clamp fires before measurement; updates atomically on main thread.
    @State private var naturalProseHeight: CGFloat = 0
    /// True once the user has tapped "Show more" to expand a clamped bubble.
    @State private var proseExpanded: Bool = false
    /// The height threshold past which prose is clamped — ~8 body lines at 20pt/line.
    private static let clampThreshold: CGFloat = 168

    private var content: MessageContent { MessageContent.build(from: row) }

    /// Machine plumbing wearing a chat bubble is noise (Patrik 2026-08-11): probes,
    /// dispatcher receipts, session-restart stamps. Same classifier as the preview
    /// hygiene — the row stays visible, but as a quiet system line, not a voice.
    private var isSystemNoise: Bool {
        let c = content
        guard c.attachments.isEmpty, c.links.isEmpty, c.blocks.isEmpty else { return false }
        return !c.prose.isEmpty && RoomPreview.isMachine(c.prose)
    }

    /// The scheduler's self-check-in rows ("[FOLLOWUP TRIGGER — …]"). Visible on
    /// purpose — Patrik wants to SEE the agent checking in on itself — but as a
    /// small centered chip, not a full user bubble shouting machine text.
    private var isFollowupTrigger: Bool {
        row.isUser && RoomPreview.isFollowupTrigger(row.text ?? "")
    }

    var body: some View {
        let content = self.content
        Group {
            if isFollowupTrigger {
                followupChip
            } else if isSystemNoise {
                Text(content.prose)
                    .font(.hkCaption2)
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 2)
                    .textSelection(.enabled)
            } else if row.isUser {
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
                                .font(.hkSubheadline.weight(.semibold))
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

    /// The self-check-in, rendered the size it deserves: one small centered chip —
    /// glyph + "Checked in · time" — no bubble, no avatar, no machine text. A run of
    /// consecutive triggers naturally stacks as a quiet column of chips.
    private var followupChip: some View {
        HStack(spacing: 5) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 10, weight: .medium))
            Text(timeLabel.map { "Checked in · \($0)" } ?? "Checked in")
                .font(.hkCaption2.weight(.medium))
        }
        .foregroundStyle(Theme.inkFaint)
        .padding(.horizontal, 10)
        .frame(height: 22)
        .background(Theme.chipFill, in: Capsule())
        .overlay(Capsule().strokeBorder(Theme.hairline, lineWidth: 1))
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.vertical, 2)
        .accessibilityLabel("The agent checked in on schedule")
    }

    /// The bubble (or the "cannot display" fallback) plus every renderable payload the
    /// row carries — files, link cards, blocks — in the shared order.
    @ViewBuilder
    private func payload(_ content: MessageContent, alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: Theme.s2) {
            if !content.prose.isEmpty {
                // Clamp tall messages at ~168pt with a bottom fade, matching the
                // web's show-more pattern. naturalProseHeight starts at 0 so the
                // bubble renders unclamped; the hidden measurement ghost fires on
                // first appear and sets the real height, clamping on re-render.
                let needsClamp = naturalProseHeight > MessageBubbleView.clampThreshold
                let isCollapsed = needsClamp && !proseExpanded

                VStack(alignment: alignment, spacing: 0) {
                // The web's .cv6-mob-bubble pair, verbatim: user = accent fill +
                // white ink + a 4pt tail at the bottom-trailing corner; agent =
                // surface-2 + hairline + the tail at the top-leading corner.
                Text(MessageBubbleView.attributed(content.prose))
                    .font(.hkBody)
                    .foregroundStyle(row.isUser ? Theme.userBubbleInk : Theme.ink)
                    .padding(.horizontal, Theme.s4)
                    .padding(.vertical, 10)
                    .frame(maxHeight: isCollapsed ? MessageBubbleView.clampThreshold : .infinity,
                           alignment: .topLeading)
                    .clipped()
                    .background(
                        row.isUser ? Theme.userBubble : Theme.agentBubble,
                        in: MessageBubbleView.bubbleShape(user: row.isUser)
                    )
                    .overlay {
                        if !row.isUser {
                            MessageBubbleView.bubbleShape(user: false)
                                .strokeBorder(Theme.hairline, lineWidth: 1)
                        }
                        // Fade gradient at the bottom edge when clamped.
                        // allowsHitTesting(false) so text selection still works.
                        if isCollapsed {
                            VStack(spacing: 0) {
                                Spacer()
                                LinearGradient(
                                    colors: [
                                        .clear,
                                        (row.isUser ? Theme.userBubble : Theme.agentBubble)
                                            .opacity(0.96)
                                    ],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                                .frame(height: 52)
                            }
                            .clipShape(MessageBubbleView.bubbleShape(user: row.isUser))
                            .allowsHitTesting(false)
                        }
                    }
                    .textSelection(.enabled)
                    .contextMenu {
                        Button {
                            UIPasteboard.general.string = content.prose
                        } label: {
                            Label("Copy", systemImage: "doc.on.doc")
                        }
                    }
                    // ── Height measurement ghost ─────────────────────────────
                    // A hidden, fixedSize copy of the text sits in an overlay so
                    // it can report its natural (unclamped) height. fixedSize
                    // overrides the parent's 168pt proposal, giving the embedded
                    // GeometryReader the full text height instead of the clamped
                    // frame height. Fires once per bubble appearance; invisible.
                    .overlay(alignment: .topLeading) {
                        Text(MessageBubbleView.attributed(content.prose))
                            .font(.hkBody)
                            .padding(.horizontal, Theme.s4)
                            .padding(.vertical, 10)
                            .fixedSize(horizontal: false, vertical: true)
                            .opacity(0)
                            .allowsHitTesting(false)
                            .background(
                                GeometryReader { geo in
                                    Color.clear.onAppear {
                                        let h = geo.size.height
                                        if naturalProseHeight != h { naturalProseHeight = h }
                                    }
                                }
                            )
                    }

                // "Show more / Show less" sits below the bubble, not inside it,
                // so the tap target is always reachable regardless of clamp state.
                if needsClamp {
                    Button {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            proseExpanded.toggle()
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(proseExpanded ? "Show less" : "Show more")
                            Image(systemName: proseExpanded ? "chevron.up" : "chevron.down")
                                .imageScale(.small)
                        }
                        .font(.hkCaption.weight(.semibold))
                        .foregroundStyle(Theme.accent)
                    }
                    .padding(.top, Theme.s1)
                }
                }
            } else if content.isEmpty {
                // A row with no text and no renderable payload is not blank by
                // intent — it is something this build cannot show. Say that rather
                // than render an empty bubble the user reads as a bug.
                Text("Nothing this version can display")
                    .font(.hkFootnote)
                    .foregroundStyle(Theme.inkFaint)
                    .padding(.horizontal, Theme.s3)
                    .padding(.vertical, Theme.s2)
                    .background(Theme.agentBubble, in: MessageBubbleView.bubbleShape(user: false))
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
                .font(.hkCaption2.monospaced())
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

    /// The web bubble's corner geometry: 18pt rounds with one 4pt "tail" corner —
    /// bottom-trailing on the user's side, top-leading on the agent's.
    static func bubbleShape(user: Bool) -> UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            topLeadingRadius: user ? Theme.bubbleRadius : Theme.bubbleTail,
            bottomLeadingRadius: Theme.bubbleRadius,
            bottomTrailingRadius: user ? Theme.bubbleTail : Theme.bubbleRadius,
            topTrailingRadius: Theme.bubbleRadius,
            style: .continuous
        )
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
            .font(.hkCaption.weight(.bold))
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
                        .font(.hkTitle3)
                        .foregroundStyle(Theme.accent)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.hkFootnote.weight(.semibold))
                            .foregroundStyle(Theme.ink)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        // The host line is context for the title, not a second copy of
                        // it. A live-site artifact names itself by its domain, so the
                        // card was printing "ambition-mechanical.com" twice, one line
                        // under the other, which reads as a rendering bug.
                        if title.caseInsensitiveCompare(card.host) != .orderedSame {
                            Text(card.host)
                                .font(.hkCaption2)
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
                        .font(.hkCaption2)
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
                        .font(.hkFootnote)
                        .foregroundStyle(Theme.accent)
                }
            }
            .frame(width: 18)
            VStack(alignment: .leading, spacing: 1) {
                Text(attachment.name)
                    .font(.hkCaption.weight(.medium))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text(subtitle)
                    .font(.hkCaption2)
                    .foregroundStyle(Theme.inkFaint)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            if isWaiting {
                Text("Review")
                    .font(.hkCaption2.weight(.semibold))
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
