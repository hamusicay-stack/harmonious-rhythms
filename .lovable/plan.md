# תוכנית שילוב NodeBB כפלטפורמת הפורום הראשית

מסמך תכנון בלבד — ללא כתיבת קוד בשלב זה.

---

## 1. סקירה כללית ועקרונות מנחים

**המצב היום:** הפורום מיושם מלא ב-Supabase עם ~15 טבלאות (`forum_topics`, `forum_posts`, `forum_boards`, `forum_categories`, `forum_tags`, `forum_topic_tags`, `forum_post_votes`, `forum_subscriptions`, `forum_notifications`, `forum_dm_threads`, `forum_direct_messages`, `forum_badges`, `forum_user_badges`, `forum_reports`, `forum_moderation_log`) ומסך UI ב-`src/routes/forum.*` וקומפוננטות תחת `src/components/forum/`.

**היעד:** NodeBB הופך למקור האמת (Source of Truth) של תוכן הפורום. פלטפורמת "המוזיקאי" נשארת מקור האמת של: זהות, פרופיל, נקודות, VIP/מנויים, התראות אפליקטיביות, גמיפיקציה, יד2, אקדמיה, חדשות, שורטס, בעלי מקצוע.

**עקרונות ליבה:**
1. **חוזה משתמש אחיד** — משתמש אחד ב-Supabase = משתמש אחד ב-NodeBB. מזהה משותף: `profiles.id` (UUID).
2. **SSO חד־כיווני** — Supabase מנפיק, NodeBB צורך.
3. **Webhooks מ-NodeBB → פלטפורמה** להזנת אירועים למערכת הנקודות וההתראות.
4. **Webhooks מפלטפורמה → NodeBB** לסנכרון פרופיל, VIP, השעיות.
5. **תאימות אחורה 100%** — משתמשים קיימים עוברים אוטומטית, ההיסטוריה מהגרת, אין איבוד תוכן.

---

## 2. שינויים בפלטפורמה הקיימת

### 2.1 שכבת ניתוב (Frontend)
- החלפת `/forum` ו-`/forum/*` ב-**iframe/reverse-proxy** אל NodeBB (תת-דומיין `forum.hamuzikai.co.il`).
- שמירה על `SiteHeader`/`SiteFooter` סביב ה-iframe עבור מיתוג אחיד.
- קומפוננטות `SiteHeader` יציגו את מספר ההודעות הלא-נקראות מ-NodeBB דרך API.
- דפים שיישארו native בפלטפורמה: `/forum/messages` (DM) — אופציונלי, ראו סעיף 3.

### 2.2 טבלת מיפוי חדשה
טבלה יחידה שתישאר בצד ה-Supabase:

```
public.nodebb_user_map
  ├─ user_id (UUID, FK → profiles.id, PK)
  ├─ nodebb_uid (INTEGER, UNIQUE)
  ├─ nodebb_username (TEXT)
  ├─ synced_at (TIMESTAMPTZ)
  └─ sync_status (TEXT: 'active' | 'suspended' | 'pending')
```

### 2.3 טבלת אירועים מ-NodeBB
לוג אירועים נכנסים (לצורך debounce, replay, audit):

```
public.nodebb_events
  ├─ event_id (TEXT, PK — מזהה מ-NodeBB)
  ├─ event_type (TEXT: 'post.create' | 'topic.create' | 'vote.up' | ...)
  ├─ nodebb_uid (INTEGER)
  ├─ payload (JSONB)
  ├─ processed_at (TIMESTAMPTZ)
  └─ points_awarded (BOOLEAN)
```

### 2.4 הרחבת מערכת הנקודות
`points_rules` יקבל rules חדשים במקום קיימים:
- `forum_post_created` (מ-`forum_posts.INSERT` → מ-NodeBB webhook)
- `forum_topic_created`
- `forum_upvote_received`
- `forum_best_answer`
- `forum_daily_active`

הפונקציה `award_points_for_event` נשארת כפי שהיא — משתנה רק **הטריגר** (webhook במקום trigger DB).

