// VideoArtifactView.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// AVPlayerViewController plays file and remote video with the system's own
// controls; YouTube renders through a WKWebView embed of the IFrame API
// (YouTube's chrome appears when interacting — same as the design's note).
// (Task 8 adds the "Pin moment" time anchor against the player's clock.)

import AVKit
import SwiftUI
import WebKit

struct VideoArtifactView: View {
    let url: URL
    /// Present when the host supports review (Task 8): "Pin moment" drops a
    /// time anchor against the player's clock.
    var review: V2ReviewStore?

    @State private var player: AVPlayer?
    @State private var failed = false

    var body: some View {
        Group {
            if failed {
                ErrorArtifactView(title: url.lastPathComponent, message: "This video could not be played.", onRetry: load)
            } else if let player {
                VStack(spacing: 0) {
                    PlayerView(player: player)
                        .accessibilityIdentifier("visual-stage-video")
                    if let review {
                        VideoReviewBar(
                            review: review,
                            seconds: player.currentTime().seconds,
                            onPin: {
                                review.addPin(
                                    .time(seconds: max(player.currentTime().seconds, 0), x: nil, y: nil),
                                    text: ""
                                )
                            }
                        )
                    }
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .task { load() }
            }
        }
        .onDisappear { player?.pause() }
    }

    private func clock(_ seconds: Double) -> String {
        guard seconds.isFinite else { return "0:00" }
        let total = Int(max(seconds, 0))
        return String(format: "%d:%02d", total / 60, total % 60)
    }

    private func load() {
        failed = false
        if url.isFileURL {
            guard FileManager.default.fileExists(atPath: url.path) else {
                failed = true
                return
            }
        }
        player = AVPlayer(url: url)
    }
}

// MARK: - review bar (observed)

/// The clock + pin count + Pin moment row. Owns an `@ObservedObject`
/// subscription: the parent renderer holds the store in a plain property, so
/// without this the count would freeze at whatever the last parent render
/// saw (measured: "3 pins" after a sent reset).
struct VideoReviewBar: View {
    @ObservedObject var review: V2ReviewStore
    let seconds: Double
    let onPin: () -> Void

    var body: some View {
        HStack(spacing: Theme.s2) {
            Text(Self.clock(seconds))
                .font(.hanken(12).monospacedDigit())
                .foregroundStyle(Theme.inkSoft)
                .accessibilityIdentifier("visual-video-time")
            Spacer(minLength: 0)
            Text("\(review.pins.count) pin\(review.pins.count == 1 ? "" : "s")")
                .font(.hanken(12))
                .foregroundStyle(Theme.inkSoft)
            Button("Pin moment", action: onPin)
                .font(.hanken(13).weight(.semibold))
                .foregroundStyle(Theme.accent)
                .accessibilityIdentifier("visual-pin-moment")
        }
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
    }

    private static func clock(_ seconds: Double) -> String {
        guard seconds.isFinite else { return "0:00" }
        let total = Int(max(seconds, 0))
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}

private struct PlayerView: UIViewControllerRepresentable {
    let player: AVPlayer

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = true
        return controller
    }

    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {}
}

// MARK: - YouTube (IFrame embed)

/// The watch URL's id (`v=` or the `youtu.be` path) inside the IFrame API
/// player. Anything else is the recoverable-error tab, not a blank frame.
struct YouTubeArtifactView: View {
    let url: URL

    private var videoID: String? { Self.videoID(from: url) }

    var body: some View {
        Group {
            if let videoID {
                EmbedView(videoID: videoID)
                    .accessibilityIdentifier("visual-stage-youtube")
            } else {
                ErrorArtifactView(title: "", message: "This YouTube link has no video id.", onRetry: {})
            }
        }
    }

    static func videoID(from url: URL) -> String? {
        if url.host?.contains("youtu.be") == true {
            let id = url.pathComponents.dropFirst().first
            return id?.isEmpty == false ? id : nil
        }
        return URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "v" })?.value
    }
}

private struct EmbedView: UIViewRepresentable {
    let videoID: String

    func makeUIView(context: Context) -> WKWebView {
        WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        let html = """
        <html><body style="margin:0;background:#000">
        <div id="p"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
        var tag=document.createElement('script');tag.src="https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);var player;
        function onYouTubeIframeAPIReady(){player=new YT.Player('p',{width:'100%',height:'100%',videoId:'\(videoID)'});}
        </script></body></html>
        """
        view.loadHTMLString(html, baseURL: nil)
    }
}
