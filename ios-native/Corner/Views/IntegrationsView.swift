// IntegrationsView.swift — Corner native iOS
// corner:native-ios — Integrations screen (read-only v1)
//
// Native port of IntegrationsModal.jsx (components/cv3/IntegrationsModal.jsx).
// Entry point: AccountView Settings > Integrations row.
//
// Read-only v1 scope:
//   • Loads connected state from /api/integrations/list (server-authoritative).
//   • Falls back to the bundled static list when the server is unreachable.
//   • Shows Available / Connected tabs + category filter chips + search.
//   • Status badges are informational only — no OAuth flows fire on this round.
//     Connecting integrations on mobile requires a deep-link callback handler
//     (a separate future round once the basics render correctly).

import SwiftUI

// MARK: - Integration model (mirrors integrations.json shape)

fileprivate struct Integration: Identifiable {
    var id: String { slug }
    let slug: String
    let name: String
    let category: String
    let description: String
    let authType: String      // "oauth" | "api_key"
    let oauthStatus: String?  // nil = available, "coming_soon" = coming soon
    let isSystemIntegration: Bool
    let systemNote: String?

    var isComingSoon: Bool { oauthStatus == "coming_soon" }
}

// MARK: - Category accent (mirrors IntegrationsModal.jsx categoryAccent())

private func categoryAccent(_ category: String) -> Color {
    switch category {
    case "Communication":     return Color(cv6: 0x10b981)
    case "Productivity":      return Color(cv6: 0x3b82f6)
    case "Developer":         return Color(cv6: 0x8b5cf6)
    case "Storage":           return Color(cv6: 0xf59e0b)
    case "Payments":          return Color(cv6: 0x22c55e)
    case "CRM":               return Color(cv6: 0xec4899)
    case "Marketing":         return Color(cv6: 0xef4444)
    case "Social":            return Color(cv6: 0x06b6d4)
    case "AI":                return Color(cv6: 0xa855f7)
    case "Analytics":         return Color(cv6: 0x14b8a6)
    case "Automation":        return Color(cv6: 0xf97316)
    case "Image Generation":  return Color(cv6: 0xd946ef)
    default:                  return Color(cv6: 0x10b981)
    }
}

// MARK: - Main view

struct IntegrationsView: View {
    @EnvironmentObject private var api: CornerAPI

    // Source-of-truth catalog. Starts with the bundled static list; stays static
    // on this round (server-returned list filtering is a multi-tenant feature the
    // native app doesn't need for v1 — Patrik is always AOM, always sees everything).
    private let catalog: [Integration] = IntegrationsView.bundledCatalog

    // Connected state from server — slug → {system?}
    @State private var connectedMap: [String: Bool] = [:]  // slug → isSystem
    @State private var loadState: LoadState = .idle

    @State private var selectedTab: Tab = .available
    @State private var searchText = ""
    @State private var activeCategory = "All"

    private enum Tab: Hashable { case available, connected }
    private enum LoadState { case idle, loading, done, failed }

    // MARK: Body

    var body: some View {
        Group {
            if loadState == .loading && connectedMap.isEmpty {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Theme.ground)
            } else {
                listBody
            }
        }
        .navigationTitle("Integrations")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    // MARK: List body

