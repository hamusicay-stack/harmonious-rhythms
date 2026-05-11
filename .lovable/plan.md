## הסקופ

מערך גדול של שינויים. אבצע ב-5 חבילות בתוך אותו ריצה.

### 1. מיתוג מחדש "rhythms" → "BEAT"

- **טקסטים בממשק**: כל "מקצבים"/"Rhythms"/"Smart Rhythms" → "BEAT" (כותרות, תפריטים, טאבים בניהול, breadcrumbs).
- **URLs**: יצירת `/beat` ו-`/beat/$setId` כראוטים חדשים. הראוטים הישנים `/rhythms` ו-`/rhythms/$setId` יישארו עם redirect ל-`/beat` כדי לא לשבור קישורים קיימים.
- **שמות תיקיות בקוד**: `src/components/rhythm/` → אשאיר כפי שהוא (פנימי בלבד) כדי למנוע שבירת imports נרחבת.
- **שמות טבלאות במסד**: אבצע `ALTER TABLE ... RENAME` עבור הטבלאות העיקריות (`rhythm_sets`, `rhythm_items`, `rhythm_orders`, `rhythm_automation_settings`) → `beat_sets` וכו'. כל הקוד שצורך מהן יעודכן, וטיפוסי Supabase יתחדשו אוטומטית.

### 2. עורך עיצוב אורגן — הרחבה

- **העלאות תמונה**: הוספת שדות `bgImage` ל-`topBanner`, `bottomBanner`, ו-`lcd` ב-OrganTheme. רכיב `MediaUploader` קיים — אשתמש בו עם bucket `music-pros` בתיקייה `organ-themes/`.
- **העלאות אודיו לדגימות**: ב-`RhythmSetsManager` (Beat Sets Manager), הוספת אפשרות העלאת קובץ אודיו ישירה (mp3/wav/m4a/ogg) לבאקט `rhythm-files` (קיים) במקביל לשדה ה-URL הקיים. תמיכה ב-Google Drive: זיהוי URL-ים מסוג `drive.google.com/file/d/{id}/view` והמרה אוטומטית ל-`uc?export=download&id={id}` שעובד כמקור אודיו.
- **כפתור עיצוב אורגן**: אעביר אותו מטאב נפרד ל-toolbar בתוך `RhythmSetsManager` (תחת "BEAT") כ-Button "עיצוב אורגן" שפותח את העורך כ-Dialog.

### 3. דף מוצר ציבורי לכל סט

- **ראוט חדש**: `/beat/$setId` יציג דף מוצר כמו marketplace listing — banner/cover, תיאור, מחיר, רשימת רצועות (mp3) עם נגן רצועה אחר רצועה, כפתור הוספה לעגלה. הסנכרון עם נתוני הסט אוטומטי כי כולם קוראים מאותה טבלה (`rhythm_sets` → `beat_sets`).
- **רכיב חדש**: `BeatSetProductPage.tsx` עם רשימת רצועות שלמות (לא דמו של אורגן). שימוש בנגן `<audio>` עם פלייליסט.
- **מהאורגן**: כפתור חדש "צפה כדף מוצר" יוביל ל-`/beat/$setId`.

### 4. ניהול

- טאב הניהול הקיים "מקצבים" יקרא "BEAT".
- כפתור "עיצוב אורגן" יישאר בטאב נפרד כגיבוי, אבל גם יהיה זמין מתוך BEAT manager.

### 5. סנכרון

כל הצגות הסט (אורגן + דף מוצר + admin) יקראו מאותן טבלאות → סנכרון אוטומטי.

### קבצים עיקריים שיתעדכנו

- מיגרציה: שינוי שמות טבלאות + הוספת שדה `cover_image_url` אם חסר.
- `src/lib/organTheme.ts` + `OrganUIThemeEditor.tsx` + `OrganScreenPreview.tsx` — תמיכה בתמונות רקע.
- `src/components/admin/RhythmSetsManager.tsx` — העלאת אודיו, כפתור עורך עיצוב, תווית BEAT.
- `src/routes/beat.tsx` + `src/routes/beat.$setId.tsx` — ראוטים חדשים.
- `src/routes/rhythms.tsx` + `src/routes/rhythms.$setId.tsx` — redirect.
- `src/components/rhythm/BeatSetProductPage.tsx` — חדש.
- `src/components/SiteHeader.tsx` ועוד — תיוג מחדש.

### היקף

עבודה גדולה. אבצע בריצה אחת לאחר אישור.