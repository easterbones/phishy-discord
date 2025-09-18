import { createEmbed, removeInfoWarning } from '../../lib/utils.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export default {
  name: 'unwarn',
  description: 'Rimuove uno degli avvertimenti di un utente',
  aliases: ['remove-warn', 'delwarn'],
  category: 'Admin',
  guildOnly: true,
  permissions: ['ModerateMembers'],
  usage: '<@utente> [index|choose]',
  cooldown: 5000,
  execute: async (message, args, { client, config, db }) => {
    try {
      const member = message.mentions?.members?.first();
      if (!member) {
        const embed = createEmbed({
          color: config.embedColors.warning,
          title: '⚠️ Utente richiesto',
          description: `Menziona un utente da cui rimuovere un avvertimento!\nEsempio: \`${config.prefix}unwarn @username\``,
          botAvatar: client.user.displayAvatarURL()
        });
        return message.reply({ embeds: [embed] });
      }

      const userId = member.id;
      const userData = db.get(`users.${userId}`) || { warns: 0, warnReasons: [] };
      const warns = Array.isArray(userData.warnReasons) ? userData.warnReasons : [];

      if (!warns.length) {
        const embed = createEmbed({
          color: config.embedColors.info,
          title: '📭 Nessun avvertimento trovato',
          description: `${member.user.tag} non ha avvertimenti.`,
          botAvatar: client.user.displayAvatarURL()
        });
        return message.reply({ embeds: [embed] });
      }

      const auditChannelId = '1376294811677757512';

      const postAudit = async (removedInfo) => {
        try {
          const ch = client.channels.cache.get(auditChannelId) || await client.channels.fetch(auditChannelId).catch(() => null);
          if (!ch) return;
          const auditEmbed = createEmbed({
            color: config.embedColors.info,
            title: '🔔 Audit: Unwarn effettuato',
            description: `Utente: **${member.user.tag}** (${member.id})\nRimosso da: **${message.author.tag}** (${message.author.id})\nMotivo rimosso: ${removedInfo.reason || 'N/A'}\nIndice: ${removedInfo.index || 'N/A'}`,
            botAvatar: client.user.displayAvatarURL()
          });
          await ch.send({ embeds: [auditEmbed] }).catch(() => {});
        } catch (_) {}
      };

      const arg = args[1];

      // Numeric index -> remove that specific warn (1-based index)
      if (arg && !isNaN(parseInt(arg, 10))) {
        const idx = parseInt(arg, 10);
        if (idx <= 0 || idx > warns.length) {
          return message.reply({ embeds: [createEmbed({ color: config.embedColors.error, title: '❌ Indice non valido', description: 'Indice fuori dal range.' })] });
        }

  const removedItem = userData.warnReasons.splice(idx - 1, 1)[0];
  userData.warns = Math.max(0, (userData.warns || 1) - 1);
  db.set(`users.${userId}`, userData);
  // remove the corresponding info warning (match by date or reason+admin)
  try { removeInfoWarning(userId, { date: removedItem?.date, reason: removedItem?.reason, admin: removedItem?.admin }); } catch (e) { console.error('removeInfoWarning failed', e); }

        const resultEmbed = createEmbed({
          color: config.embedColors.success,
          title: '✅ Avvertimento rimosso',
          description: `Rimosso avvertimento **#${idx}** di ${member.user.tag}\nMotivo rimosso: ${removedItem?.reason || 'N/A'}`,
          botAvatar: client.user.displayAvatarURL()
        });

        await message.reply({ embeds: [resultEmbed] });
        await postAudit({ reason: removedItem?.reason, index: idx });
        return;
      }

      // No arg -> remove last warn
      if (!arg) {
        const removedIndex = warns.length;
  const removedItem = userData.warnReasons.splice(removedIndex - 1, 1)[0];
  userData.warns = Math.max(0, (userData.warns || 1) - 1);
  db.set(`users.${userId}`, userData);
  try { removeInfoWarning(userId, { date: removedItem?.date, reason: removedItem?.reason, admin: removedItem?.admin }); } catch (e) { console.error('removeInfoWarning failed', e); }

        const resultEmbed = createEmbed({
          color: config.embedColors.success,
          title: '✅ Avvertimento rimosso',
          description: `Rimosso l'ultimo avvertimento di ${member.user.tag}\nMotivo rimosso: ${removedItem?.reason || 'N/A'}`,
          botAvatar: client.user.displayAvatarURL()
        });

        await message.reply({ embeds: [resultEmbed] });
        await postAudit({ reason: removedItem?.reason, index: removedIndex });
        return;
      }

      // Interactive selection flow (choose/select)
      if (arg && (arg.toLowerCase() === 'choose' || arg.toLowerCase() === 'select')) {
        const maxShow = 5;
        const recent = warns.slice(-maxShow);
        const L = recent.length;
        const toShow = recent.map((w, i) => ({
          index: warns.length - L + i + 1,
          reason: w.reason || 'Nessun motivo',
          date: w.displayDate || new Date(w.date || Date.now()).toLocaleString('it-IT'),
          admin: w.admin || 'N/A'
        }));

        const listEmbed = new EmbedBuilder()
          .setColor(config.embedColors.default)
          .setTitle(`🗂️ Avvertimenti di ${member.user.tag} (${warns.length})`)
          .setDescription(toShow.map(t => `**#${t.index}** • ${t.reason} — _${t.date}_`).join('\n'))
          .setFooter({ text: `Richiesto da ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();

        const row = new ActionRowBuilder();
        toShow.forEach((t) => {
          const btn = new ButtonBuilder()
            .setCustomId(`unwarn_${message.author.id}_${userId}_${t.index}`)
            .setLabel(`#${t.index}`)
            .setStyle(ButtonStyle.Primary);
          row.addComponents(btn);
        });

        const cancelRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`unwarn_cancel_${message.author.id}_${userId}`)
            .setLabel('Annulla')
            .setStyle(ButtonStyle.Danger)
        );

        let sent;
        try {
          sent = await message.author.send({ embeds: [listEmbed], components: [row, cancelRow] });
        } catch (e) {
          const publicNote = createEmbed({
            color: config.embedColors.warning,
            title: '⚠️ Avviso: DM chiuse',
            description: 'Non è stato possibile inviarti un messaggio privato. L\'interfaccia viene mostrata in questo canale (visibile a tutti).',
            botAvatar: client.user.displayAvatarURL()
          });
          sent = await message.reply({ embeds: [publicNote, listEmbed], components: [row, cancelRow] });
        }

        const filter = (i) => i.user.id === message.author.id && i.message.id === sent.id;
        const collector = sent.createMessageComponentCollector({ filter, time: 120000, max: 1 });

        collector.on('collect', async (interaction) => {
          try {
            if (interaction.customId.startsWith('unwarn_cancel_')) {
              await interaction.update({ content: 'Operazione annullata.', embeds: [], components: [] });
              return;
            }

            const parts = interaction.customId.split('_');
            const idx = parseInt(parts[3], 10);
            if (Number.isNaN(idx)) {
              await interaction.update({ content: 'Indice non valido.', embeds: [], components: [] });
              return;
            }

            if (!Array.isArray(userData.warnReasons) || idx <= 0 || idx > userData.warnReasons.length) {
              await interaction.update({ content: 'Avvertimento non trovato.', embeds: [], components: [] });
              return;
            }

            const removedItem = userData.warnReasons.splice(idx - 1, 1)[0];
            userData.warns = Math.max(0, (userData.warns || 1) - 1);
            db.set(`users.${userId}`, userData);
            try { removeInfoWarning(userId, { date: removedItem?.date, reason: removedItem?.reason, admin: removedItem?.admin }); } catch (e) { console.error('removeInfoWarning failed', e); }

            const resultEmbed = createEmbed({
              color: config.embedColors.success,
              title: '✅ Avvertimento rimosso',
              description: `Rimosso avvertimento **#${idx}** di ${member.user.tag}\nMotivo rimosso: ${removedItem?.reason || 'N/A'}`,
              botAvatar: client.user.displayAvatarURL()
            });

            await interaction.update({ embeds: [resultEmbed], components: [] });
            await postAudit({ reason: removedItem?.reason, index: idx });
          } catch (e) {
            console.error('Errore unwarn:', e);
            try { await interaction.update({ content: "Errore durante la rimozione dell'avvertimento.", embeds: [], components: [] }); } catch (_) {}
          }
        });

        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            try { await sent.edit({ content: 'Timeout — operazione scaduta.', embeds: [], components: [] }); } catch (_) {}
          }
        });

        return;
      }

      // fallback (shouldn't happen): remove last
  const removed = userData.warnReasons.pop();
  userData.warns = Math.max(0, (userData.warns || 1) - 1);
  db.set(`users.${userId}`, userData);
  try { removeInfoWarning(userId, { date: removed?.date, reason: removed?.reason, admin: removed?.admin }); } catch (e) { console.error('removeInfoWarning failed', e); }

      const resultEmbed = createEmbed({
        color: config.embedColors.success,
        title: '✅ Avvertimento rimosso',
        description: `Rimosso l'ultimo avvertimento di ${member.user.tag}\nMotivo rimosso: ${removed?.reason || 'N/A'}`,
        botAvatar: client.user.displayAvatarURL()
      });

      await message.reply({ embeds: [resultEmbed] });
      await postAudit({ reason: removed?.reason, index: warns.length + 1 });

    } catch (err) {
      console.error('Errore comando unwarn:', err);
      try { await message.reply({ embeds: [createEmbed({ color: config.embedColors.error, title: 'Errore', description: "Si è verificato un errore durante l'esecuzione del comando." })] }); } catch (_) {}
    }
  }
};
