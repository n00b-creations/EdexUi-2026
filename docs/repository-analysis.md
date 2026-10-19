# Repository analysis

## Scope and method

This review is a static analysis of the tracked application source, package manifests, and README. It focuses on architecture, maintainability, and security-sensitive execution paths; it does not include a dynamic security assessment or penetration test.

## Architecture at a glance

- **Product:** EdexUi-2026 is an Electron desktop application that continues the original eDEX-UI terminal-focused interface.
- **Entry point:** The root package starts Electron through `scripts/start-electron.js`, with `src/_boot.js` configured as the main process entry point.
- **Renderer:** `src/ui.html` and the JavaScript classes in `src/classes/` implement the UI. Renderer components access terminal sessions, the filesystem, system-information data, and application-launching helpers.
- **Packaging:** `electron-builder` produces Linux AppImage, DEB, and RPM artifacts, a macOS DMG, and Windows NSIS installers.
- **Recent extensions:** The README documents a 3D widget and configurable voice assistant, including a WebSocket ASR demo server.

## Positive observations

- The package metadata, application identity, and cross-platform packaging targets are clearly defined.
- The project preserves a simple development workflow and documents the extra runtime dependencies needed under `src/`.
- The voice-assistant documentation calls out confirmation and PIN controls, which is appropriate for features that can execute terminal commands.

## Findings and recommended priorities

### 1. Renderer process has unrestricted desktop privileges — high priority

The main window enables `nodeIntegration`, disables `contextIsolation`, and enables Electron Remote. Any renderer-side script injection can therefore reach Node.js and privileged desktop APIs.

**Recommendation:** Use a least-privilege preload bridge with `contextIsolation: true`, disable Node integration and Remote in the renderer, and expose only explicitly validated IPC operations. This should be planned as a staged migration because existing renderer classes currently rely on privileged APIs.

### 2. Text-file preview interpolates file contents into HTML — high priority

The filesystem preview reads UTF-8 text and inserts it directly into a `<textarea>` template. Text containing closing tags can escape the textarea and become executable markup in the already-privileged renderer.

**Recommendation:** Create the textarea with DOM APIs and set its `.value`, or HTML-escape the file contents before creating the modal. Also avoid encoding file paths into JavaScript action strings; pass them through structured modal data or a validated handler.

### 3. System process data is rendered through HTML templates — medium priority

The process-list UI builds rows using `innerHTML` and process metadata. Host-controlled process names and command fields should be treated as untrusted display data.

**Recommendation:** Construct table cells with `textContent`, or consistently escape every dynamic field before inserting it into an HTML template. Add a regression test using strings containing markup characters.

### 4. Privileged launch and URL paths need input validation — medium priority

Application-launching helpers include a shell fallback for desktop-entry commands, and links are passed to Electron's external-browser API. These are legitimate desktop features but raise the impact of malformed or attacker-influenced input.

**Recommendation:** Avoid shell interpretation of desktop-entry `Exec` values when possible, use an argument parser with a strict allowlist of supported field codes, and validate external URL schemes (normally `https:` and optionally `http:`) before opening them.

### 5. Voice command intent does not match its handler — low priority

The voice command named `showProcesses` invokes the application-manager action rather than displaying the process list. This creates a user-visible mismatch and makes voice actions harder to audit.

**Recommendation:** Route the intent to the process-list UI, rename it to match its actual behavior, or remove it until the intended UI action exists. Add an intent-to-handler test for mapped commands.

## Suggested delivery plan

1. **Contain renderer privilege:** introduce a preload API and migrate the most security-sensitive operations (filesystem writes, external links, and app launches) to validated IPC handlers.
2. **Remove HTML-string data paths:** first fix file preview and process rows, then audit other modal and component templates for unescaped dynamic data.
3. **Harden execution boundaries:** implement URL-scheme validation, remove shell fallbacks where feasible, and log rejected requests for diagnostics.
4. **Add focused automated coverage:** test escaping, IPC request validation, URL allowlisting, desktop-entry parsing, and voice command routing.
5. **Run dependency and Electron security maintenance:** keep Electron and native dependencies current, run the existing audit-oriented test workflow in CI, and add a repeatable lightweight test target that does not require packaging the entire application.

## Constraints of this review

The findings describe code-level risk and remediation direction. Their exploitability depends on runtime context, Electron version behavior, the source of displayed files and process data, and any controls outside this repository. Validate the recommendations with targeted integration and security testing before relying on them as complete mitigations.

## Implementation status

The first delivery pass implements the low-risk hardening and visualization foundations identified in this review:

- External browser navigation now accepts only `https:`, `http:`, and `mailto:` URLs in the main and renderer processes.
- File-preview content and process table cells are rendered as text rather than interpolated untrusted markup.
- The voice `showProcesses` action now opens the process list.
- The active UI has an accessible, data-driven process visualization with quality presets, reduced-motion support, background pausing, and keyboard/pointer inspection.
- A preload bridge and validated IPC handlers now cover external URLs and narrowly scoped visual-preference persistence, providing the migration path for the remaining renderer APIs.
- Desktop-entry launches are parsed into executable argument arrays and no longer fall back to a shell command.

The renderer privilege migration remains a separate, breaking architectural change. It requires replacing current renderer access to Node.js and Electron Remote with a validated preload/IPC API; it should be completed before treating the application as hardened against renderer-side script injection.