### 2.5 הרחבת מערכת ההתראות
`notifications` תקבל סוגים חדשים:
- `forum_reply` (מישהו הגיב לך)
- `forum_mention` (@username)
- `forum_upvote`
- `forum_moderation` (הודעה נמחקה/הועברה)

NodeBB לא ישלח push/email — הוא רק ידווח לפלטפורמה, והפלטפורמה תשתמש במנגנון ההתראות שלה (`useNotifications`, `NotificationsBell`, notification_preferences).

### 2.6 שינויים ב-Admin
- `/admin/forum` יוסר ויוחלף בקישור ל-ACP של NodeBB (`forum.hamuzikai.co.il/admin`).
- הרשאות admin: משתמש עם `user_roles.role='admin'` בפלטפורמה יקבל אוטומטית `administrator` group ב-NodeBB דרך SSO claims.
- דוחות/moderation logs: יישארו לצפייה היסטורית + view חדש שמושך מ-NodeBB API.

### 2.7 שכבת חוזה API חדשה
תיקייה חדשה: `src/routes/api/public/nodebb/`
- `sso.ts` — Endpoint מנפיק JWT ל-NodeBB (ראה סעיף 4).
- `webhook.ts` — Endpoint מקבל events מ-NodeBB (ראה סעיף 5).
- `user-sync.ts` — קריאה יזומה מ-NodeBB לפרטי משתמש.

---

## 3. טבלאות ופונקציות של הפורום הקיים שניתן להסיר

### 3.1 להסיר לאחר מיגרציה מוצלחת (Deprecate → Archive → Drop)

| טבלה | מחליף ב-NodeBB | הערות |
|---|---|---|
| `forum_topics` | Topics native | היסטוריה מהגרת דרך script |
| `forum_posts` | Posts native | היסטוריה מהגרת |
| `forum_boards` | Categories native | מיפוי 1:1 |
| `forum_categories` | Parent categories | מיפוי 1:1 |
| `forum_tags` | Tags plugin (built-in) | מהגרים שמות בלבד |
| `forum_topic_tags` | tags relation native | |
| `forum_post_votes` | Reputation system | 1 vote = +1 rep |
| `forum_subscriptions` | Watch/Follow native | |
| `forum_badges` + `forum_user_badges` | **נשאר בפלטפורמה** | חלק ממערכת הגמיפיקציה הכללית — לא רק פורום |
| `forum_reports` | Flag system של NodeBB | דוחות ישנים נשמרים לארכיון |
| `forum_moderation_log` | Mod log של NodeBB | דוחות ישנים נשמרים לארכיון |
| `forum_notifications` | **נשאר בפלטפורמה** | ממשיך לשמש כתור לכל ההתראות |

### 3.2 טבלאות שיישארו — DM
`forum_dm_threads` + `forum_direct_messages`:
**המלצה: להשאיר native בפלטפורמה.** NodeBB Chat פחות מלוטש, ויש כבר `CentralChatHub` שמאחד DM של פורום, בעלי מקצוע, ויד2. שילוב NodeBB Chat יפזר את השיחות בין שני מקומות.

### 3.3 פונקציות/RPCs להסרה
- כל טריגר `INSERT ON forum_posts` שמעניק נקודות → יוחלף בקוד ב-webhook.
- `create_forum_topic`, `vote_on_post`, וכו' — לא בשימוש אחרי המעבר ל-iframe.

### 3.4 קומפוננטות Frontend להסרה
`ForumEditor`, `ForumPostCard`, `ForumReplyTree`, `BoardRow`, `CategoryGroup`, `ForumCategoryCard`, `TopicTagManager`, `MentionList`, `mentionSuggestion.ts` — כולן מוחלפות ע"י UI של NodeBB.

**להשאיר:** `UserHoverCard` (לשימוש בפרופיל ציבורי בפלטפורמה).

---

## 4. SSO מול NodeBB

**פרוטוקול נבחר: JWT-based SSO** (plugin `nodebb-plugin-sso-jwt` או custom fork).

