
# חיבור תת-דומיין + הגבלת גישה ל-Allowlist

המטרה: לחבר את `Neu.hamusicay` (נראה לי שהכוונה ל-`new.hamuzikai.com` או `neu.hamuzikai.com` — נצטרך לאשר את האיות המדויק של הדומיין הבסיס), ולהבטיח שרק אימיילים מאושרים מראש יוכלו להיכנס לאתר.

## חלק 1 — חיבור תת-הדומיין (פעולה ידנית שלך)

תת-דומיין מתחבר דרך הגדרות הפרויקט ב-Lovable — לא דרך קוד.

1. **Project Settings → Domains → Connect Domain**
2. הזן את תת-הדומיין המלא: `neu.hamuzikai.com` (או האיות הנכון).
3. Lovable יציג רשומת DNS להוספה אצל ספק ה-DNS של הדומיין הבסיס:
   - **CNAME** (לתת-דומיין): `neu` → הערך ש-Lovable ייתן
   - **TXT** לאימות: `_lovable` עם הערך שיוצג
4. אם הדומיין מאחורי Cloudflare/proxy — סמן את התיבה "Domain uses Cloudflare or a similar proxy" בדיאלוג.
5. המתן ל-DNS propagation (עד 72 שעות, בד"כ דקות).
6. הפרויקט חייב להיות **Published** כדי שהדומיין יעבוד.

הערה: זה לא משפיע על האתר השני שלך — תת-דומיין נפרד לחלוטין מהדומיין הבסיס.

## חלק 2 — Allowlist של אימיילים (שינוי קוד + DB)

המודל: רק מי שהאימייל שלו נמצא בטבלת `allowed_emails` יוכל להירשם או להתחבר. כל שאר הניסיונות נדחים בנימוס.

### שינויים ב-Backend

1. **טבלת `allowed_emails`** חדשה:
   - `email` (citext, unique, primary key)
   - `added_by` (uuid, אדמין שהוסיף)
   - `note` (text, אופציונלי — "בטא טסטר", "לקוח" וכו')
   - `created_at`
   - RLS: רק אדמינים קוראים/כותבים.

2. **חסימת signup לא מורשה**: trigger `BEFORE INSERT` על `auth.users` שבודק אם `NEW.email` נמצא ב-`allowed_emails`. אם לא — `RAISE EXCEPTION 'Email not authorized'`.

3. **חסימת login לא מורשה** (קצה נגד הוספת אימייל לטבלה אחרי שהמשתמש כבר נוצר ואז הסרה): RPC `is_email_allowed(email)` + בדיקה ב-`AuthContext` בעת `onAuthStateChange` — אם משתמש קיים אך אימיילו אינו ב-allowlist, מבצעים `signOut()` מיידי ומציגים הודעה.

4. **Disable public signup ברירת מחדל**: משאיר Email/Password פתוח (Trigger יחסום ממילא), אבל מציג ב-UI הודעה ברורה "האתר במצב גישה מוגבלת".

### שינויים ב-Frontend

5. **דף Auth (`/auth`)**: 
   - הצגת באנר: "האתר במצב גישה מוגבלת — רק אימיילים מאושרים יכולים להיכנס".
   - על שגיאת trigger ("Email not authorized") — מציג הודעה ידידותית בעברית.

6. **רכיב `AccessGate`** ברמת `__root.tsx`: אם יש session אבל האימייל לא ב-allowlist — `signOut` ו-redirect ל-`/auth` עם הודעה.

7. **דף ניהול אדמין `/admin/access-control`**: רשימה של אימיילים מאושרים, הוספה/הסרה, חיפוש. שימוש ב-`system_audit_logs` הקיים לתיעוד.

### Google Sign-In
אם תרצה לאפשר רק Email/Password (פשוט יותר ל-allowlist) או גם Google — נצטרך להחליט. אם Google, ה-trigger ב-`auth.users` יחסום גם אותם, אבל חוויית המשתמש פחות נעימה (הם נכנסים ל-Google ואז נדחים).

## שאלות פתוחות שצריך לאשר לפני יישום

1. **איות הדומיין**: כתבת `Neu.hamusicay` — האם הכוונה ל-`neu.hamuzikai.com`? (האתר נקרא "המוזיקאי" = HaMuzikai)
2. **Google Sign-In**: להשאיר מופעל או להשבית בזמן הביטא?
3. **רשימה ראשונית**: יש לך כבר רשימת אימיילים להוסיף, או שתוסיף אחרי שנבנה את המסך?

## פרטים טכניים (לקריאה אם רלוונטי)

- **קבצים שיווצרו**: 
  - `supabase/migrations/...sql` (טבלה + trigger + RPC + RLS)
  - `src/routes/admin.access-control.tsx`
  - `src/components/AccessGate.tsx`
- **קבצים שיתעדכנו**:
  - `src/contexts/AuthContext.tsx` (בדיקת allowlist על onAuthStateChange)
  - `src/routes/auth.tsx` (באנר + שגיאות)
  - `src/routes/__root.tsx` (mount AccessGate)
  - `src/components/admin/AdminSidebar.tsx` (קישור לדף החדש)
- **תיעוד ב-`system_audit_logs`** לכל הוספה/הסרה (תואם ל-Production Safe v1).
