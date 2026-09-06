// ThemeCompMatchTests.swift — Corner native iOS
// corner:corner-v2 R17 (P025–P028 + the §2 colours that already matched).
//
// The v2 design tokens, locked at the source: every HANDOFF §2 hex the
// phone export paints must equal the dark palette entry the app reads.
// The UI suite proves the paint; this proves the numbers.

import SwiftUI
import XCTest
@testable import Corner

@MainActor
final class ThemeCompMatchTests: XCTestCase {
    private func rgb(_ color: Color) -> (r: CGFloat, g: CGFloat, b: CGFloat, a: CGFloat) {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(color).getRed(&r, green: &g, blue: &b, alpha: &a)
        return (r * 255, g * 255, b * 255, a)
    }

    private func expect(_ color: Color, _ want: (CGFloat, CGFloat, CGFloat), file: StaticString = #filePath, line: UInt = #line) {
        let got = rgb(color)
        XCTAssertEqual(got.r, want.0, accuracy: 2, "red", file: file, line: line)
        XCTAssertEqual(got.g, want.1, accuracy: 2, "green", file: file, line: line)
        XCTAssertEqual(got.b, want.2, accuracy: 2, "blue", file: file, line: line)
    }

    func testGroundIsMidnight() { expect(ThemePalette.dark.ground, (15, 19, 25)) }
    func testSurface() { expect(ThemePalette.dark.raised, (22, 27, 35)) }
    func testSurface2() { expect(ThemePalette.dark.raised2, (29, 36, 48)) }
    func testAccent() { expect(ThemePalette.dark.accent, (91, 155, 255)) }
    func testInk() { expect(ThemePalette.dark.ink, (233, 233, 236)) }
    func testMuted() { expect(ThemePalette.dark.inkSoft, (154, 154, 162)) }
    func testFaint() { expect(ThemePalette.dark.inkFaint, (98, 98, 107)) }
    func testSuccess() { expect(ThemePalette.dark.success, (52, 211, 153)) }
    func testWarning() { expect(ThemePalette.dark.warning, (251, 191, 36)) }

    func testDividerAlpha() {
        XCTAssertEqual(rgb(ThemePalette.dark.divider).a, 0.075, accuracy: 0.005)
    }

    func testChipFillAlpha() {
        XCTAssertEqual(rgb(ThemePalette.dark.chipFill).a, 0.06, accuracy: 0.005)
    }

    func testAccentWeakIsAccentAt16() {
        let solid = rgb(ThemePalette.dark.accent)
        let weak = rgb(ThemePalette.dark.accentWeak)
        XCTAssertEqual(weak.a, 0.16, accuracy: 0.01)
        XCTAssertEqual(weak.r, solid.r, accuracy: 2)
        XCTAssertEqual(weak.g, solid.g, accuracy: 2)
        XCTAssertEqual(weak.b, solid.b, accuracy: 2)
    }
}
