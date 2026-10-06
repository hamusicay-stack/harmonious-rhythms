"""Shared transfer logic: resolve a link and stream the file into a Telegram chat."""

import logging
import os
import time

import aiohttp
from telethon import TelegramClient

from downloader import DownloadError, open_remote
from resolvers import ResolveError, resolve

log = logging.getLogger("transfer")

# Bots can upload up to 2 GB per file; leave a little headroom.
MAX_PART = int(os.getenv("MAX_PART_SIZE") or 2000 * 1024 * 1024)
EDIT_INTERVAL = 4  # seconds between progress-message edits (Telegram rate limits edits)


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


async def transfer(client: TelegramClient, chat_id: int, reply_to: int | None, status, link: str):
    """Stream `link` into `chat_id`, reporting progress by editing the `status` message."""
    try:
        async with aiohttp.ClientSession() as session:
            await status.edit("🔍 מאתר את הקובץ...")
            resolved = await resolve(session, link)
            remote = await open_remote(session, resolved)
            try:
                parts = remote.parts(MAX_PART)
                for i, part in enumerate(parts, 1):
                    title = f"🚀 מעביר לטלגרם: {part.name}"
                    if len(parts) > 1:
                        title += f" ({i}/{len(parts)})"
                    uploaded = await client.upload_file(
                        part,
                        file_size=part.size,
                        file_name=part.name,
                        part_size_kb=512,
                        progress_callback=Progress(status, title),
                    )
                    await client.send_file(
                        chat_id,
                        uploaded,
                        caption=part.name,
                        force_document=True,
                        reply_to=reply_to,
                    )
            finally:
                remote.close()

        note = f"\nהקובץ חולק ל-{len(parts)} חלקים – אחד אותם עם 7-Zip / ‎cat‎." if len(parts) > 1 else ""
        await status.edit("✅ הסתיים!" + note)
    except (ResolveError, DownloadError) as e:
        await status.edit(f"❌ {e}")
    except Exception as e:
        log.exception("Failed processing %s", link)
        await status.edit(f"❌ שגיאה לא צפויה: {e}")
        raise
