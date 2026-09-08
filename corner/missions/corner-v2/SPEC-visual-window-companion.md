# SPEC — the Visual Window is a live companion (Patrik, 2026-09-07 1:08-1:12 PM, verbatim intent)

## Behaviour on every surface
- The agent **communicates visually as it speaks**: mention a file → it opens in the Visual Window; move on to
  something else → it closes. Closed = a small floating window top-right (FaceTime style) that shows what is
  happening — a quick reference — until the agent or the user pulls it back up.
- **The eye icon** sits top-right on every chat. Mobile: tap once → FaceTime mode; tap again → the full drawer
  context window; tap again → hidden (the icon stays; the agent can pull the window back up when it wants
  you to see something). Desktop: tap once → FaceTime mode; tap again → the full context preview (as today).
- **Desktop multi-chat**: chats condense so you can talk to several at once (max about eight). Only ONE chat
  holds the context window; opening a context window covers every chat except the one you are talking to;
  close it to talk to the others again.
- **Reviewing a website on the phone**: the desktop page is shown like a horizontal video on a vertical phone —
  about a third of the screen, scrollable inside — the cleanest way to see the computer version on mobile.
- **Shared awareness**: the agent must always know what it and the user are looking at right now (open tab,
  page, pin, scroll position) and which files the user has available. Files: Patrik's tenant has everything on
  this Mac; other users have their project folder plus a desktop app that plugs their computer into Corner so
  the agents can work from there (the gateway).

## Why it matters
"The system is very reliant on the agent being aware of what them and the user are looking at at the same
time, as well as the agent being aware of the files the user has available."

## Rounds (order)
1. Backend: view state per thread (`viewState {threadId, mode: facetime|full|hidden, tabId, page, scroll}`) written
   by the client, read in the pack ("You are both looking at: …"); agent-driven open/close events.
2. Native: eye icon + three modes (FaceTime PiP, full drawer, hidden), agent-driven open/close, website-as-video.
3. Desktop: eye icon + FaceTime mode, condensed multi-chat (≤ 8), one context window at a time.
4. Chat lane: the driver narrates through the window (open on mention, close on move-on) and reads view state.
