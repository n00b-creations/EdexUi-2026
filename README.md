# EdexUi-2026

EdexUi-2026 is a maintained continuation of the original eDEX-UI project, updated for current Linux systems while preserving the classic sci-fi terminal experience.

... (README truncated) ...

## 3D & Voice Assistant (new)

This release adds a 3D visualization widget and an in-app voice assistant with configurable security and ASR fallback.

Quick start:

1. Install dependencies and three.js inside `src/`:

```bash
npm install
cd src
npm install three ws
cd ..
```

2. Start the app:

```bash
npm start
```

3. Optional: run the demo ASR server to simulate speech recognition results:

```bash
node scripts/asr_ws_demo.js
# type lines and press enter to broadcast them to the app
```

Configuration:
- Open the UI and click the Voice button area, then open Voice Settings to configure command prefix, confirmation, PIN, ASR WS URL, and Offscreen rendering.

Security:
- By default the assistant may require confirmation before executing raw terminal commands. Use a PIN and mapped actions to restrict behavior.

## Athena-Nexus BlackArch Indexer

The repository now contains the first production-oriented BlackArch metadata indexing layer under `athena-nexus/`. It crawls explicit official BlackArch category pages, normalizes package metadata into a canonical `blackarch:<package>` registry ID, deduplicates tools across categories, validates the result, and writes an atomic candidate index.

The indexer is metadata-only: it does not execute tools, install packages, or perform network attacks. Runtime execution remains a separate controlled boundary.

```bash
cd athena-nexus/indexer
python3 -m venv .venv
. .venv/bin/activate
pip install -e .
blackarch-index crawl --categories-file ../indexer/categories.txt
```

For the architecture and safety model, see `athena-nexus/indexer/README.md` and `athena-nexus/schemas/tools-index.schema.json`.
