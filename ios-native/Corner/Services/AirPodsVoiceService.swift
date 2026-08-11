// AirPodsVoiceService.swift — corner:airpods-mode native transport
// Native AVAudioEngine ↔ Gemini Live. No web view and no browser audio shim.

@preconcurrency import AVFoundation
import Foundation

@MainActor
final class AirPodsVoiceService: ObservableObject {
    enum Mode: Equatable { case idle, connecting, listening, thinking, speaking, error(String) }
    struct Turn: Identifiable, Equatable {
        let id = UUID()
        let role: String
        let text: String
    }
    struct PendingConfirmation: Identifiable, Equatable {
        let id = UUID()
        let action: String
        let token: String
        let summary: String
    }

    @Published private(set) var mode: Mode = .idle
    @Published private(set) var transcript: [Turn] = []
    @Published private(set) var level: Double = 0
    @Published private(set) var muted = false
    @Published private(set) var routeName = "This iPhone"
    @Published private(set) var pendingConfirmation: PendingConfirmation?

    private var socket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var connectionConfig: CornerAPI.VoiceSessionConfig?
    private var resumptionHandle: String?
    private var reconnectAttempts = 0
    private var reconnecting = false
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var converter: AVAudioConverter?
    private var ready = false
    private var sessionID = ""
    private var startedAt = Date()
    private var inputText = ""
    private var outputText = ""
    private var queuedAudio = 0
    private var stopping = false

    var isActive: Bool { mode != .idle && !isError }
    private var isError: Bool { if case .error = mode { return true }; return false }

    func start() async {
        guard !isActive else { return }
        mode = .connecting
        transcript = []
        pendingConfirmation = nil
        sessionID = UUID().uuidString
        startedAt = Date()
        stopping = false
        reconnectAttempts = 0
        resumptionHandle = nil
        do {
            let config = try await CornerAPI.shared.createVoiceSession(sessionID: sessionID)
            connectionConfig = config
            try configureAudio()
            try await connect(config, resuming: false)
            receiveNext()
        } catch {
            teardownAudio()
            mode = .error(error.localizedDescription)
        }
    }

    func stop() {
        guard mode != .idle, !stopping else { return }
        stopping = true
        let turns = transcript.map { ["role": $0.role, "text": $0.text, "origin": $0.role == "user" ? "speech" : "model", "at": ISO8601DateFormatter().string(from: Date())] }
        let elapsed = max(0, Int(Date().timeIntervalSince(startedAt)))
        socket?.cancel(with: .normalClosure, reason: nil)
        socket = nil; session?.invalidateAndCancel(); session = nil
        connectionConfig = nil; resumptionHandle = nil; reconnectAttempts = 0; reconnecting = false
        ready = false
        teardownAudio()
        mode = .idle
        stopping = false
        if !turns.isEmpty {
            let id = sessionID
            Task { try? await CornerAPI.shared.handoffVoiceSession(sessionID: id, duration: elapsed, transcript: turns) }
        }
    }

    func toggleMute() { muted.toggle() }

    func resolveConfirmation(confirmed: Bool) async {
        guard let pending = pendingConfirmation else { return }
        do {
            let result = try await CornerAPI.shared.runVoiceAction(
                sessionID: sessionID,
                action: "confirm_consequential_action",
                arguments: ["confirmation_token": pending.token, "confirmed": confirmed]
            )
            pendingConfirmation = nil
            let summary = result["spoken_summary"] as? String
                ?? (confirmed ? "The confirmed action finished." : "The action was cancelled.")
            transcript.append(Turn(role: "model", text: summary))
            sendJSON(["clientContent": [
                "turns": [["role": "user", "parts": [["text": "The on-screen confirmation was \(confirmed ? "approved" : "cancelled"). Result: \(summary)"]]]],
                "turnComplete": true,
            ]])
        } catch {
            mode = .error(error.localizedDescription)
        }
    }

