

## תוכנית: כרטיס מודעה פרימיום (Bento Style) ללוח יד-2

### מה כבר קיים בכרטיס הנוכחי ✅
- תמונה ראשית עם hover scale
- תג "דחוף" (אדום + פעימה) ותג "מוקפץ"
- תג "עסקי / פרטי" + תג "מאומת"
- שם / יצרן / דגם
- מחיר בולט בצבע primary (זהב)
- אייקון מיקום + עיר
- תג אודיו (אם קיים)
- מיון אוטומטי: דחוף → מוקפץ → חדש

### מה חסר ונבנה 🔨
- **הוצאת הכרטיס לקומפוננטה נפרדת** `MarketplaceListingCard.tsx` (כרגע inline פעמיים — grid + list — כפילות קוד).
- **Image Carousel בתוך הכרטיס** — חיצי ◄ ► מופיעים ב-hover, נקודות תחתונות, מעבר fade עדין בין תמונות, בלי ניווט לדף.
- **Quick Actions ב-hover (Fade In)**:
  - 💬 כפתור וואטסאפ מהיר (פותח `wa.me/...` עם הודעה מוכנה)
  - ❤️ הוסף/הסר ממועדפים (משתמש בטבלת `marketplace_likes` הקיימת)
  - 👁️ Quick View — פותח Dialog קטן עם נגן אודיו (אם קיים), מפרט מקוצר, וכפתור "לדף המלא"
- **אנימציית Lift**: ב-hover הכרטיס עולה 5px עם צל עמוק (`hover:-translate-y-1.5 hover:shadow-2xl`).
- **תגים צפים מסודרים**: ימין-למעלה = "עסקי/פרטי" + "מאומת", שמאל-למעלה = "דחוף" (פועם) + "מוקפץ".
- **מחיר יוקרתי**: שדרוג טיפוגרפיה — `font-display` בגדול, גרדיאנט זהב (`text-gradient-gold` שכבר קיים ב-styles.css).
- **מסגרת דחיפות יוקרתית**: עידון ה-`urgent-pulse` הקיים — מסגרת דקה יותר (1.5px) עם זוהר בולט יותר.
- **Mobile-friendly**: 2 כרטיסים בשורה במובייל (כרגע 1 בלבד מתחת ל-`sm`), Quick Actions תמיד מוצגים במובייל (אין hover במגע).

### מבנה ויזואלי (ASCII)

```text
┌─────────────────────────────────┐
│ [דחוף🔥] [מוקפץ⬆]    [עסקי][✓] │  ← תגים צפים
│                                 │
│        🖼️  IMAGE CAROUSEL       │  ← 60% גובה
│                                 │
│  ◄  ●  ○  ○                  ► │  ← נקודות + חיצים (hover)
│                                 │
│  [💬 וואטסאפ] [❤️] [👁️ צפייה]  │  ← Quick actions (hover/mobile)
├─────────────────────────────────┤
│  YAMAHA               📍 ירושלים │
│  Genos 2                        │
│                                 │
│  ₪ 45,000   (זהב, גדול)        │
└─────────────────────────────────┘
   רדיוס 24px · צל רך · RTL
```

### קבצים שיוערכו / יווצרו

**חדש:**
- `src/components/marketplace/MarketplaceListingCard.tsx` — קומפוננטה אחת תומכת `variant="grid" | "list"`, עם carousel, quick actions, lift animation.
- `src/components/marketplace/QuickViewDialog.tsx` — Dialog עם תמונה גדולה, נגן `<audio>`, מפרט מקוצר, כפתור "לדף המלא".

**עריכה:**
- `src/routes/marketplace.index.tsx` — להחליף את 2 בלוקי הכרטיסים (grid + list) בקריאה לקומפוננטה החדשה. שינוי breakpoint ל-`grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (2 בשורה כבר במובייל).
- `src/styles.css` — להוסיף keyframes `card-lift` ו-`fade-in-actions`. אופטימיזציה ל-`urgent-pulse` (פחות אגרסיבי, יותר יוקרתי).

### לוגיקת Quick Actions

| פעולה | מקור נתונים | התנהגות |
|---|---|---|
| ❤️ Favorite | `marketplace_likes` (קיים) | toggle insert/delete לפי `auth.uid()` |
| 💬 WhatsApp | `listing.whatsapp` או `listing.phone` | `window.open('https://wa.me/972...')` עם טקסט מוכן: "היי, ראיתי את {title} בלוח המוזיקאי" |
| 👁️ Quick View | פתיחת Dialog | טוען `audio_url`, `description` מקוצר |

### פרטים טכניים

- **Animation**: Tailwind טהור — `transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl`. בלי Framer Motion (לא מותקן, ואין צורך — Tailwind מספיק).
- **Carousel**: state פנימי `currentImage`, חיצים מקדמים index בלי לנווט (`e.preventDefault(); e.stopPropagation();` כדי לא להפעיל את ה-Link עליו).
- **Quick Actions במובייל**: תמיד גלויים בגודל קטן בתחתית התמונה. ב-desktop מופיעים ב-`opacity-0 group-hover:opacity-100`.
- **Performance**: `loading="lazy"` על כל התמונות בקרוסלה, רק התמונה הנוכחית `eager`.
- **Bento**: רדיוס `rounded-3xl` (24px), background `bg-card-elevated` (גרדיאנט שכבר קיים), מסגרת `border-border/40`.

### מה לא נכלל בשלב הזה
- Framer Motion (overkill — Tailwind transitions מספיקות; אם תרצה לעבור אליו בעתיד, נתקין בנפרד).
- שינויים בלוגיקת מיון/סינון — כבר קיים בדיוק כפי שתואר.
- שינוי הסכמה (DB) — כל השדות הנדרשים (`is_urgent`, `seller_type`, `bump_expires_at`, `audio_url`, `whatsapp`) כבר קיימים בטבלה.

