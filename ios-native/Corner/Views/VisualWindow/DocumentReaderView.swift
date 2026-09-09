// DocumentReaderView.swift — Corner native iOS
// corner:corner-v2 R59 (Patrik phone review 2026-09-08).
//
// The phone's document reader. Documents used to route to QuickLook, which
// on an extension-less markdown file rendered the generic "can't preview"
// placeholder — the artifact id over the word "data" (Patrik's #3: "files
// don't load"). This renders the file's text for real: a clean big-text
// reader in the Dracula palette (no line numbers, no raw syntax), with an
// Alucard light toggle — the same reader the desktop shipped (R55/R57).
//
// HTML documents render in a sandboxed WKWebView (raw tags would be noise);
// everything else parses as markdown blocks. Load logic mirrors
// CodeArtifactView: file URLs read off disk, remote URLs fetch once, capped.

import SwiftUI
import WebKit

/// The reader palette: Dracula (dark) by default, Alucard (light) on toggle.
private struct ReaderPalette {
    let ground: Color
    let ink: Color
    let inkSoft: Color
    let accent: Color
    let rule: Color
    let codeBG: Color

    static let dracula = ReaderPalette(
        ground: Color(cv6: 0x282A36),
        ink: Color(cv6: 0xF8F8F2),
        inkSoft: Color(cv6: 0xBDC0CF),
        accent: Color(cv6: 0xBD93F9),
        rule: Color.white.opacity(0.10),
        codeBG: Color(cv6: 0x21222C)
    )

    static let alucard = ReaderPalette(
        ground: Color(cv6: 0xFFFBEB),
        ink: Color(cv6: 0x1F1F1F),
        inkSoft: Color(cv6: 0x555555),
        accent: Color(cv6: 0x7B4CD6),
        rule: Color.black.opacity(0.10),
        codeBG: Color(cv6: 0xF3EFDD)
    )
}

struct DocumentReaderView: View {
    let url: URL
    var title: String = ""

    @State private var text: String?
    @State private var truncated = false
    @State private var failed = false
    @State private var light = false

    private static let maximumBytes = 600_000

    private var palette: ReaderPalette { light ? .alucard : .dracula }

    var body: some View {
        Group {
            if failed {
                ErrorArtifactView(
                    title: title,
                    message: "This document's text could not be read.",
                    onRetry: { Task { await load() } }
                )
            } else if let text {
                reader(text)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .task { await load() }
            }
        }
    }

