const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

test("visual experience provides explicit quality and reduced-motion controls", () => {
    const manager = read("src/classes/visualExperience.class.js");
    const markup = read("src/ui.html");

    assert.match(manager, /QUALITY_LEVELS = \["off", "minimal", "balanced", "cinematic"\]/);
    assert.match(manager, /prefers-reduced-motion/);
    assert.match(manager, /visibilitychange/);
    assert.match(markup, /id="visual-quality"/);
    assert.match(markup, /id="visual-reduce-motion"/);
});

test("process visualization supports accessible selection and lifecycle cleanup", () => {
    const widget = read("src/classes/threeScene.class.js");

    assert.match(widget, /aria-label", "Interactive top processes visualization"/);
    assert.match(widget, /_onKeyDown/);
    assert.match(widget, /ResizeObserver/);
    assert.match(widget, /ProcessBarsWidget\.prototype\.destroy/);
});

test("external URLs and dynamic process/file content are handled safely", () => {
    const renderer = read("src/_renderer.js");
    const boot = read("src/_boot.js");
    const filesystem = read("src/classes/filesystem.class.js");
    const toplist = read("src/classes/toplist.class.js");
    const preload = read("src/preload.js");

    assert.match(renderer, /\["https:", "http:", "mailto:"\]/);
    assert.match(boot, /Blocked external navigation with unsupported protocol/);
    assert.match(filesystem, /\$\{_escapeHtml\(data \|\| ""\)\}/);
    assert.doesNotMatch(toplist, /<td class="name">\$\{proc\.name\}/);
    assert.match(toplist, /cell\.textContent = value/);
    assert.match(preload, /contextBridge\.exposeInMainWorld\("edex", api\)/);
    assert.match(preload, /normalizeExternalUrl/);
    assert.match(preload, /saveVisualPreferences/);
    assert.match(boot, /Invalid visual quality/);
});
