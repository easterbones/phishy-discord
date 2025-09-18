import { createEmbed } from '../../lib/utils.js';

export default {
  name: 'afk',
  description: 'Imposta il tuo stato AFK con un motivo opzionale',
  aliases: ['away'],
  category: 'Tools',
  usage: '[motivo] — scrivi di nuovo per rimuoverlo',
  cooldown: 2000,
  execute: async (message, args, { client, db, config }) => {
    const reason = args.join(' ').trim() || 'Assente';
    const userKey = `users.${message.author.id}.afk`;
    db.set(userKey, { enabled: true, reason, since: Date.now() });

    const embed = createEmbed({
      color: config.embedColors.info,
      title: '📴 AFK attivato',
      description: `Motivo: ${reason}\nScrivi un messaggio per disattivarlo.`,
      botAvatar: client.user.displayAvatarURL()
    });

    message.reply({ embeds: [embed] });
  }
};

