// Supabase Edge Function: telegram-file-bot
// Telegram webhook for the file bot. For every link a user sends, it posts a status message
// and starts the GitHub Actions workflow `telegram-transfer.yml`, which streams the file into
// the chat (Edge Functions can't: Bot API uploads are capped at 50MB and runs are time-limited).
//
// Deploy:   supabase functions deploy telegram-file-bot --no-verify-jwt
// Secrets:  TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, GITHUB_TOKEN,
//           GITHUB_REPO (default hamusicay-stack/harmonious-rhythms),
//           TELEGRAM_ALLOWED_USERS (optional, comma-separated Telegram user ids)
// Webhook:  https://api.telegram.org/bot<TOKEN>/setWebhook
//             ?url=https://<project-ref>.supabase.co/functions/v1/telegram-file-bot
//             &secret_token=<TELEGRAM_WEBHOOK_SECRET>

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "hamusicay-stack/harmonious-rhythms";
const ALLOWED_USERS = (Deno.env.get("TELEGRAM_ALLOWED_USERS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const URL_RE = /https?:\/\/\S+/g;

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) console.error(`Telegram ${method} failed`, data);
  return data.result;
}

async function startTransfer(link: string, chatId: number, replyTo: number, statusId: number) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "telegram-file-bot",
    },
    body: JSON.stringify({
      event_type: "telegram-transfer",
      client_payload: { link, chat_id: chatId, reply_to: replyTo, status_id: statusId },
    }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
}

async function handleMessage(msg: any) {
  const chatId: number = msg.chat.id;
  const reply = (text: string) =>
    tg("sendMessage", { chat_id: chatId, text, reply_parameters: { message_id: msg.message_id } });

  if (msg.chat.type !== "private" || typeof msg.text !== "string") return;

  if (msg.text.startsWith("/start")) {
    await reply(
      "שלום! 👋\n" +
        "שלח לי קישור לקובץ ואני אעביר אותו ישירות לכאן.\n\n" +
        "נתמך: Google Drive, Nitroflare (עם פרימיום), Dropbox וקישורים ישירים.\n" +
        "קבצים מעל 2GB יחולקו לחלקים.",
    );
    return;
  }

  if (ALLOWED_USERS.length && !ALLOWED_USERS.includes(String(msg.from?.id))) {
    await reply(`⛔ אין לך הרשאה להשתמש בבוט הזה.\nהמזהה שלך: ${msg.from?.id}`);
    return;
  }

  const links: string[] = msg.text.match(URL_RE) ?? [];
  if (!links.length) {
    await reply("לא מצאתי קישור בהודעה.");
    return;
  }

  for (const link of links) {
    const status = await reply(`⏳ בתור...\n${link}`);
    if (!status) continue;
    try {
      await startTransfer(link, chatId, msg.message_id, status.message_id);
    } catch (e) {
      console.error(e);
      await tg("editMessageText", {
        chat_id: chatId,
        message_id: status.message_id,
        text: "❌ לא הצלחתי להפעיל את ההעברה (בדוק את GITHUB_TOKEN ו-GITHUB_REPO)",
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const update = await req.json();
    if (update.message) await handleMessage(update.message);
  } catch (e) {
    console.error(e);
  }
  // Always 200 so Telegram doesn't redeliver the same update.
  return new Response("ok");
});
