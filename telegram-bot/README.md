# בוט טלגרם להורדת קבצים מקישורים

שולחים לבוט קישור לקובץ, והוא מעביר את הקובץ ישירות לטלגרם, בלי לשמור אותו בדיסק. הוא מושך מהמקור חתיכה של 512KB, מעלה אותה לטלגרם, מושך את החתיכה הבאה, וכן הלאה. ההורדה וההעלאה קורות במקביל, ובזיכרון יש בכל רגע רק חתיכה קטנה.

## מה נתמך
| מקור | הערות |
|------|-------|
| Google Drive | קבצים בודדים עם שיתוף "כל מי שיש לו את הקישור". תיקיות לא נתמכות |
| Nitroflare | **חובה חשבון פרימיום** (`NITROFLARE_USER` + `NITROFLARE_PREMIUM_KEY`). בלי פרימיום יש קאפצ'ה והמתנה, ואי אפשר לעקוף אותן |
| Dropbox | קישורי שיתוף רגילים |
| קישור ישיר | כל קישור שמחזיר קובץ |

- גבול הקבצים לבוט בטלגרם הוא 2GB. קובץ גדול יותר מחולק לחלקים `.001`, `.002` וכו'. מאחדים אותם עם 7-Zip, `copy /b` או `cat`.
- המקור צריך לדווח מה גודל הקובץ, כי טלגרם צריך לדעת כמה חלקים יגיעו לפני שההעלאה מתחילה. דרייב, Nitroflare ו-Dropbox מדווחים על הגודל.
- הבוט מתחבר דרך MTProto (Telethon) ולא דרך ה-Bot API הרגיל, כי ב-Bot API הרגיל אפשר להעלות רק עד 50MB.

## איך זה עובד (בלי שרת)
1. שולחים קישור לבוט. טלגרם מעביר את ההודעה לפונקציה `telegram-file-bot` ב-Supabase.
2. הפונקציה עונה "⏳ בתור" ומפעילה ב-GitHub Actions את הזרימה `.github/workflows/telegram-transfer.yml`.
3. הזרימה מריצה את `transfer.py`, שמעביר את הקובץ מהקישור ישירות לצ'אט, עם פס התקדמות.

הסיבה לחלוקה הזו היא ש-Supabase לבד מוגבל ל-50MB לקובץ ולכמה דקות ריצה. GitHub Actions מאפשר עד 2GB לחלק ועד 5 שעות ריצה.

> ⚠️ GitHub מאפשר להשתמש ב-Actions רק לדברים שקשורים לקוד של הפרויקט, ועלול לחסום שימוש כזה. בריפו פרטי יש 2,000 דקות חינם בחודש.

## הגדרה
1. **טוקן לבוט**: מקבלים אצל @BotFather.
2. **API_ID ו-API_HASH**: מקבלים ב-https://my.telegram.org, תחת API development tools.
3. **טוקן של GitHub**: ב-GitHub נכנסים ל-Settings, אחר כך Developer settings, Fine-grained tokens, ואז Generate new token. בוחרים רק את הריפו `harmonious-rhythms`, ובהרשאות נותנים **Contents: Read and write** (צריך את זה כדי להפעיל את הזרימה).
4. **Secrets ב-GitHub**: בריפו נכנסים ל-Settings, אחר כך Secrets and variables, ואז Actions:
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`
   - `NITROFLARE_USER` ו-`NITROFLARE_PREMIUM_KEY` (לא חובה)
5. **Secrets ב-Supabase** (אפשר לבקש מ-Lovable להוסיף אותם):
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`: מחרוזת אקראית שאתה בוחר
   - `GITHUB_TOKEN`: הטוקן משלב 3
   - `TELEGRAM_ALLOWED_USERS`: מזהה הטלגרם שלך (לא חובה, אבל מומלץ)
6. **מיזוג ל-main**: הזרימה ב-GitHub רצה רק מהענף הראשי, וגם Lovable פורס את הפונקציה משם.
7. **חיבור הבוט לפונקציה**: פותחים בדפדפן את הכתובת הזו (בלי רווחים):
   ```
   https://api.telegram.org/bot<הטוקן>/setWebhook?url=https://fshwzvsdrdmqjnbmwhvt.supabase.co/functions/v1/telegram-file-bot&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```

## הרצה על שרת (במקום הכול מעל)
```sh
cd telegram-bot
pip install -r requirements.txt
python bot.py
```

או עם Docker:
```sh
docker build -t file-bot .
docker run -d --env-file .env file-bot
```

הבוט צריך לרוץ כל הזמן, למשל על שרת או VPS קטן. הוא לא צריך מקום בדיסק בשביל הקבצים. Supabase Edge Functions ו-Cloudflare Workers לא מתאימים, כי יש להם הגבלת זמן ריצה.
