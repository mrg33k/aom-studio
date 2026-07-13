-- corner:support-desk M27 Stage 1 — thread view + agent read + reply-time visibility.
-- first_response_at: when the FIRST kind='response' update landed for the wish (the
--   "replied in 54s" truth). Stamped going forward by every response-writing path;
--   backfilled once by scripts/backfill-first-response-at.py.
-- agent_read: structured JSON {who, ask, state, did, next} written by the worker that
--   actually read + worked the email (support-answer.py / support-selfheal.py) —
--   replaces the Gemini paraphrase as the board summary when present.
-- Thread cache needs no schema: it lives in support_wish_updates rows kind='thread_cache'.

alter table support_wishes add column if not exists first_response_at timestamptz;
alter table support_wishes add column if not exists agent_read text;

create index if not exists idx_support_wishes_first_response_at
  on support_wishes (first_response_at);
