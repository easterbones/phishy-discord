import { createEmbed } from '../../lib/utils.js';
import ms from 'ms'; // Assumiamo che sia installato, altrimenti usa parse-ms

export default {
    name: 'mute',
    description: 'Muta un membro del server per un tempo specificato',
    aliases: ['timeout', 'silenzia'],
    category: 'Admin',
    guildOnly: true,
    permissions: ['ModerateMembers'],
    usage: '<@utente> <tempo> [motivo]',
    cooldown: 5000,
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
                title: '🔇 Utente richiesto',
                description: `Menziona un utente da mutare!\nEsempio: \`${config.prefix}mute @username 10m motivo\``,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Non permettere di mutare se stessi
        if (member.id === message.author.id) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '😅 Auto-mute?',
                description: 'Non puoi mutare te stesso!',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Non permettere di mutare il bot
        if (member.id === client.user.id) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '🤖 Non posso',
                description: 'Non posso mutare me stesso!',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Controlla se l'utente ha permessi superiori
        if (member.permissions.has('Administrator') || member.roles.highest.position >= message.member.roles.highest.position) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '🚫 Permessi insufficienti',
                description: 'Non puoi mutare questo utente!',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Ottieni il tempo
        const timeArg = args[1];
        if (!timeArg) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '⏰ Tempo richiesto',
                description: `Specifica il tempo!\nEsempi: \`10m\`, \`1h\`, \`30s\``,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Converte il tempo
        let duration;
        try {
            duration = ms(timeArg);
            if (!duration || duration < 1000) throw new Error('Tempo invalido');
            if (duration > 2419200000) throw new Error('Max 28 giorni'); // Discord max timeout
        } catch (error) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Tempo invalido',
                description: `Formato tempo non valido!\nUsa: \`10m\` (10 minuti), \`1h\` (1 ora), \`30s\` (30 secondi)`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Ottieni il motivo
        const reason = args.slice(2).join(' ') || 'Nessun motivo specificato';

        // Applica il timeout
        try {
            await member.timeout(duration, reason);

            const embed = createEmbed({
                color: config.embedColors.success,
                title: '🔇 Mute applicato',
                description: `**${member.user.tag}** è stato mutato.\n**Durata:** ${ms(duration, { long: true })}\n**Motivo:** ${reason}`,
                footer: {
                    text: `Mutato da ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                },
                botAvatar: client.user.displayAvatarURL()
            });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Mute error:', error);
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Errore',
                description: 'Impossibile mutare l\'utente. Controlla i permessi.',
                botAvatar: client.user.displayAvatarURL()
            });
            message.reply({ embeds: [embed] });
        }
    }
};
