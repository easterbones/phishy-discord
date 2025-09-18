import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'dado',
    description: 'Lancia un dado (da 1 a 6)',
    aliases: ['dice', 'lancia'],
    category: 'Game',
    cooldown: 2000,
    execute: async (message, args, { client, config }) => {
        const risultato = Math.floor(Math.random() * 6) + 1;

        // Emoji per i dadi
        const dadoEmojis = {
            1: '⚀',
            2: '⚁',
            3: '⚂',
            4: '⚃',
            5: '⚄',
            6: '⚅'
        };

        const embed = createEmbed({
            color: config.embedColors.info,
            title: '🎲 Lancio del Dado',
            description: `${message.author} ha lanciato il dado...`,
            fields: [
                {
                    name: '🎯 Risultato',
                    value: `${dadoEmojis[risultato]} **${risultato}**`,
                    inline: true
                }
            ],
            botAvatar: client.user.displayAvatarURL()
        });

        // Aggiungi un po' di suspense
        const suspenseMsg = await message.reply('🎲 Lancio in corso...');
        setTimeout(() => {
            suspenseMsg.edit({ content: null, embeds: [embed] });
        }, 1000);
    }
};
