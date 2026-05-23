## מטרה
לוודא שכל האפליקציה זורמת מימין-לשמאל באופן עקבי, כולל דפים שכרגע נראים LTR (פודקאסטים, אקדמיה, פורום, חנות וכו').

## אבחון
- ה־`<html>` כבר מוגדר `dir="rtl"` ב־`__root.tsx`, אז ההכיוון "אמור" להתפשט — אבל ברדיקס (Dialog/Popover/Select/Tabs/Sheet/Drawer) הכיוון נקבע דרך `DirectionProvider`. ללא Provider, חלק מההתנהגויות (חיצים, אנימציות, פוקוס) מתנהגות כ־LTR.
- ב־`SiteLayout` יש `text-right` אבל אין `dir="rtl"` מפורש על הרכיב — לכן דפים שלא עוברים דרך `SiteLayout` (למשל `SeriesView` בתוך `academy.podcasts.tsx` בזרימות מסוימות) עלולים להיראות שבורים.
- בקוד יש ~220 שימושים בקלאסים פיזיים (`text-left`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `rounded-l/r-*`, `border-l/r`) במקום הלוגיים (`text-start`, `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `rounded-s/e-*`, `border-s/e`). אלה מקור עיקרי לתחושת LTR.
- בעמוד הפודקאסטים ספציפית: `ArrowRight` משמש לכפתור "חזרה" — באייקון RTL זה צריך להיות חץ שמאלי (חזרה = ←), וכן ה־iframe של YouTube הוא LTR טבעית, מה שמחזק תחושת חוסר אחידות.

## תכולת העבודה

### 1) חיזוק RTL גלובלי
- להוסיף `DirectionProvider dir="rtl"` מ־`@radix-ui/react-direction` סביב כל האפליקציה ב־`__root.tsx` (מתחת ל־`QueryClientProvider`).
- ב־`SiteLayout.tsx` להוסיף `dir="rtl"` על ה־`<div>` החיצוני (חגורה ושלייקס לדפים שלא רואים את ה־html).
- ב־`i18n/index.ts` — `applyDocumentDir` כבר מנעול ל־rtl, להשאיר כפי שהוא.

### 2) סוויפ Physical→Logical ב־Tailwind
החלפה אוטומטית בקבצי `src/**/*.tsx` (לא נוגעים ב־`src/components/ui/*` של shadcn ולא ב־`routeTree.gen.ts`):
- `text-left` → `text-start`
- `text-right` → `text-end`
- `ml-N` → `ms-N`, `mr-N` → `me-N` (כולל גרסאות responsive: `md:ml-2` → `md:ms-2`)
- `pl-N` → `ps-N`, `pr-N` → `pe-N`
- `left-N` → `start-N`, `right-N` → `end-N` (במיקום `absolute/fixed`)
- `rounded-l-*` → `rounded-s-*`, `rounded-r-*` → `rounded-e-*` (וכן `tl/bl→ss/es`, `tr/br→se/ee`)
- `border-l*` → `border-s*`, `border-r*` → `border-e*`
- `space-x-N` נשאר (Tailwind מטפל ב־RTL דרך `[&>:not(:last-child)]` — לבדוק מקרי קצה).

### 3) תיקוני אייקונים כיווניים
החלפת אייקוני "back/forward/prev/next" בדפי תוכן כך שיתאימו ל־RTL:
- כפתורי "חזרה" שמשתמשים ב־`ArrowRight` → `ArrowRight` נשאר (בעברית "חזרה" = ימין), אבל היכן שמופיע `ArrowLeft` עם טקסט "המשך/הבא" — להחליף ל־`ArrowLeft` (זה הכיוון "קדימה" ב־RTL). יבדק קובץ־קובץ; מתקנים רק חוסר־עקביות אמיתי.
- אזורי קרוסלה/Pagination: לוודא שכפתורי prev/next משקפים כיוון נכון.

### 4) ביקורת פר־מודול (מדגמים מובילים)
- **`academy.podcasts.tsx`** (כולל `SeriesView`): לבדוק שכל גריד/aside במצב סדרה זורמים ימין־לשמאל; iframe של YouTube יישאר LTR (טבע התוכן), אבל ה־chrome מסביב יהיה RTL.
- **`forum.*`**: עורך, רשימת תגובות, MentionList, ChatBubble.
- **`shop.*`** + `CartDrawer` + `MultiStepCheckout`: כפתורי הבא/הקודם, סייד־קארט.
- **`marketplace.*`**: כרטיסי ליסטינג, Lightbox, צ'אטים.
- **`pros.*`**: ProCard, ProChatDialog, PackagesEditor.
- **`shorts.*`**: סרגלי תגובות וצד.
- **`admin/*`**: כבר רובם דרך `dir="rtl"` מקומי — לאמת שאין סטיות.
- **`auth.tsx`, `reset-password.tsx`, `verify.$code.tsx`**: דפים עצמאיים — להוסיף `dir="rtl"` ולוודא יישור.

### 5) רכיבי UI משותפים (shadcn)
לא נשנה את הקבצים תחת `src/components/ui/*` (auto-generated style), אבל נוודא:
- שכל `Dialog/Sheet/Drawer` מקבלים `dir="rtl"` כאשר נפתחים — באמצעות ה־`DirectionProvider` הגלובלי, כך שלא נדרשים שינויים נקודתיים.
- `Tabs`, `Select`, `DropdownMenu`, `Popover`: יקבלו כיוון מה־Provider.

### 6) QA ויזואלי
- ניווט בדפדפן ל־`/academy/podcasts`, `/academy`, `/forum`, `/shop`, `/marketplace`, `/pros`, `/auth`, `/wiki`, `/leaderboard`, `/points`.
- צילומי מסך במובייל (340px) ובדסקטופ — לוודא יישור, פדינג, אייקונים.
- בדיקת קונסולה: אין warnings על `dir` או על Radix.

## מה לא בתכולה
- שינוי טקסטים/תרגומים — `i18n` כבר תומך, ולא נוסיף תכולה חדשה.
- שינויי logic / RPCs / DB — שינויים פרזנטציה בלבד.
- שינוי `src/components/ui/*` של shadcn.
- אנגלית בתוך iframes/תוכן חיצוני (YouTube) — נשאר כפי שהוא.

## פרטים טכניים
- חבילה חדשה: `@radix-ui/react-direction` (קל; כבר נמשך טרנזיטיבית דרך shadcn — לבדוק לפני התקנה).
- שימוש בסקריפט `sed` ממוקד לסוויף הקלאסים, עם שמירה על responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `hover:`, `focus:`, וכו'). אחרי הסוויף — בדיקת diff וקומפילציה.
- שינוי מינימלי בקוד JSX: רק קלאסים ותוספת `dir="rtl"` במקום אחד.
