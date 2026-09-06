import XCTest
@testable import Corner

/// Native plan Task 4, Step 1: the hierarchy store routes intake through the
/// v2 API. Presets come from the backend fixture (see `FakeRoute`), so the
/// ids always match the contract.
@MainActor
final class WorkspaceStoreTests: XCTestCase {

    func testOneOffMessageRoutesToGeneralProjectWithoutProjectPicker() async throws {
        let fixture = try Fixture.loadNativeFixture()
        let api = CornerV2APIFake(route: .proposedGeneralMission)
        let store = WorkspaceStore(api: api)
        let route = try await store.sendIntake("Summarize this invoice")
        XCTAssertEqual(route.project.id, fixture.workspace.generalProjectID)
        XCTAssertFalse(route.needsClarification)
        XCTAssertTrue(route.needsCreationConfirmation)
    }

    func testLowConfidenceRouteRequestsConfirmation() async throws {
        let api = CornerV2APIFake(route: .ambiguousAsterOrNorthwind)
        let store = WorkspaceStore(api: api)
        let route = try await store.sendIntake("Make a launch plan")
        XCTAssertTrue(route.needsClarification)
    }

    func testRefreshEnsuresWorkspaceOnceThenLoadsTree() async throws {
        let fixture = try Fixture.loadNativeFixture()
        let api = CornerV2APIFake(route: .proposedGeneralMission)
        var ensureCalls = 0
        api.ensureWorkspaceHandler = {
            ensureCalls += 1
            return EnsureWorkspaceResult(
                workspaceId: fixture.workspace.id,
                generalProjectId: fixture.workspace.generalProjectID,
                generalThreadId: "thread-general-1"
            )
        }
        let store = WorkspaceStore(api: api)
        await store.refresh()
        await store.refresh()
        XCTAssertEqual(ensureCalls, 1, "ensureWorkspace runs once per sign-in, then reads subscribe")
        XCTAssertEqual(store.workspace?.projects.filter { $0.kind == .general }.count, 1)
    }

    func testSendMentionsReachTheFakeAsRoutingMetadata() async throws {
        let api = CornerV2APIFake(route: .proposedGeneralMission)
        let store = WorkspaceStore(api: api)
        _ = try await store.sendIntake("@research find competitors")
        XCTAssertEqual(api.sentMentions.last ?? [], ["research"])
    }

    func testUnconfiguredOperationThrows() async throws {
        let api = CornerV2APIFake()
        let store = WorkspaceStore(api: api)
        do {
            _ = try await store.sendIntake("hello")
            XCTFail("an unconfigured fake operation must throw")
        } catch {
            XCTAssertEqual(error as? CornerV2APIError, .unconfiguredFakeOperation)
        }
    }

    func testRejectedSessionSignsOutInsteadOfShowingAnErrorTree() async throws {
        // A token minted by another deployment: ensureWorkspace is refused.
        let api = CornerV2APIFake(route: .proposedGeneralMission)
        api.ensureWorkspaceHandler = { throw ConvexServiceError.server("Not signed in") }
        let store = WorkspaceStore(api: api)
        var signedOut = 0
        store.onSessionRejected = { signedOut += 1 }
        await store.refresh()
        await store.refresh()
        XCTAssertEqual(signedOut, 1, "one sign-out per rejected session, not one per refresh")
        XCTAssertNil(store.errorText, "a rejected session is sign-in, never an error tree")
        XCTAssertNil(store.workspace)
        XCTAssertTrue(WorkspaceStore.isSessionRejection(AuthError.notSignedIn))
        XCTAssertTrue(WorkspaceStore.isSessionRejection(ConvexServiceError.http(401, "")))
        XCTAssertFalse(WorkspaceStore.isSessionRejection(ConvexServiceError.http(500, "boom")))
    }

}
