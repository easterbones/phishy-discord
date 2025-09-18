import { createEmbed } from '../../lib/utils.js';

const TYPES = ['gatto', 'cane', 'drago', 'panda', 'volpe'];

export default {
  name: 'pet',
  description: 'Gestisci il tuo animale virtuale (crea, info, feed)',
  aliases: ['animale'],
  category: 'Animali',
  usage: 'create <nome> [tipo] | info | feed',
  cooldown: 2000,
  execute: async (message, args, { client, db, config }) => {
    const sub = (args.shift() || '').toLowerCase();
    const key = `users.${message.author.id}.pet`;
    let pet = db.get(key);

    if (!['create', 'info', 'feed'].includes(sub)) {
      return message.reply(`Uso: \`${config.prefix}pet create <nome> [${TYPES.join(', ')}]\`, \`${config.prefix}pet info\`, \`${config.prefix}pet feed\``);
    }

    if (sub === 'create') {
      if (pet) return message.reply('⚠️ Hai già un animale. Usa `pet info`.');
      const name = (args.shift() || '').trim();
      if (!name) return message.reply('❌ Specifica un nome per il pet.');
      const type = (args.shift() || TYPES[Math.floor(Math.random() * TYPES.length)]).toLowerCase();
      if (!TYPES.includes(type)) return message.reply(`❌ Tipo non valido. Tipi: ${TYPES.join(', ')}`);
      pet = { name, type, hunger: 0, happiness: 50, createdAt: Date.now(), lastFed: 0 };
      db.set(key, pet);
      return message.reply(`🎉 Hai adottato un **${type}** di nome **${name}**!`);
    }

    if (!pet) return message.reply('📭 Non hai ancora un animale. Crea uno con `pet create`.');

    if (sub === 'info') {
      const embed = createEmbed({
        color: config.embedColors.default,
        title: `🐾 ${pet.name} — ${pet.type}`,
        fields: [
          { name: '🍖 Fame', value: `${pet.hunger}/100`, inline: true },
          { name: '😊 Felicità', value: `${pet.happiness}/100`, inline: true },
          { name: '📅 Creato', value: new Date(pet.createdAt).toLocaleDateString('it-IT'), inline: true },
        ],
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    // feed
    const now = Date.now();
    if (now - (pet.lastFed || 0) < 60 * 1000) { // 1m cooldown per feed
      return message.reply('⏳ Aspetta un po\' prima di nutrire di nuovo.');
    }
    pet.hunger = Math.max(0, pet.hunger - 20);
    pet.happiness = Math.min(100, pet.happiness + 10);
    pet.lastFed = now;
    db.set(key, pet);
    return message.reply(`🍗 Hai nutrito **${pet.name}**! Fame: ${pet.hunger}/100, Felicità: ${pet.happiness}/100.`);
  }
};

