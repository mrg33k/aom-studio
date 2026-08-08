import AVFoundation
import Capacitor
import MediaPlayer
import Speech

@objc(CornerAirPodsPlugin)
public final class CornerAirPodsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CornerAirPodsPlugin"
    public let jsName = "CornerAirPods"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "arm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRemoteControls", returnType: CAPPluginReturnPromise)
    ]

    private let audioEngine = AVAudioEngine()
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let synthesizer = AVSpeechSynthesizer()
    private var phrase = "hey corner"
    private var armed = false
    private var tapInstalled = false

    @objc public func arm(_ call: CAPPluginCall) {
        phrase = (call.getString("phrase") ?? "Hey Corner").lowercased()
        requestPermissions { [weak self] allowed in
            guard let self else { return }
            guard allowed else {
                call.resolve(["ok": false, "reason": "speech-or-microphone-denied"])
                return
            }
            DispatchQueue.main.async {
                do {
                    try self.startDetector()
                    call.resolve(["ok": true, "onDevice": true])
                } catch {
                    call.resolve(["ok": false, "reason": error.localizedDescription])
                }
            }
        }
    }

    @objc public func disarm(_ call: CAPPluginCall) {
        stopDetector()
        call.resolve(["ok": true])
    }

    @objc public func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        guard !text.isEmpty else { call.resolve(["ok": false]); return }
        DispatchQueue.main.async {
            let utterance = AVSpeechUtterance(string: text)
            utterance.rate = AVSpeechUtteranceDefaultSpeechRate
            self.synthesizer.stopSpeaking(at: .immediate)
            self.synthesizer.speak(utterance)
            call.resolve(["ok": true])
        }
    }

    @objc public func setRemoteControls(_ call: CAPPluginCall) {
        let center = MPRemoteCommandCenter.shared()
        center.togglePlayPauseCommand.removeTarget(nil)
        if call.getBool("enabled") == true {
            center.togglePlayPauseCommand.isEnabled = true
            center.togglePlayPauseCommand.addTarget { [weak self] _ in
                self?.notifyListeners("wake", data: ["source": "airpods-remote"])
                return .success
            }
        } else {
            center.togglePlayPauseCommand.isEnabled = false
        }
        call.resolve(["ok": true])
    }

    private func requestPermissions(_ completion: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { speechStatus in
            guard speechStatus == .authorized else { completion(false); return }
            AVAudioSession.sharedInstance().requestRecordPermission { micAllowed in
                completion(micAllowed)
            }
        }
    }

    private func startDetector() throws {
        stopDetector()
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            throw NSError(domain: "CornerAirPods", code: 1, userInfo: [NSLocalizedDescriptionKey: "On-device speech recognition is unavailable"])
        }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .defaultToSpeaker])
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        if speechRecognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }
        recognitionRequest = request

        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        tapInstalled = true
        armed = true
        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let text = result?.bestTranscription.formattedString.lowercased(), text.contains(self.phrase) {
                self.notifyListeners("wake", data: ["source": "wake-phrase"])
                self.stopDetector()
                return
            }
            if error != nil || result?.isFinal == true {
                self.restartDetectorIfArmed()
            }
        }
        audioEngine.prepare()
        try audioEngine.start()
    }

    private func stopDetector() {
        armed = false
        if audioEngine.isRunning { audioEngine.stop() }
        if tapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
    }

    private func restartDetectorIfArmed() {
        guard armed else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self, self.armed else { return }
            do { try self.startDetector() }
            catch { self.notifyListeners("wakeError", data: ["message": error.localizedDescription]) }
        }
    }
}
