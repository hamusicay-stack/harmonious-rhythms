ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_status text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_zip text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_current_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_current_status_check
  CHECK (current_status IS NULL OR current_status IN (
    'looking_for_band','available_for_gigs','selling_gear','just_browsing'
  ));