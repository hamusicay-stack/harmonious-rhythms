
CREATE TABLE IF NOT EXISTS public.site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_html TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published pages"
  ON public.site_pages FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage site pages"
  ON public.site_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_save_site_page(
  p_id UUID,
  p_title TEXT,
  p_slug TEXT,
  p_content_html TEXT,
  p_is_published BOOLEAN,
  p_reason TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_id UUID;
  v_action TEXT;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage site pages';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'חובה לציין סיבה לשמירה';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.site_pages (title, slug, content_html, is_published, updated_by)
    VALUES (p_title, p_slug, COALESCE(p_content_html,''), COALESCE(p_is_published,true), v_admin)
    RETURNING id INTO v_id;
    v_action := 'site_page.create';
  ELSE
    UPDATE public.site_pages
      SET title = p_title,
          slug = p_slug,
          content_html = COALESCE(p_content_html,''),
          is_published = COALESCE(p_is_published,true),
          updated_by = v_admin,
          updated_at = now()
      WHERE id = p_id
      RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Page not found'; END IF;
    v_action := 'site_page.update';
  END IF;

  INSERT INTO public.system_audit_logs (user_id, user_type, action, entity, entity_id, details)
  VALUES (v_admin, 'admin', v_action, 'site_page', v_id::text,
    jsonb_build_object('slug', p_slug, 'title', p_title, 'reason', p_reason, 'is_published', p_is_published));

  RETURN v_id;
END $$;

INSERT INTO public.site_pages (title, slug, content_html, is_published)
VALUES ('אודות', 'about',
  '<h1>אודות הפלטפורמה</h1><p>ברוכים הבאים לאקו-סיסטם המוביל למוזיקאים בישראל. אנו מחברים בין נגנים, מורים, תלמידים ומפיקים תחת קורת גג אחת.</p><h2>השאלות הנפוצות שלנו</h2><div data-faq="true"><div data-faq-item="true"><strong data-faq-q="true">מה זו הפלטפורמה?</strong><p data-faq-a="true">בית דיגיטלי יוקרתי לכל מוזיקאי — פורום, חנות, אקדמיה ושוק יד-שנייה.</p></div><div data-faq-item="true"><strong data-faq-q="true">איך מצטרפים?</strong><p data-faq-a="true">פשוט נרשמים בחינם ומתחילים לתרום, ללמוד ולמכור.</p></div></div>',
  true)
ON CONFLICT (slug) DO NOTHING;
