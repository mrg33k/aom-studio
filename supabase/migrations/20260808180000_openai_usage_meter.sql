-- corner:integrations — first-party OpenAI room-brain usage ledger.
-- The browser never writes this table. Only the service-role bridge may reserve
-- and finalize usage through the two SECURITY DEFINER functions below.

CREATE TABLE IF NOT EXISTS public.openai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'openai' CHECK (provider = 'openai'),
  client_id text NOT NULL,
  user_id text NOT NULL,
  message_id text NOT NULL,
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved', 'completed', 'failed')),
  reserved_tokens bigint NOT NULL DEFAULT 0 CHECK (reserved_tokens >= 0),
  input_tokens bigint NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens bigint NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  openai_response_id text,
  openai_request_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS openai_usage_events_provider_message_uidx
  ON public.openai_usage_events (provider, message_id);
CREATE INDEX IF NOT EXISTS openai_usage_events_client_month_idx
  ON public.openai_usage_events (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS openai_usage_events_user_month_idx
  ON public.openai_usage_events (client_id, user_id, created_at DESC);

ALTER TABLE public.openai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.openai_usage_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.openai_usage_events TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_openai_usage(
  p_client_id text,
  p_user_id text,
  p_message_id text,
  p_model text,
  p_reserved_tokens bigint,
  p_user_limit_tokens bigint DEFAULT 0,
  p_tenant_limit_tokens bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_status text;
  v_month_start timestamptz := date_trunc('month', now());
  v_user_used bigint := 0;
  v_tenant_used bigint := 0;
BEGIN
  IF nullif(trim(p_client_id), '') IS NULL
     OR nullif(trim(p_user_id), '') IS NULL
     OR nullif(trim(p_message_id), '') IS NULL
     OR nullif(trim(p_model), '') IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'identity_required');
  END IF;

  IF p_reserved_tokens IS NULL OR p_reserved_tokens <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_reservation');
  END IF;

  -- Serialize reservations for one tenant/month so concurrent users cannot
  -- both pass the same remaining-budget check.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_client_id || ':' || to_char(v_month_start, 'YYYY-MM'))
  );

  SELECT status INTO v_existing_status
  FROM public.openai_usage_events
  WHERE provider = 'openai' AND message_id = p_message_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', CASE WHEN v_existing_status = 'completed'
        THEN 'already_completed' ELSE 'already_processing' END
    );
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN status = 'reserved' THEN reserved_tokens ELSE total_tokens END
  ), 0)
  INTO v_tenant_used
  FROM public.openai_usage_events
  WHERE provider = 'openai'
    AND client_id = p_client_id
    AND created_at >= v_month_start;

  SELECT COALESCE(SUM(
    CASE WHEN status = 'reserved' THEN reserved_tokens ELSE total_tokens END
  ), 0)
  INTO v_user_used
  FROM public.openai_usage_events
  WHERE provider = 'openai'
    AND client_id = p_client_id
    AND user_id = p_user_id
    AND created_at >= v_month_start;

  IF p_tenant_limit_tokens > 0
     AND v_tenant_used + p_reserved_tokens > p_tenant_limit_tokens THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'tenant_limit',
      'used_tokens', v_tenant_used,
      'limit_tokens', p_tenant_limit_tokens
    );
  END IF;

  IF p_user_limit_tokens > 0
     AND v_user_used + p_reserved_tokens > p_user_limit_tokens THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'user_limit',
      'used_tokens', v_user_used,
      'limit_tokens', p_user_limit_tokens
    );
  END IF;

  INSERT INTO public.openai_usage_events (
    client_id, user_id, message_id, model, status, reserved_tokens
  ) VALUES (
    p_client_id, p_user_id, p_message_id, p_model, 'reserved', p_reserved_tokens
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'reserved',
    'reserved_tokens', p_reserved_tokens,
    'user_used_tokens', v_user_used,
    'tenant_used_tokens', v_tenant_used
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_openai_usage(
  p_message_id text,
  p_status text,
  p_input_tokens bigint DEFAULT 0,
  p_output_tokens bigint DEFAULT 0,
  p_total_tokens bigint DEFAULT 0,
  p_openai_response_id text DEFAULT NULL,
  p_openai_request_id text DEFAULT NULL,
  p_error_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;

  UPDATE public.openai_usage_events
  SET status = p_status,
      input_tokens = GREATEST(COALESCE(p_input_tokens, 0), 0),
      output_tokens = GREATEST(COALESCE(p_output_tokens, 0), 0),
      total_tokens = GREATEST(COALESCE(p_total_tokens, 0), 0),
      openai_response_id = NULLIF(p_openai_response_id, ''),
      openai_request_id = NULLIF(p_openai_request_id, ''),
      error_code = NULLIF(p_error_code, ''),
      completed_at = now()
  WHERE provider = 'openai'
    AND message_id = p_message_id
    AND status = 'reserved';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_updated = 1, 'updated', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_openai_usage(text, text, text, text, bigint, bigint, bigint)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_openai_usage(text, text, bigint, bigint, bigint, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_openai_usage(text, text, text, text, bigint, bigint, bigint)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_openai_usage(text, text, bigint, bigint, bigint, text, text, text)
  TO service_role;
