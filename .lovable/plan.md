

## תוכנית: 2 תיקונים

### בעיה 1: "מצב הכלי: like_new" באנגלית

**מקום הבאג:** `src/components/marketplace/QuickViewDialog.tsx` שורה 71 — מציג את הערך הגולמי `{listing.item_condition}` במקום התווית העברית. בשאר הדף (`marketplace.$listingId.tsx`) זה כבר עובד כי משתמשים ב־`CONDITION_LABELS`.

**פתרון:**
- ב־`QuickViewDialog.tsx` — להוסיף `import { CONDITION_LABELS } from "@/lib/marketplaceData"` ולהחליף את התצוגה ל־`{CONDITION_LABELS[listing.item_condition] || listing.item_condition}`.
- סריקה מהירה לוודא שאין מקומות נוספים שמציגים `item_condition` גולמי (לפי הסריקה — רק QuickView).

### בעיה 2: לא ניתן להיות מחובר לשני חשבונות ב־2 טאבים רגילים של אותו דפדפן

**הסבר טכני (לא באג של הקוד שלך — מגבלת ארכיטקטורה):**

ב־`src/integrations/supabase/client.ts` (שורה 19) ה־storage של ה־auth מוגדר כ־`localStorage`. ל־localStorage **יש מפתח אחד משותף לכל הטאבים של אותו דפדפן/origin**. בנוסף `onAuthStateChange` ב־`AuthContext` מאזין לאירועי storage בין טאבים — לכן מתי שטאב B מתחבר לחשבון אחר, טאב A מקבל מיד את ה־session החדש ו״נדחף החוצה״ לחשבון של B.

**זו ההתנהגות הסטנדרטית של Supabase Auth ושל כל אתר עם session ב־localStorage** (Gmail, Facebook וכו' עובדים אותו דבר — חשבון אחד פעיל לכל חלון רגיל; להחליף חשבון = יציאה מהקודם). חלון Incognito עובד כי יש לו localStorage נפרד.

**יש שתי דרכים לאפשר באמת 2 חשבונות במקביל ב־2 טאבים רגילים — שתיהן פוגעות במשהו:**

#### אופציה A — מעבר ל־`sessionStorage` (פשוט, אבל UX גרוע)
- שינוי ב־`src/integrations/supabase/client.ts` בלבד: `storage: sessionStorage`.
- ✅ כל טאב = session עצמאי. אפשר להיות מחובר ל־A בטאב 1 ו־B בטאב 2.
- ❌ **כל סגירת טאב = יציאה מהמערכת.** משתמשים שיסגרו את הדפדפן יצטרכו להתחבר מחדש בכל פעם.
- ❌ פתיחת טאב חדש מאתר ההתחלה ידרוש התחברות מחדש.

#### אופציה B — Account Switcher (UX טוב, פיתוח גדול)
- בניית מערכת מקומית ששומרת מספר refresh tokens ב־localStorage תחת מפתחות נפרדים, עם UI להחלפה (כמו Gmail).
- בכל טאב יוזמן custom Supabase client עם storage key ייחודי לפי טאב (`crypto.randomUUID()` ב־`sessionStorage`) שמושך את ה־token המתאים.
- ❌ עבודה גדולה: שכתוב של `client.ts` + `AuthContext` + UI חדש להוספה/הסרה/החלפת חשבונות + טיפול ב־refresh של כל token בנפרד.

#### אופציה C — לא לעשות שום שינוי (ההמלצה הנוכחית)
- לבדיקות עם 2 משתמשים: להמשיך להשתמש ב־Incognito / דפדפן שני / פרופיל Chrome אחר. זו הדרך הסטנדרטית בכל פלטפורמה.

### מה אני מבקש שתחליט

לגבי בעיה 1 — אבצע אוטומטית.
לגבי בעיה 2 — תבחר A / B / C. אם לא תגיד, אבצע **רק את תיקון 1** ואשאיר את התנהגות ה־auth כמו שהיא.

### קבצים שיערכו (בעיה 1 בלבד אם זו הבחירה)
- `src/components/marketplace/QuickViewDialog.tsx`

### קבצים שיערכו אם תבחר באופציה A
- `src/integrations/supabase/client.ts` (שורת ה־storage)
- `src/components/marketplace/QuickViewDialog.tsx`

### מה לא נכלל
- שינויי DB / RLS — לא נדרשים.
- שינוי ב־`AuthContext` באופציה A — `onAuthStateChange` ימשיך לעבוד תקין כי sessionStorage לא יורה אירועי storage בין טאבים.

