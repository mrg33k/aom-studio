# Decision record — Corner iOS chat header, composer, room context sheet (2026-09-15)

## agent

Claude Fable 5.1, working the session with Patrik Matheson.

## artifact

Corner/Views/ChatView.swift (v2NavBar header: 48pt live avatar, soft fall-off, glass controls, tap-to-open room menu; composer that grows Gemini-style; hand-off pill), Corner/Views/LiveAgentAvatarView.swift, Corner/Views/V2RoomMenuSheet.swift (room context sheet: Truth, Notes, Files by category, Journal, Instructions, Manage room), Corner/Views/V2HomeWelcome.swift (live avatar, animated suggestions), Corner/Views/V2DrawerView.swift (Assistant box). Commits b43abc9c, 235ac1af, ffae9dd4, 2ddda7d8, d8bda6a4, 52002daf on aom-studio main.

## call

I am shipping this because each screen now has one obvious job and one obvious action. Home: talk to the assistant (empty composer, the fish, suggestion cards that open a room). Chat header: know who and where you are, tap the name to see what the assistant knows. Room sheet: see the room's truth, files, journal, and manage it (rename, move, archive). Composer: write, attach, send, with the controls under the text once it wraps (the Gemini reference Patrik supplied). I chose Apple's Messages layout for the header (bare avatar + name, no pill) over a glass capsule I tried first: the capsule read as a blob at 48pt. I chose to keep the files list inside the sheet grouped by category with counts rather than a flat top-20, per Patrik's "bubbly, categorized" ask.

## measured

Simulator screenshots taken and read this session (iPhone 17 Pro, 971E7446-394B-4EF6-9796-8D9D1F916994):
- Header: "Wolfpack" title centered under a 48pt animated avatar, two 44pt glass round buttons, messages fade under the bar (screenshot after build 235ac1af).
- Composer: two-line draft renders text over a row of plus / mic / send inside a 24pt-radius card; magic and send align bottom (screenshot after 52002daf).
- Room sheet, Wolfpack: Truth 34 rows, Files 13 (Documents 6, Images 2, Other 5), Journal 50, sections in raised cards with tinted icon badges (screenshot after backend fix 122a60c).
- Clear: room empty after /clear and still empty 12 s later (screenshot after 438bd7ef).
xcodebuild: BUILD SUCCEEDED on every install this session; CornerTests grouping tests 4/4 pass (chat lane report).
design_spacing_check.py / design_screen_check.py do not parse SwiftUI; the measured FAILs the stop hook printed are archived HTML kits under archives/ and .agents/, untouched tonight.

## uncertain

- The header fade uses a fixed 96pt bar and a gradient that bleeds 40pt under it. On a long thread the first step-ticker line sits half-faded under the bar; I judged it acceptable, a sharper eye may call it clutter.
- SwiftUI spacing in the room sheet was set by hand (12/14/16/24) rather than measured with the spacing script, which cannot read SwiftUI. There may be off-scale values in V2RoomMenuSheet.swift that a 4/8 audit would flag.
- The composer's grown state was verified with a two-line draft only; a ten-line draft plus the keyboard was not screenshotted, so the 8-line cap could clip on small phones.
- The suggestion-card entrance animation was not observed frame by frame (the sim reboot ate the moment); the chat lane's report is the only evidence it staggers.
- Glass effect is iOS 26 only; on iOS 17/18 the fallback disc was not screenshotted.

## would_change

A real spacing audit of the SwiftUI views against one 4/8 scale; a ten-line composer test on an iPhone SE-class simulator; a bespoke set of category icons instead of SF Symbols; the "Notes gap" placeholder replaced by real synced notes (backend lane in progress); Convert-to-sub-mission wired live (rooms workflow in progress).

## risk

If the header fade or the composer growth is wrong, Patrik sees it on every message on his phone and trust in the "10/10 iOS" bar drops fast. If the room sheet misreads timestamps again, every section reads empty and looks broken (already happened once tonight and was fixed). Blast radius is Patrik and Ash on TestFlight, no clients.
