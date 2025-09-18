import { createEmbed } from '../../lib/utils.js';
import fetch from 'node-fetch';
import translate from '@vitalets/google-translate-api';
export default {
    name: 'barzelletta',
    description: 'Racconta una barzelletta geek casuale',
    aliases: ['battuta', 'joke'],
    category: 'Fun',
    cooldown: 5000,
    execute: async (message, args, { client, config }) => {
        try {
            // Lista di barzellette locali in italiano (fallback)
            const barzelletteLocali = [
                "Perché il programmatore ha paura del buio? Perché gli mancano i byte!",
                "Cosa fa un computer quando è stanco? Va in standby!",
                "Perché il telefono è andato dal dottore? Perché aveva il virus!",
                "Cosa dice un bit a un altro bit? 'Ci vediamo nel byte!'",
                "Perché il programmatore è sempre calmo? Perché ha il controllo del flusso!",
                "Cosa fa un algoritmo in vacanza? Va in loop infinito!",
                "Perché il database è andato in terapia? Perché aveva troppi problemi relazionali!",
                "Cosa dice il programmatore quando trova un bug? 'Finalmente ho un amico!'"
            ];

            // Prova a usare l'API esterna
            let battuta;
            try {
                const apiUrl = 'https://geek-jokes.sameerkumar.website/api?format=json';
                const res = await fetch(apiUrl);
                if (res.ok) {
                    const data = await res.json();
                    battuta = data.joke;

                    // Prova a tradurre in italiano
                    try {
                        const result = await translate(battuta, { to: 'it', autoCorrect: true });
                        battuta = result.text;
                    } catch (translateErr) {
                        // Se traduzione fallisce, usa originale
                        console.warn('Traduzione fallita:', translateErr.message);
                    }
                }
            } catch (apiErr) {
                console.warn('API esterna fallita, uso barzelletta locale:', apiErr.message);
            }

            // Se API fallita, usa locale
            if (!battuta) {
                battuta = barzelletteLocali[Math.floor(Math.random() * barzelletteLocali.length)];
            }

            const embed = createEmbed({
                color: config.embedColors.info,
                title: '🧠 Barzelletta Geek',
                description: `_${battuta}_`,
                footer: {
                    text: 'PhiShy Bot',
                    iconURL: client.user.displayAvatarURL()
                }
            });

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Errore barzelletta:', error);
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Errore',
                description: 'Impossibile recuperare una barzelletta. Riprova più tardi.',
                botAvatar: client.user.displayAvatarURL()
            });
            message.reply({ embeds: [embed] });
        }
    }
};
