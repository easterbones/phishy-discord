import { xpRange, canLevelUp, findLevel } from '../../lib/levelling.js';

export default {
  name: 'livello',
  description: 'Mostra il tuo livello e progresso',
  usage: '',
  category: 'rpg',
  guildOnly: true,
  cooldown: 3000,
  execute: async (message, args, { client, config, db }) => {
    try {
      const target = message.mentions?.members?.first() || message.author || message.member?.user;
      const id = target.id || (target.user && target.user.id) || message.author.id;
      const user = db.get(`users.${id}`) || { level: 0, exp: 0 };
      const level = user.level || findLevel(user.exp || 0, global.multiplier);
      const { min, xp, max } = xpRange(level, global.multiplier);
      const current = (user.exp || 0) - min;
      const percent = xp > 0 ? Math.round((current / xp) * 100) : 0;

      const txt = `👤 Utente: ${target.username || target.tag || target}
🏆 Livello: ${level}
✨ XP: ${user.exp || 0} ( ${current}/${xp} ) — ${percent}%`;

      await message.reply({ content: txt });
    } catch (e) {
      console.error('livello command error', e);
      await message.reply({ content: 'Errore nel comando livello.' });
    }
  }
};
