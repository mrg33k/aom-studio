# Image Gen Composer Icon — Mission Research

> Findings specific to this mission. Cross-cutting research stays in the parent's RESEARCH.md.

**Started:** 2026-05-12

## Index

- **2026-05-12** — R0: Image-gen provider landscape (May 2026): Gemini Imagen 4 family, Ideogram 3.0, OpenAI gpt-image-1.5 (DALL·E 3 retired March 2026), FLUX.2 Pro, Recraft V3/V4. Mapped local keys: Gemini + Ideogram in `~/.config/`, OpenAI via codex auth (not usable from a Vercel route → needs separate platform key). No Recraft/FLUX keys on hand. → captured in this conversation transcript.
- **2026-05-12** — R0b: Composer surface map. Both Corner V3 and V4 reuse `src/dashboard/components/cv3/ChatPanel.jsx` which composes `ProjectChatView` / `ConversationsView` / `ThreadView`. The actual `<input type="text">` for the prompt lives in `ThreadInputBar.jsx:120-144` and `ProjectInputBar.jsx:133-164` (not in ConversationsView). Mission chip pattern in `CornerV4.jsx:78-105` + `cv4/cv4.css:589-650` (`.cv4-composer-pin` / `.cv4-mission-chip`). Send pipeline POSTs to `/api/dashboard/chat-bridge` with `{ agent, message, room, project, client_id, metadata? }`. No existing image-gen route or component. → captured in this conversation.

## Provider quick-reference

| Provider | Model | Endpoint | Auth | Returns |
|---|---|---|---|---|
| Gemini | `imagen-4.0-fast-generate-001` (cheapest) | `POST generativelanguage.googleapis.com/v1beta/models/<model>:predict?key=…` | `GEMINI_API_KEY` query param | `predictions[0].bytesBase64Encoded` |
| Ideogram | Ideogram 3.0 / DEFAULT speed | `POST api.ideogram.ai/v1/ideogram-v3/generate` (multipart) | `Api-Key` header | `data[0].url` |
| OpenAI | `gpt-image-1.5` | `POST api.openai.com/v1/images/generations` | `Authorization: Bearer` | `data[0].b64_json` |

DALL·E 3 retired 2026-03-04 — do not target.
