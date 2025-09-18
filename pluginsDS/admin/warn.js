import { createEmbed, addInfoWarning } from '../../lib/utils.js';

export default {
    name: 'warn',
    description: 'Avverte un membro del server',
    aliases: ['warning', 'avverti'],
    category: 'Admin',
    guildOnly: true,
    permissions: ['ModerateMembers'],
    usage: '<@utente> [motivo]',
    cooldown: 5000,
    execute: async (message, args, { client, config, db }) => {
        // Trova il membro menzionato (compatibile con slash)
        let member = null;
        try {
            if (message.mentions && message.mentions.members && typeof message.mentions.members.first === 'function') {
                member = message.mentions.members.first();
            }
        } catch (_) { member = null; }

        // Se non trovato tramite mention, prova a risolvere dall'argomento (id o mention string)
        if (!member && Array.isArray(args) && args[0]) {
            const raw = args[0];
            const id = String(raw).replace(/[<@!>]/g, '');
            if (message.guild && id && /^\d{16,}$/.test(id)) {
                try { member = await message.guild.members.fetch(id).catch(() => null); } catch (_) { member = null; }
            }
        }

        if (!member) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '⚠️ Utente richiesto',
                description: `Menziona un utente da avvertire!\nEsempio: \`${config.prefix}warn @username motivo\``,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Non permettere di warnare se stessi
        if (member.id === message.author.id) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '😅 Ma stai bene?',
                description: 'Non puoi ammonire te stesso!',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Non permettere di warnare il bot
        if (member.id === client.user.id) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '🤖 sei scemo',
                description: 'Non puoi ammonire me stessa!',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Controlla se l'utente ha permessi superiori
        if (member.permissions.has('Administrator') || member.roles.highest.position >= message.member.roles.highest.position) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '🚫 Permessi insufficienti',
                description: 'non hai il ruolo per farlo',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Ottieni il motivo
        const reason = args.slice(1).join(' ') || 'Nessun motivo specificato';

        // Inizializza i dati dell'utente nel database
        const userId = member.id;
        if (!db.get(`users.${userId}`)) {
            db.set(`users.${userId}`, { warns: 0, warnReasons: [] });
        }
        const userData = db.get(`users.${userId}`);
        if (!userData.warnReasons) userData.warnReasons = [];

        // Aggiungi l'avvertimento
        const timestamp = new Date().toISOString();
        const displayTime = new Date().toLocaleString('it-IT');

        userData.warnReasons.push({
            reason: reason,
            date: timestamp,
            displayDate: displayTime,
            admin: message.author.id
        });

        userData.warns = (userData.warns || 0) + 1;
        db.set(`users.${userId}`, userData);

        // also add a lightweight info warning record to informations.json
        try {
            addInfoWarning(userId, {
                reason: reason || 'Nessun motivo specificato',
                date: Date.now(),
                channel: message && message.channel ? message.channel.id : null,
                moderator: message && message.author ? message.author.id : null
            });
        } catch (e) {
            console.error('addInfoWarning failed:', e);
        }

        const maxWarns = config.limits?.maxWarns || 3;

        let embedColor = config.embedColors.warning;
        let title = '⚠️ Avvertimento';
        let description = `**${member.user.tag}** è stato avvertito.\n**Warn:** ${userData.warns}/${maxWarns}\n**Motivo:** ${reason}\n**Data:** ${displayTime}`;

        // Se supera il limite, applica penalità
        if (userData.warns >= maxWarns) {
            embedColor = config.embedColors.error;
            title = '💀 Limite superato!';
            description += `\n\n**Penalità:** Espulsione dal server!`;

            // Reset warnings
            userData.warns = 0;
            userData.warnReasons = [];
            db.set(`users.${userId}`, userData);

            // Espelli l'utente
            try {
                await member.kick(`Superamento limite avvertimenti (${maxWarns})`);
                description += '\n✅ Utente espulso!';
            } catch (error) {
                console.error('Errore:', error);
                description += '\n❌ Impossibile espellere l\'utente.';
            }
        }

        const embed = createEmbed({
            color: embedColor,
            title: title,
            description: description,
            footer: {
                text: `Avvertito da ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL()
            },
            botAvatar: client.user.displayAvatarURL()
        });

        message.reply({ embeds: [embed] });
    }
};
