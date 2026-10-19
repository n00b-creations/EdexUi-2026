const os = require('os');
const path = require('path');

const settingsModule = require('./config/settings');

function resolveUserDataDir() {
  if (process.env.EDEX_USER_DATA) return process.env.EDEX_USER_DATA;
  try {
    const electron = require('electron');
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app.getPath('userData');
    }
  } catch (e) {}
  return path.join(os.homedir(), '.config', 'EdexUi-2026');
}

async function start() {
  const userDataDir = resolveUserDataDir();
  const settings = settingsModule.loadSettings(userDataDir);
  global.__EDEX_SETTINGS = settings;
  require('./_boot.js');
}

module.exports = { start, resolveUserDataDir };
