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
to the data-bearing schema; the production web deployment is live and native
build 17 is valid in App Store Connect. Room previews are now maintained in the
same transaction as messages, eliminating 675 per-refresh message subqueries.
Signed-in cross-surface acceptance remains, as does the resident-agent context
bridge: current Convex agents know room history but cannot inspect live repo or
deployment state.

Native signed-in acceptance now passes: a simulator-authored user message and
Bobby reply were visible on the second simulator, and room history survived an
immediate and settled reopen. The remaining parity risk is room identity, not
message transport. Migrated legacy and preexisting Convex-native rooms overlap,
so the rail can display duplicate semantic rooms and web/native may select
different document IDs until their histories are consolidated.
