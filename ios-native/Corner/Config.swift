// Config.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Everything in this file is client-safe by construction. There is no API key in
// this target at all: identity is the Convex JWT the user gets at sign-in
// (ConvexAuth.swift), and every privileged read or write goes through a Convex
// function or an /api/* route that verifies that token server-side.
//
// NO SERVICE KEY OF ANY KIND MAY APPEAR HERE, OR ANYWHERE ELSE IN THIS TARGET.

import Foundation

enum Config {
    /// The Corner API origin. `www.` on purpose: the bare-domain redirect can strip
    /// the Authorization header off a URLSession request, which reads as a 401 that
    /// has nothing to do with the session (the same trap nativeBootstrap.js documents).
    static let apiOrigin = URL(string: "https://www.aheadofmarket.com")!

    /// Stamped on every row this app writes so native traffic is identifiable in
    /// `messages` (the web sends "corner-dashboard").
    static let messageSource = "corner-native-ios"

    /// The custom URL scheme APNs payloads deep-link with (`corner://room/<id>`).
    static let urlScheme = "corner"

    /// How long a turn may be completely silent — no new step, no reply — before the
    /// hard "still quiet" notice appears. Ten minutes, because 180s is provably wrong
    /// for real turns: live rows show step gaps of 5m55s and 18m30s on turns that
    /// finished fine, so a three-minute countdown was calling healthy work dead. The
    /// soft `quietTurnThreshold` below covers the "say something sooner" job.
    static let deadTurnBackstop: TimeInterval = 600

    /// Step silence before the working indicator adds a soft "nothing new for a few
    /// minutes" line — the web's recoverable needs-attention notice, not a verdict.
    /// Polling continues and the line clears itself the moment anything arrives.
    static let quietTurnThreshold: TimeInterval = 180

    /// Reconcile cadence under realtime. Realtime is an accelerator, never the
    /// guarantee — this poll is what makes a dropped socket invisible to the user.
    static let reconcileInterval: TimeInterval = 10

    /// Live-step cadence while a turn is running.
    static let stepPollInterval: TimeInterval = 1.5

    /// Steward cadence while a turn is open — GET /api/dashboard/room-health, the
    /// web's 10s. The steward is what lets the room say "needs you" or "stuck" with
    /// a server fact behind the word instead of a countdown.
    static let stewardPollInterval: TimeInterval = 10

    /// How long after send before the steward's read becomes ONE repair ask (POST).
    /// The web's 45s: the same endpoint the auto-repair uses; a human tap just asks
    /// sooner. One ask per turn — repair is not a retry loop.
    static let stewardRepairAfter: TimeInterval = 45

    /// A turn accepted with no step after this long is a quiet room WAKING, and the
    /// indicator should say that instead of cycling thinking phrases over dead air.
    static let wakingThreshold: TimeInterval = 8

    /// How long "Stopping…" may stand unconfirmed before the app says so. The
    /// bridge's watcher owns the durable stopped row and can take ~10s; past this
    /// the control reverts with an honest "couldn't confirm" line instead of a
    /// button that sits disabled forever (the web shipped without this timeout —
    /// its own decision record names it as the defect to fix in any port).
    static let stopConfirmTimeout: TimeInterval = 15

    /// Streaming reveal cadence (R18 N3). Network chunks arrive in bursts; the
    /// visible text drains from a buffer at a steady tick instead — the steady
    /// cadence IS the smoothness (per-chunk repaints are the stutter). ~30Hz with
    /// ~7 chars per tick ≈ 200 chars/s, the industry default; when the backlog
    /// tops `streamCatchupThreshold` the drain accelerates so the reveal never
    /// falls more than about half a second behind the wire.
    static let streamRevealInterval: TimeInterval = 1.0 / 30.0
    static let streamRevealChars = 7
    static let streamCatchupThreshold = 400

    /// Short marketing version + build, read from the bundle for the device row.
    static var appVersion: String {
        let short = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
        return "\(short) (\(build))"
    }

    static var bundleID: String {
        Bundle.main.bundleIdentifier ?? "com.aheadofmarket.corner"
    }

    /// Convex deployment — same backend the web app uses. The iOS app talks to
    /// Convex via raw HTTP (api/query + api/mutation) without an SDK dependency.
    static let convexURL = URL(string: "https://neat-pony-216.convex.cloud")!

    /// Feature flag to switch between direct Convex calls (true) and the /api/*
    /// routes (false). When true, RoomStore and ChatViewModel use ConvexService;
    /// when false they go through the Vercel routes, which now read Convex too.
    static let useConvex = true

    /// Unit tests use fake transports and must not reach the live data plane. UI
    /// acceptance launches the real app on a simulator and opts back in explicitly;
    /// treating every process with an XCTest configuration as a unit test made the
    /// supposedly Convex acceptance silently exercise the retired fallback instead.
    static var suppressLiveBackendsForTests: Bool {
        ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil
            && ProcessInfo.processInfo.environment["UITEST_REAL_BACKEND"] != "1"
    }

    /// Screen-tour gate (R0b). The tour launches the app with `-screenTour`;
    /// ambient animation (ASCIIBackground, repeatForever pulses) freezes so the
    /// main thread idles for XCUITest snapshots. Real users never pass it.
    static let screenTour = ProcessInfo.processInfo.arguments.contains("-screenTour")

    /// Which APNs environment this binary's tokens belong to. It must agree with the
    /// `aps-environment` entitlement (development in Debug, production in Release) —
    /// a sandbox token offered to the production APNs host is rejected as
    /// BadDeviceToken and the row gets pruned, which looks exactly like "push is
    /// broken" while nothing is broken at all.
    static var apnsEnvironment: String {
        #if DEBUG
        return "sandbox"
        #else
        return "production"
        #endif
    }
}
