import { createEmbed, getUserData, getRpgRecord, ensureRpgDefaults, saveRpgRecord } from '../../lib/utils.js';
import lavoriDisponibili from '../../lib/lavori.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
// Use centralized rpg helpers from lib/utils

const EASTER_EGG_CHANCE = 0.2; // 20% possibilità di trovare un uovo di Pasqua

export default {
  name: 'work',
  description: 'Esegui il turno di lavoro o mostra informazioni sul lavoro',
  aliases: ['work', 'lavora', 'lavoro'],
  category: 'RPG',
  usage: '[info] [lavoro]',
  cooldown: 1000,
  execute: async (message, args, { client, db, config }) => {
    const userId = message.author.id;
    const user = getUserData(db, userId);
    const subcommand = args[0]?.toLowerCase();
    const lavoroArg = args[1]?.toLowerCase();

    if (subcommand === 'info') return handleJobInfo(message, lavoroArg, { client, config });
    return handleWork(message, { client, db, config }, user, userId);
  }
};

async function handleChooseJob(message, args, { client, db, config }, user, userId) {
  const lavoro = args[1]?.toLowerCase();

  if (!lavoro) {
    // Mostra lista lavori disponibili con carosello
    return showJobCarousel(message, { client, config }, user);
  }

  // Gestione selezione lavoro specifico
  return selectJob(message, lavoro, { client, db, config }, user, userId);
}

// Carousel and selection moved to pluginsDS/rpg/choosejob.js

