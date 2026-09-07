// V2TalkAloud.swift — Corner native iOS
// corner:corner-v2 R28 — Talk aloud for the v2 pill.
//
// The native twin of the web's Talk-aloud toggle (R27): per-thread
// persisted, AVSpeechSynthesis of the driver's newest reply, plus checklist
// playback of the filled review notes. The `Speaker` seam keeps audio out
// of the unit tests — they assert the words and the state, never the sound.

import AVFoundation
import Foundation

/// The smallest speech surface the service needs. Production uses
/// AVSpeechSynthesizer; tests use a recording fake.
protocol V2TalkSpeaker: AnyObject {
    var isSpeaking: Bool { get }
    func speak(_ text: String)
    func stop()
}

final class AVTalkSpeaker: V2TalkSpeaker {
    private let synth = AVSpeechSynthesizer()

    var isSpeaking: Bool { synth.isSpeaking }

    func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: Locale.current.identifier)
            ?? AVSpeechSynthesisVoice(language: "en-US")
        synth.speak(utterance)
    }

    func stop() { _ = synth.stopSpeaking(at: .immediate) }
}

@MainActor
final class V2TalkAloud: ObservableObject {
    /// Per-thread toggle, surviving relaunch like every other thread pref.
    static func key(threadID: String) -> String { "v2TalkAloud.\(threadID)" }

    static func isEnabled(threadID: String) -> Bool {
        UserDefaults.standard.bool(forKey: key(threadID: threadID))
    }

    @Published private(set) var enabled: Bool
    /// The last event id spoken, so one reply is never read twice (reloads,
    /// re-subscribes, and re-renders must not re-speak).
    @Published private(set) var lastSpokenEventID: String?

    private let threadID: String
    private let speaker: any V2TalkSpeaker

    init(threadID: String, speaker: (any V2TalkSpeaker)? = nil) {
        self.threadID = threadID
        self.speaker = speaker ?? AVTalkSpeaker()
        self.enabled = Self.isEnabled(threadID: threadID)
    }

    func setEnabled(_ value: Bool) {
        enabled = value
        UserDefaults.standard.set(value, forKey: Self.key(threadID: threadID))
        if !value { stop() }
    }

    var isSpeaking: Bool { speaker.isSpeaking }

    func stop() {
        speaker.stop()
    }

    /// Speak one driver reply, once. Returns false when there was nothing
    /// speakable or the event was already spoken.
    @discardableResult
    func speakReply(eventID: String, text: String?) -> Bool {
        guard enabled else { return false }
        guard lastSpokenEventID != eventID else { return false }
        guard let text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        lastSpokenEventID = eventID
        speaker.speak(text)
        return true
    }

    /// Checklist playback: the filled review notes, numbered. Returns false
    /// when every note is blank (silence, not "Note 1: " over nothing).
    @discardableResult
    func speakChecklist(texts: [String]) -> Bool {
        guard let speech = V2SpeakText.checklistSpeech(texts: texts) else { return false }
        speaker.speak(speech)
        return true
    }
}