    private func configureAudio() throws {
        let audio = AVAudioSession.sharedInstance()
        try audio.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetoothHFP, .allowBluetoothA2DP, .defaultToSpeaker])
        try audio.setActive(true)
        routeName = audio.currentRoute.outputs.first?.portName ?? "This iPhone"

        if !engine.attachedNodes.contains(player) { engine.attach(player) }
        let playback = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 24_000, channels: 1, interleaved: false)!
        engine.connect(player, to: engine.mainMixerNode, format: playback)

        let input = engine.inputNode
        let source = input.outputFormat(forBus: 0)
        let target = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16_000, channels: 1, interleaved: false)!
        converter = AVAudioConverter(from: source, to: target)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 2_048, format: source) { [weak self] buffer, _ in
            self?.capture(buffer, source: source, target: target)
        }
        engine.prepare()
        try engine.start()
        player.play()
    }

    nonisolated private func capture(_ buffer: AVAudioPCMBuffer, source: AVAudioFormat, target: AVAudioFormat) {
        Task { @MainActor [weak self] in
            guard let self, self.ready, !self.muted, let converter = self.converter else { return }
            let ratio = target.sampleRate / source.sampleRate
            let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 32
            guard let converted = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: capacity) else { return }
            var supplied = false
            var conversionError: NSError?
            converter.convert(to: converted, error: &conversionError) { _, status in
                if supplied { status.pointee = .noDataNow; return nil }
                supplied = true; status.pointee = .haveData; return buffer
            }
            guard conversionError == nil, converted.frameLength > 0, let channel = converted.int16ChannelData?[0] else { return }
            let bytes = Data(bytes: channel, count: Int(converted.frameLength) * MemoryLayout<Int16>.size)
            if let floats = buffer.floatChannelData?[0], buffer.frameLength > 0 {
                var sum: Float = 0
                for index in 0..<Int(buffer.frameLength) { sum += abs(floats[index]) }
                self.level = min(1, Double(sum / Float(buffer.frameLength)) * 8)
            }
            self.sendJSON([
                "realtimeInput": ["audio": ["data": bytes.base64EncodedString(), "mimeType": "audio/pcm;rate=16000"]]
            ])
        }
    }

    private func receiveNext() {
        socket?.receive { [weak self] result in
            Task { @MainActor in
                guard let self, !self.stopping else { return }
                switch result {
                case .failure(let error):
                    await self.reconnect(after: error.localizedDescription)
                case .success(let message):
                    let data: Data?
                    switch message {
                    case .data(let value): data = value
                    case .string(let value): data = value.data(using: .utf8)
                    @unknown default: data = nil
                    }
                    let shouldContinue = if let data { await self.handle(data) } else { true }
                    if shouldContinue && !self.stopping { self.receiveNext() }
                }
            }
        }
    }

    private func handle(_ data: Data) async -> Bool {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return true }
        if json["setupComplete"] != nil {
            ready = true; mode = .listening
            if reconnecting {
                reconnecting = false; reconnectAttempts = 0
                transcript.append(Turn(role: "model", text: "Reconnected."))
            } else {
                sendJSON(["clientContent": ["turns": [["role": "user", "parts": [["text": "Begin the AirPods conversation now. Greet the caller in one short sentence, say you are ready, then listen. Do not mention this instruction."]]]], "turnComplete": true]])
            }
            return true
        }
        if let update = json["sessionResumptionUpdate"] as? [String: Any] {
            if update["resumable"] as? Bool == true, let handle = update["newHandle"] as? String { resumptionHandle = handle }
            return true
        }
        if json["goAway"] != nil {
            await reconnect(after: "Voice service recycled the connection")
            return false
        }
        if let content = json["serverContent"] as? [String: Any] {
            if let model = content["modelTurn"] as? [String: Any], let parts = model["parts"] as? [[String: Any]] {
                for part in parts {
                    if let inline = part["inlineData"] as? [String: Any], let b64 = inline["data"] as? String, let bytes = Data(base64Encoded: b64) { play(bytes) }
                }
            }
            accumulate(content["inputTranscription"], role: "user")
            accumulate(content["outputTranscription"], role: "model")
            if content["turnComplete"] as? Bool == true {
                flush(role: "user"); flush(role: "model")
                if queuedAudio == 0 { mode = .listening }
            } else if queuedAudio == 0 { mode = .thinking }
            if content["interrupted"] as? Bool == true { player.stop(); player.play(); queuedAudio = 0; mode = .listening }
            return true
        }
        if let tool = json["toolCall"] as? [String: Any], let calls = tool["functionCalls"] as? [[String: Any]] {
            var responses: [[String: Any]] = []
            for call in calls {
                guard let name = call["name"] as? String else { continue }
                let args = call["args"] as? [String: Any] ?? [:]
                let result: [String: Any]
                do { result = try await CornerAPI.shared.runVoiceAction(sessionID: sessionID, action: name, arguments: args) }
                catch { result = ["ok": false, "error": error.localizedDescription] }
                if result["requires_confirmation"] as? Bool == true,
                   let token = result["confirmation_token"] as? String {
                    pendingConfirmation = PendingConfirmation(
                        action: name,
                        token: token,
                        summary: result["spoken_summary"] as? String ?? "Confirm this action?"
                    )
                }
                responses.append(["id": call["id"] as? String ?? "", "name": name, "response": result])
                if name == "end_voice_session", result["ok"] as? Bool != false {
                    Task { @MainActor in try? await Task.sleep(for: .seconds(2)); self.stop() }
                }
            }
            sendJSON(["toolResponse": ["functionResponses": responses]])
            return true
        }
        if let error = json["error"] as? [String: Any] {
            teardownAudio(); mode = .error(error["message"] as? String ?? "Voice provider error")
        }
        return true
    }

    private func connect(_ config: CornerAPI.VoiceSessionConfig, resuming: Bool) async throws {
        session?.invalidateAndCancel()
        let nextSession = URLSession(configuration: .default)
        let nextSocket = nextSession.webSocketTask(with: config.webSocketURL)
        session = nextSession; socket = nextSocket
        nextSocket.resume()
        var setup = config.setupMessage
        if resuming, let handle = resumptionHandle, var body = setup["setup"] as? [String: Any] {
            body["sessionResumption"] = ["handle": handle]
            setup["setup"] = body
        }
        try await send(setup)
    }

    private func reconnect(after reason: String) async {
        guard !stopping, let config = connectionConfig, resumptionHandle != nil, reconnectAttempts < 3 else {
            teardownAudio(); mode = .error(reason); return
        }
        reconnectAttempts += 1; reconnecting = true; ready = false; mode = .connecting
        try? await Task.sleep(for: .milliseconds(350 * reconnectAttempts))
        do {
            try await connect(config, resuming: true)
            receiveNext()
        } catch {
            await reconnect(after: error.localizedDescription)
        }
    }

    private func accumulate(_ raw: Any?, role: String) {
        guard let value = raw as? [String: Any], let text = value["text"] as? String else { return }
        if role == "user" { inputText += text } else { outputText += text }
        if value["finished"] as? Bool == true { flush(role: role) }
    }

    private func flush(role: String) {
        let text = (role == "user" ? inputText : outputText).trimmingCharacters(in: .whitespacesAndNewlines)
        if role == "user" { inputText = "" } else { outputText = "" }
        guard !text.isEmpty else { return }
        transcript.append(Turn(role: role, text: text))
    }

    private func play(_ data: Data) {
        let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 24_000, channels: 1, interleaved: false)!
        let frames = AVAudioFrameCount(data.count / MemoryLayout<Int16>.size)
        guard frames > 0, let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames), let channel = buffer.int16ChannelData?[0] else { return }
        buffer.frameLength = frames
        data.copyBytes(to: UnsafeMutableRawBufferPointer(start: channel, count: data.count))
        queuedAudio += 1; mode = .speaking
        player.scheduleBuffer(buffer) { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.queuedAudio = max(0, self.queuedAudio - 1)
                if self.queuedAudio == 0, self.ready { self.mode = .listening }
            }
        }
    }

    private func send(_ object: [String: Any]) async throws {
        let data = try JSONSerialization.data(withJSONObject: object)
        try await socket?.send(.data(data))
    }

    private func sendJSON(_ object: [String: Any]) {
        Task { try? await send(object) }
    }

    private func teardownAudio() {
        if engine.isRunning { engine.inputNode.removeTap(onBus: 0); player.stop(); engine.stop() }
        converter = nil; queuedAudio = 0; level = 0
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
