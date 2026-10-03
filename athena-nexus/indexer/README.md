# Athena-Nexus BlackArch Indexer

Production-oriented BlackArch catalog indexer for the CYBER-OS/eDEX-UI integration.

## Pipeline

`discover -> crawl -> normalize -> dedupe -> validate -> diff -> publish`

The indexer only collects public package metadata. It does not execute discovered tools, install packages, scan hosts, or perform attacks.

## Quick start

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e .

blackarch-index crawl --category scanner --category networking --category forensic
blackarch-index validate blackarch/candidate/tools.json
blackarch-index diff blackarch/tools.json blackarch/candidate/tools.json
```

For a full crawl, provide an explicit category manifest. The manifest is intentionally version-controlled so upstream page changes cannot silently expand the crawl surface.

## Data source

The primary catalog source is the official BlackArch category pages at `https://blackarch.org/<category>.html`. Each page currently exposes a package table with name, version, description, and homepage columns. The downloader enforces HTTPS, host allowlisting, timeouts, retries, response-size limits, and a configurable delay between requests.

## Safety boundary

The indexer produces metadata only. Runtime execution belongs to the separate Pentest Bridge execution boundary and must remain behind authorization, validation, audit logging, and explicit user approval where required.