### 4.1 זרימה
```text
User in Platform → clicks "Forum" tab
  ↓
Platform generates signed JWT (RS256)
  Payload: { sub: profile.id, username, email, picture, groups, vip_tier, exp }
  ↓
Redirect to https://forum.hamuzikai.co.il/auth/jwt?token=<JWT>
  ↓
NodeBB plugin validates signature (public key)
  ↓
On first login: NodeBB creates user, writes uid → callback to Platform
  Platform saves in nodebb_user_map
  ↓
On subsequent logins: matches by sub → nodebb_user_map.nodebb_uid
  ↓
NodeBB sets session cookie for forum.hamuzikai.co.il domain
  ↓
User lands in forum, fully authenticated
```

### 4.2 מרכיבים
- **Endpoint פלטפורמה:** `POST /api/public/nodebb/sso` — מקבל bearer token של Supabase, מנפיק JWT ל-NodeBB.
- **מפתחות:** זוג RSA (private ב-Supabase secrets: `NODEBB_JWT_PRIVATE_KEY`, public מותקן ב-NodeBB config).
- **תוקף JWT:** 5 דקות (רק לצורך handshake — session cookie מנהל את המשך).
- **Refresh:** על כל שינוי פרופיל בפלטפורמה → webhook יוצא מעדכן NodeBB (סעיף 5.2).

### 4.3 Logout מסונכרן
- Logout בפלטפורמה → קריאה ל-`POST forum.hamuzikai.co.il/api/logout` עם bearer של admin API key.
- Logout ב-NodeBB → אין השפעה על session של Supabase (NodeBB הוא כפוף).

### 4.4 מיפוי הרשאות
| Platform (user_roles) | NodeBB group |
|---|---|
| `admin` | `administrators` |
| `moderator` | `Global Moderators` |
| `vip` (מ-vipTier) | `vip` (custom group, ניתן להצגה בצבע מיוחד) |
| רגיל | `registered-users` |

---

## 5. Webhooks דו-כיווניים

### 5.1 NodeBB → Platform (Inbound)
**Endpoint:** `POST /api/public/nodebb/webhook`
**אבטחה:** HMAC-SHA256 על raw body עם `NODEBB_WEBHOOK_SECRET`, timing-safe compare.

**Events נדרשים:**

| Event | Payload | פעולה בפלטפורמה |
|---|---|---|
| `topic.create` | `{tid, uid, title, cid}` | +points `forum_topic_created` |
| `post.create` | `{pid, tid, uid, content_preview}` | +points `forum_post_created`, בדיקת mentions → יצירת notification |
| `post.upvote` | `{pid, from_uid, to_uid}` | +points `forum_upvote_received` למחבר, notification |
| `post.bestAnswer` | `{pid, uid}` | +points `forum_best_answer` |
| `user.mention` | `{from_uid, to_uid, pid, tid}` | notification `forum_mention` |
| `topic.reply` | `{tid, from_uid, to_uid}` | notification `forum_reply` למי שעוקב |
| `post.flag` | `{pid, reason, from_uid}` | לוג ב-`nodebb_events`, התראה לאדמין |
| `user.ban` | `{uid, reason}` | עדכון `nodebb_user_map.sync_status='suspended'` |

**Idempotency:** כל event נכתב ל-`nodebb_events` עם `event_id` כ-PK — הכנסה שנייה נכשלת בשקט (ON CONFLICT DO NOTHING).

### 5.2 Platform → NodeBB (Outbound)
**מנוע:** trigger DB → `pg_net.http_post` לכתובת NodeBB Write API.
**אבטחה:** header `Authorization: Bearer <NODEBB_ADMIN_API_KEY>` + `_uid=1`.

| Event בפלטפורמה | פעולה ב-NodeBB |
|---|---|
| `profiles.UPDATE` (avatar/display_name) | PUT `/api/v3/users/:uid` |
| `subscription_tiers` change | POST `/api/v3/groups/vip/membership/:uid` (add/remove) |
| `user_roles` change (admin) | POST `/api/v3/groups/administrators/membership/:uid` |
| Admin bans user in Platform | POST `/api/v3/users/:uid/ban` |
| Points threshold reached | POST assign badge in NodeBB (via custom plugin endpoint) |

**Retry:** כל קריאה יוצאת נכתבת ל-`profile_sync_events` (טבלה קיימת) — cron יומי מנסה שוב failures.

