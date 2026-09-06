// ConvexAuth.swift — Corner native iOS
// corner:retire-supabase R3 (2026-09-03)
//
// Sign-in on Convex, no Supabase. The deployment runs @convex-dev/auth with the
// Password provider; this file is the phone side of it:
//
//   signIn(email, password)  -> action auth:signIn  {provider:"password", params:{email,password,flow:"signIn"}}
//   refresh(session)         -> action auth:signIn  {refreshToken}
//   viewer(token)            -> query  users:viewer {}  (Authorization: Bearer <token>)
//   changePassword(...)      -> action auth:changePassword {newPassword}
//   signOut(session)         -> action auth:signOut
//
// The session (tokens + the viewer row) lives in the Keychain. Every /api/* call
// the app makes to aheadofmarket.com sends the Convex JWT as its Bearer token; the
// Vercel routes verify it against the deployment's JWKS. Nothing here ever holds
// a service key.

import Foundation
import Security

struct AuthUser: Codable, Equatable {
    var id: String
    var email: String?
    var name: String?
    var world: String?
    var worldId: String?
    var worldName: String?
    var role: String?
    var isAdmin: Bool
    var mustChangePassword: Bool
    var initials: String?
    var color: String?
    var avatarUrl: String?
}

struct AuthSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var user: AuthUser
}

enum ConvexAuthError: LocalizedError {
    case badCredentials
    case signedOut
    case server(String)

    var errorDescription: String? {
        switch self {
        case .badCredentials: return "That email and password did not match an account."
        case .signedOut: return "You are signed out."
        case .server(let m): return m.isEmpty ? "The sign-in server did not answer." : m
        }
    }

    /// A definitive rejection: the server will never accept this session again,
    /// so the device must sign out rather than retry. Anything else (a timeout,
    /// a 500, airplane mode) is transient and must NOT clear the session.
    var isDefinitiveRejection: Bool {
        switch self {
        case .badCredentials, .signedOut: return true
        case .server: return false
        }
    }
}

/// What a failed gate throws when there is no usable session. Distinct from
/// `ConvexAuthError` (which describes the sign-in/refresh exchange itself) so
/// callers can map "not signed in" without parsing messages.
enum AuthError: Error, Equatable {
    case notSignedIn
}

@MainActor
final class ConvexAuth {
    static let shared = ConvexAuth()

    /// Where sessions persist. Production uses the system Keychain; tests use
    /// `.memory` so no test ever touches the device Keychain.
    enum KeychainMode {
        case system
        case memory
    }

    /// The refresh operation. `live` performs the real network refresh; tests
    /// inject a stub. `nil` run == live.
    struct RefreshClient {
        var run: ((AuthSession) async throws -> AuthSession)?
        static var live: RefreshClient { RefreshClient(run: nil) }
    }

    private let keychainMode: KeychainMode
    private let refreshClient: RefreshClient
    private var memorySession: AuthSession?

    /// How many refreshes actually started. Concurrent `validSession()` callers
    /// share one in-flight task, so a storm of polls still costs one refresh.
    private(set) var refreshCallCount = 0

    /// The one in-flight refresh, shared by every concurrent caller. The refresh
    /// token is single-use: two POSTs with the same token race and the second
    /// fails, so this memoization is load-bearing, not an optimization.
    private var refreshTask: Task<AuthSession, Error>?
    private var refreshTaskToken: String?

    init(keychain: KeychainMode = .system, refreshClient: RefreshClient = .live) {
        self.keychainMode = keychain
        self.refreshClient = refreshClient
    }

    private let keychainService = "com.aheadofmarket.corner.session"
    private let keychainAccount = "convex"

    // MARK: - Keychain

    func load() -> AuthSession? {
        if keychainMode == .memory { return memorySession }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let session = try? JSONDecoder().decode(AuthSession.self, from: data) else { return nil }
        return session
    }

