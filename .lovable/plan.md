

# שיפורים: התראות, הגדרות פרופיל, מעקב מורחב, ושורטס

## 1. סימון "ראיתי הכל" + הסתרת badge נצפית

**`src/components/NotificationsBell.tsx` + `src/hooks/useNotifications.tsx`**
- כיום יש `markAllRead` — נחבר אותו לפעולה אוטומטית בעת פתיחת ה-Popover (פעם אחת), ובנוסף נוסיף כפתור גלוי "סמן הכל כנקרא" בראש ה-Popover (כרגע מופיע רק ב-`NotificationsList` לא-compact).
- ההתראות **יישארו ברשימה** — רק הסטטוס `read_at` מתעדכן, ה-badge האדומה תיעלם, והפס הצבעוני של "לא נקרא" יוסר. בדיוק מה שביקשת: רואים היסטוריה, אבל לא "מתריע".

## 2. הגדרות התראות בפרופיל

**טבלה חדשה `notification_preferences`** (מיגרציה):
```text
user_id (PK, FK auth.users), 
notify_follow bool default true,
notify_like bool default true,
notify_comment bool default true,
notify_inquiry bool default true,
notify_followed_user_activity bool default false,  -- ההתראה החדשה
updated_at timestamptz
```
RLS: כל משתמש קורא/כותב רק את השורה שלו. טריגר `handle_new_user` יוסיף שורת ברירת מחדל.

**עדכון 4 פונקציות הטריגר** (`notify_on_follow`, `notify_on_like`, `notify_on_comment`, `notify_on_inquiry`) — לפני INSERT ל-`notifications` יבדקו את ה-pref המתאים של הנמען. אם false — לא שולחים.

**טאב חדש בפרופיל** `src/routes/profile.tsx` → `<NotificationSettings />`:
- Switch לכל סוג: עוקב חדש / לייק / תגובה / פנייה.
- Switch ייעודי: **"קבל התראות על כל פעילות של אנשים שאני עוקב אחריהם"** (העלאות שורטס + מודעות יד2).
- שמירה ב-`upsert` ל-`notification_preferences`.

## 3. מעקב מורחב — "עקוב על כל פעולה"

**זרימה חדשה ב-`FollowButton`**: בלחיצה ראשונה על "עקוב" אחרי משתמש (`shorts_creator` או `marketplace_seller`) — אם המשתמש עדיין לא בחר, יקפוץ דיאלוג קצר:
> "האם תרצה לקבל התראות על כל הפעילות של {שם}? (העלאות שורטס, מודעות יד2)"
> כפתורים: **כן** / **רק עקוב** / **אל תשאל שוב**

הבחירה נשמרת ב-`notification_preferences.notify_followed_user_activity` (גלובלי) + עמודה `metadata` בטבלת `user_follows` (jsonb עם `notify_activity: bool`) למקרה שרוצה גרגולריות per-creator (אופציונלי, מתחילים גלובלי).

**שני טריגרים חדשים**:
- `trg_notify_followers_on_short` AFTER INSERT ON `shorts_videos` (כש-status='active') — שולח התראה לכל מי שעוקב אחרי `creator_id` כ-`user`/`shorts_creator` ויש לו `notify_followed_user_activity=true`.
- `trg_notify_followers_on_listing` AFTER INSERT ON `marketplace_listings` (כש-status='active') — אותו דבר עם `marketplace_seller`/`user`.

ההתראות יקושרו ישירות לדף השורט/מודעה.

## 4. בעיית האייקון "השמע" במובייל — הסרה

**`src/routes/shorts.tsx`** — כפתור ה-mute ה-floating בצד ימין למעלה לא נגיש בקליק במובייל (חופף ל-stories overlay/safe-area). הפתרון:
- **הסרת כפתור ה-mute לחלוטין במובייל** (`fullScreen` mode).
- הוידאו יתחיל בלי `muted` כברירת מחדל בפעם הראשונה — אבל כדי לעקוף הגבלת autoplay של דפדפנים, נשאיר `muted` בתחילה ובמגע ראשון על המסך (touchstart גלובלי לתוך ה-stage) ננתק את ה-mute אוטומטית. אחרי זה — **המשתמש שולט בעוצמה דרך כפתורי ה-volume של המכשיר**, בדיוק כמו TikTok/Reels.
- בדסקטופ — נשאיר את הכפתור (שם הוא עובד טוב).

## 5. תיקון UX של תגובות בשורט

**`src/components/shorts/CommentsSheet.tsx`** — בעיות שזיהיתי מהצילום ובקוד:
- ה-loader ממשיך להופיע מעל תגובות שכבר נטענו (כי `loading` ו-`comments` מוצגים שניהם בלי else).
- ה-Sheet 80vh — מסתיר חצי וידאו אבל הוא ממשיך לנגן ברקע ללא paste חזותי.
- חסרים: avatars לחיצים → פרופיל, autosize של ה-textarea, indicator "מקליד...", רענון אופטימי (התגובה מופיעה מיד), ספירת תווים, כפתור close ברור.
- ה-icon Send מסתובב לצד הלא נכון ב-RTL.

**שיפורים**:
- תיקון הצגת ה-loader (רק כש-`comments.length === 0`), אחרת skeleton דק בראש.
- **Optimistic insert**: התגובה מופיעה מיד עם flag pending, אז מוחלפת בתגובה האמיתית.
- Avatar/שם → `Link to="/profile"` (או דף יוצר).
- Textarea עם auto-grow ו-counter `{n}/500`.
- כפתור Send מסובב ל-RTL (`rotate-180` או אייקון מתאים).
- שמירה על נגינת הוידאו ברקע — להוסיף `bg-background/95 backdrop-blur` ל-Sheet במקום אטום מלא, כך שעדיין רואים רמז של הוידאו.
- גובה הופך ל-`h-[70vh]` עם drag-handle ברור בראש.
- מצב ריק עם אייקון יפה במקום טקסט גנרי.

## פרטים טכניים

**מיגרציות SQL**:
1. `CREATE TABLE notification_preferences` + RLS + טריגר default-row.
2. עדכון 4 פונקציות notify_on_* לבדוק preferences.
3. שתי פונקציות+טריגרים חדשים: `notify_followers_on_short`, `notify_followers_on_listing`.

**קבצים לעריכה**:
- `src/hooks/useNotifications.tsx` — auto-mark-read on open (אופציונלי) + חשיפת helper.
- `src/components/NotificationsBell.tsx` — כפתור "סמן הכל כנקרא" ב-popover.
- `src/routes/profile.tsx` — טאב חדש "הגדרות התראות".
- חדש: `src/components/NotificationSettings.tsx`.
- `src/components/FollowButton.tsx` — דיאלוג "עקוב על פעילות".
- חדש: `src/components/FollowActivityDialog.tsx`.
- `src/routes/shorts.tsx` — הסרת mute במובייל + unmute on first tap.
- `src/components/shorts/CommentsSheet.tsx` — שיפוץ UX מלא.

**ללא תלויות חדשות. ללא שינוי ב-Supabase client. תואם ל-realtime הקיים.**

