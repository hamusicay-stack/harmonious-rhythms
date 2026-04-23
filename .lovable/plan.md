

# שדרוג עיצוב פרימיום ל-"מוזיקאי שורטס"

מטרה: להפוך את הפיד מ"דף עם וידאו" ל-Full-Screen, שכבתי, ופיזיקלי כמו אפליקציית פרימיום. הוידאו הוא המלך — כל השאר שכבות שקופות מעליו.

## 1. Full-Screen Stage (העיקר)

`src/routes/shorts.tsx` — במובייל הוידאו ייקח את כל המסך: `fixed inset-0`, ללא `SiteHeader`/footer/banners/hashtags כשהפיד פעיל. סרגל הפרופילים יצוף מעל למעלה עם רקע gradient שקוף (`from-black/70 to-transparent`).

```text
┌─────────────────────────┐
│ ●●●●●●● Stories (float) │  ← top overlay (גרדיאנט שחור)
├─────────────────────────┤
│                      ❤  │
│       VIDEO          💬 │  ← side actions צף ימין
│      (object-cover)  📤 │
│                      🔇 │
│ ░░░░ gradient ░░░░░░░░  │  ← gradient תחתון 0→40% גובה
│ @user · עוקב            │
│ תיאור...                │
│ #קורג #ימהה             │
└─────────────────────────┘
```

## 2. שכבת מידע תחתונה (Overlay Content)

- **Gradient רך**: `bg-gradient-to-t from-black/95 via-black/60 to-transparent`, גובה 45% מהוידאו.
- **שם משתמש**: `@{handle}` בבולד עם נקודה זוהרת ליד (online indicator).
- **תיאור**: עד 2 שורות עם `line-clamp-2`, כפתור "עוד" שמרחיב.
- **Hashtags**: מתוך `description` — regex `/#[\u0590-\u05FFa-zA-Z0-9_]+/g`, רינדור כ-`<button>` לחיצים בצבע `text-primary-glow` (לעתיד: ניווט לפיד מתויג).

## 3. Side Actions משודרגים

- **Heart**: אנימציית "פופ" בלחיצה — `scale 1→1.4→1` ב-300ms + פעימת gradient רוז סביב, באמצעות keyframe `heartPop` חדש ב-`styles.css`.
- **Comment**: פותח את `CommentsSheet` הקיים מבלי להפסיק את הוידאו (כבר עובד — נוודא שהוידאו ממשיך לנגן ברקע).
- **WhatsApp**: כפתור ירוק נפרד עם אייקון נקי.
- כל הכפתורים: `bg-black/35 backdrop-blur-md` + `ring-1 ring-white/15` למראה זכוכית.

## 4. Top Carousel (סרגל הפרופילים)

הילה זוהרת קיימת — נשמרת. הוספות:
- **Fade-in** לפרופילים נכנסים (`animate-fade-in` כשנגלל).
- **מגנטיות**: כשהמשתמש גורר את הסרגל ומשחרר באמצע, scroll snap לפרופיל הקרוב (`scroll-snap-type: x mandatory` + `scroll-snap-align: center` על כל פריט).
- **Progress bar** דק (1.5px) בראש הוידאו — כבר קיים, נחזק עם glow: `shadow-[0_0_8px_oklch(0.86_0.16_80/0.6)]`.

## 5. גלילה פיזיקלית/מגנטית

החלפת מנגנון swipe נוכחי (threshold קשיח) ב-**drag-with-preview**:
- בזמן touchmove — `translateY` חי על המסך (follows finger).
- ב-touchend: אם `|dy| > 25%` מגובה המסך **או** מהירות `> 0.5px/ms` → קופץ למסך הבא; אחרת — חוזר עם spring (cubic-bezier).
- אותו עיקרון אופקי בין יוצרים.
- מימוש: state `dragOffset` + `transform: translate3d(0, ${dragOffset}px, 0)` על מיכל הוידאו, ללא ספריה חיצונית.

## 6. Loading & Error states

- **Skeleton** במקום ה-`Loader2` הנוכחי: מלבן `aspect-[9/16]` עם `animate-pulse` + שורת 5 עיגולים בראש (Skeleton פרופילים) — רכיב `<ShortsSkeleton />` חדש בתוך הקובץ.
- **Error UI**: כשטעינה נכשלה — מסך מרכזי עם אייקון `AlertTriangle`, כותרת "משהו השתבש", וכפתור "נסה שוב" `bg-gradient-to-r from-primary to-primary-glow` שקורא ל-`loadShorts()`. state חדש `loadError: string | null`.

## 7. סקופ מחוץ ל-Shorts (לא כלול)

עורך SQL ו-UI הרשאות אדמין הוזכרו אבל הם מחוץ לטעם המסך הזה — אם תרצה אני מציע להפריד אותם להמשך עבודה ולא לערבב במסך הצרכן.

## פרטים טכניים (קצר)

**קבצים לעריכה:**
- `src/routes/shorts.tsx` — full-screen mobile, drag-physics, hashtags parser, skeleton, error state, מבנה overlay חדש.
- `src/styles.css` — keyframes חדשים: `heartPop`, `glowPulse`, `springBack`. utilities: `.animate-heart-pop`, `.shorts-stage` (z-index 50, fixed inset-0).
- אופציונלי חדש: `src/components/shorts/ShortsSkeleton.tsx` ו-`src/components/shorts/HashtagText.tsx` להפרדה.

**ללא תלויות חדשות.** ללא שינויי DB. ללא שינוי ב-RLS/edge functions.

