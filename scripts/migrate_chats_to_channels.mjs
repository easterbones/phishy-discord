import fs from 'fs';
import path from 'path';

const workspace = process.cwd();
const mainDbPath = path.join(workspace, 'database', 'database.json');
const channelsPath = path.join(workspace, 'database', 'channels.json');

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

async function main() {
  console.log('Starting migration: chats -> channels (server-wide under "__server__")');
  const mainDb = readJson(mainDbPath) || {};
  const chats = mainDb.chats || {};
  if (!Object.keys(chats).length) {
    console.log('Nessuna voce in main DB (`chats`) da migrare. Uscita.');
    return;
  }

  // ensure channels file exists
  const channelsExists = fs.existsSync(channelsPath);
  const channelsData = readJson(channelsPath) || {};

  // backup channels.json
  const backupName = `channels.json.bak.${Date.now()}`;
  const backupPath = path.join(path.dirname(channelsPath), backupName);
  try {
    if (channelsExists) {
      fs.copyFileSync(channelsPath, backupPath);
      console.log(`Backup creato: ${backupPath}`);
    } else {
      // create empty file
      writeJson(channelsPath, {});
      console.log('Creato file channels.json vuoto.');
    }
  } catch (e) {
    console.error('Errore creando il backup di channels.json:', e);
    process.exit(1);
  }

  let migratedServers = 0;
  let migratedKeys = 0;

  for (const [guildId, settings] of Object.entries(chats)) {
    if (!settings || typeof settings !== 'object') continue;
    channelsData[guildId] = channelsData[guildId] || {};
    channelsData[guildId]['__server__'] = channelsData[guildId]['__server__'] || {};
    for (const [k, v] of Object.entries(settings)) {
      // do not overwrite existing keys in channelsData
      if (!(k in channelsData[guildId]['__server__'])) {
        channelsData[guildId]['__server__'][k] = v;
        migratedKeys++;
      }
    }
    migratedServers++;
  }

  // write result
  try {
    writeJson(channelsPath, channelsData);
    console.log(`Migrazione completata: ${migratedServers} server processati, ${migratedKeys} chiavi migrate.`);
    console.log('Nota: i dati originali in database/database.json NON sono stati modificati.');
    console.log(`Backup di channels.json: ${backupPath}`);
  } catch (e) {
    console.error('Errore salvando channels.json:', e);
    process.exit(1);
  }
}

main();
