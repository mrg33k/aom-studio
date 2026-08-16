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
