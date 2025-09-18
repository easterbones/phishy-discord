import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'ridi',
    description: 'Ridi di qualcuno (menzionalo)',
    aliases: ['laugh', 'ridere'],
    category: 'Fun',
    usage: '<@utente>',
    cooldown: 3000,
    execute: async (message, args, { client, config }) => {
        // Trova l'utente menzionato
        let target = message.mentions.users.first();
        if (!target) {
            // Se non menzionato, ridi del mittente stesso
            target = message.author;
        }

        // Evita di ridere di se stesso in modo strano
        if (target.id === message.author.id) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '🤔 Auto-ridere?',
                description: 'Perché ridere di te stesso? 😂',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Emoji di risata casuali
        const laughEmojis = ['😂', '🤣', '😆', '😹', '🥲', '😜'];

        const randomLaugh = laughEmojis[Math.floor(Math.random() * laughEmojis.length)];

        const embed = createEmbed({
            color: config.embedColors.fun || config.embedColors.info,
            title: `${randomLaugh} Risata Epica!`,
            description: `${message.author} sta ridendo di ${target}! ${randomLaugh.repeat(3)}`,
            botAvatar: client.user.displayAvatarURL()
        });

        message.reply({ embeds: [embed] });
    }
};
