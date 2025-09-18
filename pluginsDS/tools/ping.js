import { createEmbed } from '../../lib/utils.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    name: 'ping',
    description: 'Controlla la latenza del bot',
    aliases: ['pong'],
    cooldown: 5000,
    // Discord slash command definition (for registration)
    data: new SlashCommandBuilder().setName('ping').setDescription('Controlla la latenza del bot'),
    execute: async (message, args, { client, config }) => {
        // Measure latency in a way that works for both message and interaction mocks
        const start = Date.now();
        let sent;
        try {
            sent = await message.reply('🏓 Pong!');
        } catch (e) {
            // fallback: if reply throws, try followUp
            try { sent = await message.followUp?.({ content: '🏓 Pong!' }); } catch (_) { sent = null; }
        }

        const timeDiff = Date.now() - start;
        const apiLatency = Math.round(client.ws.ping);

        const embed = createEmbed({
            color: config.embedColors.success,
            title: '🏓 Pong!',
            fields: [
                {
                    name: '📡 Latenza Bot',
                    value: `${timeDiff}ms`,
                    inline: true
                },
                {
                    name: '🌐 Latenza API',
                    value: `${apiLatency}ms`,
                    inline: true
                },
                {
                    name: '⚡ Status',
                    value: apiLatency < 100 ? '🟢 Eccellente' : apiLatency < 200 ? '🟡 Buono' : '🔴 Lento',
                    inline: true
                }
            ],
            botAvatar: client.user.displayAvatarURL()
        });

        // Try editing the sent message if possible, otherwise try editReply or followUp
        try {
            if (sent && typeof sent.edit === 'function') {
                await sent.edit({ content: null, embeds: [embed] }).catch(() => {});
            } else if (typeof message.edit === 'function') {
                await message.edit({ content: null, embeds: [embed] }).catch(() => {});
            } else if (typeof message.editReply === 'function') {
                await message.editReply({ content: null, embeds: [embed] }).catch(() => {});
            } else if (typeof message.followUp === 'function') {
                await message.followUp({ embeds: [embed] }).catch(() => {});
            }
        } catch (_) {}
    }
};
