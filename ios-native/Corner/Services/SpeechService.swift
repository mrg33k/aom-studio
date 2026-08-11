// SpeechService.swift — Corner native iOS
// corner:native-ios R7 — voice dictation for the front-door composer.
//
// The native counterpart of the web's useDictation.js (SpeechRecognition in the
// browser): tap the mic, speak, the words land in the composer text, the user still
// reviews and sends. REAL and device-local in the same way — SFSpeechRecognizer +
// AVAudioEngine, no Corner backend in the loop, no faked transcript. Where the web
// waits for final utterances, this streams PARTIAL hypotheses live into the field
// (the scope doc's call: better UX than wait-for-final), and the field stays an
// ordinary editable TextField the whole time.
//
// HONEST ABOUT CAPABILITY, exactly like the web hook's `supported: false`:
// - No recognizer for the locale → `supported` is false and the caller hides the
//   mic. No dead button.
// - Permission denied → `guidance` names what is off and offers the Settings jump.
//   The button never silently does nothing.
//
// NO AUDIO IS STORED. Buffers go straight from the input tap into the recognition
// request and are dropped; nothing is written to disk, nothing is uploaded by this
// app. `requiresOnDeviceRecognition` stays false so recognition keeps working for
// locales Apple only serves from its servers — that trade (Apple's speech service
// may process the audio) is stated plainly in the Info.plist purpose string.

import AVFoundation
import Foundation
import Speech

@MainActor
final class SpeechService: ObservableObject {

    /// What the composer shows when the mic cannot run: plain words plus whether the
    /// Settings app is the fix (permission denials) or it is transient (engine hiccup).
    struct Guidance: Equatable {
        let text: String
        let needsSettings: Bool
    }

    @Published private(set) var isListening = false
    @Published private(set) var guidance: Guidance?

    /// Current locale's recognizer, falling back to en-US so an exotic region setting
    /// still gets a working mic rather than a hidden one.
    private let recognizer =
        SFSpeechRecognizer(locale: Locale.current) ?? SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    /// Bumped on every start AND stop; result callbacks carry the generation they were
    /// born under and are ignored once stale, so a late final result from a finished
    /// session can never clobber a draft the user is already editing.
    private var generation = 0

    /// Honest capability flag — false hides the mic button entirely (web parity).
    var supported: Bool { recognizer != nil }

    /// The one entry point the composer calls. `onUpdate` receives the FULL transcript
    /// of the current dictation session (partials included) each time it grows; the
    /// caller appends it to whatever the field held when dictation started.
    func toggle(onUpdate: @escaping (String) -> Void) {
        if isListening { stop() } else { start(onUpdate: onUpdate) }
    }

    func stop() {
        guard isListening else { return }
        isListening = false
        generation += 1
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        // endAudio (not cancel) lets the recognizer flush its last hypothesis; the
        // generation bump above means that flush is delivered to nobody — the field
        // already holds the last partial, which is what the user watched and approved.
        request?.endAudio()
        task?.finish()
        task = nil
        request = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func clearGuidance() { guidance = nil }

    // MARK: - Session start

    private func start(onUpdate: @escaping (String) -> Void) {
        guidance = nil
        Task { [weak self] in
            guard let self else { return }
            // Speech permission first, then mic — each denial gets its own words so the
            // Settings toggle the user needs is named, not guessed.
            guard await Self.speechPermission() else {
                self.guidance = Guidance(
                    text: "Speech recognition is off for Corner. Turn it on in Settings to dictate.",
                    needsSettings: true
                )
                return
            }
            guard await AVAudioApplication.requestRecordPermission() else {
                self.guidance = Guidance(
                    text: "Microphone access is off for Corner. Turn it on in Settings to dictate.",
                    needsSettings: true
                )
                return
            }
            self.beginSession(onUpdate: onUpdate)
        }
    }

    private func beginSession(onUpdate: @escaping (String) -> Void) {
        guard let recognizer, recognizer.isAvailable else {
            // supported but not available = usually offline for a server-backed locale.
            guidance = Guidance(text: "Speech recognition isn't available right now. Try again in a moment.", needsSettings: false)
            return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            // False = on-device when iOS has the model, Apple's servers when it doesn't.
            // Forcing true would kill dictation for every locale without a local model.
            request.requiresOnDeviceRecognition = false
            self.request = request

            let input = audioEngine.inputNode
            let format = input.outputFormat(forBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                request.append(buffer)
            }
            audioEngine.prepare()
            try audioEngine.start()

            generation += 1
            let gen = generation
            isListening = true

            task = recognizer.recognitionTask(with: request) { [weak self] result, error in
                // The recognizer calls back on its own queue; hop home before touching state.
                Task { @MainActor [weak self] in
                    guard let self, self.generation == gen else { return }
                    if let result {
                        onUpdate(result.bestTranscription.formattedString)
                        if result.isFinal { self.stop() }
                    }
                    if error != nil {
                        // Mid-session failure (network drop, recognizer bailed). Whatever
                        // already streamed stays in the field; the session just ends.
                        self.stop()
                    }
                }
            }
        } catch {
            audioEngine.inputNode.removeTap(onBus: 0)
            request = nil
            guidance = Guidance(text: "Couldn't start the microphone. Try again.", needsSettings: false)
        }
    }

    private static func speechPermission() async -> Bool {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: return true
        case .denied, .restricted: return false
        case .notDetermined:
            return await withCheckedContinuation { cont in
                SFSpeechRecognizer.requestAuthorization { status in
                    cont.resume(returning: status == .authorized)
                }
            }
        @unknown default: return false
        }
    }

    // MARK: - Draft joining

    /// Where dictation appends: the draft as it stood at mic-tap, with exactly one
    /// trailing space when there is text to separate from. Pure (and nonisolated,
    /// stepping out of the class's @MainActor) so the tests can pin it directly.
    nonisolated static func dictationBase(for draft: String) -> String {
        if draft.isEmpty { return "" }
        if draft.hasSuffix(" ") || draft.hasSuffix("\n") { return draft }
        return draft + " "
    }

    #if DEBUG
    /// Force the visual states for the no-network design proofs only (PreviewHarness).
    /// Nothing here touches the mic or the recognizer.
    func previewForceListening() { isListening = true }
    func previewForceDenied() {
        guidance = Guidance(
            text: "Microphone access is off for Corner. Turn it on in Settings to dictate.",
            needsSettings: true
        )
    }
    #endif
}
