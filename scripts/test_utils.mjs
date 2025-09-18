import { Database, migrateUserDataToSecondaryDBs } from '../lib/utils.js';
import fs from 'fs';
import path from 'path';

(async () => {
  const tmp = path.join(process.cwd(), 'tmp_test_db.json');
  const db = new Database(tmp);

  // Create fake main DB entries with embedded stats/rpg to simulate migration
  db.set('users.999', { id: '999', name: 'olduser', displayName: 'Old User', stats: { messages: 12, commands: 3, joinedAt: Date.now() - 1000000 }, rpg: { health: 50, lastWork: 0 } });
  console.log('Before migration main user:', db.get('users.999'));

  const moved = migrateUserDataToSecondaryDBs(db);
  console.log('Migration moved entries:', moved);
  console.log('After migration main user:', db.get('users.999'));

  const infosPath = path.join(process.cwd(), 'database', 'informations.json');
  const rpgPath = path.join(process.cwd(), 'database', 'rpg.json');
  if (fs.existsSync(infosPath)) console.log('infos.json:', fs.readFileSync(infosPath, 'utf8'));
  if (fs.existsSync(rpgPath)) console.log('rpg.json:', fs.readFileSync(rpgPath, 'utf8'));

  // cleanup
  try { db.delete('users.999'); } catch(e) {}
  process.exit(0);
})();