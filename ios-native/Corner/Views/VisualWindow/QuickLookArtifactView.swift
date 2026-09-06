// QuickLookArtifactView.swift — Corner native iOS
// corner:corner-v2 native plan Task 7.
//
// The generic adapter for deck, document, and genericFile tabs: the system's
// own viewer (pinch-zoom, scrub, share affordances) instead of a hand-built
// wireframe. A missing file is the recoverable-error tab.

import SwiftUI

struct QuickLookArtifactView: View {
    let url: URL

    @State private var exists: Bool?

    var body: some View {
        Group {
            if exists == false {
                ErrorArtifactView(title: url.lastPathComponent, message: "This file could not be opened.", onRetry: check)
            } else if exists == true {
                // Owned by FilePreviewView.swift (legacy Stage 2): one
                // QuickLook wrapper for the whole app, not two.
                QuickLookView(url: url)
                    .accessibilityIdentifier("visual-stage-quicklook")
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .task { check() }
            }
        }
    }

    private func check() {
        if url.isFileURL {
            exists = FileManager.default.fileExists(atPath: url.path)
        } else {
            exists = true
        }
    }
}
