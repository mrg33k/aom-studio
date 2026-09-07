// R28ComposerParityTests.swift — Corner native iOS
// corner:corner-v2 R28 — everything the CV6 composer did, inside the v2 pill.
//
// Pins the R28 composer logic: slash palette, reply quotes, @mention chips,
// per-thread disk drafts, staged attachments, send-text building, Talk aloud
// (words + state, never audio), dictation level mapping, and the V2ChatModel
// send/stop/stage/image-run state machine.

import AVFoundation
import XCTest
@testable import Corner

@MainActor
final class R28ComposerParityTests: XCTestCase {
    private var prefsKeys: [String] = []

    override func tearDown() {
        for key in prefsKeys { UserDefaults.standard.removeObject(forKey: key) }
        prefsKeys.removeAll()
        super.tearDown()
    }

    private func track(_ key: String) { prefsKeys.append(key) }

    private func context(threadID: String = "thread-r28-test") throws
        -> (thread: Corner.Thread, project: ProjectSummary, mission: MissionSummary?)
    {
        let fixture = try Fixture.loadNativeFixture()
        guard let aster = fixture.workspace.projects.first(where: { $0.name == "Aster" }) else {
            throw FakeRouteError.expectedAsterProject
        }
        track("v2ThreadPrefs.\(threadID)")
        let thread = Corner.Thread(
            id: threadID, ownerType: .project, projectID: aster.id,
            missionID: nil, visualSessionID: "session-r28"
        )
        return (thread, aster, nil)
    }

    private func routeDecision(project: ProjectSummary, threadID: String) -> RouteDecision {
        RouteDecision(
            decisionId: "decision-r28", destinationThreadID: threadID,
            project: project, mission: nil, confidence: 1, alternatives: [],
            reason: "Already in \(project.name).", needsClarification: false,
            needsCreationConfirmation: false, actor: "tester", createdAt: Date()
        )
    }

    private func startedModel(threadID: String = "thread-r28-test") async throws
        -> (V2ChatModel, CornerV2APIFake, Corner.Thread, ProjectSummary)
    {
        let api = CornerV2APIFake()
        api.threadEventsHandler = { _ in [] }
        let model = V2ChatModel(api: api, outbox: .memory)
        let (thread, project, mission) = try context(threadID: threadID)
        await model.start(thread: thread, project: project, mission: mission)
        return (model, api, thread, project)
    }

    // MARK: - slash palette

    func testSlashDraftDetection() {
        XCTAssertTrue(V2SlashPalette.isSlashDraft("/"))
        XCTAssertTrue(V2SlashPalette.isSlashDraft("/clear"))
        XCTAssertTrue(V2SlashPalette.isSlashDraft("  /plan"))
        XCTAssertFalse(V2SlashPalette.isSlashDraft("hello /plan"))
        XCTAssertFalse(V2SlashPalette.isSlashDraft("@brain hi"))
        XCTAssertFalse(V2SlashPalette.isSlashDraft(""))
    }

    func testSlashToken() {
        XCTAssertEqual(V2SlashPalette.token(in: "/"), "")
        XCTAssertEqual(V2SlashPalette.token(in: "/CLEAR"), "clear")
        XCTAssertEqual(V2SlashPalette.token(in: "/Image ganache"), "image")
        XCTAssertEqual(V2SlashPalette.token(in: "hello"), "")
    }

    func testSlashFiltered() {
        // Empty token lists everything.
        XCTAssertEqual(V2SlashPalette.filtered("/", hasSpecialist: false).count, 8)
        XCTAssertEqual(V2SlashPalette.filtered("/", hasSpecialist: true).count, 9)
        // `/clear` narrows to the one destructive row.
        let clear = V2SlashPalette.filtered("/clear", hasSpecialist: false)
        XCTAssertEqual(clear.map(\.id), [.clear])
        // `/i` matches image + integrations.
        let i = V2SlashPalette.filtered("/i", hasSpecialist: false).map(\.id)
        XCTAssertTrue(i.contains(.image))
        XCTAssertTrue(i.contains(.integrations))
        // Specialist appears only with a roster (the v2 analogue of
        // `agentPreferenceKey != nil`).
        XCTAssertFalse(V2SlashPalette.filtered("/spec", hasSpecialist: false).map(\.id).contains(.specialist))
        XCTAssertTrue(V2SlashPalette.filtered("/spec", hasSpecialist: true).map(\.id).contains(.specialist))
        // No match, no rows — never a phantom command.
        XCTAssertTrue(V2SlashPalette.filtered("/zzz", hasSpecialist: true).isEmpty)
    }

