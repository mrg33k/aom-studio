// CornerWidgetsBundle.swift — Corner native iOS widget extension
// corner:native-ios R18 smoothness pass, round N7
//
// The Live Activity for a running turn: lock screen banner + Dynamic Island.
// The presentation speaks the SAME one status vocabulary as the in-app header
// pill — the lock screen can never disagree with the room.

import WidgetKit
import SwiftUI
import ActivityKit

@main
struct CornerWidgetsBundle: WidgetBundle {
    var body: some Widget {
        TurnLiveActivity()
    }
}

struct TurnLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TurnActivityAttributes.self) { context in
            // Lock screen / banner presentation.
            LockScreenTurnView(context: context)
                .activityBackgroundTint(Color(red: 0.047, green: 0.071, blue: 0.094))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    StatusDot(done: context.state.done)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.roomTitle)
                            .font(.system(size: 13, weight: .semibold))
                        Text(context.state.stepLabel.isEmpty
                             ? context.state.statusWord
                             : context.state.stepLabel)
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    elapsed(context)
                        .padding(.trailing, 6)
                }
            } compactLeading: {
                StatusDot(done: context.state.done)
            } compactTrailing: {
                elapsed(context)
            } minimal: {
                StatusDot(done: context.state.done)
            }
        }
    }

    @ViewBuilder
    private func elapsed(_ context: ActivityViewContext<TurnActivityAttributes>) -> some View {
        if context.state.done {
            Text(context.state.statusWord)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.secondary)
        } else {
            // A timer interval costs ZERO update budget — the system counts.
            Text(timerInterval: context.state.startedAt...Date(timeIntervalSinceNow: 60 * 60 * 8),
                 countsDown: false)
                .font(.system(size: 12, weight: .semibold).monospacedDigit())
                .frame(maxWidth: 44)
        }
    }
}

private struct LockScreenTurnView: View {
    let context: ActivityViewContext<TurnActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                StatusDot(done: context.state.done)
                Text(context.attributes.roomTitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer(minLength: 0)
                if context.state.done {
                    Text(context.state.statusWord)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.75))
                } else {
                    HStack(spacing: 6) {
                        Text(context.state.statusWord)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(red: 0.62, green: 0.87, blue: 0.36))
                        Text(timerInterval: context.state.startedAt...Date(timeIntervalSinceNow: 60 * 60 * 8),
                             countsDown: false)
                            .font(.system(size: 13, weight: .semibold).monospacedDigit())
                            .foregroundStyle(.white.opacity(0.75))
                            .frame(maxWidth: 52)
                    }
                }
            }
            if !context.state.stepLabel.isEmpty {
                Text(context.state.stepLabel)
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.65))
                    .lineLimit(1)
            }
        }
        .padding(14)
    }
}

private struct StatusDot: View {
    let done: Bool
    var body: some View {
        Circle()
            .fill(done ? Color.white.opacity(0.4) : Color(red: 0.23, green: 0.51, blue: 0.96))
            .frame(width: 9, height: 9)
    }
}
