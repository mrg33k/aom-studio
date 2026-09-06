// ConvexAuthTests.swift — Corner native iOS
// corner:corner-v2 native Task 2 (transport safety gate)
//
// Proves the refresh discipline BEFORE any v2 UI depends on it: concurrent
// callers share one in-flight refresh (the refresh token is single-use, so a
// second POST with the same token fails), and a definitive rejection signs the
// device out instead of leaving it half-signed-in. Runs against the in-memory
// keychain and a stub refresh client — no Keychain writes, no network.

import XCTest
@testable import Corner

@MainActor
final class ConvexAuthTests: XCTestCase {

    // MARK: - Plan Task 2, Step 1

    func testConcurrentAuthorizedRequestsUseOneRefresh() async throws {
        let auth = ConvexAuth(keychain: .memory, refreshClient: .singleUseSuccess)
        auth.save(.expired)
        async let first = auth.validSession()
        async let second = auth.validSession()
        let (a, b) = try await (first, second)
        XCTAssertEqual(auth.refreshCallCount, 1, "one shared refresh for the whole storm")
        XCTAssertEqual(a.accessToken, b.accessToken, "both callers share the rotated session")
    }

    // MARK: - Brief additions

    /// Audit H3, second half: a rejected refresh used to leave the session in the
    /// Keychain while every call failed. Now the rejection clears the stored
    /// session and surfaces as not-signed-in, which is what drives RootView back
    /// to the sign-in screen.
    func testRefreshRejectionClearsKeychainAndThrowsNotSignedIn() async {
        let auth = ConvexAuth(keychain: .memory, refreshClient: .rejected)
        auth.save(.expired)
        do {
            _ = try await auth.validSession()
            XCTFail("a rejected refresh must throw")
        } catch {
            XCTAssertEqual(error as? AuthError, .notSignedIn)
        }
        XCTAssertNil(auth.load(), "the rejected session must be cleared")
    }

    /// A session that is still good needs no refresh at all.
    func testFreshSessionReturnsWithoutRefreshing() async throws {
        let auth = ConvexAuth(keychain: .memory, refreshClient: .singleUseSuccess)
        let fresh = AuthSession.valid
        auth.save(fresh)
        let resolved = try await auth.validSession()
        XCTAssertEqual(resolved.accessToken, fresh.accessToken)
        XCTAssertEqual(auth.refreshCallCount, 0)
    }
}
