# Upstream divergence map

Baseline: pristine `GitSquared/edex-ui` `master` (archived, Electron 9 era).

Branch: `rebuild/upstream-core`. No shared git history exists (the fork was re-imported),
so upstream is tracked as a file-level baseline rather than a git remote merge.


## Summary (src/)

| metric | count |
|---|---|
| upstream files | 107 |
| fork files | 136 |
| identical to upstream | 78 |
| modified | 29 |
| added by fork | 29 |
| restored in this branch | 1 |


## Restored from upstream

- `assets/kb_layouts/en-WORKMAN.json` (the only upstream file the fork had lost)

## Added by this fork (grouped)


### Athena-Nexus catalog

- `classes/athena/activityFeed.class.js`
- `classes/athena/adapterHealthView.class.js`
- `classes/athena/toolDetailDialog.class.js`
- `renderer/athena.bootstrap.js`
- `renderer/athena.events.js`
- `ui/athena/all-tools.html`

### Core (modified)

- `classes/geospatialGlobe.class.js`

### Renderer/preload

- `preload.js`

### Visual experience (three.js)

- `assets/config/gev-defaults.json`
- `assets/css/mod_three.css`
- `assets/js/gevBridge.js`
- `classes/networkArcs.class.js`
- `classes/particles.class.js`
- `classes/postprocess.class.js`
- `classes/processCity.class.js`
- `classes/raymarch.class.js`
- `classes/sceneThemes.class.js`
- `classes/sequencer.class.js`
- `classes/threeGlobe.class.js`
- `classes/threeScene.class.js`
- `classes/visualExperience.class.js`
- `init_visuals_final.js`
- `three.min.js`
- `three_worker.js`
- `three_worker_bundle.js`
- `ui_visuals_includes.html`

### Voice assistant

- `classes/voiceAssistant.class.js`
- `classes/voiceCommands.class.js`
- `classes/voiceSettings.class.js`

## Modified from upstream


### Core (modified)

- `_boot.js`
- `_multithread.js`
- `assets/css/boot_screen.css`
- `assets/css/filesystem.css`
- `assets/css/main_shell.css`
- `assets/css/mod_column.css`
- `assets/css/mod_conninfo.css`
- `assets/css/mod_toplist.css`
- `assets/css/modal.css`
- `assets/misc/boot_log.txt`
- `assets/themes/tron.json`
- `classes/audiofx.class.js`
- `classes/clock.class.js`
- `classes/conninfo.class.js`
- `classes/docReader.class.js`
- `classes/filesystem.class.js`
- `classes/keyboard.class.js`
- `classes/locationGlobe.class.js`
- `classes/modal.class.js`
- `classes/netstat.class.js`
- `classes/terminal.class.js`
- `classes/toplist.class.js`
- `classes/updateChecker.class.js`
- `package-lock.json`
- `package.json`
- `ui.html`

### Renderer/preload

- `_renderer.js`

### Visual experience (three.js)

- `assets/css/mod_globe.css`
- `assets/vendor/encom-globe.js`

## How to apply upstream fixes

1. `git clone --depth 1 https://github.com/GitSquared/edex-ui.git /tmp/upstream`
2. Diff `/tmp/upstream/src` against this repo's `src/`.
3. Any file listed under "identical to upstream" can be updated wholesale from upstream.
4. Files under "modified"/"added" need manual review: they carry fork features.
5. Never revert `_boot.js`, `preload.js`, or `package.json` to upstream: they carry
   Electron 41 compatibility, the security hardening commit, and runtime deps.
