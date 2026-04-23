

## בדיקת מצב נוכחי — מה כבר נבנה ומה חסר

### ✅ מה שכבר עובד היום
- **שורטס**: דף `/shorts` עם 3 עמודות בדסקטופ + מובייל TikTok-style, story row עם progress ring, autoplay, אנימציית transition עדינה סביב הפרופיל (חלקית, רק על תיבת המידע התחתונה).
- **אישור מנהל**: `ShortsManager` באדמין עם תור pending/active/rejected, רשימת trusted uploaders, הגדרות גלובליות (auto_approve_all + require_approval). Trigger DB `shorts_auto_approve` פועל.
- **Follow מערכת**: טבלת `user_follows` polymorphic, הוק `useFollow`, קומפוננטה `FollowButton`, טאב "עוקב אחרי" בפרופיל.
- **לייקים בפרופיל**: טאב "שאהבתי" עם פילטרים (יד2/חנות/מקצוענים/אקדמיה/פורום).
- **באנרים בשורטס**: 3 slots מוגדרים — `shorts_left`, `shorts_right_top`, `shorts_right_bottom`.
- **CTA בית**: סקציית "המוזיקאי שורטס" קיימת בעמוד הבית.
- **גישת אדמין במובייל**: כפתור "ניהול המערכת" קיים בתפריט המובייל.
- **אדמין רספונסיבי**: TabsList עם `flex-wrap` במובייל.

### ❌ מה שחסר ויבוצע בשלב הזה

**1. שורטס — חיבור לדאטה אמיתי (היום זה MOCK)**
- החלפת `MOCK_SHORTS` ב-fetch מ-`shorts_videos` (status=active, ordered by created_at).
- שימוש ב-`like` דרך `useLikes('shorts_video', id)` במקום state מקומי.
- `FollowButton` במקום כפתור "עוקב" סטטי, מחובר ל-`shorts_creator`.
- קריאה ל-`increment_short_views` בכל החלפת סרטון.
- Realtime subscription לסרטונים חדשים שאושרו.

**2. שורטס — אנימציה עדינה סביב פרופיל המוזיקאי בכל מעבר**
- בנוסף לטרנזישן הקיים בלאייר התחתון, להוסיף "ring pulse" של 800ms סביב האווטאר הראשי כשעוברים לסרטון של מוזיקאי **אחר** (לא בכל סרטון של אותו יוצר).
- שימוש ב-`animate-pulse` + `scale-110` + gradient ring על avatar התחתון, מבחין בין "אותו creator" ל"creator חדש".
- Fade עדין של הטייטל (animate-fade-in 300ms) בכל מעבר.

**3. לייקים של שורטס בטאב "שאהבתי"**
- הוספת `shorts_video` ל-LikeRow filter ול-config של `LikedCard`.
- הוספת fetch ל-`shorts_videos` עם `id, title, thumbnail_url, video_url`.
- כרטיס מוביל ל-`/shorts?v=<id>` עם autoplay של אותו סרטון.

**4. העלאת שורטס למשתמשים**
- Dialog "העלה סרטון" בכפתור הקיים בראש /shorts (מותנה login + premium/trusted/admin).
- Upload ל-`storage/shorts` bucket → insert ל-`shorts_videos` (status=pending אם נדרש אישור).
- שדות: title, description, video file (max 60s), thumbnail (אופציונלי).

**5. הפצת שורטס במערכת הפרסומות**
- כבר יש `shorts_left/right_top/right_bottom`. נוסיף עוד אופציה: **`shorts_in_feed`** — באנר שמוצג כסרטון ה-3, ה-7, ה-11 בפיד (interstitial style), עם מסגרת "פרסומת ממומן".
- בעריכת באנר באדמין: שדה אופציונלי "תדירות בפיד" (כל N סרטונים).

**6. FollowButton במקומות הנכונים**
- `ProCard` (מוזיקאים) — כפתור עקוב/עוקב על `music_pro`.
- `seller.$sellerId.tsx` — כפתור עקוב על `marketplace_seller`.
- שורטס player — `shorts_creator`.
- `pros.$proId.tsx` — כפתור עקוב גדול בכותרת.
- `marketplace.$listingId.tsx` — כפתור עקוב ליד פרטי המוכר.

