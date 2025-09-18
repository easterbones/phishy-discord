import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'slowmode',
    description: 'Imposta la modalità lenta nel canale (secondi tra messaggi)',
    aliases: ['slow', 'modalenta'],
    category: 'Admin',
    guildOnly: true,
    permissions: ['ManageChannels'],
    usage: '<secondi 0-21600> [canale]',
    cooldown: 3000,
    execute: async (message, args, { client, config }) => {
        // Ottieni il canale (corrente o menzionato)
        let channel = message.mentions.channels.first() || message.channel;

        // Ottieni i secondi
        const seconds = parseInt(args[0] || args[1] || '0', 10);

        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '⏰ Tempo invalido',
                description: `Specifica secondi tra 0 e 21600 (6 ore).\nEsempio: \`${config.prefix}slowmode 10\` per 10 secondi tra messaggi.`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        try {
            await channel.setRateLimitPerUser(seconds);

            const embed = createEmbed({
                color: config.embedColors.success,
                title: '🐌 Slowmode impostato',
                description: `Modalità lenta ${channel === message.channel ? 'in questo canale' : `in ${channel}`} impostata a **${seconds} secondi** tra messaggi.`,
                footer: {
                    text: `Impostato da ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                },
                botAvatar: client.user.displayAvatarURL()
            });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Slowmode error:', error);
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Errore',
                description: 'Impossibile impostare la modalità lenta. Controlla i permessi.',
                botAvatar: client.user.displayAvatarURL()
            });
            message.reply({ embeds: [embed] });
        }
    }
};
