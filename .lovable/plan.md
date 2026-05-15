# פורום קהילה — אפיון בנייה מלא

החלפה מלאה של `/forum` הקיים במערכת פורומים בסגנון NodeBB. גישה: קריאה וכתיבה רק למשתמשים מחוברים.

## שלב 1 — סכמת מסד נתונים

הסרת הטבלאות הישנות (`forum_categories`, `forum_posts`, `forum_comments`) ויצירת סכמה חדשה:

**היררכיית תוכן:**
- `forum_categories` — קטגוריות-על (סדר, אייקון, צבע)
- `forum_boards` — לוחות בתוך קטגוריה (slug, שם, תיאור, היררכיה)
- `forum_topics` — אשכולות (כותרת, slug, נעול, מוצמד, מחבר, board_id, view_count, last_post_at)
- `forum_posts` — תגובות (תוכן Markdown, מחבר, ציטוט של post_id, נמחק)
- `forum_tags` + `forum_topic_tags` — תיוג חוצה-לוחות
- `forum_post_votes` — Upvote/Downvote
- `forum_subscriptions` — מעקב אחרי אשכולות/לוחות
- `forum_reports` — דיווחי משתמשים
- `forum_moderation_log` — יומן ניהול
- `forum_user_bans` — השתקות וחסימות
- `forum_badges` + `forum_user_badges` — באג'ים ידניים
- `forum_direct_messages` + `forum_dm_threads` — הודעות פרטיות
- `forum_notifications` — מרכז התראות

**הרחבת `profiles`:**
- `forum_signature` (text) — חתימה
- `forum_post_count` (integer)
- `forum_reputation` (integer)
- `forum_rank` (text, נגזר אוטומטית)

**טריגרים ופונקציות:**
- `award_reputation()` בעת upvote/downvote
- `bump_post_count()` ביצירת תגובה
- `compute_rank()` לפי וותק + מונה
- `update_topic_last_post_at()` בתגובה חדשה
- `notify_on_mention()` סורק `@username` ויוצר התראה
- `notify_on_quote()` ביצירת ציטוט

**RLS:**
- כל הטבלאות: SELECT רק למחוברים
- INSERT/UPDATE: בעלות + אדמין/מנהל פורום
- מחיקה רכה (`deleted_at`) במקום DELETE

## שלב 2 — Server Functions

תחת `src/lib/forum/`:
- `boards.functions.ts` — רשימת קטגוריות + לוחות עם ספירת אשכולות/הודעות
- `topics.functions.ts` — יצירה, רשימה (paginated), נעילה/הצמדה/העברה/מיזוג
- `posts.functions.ts` — יצירת תגובה, עריכה, מחיקה רכה, הצבעה
- `search.functions.ts` — חיפוש Full-Text ב-Postgres `tsvector`
- `moderation.functions.ts` — דיווחים, חסימות, יומן
- `dm.functions.ts` — שליחת/קריאת הודעות פרטיות
- `notifications.functions.ts` — סימון נקרא, רשימה
- `tags.functions.ts` — CRUD תגיות

כולן עם `requireSupabaseAuth` ו-Zod validation.

## שלב 3 — Realtime

Supabase Realtime על `forum_posts` ו-`forum_notifications`:
- בדף אשכול — תגובות חדשות מופיעות בזמן אמת
- מרכז התראות בכותרת מתעדכן מיד

## שלב 4 — מסכי UI

```text
/forum                              → רשימת קטגוריות ולוחות
/forum/board/$slug                  → רשימת אשכולות בלוח
/forum/topic/$slug                  → תצוגת אשכול + תגובות
/forum/topic/new?board=$slug        → יצירת אשכול חדש
/forum/tag/$tag                     → אשכולות לפי תגית
/forum/search?q=...                 → תוצאות חיפוש
/forum/user/$username               → פרופיל פורום (חתימה, באג'ים, הודעות אחרונות)
/forum/messages                     → תיבת הודעות פרטיות
/forum/messages/$threadId           → שיחה
/forum/notifications                → מרכז התראות
/forum/moderation                   → לוח מנהלי קהילה (דיווחים + יומן)
```

**רכיבים מרכזיים** (ב-`src/components/forum/`):
- `MarkdownEditor` — עורך עם תצוגה מקדימה, הדבקת תמונות, ציטוטים, embeds (YouTube/Twitter)
- `PostCard` — אווטר, חתימה, ד