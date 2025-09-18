import { createEmbed } from '../../lib/utils.js';

export default {
  name: 'kick',
  description: 'Espelle un membro dal server',
  category: 'Admin',
  guildOnly: true,
  permissions: ['KickMembers'],
  usage: '@utente [motivo]',
  cooldown: 3000,
  execute: async (message, args, { client, config }) => {
      let member = null;
      try {
          if (message.mentions && message.mentions.members && typeof message.mentions.members.first === 'function') {
              member = message.mentions.members.first();
          }
      } catch (_) { member = null; }
      if (!member && Array.isArray(args) && args[0]) {
          const id = String(args[0]).replace(/[<@!>]/g, '');
          if (message.guild && id && /^\d{16,}$/.test(id)) {
              try { member = await message.guild.members.fetch(id).catch(() => null); } catch (_) { member = null; }
          }
      }
    if (!member) return message.reply('❌ Menzione un utente da espellere.');
    if (!member.kickable) return message.reply('⚠️ Non posso espellere questo utente.');
    const reason = args.slice(1).join(' ') || 'Nessun motivo fornito';
    try {
      await member.kick(reason);
      const embed = createEmbed({
        color: config.embedColors.success,
        description: `👢 ${member.user.tag} è stato espulso.\nMotivo: ${reason}`,
        botAvatar: client.user.displayAvatarURL()
      });
      message.reply({ embeds: [embed] });
    } catch (e) {
      console.error('Kick error:', e);
      message.reply('❌ Errore durante l\'espulsione.');
    }
  }
};