async function selectJob(message, lavoro, { client, db, config }, user, userId) {
  // Verifica se è dentro casa
  if (user.casa && user.casa.stato === 'dentro') {
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '🚪 Non puoi lavorare!',
      description: 'Non puoi lavorare mentre sei dentro casa! Esci prima.',
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  // Inizializza cooldown lavoro se non esiste
  // RPG data now stored in secondary rpgDB
  const rpgRecord = getRpgRecord(userId);
  rpgRecord.name = rpgRecord.name || user.name || null;
  const rpg = ensureRpgDefaults(rpgRecord.data);
  if (!rpg.jobCooldown) rpg.jobCooldown = 0;

  // Controlla cooldown cambio lavoro
  if (rpg.jobCooldown > Date.now() && lavoro && lavoro !== rpg.job?.toLowerCase()) {
    const remainingTime = Math.ceil((rpg.jobCooldown - Date.now()) / (1000 * 60));
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '⏳ Cooldown Attivo!',
      description: `Hai già cambiato lavoro di recente!\nDevi aspettare **${remainingTime} minuti** prima di cambiare lavoro.\n\nSe vuoi diventare disoccupato usa: \`!work scegli disoccupato\``,
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  // Gestione disoccupato
  if (lavoro === "disoccupato") {
    if (!rpg.job) {
      const embed = createEmbed({
        color: config.embedColors.info,
        title: '🏠 Sei già disoccupato!',
        description: 'Scegli un lavoro dalla lista per iniziare a guadagnare.',
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

  const oldJob = rpg.job;
  rpg.job = null;
  if (rpg.bustapaga) delete rpg.bustapaga[oldJob];
  rpgRecord.data = rpg;
  saveRpgRecord(userId, rpgRecord);

    const embed = createEmbed({
      color: config.embedColors.success,
      title: '🏠 Ora sei disoccupato!',
      description: 'Non guadagnerai più dolci finché non sceglierai un nuovo lavoro.',
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  // Trova lavoro selezionato
  const lavoroSelezionato = Object.keys(lavoriDisponibili).find(
    key => key.toLowerCase() === lavoro && key !== "disoccupato"
  );

  if (!lavoroSelezionato) {
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '❌ Lavoro non trovato',
      description: `Il lavoro "**${lavoro}**" non esiste.\nScrivi \`!work\` senza argomenti per vedere la lista completa.`,
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  const dettagliLavoro = lavoriDisponibili[lavoroSelezionato];

  if (user.level < dettagliLavoro.livello) {
    const progressBar = '▰'.repeat(Math.floor(user.level/10)) + '▱'.repeat(10 - Math.floor(user.level/10));
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '🔞 Requisiti non soddisfatti',
      description: `Per diventare **${lavoroSelezionato}** ${dettagliLavoro.emoji} ti serve:\n› **Livello ${dettagliLavoro.livello}**\n\nIl tuo livello attuale:\n› **${user.level}** ${progressBar}\n\nContinua a giocare per salire di livello!`,
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  // Imposta cooldown 1 ora per cambio lavoro (su record RPG secondario)
  rpg.jobCooldown = Date.now() + (60 * 60 * 1000);

  // Inizializza busta paga
  if (!rpg.bustapaga) rpg.bustapaga = {};
  if (!rpg.bustapaga[lavoroSelezionato]) {
    rpg.bustapaga[lavoroSelezionato] = {
      esperienza: 0,
      bonus: 0
    };
  }

  rpg.job = lavoroSelezionato;
  // persist rpg record
  rpgRecord.data = rpg;
  saveRpgRecord(userId, rpgRecord);

  const expAttuale = rpg.bustapaga[lavoroSelezionato].esperienza;
  const bonusAttuale = rpg.bustapaga[lavoroSelezionato].bonus;

  const embed = createEmbed({
    color: config.embedColors.success,
    title: '🎉 Congratulazioni!',
    description: `Ora sei un **${lavoroSelezionato}** ${dettagliLavoro.emoji}!\n\n` +
      `**Guadagno base:** ${dettagliLavoro.min}-${dettagliLavoro.max} 💰\n` +
      `**Bonus attuale:** +${bonusAttuale}% (${expAttuale} exp)\n\n` +
      `**Cooldown lavoro:** ${dettagliLavoro.cooldown} minuti\n` +
      `**Cooldown cambio lavoro:** 60 minuti\n\n` +
      `Usa \`!work\` per iniziare a guadagnare!\n` +
      `Più lavori, più il tuo stipendio aumenterà!`,
    botAvatar: client.user.displayAvatarURL()
  });

  message.reply({ embeds: [embed] });
}

async function handleJobInfo(message, lavoro, { client, config }) {
  if (!lavoro || !lavoriDisponibili[lavoro]) {
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '❌ Lavoro non trovato',
      description: 'Specifica un lavoro valido. Usa `!work` per vedere la lista.',
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  const det = lavoriDisponibili[lavoro];
  const embed = createEmbed({
    color: config.embedColors.info,
    title: `📋 Info Lavoro: ${lavoro.charAt(0).toUpperCase() + lavoro.slice(1)}`,
    description: `**Emoji:** ${det.emoji}\n` +
      `**Livello richiesto:** ${det.livello}\n` +
      `**Guadagno:** ${det.min}-${det.max} 💰\n` +
      `**Cooldown:** ${det.cooldown} minuti\n` +
      `**Descrizione:** ${det.descrizione || 'N/A'}`,
    botAvatar: client.user.displayAvatarURL()
  });

  message.reply({ embeds: [embed] });
}

async function handleWork(message, { client, db, config }, user, userId) {
  const now = Date.now();

  // RPG data stored in secondary DB
  const rpgRecord = getRpgRecord(userId);
  rpgRecord.name = rpgRecord.name || user.name || null;
  const rpg = ensureRpgDefaults(rpgRecord.data);

  // Controlla easter egg
  let easterEggFound = Math.random() < EASTER_EGG_CHANCE;
  let easterEggMessage = '';

  if (easterEggFound) {
    if (!rpg.uova) rpg.uova = 0;
    rpg.uova += 1;
    easterEggMessage = `\n\n⚠️ **ATTENZIONE UTENTE?**\n🐣 **Hai trovato un uovo di Pasqua!** 🥚\nOra hai ${rpg.uova} uova nel tuo inventario!`;
  }

  // Inizializzazioni sicure
  if (!rpg.limit) rpg.limit = 0;
  if (!rpg.bustapaga) rpg.bustapaga = {};
  if (!rpg.cooldowns) rpg.cooldowns = {};
  if (!rpg.ultimoLavoro) rpg.ultimoLavoro = {};

  // Verifica lavoro selezionato
  if (!rpg || !rpg.job || !lavoriDisponibili[rpg.job]) {
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '❌ Sei disoccupato',
      description: `Non hai ancora scelto un lavoro!\nUsa \`!work scegli\` per selezionarne uno dalla lista.`,
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  const lavoro = rpg.job;
  const lavoroInfo = lavoriDisponibili[lavoro];
  const cooldownMs = lavoroInfo.cooldown * 60 * 1000;

  // Controllo cooldown
  if (rpg.ultimoLavoro[lavoro] && now - rpg.ultimoLavoro[lavoro] < cooldownMs) {
    const remainingTime = Math.ceil((cooldownMs - (now - rpg.ultimoLavoro[lavoro])) / 60000);
    const embed = createEmbed({
      color: config.embedColors.error,
      title: '⏳ Cooldown in corso!',
      description: `Hai già completato il tuo turno come **${lavoro}** ${lavoroInfo.emoji}!\n\n**Aspetta ancora:** ${remainingTime} minuti`,
      botAvatar: client.user.displayAvatarURL()
    });
    return message.reply({ embeds: [embed] });
  }

  // Calcolo guadagno con variazione casuale
  const variazione = Math.random() * 0.4 - 0.2; // -20% a +20%
  let guadagnoBase = Math.floor(lavoroInfo.min + (lavoroInfo.max - lavoroInfo.min) * Math.random());
  guadagnoBase = Math.max(1, Math.floor(guadagnoBase * (1 + variazione)));

  // Sistema esperienza e bonus
  rpg.bustapaga[lavoro] = rpg.bustapaga[lavoro] || { esperienza: 0, bonus: 0 };
  const bonusLivello = Math.min(Math.floor(rpg.bustapaga[lavoro].esperienza / 10), 50); // Max 50% bonus
  const guadagnoTotale = guadagnoBase + Math.floor(guadagnoBase * bonusLivello / 100);

  // Ensure dolci currency exists in rpg secondary DB
  if (!rpg.dolci && rpg.dolci !== 0) rpg.dolci = 0;

  // Aggiornamento dati: dolci (currency) stored in secondary RPG DB
  rpg.dolci += guadagnoTotale;
  user.xp += Math.floor(guadagnoTotale / 5);
  rpg.bustapaga[lavoro].esperienza += 1;
  rpg.ultimoLavoro[lavoro] = now;

  // Persist both main user data and rpg secondary data
  db.set(`users.${userId}`, user);
  rpgRecord.data = rpg;
  saveRpgRecord(userId, rpgRecord);

  // Frase casuale
  const frasiLavoro = lavoroInfo.frasi || [`Hai completato il tuo turno come ${lavoro} ${lavoroInfo.emoji}. Guadagni:`];
  const fraseCasuale = frasiLavoro[Math.floor(Math.random() * frasiLavoro.length)];

  // Progresso bonus (usiamo i dati dell'RPG secondario)
  const progressoBonus = rpg.bustapaga[lavoro].esperienza % 10;
  const nextBonusIn = 10 - progressoBonus;

  const embed = createEmbed({
    color: config.embedColors.success,
    title: '💼 TURNO FINITO',
    description: `**Resoconto giornata:**\n${fraseCasuale}\n\n` +
      `**${lavoro} ${lavoroInfo.emoji}**\n` +
      `**Guadagno:** ${guadagnoBase} 🍰${bonusLivello > 0 ? ` +${bonusLivello}% extra = **${guadagnoTotale} 🍰**` : ''}\n` +
      `**Totale dolci ora:** ${rpg.dolci} 🍰\n` +
      `**Prossimo bonus tra:** ${nextBonusIn} turni\n` +
      `**Cooldown:** ${lavoroInfo.cooldown} minuti${easterEggMessage}`,
    botAvatar: client.user.displayAvatarURL()
  });

  message.reply({ embeds: [embed] });
}

