import { createEmbed, getUserData } from '../../lib/utils.js';

export default {
    name: 'daily',
    description: 'Raccogli la tua ricompensa giornaliera e mantieni lo streak!',
    aliases: ['claim', 'ricompensa'],
    category: 'RPG',
    cooldown: 1000, // 1 secondo per evitare spam
    execute: async (message, args, { client, db, config }) => {
        const userId = message.author.id;
        const userData = getUserData(db, userId);
        const now = Date.now();
        const todayStr = new Date(now).toISOString().split('T')[0];

        // Cooldown di 24 ore
        const cooldown = 24 * 60 * 60 * 1000; // 24 ore
        const tolerance = 6 * 60 * 60 * 1000; // 6 ore extra di tolleranza
        const maxWindow = cooldown + tolerance; // 30 ore totali

        const lastClaim = userData.rpg.lastDaily || 0;
        const diff = now - lastClaim;

        // Controlla se è passato abbastanza tempo
        if (diff < cooldown) {
            const remainingTime = Math.ceil((cooldown - diff) / 1000);
            const hours = Math.floor(remainingTime / 3600);
            const minutes = Math.floor((remainingTime % 3600) / 60);

            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '⏰ Aspetta per reclamare',
                description: `Devi aspettare ancora **${hours}h ${minutes}m** per poter reclamare di nuovo la ricompensa giornaliera.`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Gestisci lo streak
        let streak = userData.rpg.streak || 0;

        if (diff > maxWindow) {
            // Streak perso
            streak = 1;
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '💔 Streak Perso!',
                description: 'Hai perso lo streak! Sei passato oltre le 30 ore senza reclamare.',
                botAvatar: client.user.displayAvatarURL()
            });
            await message.reply({ embeds: [embed] });
        } else {
            // Streak mantenuto
            streak += 1;
        }

        // Calcola la ricompensa
        const baseReward = 100;
        const streakBonus = Math.min(streak * 3, 40); // Max 40 bonus streak
        const totalReward = Math.floor(baseReward + streakBonus);

        // Aggiorna i dati utente
        userData.xp += Math.floor(totalReward / 10); // XP bonus
        userData.coins += totalReward;
        userData.rpg.lastDaily = now;
        userData.rpg.streak = streak;

        // Salva nel database
        db.set(`users.${userId}`, userData);

        // Crea embed di successo
        const embed = createEmbed({
            color: config.embedColors.success,
            title: `🎉 Daily Reward - Giorno ${streak}`,
            description: `Hai ricevuto **${totalReward}** ${config.emojis.coin}!`,
            fields: [
                {
                    name: '💰 Ricompensa Base',
                    value: `${baseReward} ${config.emojis.coin}`,
                    inline: true
                },
                {
                    name: '🔥 Bonus Streak',
                    value: `+${streakBonus} ${config.emojis.coin}`,
                    inline: true
                },
                {
                    name: '⭐ XP Guadagnati',
                    value: `+${Math.floor(totalReward / 10)} XP`,
                    inline: true
                },
                {
                    name: '📊 Statistiche',
                    value: `**Streak Attuale:** ${streak} giorni\n**Monete Totali:** ${userData.coins} ${config.emojis.coin}`,
                    inline: false
                }
            ],
            botAvatar: client.user.displayAvatarURL()
        });

        // Controlla se ha raggiunto un nuovo livello
        const oldLevel = userData.level;
        const newLevel = Math.floor(userData.xp / 100) + 1;

        if (newLevel > oldLevel) {
            userData.level = newLevel;
            db.set(`users.${userId}`, userData);

            const levelUpEmbed = createEmbed({
                color: config.embedColors.success,
                title: '🎊 Livello Superato!',
                description: `${message.author.username} è salito al **livello ${newLevel}**!`,
                botAvatar: client.user.displayAvatarURL()
            });

            await message.reply({ embeds: [embed, levelUpEmbed] });
        } else {
            await message.reply({ embeds: [embed] });
        }
    }
};
