ALTER TABLE public.user_likes DROP CONSTRAINT IF EXISTS user_likes_item_type_check;
ALTER TABLE public.user_likes
ADD CONSTRAINT user_likes_item_type_check
CHECK (item_type IN ('shop_product', 'academy_course', 'marketplace_listing', 'music_pro', 'forum_post', 'shorts_video'));