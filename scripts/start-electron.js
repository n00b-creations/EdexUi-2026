#!/usr/bin/env node
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

function shouldUseXvfb(env = process.env, platform = process.platform) {
  if (platform !== 'linux') return false;
  const display = env.DISPLAY || '';
  return display.trim() === '';
}

function buildLaunchSpec(env = process.env, platform = process.platform, extraArgs = []) {
  const electronArgs = [
    '-u',
    'ELECTRON_RUN_AS_NODE',
    'ELECTRON_OZONE_PLATFORM_HINT=x11',
    'electron',
    '--ozone-platform=x11',
    ...extraArgs,
  ];

  const launchEnv = {
    ...env,
    EDEX_ALLOW_MULTIPLE_INSTANCES: '1',
  };

  if (shouldUseXvfb(env, platform)) {
    return {
      command: 'xvfb-run',
      args: ['-a', 'env', ...electronArgs],
      env: launchEnv,
    };
  }

  return {
    command: 'env',
    args: electronArgs,
    env: launchEnv,
  };
}

function main() {
  const extraArgs = process.argv.slice(2);
  const spec = buildLaunchSpec(process.env, process.platform, extraArgs);
  const appRoot = path.resolve(__dirname, '..');
  const electronBinPattern = path.join(appRoot, 'node_modules/electron/dist/electron');

  try {
    execFileSync('pkill', ['-9', '-f', electronBinPattern], { stdio: 'ignore' });
  } catch (error) {
    // Ignore if no matching processes were found.
  }

  const child = spawn(spec.command, spec.args, {
    env: spec.env,
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  shouldUseXvfb,
  buildLaunchSpec,
};
