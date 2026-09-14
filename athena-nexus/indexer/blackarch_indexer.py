from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, build_opener, HTTPBasicAuthHandler

BASE_URL = "https://blackarch.org/"
ALLOWED_HOSTS = {"blackarch.org", "www.blackarch.org"}
DEFAULT_USER_AGENT = "Athena-Nexus-BlackArch-Indexer/1.0 (+CYBER-OS)"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


@dataclass(slots=True)
class Tool:
    id: str
    name: str
    package: str
    provider: str = "blackarch"
    version: str | None = None
    description: str | None = None
    homepage: str | None = None
    categories: list[str] = field(default_factory=list)
    source_url: str | None = None


class TableParser(HTMLParser):
    """Extract the first package table from a BlackArch category page."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.cell: list[str] = []
        self.row: list[str] = []
        self.rows: list[list[str]] = []
        self.link: str | None = None
        self.homepage: str | None = None
        self.table_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = dict(attrs)
        if tag == "table" and not self.in_table:
            self.in_table = True
            self.table_depth = 1
            return
        if self.in_table and tag == "table":
            self.table_depth += 1
        if self.in_table and tag == "tr":
            self.in_row = True
            self.row = []
        if self.in_row and tag in {"td", "th"}:
            self.in_cell = True
            self.cell = []
        if self.in_cell and tag == "a":
            href = attrs_map.get("href")
            if href:
                self.link = href

    def handle_endtag(self, tag: str) -> None:
        if self.in_cell and tag in {"td", "th"}:
            value = normalize_space("".join(self.cell))
            self.row.append(value)
            self.cell = []
            self.in_cell = False
            if self.link and value and value != "Name":
                self.homepage = self.link
            self.link = None
        if self.in_table and tag == "tr" and self.in_row:
            if self.row:
                self.rows.append(self.row)
            self.row = []
            self.in_row = False
        if self.in_table and tag == "table":
            self.table_depth -= 1
            if self.table_depth == 0:
                self.in_table = False

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self.cell.append(data)


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def canonical_category(value: str) -> str:
    value = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", value):
        raise ValueError(f"invalid category: {value!r}")
    return value


def canonical_id(package: str) -> str:
    package = package.strip().lower()
    if not package:
        raise ValueError("empty package name")
    return f"blackarch:{package}"


class HttpClient:
    def __init__(self, timeout: float = 30.0, retries: int = 3, delay: float = 0.35) -> None:
        self.timeout = timeout
        self.retries = max(1, retries)
        self.delay = max(0.0, delay)
        self.opener = build_opener()

    def get(self, url: str) -> str:
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            raise ValueError(f"refusing non-allowlisted URL: {url}")

        request = Request(
            url,
            headers={
                "User-Agent": DEFAULT_USER_AGENT,
                "Accept": "text/html,application/xhtml+xml",
            },
            method="GET",
        )

        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                with self.opener.open(request, timeout=self.timeout) as response:
                    content_type = response.headers.get_content_type()
                    if content_type not in {"text/html", "application/xhtml+xml"}:
                        raise ValueError(f"unexpected content type {content_type!r} for {url}")
                    data = response.read(MAX_RESPONSE_BYTES + 1)
                    if len(data) > MAX_RESPONSE_BYTES:
                        raise ValueError(f"response exceeds {MAX_RESPONSE_BYTES} bytes: {url}")
                    time.sleep(self.delay)
                    return data.decode("utf-8", errors="replace")
            except (HTTPError, URLError, TimeoutError, ValueError) as exc:
                last_error = exc
                if attempt + 1 < self.retries:
                    time.sleep(min(2 ** attempt, 8))
        raise RuntimeError(f"failed to fetch {url}: {last_error}")


def parse_category(html: str, category: str, source_url: str) -> list[Tool]:
    parser = TableParser()
    parser.feed(html)
    rows = parser.rows
    if not rows:
        raise ValueError(f"no HTML table found at {source_url}")

    header_index = next(
        (i for i, row in enumerate(rows) if {x.lower() for x in row} >= {"name", "version", "description"}),
        None,
    )
    if header_index is None:
        raise ValueError(f"no package table header found at {source_url}")

    headers = [x.lower() for x in rows[header_index]]
    tools: list[Tool] = []
    for row in rows[header_index + 1 :]:
        if len(row) < 3:
            continue
        values = row + [""] * (len(headers) - len(row))
        record = dict(zip(headers, values))
        name = normalize_space(record.get("name", ""))
        if not name or name.lower() == "name":
            continue
        package = name
        homepage = parser.homepage
        tools.append(
            Tool(
                id=canonical_id(package),
                name=name,
                package=package,
                version=normalize_space(record.get("version", "")) or None,
                description=normalize_space(record.get("description", "")) or None,
                homepage=urljoin(source_url, homepage) if homepage else None,
                categories=[category],
                source_url=source_url,
            )
        )
    return tools


def dedupe(tools: Iterable[Tool]) -> list[Tool]:
    merged: dict[str, Tool] = {}
    for tool in tools:
        current = merged.get(tool.id)
        if current is None:
            merged[tool.id] = tool
            continue
        current.categories = sorted(set(current.categories + tool.categories))
        if not current.version:
            current.version = tool.version
        if not current.description:
            current.description = tool.description
        if not current.homepage:
            current.homepage = tool.homepage
    return sorted(merged.values(), key=lambda x: x.id)


def validate_tools(tools: list[Tool]) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for tool in tools:
        if tool.id in seen:
            errors.append(f"duplicate id: {tool.id}")
        seen.add(tool.id)
        if not tool.name:
            errors.append(f"empty name: {tool.id}")
        if not tool.package:
            errors.append(f"empty package: {tool.id}")
        if tool.source_url and not tool.source_url.startswith("https://blackarch.org/"):
            errors.append(f"unexpected source URL: {tool.id}")
    return errors


def build_index(tools: list[Tool]) -> dict:
    generated = [asdict(t) for t in tools]
    payload = {
        "schema_version": "1.0.0",
        "provider": "blackarch",
        "tool_count": len(generated),
        "tools": generated,
    }
    return payload


def sha256_json(payload: dict) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    return hashlib.sha256(encoded).hexdigest()


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def crawl(categories: list[str], output: Path, timeout: float, retries: int, delay: float) -> dict:
    client = HttpClient(timeout=timeout, retries=retries, delay=delay)
    all_tools: list[Tool] = []
    failures: list[dict[str, str]] = []
    for raw_category in categories:
        category = canonical_category(raw_category)
        url = urljoin(BASE_URL, f"{category}.html")
        print(f"[crawl] {category}: {url}", file=sys.stderr)
        try:
            html = client.get(url)
            parsed = parse_category(html, category, url)
            all_tools.extend(parsed)
            print(f"[ok] {category}: {len(parsed)} tools", file=sys.stderr)
        except Exception as exc:
            failures.append({"category": category, "url": url, "error": str(exc)})
            print(f"[error] {category}: {exc}", file=sys.stderr)

    tools = dedupe(all_tools)
    errors = validate_tools(tools)
    if errors:
        raise RuntimeError("validation failed: " + "; ".join(errors[:10]))

    index = build_index(tools)
    index["manifest_sha256"] = sha256_json(index)
    index["crawl"] = {
        "requested_categories": categories,
        "successful_categories": len(categories) - len(failures),
        "failed_categories": len(failures),
        "failures": failures,
    }
    write_json(output, index)
    return index


def main() -> int:
    parser = argparse.ArgumentParser(description="Athena-Nexus BlackArch metadata indexer")
    parser.add_argument("crawl", nargs="?", default="crawl")
    parser.add_argument("--category", action="append", dest="categories", default=[])
    parser.add_argument("--categories-file", type=Path)
    parser.add_argument("--output", type=Path, default=Path("blackarch/candidate/tools.json"))
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--delay", type=float, default=0.35)
    args = parser.parse_args()

    categories = list(args.categories)
    if args.categories_file:
        categories.extend(
            line.strip()
            for line in args.categories_file.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        )
    if not categories:
        parser.error("provide at least one --category or --categories-file")

    crawl(categories, args.output, args.timeout, args.retries, args.delay)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
