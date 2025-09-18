import { createEmbed, ensureChannelSettings, getChannelSettings } from '../../lib/utils.js';

const blasphemyTracker = new Map();

const COLOR_ORANGE = 0xffa500; // orange

const blasphemyResponses = {
  morning: [
    "Colazione con ostie consacrate?",
    "Buongiornissimo... ma non a Dio, eh?",
    "Sveglia così e già in odore di scomunica.",
    "Mannaggia la miseria... e anche a te.",
    "Caffè? No, bestemmie al volo oggi.",
    "Che bel modo di iniziare la giornata... nell'ira divina.",
    "Le preghiere del mattino le saltiamo, vero?",
    "Dio ha già smesso di ascoltarti oggi.",
    "Hai già bestemmiato prima del caffè, complimenti.",
    "Il gallo canta, tu bestemmi."
  ],
  afternoon: [
    "Dopo pranzo un rosario? No, bestemmie!",
    "La digestione è difficile... soprattutto per Dio con te.",
    "Si prega alle 15:00, non si bestemmia!"
  ],
  evening: [
    "E stasera preghierina della buonanotte? Macché!",
    "Dio sta già contando quante ne hai dette oggi.",
    "A cena: pane, vino e bestemmie."
  ],
  night: [
    "Di notte bestemmi? Sei un vampiro eretico?",
    "Metti in pausa l'inferno e dormi, su.",
    "Persino Lucifero a quest'ora riposa."
  ],
  weekday: {
    monday: ["Lunedì e già bestemmi? Che settimana sarà..."],
    tuesday: ["Martedì grasso... di bestemmie!"],
    wednesday: ["Mercoledì delle ceneri? No, delle bestemmie!"],
    thursday: ["Giovedì santo? Per te Giovedì bestemmioso."],
    friday: ["Venerdì Santo... ma non per te!"],
    saturday: ["Sabato bestemmioso > Sabato sera."],
    sunday: ["Domenica di preghiera? No, di bestemmie!"]
  },
  levels: {
    1: ["Prima bestemmia? Che tenerezza."],
    3: ["Bestemmi come un marinaio ubriaco."],
    5: ["Sei ufficialmente un problema per la Chiesa."]
  },
  warn: [
    "Se continui, ti arriva la scomunica via WhatsApp.",
    "Dio: 'Ma perché non lo banniamo?'"
  ]
};

function getBlasphemyResponse(userData) {
  const nowRome = new Date(new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' }));
  const hour = nowRome.getHours();
  const day = nowRome.getDay();
  const total = userData.blasphemy || 0;

  let possibleResponses = [];

  const levels = Object.keys(blasphemyResponses.levels).map(Number).sort((a, b) => b - a);
  for (let level of levels) {
    if (total >= level) {
      possibleResponses.push(...blasphemyResponses.levels[level]);
      break;
    }
  }

  if (hour >= 6 && hour < 12) possibleResponses.push(...blasphemyResponses.morning);
  else if (hour >= 12 && hour < 18) possibleResponses.push(...blasphemyResponses.afternoon);
  else if (hour >= 18 && hour < 24) possibleResponses.push(...blasphemyResponses.evening);
  else possibleResponses.push(...blasphemyResponses.night);

  const weekMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayResponses = blasphemyResponses.weekday[weekMap[day]];
  if (dayResponses) possibleResponses.push(...dayResponses);

  if (possibleResponses.length === 0) possibleResponses.push("Hai bestemmiato, ma non so cosa dire.");
  return possibleResponses[Math.floor(Math.random() * possibleResponses.length)];
}

function containsBlasphemy(text) {
  if (!text) return false;
  const sacredWords = ['dio', 'madonna', 'ges[uù]', 'cristo', 'santo', 'padre pio', 'allah', 'maria', 'gesù', 'signore'];
  const offensiveWords = ['porc[o0]', 'cane', 'bastard[oi]'];
  const regex = new RegExp(
    `(?:${sacredWords.join('|')})(?:.*?|\B)(?:${offensiveWords.join('|')})|(?:${offensiveWords.join('|')})(?:.*?|\B)(?:${sacredWords.join('|')})`,
    'gi'
  );
  return regex.test(text) && !isReligiousContext(text);
}

function isReligiousContext(text) {
  const neutralPhrases = ['madonna santa', 'preghiera', 'amen', 'grazie dio', 'santo subito', 'vangelo', 'bibbia'];
  return new RegExp(neutralPhrases.join('|'), 'gi').test(text);
}

function extractImageUrlFromMessage(message) {
  // prefer attachments
  try {
    if (message.attachments && message.attachments.size > 0) {
      const first = message.attachments.first();
      if (first && first.url) return first.url;
    }
  } catch (_) {}

  // check embeds
  try {
    if (message.embeds && message.embeds.length > 0) {
      const e = message.embeds[0];
      if (e.image?.url) return e.image.url;
      if (e.thumbnail?.url) return e.thumbnail.url;
    }
  } catch (_) {}

  // find image-like URL in text
  try {
    const urlMatch = String(message.content || '').match(/https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp)/i);
    if (urlMatch) return urlMatch[0];
  } catch (_) {}

  return null;
}

async function onMessageCreate(message, { client, db, config }) {
  try {
    if (!message || !message.guild || !message.channel) return;
    if (message.author?.bot) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;
    ensureChannelSettings(guildId, channelId, message.channel.name || null);

    const chSettings = getChannelSettings(guildId, channelId) || getChannelSettings(guildId, '__server__') || {};
    if (!chSettings.bestemmiometro) return;

    const text = String(message.content || '');
    if (!containsBlasphemy(text)) return;

    const uid = message.author.id;
    const userKey = `users.${uid}`;
    const userData = db.get(userKey) || {};
    userData.blasphemy = (userData.blasphemy || 0) + 1;

    const now = Date.now();
    const userTrack = blasphemyTracker.get(uid) || { count: 0, lastTime: 0 };
    if (now - userTrack.lastTime > 10000) userTrack.count = 0;
    userTrack.count++;
    userTrack.lastTime = now;
    blasphemyTracker.set(uid, userTrack);

    if (userTrack.count > 2) {
      userData.warn = (userData.warn || 0) + 1;
      if (userData.warn > 3) {
        // reset counters on reaching limit
        userData.warn = 0;
        userData.blasphemy = 0;
      }
    }

    db.set(userKey, userData);

    // Prepare embed with orange color and optional image
    const responseText = getBlasphemyResponse(userData);
  const imageUrl = extractImageUrlFromMessage(message) || 'https://i.ibb.co/ynP4McYh/bestemmiometro.png';

    // Put image inside the embed (remote URL) so it appears inline like in `profilo.js` (no raw file attachment)
    const embed = createEmbed({
      color: COLOR_ORANGE,
      title: 'Bestemmiometro',
      description: `**<@${uid}>** ha fatto ${userData.blasphemy} ${userData.blasphemy === 1 ? 'bestemmia' : 'bestemmie'}\n${responseText}`,
      thumbnail: imageUrl,
      botAvatar: client.user?.displayAvatarURL?.()
    });

    await message.channel.send({
      content: `<@${uid}>`,
      embeds: [embed],
      allowedMentions: { users: [uid] }
    });

  } catch (err) {
    console.error('bestemmiometro plugin error', err);
  }
}

export default { onMessageCreate };