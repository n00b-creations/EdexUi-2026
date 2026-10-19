const fs = require('fs');
const path = require('path');
const os = require('os');

let Ajv;
try {
  Ajv = require('ajv');
} catch (e) {
  Ajv = null;
}

const SCHEMA_PATH = path.join(__dirname, 'settings.schema.json');

function defaultUserDataDir() {
  if (process.env.EDEX_USER_DATA) return process.env.EDEX_USER_DATA;
  return path.join(os.homedir(), '.config', 'EdexUi-2026');
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {}
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function writeJsonAtomic(filePath, obj) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 4));
  fs.renameSync(tmp, filePath);
}

function loadSchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
  return JSON.parse(raw);
}

function schemaDefaults() {
  const schema = loadSchema();
  const defaults = {};
  Object.keys(schema.properties || {}).forEach(key => {
    if (Object.prototype.hasOwnProperty.call(schema.properties[key], 'default')) {
      defaults[key] = schema.properties[key].default;
    }
  });
  return defaults;
}

function sanitiseObject(obj) {
  return Object.assign({}, schemaDefaults(), (obj && typeof obj === 'object' ? obj : {}));
}

function loadSettings(userDataDir) {
  const userDir = userDataDir || defaultUserDataDir();
  ensureDir(userDir);
  const settingsFile = path.join(userDir, 'settings.json');

  let raw = readJsonSafe(settingsFile);
  if (!raw) {
    raw = schemaDefaults();
    writeJsonAtomic(settingsFile, raw);
    return raw;
  }

  if (!Ajv) {
    const sanitized = sanitiseObject(raw);
    writeJsonAtomic(settingsFile, sanitized);
    return sanitized;
  }

  const schema = loadSchema();
  const ajv = new Ajv({ useDefaults: true, coerceTypes: true, allErrors: true });
  const validate = ajv.compile(schema);
  const value = raw;
  const valid = validate(value);

  if (!valid) {
    writeJsonAtomic(settingsFile, value);
    value.__validationErrors = validate.errors || [];
  }

  return value;
}

function saveSettings(userDataDir, settings) {
  const userDir = userDataDir || defaultUserDataDir();
  ensureDir(userDir);
  const settingsFile = path.join(userDir, 'settings.json');
  writeJsonAtomic(settingsFile, settings);
  return settings;
}

module.exports = {
  loadSettings,
  saveSettings,
  _schemaPath: SCHEMA_PATH,
  schemaDefaults,
};
