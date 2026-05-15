-- =============================================
-- 1. CLEANUP — drop legacy forum tables
-- =============================================
DROP TABLE IF EXISTS public.forum_comments CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;

-- =============================================
-- 2. PROFILES — extend with forum fields
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS forum_signature text,
  ADD COLUMN IF NOT EXISTS forum_post_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forum_reputation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forum_rank text NOT NULL DEFAULT 'newcomer',
  ADD COLUMN IF NOT EXISTS forum_banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS forum_muted_until timestamptz;

-- =============================================
-- 3. CATEGORIES (top-level groupings)
-- =============================================
CREATE TABLE public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 4. BOARDS (sub-forums)
-- =============================================
CREATE TABLE public.forum_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  topic_count integer NOT NULL DEFAULT 0,
  post_count integer NOT NULL DEFAULT 0,
  last_topic_id uuid,
  last_post_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_boards_category ON public.forum_boards(category_id, display_order);

-- =============================================
-- 5. TAGS
-- =============================================
CREATE TABLE public.forum_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  color text,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 6. TOPICS (threads)
-- =============================================
CREATE TABLE public.forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.forum_boards(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_locked boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  last_post_at timestamptz NOT NULL DEFAULT now(),
  last_post_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_topics_board ON public.forum_topics(board_id, is_pinned DESC, last_post_at DESC);
CREATE INDEX idx_forum_topics_author ON public.forum_topics(author_id);

-- Topic <-> Tag join
CREATE TABLE public.forum_topic_tags (
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.forum_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, tag_id)
);

-- =============================================
-- 7. POSTS (replies, including the OP body)
-- =============================================
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body_md text NOT NULL,
  quoted_post_id uuid REFERENCES public.forum_posts(id) ON DELETE SET NULL,
  is_op boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  search_tsv tsvector
);
CREATE INDEX idx_forum_posts_topic ON public.forum_posts(topic_id, created_at);
CREATE INDEX idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX idx_forum_posts_search ON public.forum_posts USING gin(search_tsv);

-- =============================================
-- 8. VOTES (Up / Down)
-- =============================================
CREATE TABLE public.forum_post_votes (
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- =============================================
-- 9. SUBSCRIPTIONS
-- =============================================
CREATE TABLE public.forum_subscriptions (
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('topic', 'board')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

-- =============================================
-- 10. REPORTS
-- =============================================
CREATE TABLE public.forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'topic', 'user')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_reports_status ON public.forum_reports(status, created_at DESC);

-- =============================================
-- 11. MODERATION LOG
-- =============================================
CREATE TABLE public.forum_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  notes text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_modlog_created ON public.forum_moderation_log(created_at DESC);

-- =============================================
-- 12. BADGES
-- =============================================
CREATE TABLE public.forum_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_user_badges (
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.forum_badges(id) ON DELETE CASCADE,
  awarded_by uuid,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- =============================================
-- 13. DIRECT MESSAGES
-- =============================================
CREATE TABLE public.forum_dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_a integer NOT NULL DEFAULT 0,
  unread_b integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_dm_threads_users_ordered CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX idx_forum_dm_threads_a ON public.forum_dm_threads(user_a, last_message_at DESC);
CREATE INDEX idx_forum_dm_threads_b ON public.forum_dm_threads(user_b, last_message_at DESC);

CREATE TABLE public.forum_direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_dm_thread_created ON public.forum_direct_messages(thread_id, created_at);

-- =============================================
-- 14. NOTIFICATIONS (forum-scoped)
-- =============================================
CREATE TABLE public.forum_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  actor_id uuid,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_notif_user ON public.forum_notifications(user_id, read_at NULLS FIRST, created_at DESC);

-- =============================================
-- 15. RLS — enable on every new table
-- =============================================
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topic_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_notifications ENABLE ROW LEVEL SECURITY;

-- ---------- Categories / Boards / Tags / Badges (read = authenticated, write = admin) ----------
CREATE POLICY "forum_cats_read_auth" ON public.forum_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_cats_admin_write" ON public.forum_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "forum_boards_read_auth" ON public.forum_boards FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_boards_admin_write" ON public.forum_boards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "forum_tags_read_auth" ON public.forum_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_tags_insert_auth" ON public.forum_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "forum_tags_admin_modify" ON public.forum_tags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "forum_tags_admin_delete" ON public.forum_tags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "forum_badges_read_auth" ON public.forum_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_badges_admin_write" ON public.forum_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "forum_user_badges_read_auth" ON public.forum_user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_user_badges_admin_write" ON public.forum_user_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- Topics ----------
CREATE POLICY "forum_topics_read_auth" ON public.forum_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_topics_insert_auth" ON public.forum_topics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id
    AND COALESCE((SELECT forum_banned_until FROM public.profiles WHERE id = auth.uid()), 'epoch'::timestamptz) < now()
    AND COALESCE((SELECT forum_muted_until FROM public.profiles WHERE id = auth.uid()), 'epoch'::timestamptz) < now());
CREATE POLICY "forum_topics_owner_or_admin_update" ON public.forum_topics FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "forum_topics_admin_delete" ON public.forum_topics FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "forum_topic_tags_read_auth" ON public.forum_topic_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_topic_tags_owner_write" ON public.forum_topic_tags FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.forum_topics t WHERE t.id = topic_id AND (t.author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.forum_topics t WHERE t.id = topic_id AND (t.author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ---------- Posts ----------
CREATE POLICY "forum_posts_read_auth" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_posts_insert_auth" ON public.forum_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id
    AND COALESCE((SELECT forum_banned_until FROM public.profiles WHERE id = auth.uid()), 'epoch'::timestamptz) < now()
    AND COALESCE((SELECT forum_muted_until FROM public.profiles WHERE id = auth.uid()), 'epoch'::timestamptz) < now()
    AND NOT EXISTS(SELECT 1 FROM public.forum_topics t WHERE t.id = topic_id AND t.is_locked = true));
