"""One-shot transfer, run by GitHub Actions for each link the Supabase webhook receives.

Env: BOT_TOKEN, API_ID, API_HASH, LINK, CHAT_ID, REPLY_TO, STATUS_ID (+ optional NITROFLARE_*).
"""

import asyncio
import logging
import os
import sys

from telethon import TelegramClient
from telethon.sessions import StringSession

from core import transfer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def main() -> int:
    chat_id = int(os.environ["CHAT_ID"])
    reply_to = int(os.environ["REPLY_TO"]) if os.getenv("REPLY_TO") else None
    status_id = int(os.environ["STATUS_ID"])

    # In-memory session: every run logs in fresh with the bot token, nothing is stored.
    client = TelegramClient(StringSession(), int(os.environ["API_ID"]), os.environ["API_HASH"])
    await client.start(bot_token=os.environ["BOT_TOKEN"])
    async with client:
        # The status message was sent by the webhook through the Bot API; same bot, same message id.
        status = await client.get_messages(chat_id, ids=status_id)
        if status is None:
            status = await client.send_message(chat_id, "⏳", reply_to=reply_to)
        try:
            await transfer(client, chat_id, reply_to, status, os.environ["LINK"])
        except Exception:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
