# Convex Multi-Agent — Mission Context

**Mission path:** `corner:convex-multi-agent`
**Status:** IN PROGRESS

The iOS room briefly showed history and then rendered empty. Live inspection found
three conflicting paths: build 16 targeted `descriptive-flamingo-718`, whose API
is the unwanted test schema; the data-bearing Corner backend and Vercel app use
`neat-pony-216`; and iOS foreground catch-up fetched Supabase and replaced visible
Convex rows. The empty `beaming-falcon-441` deployment was a stale local link.

The live Convex backend now owns the message loop and the imported history. The
standalone functions schedule dispatch in the user-message transaction, route a
bounded subset of the real Corner roster, generate grounded responses from room
history, and persist replies in the same room. CV6 and native code are migrated
to the data-bearing schema; production web deployment and signed-in simulator
acceptance remain.
