// AgentColor.swift — Corner native iOS
// corner:native-ios Convex backend (BRIEF 04)
//
// Agent color map copied from the web `lib/agents.ts` (web/lib/agents.ts).
// The existing `AgentColors` enum in Theme.swift already maps slugs to
// Color values; this enum provides the hex-string map exactly as the brief
// specifies so web and native share the same source-of-truth palette.

import Foundation

enum AgentColor {
    static let colors: [String: String] = [
        "creative": "#2DD4BF",
        "web": "#4ADE80",
        "content": "#22D3EE",
        "design": "#F472B6",
        "operations": "#FBBF24",
        "systems": "#A78BFA",
        "assistant": "#8B5CF6",
        "outreach": "#FACC15",
        "social": "#34D399",
        "strategy": "#60A5FA",
        "research": "#818CF8",
        "corner": "#E5E7EB",
    ]

    /// Hex string for an agent slug or title (case-insensitive).
    static func hex(for key: String) -> String? {
        colors[key.lowercased()]
    }
}
