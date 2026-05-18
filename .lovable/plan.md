
## תכנית: אורגן וירטואלי — חוויית נגינה מלאה לכל הדגמים

### מצב נוכחי (מה כבר בנוי)
- `VisualOrganInterface` עם ניווט סטים/תיקיות/פריטים, ניגון מדגימות `set_audio_samples`, מועדפים, סל קניות, פריסה סקיאומורפית של Tyros.
- `useOrganTheme(modelId)` + `OrganUIThemeEditor` באדמין — כל דגם יכול להחליף נראות (top banner, LCD, tabs, hardware buttons, LEDs).
- 5 דגמים בטבלת `keyboard_models` (ימאהה Sx920 / גנוס / טיירוס 5, קורג 1000 / Pa4x). 2 themes כבר מוגדרים.
- רוטה `/beat/` מציגה גריד סטים; `/beat/$setId` עמוד מוצר. `KeyboardModelSelector` עובד כבר.

### מה ייבנה

**1. רוטה ייעודית: `/organ` (Virtual Organ Studio)**
- עמוד מלא־מסך עם רקע כהה־פרימיום, רספונסיבי, RTL.
- שלב 1: בחירת דגם (גריד כרטיסי `keyboard_models` עם `ui_image_url` כתמונה רקע + שם מותג ומודל). בחירה נשמרת ב-`KeyboardSelectionContext` הקיים.
- שלב 2: `VisualOrganInterface` נטען עם ה-theme של הדגם הנבחר אוטומטית — כל הויזואל (LEDs, פאנל, צבעים, banner) מגיע מ-`organ_ui_themes`.
- כפתור "החלף דגם" קבוע למעלה.

**2. שדרוג `VisualOrganInterface` לחוויית נגינה מלאה**
- **טעינה מהירה**: prefetch של דגימות אודיו בעת ריחוף על סט (`<link rel="preload">` ל-3 הדגימות הראשונות).
- **Tabs לפי theme**: שימוש ב-`theme.tabs` במקום TABS קשיחים — מאפשר להציג לכל דגם את הלשוניות הנכונות (PRESET/USER/HD1/USB1 וכו').
- **Keyboard shortcuts**: 1-4 → Main A-D, Q/W/E → Intro 1-3, A/S/D → Fill, Z/X/C → Ending, Space → Stop. הצגת hints קטנים.
- **מצב נגינה מתמשך (continuous)**: כשמשתמש לוחץ Main A תוך כדי שמתנגן Main B — מעבר חלק (crossfade ~200ms) במקום עצירה.
- **Now-Playing readout** ב-LCD: שם הסט, שם הפריט, איזה כפתור פעיל, מד זמן.
- **Quick-buy CTA** באזור התחתון: "קנה את הסט הזה ₪X" — נוסף לסל מבלי לעזוב את חווית הנגינה.
- **תפריט מועדפים**: צ׳יפ שמסנן ל"⭐ מועדפים בלבד".
- **היסטוריית נגינה**: עמודה צידית קומפקטית עם 10 הפריטים האחרונים שניגנו (בזיכרון, ללא DB).
- **מוביל**: layout מתאים — מעל-md פאנל מלא; מתחת-md grid מוקטן עם 2 עמודות וגלילה אופקית לטאבים (עקבי עם תיקון ה-Admin News).

**3. אינטגרציה Cross-section**
- כפתור "🎹 נסה באורגן" ב-`BeatSetProductPage` שמעביר ל-`/organ?set=<id>` ופותח את הסט אוטומטית.
- ב-`SiteHeader` להוסיף קישור "אורגן וירטואלי" תחת חלק ה-BEAT.

**4. SEO + Meta**
- `<head>` של `/organ` עם title/og ייחודיים בעברית. עמוד עתיר תוכן עם h1 + תיאור קצר של החוויה.
- structured data של `MusicPlaylist` עבור סטים נטענים.

### שינויי קוד עיקריים (לא־ממצה)
- חדש: `src/routes/organ.tsx` — רוטה חדשה, רנדר מותנה: בוחר דגם או VisualOrganInterface.
- שינוי: `src/components/rhythm/VisualOrganInterface.tsx` — הטמעת theme.tabs, keyboard shortcuts, crossfade, now-playing readout, היסטוריה, quick-buy.
- שינוי: `src/components/rhythm/KeyboardModelSelector.tsx` — גריד עשיר יותר עם תמונת רקע, hover state, count of available sets per model.
- שינוי: `src/components/SiteHeader.tsx` — קישור חדש.
- שינוי: `src/components/rhythm/BeatSetProductPage.tsx` — כפתור "נסה באורגן".

### ללא שינויי DB
כל הטבלאות הדרושות קיימות (`rhythm_sets`, `rhythm_folders`, `rhythm_items`, `set_audio_samples`, `rhythm_item_favorites`, `organ_ui_themes`, `keyboard_models`). אין מיגרציה נדרשת.

### מחוץ לתחום (להמשך)
- העלאת דגימות אודיו חדשות לדגמים שאין להם.
- Style Player אוטומטי (רצף Intro→Main→Fill→Ending).
- Mixer לשליטה ב-volume/tempo per part.
- העלאה המונית של themes לכל הדגמים החסרים (אפשר ידנית בעורך הקיים).
