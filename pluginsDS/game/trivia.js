import { createEmbed } from '../../lib/utils.js';
import fetch from 'node-fetch';

export default {
    name: 'trivia',
    description: 'Gioco di trivia con domande casuali',
    aliases: ['quiz', 'domanda'],
    category: 'Game',
    cooldown: 10000,
    execute: async (message, args, { client, config }) => {
        try {
            // Lista di domande trivia locali (fallback)
            const localTrivia = [
                {
                    category: 'Scienza',
                    difficulty: 'Facile',
                    question: 'Qual è il pianeta più vicino al Sole?',
                    answer: 'Mercurio'
                },
                {
                    category: 'Storia',
                    difficulty: 'Facile',
                    question: 'In che anno è caduto il muro di Berlino?',
                    answer: '1989'
                },
                {
                    category: 'Geografia',
                    difficulty: 'Facile',
                    question: 'Qual è la capitale dell\'Italia?',
                    answer: 'Roma'
                },
                {
                    category: 'Intrattenimento',
                    difficulty: 'Facile',
                    question: 'Qual è il nome del protagonista di One Piece?',
                    answer: 'Monkey D. Luffy'
                },
                {
                    category: 'Sport',
                    difficulty: 'Facile',
                    question: 'Quanti giocatori ci sono in una squadra di calcio?',
                    answer: '11'
                }
            ];

            let question, answer, category, difficulty;

            // Prova a usare API esterna
            try {
                
                const res = await fetch("https://opentdb.com/api.php?amount=1");
                const json = await res.json();

                if (json.results && json.results.length > 0) {
                    const data = json.results[0];
                    question = data.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
                    answer = data.correct_answer.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
                    category = data.category;
                    difficulty = data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1);
                }
            } catch (apiErr) {
                console.warn('API trivia fallita, uso domande locali:', apiErr.message);
            }

            // Se API fallita, usa locale
            if (!question) {
                const randomTrivia = localTrivia[Math.floor(Math.random() * localTrivia.length)];
                question = randomTrivia.question;
                answer = randomTrivia.answer;
                category = randomTrivia.category;
                difficulty = randomTrivia.difficulty;
            }

            // Invia la domanda
            const questionEmbed = createEmbed({
                color: config.embedColors.info,
                title: '🎲 Trivia Quiz',
                fields: [
                    {
                        name: '📚 Categoria',
                        value: category,
                        inline: true
                    },
                    {
                        name: '⚡ Difficoltà',
                        value: difficulty,
                        inline: true
                    },
                    {
                        name: '❓ Domanda',
                        value: question,
                        inline: false
                    },
                    {
                        name: '⏰ Tempo',
                        value: 'Hai 20 secondi per pensare alla risposta!',
                        inline: false
                    }
                ],
                footer: {
                    text: 'PhiShy Bot • Rispondi nel canale!',
                    iconURL: client.user.displayAvatarURL()
                }
            });

            const questionMsg = await message.reply({ embeds: [questionEmbed] });

            // Dopo 20 secondi, rivela la risposta
            setTimeout(async () => {
                const answerEmbed = createEmbed({
                    color: config.embedColors.success,
                    title: '✅ Risposta Trivia',
                    fields: [
                        {
                            name: '❓ Domanda',
                            value: question,
                            inline: false
                        },
                        {
                            name: '🎯 Risposta Corretta',
                            value: `**${answer}**`,
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'PhiShy Bot',
                        iconURL: client.user.displayAvatarURL()
                    }
                });

                try {
                    await questionMsg.reply({ embeds: [answerEmbed] });
                } catch (e) {
                    // Se reply fallisce, invia nuovo messaggio
                    await message.channel.send({ embeds: [answerEmbed] });
                }
            }, 20000);

        } catch (error) {
            console.error('Errore trivia:', error);
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Errore',
                description: 'Impossibile caricare una domanda di trivia. Riprova più tardi.',
                botAvatar: client.user.displayAvatarURL()
            });
            message.reply({ embeds: [embed] });
        }
    }
};
