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
}

@MainActor
final class ConvexAuth {
    static let shared = ConvexAuth()

    private let keychainService = "com.aheadofmarket.corner.session"
    private let keychainAccount = "convex"

    // MARK: - Keychain

    func load() -> AuthSession? {
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

    func save(_ session: AuthSession?) {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
        ]
        SecItemDelete(base as CFDictionary)
        guard let session, let data = try? JSONEncoder().encode(session) else { return }
        var add = base
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
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

    /// A token that is good for at least another minute, refreshing if needed.
    func validSession(_ session: AuthSession) async throws -> AuthSession {
        if let exp = ConvexAuth.expiry(of: session.accessToken), exp > Date().addingTimeInterval(60) {
            return session
        }
        return try await refresh(session)
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