**7. שיפורי מובייל לאדמין**
- Cards/Tables: עטיפת טבלאות ב-`overflow-x-auto` + min-width לתאים. במובייל, להחליף Table ב-list of cards (בעמודות לקוחות/לידים/ספקים) — כל שורה הופכת לכרטיס מסודר עם labels.
- DialogContent: הוספת `max-h-[90vh] overflow-y-auto` ו-padding מתאים למובייל.
- Sticky TabsList בראש הדף, עם horizontal scroll במקום flex-wrap (נוח יותר).
- כפתור "ניהול" בתפריט המובייל — להוסיף badge עם מספר pending shorts/reports/leads (התראות).

---

## מה מומלץ להוסיף בעתיד (לא בשלב הזה)

**שורטס:**
- **תזמון פרסום** — `scheduled_at` כבר קיים בטבלה אבל אין UI להעלאה עם תזמון.
- **תגובות אמיתיות** — טבלת `shorts_comments` (היום מחזיר toast "בקרוב").
- **טיוב thumbnail אוטומטי** — ffmpeg ב-edge function שתופס frame ב-1s.
- **Swipe gestures במובייל** — מעבר בין סרטונים בגרירה אנכית.
- **אלגוריתם "For You"** — דירוג לפי likes/views/follows במקום סדר כרונולוגי.
- **דיווח על סרטון** — דומה ל-`marketplace_reports` עבור שורטס.

**מערכת follow:**
- **התראות** — מייל/in-app כשמישהו שעוקבים אחריו מעלה סרטון/מודעה חדשה.
- **פיד "עוקבים"** — טאב בשורטס שמראה רק סרטונים מיוצרים שעוקבים אחריהם.
- **רשימת "מי עוקב אחריי"** — לא קיים, רק "אחרי מי אני עוקב".
- **ספירת עוקבים** — באדג' על פרופיל מוזיקאי/מוכר.

**אדמין במובייל:**
- **PWA + push notifications** — להתראה מידית על pending shorts/דיווחים.
- **כרטיס לקוח 360° במובייל** — להתאים גם את `/admin/customers/$customerId`.
- **אקשנים מהירים בסוייפ** — אישור/דחייה בסוייפ ימינה/שמאלה על כרטיס שורטס.

**ביצועים וקלות שימוש:**
- **Lazy load** של רכיבי האדמין הכבדים (ShopManager, MarketplaceManager) — היום הכל מיובא ישירות.
- **Search גלובלי** — אייקון החיפוש בכותרת לא עושה כלום.
- **Skeleton loaders** במקום Spinner — יותר נעים לעין.
- **i18n נכון** — כיוון RTL/LTR לפי שדה (טלפון, אימייל, URLs).

---

## קבצים שיתעדכנו בשלב הזה

- `src/routes/shorts.tsx` — fetch אמיתי, לייקים אמיתיים, FollowButton, אנימציית מעבר בין מוזיקאים, dialog העלאה.
- `src/routes/profile.tsx` — הוספת shorts_video ל-LikedItems.
- `src/components/admin/BannersManager.tsx` — הוספת position `shorts_in_feed` ושדה `frequency`.
- `src/components/pros/ProCard.tsx` — FollowButton על `music_pro`.
- `src/routes/seller.$sellerId.tsx` — FollowButton על `marketplace_seller`.
- `src/routes/pros.$proId.tsx` — FollowButton בכותרת.
- `src/routes/marketplace.$listingId.tsx` — FollowButton ליד פרטי מוכר.
- `src/routes/admin.tsx` — מובייל: החלפת טבלאות לכרטיסים במובייל, sticky tabs, badges על pending.
- `src/components/SiteHeader.tsx` — badge על "ניהול" עם ספירת pending.
- `src/components/admin/ShortsManager.tsx` — הוספת שדה תדירות לפיד, swipe actions.
- מיגרציה חדשה: הוספת `frequency_in_feed` ל-`ad_banners` (אופציונלי).

