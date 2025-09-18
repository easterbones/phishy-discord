import { createEmbed, getChannelSettings, setChannelSetting, ensureChannelSettings, addInfoWarning } from '../../lib/utils.js';

// Plugin: AntiLink (moved to enable category)
const LINK_REGEX = /https?:\/\/(?:www\.)?[\w\-./?%&=+#]+/i;

// Dedupe processed messages to avoid double-warn on the same message id
const processedMessages = new Set();
const DEDUPE_TTL = 30 * 1000; // 30s

const onMessageCreate = async (originalMessage, { client, db, config }) => {
    try {
        const message = originalMessage;
        if (!message || !message.guild || !message.channel) return;
        if (message.author?.bot) return; // ignore bots

        // Avoid processing the same message twice
        try {
            if (processedMessages.has(message.id)) return;
            processedMessages.add(message.id);
            setTimeout(() => processedMessages.delete(message.id), DEDUPE_TTL).unref?.();
        } catch (_) {}

        const guildId = message.guild.id;
        const channelId = message.channel.id;

        // Ensure settings exist
        ensureChannelSettings(guildId, channelId, message.channel.name || null);

        // Fetch channel settings; fallback to server-wide __server__
        const chSettings = getChannelSettings(guildId, channelId) || getChannelSettings(guildId, '__server__') || {};
        const antiLinkEnabled = chSettings.antilink === true || chSettings.antilink === 'true';

        if (!antiLinkEnabled) return;

        // Detect link
        const content = String(message.content || '');
        if (!LINK_REGEX.test(content)) return;

        // Delete message (await to know if succeeded)
        let deleted = false;
        try {
            deleted = await message.delete().then(() => true).catch(() => false);
        } catch (_) { deleted = false; }

        // Add warning to main db.users
        const userId = message.author.id;
        const userKey = `users.${userId}`;
        let userData = db.get(userKey) || { warns: 0, warnReasons: [] };
        if (!userData.warnReasons) userData.warnReasons = [];

        const reason = `Link vietato nel canale ${message.channel.name || channelId}`;
        const timestamp = new Date().toISOString();
        const displayTime = new Date().toLocaleString('it-IT');

        userData.warnReasons.push({ reason, date: timestamp, displayDate: displayTime, admin: client.user?.id || 'system' });
        userData.warns = (userData.warns || 0) + 1;
        db.set(userKey, userData);

        // Also add lightweight record to informations DB
        addInfoWarning(userId, { reason, date: timestamp, channel: channelId, moderator: client.user?.id || 'system' });

        // Notify channel (ephemeral-ish): send embed then delete after a short time
        try {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: deleted ? '⚠️ Messaggio rimosso' : '⚠️ Messaggio identificato',
                description: deleted
                    ? `Un messaggio contenente un link è stato rimosso in questo canale.\n**Utente:** <@${userId}>\n**Motivo:** ${reason}`
                    : `Un messaggio contenente un link è stato rilevato ma non è stato possibile cancellarlo (controllare permessi).\n**Utente:** <@${userId}>\n**Motivo:** ${reason}`,
                botAvatar: client.user.displayAvatarURL()
            });

            message.channel.send({ embeds: [embed] }).then(sent => {
                setTimeout(() => { try { sent.delete().catch(() => {}); } catch (_) {} }, 7000);
            }).catch(() => {});
        } catch (_) {}

    } catch (error) {
        try { console.error('antilink plugin error', error); } catch (_) {}
    }
};

export default {
    // No prefix command, only event hook
    onMessageCreate
};
