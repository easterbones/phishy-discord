import { canLevelUp, findLevel } from '../../lib/levelling.js';

export default {
  name: 'levelup',
  description: 'Prova a salire di livello se hai abbastanza XP',
  aliases: ['level up', 'lvlup', 'levelup'],
  category: 'rpg',
  guildOnly: true,
  cooldown: 5000,
  execute: async (message, args, { client, config, db }) => {
    try {
      const key = `users.${message.author.id}`;
      const user = db.get(key) || { level: 0, exp: 0 };
      if (!canLevelUp(user.level || 0, user.exp || 0, global.multiplier)) {
        return message.reply({ content: '❌ Non hai abbastanza XP per salire di livello.' });
      }

      const newLevel = findLevel(user.exp || 0, global.multiplier);
      const oldLevel = user.level || 0;
      if (newLevel <= oldLevel) return message.reply({ content: 'Nessun livello disponibile.' });

      user.level = newLevel;
      db.set(key, user);

      await message.reply({ content: `🎉 Congratulazioni! Sei salito dal livello ${oldLevel} al livello ${newLevel}!` });
    } catch (e) {
      console.error('levelup error', e);
      await message.reply({ content: 'Errore durante l\'esecuzione di levelup.' });
    }
  }
};