    // MARK: - reply quotes

    func testReplySnippetTruncation() {
        XCTAssertEqual(V2ReplyQuote.snippet(from: "short"), "short")
        // First non-blank line wins over later lines.
        XCTAssertEqual(V2ReplyQuote.snippet(from: "first\nsecond"), "first")
        XCTAssertEqual(V2ReplyQuote.snippet(from: "  \n  padded  \n"), "padded")
        XCTAssertEqual(V2ReplyQuote.snippet(from: "   "), "")
        let long = String(repeating: "a", count: 200)
        let snipped = V2ReplyQuote.snippet(from: long)
        XCTAssertTrue(snipped.hasSuffix("…"))
        XCTAssertEqual(snipped.count, 141)
    }

    func testReplyQuoteFromBlocks() {
        let quote = V2ReplyQuote.quote(
            messageID: "e1", sender: "Aster",
            blocks: [.text("hello there"), .steps([])]
        )
        XCTAssertEqual(quote, V2ReplyQuote(messageID: "e1", sender: "Aster", snippet: "hello there"))
        // No text block → no quote (steps-only, artifacts-only).
        XCTAssertNil(V2ReplyQuote.quote(messageID: "e2", sender: "Aster", blocks: [.steps([])]))
        XCTAssertNil(V2ReplyQuote.quote(messageID: "e3", sender: "Aster", blocks: [.text("   ")]))
    }

    // MARK: - @mention chips

    func testMentionsCommitted() {
        XCTAssertEqual(V2Mentions.committed(in: "ask @brain now", roster: []), ["brain"])
        XCTAssertEqual(
            V2Mentions.committed(in: "@brain and @research please", roster: ["research"]),
            ["brain", "research"]
        )
        // Unknown slugs never commit; emails never commit; dupes collapse.
        XCTAssertEqual(V2Mentions.committed(in: "@stranger hi", roster: []), [])
        XCTAssertEqual(V2Mentions.committed(in: "mail patrik@example.com", roster: []), [])
        XCTAssertEqual(V2Mentions.committed(in: "@brain @brain", roster: []), ["brain"])
    }

    func testMentionTokenAndSuggestions() {
        XCTAssertEqual(V2Mentions.currentToken(in: "hi @br"), "br")
        XCTAssertEqual(V2Mentions.currentToken(in: "@"), "")
        XCTAssertNil(V2Mentions.currentToken(in: "hi @brain ok"))
        XCTAssertNil(V2Mentions.currentToken(in: "no mention"))
        let roster = [(slug: "research", title: "Research")]
        XCTAssertEqual(V2Mentions.suggestions(token: "", roster: roster).map(\.slug), ["brain", "research"])
        XCTAssertEqual(V2Mentions.suggestions(token: "br", roster: roster).map(\.slug), ["brain"])
        XCTAssertTrue(V2Mentions.suggestions(token: "zzz", roster: roster).isEmpty)
    }

    func testMentionCompleteAndRemove() {
        XCTAssertEqual(V2Mentions.complete(slug: "brain", in: "ask @br"), "ask @brain ")
        XCTAssertEqual(V2Mentions.complete(slug: "brain", in: ""), "@brain ")
        XCTAssertEqual(V2Mentions.complete(slug: "brain", in: "go"), "go @brain ")
        XCTAssertEqual(V2Mentions.removing(slug: "brain", from: "ask @brain now"), "ask now")
        XCTAssertEqual(V2Mentions.removing(slug: "brain", from: "@brain"), "")
    }

    // MARK: - per-thread disk drafts

