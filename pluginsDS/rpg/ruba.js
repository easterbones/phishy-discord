import { createEmbed, getUserData, getRpgRecord, ensureRpgDefaults, saveRpgRecord, formatTime } from '../../lib/utils.js';

// Module-level cooldowns and attempt counters (in-memory)
const cooldowns = new Map();
const attemptCounts = new Map();

const EASTER_EGG_CHANCE = 0.6; // base chance for a bonus egg/event

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function cambia(num) {
  return String(num).replace(/\d/g, d => `${d}\u034F`);
}

export default {
  name: 'ruba',
  description: 'Prova a rubare dolci a un altro giocatore',
  aliases: ['ruba', 'crimine', 'rubq'],
  category: 'RPG',
  usage: '<@utente>',
  cooldown: 1000,
  execute: async (message, args, { client, db, config }) => {
    const authorId = message.author.id;
    const author = getUserData(db, authorId);

    // Determine target: mention or reply
    const mention = message.mentions && message.mentions.users ? message.mentions.users.first() : null;
    const replied = message.reference ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null) : null;
    const repliedUser = replied ? replied.author : null;
    const targetUser = mention || repliedUser;
    if (!targetUser) {
      const embed = createEmbed({
        color: config.embedColors.error,
        title: '❗ Seleziona un bersaglio',
        description: 'Devi menzionare un utente o rispondere al suo messaggio per poter rubare.',
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    const targetId = targetUser.id;
    if (targetId === authorId) {
      const embed = createEmbed({
        color: config.embedColors.error,
        title: '🤦‍♂️ Non puoi rubare a te stesso',
        description: 'Smettila di provare a truffare il tuo stesso inventario!',
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    // Cooldown handling
    const tempoAttesa = 5 * 60 * 1000; // 5 minutes in ms
    const last = cooldowns.get(authorId) || 0;
    if (Date.now() - last < tempoAttesa) {
      const tries = (attemptCounts.get(authorId) || 0) + 1;
      attemptCounts.set(authorId, tries);
      if (tries > 3) {
        const embed = createEmbed({
          color: config.embedColors.error,
          title: '🛑 Troppi tentativi',
          description: 'Non spammare il comando ruba — aspetta il cooldown prima di riprovare.',
          botAvatar: client.user.displayAvatarURL()
        });
        return message.reply({ embeds: [embed] });
      }

      const remaining = tempoAttesa - (Date.now() - last);
      const embed = createEmbed({
        color: config.embedColors.error,
        title: '⏳ Devi aspettare',
        description: `Devi aspettare ancora **${formatTime(remaining)}** prima di tentare un altro furto.`,
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }
    // reset attempt count
    attemptCounts.set(authorId, 0);
    cooldowns.set(authorId, Date.now());

    // Load secondary RPG records
    const recAuthor = getRpgRecord(authorId);
    const recTarget = getRpgRecord(targetId);
    recAuthor.name = recAuthor.name || author.name || null;
    recTarget.name = recTarget.name || targetUser.username || null;
    const rpgA = ensureRpgDefaults(recAuthor.data);
    const rpgT = ensureRpgDefaults(recTarget.data);

    // CASA check (can't steal while inside house)
    if (rpgA.casa && rpgA.casa.stato === 'dentro') {
      const embed = createEmbed({
        color: config.embedColors.error,
        title: '🚪 Non puoi rubare',
        description: 'Non puoi rubare mentre sei dentro casa! Esci prima.',
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    // Target in casa protection
    let targetInCasa = !!(rpgT.casa && rpgT.casa.stato === 'dentro');
    let bypassCasa = false;
    if (targetInCasa && (author.level || 0) >= 50) bypassCasa = true;
    if (targetInCasa && !bypassCasa) {
      const embed = createEmbed({
        color: config.embedColors.error,
        title: '🚪 Bersaglio protetto',
        description: 'L\'utente è protetto perché è dentro casa. Solo ladri di livello 50+ possono rubare chi è in casa.',
        botAvatar: client.user.displayAvatarURL()
      });
      return message.reply({ embeds: [embed] });
    }

    // Shield (scudo) check: support multiple possible storage places (main user or rpg)
    const mainTarget = getUserData(db, targetId);
    const scudoIso = mainTarget.scudoScadenza || rpgT.scudoScadenza || null;
    if (scudoIso) {
      const expiry = Date.parse(scudoIso);
      if (!isNaN(expiry) && expiry > Date.now()) {
        const remaining = expiry - Date.now();
        const embed = createEmbed({
          color: config.embedColors.error,
          title: '🛡️ Utente protetto da scudo',
          description: `Il tentativo di furto è fallito! ${targetUser.username} è protetto da uno scudo per **${formatTime(remaining)}**.`,
          botAvatar: client.user.displayAvatarURL()
        });
        return message.reply({ embeds: [embed] });
      }
    }

    // Inventory helpers (backwards-compatible with different storage shapes)
    const invA = (author.inventory && typeof author.inventory === 'object' && !Array.isArray(author.inventory)) ? author.inventory : {};
    const hasItem = (name) => !!(invA[name] || author[name]);

    // Modifiers
    const stealMultiplier = 1 + (hasItem('guanti') ? 0.30 : 0) + (hasItem('magnet') ? 0.50 : 0);
    const stealthBonus = hasItem('cappuccio') ? 0.20 : 0;
    const noisePenalty = hasItem('scarpeRumore') ? 0.20 : 0;

    const victimDolci = Math.max(0, Number(rpgT.dolci || 0));

    // determine min/max steal based on target stash
    let minAmount = 5, maxAmount = 15;
    if (victimDolci > 1000) { minAmount = 50; maxAmount = 200; }
    else if (victimDolci >= 100) { minAmount = 15; maxAmount = 50; }

    const baseAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
    const amountTaken = Math.min(Math.floor(baseAmount * stealMultiplier), victimDolci);
    const healthDamage = Math.max(1, Math.floor((Math.random() * 19 + 2) * (1 - stealthBonus + noisePenalty)));

    // Easter egg
    let easterEggFound = Math.random() < EASTER_EGG_CHANCE;
    let easterEggMessage = '';
    if (easterEggFound) {
      rpgA.uova = (rpgA.uova || 0) + 1;
      easterEggMessage = `\n\n🐣 Hai trovato un uovo magico! Ora hai ${rpgA.uova} uova.`;
    }

    // Random outcome selection (keeps a few main cases from upstream)
    const bizzarroChance = 0.15; // small chance for odd events
    let maxRange = 5; // normal cases 0..4
    if (Math.random() < bizzarroChance) maxRange = 21; // allow bizzarro cases
    const option = Math.floor(Math.random() * maxRange);

    let title = 'Furto', description = '', color = config.embedColors.success;

    switch (option) {
      case 0: // success
        rpgA.dolci = (rpgA.dolci || 0) + amountTaken;
        rpgT.dolci = Math.max(0, (rpgT.dolci || 0) - amountTaken);
        rpgT.health = Math.max(0, (rpgT.health || 100) - healthDamage);

        description = `✅ Hai rubato con successo a **${targetUser.username}** e gli hai inflitto ${healthDamage} danni.\n\nDolci rubati: **${cambia(amountTaken)} 🍭**${easterEggMessage}`;
        title = 'Furto Riuscito!';
        break;
      case 1: // caught
        {
          const lost = Math.min(Math.floor(Math.random() * Math.max(1, (author.coins || 100))) + minAmount, (author.coins || 100));
          // deduct from main coins as penalty if available
          author.coins = Math.max(0, (author.coins || 0) - lost);
          rpgA.health = Math.max(0, (rpgA.health || 100) - healthDamage);
          description = `❌ Sei stato catturato mentre cercavi di rubare a **${targetUser.username}**. Hai perso **${cambia(lost)} 🍬** e subito **${healthDamage} ❤️** danni. ${easterEggMessage}`;
          color = config.embedColors.error;
          title = 'Sei stato Catturato!';
        }
        break;
      case 2: // partial
        {
          const small = Math.min(Math.floor(Math.random() * Math.max(1, Math.floor(victimDolci / 2))) + minAmount, victimDolci);
          rpgA.dolci = (rpgA.dolci || 0) + small;
          rpgT.dolci = Math.max(0, (rpgT.dolci || 0) - small);
          rpgT.health = Math.max(0, (rpgT.health || 100) - healthDamage);
          description = `⚠️ Ti hanno individuato e hai rubato poche caramelle a **${targetUser.username}**.\nDolci rubati: **${cambia(small)} 🍬**\nDanni: **${healthDamage} 💔**${easterEggMessage}`;
          title = 'Furto Parziale';
        }
        break;
      case 3: // big steal
        {
          const mega = Math.min(Math.floor(Math.random() * ((maxAmount * 2) - minAmount + 1)) + minAmount, victimDolci);
          const autoDanno = healthDamage + Math.floor(Math.random() * 10);
          rpgA.dolci = (rpgA.dolci || 0) + mega;
          rpgT.dolci = Math.max(0, (rpgT.dolci || 0) - mega);
          rpgA.health = Math.max(0, (rpgA.health || 100) - autoDanno);
          description = `💥 Colpo grosso su **${targetUser.username}**! Hai preso **${cambia(mega)} 🍭** ma ti sei fatto **${autoDanno}** danni. ${easterEggMessage}`;
          title = 'Colpo Grosso!';
        }
        break;
      case 4: // stealth
        {
          const furtino = Math.min(Math.floor(Math.random() * 5) + 1, victimDolci);
          rpgA.dolci = (rpgA.dolci || 0) + furtino;
          rpgT.dolci = Math.max(0, (rpgT.dolci || 0) - furtino);
          description = `🫣 Hai rubato silenziosamente da **${targetUser.username}**: **${cambia(furtino)} 🍬**. Nessuno se n'è accorto! ${easterEggMessage}`;
          title = 'Furto Silenzioso';
        }
        break;
      default:
        // bizzarro fallback: small luck or bad luck
        if (Math.random() < 0.5) {
          const bonus = Math.floor(Math.random() * 30) + 10;
          rpgA.dolci = (rpgA.dolci || 0) + bonus;
          description = `🎲 Evento bizzarro: trovate caramelle per strada! +**${cambia(bonus)} 🍬**`;
          title = 'Evento Fortunato';
        } else {
          const loss = Math.min(Math.floor(Math.random() * 30) + 5, (rpgA.dolci || 0));
          rpgA.dolci = Math.max(0, (rpgA.dolci || 0) - loss);
          description = `🤦‍♂️ Evento sfortunato: qualcosa è andato storto e hai perso **${cambia(loss)} 🍬**.`;
          color = config.embedColors.error;
          title = 'Sfortuna!';
        }
        break;
    }

    // Persist changes
    recAuthor.data = rpgA;
    recTarget.data = rpgT;
    saveRpgRecord(authorId, recAuthor);
    saveRpgRecord(targetId, recTarget);
    // Persist main author changes (coins/xp etc.)
    db.set(`users.${authorId}`, author);

    const embed = createEmbed({
      color,
      title,
      description,
      botAvatar: client.user.displayAvatarURL()
    });

    return message.reply({ embeds: [embed] });
  }
};

// Slash command metadata and handler
export const slash = {
  name: 'ruba',
  description: 'Prova a rubare dolci a un altro giocatore',
  options: [
    {
      name: 'target',
      description: 'Target da cui rubare',
      type: 6, // USER
      required: true
    }
  ]
};

export async function slashExecute(interaction, { client, db, config }) {
  try {
    if (!interaction.replied && !interaction.deferred && typeof interaction.deferReply === 'function') {
      await interaction.deferReply({ ephemeral: false }).catch(() => {});
    }

    const targetUser = interaction.options.getUser('target');
    // reuse message-based implementation by constructing a mock message-like object
    const mockMessage = {
      author: interaction.user,
      mentions: { users: new Map([[targetUser.id, targetUser]]) },
      reference: null,
      channel: interaction.channel,
      reply: async (payload) => {
        // if interaction already deferred, editReply, else followUp
        if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => null);
        try { return interaction.editReply(payload); } catch (_) { return interaction.followUp(payload).catch(() => null); }
      }
    };

    // Build args: mention first
    const args = ['@' + targetUser.id];
    // Call the same execute logic
    await module.exports.default.execute(mockMessage, args, { client, db, config });
  } catch (err) {
    const embed = createEmbed({ color: config.embedColors.error, title: 'Errore', description: 'Si è verificato un errore durante l\'esecuzione del comando slash ruba.' });
  try { if (interaction.deferred || interaction.replied) await interaction.followUp({ embeds: [embed], flags: 64 }); else await interaction.reply({ embeds: [embed], flags: 64 }); } catch (_) {}
  }
}
