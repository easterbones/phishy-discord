import { createEmbed } from '../../lib/utils.js';

export default {
  name: 'risposta',
  description: 'Gestisci risposte automatiche per questo server',
  aliases: ['autorisposta', 'triggers', 'trigger'],
  category: 'Risposta',
  usage: 'add [equals|starts|includes] <trigger> | <risposta> | remove <trigger> | list',
  permissions: ['ManageMessages'],
  cooldown: 2000,
  guildOnly: true,
  execute: async (message, args, { client, db, config }) => {
    const guildId = message.guild.id;

    const sub = (args.shift() || '').toLowerCase();
    if (!['add', 'remove', 'list'].includes(sub)) {
      const embed = createEmbed({
        color: config.embedColors.info,
        title: '💬 Risposte Automatiche',
        description: `Uso: \`${config.prefix}risposta add [equals|starts|includes] <trigger> | <risposta>\`\n` +
          `\`${config.prefix}risposta remove <trigger>\`\n` +
          `\`${config.prefix}risposta list\``,
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    const key = `guilds.${guildId}.autoresponses`;
    const list = db.get(key) || [];

    if (sub === 'list') {
      if (!list.length) {
        return message.reply('📭 Nessuna risposta automatica configurata.');
      }
      const body = list
        .map((t, i) => `**${i + 1}.** [${t.mode || 'equals'}] trigger: \`${t.trigger}\` → risposta: ${t.response}`)
        .join('\n');
      const embed = createEmbed({
        color: config.embedColors.default,
        title: '📜 Risposte Automatiche',
        description: body,
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      const trigger = args.join(' ').trim();
      if (!trigger) return message.reply('❌ Specifica il trigger da rimuovere.');
      const idx = list.findIndex(t => String(t.trigger).toLowerCase() === trigger.toLowerCase());
      if (idx === -1) return message.reply('⚠️ Trigger non trovato.');
      list.splice(idx, 1);
      db.set(key, list);
      return message.reply(`✅ Trigger \`${trigger}\` rimosso.`);
    }

    // add
    let mode = 'equals';
    const first = (args[0] || '').toLowerCase();
    if (['equals', 'starts', 'includes'].includes(first)) {
      mode = first;
      args.shift();
    }

    const joined = args.join(' ');
    const [triggerRaw, responseRaw] = joined.split('|');
    const trigger = (triggerRaw || '').trim();
    const response = (responseRaw || '').trim();
    if (!trigger || !response) {
      return message.reply('❌ Sintassi: risposta add [equals|starts|includes] <trigger> | <risposta>');
    }

    list.push({ mode, trigger, response });
    db.set(key, list);
    return message.reply(`✅ Aggiunta risposta automatica: [${mode}] \`${trigger}\` → ${response}`);
  }
};