    func testDraftKeyScopedPerThread() {
        XCTAssertEqual(V2ComposerDrafts.key(threadID: "t1"), "v2ComposerDraft.t1")
        XCTAssertNotEqual(V2ComposerDrafts.key(threadID: "t1"), V2ComposerDrafts.key(threadID: "t2"))
    }

    func testDraftSaveLoadClear() {
        let id = "thread-r28-draft-\(UUID().uuidString)"
        track(V2ComposerDrafts.key(threadID: id))
        XCTAssertNil(V2ComposerDrafts.load(threadID: id))
        V2ComposerDrafts.save("half a thought", threadID: id)
        XCTAssertEqual(V2ComposerDrafts.load(threadID: id), "half a thought")
        // Blank saves clear (no whitespace ghosts after a send).
        V2ComposerDrafts.save("   ", threadID: id)
        XCTAssertNil(V2ComposerDrafts.load(threadID: id))
        V2ComposerDrafts.save("again", threadID: id)
        V2ComposerDrafts.clear(threadID: id)
        XCTAssertNil(V2ComposerDrafts.load(threadID: id))
    }

    func testDraftsDoNotLeakAcrossThreads() {
        let a = "thread-r28-a-\(UUID().uuidString)"
        let b = "thread-r28-b-\(UUID().uuidString)"
        track(V2ComposerDrafts.key(threadID: a))
        track(V2ComposerDrafts.key(threadID: b))
        V2ComposerDrafts.save("thread a draft", threadID: a)
        XCTAssertNil(V2ComposerDrafts.load(threadID: b))
    }

    // MARK: - staged attachments + send text

    func testNextPhotoName() {
        XCTAssertEqual(V2Attachments.nextPhotoName(existing: []), "photo.jpg")
        let one = [V2StagedAttachment(id: "1", name: "photo.jpg", kind: .photo)]
        XCTAssertEqual(V2Attachments.nextPhotoName(existing: one), "photo-2.jpg")
    }

    func testSendTextBuilder() {
        XCTAssertEqual(
            V2SendText.build(text: "hi", quote: nil, attachments: []),
            "hi"
        )
        let quote = V2ReplyQuote(messageID: "e1", sender: "Aster", snippet: "need numbers")
        XCTAssertEqual(
            V2SendText.build(text: "on it", quote: quote, attachments: []),
            "> Aster: need numbers\non it"
        )
        let staged = [
            V2StagedAttachment(id: "1", name: "deck.pdf", kind: .file),
            V2StagedAttachment(id: "2", name: "photo.jpg", kind: .photo),
        ]
        XCTAssertEqual(
            V2SendText.build(text: "see attached", quote: nil, attachments: staged),
            "see attached\n[attached: deck.pdf, photo.jpg]"
        )
        XCTAssertEqual(
            V2SendText.build(text: "  padded  ", quote: quote, attachments: staged),
            "> Aster: need numbers\npadded\n[attached: deck.pdf, photo.jpg]"
        )
    }

    // MARK: - speakable text

    func testSpeakableTextUsesAgentTextOnly() {
        XCTAssertEqual(
            V2SpeakText.speakableText(blocks: [.text("first"), .steps([]), .text("second")]),
            "first\nsecond"
        )
        XCTAssertNil(V2SpeakText.speakableText(blocks: [.steps([])]))
        XCTAssertNil(V2SpeakText.speakableText(blocks: [.text("   ")]))
        XCTAssertNil(V2SpeakText.speakableText(blocks: []))
    }

    func testChecklistSpeech() {
        XCTAssertEqual(
            V2SpeakText.checklistSpeech(texts: ["fix the deck", "", "  ", "ship it"]),
            "Note 1: fix the deck\nNote 2: ship it"
        )
        XCTAssertNil(V2SpeakText.checklistSpeech(texts: ["", "  "]))
        XCTAssertNil(V2SpeakText.checklistSpeech(texts: []))
    }

    // MARK: - dictation level mapping

