import { PermissionsBitField } from 'discord.js';
import { createEmbed, ensureChannelSettings, getChannelSettings, addInfoWarning } from '../../lib/utils.js';

// Regex to detect Telegram invite links (t.me or https://t.me/...)
const TELEGRAM_REGEX = /(?:https?:\/\/)?t\.me\/[\w\-\/]+/i;

// dedupe
const processed = new Set();
const TTL = 30 * 1000;

async function onMessageCreate(message, { client, db, config }) {
  try {
    if (!message || !message.guild || !message.channel) return;
    if (message.author?.bot) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;
    ensureChannelSettings(guildId, channelId, message.channel.name || null);

    // dedupe
    try {
      if (processed.has(message.id)) return;
      processed.add(message.id);
      setTimeout(() => processed.delete(message.id), TTL).unref?.();
    } catch (_) {}

    const chSettings = getChannelSettings(guildId, channelId) || getChannelSettings(guildId, '__server__') || {};
    const enabled = chSettings.antitelegram === true || chSettings.antitelegram === 'true';
    if (!enabled) return;

    const text = String(message.content || '') + '';
    if (!text) return;

    if (!TELEGRAM_REGEX.test(text)) return;

    // If bot lacks permission to delete messages, still record a lightweight info and return
    const mePerms = message.channel.permissionsFor(client.user);
    const botCanDelete = mePerms && mePerms.has(PermissionsBitField.Flags.ManageMessages);
    if (!botCanDelete) {
      try {
        addInfoWarning(message.author.id, { reason: 'Telegram link detected (could not delete)', date: Date.now(), channel: channelId, moderator: client.user?.id || 'system' });
      } catch (_) {}
      return;
    }

    // attempt delete
    let deleted = false;
    try {
      await message.delete();
      deleted = true;
    } catch (_) { deleted = false; }

    // write warning to main DB
    const uid = message.author.id;
    const key = `users.${uid}`;
    const userData = db.get(key) || { warns: 0, warnReasons: [] };
    if (!userData.warnReasons) userData.warnReasons = [];
    const iso = new Date().toISOString();
    const display = new Date().toLocaleString('it-IT');
    const reason = `Link Telegram non consentito in ${message.channel.name || channelId}`;
    userData.warnReasons.push({ reason, date: iso, displayDate: display, admin: client.user?.id || 'system' });
    userData.warns = (userData.warns || 0) + 1;
    db.set(key, userData);

    // add to informations DB
    try { addInfoWarning(uid, { reason, date: iso, channel: channelId, moderator: client.user?.id || 'system' }); } catch (_) {}

    // notify channel briefly
    try {
      const embed = createEmbed({
        color: config.embedColors.warning,
        title: deleted ? '⚠️ Messaggio rimosso' : '⚠️ Messaggio rilevato',
        description: deleted
          ? `Un messaggio contenente un link Telegram non consentito è stato rimosso.\n**Utente:** <@${uid}>\n**Motivo:** ${reason}`
          : `Un messaggio contenente un link Telegram è stato rilevato ma non è stato possibile cancellarlo.\n**Utente:** <@${uid}>\n**Motivo:** ${reason}`,
        botAvatar: client.user.displayAvatarURL()
      });
      const sent = await message.channel.send({ embeds: [embed] }).catch(() => null);
      if (sent && sent.delete) setTimeout(() => { try { sent.delete().catch(() => {}); } catch (_) {} }, 7000);
    } catch (_) {}

  } catch (err) {
    console.error('antitelegram plugin error', err);
  }
}

export default {
  onMessageCreate
};
