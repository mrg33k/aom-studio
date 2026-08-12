import SwiftUI
import UniformTypeIdentifiers

/// Native first-run contract. Account auth and mailbox search consent stay
/// separate; the latter begins with this session's JWT and finishes at the
/// provider's own consent page.
struct NativeOnboardingView: View {
    @EnvironmentObject private var api: CornerAPI
    @State private var step = 0
    @State private var brain = "corner-free"
    @State private var workspace = ""
    @State private var work = ""
    @State private var pickedFiles: [URL] = []
    @State private var importing = false
    @State private var busy = false
    @State private var error: String?
    @Environment(\.openURL) private var openURL

    private let brains = [
        ("corner-free", "Corner Free", "Start with notes, search, and a guided workspace."),
        ("claude", "Claude", "Connect your Claude account after setup."),
        ("chatgpt", "ChatGPT / Codex", "Use Corner’s connector or pair your computer."),
        ("gemini", "Gemini", "Connect where Gemini custom apps are available."),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s5) {
                    progress
                    if let error { Text(error).font(.hkCaption).foregroundStyle(Theme.danger) }
                    content
                }
                .padding(Theme.s5)
            }
            .groundBackground()
            .safeAreaInset(edge: .bottom) { controls }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
                if case .success(let urls) = result { pickedFiles = Array(urls.prefix(20)) }
            }
        }
    }

    private var progress: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text(step == 4 ? "YOUR CORNER IS READY" : "STEP \(step + 1) OF 4")
                .font(.hanken(10).weight(.bold)).tracking(1.2).foregroundStyle(Theme.accent)
            ProgressView(value: Double(step + 1), total: 5).tint(Theme.accent)
        }
    }

    @ViewBuilder private var content: some View {
        if step == 0 {
            title("Bring the work you already have.", "Corner turns notes, files, email, and unfinished ideas into projects you can move forward.")
            onboardingCard("Capture anything", "Notes, files, and loose ideas land in one searchable place.", "square.and.arrow.down")
            onboardingCard("Find the projects", "Corner suggests structure. You stay in control.", "square.grid.2x2")
            onboardingCard("Move it forward", "Agents work inside projects and bring decisions back.", "arrow.up.right")
        } else if step == 1 {
            title("Choose your starting brain.", "Corner Free lets everyone begin. Paid AI connections stay optional.")
            ForEach(brains, id: \.0) { item in
                Button { brain = item.0 } label: {
                    HStack { VStack(alignment: .leading) { Text(item.1).font(.hkBody.weight(.semibold)); Text(item.2).font(.hkCaption).foregroundStyle(Theme.inkSoft) }; Spacer(); Image(systemName: brain == item.0 ? "checkmark.circle.fill" : "circle") }
                    .padding().background(Theme.raised, in: RoundedRectangle(cornerRadius: 14)).overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(brain == item.0 ? Theme.accent : Theme.hairline))
                }.buttonStyle(.plain)
            }
        } else if step == 2 {
            title("Bring your world.", "Files can come with you now. Email is an optional, separate read-only connection.")
            Button { importing = true } label: { onboardingCard(pickedFiles.isEmpty ? "Choose files" : "\(pickedFiles.count) files selected", "Documents, notes, PDFs, and images.", "folder.badge.plus") }.buttonStyle(.plain)
            HStack(spacing: Theme.s3) {
                mailButton("Gmail", slug: "gmail")
                mailButton("Outlook", slug: "outlook")
            }
            Text("Account sign-in does not grant mailbox access. Corner asks separately and you can disconnect later in Settings.").font(.hkCaption).foregroundStyle(Theme.inkFaint)
        } else if step == 3 {
            title("Tell Corner what you’re carrying.", "A rough list is perfect. Corner will suggest the structure.")
            TextField("My work, Acme Studio, Alex’s Corner…", text: $workspace).textFieldStyle(.roundedBorder)
            TextEditor(text: $work).frame(minHeight: 150).padding(8).background(Theme.raised, in: RoundedRectangle(cornerRadius: 12)).overlay(alignment: .topLeading) { if work.isEmpty { Text("Launch the new site\nOrganize customer research\nPlan the renovation").foregroundStyle(Theme.inkFaint).padding(13).allowsHitTesting(false) } }
        } else {
            title("Welcome to \(workspace.isEmpty ? "Corner" : workspace).", "Your starting workspace is ready. Add a note, open a project, or ask Corner to organize what you imported.")
            onboardingCard("Brain", brains.first(where: { $0.0 == brain })?.1 ?? "Corner Free", "sparkles")
            onboardingCard("Sources", pickedFiles.isEmpty ? "Start fresh" : "\(pickedFiles.count) files selected", "tray.full")
        }
    }

    private func title(_ heading: String, _ copy: String) -> some View { VStack(alignment: .leading, spacing: Theme.s2) { Text(heading).font(.hkLargeTitle).foregroundStyle(Theme.ink); Text(copy).font(.hkBody).foregroundStyle(Theme.inkSoft) } }
    private func onboardingCard(_ heading: String, _ copy: String, _ icon: String) -> some View { HStack(spacing: Theme.s3) { Image(systemName: icon).foregroundStyle(Theme.accent).frame(width: 28); VStack(alignment: .leading) { Text(heading).font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink); Text(copy).font(.hkCaption).foregroundStyle(Theme.inkSoft) }; Spacer() }.padding().background(Theme.raised, in: RoundedRectangle(cornerRadius: 14)) }

    private func mailButton(_ title: String, slug: String) -> some View {
        Button {
            busy = true; error = nil
            Task {
                defer { busy = false }
                do { openURL(try await api.searchableMailOAuthURL(provider: slug)) }
                catch { self.error = "\(title) connection is not available yet." }
            }
        } label: {
            VStack(alignment: .leading, spacing: Theme.s2) {
                Image(systemName: "envelope.badge").foregroundStyle(Theme.accent)
                Text(title).font(.hkBody.weight(.semibold)).foregroundStyle(Theme.ink)
                Text("Connect read-only").font(.hkCaption).foregroundStyle(Theme.inkSoft)
            }
            .frame(maxWidth: .infinity, alignment: .leading).padding()
            .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain).disabled(busy)
    }

    private var controls: some View {
        HStack { if step > 0 && step < 4 { Button("Back") { step -= 1 } }; Spacer(); Button(step == 4 ? "Open my Corner" : "Continue") { advance() }.buttonStyle(.borderedProminent).disabled(busy || (step == 3 && workspace.trimmingCharacters(in: .whitespaces).isEmpty)) }
            .padding().background(.ultraThinMaterial)
    }

    private func advance() {
        if step < 3 { step += 1; return }
        if step == 4 { return }
        busy = true; error = nil
        let projects = work.split(whereSeparator: { $0 == "\n" || $0 == "," })
            .map { String($0).trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        Task { defer { busy = false }; do { try await api.completeOnboarding(workspace: workspace, brain: brain, projects: projects, files: pickedFiles); step = 4 } catch { self.error = "Setup paused. Please try again." } }
    }
}