---

## 6. חיבור מערכת ההתראות והנקודות הקיימת

### 6.1 זרימת נקודות
```text
User writes post in NodeBB
  ↓
NodeBB fires post.create webhook
  ↓
POST /api/public/nodebb/webhook
  ↓
Verify HMAC → insert into nodebb_events (idempotent)
  ↓
Lookup profile.id via nodebb_user_map WHERE nodebb_uid = X
  ↓
Call award_points_for_event(_user_id, 'forum_post_created', 'forum_post', pid)
  ↓
Existing daily_limit + audit logic kicks in (unchanged)
  ↓
points_ledger updated → user_points balance auto-updated (existing trigger)
```

**יתרון:** אין שכפול של לוגיקת הנקודות. אותה RPC, אותה הגבלת יומית, אותו audit.

### 6.2 זרימת התראות
```text
NodeBB fires user.mention webhook
  ↓
POST /api/public/nodebb/webhook
  ↓
Map from_uid + to_uid → profile.id (both)
  ↓
Check notification_preferences of recipient
  ↓
INSERT INTO notifications (user_id, type='forum_mention', payload={pid, tid, from_user})
  ↓
Existing realtime channel pushes to NotificationsBell
  ↓
User sees notification in Platform header (not in NodeBB)
```

**החלטה מפתח:** כיבוי מנגנון ההתראות הפנימי של NodeBB (email + push). כל ההתראות זורמות דרך הפלטפורמה, כדי לשמור על UX מאוחד ולמנוע כפילות.

### 6.3 ספירת "לא נקרא" בהדר
- קריאה ל-NodeBB API `GET /api/unread/total?uid=X` כל 60 שניות מה-frontend.
- או webhook `notifications.push` שמעדכן counter ב-Supabase.

---

## 7. תאימות למשתמשים קיימים

### 7.1 מיגרציה חד־פעמית (Zero Data Loss)
סקריפט מיגרציה שירוץ פעם אחת בפריסה:

**שלב א' — משתמשים:**
1. איטרציה על כל `profiles`.
2. עבור כל אחד: יצירת user ב-NodeBB דרך Admin API (`POST /api/v3/users`) עם `username`, `email`, `fullname`, `picture`.
3. שמירת `uid` שהוחזר ב-`nodebb_user_map`.
4. סיסמאות: **לא מהגרים** — משתמשים מתחברים דרך SSO אוטומטית.

**שלב ב' — קטגוריות ולוחות:**
5. יצירת parent categories מ-`forum_categories`.
6. יצירת child categories מ-`forum_boards`.
7. שמירת מיפוי ID ישן → ID חדש בטבלת עזר זמנית.

**שלב ג' — תוכן:**
8. איטרציה כרונולוגית על `forum_topics` → `POST /api/v3/topics`.
9. עבור כל topic: איטרציה על `forum_posts` → `POST /api/v3/topics/:tid`.
10. שמירת ה-timestamp המקורי (דורש `nodebb-plugin-import` או Write API עם `timestamp` field).
11. tags מהגרים דרך endpoint tags.

**שלב ד' — קשרים:**
12. Subscriptions: `forum_subscriptions` → NodeBB watch API.
13. Votes: `forum_post_votes` → reputation API (bulk).
14. Badges: **לא מהגרים ל-NodeBB** — נשארים בפלטפורמה כי הם חלק מהגמיפיקציה הכללית.

### 7.2 חלון תחזוקה
- הפורום עובר למצב read-only למשך 2–6 שעות (תלוי בכמות פוסטים).
- הודעה קבועה בראש הפורום: "מעבר לפלטפורמה מתקדמת — חזרה עוד כמה שעות."
- לאחר המיגרציה: הפניית 301 מ-`/forum/topic/:oldSlug` → `forum.hamuzikai.co.il/topic/:newSlug` דרך מיפוי URL.

### 7.3 שמירת URLs לSEO
- טבלה `forum_url_redirects (old_path, new_url)` נבנית בזמן המיגרציה.
- Route חדשה `src/routes/forum.$.tsx` בודקת את הטבלה ומחזירה `redirect(301)`.

