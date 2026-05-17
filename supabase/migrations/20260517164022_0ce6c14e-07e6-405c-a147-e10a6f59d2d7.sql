ALTER TABLE public.ad_banners
  ADD COLUMN IF NOT EXISTS bypass_vip boolean NOT NULL DEFAULT false;

UPDATE public.ad_banners
  SET bypass_vip = true
  WHERE position IN ('sidebar_left', 'sidebar_right', 'global_top', 'global_bottom');