"""Long-running Telegram bot (for a server). For the serverless setup see transfer.py.

Send it a file link (Google Drive, Nitroflare, Dropbox, direct) and it streams the file
straight into the chat – downloaded chunks are uploaded as they arrive, nothing is stored on disk."""

import asyncio
import logging
import os
import re

from dotenv import load_dotenv
from telethon import TelegramClient, events

from core import transfer

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("bot")

BOT_TOKEN = os.environ["BOT_TOKEN"]
API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
ALLOWED_USERS = {int(u) for u in os.getenv("ALLOWED_USERS", "").replace(" ", "").split(",") if u}
MAX_PARALLEL = int(os.getenv("MAX_PARALLEL_JOBS", "2"))

URL_RE = re.compile(r"https?://\S+")

client = TelegramClient("bot_session", API_ID, API_HASH)
jobs = asyncio.Semaphore(MAX_PARALLEL)


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
        try:
            await transfer(client, event.chat_id, event.id, status, link)
        except Exception:
            pass  # already reported to the user and logged


def main():
    client.start(bot_token=BOT_TOKEN)
    log.info("Bot is running")
    client.run_until_disconnected()


if __name__ == "__main__":
    main()
