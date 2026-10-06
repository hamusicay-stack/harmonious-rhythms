"""Turn a share link (Google Drive, Nitroflare, Dropbox, direct URL) into a direct download URL."""

import os
import re
from dataclasses import dataclass, field
from urllib.parse import parse_qs, urlparse

import aiohttp


class ResolveError(Exception):
    pass


@dataclass
class Resolved:
    url: str
    filename: str | None = None
    headers: dict = field(default_factory=dict)


GDRIVE_PATTERNS = [
    re.compile(r"drive\.google\.com/file/d/([\w-]+)"),
    re.compile(r"drive\.google\.com/open\?id=([\w-]+)"),
    re.compile(r"drive\.google\.com/uc\?.*id=([\w-]+)"),
    re.compile(r"docs\.google\.com/\w+/d/([\w-]+)"),
]
NITROFLARE_RE = re.compile(r"nitroflare\.(?:com|net)/(?:view|watch)/([A-Za-z0-9]+)(?:/([^/?#]+))?")


async def resolve(session: aiohttp.ClientSession, link: str) -> Resolved:
    host = urlparse(link).netloc.lower()

    if "drive.google.com" in host or "docs.google.com" in host:
        return await _gdrive(session, link)
    if "nitroflare." in host:
        return await _nitroflare(session, link)
    if "dropbox.com" in host:
        return _dropbox(link)
    if host:
        return Resolved(url=link)
    raise ResolveError("קישור לא תקין")


async def _gdrive(session: aiohttp.ClientSession, link: str) -> Resolved:
    if "/folders/" in link:
        raise ResolveError("תיקיות דרייב לא נתמכות – שלח קישור לקובץ בודד")
    file_id = None
    for pattern in GDRIVE_PATTERNS:
        if m := pattern.search(link):
            file_id = m.group(1)
            break
    if not file_id:
        file_id = parse_qs(urlparse(link).query).get("id", [None])[0]
    if not file_id:
        raise ResolveError("לא הצלחתי לזהות את מזהה הקובץ בדרייב")

    # The usercontent endpoint with confirm=t skips the "can't scan for viruses" page for big files.
    url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"
    return Resolved(url=url)


async def _nitroflare(session: aiohttp.ClientSession, link: str) -> Resolved:
    m = NITROFLARE_RE.search(link)
    if not m:
        raise ResolveError("לא הצלחתי לזהות את מזהה הקובץ ב-Nitroflare")
    file_id, name = m.group(1), m.group(2)

    user = os.getenv("NITROFLARE_USER")
    key = os.getenv("NITROFLARE_PREMIUM_KEY")
    if not user or not key:
        raise ResolveError(
            "הורדה מ-Nitroflare דורשת חשבון פרימיום. "
            "הגדר NITROFLARE_USER ו-NITROFLARE_PREMIUM_KEY בקובץ ‎.env"
        )

    params = {"user": user, "premiumKey": key, "file": file_id}
    async with session.get("https://nitroflare.com/api/v2/getDownloadLink", params=params) as resp:
        data = await resp.json(content_type=None)
    if data.get("type") != "success":
        message = data.get("message") or data
        raise ResolveError(f"Nitroflare החזיר שגיאה: {message}")

    result = data.get("result", {})
    url = result.get("url")
    if not url:
        raise ResolveError("Nitroflare לא החזיר קישור הורדה")
    return Resolved(url=url, filename=result.get("name") or name)


def _dropbox(link: str) -> Resolved:
    url = re.sub(r"([?&])dl=0", r"\1dl=1", link)
    if "dl=1" not in url:
        url += ("&" if "?" in url else "?") + "dl=1"
    return Resolved(url=url)