    func testNormalizedLevel() {
        XCTAssertEqual(SpeechService.normalizedLevel(rms: 0), 0)
        XCTAssertEqual(SpeechService.normalizedLevel(rms: -1), 0)
        // -6 dBFS (0.5012) and above read full.
        XCTAssertEqual(SpeechService.normalizedLevel(rms: 1), 1)
        XCTAssertEqual(SpeechService.normalizedLevel(rms: 0.5012), 1, accuracy: 0.01)
        // -48 dBFS and below read silent.
        XCTAssertEqual(SpeechService.normalizedLevel(rms: 0.004), 0, accuracy: 0.01)
        // Mid-scale lands mid-meter, never NaN.
        let mid = SpeechService.normalizedLevel(rms: 0.05)
        XCTAssertTrue(mid > 0.2 && mid < 0.8, "mid-scale RMS should read mid-meter, got \(mid)")
        XCTAssertEqual(SpeechService.normalizedLevel(rms: .nan), 0)
        XCTAssertEqual(SpeechService.normalizedLevel(rms: .infinity), 1)
    }

    func testMeterLevelNeverNaN() {
        // A zero-length buffer reads silence, not NaN.
        let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1)!
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 1024)!
        buffer.frameLength = 0
        XCTAssertEqual(SpeechService.meterLevel(for: buffer), 0)
    }

    // MARK: - Talk aloud service (fake speaker, never audio)

    final class FakeTalkSpeaker: V2TalkSpeaker {
        var spoken: [String] = []
        var stopped = 0
        var speaking = false
        var isSpeaking: Bool { speaking }
        func speak(_ text: String) { spoken.append(text); speaking = true }
        func stop() { stopped += 1; speaking = false }
    }

    func testTalkAloudSpeaksOncePerEvent() {
        let id = "thread-r28-talk-\(UUID().uuidString)"
        track(V2TalkAloud.key(threadID: id))
        let speaker = FakeTalkSpeaker()
        let talk = V2TalkAloud(threadID: id, speaker: speaker)
        XCTAssertFalse(talk.enabled)
        // Disabled: silence, whatever arrives.
        XCTAssertFalse(talk.speakReply(eventID: "e1", text: "hello"))
        XCTAssertTrue(speaker.spoken.isEmpty)
        talk.setEnabled(true)
        XCTAssertTrue(talk.enabled)
        XCTAssertTrue(talk.speakReply(eventID: "e1", text: "hello"))
        XCTAssertEqual(speaker.spoken, ["hello"])
        // Same event never re-speaks (reloads and re-renders stay silent).
        XCTAssertFalse(talk.speakReply(eventID: "e1", text: "hello"))
        XCTAssertEqual(speaker.spoken.count, 1)
        // Blank text is not speech.
        XCTAssertFalse(talk.speakReply(eventID: "e2", text: "   "))
        // Disabling stops audio.
        talk.setEnabled(false)
        XCTAssertEqual(speaker.stopped, 1)
    }

    func testTalkAloudPersistsPerThread() {
        let id = "thread-r28-talkpersist-\(UUID().uuidString)"
        track(V2TalkAloud.key(threadID: id))
        XCTAssertFalse(V2TalkAloud.isEnabled(threadID: id))
        V2TalkAloud(threadID: id, speaker: FakeTalkSpeaker()).setEnabled(true)
        XCTAssertTrue(V2TalkAloud.isEnabled(threadID: id))
        XCTAssertTrue(V2TalkAloud(threadID: id, speaker: FakeTalkSpeaker()).enabled)
    }

    func testTalkAloudChecklist() {
        let id = "thread-r28-checklist-\(UUID().uuidString)"
        track(V2TalkAloud.key(threadID: id))
        let speaker = FakeTalkSpeaker()
        let talk = V2TalkAloud(threadID: id, speaker: speaker)
        XCTAssertFalse(talk.speakChecklist(texts: ["", "  "]))
        XCTAssertTrue(speaker.spoken.isEmpty)
        XCTAssertTrue(talk.speakChecklist(texts: ["fix the deck", "ship it"]))
        XCTAssertEqual(speaker.spoken, ["Note 1: fix the deck\nNote 2: ship it"])
    }

    // MARK: - V2ChatModel: staged, quote, stop, runs

    func testStageAndRemoveAttachments() async throws {
        let (model, _, _, _) = try await startedModel()
        XCTAssertTrue(model.staged.isEmpty)
        model.stageAttachment(name: "deck.pdf", kind: .file)
        model.stageAttachment(name: "photo.jpg", kind: .photo)
        XCTAssertEqual(model.staged.map(\.name), ["deck.pdf", "photo.jpg"])
        // Dupes and blanks never stage.
        model.stageAttachment(name: "deck.pdf", kind: .file)
        model.stageAttachment(name: "   ", kind: .file)
        XCTAssertEqual(model.staged.count, 2)
        model.removeStaged(id: model.staged[0].id)
        XCTAssertEqual(model.staged.map(\.name), ["photo.jpg"])
        model.clearStaged()
        XCTAssertTrue(model.staged.isEmpty)
    }

    func testSendCarriesQuoteAndAttachmentNames() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in self.routeDecision(project: project, threadID: thread.id) }
        let quote = V2ReplyQuote(messageID: "e1", sender: "Aster", snippet: "need numbers")
        model.stageAttachment(name: "deck.pdf", kind: .file)
        await model.send("on it", quote: quote, attachments: model.staged)
        XCTAssertEqual(api.sentTexts, ["> Aster: need numbers\non it\n[attached: deck.pdf]"])
        // A send consumes its staged attachments.
        XCTAssertTrue(model.staged.isEmpty)
        XCTAssertFalse(model.isSending)
    }

    func testStopSendingIsIdleNoop() async throws {
        let (model, _, _, _) = try await startedModel()
        XCTAssertFalse(model.isSending)
        model.stopSending()
        XCTAssertFalse(model.isSending)
    }

    func testStopCancelsTheFlightQuietly() async throws {
        let (model, api, thread, project) = try await startedModel()
        api.sendHandler = { _, _, _, _ in
            try await Task.sleep(nanoseconds: 5_000_000_000)
            return self.routeDecision(project: project, threadID: thread.id)
        }
        model.startSend("stop me")
        // The flight is observable…
        var landed = false
        for _ in 0..<100 where !landed {
            try? await Task.sleep(nanoseconds: 20_000_000)
            landed = model.isSending
        }
        XCTAssertTrue(landed, "isSending never went true during the slow flight")
        model.stopSending()
        XCTAssertFalse(model.isSending)
        // …and the stop parks quietly: the entry stays queued with NO
        // failure stamped (banner stays .none), the echo stays on screen.
        try? await Task.sleep(nanoseconds: 200_000_000)
        XCTAssertEqual(model.queued.count, 1)
        XCTAssertEqual(model.sendBanner, .none)
        XCTAssertTrue(model.events.contains { event in
            event.blocks.contains { if case .text(let value) = $0 { value == "stop me" } else { false } }
        })
        XCTAssertFalse(model.isSending)
    }

    func testImageRunLifecycle() async throws {
        let (model, _, _, _) = try await startedModel()
        XCTAssertFalse(model.hasActiveImageRuns)
        let id = model.startImageRun(prompt: "a lighthouse")
        XCTAssertTrue(model.hasActiveImageRuns)
        XCTAssertEqual(model.imageRuns.map(\.prompt), ["a lighthouse"])
        model.failImageRun(id: id, error: "nope")
        XCTAssertFalse(model.hasActiveImageRuns)
        XCTAssertEqual(model.imageRuns.first?.state, .failed)
        XCTAssertEqual(model.imageRuns.first?.error, "nope")
        model.dismissImageRun(id: id)
        XCTAssertTrue(model.imageRuns.isEmpty)
        let live = model.startImageRun(prompt: "a harbor")
        model.cancelImageRun(id: live)
        XCTAssertEqual(model.imageRuns.first?.state, .cancelled)
        model.dismissImageRun(id: live)
        let done = model.startImageRun(prompt: "done")
        model.finishImageRun(id: done)
        XCTAssertTrue(model.imageRuns.isEmpty)
    }
}
