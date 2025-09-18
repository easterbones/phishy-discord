import { createEmbed, getUserData } from '../../lib/utils.js';

export default {
    name: 'profilo',
    description: 'Visualizza il tuo profilo o quello di un altro utente',
    aliases: ['profile', 'user'],
    category: 'Info',
    usage: '[@utente]',
    execute: async (message, args, { client, config, db }) => {
        // Determina l'utente target
        let targetUser = message.author;
        if (args.length > 0) {
            const mention = message.mentions.users.first();
            if (mention) {
                targetUser = mention;
            }
        }

        // Ottieni i dati dell'utente
        const userData = getUserData(db, targetUser.id);

        // Inizializza struttura RPG se mancante (per compatibilità con dati esistenti)
        if (!userData.rpg) {
            userData.rpg = {
                job: null,
                jobCooldown: 0,
                bustapaga: {},
                ultimoLavoro: {},
                uova: 0,
                limit: 0,
                cooldowns: {},
                health: 100,
                maxHealth: 100,
                attack: 10,
                defense: 5,
                lastWork: 0,
                lastDaily: 0
            };
            db.set(`users.${targetUser.id}`, userData);
        }

        // Calcola il livello basato sull'XP
        const xpForNextLevel = userData.level * 100;
        const progressPercent = Math.min((userData.xp / xpForNextLevel) * 100, 100);

        // Crea barra progresso
        const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) +
                           '░'.repeat(10 - Math.floor(progressPercent / 10));

        const embed = createEmbed({
            color: config.embedColors.default,
            title: `👤 Profilo di ${targetUser.username}`,
            thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 128 }),
            fields: [
                {
                    name: '📊 Statistiche Generali',
                    value: `**Livello:** ${userData.level}\n**XP:** ${userData.xp}/${xpForNextLevel}\n**Monete:** ${config.emojis.coin} ${userData.coins}`,
                    inline: true
                },
                {
                    name: '⚔️ Statistiche RPG',
                    value: `**Salute:** ${userData.rpg.health}/${userData.rpg.maxHealth} ❤️\n**Attacco:** ${userData.rpg.attack} ⚔️\n**Difesa:** ${userData.rpg.defense} 🛡️`,
                    inline: true
                },
                {
                    name: '💼 Lavoro',
                    value: userData.rpg.job ? `**${userData.rpg.job}**` : 'Nessuno',
                    inline: true
                },
                {
                    name: '📈 Progresso Livello',
                    value: `${progressBar} ${Math.floor(progressPercent)}%`,
                    inline: false
                },
                {
                    name: '📊 Attività',
                    value: `**Messaggi:** ${userData.stats.messages}\n**Comandi:** ${userData.stats.commands}`,
                    inline: true
                }
            ],
            footer: {
                text: `ID: ${targetUser.id} • Iscritto dal ${new Date(userData.stats.joinedAt).toLocaleDateString('it-IT')}`,
                icon_url: client.user.displayAvatarURL()
            },
            botAvatar: client.user.displayAvatarURL()
        });

        message.reply({ embeds: [embed] });
    }
};
