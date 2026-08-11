import XCTest
@testable import Corner

@MainActor
final class EmailStoreTests: XCTestCase {
    func testInboxShapeKeepsOwnerActionsAndFiltersMachineMail() throws {
        let wishes = try JSONDecoder().decode([EmailWish].self, from: Data(#"""
        [
          {"id":"w1","name":"Mina","email":"mina@example.com","message":"Pricing question\n• Needs an answer\n--- ORIGINAL MESSAGE ---\nCan you send pricing?\n[staged_draft:d1|conn:c1]","status":"needs_team","created_at":"2026-08-11T12:00:00Z","updated_at":"2026-08-11T12:00:00Z","auto_send_at":"2026-08-11T14:20:00Z","latency_seconds":null},
          {"id":"w2","name":"Lee","email":"lee@example.com","message":"All set","status":"resolved","created_at":"2026-08-10T12:00:00Z","updated_at":"2026-08-10T13:00:00Z","auto_send_at":null,"latency_seconds":3600}
        ]
        """#.utf8))
        let mailboxes = try JSONDecoder().decode([EmailMailbox].self, from: Data(#"""
        [{"email":"hello@aom-inhouse.com","error":null,"needs":[
          {"from":"Robot","email":"no-reply@example.com","subject":"Noise","threadId":"n1","date":"2026-08-11T13:00:00Z","snippet":"ignore","messageCount":1,"lastInbound":null,"lastReply":null},
          {"from":"Ari","email":"ari@example.com","subject":"Real ask","threadId":"t1","date":"2026-08-11T13:00:00Z","snippet":"Could you help?","messageCount":1,"lastInbound":null,"lastReply":null}
        ],"replied":[]}]
        """#.utf8))

        let result = EmailStore.shape(wishes: wishes, mailboxes: mailboxes, now: Date(timeIntervalSince1970: 1_786_460_400))
        XCTAssertEqual(Set(result.needs.map(\.sender)), Set(["Mina", "Ari"]))
        XCTAssertEqual(result.watching.map(\.sender), ["Lee"])
        XCTAssertTrue(result.needs.first(where: { $0.sender == "Mina" })?.hasStaged == true)
        XCTAssertEqual(result.needs.first(where: { $0.sender == "Mina" })?.subject, "Pricing question")
    }

    func testAutoReplyDecodesDiskTruthAndPendingControl() throws {
        let status = try JSONDecoder().decode(AutoReplyStatus.self, from: Data(#"""
        {"control":{"mode":"off","requested_at":"2026-08-11T14:00:00Z"},"file_state":{"mode":"live","answer_mode":"send","threshold_min":10,"synced_at":"2026-08-11T14:01:00Z"},"can_restore":true}
        """#.utf8))
        XCTAssertEqual(status.fileState?.mode, "live")
        XCTAssertEqual(status.fileState?.answerMode, "send")
        XCTAssertEqual(status.control?.mode, "off")
        XCTAssertTrue(status.canRestore)
    }
}
