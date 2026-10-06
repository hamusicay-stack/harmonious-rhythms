# בוט טלגרם להורדת קבצים מקישורים

שולחים לבוט קישור לקובץ, והוא מוריד את הקובץ לשרת ומעלה אותו לצ'אט בטלגרם כקובץ.

## מה נתמך
| מקור | הערות |
|------|-------|
| Google Drive | קבצים בודדים עם שיתוף "כל מי שיש לו את הקישור". תיקיות לא נתמכות |
| Nitroflare | **חובה חשבון פרימיום** (`NITROFLARE_USER` + `NITROFLARE_PREMIUM_KEY`). בלי פרימיום יש קאפצ'ה והמתנה, ואי אפשר לעקוף אותן |
| Dropbox | קישורי שיתוף רגילים |
| קישור ישיר | כל קישור שמחזיר קובץ |

- גבול הקבצים לבוט בטלגרם הוא 2GB. קובץ גדול יותר מחולק לחלקים `.001`, `.002` וכו'. מאחדים אותם עם 7-Zip, `copy /b` או `cat`.
- הבוט מתחבר דרך MTProto (Telethon) ולא דרך ה-Bot API הרגיל, כי ב-Bot API הרגיל אפשר להעלות רק עד 50MB.

## הגדרה
1. יוצרים בוט אצל [@BotFather](https://t.me/BotFather) ומקבלים `BOT_TOKEN`.
2. נכנסים ל-https://my.telegram.org, בוחרים API development tools ומקבלים `API_ID` ו-`API_HASH`.
3. מעתיקים את `.env.example` ל-`.env` וממלאים את הערכים. מומלץ למלא `ALLOWED_USERS` עם מזהה הטלגרם שלך (אפשר לקבל אותו מ-@userinfobot), כדי שאנשים אחרים לא ישתמשו בבוט.

## הרצה
```sh
cd telegram-bot
pip install -r requirements.txt
python bot.py
```

או עם Docker:
```sh
docker build -t file-bot .
docker run -d --env-file .env -v $(pwd)/downloads:/app/downloads file-bot
```

הבוט צריך לרוץ כל הזמן. לכן מריצים אותו על שרת או VPS עם מספיק מקום פנוי בדיסק, לפחות כגודל הקובץ הגדול ביותר. Supabase Edge Functions ו-Cloudflare Workers לא מתאימים לזה.