CREATE POLICY "forum_posts_owner_or_admin_update" ON public.forum_posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "forum_posts_admin_delete" ON public.forum_posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ---------- Votes ----------
CREATE POLICY "forum_votes_read_auth" ON public.forum_post_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_votes_self_write" ON public.forum_post_votes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- Subscriptions ----------
CREATE POLICY "forum_subs_self_all" ON public.forum_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- Reports ----------
CREATE POLICY "forum_reports_self_create" ON public.forum_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "forum_reports_self_or_admin_read" ON public.forum_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "forum_reports_admin_update" ON public.forum_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- Moderation Log ----------
CREATE POLICY "forum_modlog_admin_read" ON public.forum_moderation_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "forum_modlog_admin_insert" ON public.forum_moderation_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = moderator_id);

-- ---------- DM Threads / Messages ----------
CREATE POLICY "forum_dm_threads_participants_read" ON public.forum_dm_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "forum_dm_threads_participants_insert" ON public.forum_dm_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "forum_dm_threads_participants_update" ON public.forum_dm_threads FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "forum_dm_msgs_participants_read" ON public.forum_direct_messages FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.forum_dm_threads t WHERE t.id = thread_id AND (t.user_a = auth.uid() OR t.user_b = auth.uid())));
CREATE POLICY "forum_dm_msgs_sender_insert" ON public.forum_direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id
    AND EXISTS(SELECT 1 FROM public.forum_dm_threads t WHERE t.id = thread_id AND (t.user_a = auth.uid() OR t.user_b = auth.uid())));

-- ---------- Notifications ----------
CREATE POLICY "forum_notif_self_read" ON public.forum_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "forum_notif_self_update" ON public.forum_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 16. TRIGGERS / FUNCTIONS
-- =============================================

-- 16a. Search tsvector for posts
CREATE OR REPLACE FUNCTION public.forum_posts_update_tsv()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_tsv := to_tsvector('simple', COALESCE(NEW.body_md, ''));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_forum_posts_tsv BEFORE INSERT OR UPDATE OF body_md ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_posts_update_tsv();

