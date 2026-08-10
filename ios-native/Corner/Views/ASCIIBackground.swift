// ASCIIBackground.swift — Corner native iOS
// corner:native-ios — the living login backdrop
//
// A real-time ASCII flow field, not a video file. Rendered every frame with
// TimelineView(.animation) + Canvas, so it is a few KB of code instead of a
// multi-MB asset, stays crisp at any point size, and paints true black on OLED.
//
// DESIGN INTENT (creative-brief in miniature):
//   belief   — Corner is a machine that never sleeps; the first screen should
//              feel like looking INTO a live system, not at a static form.
//   emotion  — alive.
//   direction— cream glyphs drifting on obsidian along a slow flow field, with
//              occasional bronze-gold embers where the current peaks, the density
//              gathering toward a suggested "C" and dissolving. Comprehension
//              first (rule 8): everything sits at low alpha so the form on top of
//              it stays the hero — decoration never out-shouts the input.
//
// The motion is a cheap analytic pseudo-noise (layered sines), NOT a particle
// system: deterministic, allocation-free per frame, and it costs the GPU almost
// nothing. No third-party dependency.

import SwiftUI

struct ASCIIBackground: View {
    // Sparse ASCII ramp, light to heavy. Space-weighted so the field breathes
    // instead of reading as a solid wall of characters.
    private static let ramp: [Character] = Array("  ..::-=+*oO#")
    private let cell: CGFloat = 15          // glyph pitch in points
    private let font = Font.system(size: 13, weight: .semibold, design: .monospaced)

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { ctx, size in
                // Seconds since an arbitrary epoch; only deltas matter, so the
                // Date.now here is fine (this file never runs in a workflow).
                let t = timeline.date.timeIntervalSinceReferenceDate
                let cols = Int(size.width / cell) + 1
                let rows = Int(size.height / cell) + 1
                let cx = Double(cols) * 0.5
                let cy = Double(rows) * 0.42   // optical center, biased up toward the wordmark

                let resolved = Self.ramp.map {
                    ctx.resolve(Text(String($0)).font(font))
                }

                for r in 0..<rows {
                    for c in 0..<cols {
                        let x = Double(c), y = Double(r)

                        // Layered sine "noise" scrolling in two directions — the
                        // flow field. Cheap, smooth, and seamless over time.
                        let n =
                            sin(x * 0.28 + t * 0.70) +
                            sin(y * 0.34 - t * 0.55) +
                            sin((x + y) * 0.18 + t * 0.40) +
                            sin(hypot(x - cx, y - cy) * 0.30 - t * 0.90)
                        let v = (n + 4) / 8            // → 0...1

                        // A soft radial well biases density toward center: the
                        // current "gathers" rather than filling the frame evenly.
                        let d = hypot(x - cx, y - cy) / Double(max(cols, rows))
                        let gather = max(0, 1 - d * 1.6)
                        let level = v * (0.55 + gather * 0.75)

                        var idx = Int(level * Double(Self.ramp.count))
                        idx = min(max(idx, 0), Self.ramp.count - 1)
                        if idx == 0 { continue }        // space → skip the draw entirely

                        let pt = CGPoint(x: Double(c) * cell, y: Double(r) * cell)

                        // Bronze embers ride the crest of the wave; everything else
                        // is cream. Both kept low-alpha so the login stays legible.
                        if level > 1.18 {
                            let glow = min(1, (level - 1.18) * 3)
                            ctx.opacity = 0.16 + glow * 0.5
                            ctx.draw(ctx.resolve(Text(String(Self.ramp[idx]))
                                .font(font).foregroundStyle(Theme.accent)), at: pt, anchor: .topLeading)
                        } else {
                            ctx.opacity = 0.05 + level * 0.16
                            ctx.draw(resolved[idx], at: pt, anchor: .topLeading)
                        }
                    }
                }
            }
            .drawingGroup()                 // render off-screen on the GPU
        }
        .background(Theme.ground)
        .ignoresSafeArea()
        // A top-to-bottom fade keeps the composer/keyboard zone calm and pushes
        // the busiest part of the field up behind the wordmark.
        .mask(
            LinearGradient(
                colors: [.black, .black.opacity(0.85), .black.opacity(0.35)],
                startPoint: .top, endPoint: .bottom
            )
        )
        .accessibilityHidden(true)          // pure decoration; VoiceOver skips it
    }
}
