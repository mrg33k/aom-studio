// BlockView.swift — Corner native iOS
// corner:native-ios Stage 1
//
// `metadata.blocks` rendering, minimum viable — and the fallback is the feature.
//
// The full vocabulary in blockSchema.js is sixteen kinds deep and several of them
// (data tables with charts, galleries, email cards, audio waveforms) are real screens
// of their own; those land in Stage 2/4. What Stage 1 guarantees is that NO block
// renders as nothing:
//
//   - the handful with an obvious phone form get one (step, success, snag, summary,
//     code, artifact, thinking, and the option-bearing kinds)
//   - every other kind — including kinds invented after this binary shipped — falls
//     through to a card that names what it is and shows whatever human-readable text
//     it carries
//
// The alternative, rendering only recognised kinds, means an agent emitting a `data`
// block produces a blank bubble on the phone while the web shows a table, and the
// user cannot tell whether the agent said nothing or the app dropped it. This is the
// difference between an app that degrades and an app that lies.

import SwiftUI

struct BlockView: View {
    let block: MessageBlock
    var onOption: (String) -> Void = { _ in }
    /// Opening an image or a file from inside a block goes through the SAME preview a
    /// thread attachment opens. A block with its own viewer would drift from it within
    /// one round of changes.
    var onOpenFile: (Attachment) -> Void = { _ in }

    var body: some View {
        switch block.kind {
        case "step":                      stepBlock
        case "success":                   calloutBlock(icon: "checkmark.circle.fill", tint: Theme.accent, defaultTitle: "Done")
        case "snag":                      calloutBlock(icon: "exclamationmark.triangle.fill", tint: Theme.warning, defaultTitle: "Snag")
        case "summary":                   summaryBlock
        case "code":                      codeBlock
        case "artifact":                  artifactBlock
        case "gallery":                   galleryBlock
        case "email":                     emailBlock
        case "thinking":                  thinkingBlock
        case "question", "choice", "replies", "confirm", "choiceecho":
                                          optionsBlock
        default:                          fallbackBlock
        }
    }

    // MARK: - Known kinds