-- 16b. After post insert: bump topic + board counters, refresh last_post_at
CREATE OR REPLACE FUNCTION public.forum_after_post_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_board uuid;
BEGIN
  -- Topic counters
  UPDATE public.forum_topics
     SET reply_count = CASE WHEN NEW.is_op THEN reply_count ELSE reply_count + 1 END,
         last_post_at = NEW.created_at,
         last_post_user_id = NEW.author_id,
         updated_at = now()
   WHERE id = NEW.topic_id
   RETURNING board_id INTO v_board;

  -- Board counters
  UPDATE public.forum_boards
     SET post_count = post_count + 1,
         last_topic_id = NEW.topic_id,
         last_post_at = NEW.created_at
   WHERE id = v_board;

  -- Profile post count
  UPDATE public.profiles
     SET forum_post_count = forum_post_count + 1
   WHERE id = NEW.author_id;

  -- Auto-rank
  UPDATE public.profiles
     SET forum_rank = CASE
       WHEN forum_post_count >= 1000 OR forum_reputation >= 5000 THEN 'expert'
       WHEN forum_post_count >= 250  OR forum_reputation >= 1000 THEN 'veteran'
       WHEN forum_post_count >= 50   OR forum_reputation >= 200  THEN 'regular'
       WHEN forum_post_count >= 10   OR forum_reputation >= 50   THEN 'member'
       ELSE 'newcomer' END
   WHERE id = NEW.author_id;

  RETURN NEW;
END $$;
CREATE TRIGGER trg_forum_after_post_insert AFTER INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_after_post_insert();

-- 16c. Topic insert -> bump board topic_count
CREATE OR REPLACE FUNCTION public.forum_after_topic_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.forum_boards
     SET topic_count = topic_count + 1,
         last_topic_id = NEW.id,
         last_post_at = NEW.created_at
   WHERE id = NEW.board_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_forum_after_topic_insert AFTER INSERT ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.forum_after_topic_insert();

-- 16d. Vote -> reputation
CREATE OR REPLACE FUNCTION public.forum_after_vote_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_author uuid;
  v_delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO v_author FROM public.forum_posts WHERE id = NEW.post_id;
    v_delta := NEW.value;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT author_id INTO v_author FROM public.forum_posts WHERE id = NEW.post_id;
    v_delta := NEW.value - OLD.value;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO v_author FROM public.forum_posts WHERE id = OLD.post_id;
    v_delta := -OLD.value;
  END IF;

  IF v_author IS NOT NULL AND v_delta <> 0 THEN
    UPDATE public.profiles
       SET forum_reputation = GREATEST(forum_reputation + v_delta, 0)
     WHERE id = v_author;
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_forum_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON public.forum_post_votes
  FOR EACH ROW EXECUTE FUNCTION public.forum_after_vote_change();

-- 16e. Mention/quote notifications on new post
CREATE OR REPLACE FUNCTION public.forum_post_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_quoted_author uuid;
  v_topic_title text;
  v_topic_slug text;
  m text;
  v_target uuid;
BEGIN
  SELECT title, slug INTO v_topic_title, v_topic_slug FROM public.forum_topics WHERE id = NEW.topic_id;

  -- Quote notification
  IF NEW.quoted_post_id IS NOT NULL THEN
    SELECT author_id INTO v_quoted_author FROM public.forum_posts WHERE id = NEW.quoted_post_id;
    IF v_quoted_author IS NOT NULL AND v_quoted_author <> NEW.author_id THEN
      INSERT INTO public.forum_notifications (user_id, kind, title, body, link, actor_id, metadata)
      VALUES (v_quoted_author, 'quote', 'ציטטו את ההודעה שלך',
        LEFT(NEW.body_md, 120),
        '/forum/topic/' || v_topic_slug,
        NEW.author_id,
        jsonb_build_object('topic_id', NEW.topic_id, 'post_id', NEW.id));
    END IF;
  END IF;

  -- @mentions
  FOR m IN SELECT DISTINCT (regexp_matches(NEW.body_md, '@([a-zA-Z0-9_\.\-]{2,40})', 'g'))[1]
  LOOP
    SELECT id INTO v_target FROM public.profiles WHERE username = m LIMIT 1;
    IF v_target IS NOT NULL AND v_target <> NEW.author_id THEN
      INSERT INTO public.forum_notifications (user_id, kind, title, body, link, actor_id, metadata)
      VALUES (v_target, 'mention', 'תייגו אותך באשכול: ' || COALESCE(v_topic_title,''),
        LEFT(NEW.body_md, 120),
        '/forum/topic/' || v_topic_slug,
        NEW.author_id,
        jsonb_build_object('topic_id', NEW.topic_id, 'post_id', NEW.id));
    END IF;
  END LOOP;

  RETURN NEW;
