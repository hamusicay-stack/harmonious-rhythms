INSERT INTO public.points_rules (event_key, label, points, enabled)
VALUES ('daily_login', 'כניסה יומית', 2, true)
ON CONFLICT (event_key) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_daily_login_uniq
  ON public.points_ledger (user_id, ((created_at AT TIME ZONE 'UTC')::date))
  WHERE event_key = 'daily_login';