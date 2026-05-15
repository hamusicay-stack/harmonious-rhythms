ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.subscription_tiers.discount_percent IS
'Default cart-wide percent discount granted to members of this tier (0-100).';