    @ViewBuilder
    private func reader(_ text: String) -> some View {
        if DocumentText.looksLikeHTML(text) {
            // Raw HTML tags read as noise — render the page itself.
            ReaderHTMLView(html: text, baseURL: url)
                .accessibilityIdentifier("visual-stage-document")
        } else {
            ZStack(alignment: .topTrailing) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        if truncated {
                            Text("Showing the first \(Self.maximumBytes / 1000)KB of a longer document.")
                                .font(.hanken(11))
                                .foregroundStyle(Theme.warning)
                        }
                        ForEach(Array(DocumentMarkdown.blocks(from: text).enumerated()), id: \.offset) { _, block in
                            blockView(block)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 22)
                    .padding(.top, 18)
                    .padding(.bottom, 40)
                }
                .background(palette.ground)
                .accessibilityIdentifier("visual-stage-document")

                // The Dracula ⇄ Alucard toggle, top-right (desktop parity).
                Button {
                    light.toggle()
                } label: {
                    Image(systemName: light ? "moon.stars.fill" : "sun.max.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(palette.inkSoft)
                        .frame(width: 32, height: 32)
                        .background(palette.codeBG, in: Circle())
                        .overlay(Circle().strokeBorder(palette.rule, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .padding(10)
                .accessibilityIdentifier("reader-theme-toggle")
                .accessibilityLabel(light ? "Switch to dark reader" : "Switch to light reader")
            }
        }
    }

    @ViewBuilder
    private func blockView(_ block: DocumentMarkdown.Block) -> some View {
        switch block {
        case .heading(let level, let raw):
            Text(MessageBubbleView.attributed(raw))
                .font(.hanken(level == 1 ? 26 : level == 2 ? 21 : 18).weight(.bold))
                .foregroundStyle(palette.ink)
                .padding(.top, level == 1 ? 6 : 2)
        case .paragraph(let raw):
            Text(MessageBubbleView.attributed(raw))
                .font(.hanken(16.5))
                .lineSpacing(6)
                .foregroundStyle(palette.ink)
                .tint(palette.accent)
        case .bullet(let raw):
            HStack(alignment: .top, spacing: 10) {
                Text("•")
                    .font(.hanken(16.5).weight(.bold))
                    .foregroundStyle(palette.accent)
                Text(MessageBubbleView.attributed(raw))
                    .font(.hanken(16.5))
                    .lineSpacing(6)
                    .foregroundStyle(palette.ink)
                    .tint(palette.accent)
            }
        case .numbered(let number, let raw):
            HStack(alignment: .top, spacing: 10) {
                Text("\(number).")
                    .font(.hanken(16.5).weight(.semibold))
                    .foregroundStyle(palette.accent)
                    .frame(minWidth: 22, alignment: .trailing)
                Text(MessageBubbleView.attributed(raw))
                    .font(.hanken(16.5))
                    .lineSpacing(6)
                    .foregroundStyle(palette.ink)
                    .tint(palette.accent)
            }
        case .quote(let raw):
            HStack(spacing: 12) {
                Rectangle().fill(palette.accent).frame(width: 3)
                Text(MessageBubbleView.attributed(raw))
                    .font(.hanken(16.5))
                    .lineSpacing(6)
                    .foregroundStyle(palette.inkSoft)
            }
        case .code(let body):
            Text(body)
                .font(.system(size: 13.5, design: .monospaced))
                .foregroundStyle(palette.ink)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(palette.codeBG, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        case .rule:
            Rectangle().fill(palette.rule).frame(height: 1).padding(.vertical, 2)
        }
    }

    private func load() async {
        failed = false
        let target = url
        let limit = Self.maximumBytes
        let result: (String, Bool)? = await Task.detached(priority: .userInitiated) {
            let data: Data
            if target.isFileURL {
                guard let read = try? Data(contentsOf: target, options: .mappedIfSafe) else { return nil }
                data = read
            } else {
                guard let (fetched, _) = try? await URLSession.shared.data(from: target) else { return nil }
                data = fetched
            }
            let clipped = data.count > limit
            let slice = clipped ? data.prefix(limit) : data.prefix(data.count)
            guard let decoded = String(data: slice, encoding: .utf8) ?? String(data: slice, encoding: .isoLatin1) else { return nil }
            return (decoded, clipped)
        }.value
        guard let result else {
            failed = true
            return
        }
        text = result.0
        truncated = result.1
    }
}

/// Content sniffing kept pure so a unit test can pin the HTML-vs-markdown
/// decision without a view or a network round trip.
enum DocumentText {
    static func looksLikeHTML(_ raw: String) -> Bool {
        let head = raw.prefix(2000).lowercased()
        if head.contains("<!doctype html") || head.contains("<html") { return true }
        // A markdown file can carry the odd inline tag; require real page
        // structure, not a stray `<br>`.
        let markers = ["<body", "<head", "<div", "<section", "<main", "<article"]
        return markers.contains { head.contains($0) }
    }
}

/// A minimal, dependency-free block parser: headings, bullets, numbered
/// items, blockquotes, fenced code, rules, paragraphs. Inline emphasis is
/// left to `MessageBubbleView.attributed`. Pure and testable.
enum DocumentMarkdown {
    enum Block: Equatable {
        case heading(level: Int, text: String)
        case paragraph(String)
        case bullet(String)
        case numbered(Int, String)
        case quote(String)
        case code(String)
        case rule
    }

    static func blocks(from raw: String) -> [Block] {
        var blocks: [Block] = []
        var paragraph: [String] = []
        var inFence = false
        var fence: [String] = []

        func flushParagraph() {
            let joined = paragraph.joined(separator: " ").trimmingCharacters(in: .whitespaces)
            if !joined.isEmpty { blocks.append(.paragraph(joined)) }
            paragraph.removeAll()
        }

        for line in raw.replacingOccurrences(of: "\r\n", with: "\n").split(separator: "\n", omittingEmptySubsequences: false).map(String.init) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if trimmed.hasPrefix("```") {
                if inFence {
                    blocks.append(.code(fence.joined(separator: "\n")))
                    fence.removeAll()
                    inFence = false
                } else {
                    flushParagraph()
                    inFence = true
                }
                continue
            }
            if inFence { fence.append(line); continue }

            if trimmed.isEmpty { flushParagraph(); continue }

            if trimmed == "---" || trimmed == "***" || trimmed == "___" {
                flushParagraph(); blocks.append(.rule); continue
            }
            if let hashes = headingLevel(trimmed) {
                flushParagraph()
                let body = String(trimmed.drop(while: { $0 == "#" })).trimmingCharacters(in: .whitespaces)
                blocks.append(.heading(level: hashes, text: body))
                continue
            }
            if trimmed.hasPrefix("> ") || trimmed == ">" {
                flushParagraph()
                blocks.append(.quote(String(trimmed.dropFirst(trimmed.hasPrefix("> ") ? 2 : 1))))
                continue
            }
            if let (n, rest) = numberedItem(trimmed) {
                flushParagraph(); blocks.append(.numbered(n, rest)); continue
            }
            if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") || trimmed.hasPrefix("+ ") {
                flushParagraph(); blocks.append(.bullet(String(trimmed.dropFirst(2)))); continue
            }

            paragraph.append(trimmed)
        }
        if inFence, !fence.isEmpty { blocks.append(.code(fence.joined(separator: "\n"))) }
        flushParagraph()
        return blocks
    }

    private static func headingLevel(_ line: String) -> Int? {
        guard line.hasPrefix("#") else { return nil }
        let hashes = line.prefix(while: { $0 == "#" }).count
        guard hashes <= 6, line.dropFirst(hashes).hasPrefix(" ") else { return nil }
        return hashes
    }

    private static func numberedItem(_ line: String) -> (Int, String)? {
        // "1. text" / "12) text"
        var digits = ""
        var idx = line.startIndex
        while idx < line.endIndex, line[idx].isNumber { digits.append(line[idx]); idx = line.index(after: idx) }
        guard !digits.isEmpty, idx < line.endIndex else { return nil }
        let sep = line[idx]
        guard sep == "." || sep == ")" else { return nil }
        let after = line.index(after: idx)
        guard after < line.endIndex, line[after] == " ", let n = Int(digits) else { return nil }
        return (n, String(line[line.index(after: after)...]))
    }
}

/// A sandboxed WKWebView for HTML documents — nothing persists, no page
/// navigation away from the loaded string.
private struct ReaderHTMLView: UIViewRepresentable {
    let html: String
    let baseURL: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.backgroundColor = .clear
        view.loadHTMLString(html, baseURL: baseURL)
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}
}