END $$;
CREATE TRIGGER trg_forum_post_notifications AFTER INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_post_notifications();

-- 16f. DM message -> bump thread metadata
CREATE OR REPLACE FUNCTION public.forum_after_dm_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT * INTO t FROM public.forum_dm_threads WHERE id = NEW.thread_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  IF NEW.sender_id = t.user_a THEN
    UPDATE public.forum_dm_threads
       SET last_message_at = NEW.created_at,
           last_message_preview = LEFT(NEW.body, 200),
           unread_b = unread_b + 1
     WHERE id = t.id;
    INSERT INTO public.forum_notifications (user_id, kind, title, body, link, actor_id, metadata)
    VALUES (t.user_b, 'dm', 'הודעה פרטית חדשה', LEFT(NEW.body, 120),
      '/forum/messages/' || t.id, NEW.sender_id,
      jsonb_build_object('thread_id', t.id));
  ELSE
    UPDATE public.forum_dm_threads
       SET last_message_at = NEW.created_at,
           last_message_preview = LEFT(NEW.body, 200),
           unread_a = unread_a + 1
     WHERE id = t.id;
    INSERT INTO public.forum_notifications (user_id, kind, title, body, link, actor_id, metadata)
    VALUES (t.user_a, 'dm', 'הודעה פרטית חדשה', LEFT(NEW.body, 120),
      '/forum/messages/' || t.id, NEW.sender_id,
      jsonb_build_object('thread_id', t.id));
  END IF;

  RETURN NEW;
END $$;
CREATE TRIGGER trg_forum_after_dm_insert AFTER INSERT ON public.forum_direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.forum_after_dm_insert();

-- =============================================
-- 17. REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_direct_messages;

-- =============================================
-- 18. SEED — minimal starter content
-- =============================================
INSERT INTO public.forum_categories (name, slug, description, icon, color, display_order) VALUES
  ('כללי', 'general', 'דיונים כלליים בקהילת המוזיקאים', 'MessageSquare', '#6366f1', 1),
  ('ציוד וטכנולוגיה', 'gear', 'אורגנים, סינטיסייזרים, תוכנה וציוד הקלטה', 'Sliders', '#10b981', 2),
  ('עזרה הדדית', 'help', 'שאלות, מדריכים וטיפים', 'HelpCircle', '#f59e0b', 3);

INSERT INTO public.forum_boards (category_id, name, slug, description, display_order)
SELECT c.id, b.name, b.slug, b.descr, b.ord FROM public.forum_categories c JOIN (VALUES
  ('general',  'הכרזות',          'announcements', 'הכרזות רשמיות מצוות הניהול',   1),
  ('general',  'דיון פתוח',        'open-talk',     'מה שלא נכנס באף קטגוריה אחרת', 2),
  ('gear',     'אורגנים',          'organs',        'יאמהה, קורג, רולנד וכו׳',       1),
  ('gear',     'תוכנות והקלטה',    'daw',           'DAWs, פלאגינים, אולפן ביתי',    2),
  ('help',     'שאלות מתחילים',    'beginner-q',    'שאלות בסיסיות לכל מתחיל',       1),
  ('help',     'מדריכים',          'tutorials',     'מדריכים שמשתמשים שיתפו',        2)
) AS b(cat_slug, name, slug, descr, ord) ON c.slug = b.cat_slug;