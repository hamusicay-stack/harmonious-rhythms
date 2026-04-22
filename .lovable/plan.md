

## תוכנית: אינדקס מוזיקאים מקצועי (Pro Directory)

זירת מסחר חדשה למוזיקאים מקצועיים — נגנים, זמרים, מעבדים וטכנאים — נפרדת מהלוח יד-2. **בלי יומן זמינות** (לפי בקשתך).

### מבנה ראוטים חדש

```text
src/routes/
  pros.tsx              ← Layout עם <Outlet/>
  pros.index.tsx        ← /pros דף האינדקס + סינון
  pros.$proId.tsx       ← /pros/:proId — EPK פרופיל אישי
  pros.new.tsx          ← /pros/new — הרשמה כמוזיקאי
  pros.$proId.edit.tsx  ← עריכת פרופיל מקצועי
```

תוספת בתפריט הראשי (`SiteHeader.tsx`): פריט חדש **"מוזיקאים"** → `/pros`.

### סכמת DB חדשה (מיגרציה אחת)

**טבלאות חדשות:**

| טבלה | תפקיד | שדות עיקריים |
|---|---|---|
| `music_pros` | פרופיל מקצועי | user_id, display_name, headline, bio, profile_image, cover_image, hourly_price_min, region, cities[], specialties[] (קלידן/זמר/מעבד/טכנאי/מורה), genres[] (חסידי/פופ/מזרחי/אלקטרוני…), gear_list[], is_verified, is_featured, subscription_tier (free/vip), views_count, status |
| `music_pro_media` | תיק עבודות (אודיו/וידאו) | pro_id, type (audio/video), url, title, order, is_featured |
| `music_pro_packages` | חבילות מחירים | pro_id, title, description, price, unit (event/hour/song) |
| `music_pro_inquiries` | בקשות הצעת מחיר | pro_id, sender_id, event_type, event_date, location, budget, message, contact_phone, status |
| `music_pro_reviews` | ביקורות מאומתות | pro_id, reviewer_id, inquiry_id (FK — אימות), rating 1-5, comment, is_verified |

**RLS עיקרי:**
- `music_pros`: קריאה ציבורית כש-`status='approved'`. עדכון רק על-ידי הבעלים או admin.
- `music_pro_media` / `packages`: קריאה ציבורית, כתיבה רק לבעלים.
- `inquiries`: קריאה לבעלי הפרופיל + השולח + admin. כתיבה לכל משתמש מאומת.
- `reviews`: קריאה ציבורית. כתיבה רק למי שיש לו `inquiry` עם `status='completed'` מול אותו pro (מאומתת דרך טריגר).

**Storage bucket חדש:** `music-pros` (פומבי) לאודיו/וידאו/תמונות.

### דף `/pros` — Discovery Page

**סרגל סינון (sticky, RTL):**
- התמחות (multi-select chips): קלידן לאירועים, זמר חופות, מעבד אולפן, טכנאי מיקס, מורה לנגינה
- סגנון: חסידי / פופ / מזרחי / אלקטרוני / קלאסי / ג'אז
- אזור + עיר
- טווח מחיר (Slider)
- ✓ מאומת בלבד / ✓ VIP בלבד
- מיון: VIP → Featured → דירוג ממוצע → חדשים

**Premium Cards (Bento):**
```text
┌─────────────────────────────────┐
│ [VIP👑] [✓מאומת]      [▶ Play]  │  ← תגים + כפתור נגינה
│                                 │
│  🖼️ תמונת פרופיל (cover wash)   │  ← רקע מתחלף לצבע מותג ב-hover
│                                 │
│  ──────────────────────────     │
│  אבי כהן · קלידן לאירועים       │
│  ⭐ 4.9 (32) · 📍 בני ברק       │
│  החל מ-₪2,500 לאירוע            │
│                                 │
│  [פופ] [חסידי] [מזרחי]          │  ← תגיות סגנון
│  [💬 הצעת מחיר]  [👁 פרופיל]    │
└─────────────────────────────────┘
```

**Hover magic:** הכרטיס מחליף עדינות ל-gradient של צבע ראשי של המוזיקאי (נשמר ב-`music_pros.brand_color`), כפתור Play הופך אינטראקטיבי ומתחיל את הנגן הצף.

### דף `/pros/:proId` — EPK (Electronic Press Kit)

**Hero**: cover image + תמונת פרופיל עגולה + שם + headline + תגי VIP/מאומת + CTA "שלח בקשה להצעת מחיר".

**Tabs:**
1. **Showreel** — נגן אודיו עם playlist (כל הטראקים מ-`music_pro_media` type=audio) + גלריית וידאו (embed YouTube/וידאו ישיר).
2. **שירותים ומחירים** — כרטיסי `music_pro_packages` (כותרת/תיאור/מחיר/יחידה).
3. **ציוד** — `gear_list[]` כצ'יפים יפים (Yamaha Genos 2, RCF, וכו').
4. **ביקורות** — מ-`music_pro_reviews` עם תג "✓ מאומת" כש-`is_verified=true`.

