<!-- Added documentation about 3D widget and voice assistant -->

## 3D widget and Voice Assistant

This repository now includes a lightweight 3D widget (in `src/classes/threeScene.class.js`) and a voice assistant integration (in `src/classes/voiceAssistant.class.js` and `src/classes/voiceCommands.class.js`). These are intended as a starting point for interactive, GPU-accelerated visuals and terminal voice automation.

Quick install notes

- Install dependencies and three.js inside `src/`:

```bash
npm install
cd src
npm install three
cd ..
```

- Run the app:

```bash
npm start
```

What was added

- A 3D "process bars" widget: a small three.js scene showing top processes as vertical bars. It polls `window.si.processes()` (the repo's sysinfo proxy) when available and updates bar heights.
- A voice assistant that prefers browser-native SpeechRecognition and falls back to a WebSocket ASR server (if configured). The assistant supports:
  - A command prefix (default configurable), e.g. say "run ls -la" to execute `ls -la`.
  - A confirmation modal before executing dangerous/raw commands.
  - A mapping layer (see `src/classes/voiceCommands.class.js`) that maps natural phrases to safe actions (open app manager, show files, etc.).

Security and safety

The assistant can execute commands in the active terminal — this is powerful and dangerous. By default the assistant in this repo requires confirmation before executing a recognized command. You should:

- Only enable voice execution in trusted environments.
- Prefer mapped actions (open UI features) instead of raw terminal execution when possible.
- Consider additional safeguards (rate limiting, whitelists, or a PIN confirmation).

Local ASR fallback

If your Electron build lacks SpeechRecognition, you can run a local ASR server (e.g., VOSK or Whisper-based servers) that sends JSON results over a WebSocket. Point the assistant at `ws://localhost:2700` in the UI init code to enable the fallback.

Next steps

- Replace the demo visualization with a globe or particle system (use `three.js` loaders and EffectComposer).
- Move heavy rendering to an OffscreenCanvas worker if you build complex scenes.
- Add richer command mapping and intent parsing (small local NLU) for safer automation.
