import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'saluta',
    description: 'Il bot ti saluta con un messaggio casuale',
    aliases: ['ciao', 'hello'],
    category: 'Fun',
    execute: async (message, args, { client, config }) => {
        const saluti = [
            '👋 Ciao!',
            '🎉 Salve!',
            '😊 Hey!',
            '🤗 Buongiorno!',
            '✨ Ciao ciao!',
            '🌟 Ehi!',
            '💫 Ciao bello!',
            '🎈 Saluti!',
            '😄 Ciao amico!',
            '🌈 Buongiorno splendore!'
        ];

        const salutoCasuale = saluti[Math.floor(Math.random() * saluti.length)];

        const embed = createEmbed({
            color: config.embedColors.success,
            description: `${salutoCasuale} ${message.author}!`,
            botAvatar: client.user.displayAvatarURL()
        });

        message.reply({ embeds: [embed] });
    }
};
