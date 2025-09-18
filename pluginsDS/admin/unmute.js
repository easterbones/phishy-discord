import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'unmute',
    description: 'Rimuove il mute da un membro del server',
    aliases: ['untimeout', 'smuta'],
    category: 'Admin',
    guildOnly: true,
    permissions: ['ModerateMembers'],
    usage: '<@utente> [motivo]',
    cooldown: 3000,
    execute: async (message, args, { client, config }) => {
        // Trova il membro menzionato
        let member = null;
        try {
            if (message.mentions && message.mentions.members && typeof message.mentions.members.first === 'function') {
                member = message.mentions.members.first();
            }
        } catch (_) { member = null; }
        if (!member && Array.isArray(args) && args[0]) {
            const id = String(args[0]).replace(/[<@!>]/g, '');
            if (message.guild && id && /^\d{16,}$/.test(id)) {
                try { member = await message.guild.members.fetch(id).catch(() => null); } catch (_) { member = null; }
            }
        }
        if (!member) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '🔊 Utente richiesto',
                description: `Menziona un utente da smutare!\nEsempio: \`${config.prefix}unmute @username motivo\``,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Controlla se l'utente è effettivamente mutato
        if (!member.isCommunicationDisabled()) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '🔊 Non mutato',
                description: `**${member.user.tag}** non è mutato!`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Ottieni il motivo
        const reason = args.slice(1).join(' ') || 'Nessun motivo specificato';

        // Rimuovi il timeout
        try {
            await member.timeout(null, reason);

            const embed = createEmbed({
                color: config.embedColors.success,
                title: '🔊 Unmute applicato',
                description: `**${member.user.tag}** può di nuovo parlare.\n**Motivo:** ${reason}`,
                footer: {
                    text: `Smutato da ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                },
                botAvatar: client.user.displayAvatarURL()
            });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Unmute error:', error);
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Errore',
                description: 'Impossibile smutare l\'utente. Controlla i permessi.',
                botAvatar: client.user.displayAvatarURL()
            });
            message.reply({ embeds: [embed] });
        }
    }
};
