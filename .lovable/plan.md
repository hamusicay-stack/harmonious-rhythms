## סקירה
תיקוני חבילה משולבת — Package A מהדו"ח הקודם + הבאגים החדשים שדיווחת עליהם (לייק כפול, Skeleton, מקלדת בצ'ק-אאוט, צ'ק-אאוט מרובה שלבים, עגלה, תגיות, גייט פרימיום).

---

## 1. באגים טכניים (קריטי)

### 1.1 שגיאת `duplicate key` בלייק (שורטס)
`src/routes/shorts.tsx` — `toggleLike` (שורות 463–493):
- לבדוק מצב נוכחי לפני INSERT, ואם כבר יש שורה — להתעלם בשקט (idempotent).
- במקרה של שגיאה: לבלוע שגיאות `23505 / duplicate key` בלי toast; להציג toast רק על שגיאות אמיתיות (`error.code !== '23505'`).
- ב-`useLikes.ts` — אותה הקשחה.

### 1.2 שמע כפול בין סרטונים (Package A מקודם)
ב-`onTransitionEnd`/החלפת קריאיטור: לבצע `videoRef.current.pause()` + `currentTime = 0` על הסרטון הקודם לפני טעינת ה-`src` החדש. להוסיף `key={short.id}` כבר קיים — לוודא שהוא משתנה לפני שהקודם פוסק.

### 1.3 לייק "נשאר גדול" — fade-out
ב-`@layer utilities` של `src/styles.css` (או בקומפוננטה): keyframe `heart-pop` נוכחי לא דועך. להחליף ל:
```
0%   { transform: scale(0.6); opacity: 0; }
30%  { transform: scale(1.1); opacity: 1; }
70%  { transform: scale(1); opacity: 1; }
100% { transform: scale(1.05); opacity: 0; }
```
משך 700ms, ולהאריך את ה-`setTimeout` בשורה 373 ל-700ms.

### 1.4 כפתור העלאת שורטס לא מופיע
`canUpload` תמיד `true` למשתמש מחובר (שורה 243). אבל ב-state ההתחלתי הוא `false` ויש fragments עם `{canUpload && ...}`. נשנה את הבדיקות להציג את הכפתור לכל משתמש מחובר (ולא להישען על `canUpload`), ולהציג מודאל login למשתמש לא מחובר.

### 1.5 מקלדת מסתירה שדות בצ'ק-אאוט
`src/routes/shop.checkout.tsx`: להוסיף `scroll-margin-block: 120px` על Inputs, ו-`onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })}`. בנוסף `viewport meta` עם `interactive-widget=resizes-content` ב-`__root.tsx`.

---

## 2. שיפורי UI

### 2.1 Shimmer בטעינת שורטס
`src/components/shorts/ShortsSkeleton.tsx` — להחליף `animate-pulse` לקלאס חדש `animate-shimmer` (gradient נע). להוסיף keyframe ל-`styles.css`.

### 2.2 עיצוב toast בשפת המותג
`src/components/ui/sonner.tsx`: להוסיף `richColors`, `position="top-center"`, `duration: 3000`, ו-classNames מותאמים: rounded-2xl, גרדיאנט עדין מ-`primary/10`, צל gold, אייקונים צבעוניים. החלפת ה-✓ הירוק לעיצוב של המותג.

### 2.3 טעינת תגובות מהירה — Skeleton במקום ספינר
`src/components/shorts/CommentsSheet.tsx` שורות 153–155: להחליף את `Loader2` ב-3 שורות skeleton (אווטאר עגול + 2 שורות טקסט) שמופיעות מיד.

---

## 3. שיפורי UX

### 3.1 צ'ק-אאוט בשלבים (Stepper)
שכתוב `shop.checkout.tsx` עם state `step: 1|2|3`:
- שלב 1: פרטים אישיים
- שלב 2: כתובת משלוח (מדולג אם דיגיטלי בלבד)
- שלב 3: סיכום + הערות + תשלום
מעל הטופס: progress indicator 3 נקודות עם תוויות. כפתורי "המשך"/"חזור" עם חצים נכונים ל-RTL (חץ ימינה=חזור, שמאלה=המשך). ולידציה מקומית לכל שלב לפני המעבר.
טלפון/מיקוד: `inputMode="numeric"`, `autoComplete` מתאים (`tel`, `email`, `name`, `street-address`, `address-level2`, `postal-code`).

