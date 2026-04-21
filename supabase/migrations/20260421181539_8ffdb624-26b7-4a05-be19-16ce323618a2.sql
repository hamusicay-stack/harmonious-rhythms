CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with same name
DO $$
BEGIN
  PERFORM cron.unschedule('marketplace-followup-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'marketplace-followup-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--0ea5009b-3dc5-4cbf-80dd-e3f02dae5325.lovable.app/api/public/marketplace/followup',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);