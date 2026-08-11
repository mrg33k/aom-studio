// Typography.swift — Corner native iOS
// corner:native-ios R4 — Hanken Grotesk, the product's one voice.
//
// CV6 web ships Hanken Grotesk on every surface; the phone bundles the same
// family (variable TTF, OFL) so the brand reads identically in a browser and
// on the springboard. These constants mirror the system text styles the views
// already speak — same optical sizes, same Dynamic Type anchors — so a call
// site changes eleven characters, not its layout math. Weight chains
// (`.hkFootnote.weight(.semibold)`) keep working: the constants carry no
// weight of their own except headline, whose system default IS semibold.

import SwiftUI
import UIKit

extension Font {
    /// Hanken at an explicit size — for the few deliberate pixel-metric sites
    /// (chips, wordmarks) that don't ride a system text style.
    static func hanken(_ size: CGFloat, relativeTo style: Font.TextStyle = .body) -> Font {
        .custom("Hanken Grotesk", size: size, relativeTo: style)
    }

    static let hkLargeTitle = hanken(34, relativeTo: .largeTitle)
    static let hkTitle = hanken(28, relativeTo: .title)
    static let hkTitle2 = hanken(22, relativeTo: .title2)
    static let hkTitle3 = hanken(20, relativeTo: .title3)
    static let hkHeadline = hanken(17, relativeTo: .headline).weight(.semibold)
    static let hkBody = hanken(17, relativeTo: .body)
    static let hkCallout = hanken(16, relativeTo: .callout)
    static let hkSubheadline = hanken(15, relativeTo: .subheadline)
    static let hkFootnote = hanken(13, relativeTo: .footnote)
    static let hkCaption = hanken(12, relativeTo: .caption)
    static let hkCaption2 = hanken(11, relativeTo: .caption2)
}

enum CornerTypography {
    /// Hand the navigation bar the brand face too — SwiftUI's `.font` never
    /// reaches UIKit's title labels. Called once at app start.
    static func install() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        if let large = UIFont(name: "HankenGrotesk-Bold", size: 32) {
            appearance.largeTitleTextAttributes = [.font: large]
        }
        if let inline = UIFont(name: "HankenGrotesk-SemiBold", size: 17) {
            appearance.titleTextAttributes = [.font: inline]
        }
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }
}