### 7.4 First-Time UX למשתמש קיים
1. משתמש מחובר לוחץ על "פורום" בהדר.
2. Platform מזהה שאין רשומה ב-`nodebb_user_map` (במקרה שהמיגרציה פספסה).
3. יצירת user ב-NodeBB on-the-fly דרך SSO.
4. המשתמש רואה: "ברוך הבא לפורום החדש שלנו. כל ההודעות והנושאים שלך מחכים לך."
5. כל הפוסטים ההיסטוריים משויכים לו נכון (כי המיגרציה עשתה match לפי email).

### 7.5 תרחישי כשל
| תרחיש | טיפול |
|---|---|
| NodeBB לא זמין | הפורום מציג fallback: "הפורום זמנית לא זמין, שאר האתר עובד." שאר האתר לא מושפע. |
| Webhook נכשל | נכתב ל-`nodebb_events` עם `processed_at=NULL`; cron יומי מנסה שוב. |
| SSO nonce mismatch | נפילה חזרה לדף login עם הודעה ברורה + כפתור "נסה שוב". |
| משתמש נמחק בפלטפורמה | Outbound webhook → `DELETE /api/v3/users/:uid` + סימון ב-map. |

---

## 8. תוכנית פריסה (High-Level Phases)

1. **Phase 1** — הקמת NodeBB על תת-דומיין, קונפיגורציה בסיסית, plugin SSO.
2. **Phase 2** — בניית endpoints של SSO + webhook בפלטפורמה (בלי לחבר עדיין).
3. **Phase 3** — מיגרציה של סביבת staging + בדיקות עומס.
4. **Phase 4** — חלון תחזוקה + מיגרציה production.
5. **Phase 5** — החלפת ה-UI לפורום ב-iframe, הוצאת הקומפוננטות הישנות מהעץ (אך לא מהמאגר עדיין).
6. **Phase 6** — ניטור 30 יום, ואז DROP של הטבלאות הישנות.

---

## 9. סעיפים טכניים למפתחים

- **Reverse proxy:** Cloudflare Worker על `forum.hamuzikai.co.il` → NodeBB origin (בעיקר בשביל דומיין אחיד + טיפול ב-cookies).
- **NodeBB deployment:** VPS נפרד (Digital Ocean 2GB / Hetzner CX21). NodeBB דורש Node.js host מלא — לא רץ על Cloudflare Workers.
- **Database:** NodeBB עם PostgreSQL נפרד (אל תשתמש באותו DB של Supabase כדי לא לערבב סכמות ובעיות RLS).
- **CDN:** תמונות/uploads של NodeBB → Cloudflare R2 או S3.
- **Realtime:** NodeBB Socket.IO ממשיך לעבוד בתוך ה-iframe; אין צורך להעביר דרך Supabase realtime.
- **RTL:** NodeBB תומך RTL native דרך theme; יידרש theme קסטומי שתואם למיתוג "המוזיקאי" (צבעי זהב, פונטים).
- **Secrets נדרשים בפלטפורמה:** `NODEBB_JWT_PRIVATE_KEY`, `NODEBB_WEBHOOK_SECRET`, `NODEBB_ADMIN_API_KEY`, `NODEBB_BASE_URL`.
- **חלופה שקולה לשקילה לפני התחלה:** Discourse — יותר מודרני, אבל Ruby, יקר יותר להוסטינג, ופחות גמיש בפיתוח plugins ב-JS. NodeBB נבחר בגלל stack משותף.

---

## 10. שאלות פתוחות שכדאי להחליט לפניהן

1. האם ה-DM נשאר בפלטפורמה (מומלץ) או עובר ל-NodeBB Chat?
2. האם ה-badges של הפורום נשארים חלק מהגמיפיקציה הכללית או עוברים ל-NodeBB badge system?
3. האם רוצים להשקיע ב-theme קסטומי מלא ל-NodeBB או להסתפק ב-theme סטנדרטי + CSS overrides קלים?
4. האם המיגרציה כוללת גם `forum_reports` היסטוריים או רק מ-cutoff date?
