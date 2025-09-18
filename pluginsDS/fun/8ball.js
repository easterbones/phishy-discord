import { createEmbed } from '../../lib/utils.js';

export default {
    name: '8ball',
    description: 'Chiedi alla sfera magica una risposta',
    aliases: ['sfera', 'ball'],
    category: 'Fun',
    usage: '<domanda>',
    cooldown: 3000,
    execute: async (message, args, { client, config }) => {
        if (!args.length) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '❓ Domanda richiesta',
                description: `Usa: \`${config.prefix}8ball <la tua domanda>\``,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        const risposte = [
            // Risposte positive
            '🎉 Sì, assolutamente!',
            '✅ Certamente!',
            '🌟 Senza dubbio!',
            '💫 Le stelle dicono di sì!',
            '✨ Sì, è destino!',

            // Risposte negative
            '❌ No, assolutamente no!',
            '🚫 Neanche per sogno!',
            '😔 Purtroppo no...',
            '🌧️ Le nuvole dicono di no',
            '💔 Il mio cuore dice no',

            // Risposte neutrali
            '🤔 Forse...',
            '🔮 È possibile',
            '⏳ Chiedi più tardi',
            '🤷‍♀️ Non ne sono sicura',
            '🎭 I segni sono confusi',

            // Risposte divertenti
            '😂 Ah ah ah, no!',
            '🤪 Perché lo chiedi a me?',
            '🎪 Vai dal mago!',
            '🦄 Chiedi all\'unicorno',
            '🎭 Il fato è indeciso'
        ];

        const rispostaCasuale = risposte[Math.floor(Math.random() * risposte.length)];

        const embed = createEmbed({
            color: config.embedColors.info,
            title: '🔮 Sfera Magica 8-Ball',
            fields: [
                {
                    name: '❓ La tua domanda',
                    value: args.join(' '),
                    inline: false
                },
                {
                    name: '🎱 La risposta',
                    value: rispostaCasuale,
                    inline: false
                }
            ],
            botAvatar: client.user.displayAvatarURL()
        });

        message.reply({ embeds: [embed] });
    }
};
