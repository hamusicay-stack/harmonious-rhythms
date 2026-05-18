
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing schedule with the same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('ingest-ai-news-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'ingest-ai-news-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fshwzvsdrdmqjnbmwhvt.functions.supabase.co/ingest-ai-news',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
