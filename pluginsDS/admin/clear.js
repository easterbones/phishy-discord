import { createEmbed } from '../../lib/utils.js';

export default {
  name: 'clear',
  description: 'Elimina un numero di messaggi nel canale corrente',
  aliases: ['purge', 'prune'],
  category: 'Admin',
  guildOnly: true,
  permissions: ['ManageMessages'],
  usage: '<numero 1-100>',
  cooldown: 3000,
  execute: async (message, args, { client, config }) => {
    const amount = parseInt(args[0] || '0', 10);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❌ Specifica un numero valido tra 1 e 100.');
    }
    try {
      await message.delete().catch(() => {});
      const deleted = await message.channel.bulkDelete(amount, true);
      const embed = createEmbed({
        color: config.embedColors.success,
        description: `🧹 Eliminati ${deleted.size} messaggi.`,
        botAvatar: client.user.displayAvatarURL()
      });
      const info = await message.channel.send({ embeds: [embed] });
      setTimeout(() => info.delete().catch(() => {}), 4000);
    } catch (e) {
      console.error('Bulk delete failed:', e);
      message.reply('❌ Impossibile eliminare i messaggi (troppo vecchi o permessi insufficienti).');
    }
  }
};

