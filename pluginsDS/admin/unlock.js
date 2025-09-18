import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'unlock',
    description: 'Sblocca il canale (tutti possono scrivere)',
    aliases: ['sblocca', 'apri'],
    category: 'Admin',
    guildOnly: true,
    permissions: ['ManageChannels'],
    usage: '[canale]',
    cooldown: 3000,
    execute: async (message, args, { client, config }) => {
        // Ottieni il canale (corrente o menzionato)
        const channel = message.mentions.channels.first() || message.channel;

        // Verifica che sia un canale di testo
        if (channel.type !== 0) { // GUILD_TEXT
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Tipo canale non valido',
                description: 'Posso sbloccare solo canali di testo!',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        try {
            // Sblocca il canale per @everyone
            const everyoneRole = message.guild.roles.everyone;
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null // Reset to default
            });

            const embed = createEmbed({
                color: config.embedColors.success,
                title: '🔓 Canale sbloccato',
                description: `${channel} è stato sbloccato.\nTutti possono scrivere.`,
                footer: {
                    text: `Sbloccato da ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                },
                botAvatar: client.user.displayAvatarURL()
            });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Unlock error:', error);
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Errore',
                description: 'Impossibile sbloccare il canale. Controlla i permessi.',
                botAvatar: client.user.displayAvatarURL()
            });
            message.reply({ embeds: [embed] });
        }
    }
};
