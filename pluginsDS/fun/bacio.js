import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'bacio',
    description: 'Bacia qualcuno (menzionalo)',
    aliases: ['bacia', 'kiss'],
    category: 'Fun',
    usage: '<@utente>',
    cooldown: 3000,
    guildOnly: true,
    execute: async (message, args, { client, config, db }) => {
        // Trova gli utenti menzionati
        const mentionedUsers = message.mentions.users;

        if (mentionedUsers.size === 0) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '💋 Utente richiesto',
                description: `Menziona almeno un utente da baciare!\nEsempio: \`${config.prefix}bacio @username\``,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Evita di baciare se stesso
        if (mentionedUsers.has(message.author.id)) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '😘 Auto-bacio?',
                description: 'Baciare se stessi è complicato... meglio baciare gli altri! 💋',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Aggiorna statistiche baci (se esiste il sistema)
        mentionedUsers.forEach(user => {
            try {
                const userData = db.get(`users.${user.id}`) || {};
                userData.bacini = (userData.bacini || 0) + 1;
                db.set(`users.${user.id}`, userData);
            } catch (e) {
                // Ignora errori database
            }
        });

        // Crea la lista dei baciati
        const baciati = [`${message.author}`, ...mentionedUsers.map(u => `${u}`)];

        // Messaggi casuali
        const kissMessages = [
            `${baciati.join(' e ')} si stanno baciando! 💋`,
            `${message.author} ha baciato ${mentionedUsers.map(u => u.toString()).join(' e ')}! 😘`,
            `Bacio appassionato tra ${baciati.join(' e ')}! 💕`,
            `${message.author} manda un bacio a ${mentionedUsers.map(u => u.toString()).join(' e ')}! 💋`,
            `Che teneri! ${baciati.join(' e ')} si baciano! 😍`
        ];

        const randomMessage = kissMessages[Math.floor(Math.random() * kissMessages.length)];

        const embed = createEmbed({
            color: 0xff69b4, // Pink
            title: '💋 Bacio!',
            description: randomMessage,
            botAvatar: client.user.displayAvatarURL()
        });

        message.reply({ embeds: [embed] });
    }
};
