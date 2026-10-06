"""Telegram bot: send it a file link (Google Drive, Nitroflare, Dropbox, direct) and it uploads the file to the chat."""

import asyncio
import logging
import os
import re
import shutil
import time

import aiohttp
from dotenv import load_dotenv
from telethon import TelegramClient, events

from downloader import DownloadError, download, split_file
from resolvers import ResolveError, resolve

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("bot")

BOT_TOKEN = os.environ["BOT_TOKEN"]
API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "./downloads")
ALLOWED_USERS = {int(u) for u in os.getenv("ALLOWED_USERS", "").replace(" ", "").split(",") if u}
# Bots can upload up to 2 GB per file; leave a little headroom.
MAX_PART = int(os.getenv("MAX_PART_SIZE", str(2000 * 1024 * 1024)))
MAX_PARALLEL = int(os.getenv("MAX_PARALLEL_JOBS", "2"))

URL_RE = re.compile(r"https?://\S+")
EDIT_INTERVAL = 4  # seconds between progress-message edits (Telegram rate limits edits)

client = TelegramClient("bot_session", API_ID, API_HASH)
jobs = asyncio.Semaphore(MAX_PARALLEL)


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def bar(done: int, total: int | None) -> str:
    if not total:
        return human(done)
    pct = done / total
    filled = int(pct * 12)
    return f"[{'█' * filled}{'░' * (12 - filled)}] {pct:.0%}  {human(done)} / {human(total)}"


class Progress:
    def __init__(self, message, title: str):
        self.message = message
        self.title = title
        self.last = 0.0
        self.start = time.monotonic()

    async def __call__(self, done: int, total: int | None):
        now = time.monotonic()
        if now - self.last < EDIT_INTERVAL and done != total:
            return
        self.last = now
        speed = done / max(now - self.start, 0.001)
        try:
            await self.message.edit(f"{self.title}\n{bar(done, total)}\n⚡ {human(speed)}/s")
        except Exception:  # "message not modified" / flood wait – progress is best-effort
            pass


@client.on(events.NewMessage(pattern="/start"))
async def start(event):
    await event.reply(
        "שלום! 👋\n"
        "שלח לי קישור לקובץ ואני אוריד אותו ואעלה אותו לכאן.\n\n"
        "נתמך: Google Drive, Nitroflare (עם פרימיום), Dropbox וקישורים ישירים.\n"
        "קבצים מעל 2GB יחולקו לחלקים."
    )


@client.on(events.NewMessage(func=lambda e: e.is_private and e.text and not e.text.startswith("/")))
async def on_message(event):
    if ALLOWED_USERS and event.sender_id not in ALLOWED_USERS:
        await event.reply("⛔ אין לך הרשאה להשתמש בבוט הזה.")
        return

    links = URL_RE.findall(event.text)
    if not links:
        await event.reply("לא מצאתי קישור בהודעה.")
        return

    for link in links:
        asyncio.create_task(handle_link(event, link))


async def handle_link(event, link: str):
    status = await event.reply(f"⏳ בתור...\n{link}")
    async with jobs:
        path = None
        try:
            async with aiohttp.ClientSession() as session:
                await status.edit("🔍 מאתר את הקובץ...")
                resolved = await resolve(session, link)
                path = await download(session, resolved, DOWNLOAD_DIR, Progress(status, "⬇️ מוריד..."))

            parts = await asyncio.to_thread(split_file, path, MAX_PART)
            for i, part in enumerate(parts, 1):
                name = os.path.basename(part)
                title = f"⬆️ מעלה {name}" + (f" ({i}/{len(parts)})" if len(parts) > 1 else "")
                await client.send_file(
                    event.chat_id,
                    part,
                    caption=name,
                    force_document=True,
                    reply_to=event.id,
                    progress_callback=Progress(status, title),
                )

            note = f"\nהקובץ חולק ל-{len(parts)} חלקים – אחד אותם עם 7-Zip / ‎cat‎." if len(parts) > 1 else ""
            await status.edit("✅ הסתיים!" + note)
        except (ResolveError, DownloadError) as e:
            await status.edit(f"❌ {e}")
        except Exception as e:
            log.exception("Failed processing %s", link)
            await status.edit(f"❌ שגיאה לא צפויה: {e}")
        finally:
            if path:
                shutil.rmtree(os.path.dirname(path), ignore_errors=True)


def main():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    client.start(bot_token=BOT_TOKEN)
    log.info("Bot is running")
    client.run_until_disconnected()


if __name__ == "__main__":
    main()