    private var listBody: some View {
        List {
            // ── Tabs ──────────────────────────────────────────────────────────
            Section {
                Picker("View", selection: $selectedTab) {
                    Text("Available · \(availableCount)").tag(Tab.available)
                    Text("Connected · \(connectedCount)").tag(Tab.connected)
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: Theme.s2, leading: 0, bottom: Theme.s2, trailing: 0))
            }
            .onChange(of: selectedTab) { _, _ in
                // Reset category filter when switching tabs so the grid is never empty.
                activeCategory = "All"
            }

            // ── Category chips (horizontal scroll) ──────────────────────────
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 7) {
                        ForEach(visibleCategories, id: \.self) { cat in
                            CategoryChip(label: cat, active: activeCategory == cat) {
                                activeCategory = cat
                            }
                        }
                    }
                    .padding(.horizontal, 2)
                    .padding(.vertical, 2)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            }

            // ── Integration cards ────────────────────────────────────────────
            if filtered.isEmpty {
                Section {
                    Text(emptyMessage)
                        .font(.hanken(13))
                        .foregroundStyle(Theme.inkSoft)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Theme.s6)
                        .listRowBackground(Color.clear)
                }
            } else {
                Section {
                    ForEach(filtered) { integration in
                        IntegrationRow(
                            integration: integration,
                            isConnected: connectedMap[integration.slug] != nil,
                            isSystem: connectedMap[integration.slug] == true || integration.isSystemIntegration
                        )
                        .listRowBackground(Theme.raised)
                    }
                }
            }

            // ── Footer note ──────────────────────────────────────────────────
            if loadState == .done {
                Section {
                    Text("Connecting integrations from this screen is coming in a later update. Connect from the web dashboard for now — your status will sync here automatically.")
                        .font(.hkCaption)
                        .foregroundStyle(Theme.inkFaint)
                        .listRowBackground(Color.clear)
                }
            } else if loadState == .failed {
                Section {
                    Label("Could not reach the server. Showing local list.", systemImage: "wifi.slash")
                        .font(.hkCaption)
                        .foregroundStyle(Theme.inkSoft)
                        .listRowBackground(Color.clear)
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search integrations")
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Theme.ground)
    }

    // MARK: Computed

    private var connectedCount: Int { connectedMap.count }
    private var availableCount: Int { max(catalog.count - connectedCount, 0) }

    // Categories present in the currently-visible tab (+ "All").
    private var visibleCategories: [String] {
        var seen = OrderedSet<String>()
        seen.insert("All")
        let source = selectedTab == .connected
            ? catalog.filter { connectedMap[$0.slug] != nil }
            : catalog.filter { connectedMap[$0.slug] == nil }
        for i in source { seen.insert(i.category) }
        return seen.elements
    }

    private var filtered: [Integration] {
        let q = searchText.trimmingCharacters(in: .whitespaces).lowercased()
        return catalog.filter { i in
            let connected = connectedMap[i.slug] != nil
            if selectedTab == .connected && !connected { return false }
            if selectedTab == .available && connected { return false }
            if activeCategory != "All" && i.category != activeCategory { return false }
            if !q.isEmpty {
                let bag = "\(i.name) \(i.category) \(i.description)".lowercased()
                if !bag.contains(q) { return false }
            }
            return true
        }
    }

    private var emptyMessage: String {
        if selectedTab == .connected {
            return "No integrations connected yet.\nBrowse Available to see what's possible."
        }
        return "No integrations match your search."
    }

    // MARK: Load

    private func load() async {
        loadState = .loading
        do {
            let entries = try await api.fetchIntegrationsList()
            var map: [String: Bool] = [:]
            for entry in entries where entry.status == "connected" {
                map[entry.slug] = entry.system == true
            }
            connectedMap = map
            if !map.isEmpty { selectedTab = .connected }
            loadState = .done
        } catch {
            loadState = .failed
        }
    }
}

// MARK: - Integration row

private struct IntegrationRow: View {
    let integration: Integration
    let isConnected: Bool
    let isSystem: Bool

    private var accent: Color { categoryAccent(integration.category) }
    private var letter: String { String(integration.name.prefix(1)).uppercased() }

    var body: some View {
        HStack(alignment: .top, spacing: Theme.s3) {
            // Letter icon block — mirrors IntegrationsModal.jsx IconBlock
            Text(letter)
                .font(.system(size: 15, weight: .bold).monospaced())
                .foregroundStyle(accent)
                .frame(width: 36, height: 36)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(accent.opacity(0.12))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .strokeBorder(accent.opacity(0.28), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 3) {
                // Name + category + platform badge
                HStack(spacing: 5) {
                    Text(integration.name)
                        .font(.hanken(13.5).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Text(integration.category.uppercased())
                        .font(.hanken(9).weight(.bold))
                        .foregroundStyle(Theme.inkFaint)
                        .tracking(0.5)
                        .lineLimit(1)
                    if isSystem {
                        Text("Platform")
                            .font(.hanken(9.5).weight(.bold))
                            .foregroundStyle(Color(cv6: 0x93c5fd))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(
                                Capsule()
                                    .fill(Color(cv6: 0x3b82f6, opacity: 0.16))
                                    .overlay(Capsule().strokeBorder(Color(cv6: 0x3b82f6, opacity: 0.32), lineWidth: 1))
                            )
                    }
                }

                // Description
                Text(integration.description)
                    .font(.hanken(12))
                    .foregroundStyle(Theme.inkSoft)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                // Status pill
                statusBadge
                    .padding(.top, 3)
            }
        }
        .padding(.vertical, Theme.s1)
    }

    @ViewBuilder
    private var statusBadge: some View {
        if isConnected && isSystem {
            statusPill(
                "Connected · platform",
                fg: Color(cv6: 0x93c5fd),
                bg: Color(cv6: 0x3b82f6, opacity: 0.12),
                border: Color(cv6: 0x3b82f6, opacity: 0.30)
            )
        } else if isConnected {
            statusPill(
                "Connected",
                fg: Theme.success,
                bg: Theme.success.opacity(0.12),
                border: Theme.success.opacity(0.30)
            )
        } else if integration.isComingSoon {
            statusPill(
                "Coming soon",
                fg: Theme.inkSoft,
                bg: Theme.chipFill,
                border: Theme.hairline
            )
        } else {
            statusPill(
                "Not connected",
                fg: Theme.inkFaint,
                bg: Theme.chipFill,
                border: Theme.hairline
            )
        }
    }

    private func statusPill(_ label: String, fg: Color, bg: Color, border: Color) -> some View {
        Text(label)
            .font(.hanken(11).weight(.semibold))
            .foregroundStyle(fg)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(
                Capsule()
                    .fill(bg)
                    .overlay(Capsule().strokeBorder(border, lineWidth: 1))
            )
    }
}

// MARK: - Category chip

private struct CategoryChip: View {
    let label: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.hanken(11.5).weight(.semibold))
                .foregroundStyle(active ? Theme.accent : Theme.inkSoft)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    Capsule()
                        .fill(active ? Theme.accentWeak : Theme.chipFill)
                        .overlay(Capsule().strokeBorder(active ? Theme.accent : Theme.hairline, lineWidth: 1))
                )
        }
        .buttonStyle(.plain)
        .animation(.easeOut(duration: 0.12), value: active)
    }
}

