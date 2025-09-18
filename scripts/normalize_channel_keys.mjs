import fs from 'fs';
import path from 'path';

const DB = path.join(process.cwd(), 'database', 'channels.json');
if (!fs.existsSync(DB)) {
  console.error('channels.json not found');
  process.exit(2);
}

const raw = fs.readFileSync(DB, 'utf8');
let data;
try { data = JSON.parse(raw); } catch (e) { console.error('invalid json', e); process.exit(2); }

let moved = 0;
let removed = 0;
for (const [guildId, channels] of Object.entries(data)) {
  if (!channels || typeof channels !== 'object') continue;
  for (const [chanId, settings] of Object.entries(channels)) {
    if (!settings || typeof settings !== 'object') continue;
    // move antiLink -> antilink if present
    if (Object.prototype.hasOwnProperty.call(settings, 'antiLink')) {
      // if lowercase exists, prefer it (but if not, move value)
      if (!Object.prototype.hasOwnProperty.call(settings, 'antilink')) {
        settings['antilink'] = settings['antiLink'];
        moved++;
      }
      delete settings['antiLink'];
      removed++;
    }
    // Also ensure no other camelCase variants remain
    for (const key of Object.keys(settings)) {
      const lk = String(key).toLowerCase();
      if (lk !== key && Object.prototype.hasOwnProperty.call(settings, lk) === false) {
        // avoid touching keys like antiLink2 which are intentionally different
        if (lk === 'antilink') {
          settings[lk] = settings[key];
          delete settings[key];
          moved++;
        }
      }
    }
  }
}

fs.writeFileSync(DB, JSON.stringify(data, null, 2));
console.log(`Done. moved=${moved} removed=${removed}`);
