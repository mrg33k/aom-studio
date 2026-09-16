// LiveAgentAvatarView.swift — Corner native iOS
// Patrik 2026-09-15: the assistant's profile picture is a looping animated
// character (agent-live.mp4, cropped to a centred circle), shown on the home
// screen in place of the sparkles mark and in every profile circle while
// talking to the agent. The "live agent". Muted, loops forever, no controls.

import SwiftUI
import AVFoundation

struct LiveAgentAvatarView: View {
    var size: CGFloat = 34

    var body: some View {
        LoopingVideoView(resource: "agent-live", ext: "mp4")
            .frame(width: size, height: size)
            .clipShape(Circle())
            .overlay(Circle().strokeBorder(Theme.accent.opacity(0.35), lineWidth: 1))
            .accessibilityLabel("Assistant")
    }
}

/// A muted AVPlayerLooper in a UIView, aspect-fill. One player per view;
/// pauses when the view leaves the window so background circles cost nothing.
struct LoopingVideoView: UIViewRepresentable {
    let resource: String
    let ext: String

    func makeUIView(context: Context) -> LoopingPlayerUIView {
        LoopingPlayerUIView(resource: resource, ext: ext)
    }

    func updateUIView(_ uiView: LoopingPlayerUIView, context: Context) {}
}

final class LoopingPlayerUIView: UIView {
    private let player = AVQueuePlayer()
    private var looper: AVPlayerLooper?

    override class var layerClass: AnyClass { AVPlayerLayer.self }
    private var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }

    init(resource: String, ext: String) {
        super.init(frame: .zero)
        // Patrik 2026-09-15: a silent avatar loop must never take the audio
        // session — music and podcasts keep playing (ambient + mix). The
        // dictation/voice services set their own category when they run.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        playerLayer.player = player
        playerLayer.videoGravity = .resizeAspectFill
        player.isMuted = true
        player.preventsDisplaySleepDuringVideoPlayback = false
        if let url = Bundle.main.url(forResource: resource, withExtension: ext) {
            let item = AVPlayerItem(url: url)
            looper = AVPlayerLooper(player: player, templateItem: item)
        }
        NotificationCenter.default.addObserver(
            self, selector: #selector(resume),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window == nil { player.pause() } else { player.play() }
    }

    @objc private func resume() { if window != nil { player.play() } }
}