// MARK: - OrderedSet (unique + insertion-order preserved)

private struct OrderedSet<T: Hashable> {
    private(set) var elements: [T] = []
    private var seen: Set<T> = []

    mutating func insert(_ element: T) {
        if seen.insert(element).inserted {
            elements.append(element)
        }
    }
}

// MARK: - Bundled catalog (mirrors src/data/integrations.json)

extension IntegrationsView {
    fileprivate static let bundledCatalog: [Integration] = [
        // ── Communication ───────────────────────────────────────────────────
        .init(slug: "gmail",           name: "Gmail",              category: "Communication",    description: "Read and send email on your behalf.",                     authType: "oauth",    oauthStatus: nil,            isSystemIntegration: false, systemNote: nil),
        .init(slug: "google-calendar", name: "Google Calendar",    category: "Communication",    description: "Read and create calendar events.",                        authType: "oauth",    oauthStatus: nil,            isSystemIntegration: false, systemNote: nil),
        .init(slug: "outlook",         name: "Outlook",            category: "Communication",    description: "Microsoft email + calendar.",                             authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "slack",           name: "Slack",              category: "Communication",    description: "Post messages and read channels.",                        authType: "oauth",    oauthStatus: nil,            isSystemIntegration: false, systemNote: nil),
        .init(slug: "discord",         name: "Discord",            category: "Communication",    description: "Post to channels and read messages.",                     authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "zoom",            name: "Zoom",               category: "Communication",    description: "Schedule and join meetings.",                             authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "loom",            name: "Loom",               category: "Communication",    description: "Generate and share video messages.",                      authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "telegram",        name: "Telegram",           category: "Communication",    description: "Send and receive messages.",                              authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "twilio",          name: "Twilio",             category: "Communication",    description: "SMS, voice, and WhatsApp.",                               authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── Productivity ────────────────────────────────────────────────────
        .init(slug: "notion",          name: "Notion",             category: "Productivity",     description: "Read and write pages and databases.",                     authType: "oauth",    oauthStatus: nil,            isSystemIntegration: false, systemNote: nil),
        .init(slug: "asana",           name: "Asana",              category: "Productivity",     description: "Create and update tasks.",                                authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "trello",          name: "Trello",             category: "Productivity",     description: "Boards, lists, cards.",                                   authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "linear",          name: "Linear",             category: "Productivity",     description: "Issue tracker for product teams.",                        authType: "oauth",    oauthStatus: nil,            isSystemIntegration: false, systemNote: nil),
        .init(slug: "jira",            name: "Jira",               category: "Productivity",     description: "Issue tracking and project management.",                  authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "calendly",        name: "Calendly",           category: "Productivity",     description: "Scheduling links and events.",                            authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "airtable",        name: "Airtable",           category: "Productivity",     description: "Spreadsheet-database hybrid.",                            authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── Developer ───────────────────────────────────────────────────────
        .init(slug: "github",          name: "GitHub",             category: "Developer",        description: "Repos, PRs, issues, actions.",                            authType: "oauth",    oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Workers commit + push to GitHub on every task."),
        .init(slug: "gitlab",          name: "GitLab",             category: "Developer",        description: "Repos, merge requests, pipelines.",                       authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "vercel",          name: "Vercel",             category: "Developer",        description: "Deploys and projects.",                                   authType: "oauth",    oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Every aom-studio push deploys via Vercel."),
        .init(slug: "supabase",        name: "Supabase",           category: "Developer",        description: "Postgres, auth, storage, edge functions.",                authType: "api_key",  oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Corner's primary data store."),
        .init(slug: "figma",           name: "Figma",              category: "Developer",        description: "Design files and dev mode.",                              authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── Storage ─────────────────────────────────────────────────────────
        .init(slug: "google-drive",    name: "Google Drive",       category: "Storage",          description: "Files and folders in your Google account.",               authType: "oauth",    oauthStatus: nil,            isSystemIntegration: false, systemNote: nil),
        .init(slug: "dropbox",         name: "Dropbox",            category: "Storage",          description: "File sync and sharing.",                                  authType: "oauth",    oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level via local Dropbox sync."),
        .init(slug: "microsoft-365",   name: "Microsoft 365",      category: "Storage",          description: "OneDrive, Word, Excel.",                                  authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── Payments ────────────────────────────────────────────────────────
        .init(slug: "stripe",          name: "Stripe",             category: "Payments",         description: "Payments, subscriptions, invoices.",                      authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "square",          name: "Square",             category: "Payments",         description: "Point-of-sale and online payments.",                      authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "quickbooks",      name: "QuickBooks",         category: "Payments",         description: "Accounting and bookkeeping.",                             authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── CRM ─────────────────────────────────────────────────────────────
        .init(slug: "hubspot",         name: "HubSpot",            category: "CRM",              description: "Contacts, deals, marketing.",                             authType: "oauth",    oauthStatus: nil,            isSystemIntegration: false, systemNote: nil),
        .init(slug: "salesforce",      name: "Salesforce",         category: "CRM",              description: "Enterprise CRM.",                                         authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "pipedrive",       name: "Pipedrive",          category: "CRM",              description: "Sales pipeline.",                                         authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "apollo",          name: "Apollo.io",          category: "CRM",              description: "Sales intelligence and outreach.",                        authType: "api_key",  oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Jacob agent's outreach backbone."),
        // ── Marketing ───────────────────────────────────────────────────────
        .init(slug: "mailchimp",       name: "Mailchimp",          category: "Marketing",        description: "Email marketing campaigns.",                              authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "sendgrid",        name: "SendGrid",           category: "Marketing",        description: "Transactional email.",                                    authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "resend",          name: "Resend",             category: "Marketing",        description: "Developer-first email.",                                  authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── Social ──────────────────────────────────────────────────────────
        .init(slug: "twitter",         name: "Twitter / X",        category: "Social",           description: "Read and post.",                                          authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "instagram",       name: "Instagram",          category: "Social",           description: "Post and read.",                                          authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "tiktok",          name: "TikTok",             category: "Social",           description: "Upload and read.",                                        authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "linkedin",        name: "LinkedIn",           category: "Social",           description: "Post and read.",                                          authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "youtube",         name: "YouTube",            category: "Social",           description: "Upload and manage videos.",                               authType: "oauth",    oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "postiz",          name: "Postiz",             category: "Social",           description: "Multi-platform social scheduling.",                       authType: "api_key",  oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Tony agent's posting backbone."),
        // ── AI ──────────────────────────────────────────────────────────────
        .init(slug: "openai",          name: "OpenAI",             category: "AI",               description: "GPT models, embeddings, vision.",                         authType: "api_key",  oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Used for transcription + embeddings."),
        .init(slug: "anthropic",       name: "Anthropic",          category: "AI",               description: "Claude models and API.",                                  authType: "api_key",  oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Every agent runs on Claude."),
        .init(slug: "elevenlabs",      name: "ElevenLabs",         category: "AI",               description: "Voice synthesis.",                                        authType: "api_key",  oauthStatus: nil,            isSystemIntegration: true,  systemNote: "Wired at platform level. Voice chat synthesis."),
        .init(slug: "vapi",            name: "Vapi",               category: "AI",               description: "Voice AI agents.",                                        authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── Analytics ───────────────────────────────────────────────────────
        .init(slug: "posthog",         name: "PostHog",            category: "Analytics",        description: "Product analytics.",                                      authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "segment",         name: "Segment",            category: "Analytics",        description: "Customer data pipeline.",                                 authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "mixpanel",        name: "Mixpanel",           category: "Analytics",        description: "Event analytics.",                                        authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        // ── Automation ──────────────────────────────────────────────────────
        .init(slug: "zapier",          name: "Zapier",             category: "Automation",       description: "Workflow automation across apps.",                        authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "make",            name: "Make",               category: "Automation",       description: "Visual automation (formerly Integromat).",                authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "n8n",             name: "n8n",                category: "Automation",       description: "Self-hostable workflow automation.",                      authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
        .init(slug: "pipedream",       name: "Pipedream",          category: "Automation",       description: "Serverless workflows.",                                   authType: "api_key",  oauthStatus: "coming_soon",  isSystemIntegration: false, systemNote: nil),
    ]
}