    /// Atomic replacement: a single Update when the item exists, Add only when
    /// absent. The old Delete-then-Add left a window with no session at all.
    func save(_ session: AuthSession?) {
        if keychainMode == .memory {
            memorySession = session
            return
        }
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
        ]
        guard let session, let data = try? JSONEncoder().encode(session) else {
            if session == nil { SecItemDelete(base as CFDictionary) }
            return
        }
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        if SecItemUpdate(base as CFDictionary, attributes as CFDictionary) == errSecItemNotFound {
            var add = base
            add[kSecValueData as String] = data
            add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            SecItemAdd(add as CFDictionary, nil)
        }
    }

    // MARK: - Calls

    func signIn(email: String, password: String) async throws -> AuthSession {
        let value = try await call("action", path: "auth:signIn", args: [
            "provider": "password",
            "params": ["email": email, "password": password, "flow": "signIn"],
        ])
        guard let tokens = value["tokens"] as? [String: Any],
              let token = tokens["token"] as? String,
              let refresh = tokens["refreshToken"] as? String else {
            throw ConvexAuthError.badCredentials
        }
        let user = try await viewer(token: token)
        let session = AuthSession(accessToken: token, refreshToken: refresh, user: user)
        save(session)
        return session
    }

    func refresh(_ session: AuthSession) async throws -> AuthSession {
        let value = try await call("action", path: "auth:signIn", args: ["refreshToken": session.refreshToken])
        guard let tokens = value["tokens"] as? [String: Any],
              let token = tokens["token"] as? String,
              let refresh = tokens["refreshToken"] as? String else {
            throw ConvexAuthError.signedOut
        }
        var next = session
        next.accessToken = token
        next.refreshToken = refresh
        if let user = try? await viewer(token: token) { next.user = user }
        save(next)
        return next
    }

    func viewer(token: String) async throws -> AuthUser {
        let v = try await call("query", path: "users:viewer", args: [:], token: token)
        guard let id = v["userId"] as? String else { throw ConvexAuthError.signedOut }
        return AuthUser(
            id: id,
            email: v["email"] as? String,
            name: v["name"] as? String,
            world: (v["worldSlug"] as? String)?.lowercased(),
            worldId: v["worldId"] as? String,
            worldName: v["worldName"] as? String,
            role: v["role"] as? String,
            isAdmin: v["isAdmin"] as? Bool ?? false,
            mustChangePassword: v["mustChangePassword"] as? Bool ?? false,
            initials: v["initials"] as? String,
            color: v["color"] as? String,
            avatarUrl: v["avatarUrl"] as? String
        )
    }

    /// Re-read the viewer row (after a profile save) and persist it.
    func refreshViewer(_ session: AuthSession) async -> AuthSession {
        guard let user = try? await viewer(token: session.accessToken) else { return session }
        var next = session
        next.user = user
        save(next)
        return next
    }

    func changePassword(session: AuthSession, newPassword: String, currentPassword: String? = nil) async throws {
        var args: [String: Any] = ["newPassword": newPassword]
        if let currentPassword, !currentPassword.isEmpty { args["currentPassword"] = currentPassword }
        _ = try await call("action", path: "auth:changePassword", args: args, token: session.accessToken)
    }

    func signOut(_ session: AuthSession?) async {
        if let session {
            _ = try? await call("action", path: "auth:signOut", args: [:], token: session.accessToken)
        }
        save(nil)
    }

    /// The stored session, refreshed when it is about to expire. Concurrent
    /// callers share one in-flight refresh; a definitive rejection clears the
    /// stored session and throws `AuthError.notSignedIn`.
    func validSession() async throws -> AuthSession {
        guard let current = load() else { throw AuthError.notSignedIn }
        if let exp = ConvexAuth.expiry(of: current.accessToken), exp > Date().addingTimeInterval(60) {
            return current
        }
        do {
            return try await memoizedRefresh(base: current)
        } catch let rejection as ConvexAuthError where rejection.isDefinitiveRejection {
            save(nil)
            throw AuthError.notSignedIn
        }
    }

    /// A token that is good for at least another minute, refreshing if needed.
    /// Shares the same single in-flight refresh as `validSession()`; errors keep
    /// their original type so existing callers' mapping does not change.
    func validSession(_ session: AuthSession) async throws -> AuthSession {
        if let exp = ConvexAuth.expiry(of: session.accessToken), exp > Date().addingTimeInterval(60) {
            return session
        }
        return try await memoizedRefresh(base: session)
    }

    /// One refresh per refresh token, no matter how many callers arrive together.
    private func memoizedRefresh(base: AuthSession) async throws -> AuthSession {
        if let task = refreshTask, refreshTaskToken == base.refreshToken {
            return try await task.value
        }
        let task = Task<AuthSession, Error> { try await refreshAndPersist(base: base) }
        refreshTask = task
        refreshTaskToken = base.refreshToken
        defer {
            if refreshTaskToken == base.refreshToken {
                refreshTask = nil
                refreshTaskToken = nil
            }
        }
        return try await task.value
    }

    private func refreshAndPersist(base: AuthSession) async throws -> AuthSession {
        refreshCallCount += 1
        if let run = refreshClient.run {
            let next = try await run(base)
            save(next)
            return next
        }
        return try await refresh(base)
    }

    // MARK: - Transport

    private func call(_ kind: String, path: String, args: [String: Any], token: String? = nil) async throws -> [String: Any] {
        var request = URLRequest(url: Config.convexURL.appendingPathComponent("api/\(kind)"))
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["path": path, "args": args, "format": "json"])
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let body = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        guard (200..<300).contains(status), (body["status"] as? String) == "success" else {
            let message = (body["errorMessage"] as? String) ?? ""
            if message.localizedCaseInsensitiveContains("invalid") || message.localizedCaseInsensitiveContains("password") {
                throw ConvexAuthError.badCredentials
            }
            throw ConvexAuthError.server(message)
        }
        if let dict = body["value"] as? [String: Any] { return dict }
        return [:]
    }

    static func expiry(of jwt: String) -> Date? {
        let parts = jwt.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload += "=" }
        guard let data = Data(base64Encoded: payload),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = obj["exp"] as? Double else { return nil }
        return Date(timeIntervalSince1970: exp)
    }
}
