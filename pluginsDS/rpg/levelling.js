import { createEmbed } from '../../lib/utils.js';
import config from '../../config/config.js';

export default {
    name: 'levelling',
    description: 'Gestisce assegnazione XP e level up quando gli utenti inviano messaggi',
    // non è un comando, ma espone un hook onMessageCreate
    onMessageCreate: async (message, { client, db, cooldowns }) => {
        try {
            // Ignore bots
            if (message.author.bot) return;

            // Ensure user names
            const { updateUserNames, addXp } = await import('../../lib/utils.js');
            await updateUserNames(db, message.author.id, message.author.tag, message.member?.displayName);

            const user = db.get(`users.${message.author.id}`) || { level: 0, exp: 0 };
            const xpChance = (config.xpChance !== undefined) ? config.xpChance : 0.25;
            const now = Date.now();
            if (Math.random() <= xpChance) {
                const gain = Math.floor(Math.random() * 16) + 10; // 10-25
                addXp(db, message.author.id, gain, { name: message.author.tag, displayName: message.member?.displayName, lastXp: now });
                const userAfter = db.get(`users.${message.author.id}`) || user;

                try {
                    const { canLevelUp, findLevel } = await import('../../lib/levelling.js');
                    const checkLevelUser = userAfter;
                    if (canLevelUp(checkLevelUser.level || 0, checkLevelUser.exp || 0, global.multiplier)) {
                        const newLevel = findLevel(checkLevelUser.exp || 0, global.multiplier);
                        const oldLevel = checkLevelUser.level || 0;
                        if (newLevel > oldLevel) {
                            checkLevelUser.level = newLevel;
                            db.set(`users.${message.author.id}`, checkLevelUser);
                            const embed = createEmbed({
                                color: config.embedColors.success,
                                title: '🎉 LEVEL UP!',
                                description: `<@${message.author.id}> è salito dal livello **${oldLevel}** al livello **${newLevel}**!`
                            });
                            message.channel.send({ embeds: [embed] }).catch(() => {});
                        }
                    }
                } catch (e) {
                    console.warn('Errore controllo level-up nel plugin levelling:', e);
                }
            }
        } catch (e) {
            console.warn('Errore plugin levelling onMessageCreate:', e);
        }
    }
};
