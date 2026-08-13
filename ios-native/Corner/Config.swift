// Config.swift — Corner native iOS
// corner:native-ios Stage 1
//
// Everything in this file is client-safe by construction. The Supabase anon key
// is the same publishable key the web bundle already ships (role "anon", exp
// 2089); RLS is what protects the data — an anon key on its own reads nothing
// from `messages` (verified live via REST 2026-08-09).
//
// THE SERVICE ROLE KEY MUST NEVER APPEAR HERE, OR ANYWHERE ELSE IN THIS TARGET.
// Every privileged read and write goes through an /api/* route that holds the
// service key server-side and derives identity from the caller's JWT.

import Foundation

enum Config {
    /// Supabase project — the same one the web dashboard uses.
    static let supabaseURL = URL(string: "https://mcngatprgluexjjcqpkp.supabase.co")!

    /// Client-safe anon (publishable) key.
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjU3MTUsImV4cCI6MjA4OTQwMTcxNX0.Rgn57thbT_kZf-PEvcS1ix4l8CTO1fwz0I2t589hSd8"

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

    /// Short marketing version + build, read from the bundle for the device row.
    static var appVersion: String {
        let short = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
        return "\(short) (\(build))"
    }

    static var bundleID: String {
        Bundle.main.bundleIdentifier ?? "com.aheadofmarket.corner"
    }

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
