import { createEmbed, getUserData, getRpgRecord, ensureRpgDefaults, saveRpgRecord } from '../../lib/utils.js';
import lavoriDisponibili from '../../lib/lavori.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

const EASTER_EGG_CHANCE = 0.2; // kept for compatibility if needed later

export default {
  name: 'scegli',
  description: 'Scegli un lavoro (carosello)',
  aliases: ['scegli', 'sceglilavoro', 'choosejob', 'setjob', 'setwork'],
  category: 'RPG',
  usage: '[lavoro]',
  cooldown: 1000,
  execute: async (message, args, { client, db, config }) => {
    const userId = message.author.id;
    const user = getUserData(db, userId);
    const lavoro = args[1]?.toLowerCase();

    if (!lavoro) {
      return showJobCarousel(message, { client, config }, user);
    }

    return selectJob(message, lavoro, { client, db, config }, user, userId);
  }
};

async function showJobCarousel(message, { client, config }, user) {
  const lavoriUtente = Object.entries(lavoriDisponibili)
    .filter(([key]) => key !== 'disoccupato')
    .sort((a, b) => (a[1].livello || 0) - (b[1].livello || 0));

  if (lavoriUtente.length === 0) {
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '❌ Nessun lavoro disponibile',
      description: 'Non ci sono lavori disponibili.',
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  let currentPage = 0;
  const jobsPerPage = 1;
  const totalPages = lavoriUtente.length > 0 ? lavoriUtente.length : 1;

  const createJobEmbed = (page) => {
    const idx = page;
    const jobEntry = lavoriUtente[idx];
    const embed = new EmbedBuilder()
      .setColor(config.embedColors.primary || 0x0099ff)
      .setTitle('🌟 CENTRO IMPIEGHI 🌟')
      .setDescription(`Lavori disponibili (Pagina ${page + 1}/${totalPages})`)
      .setFooter({ text: 'PhiShy Discord Bot', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    if (jobEntry) {
      const [key, det] = jobEntry;
      embed.addFields({
        name: `${det.emoji || ''} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
        value: `**Livello richiesto:** ${det.livello || 0}\n**Guadagno:** ${det.min}-${det.max} 💰\n**Cooldown:** ${det.cooldown} minuti\n${det.descrizione ? `*${det.descrizione}*` : ''}`,
        inline: false
      });
    } else {
      embed.setDescription('Nessun lavoro disponibile.');
    }

    return embed;
  };

  const createButtons = (page, token) => {
    const jobEntry = lavoriUtente[page];
    const midJobKey = jobEntry ? jobEntry[0] : null;
    const midJobDet = midJobKey ? lavoriDisponibili[midJobKey] : null;
    const canSelectMidJob = Boolean(midJobDet && user.level >= (midJobDet.livello || 0));

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`job_prev_${token}_${message.author.id}`)
          .setLabel('◀️ Precedente')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId(`job_select_${token}_${message.author.id}`)
          .setLabel(canSelectMidJob ? 'Seleziona Lavoro' : 'Seleziona (livello insuff.)')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canSelectMidJob),
        new ButtonBuilder()
          .setCustomId(`job_next_${token}_${message.author.id}`)
          .setLabel('Successivo ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );

    return row;
  };

  const carouselToken = Math.random().toString(36).slice(2, 8);
  const embed = createJobEmbed(currentPage);
  const buttons = createButtons(currentPage, carouselToken);

  let response;
  try {
    response = await message.reply({ embeds: [embed], components: [buttons], fetchReply: true });
  } catch (err) {
    try { response = await message.channel.send({ embeds: [embed], components: [buttons] }); } catch (e) { throw err; }
  }

  if (!response || typeof response.createMessageComponentCollector !== 'function') {
    if (typeof message.fetchReply === 'function') {
      try { response = await message.fetchReply(); } catch (e) { }
    }
    if (!response || typeof response.createMessageComponentCollector !== 'function') {
      response = await message.channel.send({ embeds: [embed], components: [buttons] });
    }
  }

  const filter = (interaction) => interaction.user.id === message.author.id;

  let collector;
  if (response && typeof response.createMessageComponentCollector === 'function') {
    collector = response.createMessageComponentCollector({ filter, time: 300000 });
  } else {
    collector = message.channel.createMessageComponentCollector({
      filter: (interaction) => {
        try { return interaction.user.id === message.author.id && interaction.message && interaction.message.id === response.id; } catch (e) { return false; }
      },
      time: 300000
    });
  }

  collector.on('collect', async (interaction) => {
    if (!interaction.customId.includes(`_${message.author.id}`)) return;
    const parts = interaction.customId.split('_');
    let action = parts[1];
    let token = null;
    if (parts.length === 4) token = parts[2];
    if (token && token !== carouselToken) return;

    if (action === 'prev' && currentPage > 0) {
      currentPage--; const newEmbed = createJobEmbed(currentPage); const newButtons = createButtons(currentPage, carouselToken);
      await interaction.update({ embeds: [newEmbed], components: [newButtons] });
      return;
    }

    if (action === 'next' && currentPage < totalPages - 1) {
      currentPage++; const newEmbed = createJobEmbed(currentPage); const newButtons = createButtons(currentPage, carouselToken);
      await interaction.update({ embeds: [newEmbed], components: [newButtons] });
      return;
    }

    if (action === 'select') {
      const jobEntry = lavoriUtente[currentPage];
      if (!jobEntry) { await interaction.reply({ content: 'Nessun lavoro da selezionare.', flags: 64 }); return; }
      const selectedKey = jobEntry[0];
      const selectedDet = lavoriDisponibili[selectedKey];
      if (!selectedDet || user.level < (selectedDet.livello || 0)) { await interaction.reply({ content: 'Non hai il livello necessario per questo lavoro.', flags: 64 }); return; }
      const rpgRecordSel = getRpgRecord(message.author.id);
      rpgRecordSel.name = rpgRecordSel.name || user.name || null;
      const rpgSel = ensureRpgDefaults(rpgRecordSel.data);
      if (!rpgSel.bustapaga) rpgSel.bustapaga = {};
      if (!rpgSel.bustapaga[selectedKey]) rpgSel.bustapaga[selectedKey] = { esperienza: 0, bonus: 0 };
      rpgSel.job = selectedKey;
      rpgSel.jobCooldown = Date.now() + (60 * 60 * 1000);
      rpgRecordSel.data = rpgSel; saveRpgRecord(message.author.id, rpgRecordSel);

  await interaction.update({ embeds: [createJobEmbed(currentPage)], components: [createButtons(currentPage, carouselToken)] }).catch(() => {});
  const embed = createEmbed({ color: config.embedColors.success, title: '🎉 Lavoro assegnato', description: 'Hai scelto: **' + selectedKey + '** ' + ((selectedDet && selectedDet.emoji) || '') + '\nUsa `!work` per iniziare a lavorare.', botAvatar: client.user.displayAvatarURL() });
  await interaction.followUp({ embeds: [embed], flags: 64 });
    }
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('disabled_prev').setLabel('◀️ Precedente').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('disabled_select').setLabel('Seleziona Lavoro').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('disabled_next').setLabel('Successivo ▶️').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    response.edit({ components: [disabledRow] }).catch(() => {});
  });
}

async function selectJob(message, lavoro, { client, db, config }, user, userId) {
  // same selectJob logic as before (kept concise)
  if (user.casa && user.casa.stato === 'dentro') {
    const embed = createEmbed({ color: config.embedColors.error, title: '🚪 Non puoi lavorare!', description: 'Non puoi lavorare mentre sei dentro casa! Esci prima.', botAvatar: client.user.displayAvatarURL() });
    return message.reply({ embeds: [embed] });
  }

  const rpgRecord = getRpgRecord(userId);
  rpgRecord.name = rpgRecord.name || user.name || null;
  const rpg = ensureRpgDefaults(rpgRecord.data);
  if (!rpg.jobCooldown) rpg.jobCooldown = 0;

  if (rpg.jobCooldown > Date.now() && lavoro && lavoro !== (rpg.job || '').toLowerCase()) {
    const remainingTime = Math.ceil((rpg.jobCooldown - Date.now()) / (1000 * 60));
    const embed = createEmbed({ color: config.embedColors.error, title: '⏳ Cooldown Attivo!', description: `Hai già cambiato lavoro di recente!\nDevi aspettare **${remainingTime} minuti** prima di cambiare lavoro.\n\nSe vuoi diventare disoccupato usa: \`!work scegli disoccupato\``, botAvatar: client.user.displayAvatarURL() });
    return message.reply({ embeds: [embed] });
  }

  if (lavoro === 'disoccupato') {
    if (!rpg.job) {
      const embed = createEmbed({ color: config.embedColors.info, title: '🏠 Sei già disoccupato!', description: 'Scegli un lavoro dalla lista per iniziare a guadagnare.', botAvatar: client.user.displayAvatarURL() });
      return message.reply({ embeds: [embed] });
    }
    const oldJob = rpg.job; rpg.job = null; if (rpg.bustapaga) delete rpg.bustapaga[oldJob]; rpgRecord.data = rpg; saveRpgRecord(userId, rpgRecord);
    const embed = createEmbed({ color: config.embedColors.success, title: '🏠 Ora sei disoccupato!', description: 'Non guadagnerai più soldi finché non sceglierai un nuovo lavoro.', botAvatar: client.user.displayAvatarURL() });
    return message.reply({ embeds: [embed] });
  }

  const lavoroSelezionato = Object.keys(lavoriDisponibili).find(key => key.toLowerCase() === lavoro && key !== 'disoccupato');
  if (!lavoroSelezionato) {
    const embed = createEmbed({ color: config.embedColors.error, title: '❌ Lavoro non trovato', description: `Il lavoro "**${lavoro}**" non esiste.\nScrivi \`!work\` senza argomenti per vedere la lista completa.`, botAvatar: client.user.displayAvatarURL() });
    return message.reply({ embeds: [embed] });
  }

  const dettagliLavoro = lavoriDisponibili[lavoroSelezionato];
  if (user.level < dettagliLavoro.livello) {
    const progressBar = '▰'.repeat(Math.floor(user.level/10)) + '▱'.repeat(10 - Math.floor(user.level/10));
    const embed = createEmbed({ color: config.embedColors.error, title: '🔞 Requisiti non soddisfatti', description: `Per diventare **${lavoroSelezionato}** ${dettagliLavoro.emoji} ti serve:\n› **Livello ${dettagliLavoro.livello}**\n\nIl tuo livello attuale:\n› **${user.level}** ${progressBar}\n\nContinua a giocare per salire di livello!`, botAvatar: client.user.displayAvatarURL() });
    return message.reply({ embeds: [embed] });
  }

  rpg.jobCooldown = Date.now() + (60 * 60 * 1000);
  if (!rpg.bustapaga) rpg.bustapaga = {};
  if (!rpg.bustapaga[lavoroSelezionato]) rpg.bustapaga[lavoroSelezionato] = { esperienza: 0, bonus: 0 };
  rpg.job = lavoroSelezionato; rpgRecord.data = rpg; saveRpgRecord(userId, rpgRecord);

  const expAttuale = rpg.bustapaga[lavoroSelezionato].esperienza; const bonusAttuale = rpg.bustapaga[lavoroSelezionato].bonus;
  const embed = createEmbed({ color: config.embedColors.success, title: '🎉 Congratulazioni!', description: `Ora sei un **${lavoroSelezionato}** ${dettagliLavoro.emoji}!\n\n**Guadagno base:** ${dettagliLavoro.min}-${dettagliLavoro.max} 💰\n**Bonus attuale:** +${bonusAttuale}% (${expAttuale} exp)\n\n**Cooldown lavoro:** ${dettagliLavoro.cooldown} minuti\n**Cooldown cambio lavoro:** 60 minuti\n\nUsa \`!work\` per iniziare a guadagnare!\nPiù lavori, più il tuo stipendio aumenterà!`, botAvatar: client.user.displayAvatarURL() });
  message.reply({ embeds: [embed] });
}
