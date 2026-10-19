# EdexUi-2026

EdexUi-2026 is a maintained continuation of the original eDEX-UI project, updated for current Linux systems while preserving the classic sci-fi terminal experience.

## Overview

This project is a desktop terminal dashboard and system monitor built with Electron. It combines a terminal backend, process visualization, app launcher integration, and a visual presentation layer with optional 3D and voice assistant features. The project also includes a metadata-only Athena-Nexus indexer for BlackArch package catalog metadata.

## Architecture at a glance

- `src/` contains the runtime app and visual/terminal components.
- `main.js` is the root Electron entry used by app packaging.
- `src/bootstrap.js` resolves and validates runtime config before startup.
- `src/config/settings.js` and `src/config/settings.schema.json` manage config loading, defaults, and validation.
- `scripts/` contains launch and validation utilities.
- `athena-nexus/` contains the BlackArch metadata indexer and schemas.

## Quick start

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Optional headless launch:

```bash
npm run start:headless
```

## Development workflow

Run unit tests:

```bash
npm run test:unit
```

Run the existing visual/smoke tests:

```bash
npm run test:visual
```

Run the full validation flow:

```bash
npm test
```

## Configuration

Runtime configuration is centralized in `src/config/settings.js` and validated against `src/config/settings.schema.json`.

Key behavior:
- missing values receive schema defaults
- invalid values are normalized or rejected based on validation
- config is persisted in the user data directory under `settings.json`
- visual quality is restricted to `off`, `minimal`, `balanced`, or `cinematic`

This avoids duplicate config default creation and makes the startup flow more reliable.

## Security model

The project includes a voice assistant and command execution features. Those features must remain behind explicit user intent and confirmation logic.

Important safety boundaries:
- raw terminal commands should require user confirmation or an explicit allowlist
- mapped actions should be validated before execution
- external URL handling should stay restricted to supported protocols only
- Athena-Nexus remains metadata-only and must never execute discovered tools or install packages

## 3D & Voice Assistant

This release adds a 3D visualization widget and an in-app voice assistant with configurable security and ASR fallback.

Quick start:

```bash
npm install
cd src
npm install three ws
cd ..
npm start
```

Optional ASR demo server:

```bash
node scripts/asr_ws_demo.js
# type lines and press enter to broadcast them to the app
```

Configuration:
- Open the UI and click the Voice button area, then open Voice Settings to configure command prefix, confirmation, PIN, ASR WS URL, and Offscreen rendering.
- Use the Visuals control to select `Off`, `Minimal`, `Balanced`, or `Cinematic` process visualization quality.
- The process bars are keyboard accessible: use the arrow keys to select a process.

Security:
- By default the assistant may require confirmation before executing raw terminal commands.
- Use a PIN and mapped actions to restrict behavior.

## Athena-Nexus BlackArch Indexer

The repository contains a BlackArch metadata indexing layer under `athena-nexus/`.
It crawls explicit official BlackArch category pages, normalizes package metadata, validates the result, and produces a controlled metadata artifact. It does not execute tools, install packages, scan hosts, or perform network attacks.

Quick start:

```bash
cd athena-nexus/indexer
python3 -m venv .venv
. .venv/bin/activate
pip install -e .
blackarch-index crawl --categories-file ../indexer/categories.txt
```

For the architecture and safety model, see `athena-nexus/indexer/README.md` and `athena-nexus/schemas/tools-index.schema.json`.

## Contributing

Contributions are welcome. Please keep the following in mind:
- favor minimal, targeted changes
- keep startup/config logic centralized
- add tests for config and behavior changes
- avoid broad feature sprawl without clear need
- maintain the safety boundaries around command execution and metadata-only tooling

## Project status

The repo is a maintained continuation of eDEX-UI with active UI and system-monitoring work, along with a security-oriented metadata indexing layer.
It is intended to be a desktop terminal experience first, with optional advanced visual and assistant features layered on top.