**צד:** כרטיס "צור קשר" — כפתור הצעת מחיר + וואטסאפ ישיר (אם מותר) + אייקוני רשתות חברתיות.

### מערכת הצעת מחיר (Inquiry Flow)

`RequestQuoteDialog.tsx` — טופס מודאלי:
- סוג אירוע (חתונה / בר מצווה / אירוע פרטי / אולפן / שיעור)
- תאריך
- מיקום
- תקציב משוער
- הודעה חופשית
- טלפון ליצירת קשר

בשליחה: insert ל-`music_pro_inquiries` + שליחת מייל לבעל הפרופיל דרך `enqueue_email` הקיים + רישום ב-CRM (`leads` הקיים) עם `source='website'`.

### מערכת ביקורות מאומתות

- כשמוזיקאי משנה inquiry ל-`status='completed'`, נפתח קישור לשולח להשאיר ביקורת.
- טריגר DB בודק שלשולח יש inquiry עם `status='completed'` לפני INSERT ב-`music_pro_reviews` → מסמן `is_verified=true`.
- admin יכול ידנית לסמן ביקורות מאומתות מ-`admin.tsx`.

### תג "מאומת" (כחול)
- admin מסמן `is_verified=true` ב-`music_pros` דרך טאב חדש ב-admin: **"מוזיקאים מקצועיים"**.

### מודל עסקי (UI בלבד, ללא תשלום אמיתי בשלב זה)

- **Free**: עד 2 קבצי אודיו, ללא תג VIP, מופיע בתחתית התוצאות.
- **VIP** (`subscription_tier='vip'`): קבצים ללא הגבלה, תג VIP זהוב, מופיע בראש התוצאות, פרופיל בלי באנרים.

לעת עתה השדה ינוהל ידנית ב-admin (כמו `marketplace_business_sellers`). תשלום אמיתי = שלב עתידי (כמו שהחלטנו על "בלי תשלום" קודם).

### נגן צף (Floating Player)

קומפוננטה גלובלית `FloatingAudioPlayer.tsx` ב-`__root.tsx`:
- React Context `AudioPlayerContext` עם `currentTrack`, `play()`, `pause()`, `next()`, `prev()`.
- כשלוחצים Play בכרטיס → דוחף את ה-track ל-context.
- הנגן נדבק לתחתית המסך עם blur background, שם המוזיקאי + שם הטראק + פקדים + כפתור "× סגור".
- ממשיך לנגן בזמן ניווט (כי הוא ב-root, מחוץ ל-Outlet).

### ניהול אדמין

טאב חדש ב-`admin.tsx` → **"מוזיקאים"**:
- אישור/דחייה של פרופילים חדשים (`status: pending → approved`).
- סימון VIP / Verified ידני.
- צפייה בכל ה-inquiries.
- מחיקה / הקפאה.

### עיצוב ו-UX (2026 style)

- כל הכרטיסים `rounded-3xl` עם soft shadow, RTL מלא.
- אנימציות `hover:-translate-y-1.5 hover:shadow-2xl`, fade-in לכפתורים.
- Mobile-first: 1 כרטיס בשורה במובייל (כי הכרטיסים רחבים), 2 ב-tablet, 3 ב-desktop.
- צבע מותג למוזיקאי = `brand_color` hex שנשמר בפרופיל; משמש לרקע ב-hover ולקשתות עדינות בכרטיס.

### קבצים שייווצרו / יערכו

**חדש (UI):**
- `src/routes/pros.tsx` — Layout
- `src/routes/pros.index.tsx` — Discovery + filters
- `src/routes/pros.$proId.tsx` — EPK
- `src/routes/pros.new.tsx` — הרשמה כמוזיקאי
- `src/routes/pros.$proId.edit.tsx` — עריכה
- `src/components/pros/ProCard.tsx`
- `src/components/pros/ProFilters.tsx`
- `src/components/pros/RequestQuoteDialog.tsx`
- `src/components/pros/MediaUploader.tsx`
- `src/components/pros/PackagesEditor.tsx`
- `src/components/pros/FloatingAudioPlayer.tsx` + `src/contexts/AudioPlayerContext.tsx`
- `src/components/admin/MusicProsManager.tsx`
- `src/lib/prosData.ts` — רשימות מקובעות (specialties, genres)

**עריכה:**
- `src/components/SiteHeader.tsx` — להוסיף לינק "מוזיקאים"
- `src/routes/__root.tsx` — להוסיף `AudioPlayerProvider` + `<FloatingAudioPlayer/>`
- `src/routes/admin.tsx` — להוסיף טאב "מוזיקאים"

**מיגרציה:**
- 5 טבלאות חדשות + RLS + טריגר אימות ביקורות + bucket `music-pros` עם policies.

### מה לא בשלב הזה
- ❌ יומן זמינות (לפי בקשתך)
- ❌ תשלום אמיתי לחבילת VIP (UI בלבד, ניהול ידני)
- ❌ עמלת לידים אוטומטית (admin מסמן ידנית בשלב זה)

