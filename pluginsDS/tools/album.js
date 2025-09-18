import  { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../lib/utils.js';

export default {
  name: 'album',
  description: 'Crea e visualizza album di immagini con bottoni',
  aliases: ['gallery', 'galleria'],
  category: 'Tools',
  usage: 'create <nome> | add <nome> <url/allega> | list | search <testo> | view <nome>',
  guildOnly: true,
  cooldown: 2000,
  execute: async (message, args, { client, db, config }) => {
    const guildId = message.guild.id;
    const sub = (args.shift() || '').toLowerCase();

    const albumsKey = `guilds.${guildId}.albums`;
    const albums = db.get(albumsKey) || {};

    if (!['create', 'add', 'list', 'view', 'search'].includes(sub)) {
      const embed = createEmbed({
        color: config.embedColors.info,
        title: '🖼️ Album - Utilizzo',
        description: `\`${config.prefix}album create <nome>\` — Crea un nuovo album\n` +
          `\`${config.prefix}album add <nome> <url>\` — Aggiungi immagine (o allega un\'immagine)\n` +
          `\`${config.prefix}album list\` — Elenca gli album\n` +
          `\`${config.prefix}album search <testo>\` — Cerca per nome\n` +
          `\`${config.prefix}album view <nome>\` — Visualizza con bottoni`,
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'create') {
      const name = (args.join(' ') || '').trim().toLowerCase();
      if (!name) return message.reply('❌ Specifica il nome dell\'album.');
      if (albums[name]) return message.reply('⚠️ Esiste già un album con questo nome.');
      albums[name] = [];
      db.set(albumsKey, albums);
      return message.reply(`✅ Album \`${name}\` creato.`);
    }

    if (sub === 'add') {
      const name = (args.shift() || '').toLowerCase();
      if (!name) return message.reply('❌ Specifica il nome dell\'album.');
      if (!albums[name]) return message.reply('⚠️ Album non trovato. Crea prima l\'album.');

      // URL o allegato
      let url = args.join(' ').trim();
      if (!url) {
        const attach = message.attachments.first();
        if (attach && attach.url) url = attach.url;
      }
      if (!url) return message.reply('❌ Fornisci un URL immagine valido o allega un\'immagine.');
      if (!/^https?:\/\//i.test(url)) return message.reply('❌ URL non valido.');

      albums[name].push(url);
      db.set(albumsKey, albums);
      return message.reply(`✅ Aggiunta immagine all\'album \`${name}\` (totale: ${albums[name].length}).`);
    }

    if (sub === 'list') {
      const names = Object.keys(albums);
      if (!names.length) return message.reply('📭 Nessun album presente.');
      const embed = createEmbed({
        color: config.embedColors.default,
        title: '📚 Album disponibili',
        description: names.map(n => `• \`${n}\` (${albums[n].length} immagini)`).join('\n'),
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'search') {
      const q = (args.join(' ') || '').trim().toLowerCase();
      if (!q) return message.reply('❌ Specifica del testo da cercare.');
      const names = Object.keys(albums).filter(n => n.includes(q));
      if (!names.length) return message.reply('🔎 Nessun album trovato.');
      return message.reply(`🔎 Trovati: ${names.map(n => `\`${n}\``).join(', ')}`);
    }

    // view
    const name = (args.join(' ') || '').trim().toLowerCase();
    if (!name) return message.reply('❌ Specifica il nome dell\'album da visualizzare.');
    const album = albums[name];
    if (!album || !album.length) return message.reply('📭 Album vuoto o inesistente.');

    const index = 0;
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.default)
      .setTitle(`🖼️ Album: ${name} (${index + 1}/${album.length})`)
      .setImage(album[index])
      .setFooter({ text: 'PhiShy Discord Bot', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`album_prev:${guildId}:${name}:${index}`).setLabel('⬅️ Indietro').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`album_close:${guildId}:${name}:${index}`).setLabel('⏹️ Chiudi').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`album_next:${guildId}:${name}:${index}`).setLabel('Avanti ➡️').setStyle(ButtonStyle.Primary)
    );

    return message.reply({ embeds: [embed], components: [controls] });
  }
};
