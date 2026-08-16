# Convex Multi-Agent — Last Conversation

## 2026-08-15

The user approved an all-Convex multi-agent room pipeline. Round 1 confirmed the
native empty-room issue is a backend-contract collision, not missing UI state:
iOS build 16 targets the overwritten Convex production deployment while the real
Corner app and data are on another deployment, and foreground catch-up still
reads Supabase. Research supports a transactional message mutation followed by a
durable scheduled action/workflow, bounded agent routing, and replies persisted to
the same Convex thread.

Implemented and deployed that loop to `neat-pony-216`, including idempotent
dispatches, actual Corner personas, grounded sequential responses, and teammate
abstention without allowing a silent turn. Migrated 45,221 nonblank Supabase text
messages across all 651 legacy room IDs into Convex, preserving timestamps and
stable IDs while excluding file/attachment metadata; the one-time migration
credential was removed afterward. Native now targets the correct document-ID API
and never overwrites Convex rows with Supabase. CV6 uses reactive Convex room
queries and sends and passes a production-mode bundle. Remaining work is a clean
production dashboard release and signed-in iOS cross-surface acceptance.

Production dashboard release `43272adb` was deployed from a clean archive to
Vercel project `aom-studio` and verified on the canonical AOM domain; its served
main bundle targets `neat-pony-216`. Corner 1.0 build 17 was archived app-only
using the existing App Store signing path and uploaded successfully to App Store
Connect (delivery `58cc724f-72eb-440a-b0f8-065b80ed82f0`). Browser and simulator
sessions were both signed out, so the final authenticated iOS-to-web parity send
was not fabricated and remains the only acceptance gap.

Apple's delivery-status API subsequently returned `build-status: VALID` for build
17.

The WD-40 loop then found and removed a production query hotspot:
`rooms:listRooms` performed one last-message lookup for every one of 676 rooms,
reading 1,351 documents and about 627 KB on each refresh. Convex now denormalizes
the last text/time/agent onto each room transactionally. A secret-protected,
40-room paginated backfill updated 675 rooms with messages; the temporary secret
was removed. Tests and the production build passed, functions were deployed to
`neat-pony-216`, and the live query now reads 676 documents and returns 398,549
bytes without duplicate preview fields. Standalone commit: `3b1821c`.

A new `@bobby` acceptance message completed end-to-end in under five seconds
with exactly one correctly linked reply. Its content exposed the next boundary:
the Convex LLM only had the sparse room history and could not verify current
deploy state. The local SSE bridge is healthy, but its resident registry contains
only elon/studio/rex/gary/arsenal-ea; there is no live Bobby or Steffen session.
Do not identity-map those names to another resident. A future Convex consumer and
reply writer should only replace the internal responder once the desired resident
roster exists and can preserve exact room/message IDs.
