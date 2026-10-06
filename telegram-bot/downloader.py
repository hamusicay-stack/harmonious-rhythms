"""Stream a URL to disk and split files that are too large for Telegram."""

import os
import re
import uuid
from typing import Awaitable, Callable
from urllib.parse import unquote, urlparse

import aiohttp

from resolvers import Resolved

ProgressCallback = Callable[[int, int | None], Awaitable[None]]

CHUNK = 1024 * 1024
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


async def download(
    session: aiohttp.ClientSession,
    resolved: Resolved,
    dest_dir: str,
    progress: ProgressCallback,
) -> str:
    headers = {"User-Agent": USER_AGENT, **resolved.headers}
    timeout = aiohttp.ClientTimeout(total=None, sock_read=120)
    async with session.get(resolved.url, headers=headers, timeout=timeout, allow_redirects=True) as resp:
        if resp.status >= 400:
            raise DownloadError(f"השרת החזיר שגיאה {resp.status}")
        if resp.content_type == "text/html":
            # Share pages, login walls and Drive quota/permission pages come back as HTML.
            raise DownloadError(
                "התקבל דף אינטרנט במקום קובץ – ייתכן שהקובץ פרטי, נמחק, "
                "או שחרג ממכסת ההורדות"
            )

        name = (
            resolved.filename
            or _filename_from_headers(resp.headers)
            or os.path.basename(unquote(urlparse(str(resp.url)).path))
            or "file"
        )
        name = _safe(name)
        total = resp.content_length

        job_dir = os.path.join(dest_dir, uuid.uuid4().hex)
        os.makedirs(job_dir, exist_ok=True)
        path = os.path.join(job_dir, name)

        done = 0
        with open(path, "wb") as f:
            async for chunk in resp.content.iter_chunked(CHUNK):
                f.write(chunk)
                done += len(chunk)
                await progress(done, total)

    if total and done < total:
        raise DownloadError("ההורדה נקטעה באמצע")
    return path


def split_file(path: str, part_size: int) -> list[str]:
    """Split into name.001, name.002, ... (rejoin with `cat` / `copy /b` / 7-Zip)."""
    size = os.path.getsize(path)
    if size <= part_size:
        return [path]

    parts = []
    with open(path, "rb") as src:
        index = 1
        while True:
            part_path = f"{path}.{index:03d}"
            written = 0
            with open(part_path, "wb") as dst:
                while written < part_size:
                    chunk = src.read(min(CHUNK * 8, part_size - written))
                    if not chunk:
                        break
                    dst.write(chunk)
                    written += len(chunk)
            if written == 0:
                os.remove(part_path)
                break
            parts.append(part_path)
            index += 1
    os.remove(path)
    return parts
