// DebugAuth.swift — DEBUG-only session hand-off for the simulator walk rig.
// corner:native-ios
//
// corner://debug-auth?access_token=...&refresh_token=... installs a session in
// this build without a password ever touching the device: the walk rig mints a
// one-time link server-side (service key, owner-authorized), exchanges it for
// tokens, and hands them to the running simulator via this URL.
//
// The ENTIRE file body is #if DEBUG — a Release/store binary compiles to an
// empty file and contains no trace of this route. RootView consults this
// handler first and only in Debug; the AppRouter never learns the route exists.
#if DEBUG
import Foundation

enum DebugAuth {
    /// Returns true when the URL was a debug-auth hand-off. Failure is loud in
    /// the console — a walk rig that fails silently wastes a whole capture run.
    @MainActor
    static func handle(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == Config.urlScheme,
              url.host?.lowercased() == "debug-auth",
              let comps = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let access = comps.queryItems?.first(where: { $0.name == "access_token" })?.value,
              let refresh = comps.queryItems?.first(where: { $0.name == "refresh_token" })?.value,
              !access.isEmpty, !refresh.isEmpty
        else { return false }
        Task {
            do {
                _ = try await CornerAPI.shared.client.auth.setSession(
                    accessToken: access,
                    refreshToken: refresh
                )
                print("[DebugAuth] session installed")
            } catch {
                print("[DebugAuth] setSession failed: \(error)")
            }
        }
        return true
    }
}
#endif
