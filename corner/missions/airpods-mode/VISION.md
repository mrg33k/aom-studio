# Corner AirPods Mode — Vision

**Mission path:** `corner:airpods-mode`

Corner should be operable through sound and voice while CV6 remains the live visual
source of truth. A user can arm Corner, say “Hey Corner,” move between rooms and tools,
run work, and receive politely batched follow-ups without maintaining a paid model
connection while idle.

## Product rules

- CV6 is the only product surface for this mission.
- One global Corner concierge persists across rooms and tools.
- Dormant wake detection stays on-device; raw idle audio is never uploaded.
- Reads and reversible internal actions may execute directly. External, destructive,
  or irreversible actions require explicit confirmation.
- Every spoken action updates canonical system state and becomes visible in CV6.
- Multi-topic conversations produce room-specific handoffs plus one auditable transcript;
  raw audio is not retained by default.
