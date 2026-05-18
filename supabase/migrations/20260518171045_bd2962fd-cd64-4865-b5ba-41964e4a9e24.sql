-- Remove the misattached points trigger on marketplace_chat_threads (table has no `status` column).
DROP TRIGGER IF EXISTS trg_points_marketplace_complete ON public.marketplace_chat_threads;

-- Make the function safe in case it's reattached elsewhere: no-op unless `status` exists on the row.
CREATE OR REPLACE FUNCTION public.points_on_marketplace_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_status text;
  old_status text;
BEGIN
  BEGIN
    new_status := row_to_json(NEW)->>'status';
    old_status := row_to_json(OLD)->>'status';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF new_status = 'completed' AND old_status IS DISTINCT FROM 'completed' THEN
    IF (row_to_json(NEW)->>'buyer_id') IS NOT NULL THEN
      PERFORM public.award_points_for_event(
        (row_to_json(NEW)->>'buyer_id')::uuid,
        'marketplace_purchase', 'marketplace_thread',
        (row_to_json(NEW)->>'id')
      );
    END IF;
    IF (row_to_json(NEW)->>'seller_id') IS NOT NULL THEN
      PERFORM public.award_points_for_event(
        (row_to_json(NEW)->>'seller_id')::uuid,
        'marketplace_sale', 'marketplace_thread',
        (row_to_json(NEW)->>'id')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;