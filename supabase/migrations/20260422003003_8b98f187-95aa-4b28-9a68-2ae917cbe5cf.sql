-- Schedule the saved-search matcher to run every 15 minutes
SELECT cron.schedule(
  'marketplace-match-saved-searches',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--0ea5009b-3dc5-4cbf-80dd-e3f02dae5325.lovable.app/api/public/marketplace/match-searches',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);