import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'amore',
    description: 'Calcola la percentuale di amore tra te e un\'altra persona',
    aliases: ['love', 'calcolamore'],
    category: 'Fun',
    usage: '<@utente>',
    cooldown: 5000,
    execute: async (message, args, { client, config }) => {
        // Trova l'utente menzionato
        let target = message.mentions.users.first();
        if (!target) {
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '💔 Utente richiesto',
                description: `Menziona un utente per calcolare l'amore!\nEsempio: \`${config.prefix}amore @username\``,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Evita calcolo con se stesso
        if (target.id === message.author.id) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '😅 Auto-amore?',
                description: 'L\'amore per se stessi è importante, ma qui calcoliamo con gli altri! 💖',
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        // Calcola percentuale casuale
        const lovePercentage = Math.floor(Math.random() * 100) + 1;

        // Determina il livello di amore
        let loveLevel, color, emoji;
        if (lovePercentage >= 80) {
            loveLevel = 'Amore Vero! 💕';
            color = 0xff69b4; // Hot pink
            emoji = '💘';
        } else if (lovePercentage >= 60) {
            loveLevel = 'Buon Amore 💖';
            color = 0xff1493; // Deep pink
            emoji = '💕';
        } else if (lovePercentage >= 40) {
            loveLevel = 'Amore Possibile 💓';
            color = 0xff6347; // Tomato
            emoji = '💓';
        } else if (lovePercentage >= 20) {
            loveLevel = 'Amicizia Speciale 💔';
            color = 0xff4500; // Orange red
            emoji = '💔';
        } else {
            loveLevel = 'Solo Amici 😊';
            color = 0x808080; // Gray
            emoji = '😊';
        }

        // Messaggi motivazionali
        const messages = {
            high: [
                "Questo è un amore ardente e appassionato! Vai e diglielo subito!",
                "Sembra che ci sia una scintilla tra voi due. Prova!",
                "Potrebbe esserci qualcosa di speciale qui. Dagli una possibilità!",
                "Hmm, l'amore è nell'aria. Forse è ora di un caffè insieme!",
                "Le stelle indicano che c'è un potenziale romantico. Fai una mossa!"
            ],
            medium: [
                "A volte, l'amicizia è l'inizio di qualcosa di bello.",
                "L'amore non è tutto, anche l'amicizia è fantastica!",
                "Ricorda che le migliori relazioni iniziano con una buona amicizia.",
                "A volte, l'amore può crescere con il tempo. Continua a rafforzare la tua connessione!",
                "La vita è una sorpresa, chi sa cosa riserva il futuro!"
            ],
            low: [
                "Anche se l'amore non sboccia come speravi, la tua connessione rimane preziosa.",
                "I cuori possono impiegare del tempo per sincronizzarsi.",
                "Nonostante le sfide dell'amore, la tua amicizia è un dono.",
                "Il tempo può rivelare cose sorprendenti. Continuiamo a esplorare insieme!",
                "La vita è piena di svolte inaspettate. Rimani aperto alle possibilità!"
            ]
        };

        let selectedMessages;
        if (lovePercentage >= 60) selectedMessages = messages.high;
        else if (lovePercentage >= 30) selectedMessages = messages.medium;
        else selectedMessages = messages.low;

        const randomMessage = selectedMessages[Math.floor(Math.random() * selectedMessages.length)];

        // Crea embed
        const embed = createEmbed({
            color: color,
            title: `${emoji} Calcolatore d'Amore ${emoji}`,
            description: `💘 **${message.author.username}** e **${target.username}** hanno una compatibilità amorosa del **${lovePercentage}%**!\n\n⭐ **Livello:** ${loveLevel}\n\n💬 *${randomMessage}*`,
            thumbnail: 'https://i.imgur.com/4Z5JqkC.png', // Cuore o qualcosa
            botAvatar: client.user.displayAvatarURL()
        });

        // Aggiungi suspense
        const suspenseEmbed = createEmbed({
            color: config.embedColors.info,
            title: '💘 Calcolo dell\'amore in corso...',
            description: 'Analizzo i cuori... 💓',
            botAvatar: client.user.displayAvatarURL()
        });

        const suspenseMsg = await message.reply({ embeds: [suspenseEmbed] });

        // Simula caricamento
        const loadingStages = ['10%', '30%', '50%', '80%', '100%'];
        for (let i = 0; i < loadingStages.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 800));
            suspenseEmbed.description = `Analizzo i cuori... ${loadingStages[i]} 💓`;
            await suspenseMsg.edit({ embeds: [suspenseEmbed] });
        }

        // Mostra risultato finale
        setTimeout(() => {
            suspenseMsg.edit({ embeds: [embed] });
        }, 500);
    }
};
