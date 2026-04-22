-- Remove the unused locked-fields function (no trigger was attached and we now allow users to edit display_name)
DROP FUNCTION IF EXISTS public.protect_music_pro_locked_fields() CASCADE;