### 3.2 עגלה — מרווחים מהקצה
`src/components/shop/CartDrawer.tsx`: להוסיף `pl-2` ל-SheetContent, ולעטוף את כפתורי X / מחיקת מוצר ב-`p-2` נוספים כדי להגדיל target area ל-44×44 px לפחות.

### 3.3 הסבר ויזואלי לתגיות
`UploadDialog` (שורות 1243–1268): כבר יש בועות — נוסיף chip מלא יותר עם רקע בולט יותר וטקסט עזרה ויזואלי "הקש Enter / רווח / פסיק כדי להוסיף".

### 3.4 שגיאות מקובצות במקום הרבה אדומים
ב-`shop.checkout.tsx` `submit`: לאסוף את כל השגיאות למערך, ולהציג `toast.error` יחיד עם רשימה (`description: errors.join('\n')`) במקום toast לכל שדה.

---

## 4. מנגנון פרימיום בהעלאה

`UploadDialog` ב-`shorts.tsx`:
- שליפת `tier` כבר קיימת ב-`checkQuota`. נחלץ בדיקה זו ל-state `isPremiumUser` שנטען בפתיחת הדיאלוג.
- אם `!isPremiumUser` ו-`file` כבר נבחר → להחביא את כפתור "פתח מצלמה" השני (או להפוך ל-disabled עם רמז "פרימיום בלבד" + Crown).
- כפתור "החלף סרטון" (X על הקובץ הקיים) למשתמש רגיל.
- פרימיום: לאפשר `multiple` על input הקובץ, להחזיק `files: File[]` ולהעלות בלולאה.
- כשמשתמש רגיל מנסה להעלות סרטון שני באותן 24 שעות → ה-`showUpsell` הקיים תקין, אבל לעדכן את הטקסט להיות שיווקי יותר עם crown gold + benefits list (3 נקודות) + CTA ברור.

---

## 5. RTL וגיוון

- חצי "הבא/חזור" בצ'ק-אאוט: `<ArrowRight>` ל-"חזור" (כי RTL), `<ArrowLeft>` ל-"המשך".
- בדיקה גורפת של כל הניווט בין-עמודי (כבר חלקו טופל קודם, נוודא בשלבי הצ'ק-אאוט החדשים).

---

## קבצים שיתעדכנו
- `src/routes/shorts.tsx` — לייק idempotent, fade-out, גייט פרימיום, שמע כפול, כפתור העלאה
- `src/hooks/useLikes.ts` — בליעת `23505`
- `src/styles.css` — keyframes `heart-pop` חדש + `shimmer`
- `src/components/shorts/ShortsSkeleton.tsx` — shimmer
- `src/components/shorts/CommentsSheet.tsx` — skeleton
- `src/components/ui/sonner.tsx` — עיצוב toast
- `src/routes/shop.checkout.tsx` — Stepper + מקלדת + autocomplete + שגיאות מקובצות
- `src/components/shop/CartDrawer.tsx` — מרווחים
- `src/routes/__root.tsx` — viewport meta

---

## QA לאחר ביצוע
1. שורטס: double-tap על סרטון שכבר עשיתי בו לייק — אין toast אדום, הלב לא מהבהב כפול.
2. אנימציית הלב נעלמת תוך 700ms בfade.
3. החלפת קריאיטור/סרטון — אין שמע כפול.
4. כפתור "העלה סרטון" מופיע לכל משתמש מחובר.
5. צ'ק-אאוט במובייל 339×557 — שלבים עוברים חלק, מקלדת לא מסתירה שדות.
6. עגלה — כפתור X רחוק מהקצה.
7. משתמש רגיל לא יכול לבחור 2 קבצים; פרימיום כן.

ללא הוספת DB / Edge Functions חדשים. שינויים קוד frontend בלבד + tweak `styles.css`.