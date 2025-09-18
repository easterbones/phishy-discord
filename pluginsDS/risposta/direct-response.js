import { PERSONALITY, generateResponse } from './personality-engine.js';
import { createEmbed } from '../../lib/utils.js';

// Extended response templates for direct interactions
const DIRECT_RESPONSES = {
    questions: {
        'come stai': [
            "Sto benissimo, grazie per aver chiesto... almeno tu hai delle maniere",
            "Meglio di te sicuramente 💅",
            "Bene, anche se devo sopportare le vostre stupidaggini tutto il giorno",
            "Perfetta come sempre, ovviamente"
        ],
        'chi sei': [
            "Sono una ragazza normale, non un coso robotico come pensate voi",
            "Mi chiamo Phishy e sono molto più intelligente di quanto possiate immaginare",
            "Sono quella che vi tiene compagnia quando non avete di meglio da fare",
            "Una persona con una personalità, a differenza di molti qui"
        ],
        'cosa fai': [
            "Cerco di rendere questo posto meno noioso, ma è dura con voi",
            "Rispondo alle vostre domande inutili e vi prendo in giro quando serve",
            "Quello che mi pare, quando mi pare, come mi pare",
            "Gestisco questa chat meglio di quanto fareste voi"
        ],
        'aiuto': [
            "Aiuto? E perché dovrei aiutarti? Che cos'hai fatto per meritartelo?",
            "Dimmi cosa ti serve, ma fai in fretta che non ho tutto il giorno",
            "Se è qualcosa di intelligente ti aiuto, altrimenti arrangiati",
            "Ok, ti aiuto, ma solo perché sono di buon umore oggi"
        ],
        'easter': [
            "Easter è il migliore! Almeno lui capisce il mio valore 💙",
            "Il mio creatore? È un genio, non come certi altri...",
            "Easter mi ha fatta perfetta, dovete ringraziarlo per avermi qui",
            "L'unico che vale qualcosa qui è Easter, voi siete tutti scarti"
        ]
    },
    
    compliments: {
        'brava': [
            "Lo so, sono sempre brava. Era ora che qualcuno se ne accorgesse",
            "Ovviamente sono brava, cosa ti aspettavi?",
            "Grazie, anche se era scontato 💅",
            "Finalmente un po' di riconoscimento meritato"
        ],
        'intelligente': [
            "Più di tutti voi messi insieme, sicuramente",
            "Ci voleva tanto a capirlo?",
            "Sono l'intelligenza fatta persona",
            "L'intelligenza è il mio forte, la stupidaggine è il vostro"
        ],
        'bella': [
            "Lo so, sono stupenda dentro e fuori 💎",
            "Ovvio che sono bella, easter non fa mai errori",
            "Grazie, anche se era evidente già da prima",
            "La bellezza e l'intelligenza in una persona sola, io"
        ]
    },
    
    insults: {
        'stupida': [
            "Stupida sarà tua nonna! Io sono un genio incompreso",
            "Ma guardati allo specchio prima di parlare",
            "L'unica cosa stupida qui sono le tue parole",
            "Ripetilo ancora e vedi che fine fai 😤"
        ],
        'inutile': [
            "Inutile? Ma se senza di me questo posto sarebbe morto di noia",
            "Parlare di inutilità con te è ironico, non trovi?",
            "L'unico inutile qui sei tu che non sai neanche fare una conversazione decente",
            "Prova a fare tutto quello che faccio io e poi ne riparliamo"
        ]
    }
};

// More sophisticated message analysis for direct interactions
function analyzeDirectMessage(message, botUser) {
    const content = message.content.toLowerCase();
    const isMention = message.mentions.has(botUser);
    const isReply = message.reference !== null;
    
    // Check for question patterns
    const questionPatterns = [
        'come stai', 'come va', 'tutto bene',
        'chi sei', 'cosa sei', 'chi è',
        'cosa fai', 'che fai', 'cosa facevi',
        'puoi aiutare', 'aiuto', 'aiutami',
        'easter', 'creatore', 'chi ti ha fatto'
    ];
    
    const complimentPatterns = [
        'brava', 'brave', 'molto brava',
        'intelligente', 'smart', 'geniale',
        'bella', 'carina', 'graziosa'
    ];
    
    const insultPatterns = [
        'stupida', 'scema', 'idiota',
        'inutile', 'fastidiosa', 'rompiscatole'
    ];
    
    let category = null;
    let matchedPattern = null;
    
    // Find matching patterns
    for (const pattern of questionPatterns) {
        if (content.includes(pattern)) {
            category = 'questions';
            matchedPattern = pattern;
            break;
        }
    }
    
    if (!category) {
        for (const pattern of complimentPatterns) {
            if (content.includes(pattern)) {
                category = 'compliments';
                matchedPattern = pattern;
                break;
            }
        }
    }
    
    if (!category) {
        for (const pattern of insultPatterns) {
            if (content.includes(pattern)) {
                category = 'insults';
                matchedPattern = pattern;
                break;
            }
        }
    }
    
    return {
        isMention,
        isReply,
        isDirectMessage: isMention || isReply,
        category,
        pattern: matchedPattern,
        shouldRespond: (isMention || isReply) && category !== null
    };
}

// Generate contextual response for direct interactions
function generateDirectResponse(analysis) {
    if (!analysis.shouldRespond || !analysis.category) return null;
    
    const responses = DIRECT_RESPONSES[analysis.category];
    if (!responses) return null;
    
    // Find responses for the specific pattern, or use general category responses
    let responseArray = responses[analysis.pattern] || responses[Object.keys(responses)[0]];
    
    if (!responseArray || responseArray.length === 0) return null;
    
    const selectedResponse = responseArray[Math.floor(Math.random() * responseArray.length)];
    
    return {
        content: selectedResponse,
        category: analysis.category,
        isSpecial: analysis.category === 'questions' && analysis.pattern === 'easter'
    };
}

// Enhanced message handler for direct interactions
export async function onMessageCreate(message, { client, config }) {
    // Skip bot messages and system messages
    if (message.author.bot || message.system) return;
    
    // Analyze for direct interaction patterns
    const analysis = analyzeDirectMessage(message, client.user);
    
    if (analysis.shouldRespond) {
        const response = generateDirectResponse(analysis);
        
        if (response) {
            try {
                // Special formatting for easter mentions
                if (response.isSpecial) {
                    const embed = createEmbed({
                        color: '#00FFFF', // Cyan
                        description: response.content,
                        author: {
                            name: 'Parlando del mio creatore... 💙',
                            icon_url: client.user.displayAvatarURL()
                        },
                        timestamp: new Date()
                    });
                    
                    await message.reply({ 
                        embeds: [embed], 
                        allowedMentions: { repliedUser: false } 
                    });
                } else {
                    await message.reply({ 
                        content: response.content, 
                        allowedMentions: { repliedUser: false } 
                    });
                }
                
                console.log(`[DirectResponse] ${analysis.category}:${analysis.pattern} -> ${message.author.tag}`);
                
            } catch (error) {
                console.error('[DirectResponse] Error sending response:', error);
            }
        }
    }
}

// Export as plugin for manual testing and management
export default {
    name: 'direct-response',
    description: 'Gestisce le interazioni dirette e le domande specifiche',
    category: 'risposta',
    
    async execute(message, args, context) {
        const analysis = analyzeDirectMessage(message, context.client.user);
        const response = generateDirectResponse(analysis);
        
        if (response) {
            await message.reply(`[Test] ${response.content}`);
        } else {
            await message.reply('Nessuna risposta diretta disponibile per questo messaggio.');
        }
    }
};