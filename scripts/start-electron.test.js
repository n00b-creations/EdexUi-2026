const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLaunchSpec, shouldUseXvfb } = require('./start-electron');

test('uses xvfb-run when no DISPLAY is present on Linux', () => {
  const spec = buildLaunchSpec({ DISPLAY: '' }, 'linux', ['--disable-gpu']);
  assert.equal(spec.command, 'xvfb-run');
  assert.deepEqual(spec.args.slice(0, 2), ['-a', 'env']);
  assert.ok(spec.args.includes('--disable-gpu'));
});

test('does not use xvfb-run when DISPLAY is already set', () => {
  const spec = buildLaunchSpec({ DISPLAY: ':1' }, 'linux', []);
  assert.equal(spec.command, 'env');
  assert.ok(spec.args.includes('--ozone-platform=x11'));
});

test('detects headless Linux sessions correctly', () => {
  assert.equal(shouldUseXvfb({ DISPLAY: '' }, 'linux'), true);
  assert.equal(shouldUseXvfb({ DISPLAY: ':1' }, 'linux'), false);
  assert.equal(shouldUseXvfb({}, 'darwin'), false);
});

test('injects a dev override for multiple instances', () => {
  const spec = buildLaunchSpec({ DISPLAY: ':1' }, 'linux', []);
  assert.equal(spec.env.EDEX_ALLOW_MULTIPLE_INSTANCES, '1');
});
