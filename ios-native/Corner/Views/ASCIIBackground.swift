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
import UIKit

// MARK: - Glyph atlas (P005)
//
// The old field drew ~1500 live Text views per frame, and `sample` showed
// every one re-running CoreText typesetting plus software raster through
// RenderBox — that was the 56% CPU. Each ramp glyph is rasterized ONCE per
// tint into a tiny bitmap and cached; every frame after that is cheap image
// blits. Same typeface and size, same cell origins, same opacities — the
// field looks the same, it just stops re-typesetting itself 12 times a
// second. Plain CoreGraphics (not ImageRenderer) so the atlas has no actor
// requirements — Canvas may call it from any thread it draws on.
private final class GlyphAtlas {
    static let shared = GlyphAtlas()

    struct Set {
        let cream: [Image]
        let ember: [Image]
        let size: CGSize
    }

    private let lock = NSLock()
    private var cache: [String: Set] = [:]

    private init() {}

    func set(ramp: [String], uiFont: UIFont, ember: UIColor) -> Set {
        let key = Self.colorKey(ember)
        lock.lock()
        if let hit = cache[key] { lock.unlock(); return hit }
        lock.unlock()
        // 26 tiny renders, once, instead of ~1500 text draws per frame.
        var cream: [Image] = []
        var emberImgs: [Image] = []
        // One monospace font, so one probe gives the point size every blit
        // rect uses. Fallback keeps the old pitch box.
        var size = CGSize(width: 16, height: 18)
        for glyph in ramp {
            let (c, probe) = render(glyph, uiFont: uiFont, color: .white)
            let (e, _) = render(glyph, uiFont: uiFont, color: ember)
            if glyph != " ", let probe { size = probe }
            cream.append(c)
            emberImgs.append(e)
        }
        let set = Set(cream: cream, ember: emberImgs, size: size)
        lock.lock()
        cache[key] = set
        lock.unlock()
        return set
    }

    /// Rasterized image plus the point size its blit rects use (nil for the
    /// space glyph's empty bitmap — never drawn anyway).
    private func render(_ glyph: String, uiFont: UIFont, color: UIColor) -> (Image, CGSize?) {
        let attrs: [NSAttributedString.Key: Any] = [.font: uiFont, .foregroundColor: color]
        let str = NSAttributedString(string: glyph, attributes: attrs)
        var box = str.boundingRect(
            with: CGSize(width: 64, height: 64),
            options: [.usesLineFragmentOrigin, .usesFontLeading], context: nil
        )
        box.origin = .zero
        box.size.width = ceil(box.size.width)
        box.size.height = ceil(box.size.height)
        guard box.size.width >= 1, box.size.height >= 1 else {
            return (Image(uiImage: UIImage()), nil)
        }
        let renderer = UIGraphicsImageRenderer(size: box.size)
        let ui = renderer.image { _ in
            str.draw(at: .zero)
        }
        return (Image(uiImage: ui), ui.size)
    }

    private static func colorKey(_ c: UIColor) -> String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        if c.getRed(&r, green: &g, blue: &b, alpha: &a) {
            return String(format: "%.3f,%.3f,%.3f,%.3f", r, g, b, a)
        }
        return String(describing: c)
    }
}

struct ASCIIBackground: View {
    /// The ember tint riding the wave crests. The login passes its own emerald;
    /// anything else defaults to the product accent. (The original bronze-gold is
    /// gone with the AOM branding — R4.)
    var ember: Color = Theme.accent

    // Sparse ASCII ramp, light to heavy. Space-weighted so the field breathes
    // instead of reading as a solid wall of characters.
    private static let ramp: [Character] = Array("  ..::-=+*oO#")
    private let cell: CGFloat = 15          // glyph pitch in points
    private let font = Font.system(size: 13, weight: .semibold, design: .monospaced)

    /// P005: 12 fps is plenty for a slow drift (the noise terms move at
    /// 0.4–0.9 rad/s, so a frame step shifts the field by a fraction of a
    /// cell — it still visibly flows) and cuts full-screen CoreText raster
    /// work to roughly a fifth of the old every-display-refresh cadence.
    private static let frameInterval = 1.0 / 12.0

    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// The field only moves while the scene is frontmost. Backgrounded (or a
    /// Reduce Motion user, or the screen tour) gets one static frame — the
    /// same field at a fixed instant — so the main thread idles.
    private var isStatic: Bool {
        Config.screenTour || reduceMotion || scenePhase != .active
    }

    var body: some View {
        Group {
            if isStatic {
                // One static frame: the same field at a fixed instant, no
                // timeline, so the main thread idles.
                Canvas { ctx, size in
                    drawField(ctx: &ctx, size: size, t: 1.0)
                }
            } else {
                TimelineView(.periodic(from: .now, by: Self.frameInterval)) { timeline in
                    Canvas { ctx, size in
                        // Seconds since an arbitrary epoch; only deltas matter, so the
                        // Date.now here is fine (this file never runs in a workflow).
                        drawField(ctx: &ctx, size: size, t: timeline.date.timeIntervalSinceReferenceDate)
                    }
                    // No .drawingGroup(): frames are cheap blits now, and an
                    // off-screen flatten per frame cost more than it saved.
                }
            }
        }
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

    /// The field rasterizer, shared by the animated timeline and the static
    /// screen-tour frame.
    private func drawField(ctx: inout GraphicsContext, size: CGSize, t: Double) {
        let cols = Int(size.width / cell) + 1
        let rows = Int(size.height / cell) + 1
        let cx = Double(cols) * 0.5
        let cy = Double(rows) * 0.42   // optical center, biased up toward the wordmark

        // P005: blit pre-rasterized glyphs (see GlyphAtlas) instead of
        // drawing live Text per cell — no CoreText work left in the loop.
        // (UIFont mirrors the SwiftUI font above: 13pt semibold SF Mono.)
        let atlas = GlyphAtlas.shared.set(
            ramp: Self.ramp.map(String.init),
            uiFont: .monospacedSystemFont(ofSize: 13, weight: .semibold),
            ember: UIColor(ember)
        )

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

                // Bronze embers ride the wave CRESTS; everything else is cream.
                //
                // The old test gated gold on `level` (= v·gather), so a glyph only
                // turned gold where a wave crest AND the radial gather peak landed
                // on the same cell — and that peak sits directly under the form's
                // centre scrim, so the rare ember that did appear was smothered. Gold
                // was effectively never on screen. Here gold rides `v` (the crest,
                // which peaks all across the field every frame) with only a light
                // centre bias, so the warm glyphs gather toward the wordmark without
                // needing the exact hot-spot the scrim covers. The band is narrow
                // (top crests only) so cream still owns the field, and the opacity
                // floor is lifted to 0.32 so each ember reads through the scrim
                // instead of dissolving into it. `glow` fades an ember UP from that
                // floor to a confident crest so it is a scatter, never a gold slab.
                let goldScore = v + gather * 0.28
                let rect = CGRect(origin: pt, size: atlas.size)
                if goldScore > 1.05 {
                    let glow = min(1, (goldScore - 1.05) * 5)
                    ctx.opacity = 0.32 + glow * 0.44
                    ctx.draw(atlas.ember[idx], in: rect)
                } else {
                    ctx.opacity = 0.05 + level * 0.16
                    ctx.draw(atlas.cream[idx], in: rect)
                }
            }
        }
    }
}