    private var stepBlock: some View {
        HStack(alignment: .top, spacing: Theme.s2) {
            Image(systemName: stepSymbol)
                .font(.hkFootnote)
                .foregroundStyle(block.state == "done" ? Theme.accent : Theme.inkFaint)
                .frame(width: 16)
            VStack(alignment: .leading, spacing: 2) {
                Text(block.title ?? "Step")
                    .font(.hkFootnote.weight(.medium))
                    .foregroundStyle(block.state == "done" ? Theme.inkSoft : Theme.ink)
                if let detail = block.detail {
                    Text(detail).font(.hkCaption2).foregroundStyle(Theme.inkFaint)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.leading, Theme.s1)
    }

    private var stepSymbol: String {
        switch block.state {
        case "done":              return "checkmark.circle.fill"
        case "active", "working": return "circle.dotted"
        default:                  return "circle"
        }
    }

    private func calloutBlock(icon: String, tint: Color, defaultTitle: String) -> some View {
        RaisedCard(tint: tint.opacity(0.35)) {
            HStack(alignment: .top, spacing: Theme.s2) {
                Image(systemName: icon).foregroundStyle(tint)
                VStack(alignment: .leading, spacing: 2) {
                    Text(block.title ?? defaultTitle)
                        .font(.hkFootnote.weight(.semibold))
                        .foregroundStyle(Theme.ink)
                    if let detail = block.detail {
                        Text(detail).font(.hkCaption).foregroundStyle(Theme.inkSoft)
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var summaryBlock: some View {
        RaisedCard {
            VStack(alignment: .leading, spacing: Theme.s2) {
                if let title = block.title {
                    Text(title).font(.hkFootnote.weight(.semibold)).foregroundStyle(Theme.ink)
                }
                // The bullet list is ONE object, so its lines sit tighter than the gaps
                // between the card's parts. Spacing them on the same step as
                // title-to-body makes three points read as three separate statements.
                VStack(alignment: .leading, spacing: Theme.s1 + 2) {
                    ForEach(Array(block.bullets.enumerated()), id: \.offset) { _, line in
                        // Baseline alignment, and the bullet carries the SAME font as
                        // the line. Top-aligning a default-size bullet against caption
                        // text drops the mark down to the descender — the metrics have
                        // to match or the rhythm never sits.
                        HStack(alignment: .firstTextBaseline, spacing: Theme.s2) {
                            Text("•")
                                .font(.hkCaption)
                                .foregroundStyle(Theme.accent)
                            Text(line)
                                .font(.hkCaption)
                                .foregroundStyle(Theme.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                if block.bullets.isEmpty, let detail = block.detail {
                    Text(detail).font(.hkCaption).foregroundStyle(Theme.inkSoft)
                }
                optionChips
            }
        }
    }

    private var codeBlock: some View {
        RaisedCard {
            VStack(alignment: .leading, spacing: Theme.s2) {
                if let file = block.title {
                    Text(file).font(.hkCaption2.monospaced()).foregroundStyle(Theme.inkFaint)
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    Text(block.code ?? block.detail ?? "")
                        .font(.hkCaption.monospaced())
                        .foregroundStyle(Theme.ink)
                        .textSelection(.enabled)
                }
            }
        }
    }

    /// A screenshot renders as the screenshot; a live-site card stays a link. The kind
    /// field decides, and a `live` artifact is never treated as an image no matter what
    /// its URL ends in.
    @ViewBuilder
    private var artifactBlock: some View {
        if block.artifactIsImage, let attachment = block.asAttachment {
            AttachmentCardView(attachment: attachment) { onOpenFile(attachment) }
        } else if let url = block.url {
            LinkCardView(card: LinkCard(url: url, summary: block.title ?? "Open"))
        } else {
            fallbackBlock
        }
    }

    /// The gallery. One image renders full width; several tile in a grid, because a
    /// column of full-width photos turns a six-image delivery into six screens of
    /// scrolling and the point of a gallery is seeing them together.
    @ViewBuilder
    private var galleryBlock: some View {
        let images = block.images
        if images.isEmpty {
            fallbackBlock
        } else if images.count == 1, let only = images.first {
            VStack(alignment: .leading, spacing: Theme.s1) {
                AttachmentCardView(attachment: only) { onOpenFile(only) }
                galleryCaption
            }
        } else {
            VStack(alignment: .leading, spacing: Theme.s2) {
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 92), spacing: Theme.s2)],
                    spacing: Theme.s2
                ) {
                    ForEach(images) { image in
                        Button { onOpenFile(image) } label: {
                            GalleryTile(attachment: image)
                        }
                        .buttonStyle(.plain)
                    }
                }
                galleryCaption
            }
        }
    }

    @ViewBuilder
    private var galleryCaption: some View {
        if let caption = block.caption, !caption.isEmpty {
            Text(caption)
                .font(.hkCaption2)
                .foregroundStyle(Theme.inkFaint)
        }
    }

    /// An email surfaced in chat. Its attachments are real files and open like any
    /// other; rendering the card without them was how "the email had a PDF" turned into
    /// a sentence about a PDF nobody could reach.
    private var emailBlock: some View {
        RaisedCard {
            VStack(alignment: .leading, spacing: Theme.s2) {
                HStack(spacing: Theme.s2) {
                    Image(systemName: "envelope").font(.hkCaption).foregroundStyle(Theme.accent)
                    Text(block.raw["from"]?.stringValue ?? "Email")
                        .font(.hkCaption.weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                if let subject = block.raw["subject"]?.stringValue, !subject.isEmpty {
                    Text(subject).font(.hkFootnote.weight(.medium)).foregroundStyle(Theme.ink)
                }
                if let quote = block.raw["quote"]?.stringValue, !quote.isEmpty {
                    Text(quote)
                        .font(.hkCaption)
                        .foregroundStyle(Theme.inkSoft)
                        .lineLimit(6)
                }
                ForEach(emailAttachments) { file in
                    Button { onOpenFile(file) } label: {
                        HStack(spacing: Theme.s2) {
                            Image(systemName: file.kind.symbol).font(.hkCaption2).foregroundStyle(Theme.accent)
                            Text(file.name).font(.hkCaption).foregroundStyle(Theme.ink).lineLimit(1)
                            Spacer(minLength: 0)
                        }
                    }
                    .buttonStyle(.plain)
                }
                optionChips
            }
        }
    }

    private var emailAttachments: [Attachment] {
        (block.raw["attachments"]?.arrayValue ?? []).compactMap { item in
            let url = item["url"]?.stringValue ?? ""
            guard !url.isEmpty else { return nil }
            let name = item["name"]?.stringValue ?? Attachment.displayName(from: url)
            return Attachment(url: url, name: name, mime: "", size: 0, gateStatus: "")
        }
    }

    private var thinkingBlock: some View {
        HStack(spacing: Theme.s2) {
            Image(systemName: "ellipsis.bubble").font(.hkCaption)
            Text(block.title ?? block.detail ?? "Thinking")
                .font(.hkCaption.italic())
        }
        .foregroundStyle(Theme.inkFaint)
    }

    private var optionsBlock: some View {
        RaisedCard {
            VStack(alignment: .leading, spacing: Theme.s2) {
                if let prompt = block.title ?? block.detail {
                    Text(prompt).font(.hkFootnote).foregroundStyle(Theme.ink)
                }
                optionChips
            }
        }
    }

    /// Tapping an option DRAFTS it into the composer rather than sending it. The web
    /// fires a structured choice reply; this build does not own that payload shape yet,
    /// and a chip that sends the wrong thing is worse than one that types the right
    /// thing and lets the user press send.
    @ViewBuilder
    private var optionChips: some View {
        if !block.options.isEmpty {
            FlowLayout(spacing: Theme.s2) {
                ForEach(Array(block.options.enumerated()), id: \.offset) { _, label in
                    Button {
                        onOption(label)
                    } label: {
                        Text(label)
                            .font(.hkCaption.weight(.medium))
                            .padding(.horizontal, Theme.s3)
                            .padding(.vertical, 6)
                            .background(Theme.ground, in: Capsule())
                            .overlay(Capsule().strokeBorder(Theme.accent.opacity(0.5), lineWidth: 1))
                            .foregroundStyle(Theme.accent)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - The fallback

    /// Everything else, including kinds that did not exist when this binary was built.
    private var fallbackBlock: some View {
        RaisedCard {
            VStack(alignment: .leading, spacing: Theme.s2) {
                HStack(spacing: Theme.s2) {
                    Image(systemName: BlockView.kindSymbol(block.kind))
                        .font(.hkCaption)
                        .foregroundStyle(Theme.inkSoft)
                    Text(BlockView.kindLabel(block.kind))
                        .font(.hkCaption2.weight(.semibold))
                        .textCase(.uppercase)
                        .foregroundStyle(Theme.inkFaint)
                    Spacer(minLength: 0)
                }
                if let title = block.title {
                    Text(title).font(.hkFootnote.weight(.semibold)).foregroundStyle(Theme.ink)
                }
                if let detail = block.detail {
                    Text(detail).font(.hkCaption).foregroundStyle(Theme.inkSoft).lineLimit(6)
                }
                if let rows = block.rowCount {
                    Text(rows == 1 ? "1 row" : "\(rows) rows")
                        .font(.hkCaption2).foregroundStyle(Theme.inkFaint)
                }
                if block.title == nil && block.detail == nil {
                    Text("Open Corner on the web to see this.")
                        .font(.hkCaption).foregroundStyle(Theme.inkSoft)
                }
                optionChips
            }
        }
    }

    private static func kindLabel(_ kind: String) -> String {
        switch kind {
        case "data":     return "Table"
        case "email":    return "Email"
        case "gallery":  return "Photos"
        case "audio":    return "Voice note"
        case "video":    return "Video"
        default:         return Room.prettify(kind)
        }
    }

    /// The glyph carries the kind. Repeating one meaningless icon on every fallback
    /// card is noise, and it also erases a distinction that matters to the user: a
    /// KNOWN kind this build simply has no screen for yet ("there is a table here, go
    /// look at it on the web") is a different message from a kind this build has never
    /// heard of, which keeps the dashed square.
    static func kindSymbol(_ kind: String) -> String {
        switch kind {
        case "data":    return "tablecells"
        case "email":   return "envelope"
        case "gallery": return "photo.on.rectangle"
        case "audio":   return "waveform"
        case "video":   return "play.rectangle"
        default:        return "square.on.square.dashed"
        }
    }
}

// MARK: - Gallery tile

/// A square tile in a gallery grid. Square on purpose: a grid of images at their natural
/// aspect ratios is a ragged wall, and the tap target is a preview anyway.
///
/// The tile FILLS its grid cell rather than sitting at a fixed 92pt inside it. A fixed
/// width inside an adaptive column gets centred in a wider cell, which put ~41pt of air
/// between tiles whose stated spacing is 8 — five different gaps in one grid, and the
/// caption underneath no longer lining up with the first column.
struct GalleryTile: View {
    let attachment: Attachment

    var body: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                AsyncImage(url: FileStore.sources(for: attachment).first?.url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        ZStack {
                            Theme.agentBubble
                            Image(systemName: "photo.badge.exclamationmark")
                                .font(.hkCaption)
                                .foregroundStyle(Theme.inkFaint)
                        }
                    default:
                        ZStack {
                            Theme.agentBubble
                            ProgressView().controlSize(.small)
                        }
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(Theme.hairline, lineWidth: 1)
            )
            .accessibilityLabel(attachment.name)
    }
}

// MARK: - Flow layout

/// Chips wrap to the next line instead of clipping or forcing a horizontal scroll.
/// Small enough to own; a dependency for this would be silly.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, lineHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += lineHeight + spacing
                lineHeight = 0
            }
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
        return CGSize(width: maxWidth == .infinity ? x : maxWidth, height: y + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, lineHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += lineHeight + spacing
                lineHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
    }
}
