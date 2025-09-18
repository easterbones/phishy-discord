import fs from 'fs';
import path from 'path';

const [, , guildId, featureKey, valueArg, ...rest] = process.argv;
if (!guildId || !featureKey || (valueArg !== 'true' && valueArg !== 'false')) {
  console.error('Usage: node scripts/set_channel_feature.mjs <guildId> <featureKey> <true|false> [--force]');
  process.exit(2);
}
const force = rest.includes('--force');

const DB_PATH = path.join(process.cwd(), 'database', 'channels.json');
if (!fs.existsSync(DB_PATH)) {
  console.error('channels.json not found at', DB_PATH);
  process.exit(2);
}

const raw = fs.readFileSync(DB_PATH, 'utf8');
let data;
try { data = JSON.parse(raw); } catch (e) { console.error('Invalid JSON in channels.json', e); process.exit(2); }

const altKey = featureKey === 'antilink' ? 'antiLink' : null;
let updated = 0;
let normalized = 0;

if (!data[guildId]) {
  console.error('Guild id not found in channels.json:', guildId);
  process.exit(2);
}

const targetVal = valueArg === 'true';

for (const [channelId, settings] of Object.entries(data[guildId])) {
  if (!settings || typeof settings !== 'object') continue;

  // normalize altKey -> featureKey
  if (altKey && altKey in settings && !(featureKey in settings)) {
    settings[featureKey] = settings[altKey];
    delete settings[altKey];
    normalized++;
  }

  // decide whether to set
  if (force) {
    settings[featureKey] = targetVal;
    updated++;
  } else {
    // only set channels that matched previous server default (best-effort)
    // if server not present, skip
    const server = data[guildId]['__server__'] || {};
    const prev = server[featureKey] !== undefined ? server[featureKey] : (altKey && server[altKey] !== undefined ? server[altKey] : undefined);
    if (prev !== undefined) {
      const cur = settings[featureKey] !== undefined ? settings[featureKey] : (altKey ? settings[altKey] : undefined);
      if (String(cur) === String(prev)) {
        settings[featureKey] = targetVal;
        updated++;
      }
    }
  }
}

// also normalize and set server key
if (data[guildId]['__server__']) {
  const s = data[guildId]['__server__'];
  if (altKey && altKey in s && !(featureKey in s)) {
    s[featureKey] = s[altKey];
    delete s[altKey];
    normalized++;
  }
  if (force) {
    s[featureKey] = targetVal;
  } else {
    s[featureKey] = targetVal; // reflect the command as server default
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
console.log(`Done. Normalized ${normalized} keys. Updated ${updated} channels. Server ${featureKey} set to ${targetVal}.`);
process.exit(0);
