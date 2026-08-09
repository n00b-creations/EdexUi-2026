# ASR WebSocket integration

This document explains how to use a local ASR WebSocket server as a fallback for the voice assistant in EdexUi-2026.

Quick demo server (text-based)

A demo server that accepts lines from stdin and broadcasts them to connected WebSocket clients is included at `scripts/asr_ws_demo.js`.

Run the demo server:

```bash
# from repo root
node scripts/asr_ws_demo.js
# then type text lines and press enter - clients will receive { "text": "..." }
```

Real ASR servers

- VOSK: https://github.com/alphacep/vosk-server
- Whisper-based servers: several community projects provide a REST or WS interface.

If you run a proper ASR server that sends JSON messages with a `text` field over WebSocket, set the URL in Voice Settings (e.g., `ws://localhost:2700`) and the assistant will use it as a fallback when native SpeechRecognition is unavailable.
