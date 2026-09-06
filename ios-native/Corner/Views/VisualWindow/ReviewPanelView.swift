// ReviewPanelView.swift — Corner native iOS
// corner:corner-v2 native plan Task 8.
//
// Note editing and Send for the shared review loop. Checklist and Send show
// only in review mode (HANDOFF §4); pinning turns review on automatically,
// sending turns it off and resets the pins. "Nothing to change, carry on"
// is a normal thread text send, not a checklist submission. No approval
// button anywhere in this loop.

import SwiftUI

/// Note editing + Send for one artifact. The store holds the pins; this view
/// edits the selected pin's text and submits once per tap.
struct ReviewPanelView: View {
    @EnvironmentObject private var review: V2ReviewStore
    let artifactID: String
    let onCarryOn: () -> Void

    @State private var failed = false

    private var selected: ReviewPin? {
        review.pins.first { $0.clientID == review.selectedPinID }
            ?? review.pins.last
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            if review.pins.isEmpty {
                // P054: the empty state reads as the design's status card —
                // honest copy (no agent line arrived), same shape.
                HStack(alignment: .top, spacing: 10) {
                    Circle()
                        .fill(Theme.success)
                        .frame(width: 8, height: 8)
                        .padding(.top, 5)
                    Text("Tap the file where something should change.")
                        .font(.hanken(14))
                        .foregroundStyle(Theme.ink)
                        .accessibilityIdentifier("review-empty")
                    Spacer(minLength: 0)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else {
                ForEach(Array(review.pins.enumerated()), id: \.element.clientID) { index, pin in
                    HStack(spacing: Theme.s2) {
                        Text("\(index + 1)")
                            .font(.hanken(12).weight(.bold))
                            .foregroundStyle(review.selectedPinID == pin.clientID ? Color.white : Theme.accent)
                            .frame(width: 22, height: 22)
                            .background(
                                pin.isDone ? Theme.success
                                    : review.selectedPinID == pin.clientID ? Theme.accent
                                    : Theme.accentWeak,
                                in: Circle()
                            )
                        Button {
                            review.selectedPinID = pin.clientID
                        } label: {
                            Text(pinLabel(pin))
                                .font(.hanken(13))
                                .foregroundStyle(Theme.ink)
                                .lineLimit(1)
                            Spacer(minLength: 0)
                        }
                        .accessibilityIdentifier("review-pin")
                        .accessibilityLabel("Pin \(index + 1): \(pinLabel(pin))")
                        Button {
                            review.removePin(id: pin.clientID ?? pin.id)
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(Theme.inkFaint)
                                .frame(width: 24, height: 24)
                        }
                        .accessibilityIdentifier("review-pin-remove")
                        .accessibilityLabel("Remove pin \(index + 1)")
                    }
                }
                if let selected, let clientID = selected.clientID {
                    TextField("Write the change…", text: Binding(
                        get: { selected.text },
                        set: { review.updateText(id: clientID, text: $0) }
                    ), axis: .vertical)
                    .font(.hanken(14))
                    .lineLimit(1...3)
                    .foregroundStyle(Theme.ink)
                    .padding(Theme.s2)
                    .background(Theme.raised2, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .accessibilityIdentifier("review-note")
                }
            }
            VStack(alignment: .leading, spacing: Theme.s2) {
                // P053: Send is 50px r14 — chip fill + muted `Pin a change
                // to send` until a pin carries text.
                Button(review.sendTitle) {
                    Task {
                        failed = false
                        do {
                            try await review.submit(artifactID: artifactID)
                            review.reset()
                        } catch {
                            failed = true
                        }
                    }
                }
                .font(.hanken(14).weight(.semibold))
                .foregroundStyle(review.canSend ? Color.white : Theme.inkSoft)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    review.canSend ? Theme.accent : Theme.chipFill,
                    in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                )
                .disabled(!review.canSend)
                .accessibilityIdentifier("review-send")
                Button("Nothing to change, carry on") { onCarryOn() }
                    .font(.hanken(13).weight(.medium))
                    .foregroundStyle(Theme.inkSoft)
                    .accessibilityIdentifier("review-carry-on")
            }
            if failed {
                Text("The checklist did not send. Try again.")
                    .font(.hanken(12))
                    .foregroundStyle(Theme.warning)
                    .accessibilityIdentifier("review-failed")
            }
        }
        .overlay(alignment: .top) {
            if review.limitHit {
                Button { review.clearLimitHit() } label: {
                    Text("Max 4 pins per artifact")
                        .font(.hanken(12).weight(.semibold))
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.black.opacity(0.85), in: Capsule())
                }
                .accessibilityIdentifier("review-limit-toast")
                .offset(y: -36)
            }
        }
    }

    private func pinLabel(_ pin: ReviewPin) -> String {
        let trimmed = pin.text.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { return trimmed }
        switch pin.anchor {
        case .point(let page, _, _):
            return page.map { "Page \($0) pin" } ?? "Pin"
        case .time(let seconds, _, _):
            return "Moment \(Self.clock(seconds))"
        case .line(let number):
            return "Line \(number)"
        }
    }

    private static func clock(_ seconds: Double) -> String {
        let total = Int(seconds)
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}

// MARK: - stage markers (HANDOFF §6: numbered, selected white, done green)
//
// `ObservedStageMarkers` owns the store subscription. Renderer views hold
// the store in a plain property, and SwiftUI skips re-rendering children
// whose inputs are unchanged (measured: the video count froze at "3 pins"
// after a sent reset) — reads through this view can never freeze.

/// Point-pin markers for a stage of known size. `page` filters page-aware
/// markers (PDF); nil shows every point pin (photo).
struct ObservedStageMarkers: View {
    @ObservedObject var review: V2ReviewStore
    let size: CGSize
    let page: Int?

    var body: some View {
        ForEach(Array(review.pins.enumerated()), id: \.element.clientID) { index, pin in
            if case .point(let pinPage, let x, let y) = pin.anchor,
               page == nil || pinPage == nil || pinPage == page {
                PinMarkerButton(
                    number: index + 1,
                    selected: review.selectedPinID == pin.clientID,
                    done: pin.isDone
                ) {
                    review.selectedPinID = pin.clientID
                }
                .position(
                    x: CGFloat(x) / 100 * size.width,
                    y: CGFloat(y) / 100 * size.height
                )
            }
        }
    }
}

/// A numbered pin marker on an artifact stage. A leaf button: tap selects.
struct PinMarkerButton: View {
    let number: Int
    let selected: Bool
    let done: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("\(number)")
                .font(.hanken(11).weight(.bold))
                .foregroundStyle(selected ? Color.black : Color.white)
                .frame(width: 24, height: 24)
                .background(
                    done ? Theme.success : selected ? Color.white : Theme.accent,
                    in: Circle()
                )
                .overlay(Circle().strokeBorder(Color.white.opacity(0.7), lineWidth: 1))
        }
        .accessibilityIdentifier("review-pin")
        .accessibilityLabel("Pin \(number)")
    }
}
