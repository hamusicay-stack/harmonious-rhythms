"""Open a download as a stream that Telethon can upload from directly – nothing is written to disk."""

import os
import re
from urllib.parse import unquote, urlparse

import aiohttp

from resolvers import Resolved

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)


class DownloadError(Exception):
    pass


def _filename_from_headers(headers) -> str | None:
    cd = headers.get("Content-Disposition", "")
    if m := re.search(r"filename\*=(?:UTF-8'')?([^;]+)", cd, re.I):
        return unquote(m.group(1).strip().strip('"'))
    if m := re.search(r'filename="?([^";]+)"?', cd, re.I):
        return m.group(1).strip()
    return None


def _safe(name: str) -> str:
    name = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", name).strip(" .")
    return name[:200] or "file"


class PartStream:
    """File-like view over the next `size` bytes of an HTTP response.

    Telethon calls `await read(n)` for every upload chunk, so each chunk is pulled from the
    source only when Telegram is ready for it: download and upload run together.
    """

    def __init__(self, content: aiohttp.StreamReader, name: str, size: int):
        self._content = content
        self.name = name
        self.size = size
        self._left = size

    async def read(self, n: int = -1) -> bytes:
        if n < 0 or n > self._left:
            n = self._left
        buf = bytearray()
        while len(buf) < n:
            chunk = await self._content.read(n - len(buf))
            if not chunk:
                raise DownloadError("ההורדה מהמקור נקטעה באמצע")
            buf += chunk
        self._left -= len(buf)
        return bytes(buf)


class RemoteFile:
    """An open HTTP download. Use `parts(max_size)` to get streams to hand to Telethon."""

    def __init__(self, resp: aiohttp.ClientResponse, name: str):
        self._resp = resp
        self.name = name
        self.size = resp.content_length

    def parts(self, max_size: int) -> list[PartStream]:
        """Files over Telegram's limit become name.001, name.002, ... streamed one after another."""
        if self.size <= max_size:
            return [PartStream(self._resp.content, self.name, self.size)]
        parts, offset, index = [], 0, 1
        while offset < self.size:
            size = min(max_size, self.size - offset)
            parts.append(PartStream(self._resp.content, f"{self.name}.{index:03d}", size))
            offset += size
            index += 1
        return parts

    def close(self):
        self._resp.close()


async def open_remote(session: aiohttp.ClientSession, resolved: Resolved) -> RemoteFile:
    headers = {"User-Agent": USER_AGENT, **resolved.headers}
    timeout = aiohttp.ClientTimeout(total=None, sock_read=300)
    resp = await session.get(resolved.url, headers=headers, timeout=timeout, allow_redirects=True)
    try:
        if resp.status >= 400:
            raise DownloadError(f"השרת החזיר שגיאה {resp.status}")
        if resp.content_type == "text/html":
            # Share pages, login walls and Drive quota/permission pages come back as HTML.
            raise DownloadError(
                "התקבל דף אינטרנט במקום קובץ – ייתכן שהקובץ פרטי, נמחק, "
                "או שחרג ממכסת ההורדות"
            )
        if not resp.content_length:
            # Telegram must know the number of parts before the upload starts.
            raise DownloadError("השרת לא מדווח על גודל הקובץ, ולכן אי אפשר להעביר אותו ישירות")

        name = (
            resolved.filename
            or _filename_from_headers(resp.headers)
            or os.path.basename(unquote(urlparse(str(resp.url)).path))
            or "file"
        )
        return RemoteFile(resp, _safe(name))
    except BaseException:
        resp.close()
        raise
