import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'lock',
    description: 'Blocca il canale (solo moderatori possono scrivere)',
    aliases: ['blocca', 'chiudi'],
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
                description: 'Posso bloccare solo canali di testo!',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        try {
            // Salva i permessi attuali per @everyone
            const everyoneRole = message.guild.roles.everyone;
            const currentPerms = channel.permissionOverwrites.cache.get(everyoneRole.id);

            // Blocca il canale per @everyone
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });

            const embed = createEmbed({
                color: config.embedColors.success,
                title: '🔒 Canale bloccato',
                description: `${channel} è stato bloccato.\nSolo moderatori possono scrivere.`,
                footer: {
                    text: `Bloccato da ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                },
                botAvatar: client.user.displayAvatarURL()
            });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lock error:', error);
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Errore',
                description: 'Impossibile bloccare il canale. Controlla i permessi.',
                botAvatar: client.user.displayAvatarURL()
            });
            message.reply({ embeds: [embed] });
        }
    }
};
