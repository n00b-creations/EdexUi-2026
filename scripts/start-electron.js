#!/usr/bin/env node
const { spawn } = require('node:child_process');

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

  if (shouldUseXvfb(env, platform)) {
    return {
      command: 'xvfb-run',
      args: ['-a', 'env', ...electronArgs],
      env,
    };
  }

  return {
    command: 'env',
    args: electronArgs,
    env,
  };
}

function main() {
  const extraArgs = process.argv.slice(2);
  const spec = buildLaunchSpec(process.env, process.platform, extraArgs);
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
