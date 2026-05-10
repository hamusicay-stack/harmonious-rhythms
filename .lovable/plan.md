- &nbsp;
  מערכת ניהול עיצוב אורגנים מותאם אישית

### מה נבנה

פאנל ניהול בלוח האדמין שמאפשר לערוך לכל דגם אורגן (טיירוס 5, PSR וכו') את כל המסך הוויזואלי — באנר עליון, באנר תחתון, כפתורים, צבעים, טקסטים, לוגו ולוחות LED — בנפרד לכל דגם.

### שינויים במסד הנתונים

טבלה חדשה `organ_ui_themes` (אחת-לאחת עם `keyboard_models`):

- `model_id` (FK → keyboard_models)
- `top_banner` jsonb — לוגו, טקסט מותג, תווית מסך (STYLE/VOICE), טאבים (label, active), צבע רקע, גרדיאנט, צל
- `bottom_banner` jsonb — כפתורי כלים (NAME/CUT/COPY/PASTE…), צבעי רקע, צבע טקסט
- `screen` jsonb — צבע רקע LCD, צבע גריד, גודל גופן, צבע טקסט פריט
- `buttons` jsonb — מערך כפתורים פיזיים: `{label, x, y, w, h, color, ledColor, shape}` 
- `chassis` jsonb — צבע גוף, מרקם, רדיוס, צל
- `up_button` jsonb — מיקום, צורה, צבע
RLS: קריאה לכולם, כתיבה רק לאדמין.

### עורך ויזואלי בפאנל אדמין

מסך חדש `OrganUIThemeEditor` עם 3 חלקים:

1. **בורר דגם** (ימין) — רשימת דגמי אורגנים, בחר אחד לעריכה.
2. **תצוגה מקדימה חיה** (מרכז) — אותו רכיב `VisualOrganInterface` שמרונדר עם ה-theme הנוכחי. כל שינוי מתעדכן מיידית.
3. **לוח עריכה בכרטיסיות** (שמאל) — Tabs:
  - **באנר עליון**: שדות לטקסט מותג, תווית מסך, מספר טאבים + label + state (active), color picker לרקע/גרדיאנט/טקסט, slider לעובי/גובה.
  - **מסך LCD**: צבע רקע, צבע טקסט, צבע גריד, גודל פונט.
  - **כפתורים פיזיים**: רשימה ניתנת לעריכה — Add/Remove, label, מיקום (x/y), גודל, צבע גוף, צבע LED, צורה (עגול/מלבני). drag-to-position על התצוגה המקדימה.
  - **באנר תחתון**: רשימת כלים (label) + צבעים.
  - **גוף האורגן**: צבע casing, רדיוס פינות, צל, מרקם (חלק/מוברש).
  - **כפתור UP**: צורה, מיקום, צבע.

כלים מקצועיים:

- Color picker (HEX + presets)
- Sliders למספרים (גודל, מיקום, רדיוס, blur)
- Reset לברירת מחדל
- Duplicate theme מדגם אחר
- שמירה/ביטול
- Live preview בזמן אמת

### שינוי ב-VisualOrganInterface

הרכיב יקרא את ה-theme מ-DB לפי model_id ויחיל אותו דרך CSS variables ותוכן דינמי במקום ערכים קשיחים. ברירת מחדל = הנוכחית (טיירוס) אם אין רשומה.

### קבצים

- migration חדש — טבלת `organ_ui_themes` + RLS + ברירת מחדל לטיירוס.
- חדש: `src/components/admin/OrganUIThemeEditor.tsx` (כולל live preview)
- חדש: `src/components/admin/organ-editor/` — TopBannerEditor, ButtonsEditor, ScreenEditor, BottomBannerEditor, ChassisEditor + ColorField, NumberSlider משותפים.
- חדש: `src/hooks/useOrganTheme.ts` — fetch + cache theme לפי model_id.
- עריכת `src/components/rhythm/VisualOrganInterface.tsx` — שימוש ב-theme במקום hardcoded.
- עריכת `src/styles/yamaha-organ.css` — שימוש ב-CSS vars (`--yo-top-bg`, `--yo-btn-color` וכו').
- עריכת `src/routes/admin.tsx` — טאב חדש "עיצוב אורגנים".

### היקף

משימה גדולה. ברגע שתאשר אבנה הכל בשלב אחד.