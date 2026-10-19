const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const settingsModulePath = path.join(__dirname, '..', 'src', 'config', 'settings.js');

test('settings loader writes defaults and validates accepted values', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edex-settings-'));
  delete require.cache[require.resolve(settingsModulePath)];
  const settingsModule = require(settingsModulePath);

  const settings = settingsModule.loadSettings(tmpDir);
  assert.ok(settings, 'settings should be returned');
  assert.strictEqual(typeof settings.port, 'number');
  assert.ok(['off', 'minimal', 'balanced', 'cinematic'].includes(settings.visualQuality));

  const settingsFile = path.join(tmpDir, 'settings.json');
  assert.ok(fs.existsSync(settingsFile), 'settings.json should exist after load');

  settings.theme = 'unit-test-theme';
  settingsModule.saveSettings(tmpDir, settings);

  const reloaded = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  assert.strictEqual(reloaded.theme, 'unit-test-theme');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
