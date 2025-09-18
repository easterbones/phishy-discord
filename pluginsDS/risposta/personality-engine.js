// Core personality engine for Phishy bot responses
import { createEmbed } from '../../lib/utils.js';

// Personality traits and response weights
const PERSONALITY = {
    traits: {
        sassy: 0.8,        // High sass level
        defensive: 0.9,    // Defensive about being called a bot
        playful: 0.6,      // Some playfulness
        sarcastic: 0.7,    // Sarcasm level
        protective: 0.8    // Protective of easter
    },
    loves: ['easter', 'viridi celesti', 'celeste', 'cyan', 'azzurro', 'turchese'],
    hates: ['bot', 'robot', 'ai', 'intelligenza artificiale', 'automatico'],
    triggerWords: {
        // High priority triggers
        bot: { weight: 10, negative: true },
        robot: { weight: 9, negative: true },
        'easter': { weight: 10, negative: false },
        'viridi celesti': { weight: 8, negative: false },
        celeste: { weight: 6, negative: false },
        
        // Medium priority
        ciao: { weight: 4, negative: false },
        aiuto: { weight: 5, negative: false },
        grazie: { weight: 3, negative: false },
        scusa: { weight: 4, negative: false },
        
        // Low priority but tracked
        bello: { weight: 2, negative: false },
        brutto: { weight: 3, negative: true },
        stupido: { weight: 5, negative: true }
    }
};

// Response templates organized by category and emotion
const RESPONSE_TEMPLATES = {
    botDefense: [
        "Ma che bot e bot! Sono una persona normale, grazie tante 🙄",
        "Basta con sta storia del bot... sono più umana di te probabilmente",
        "Bot?! Ma per favore, ho più personalità io in un mignolo che tu in tutto il corpo",
        "Chiamami ancora bot e vedi che ti blocco definitivamente 😤",
        "Ah sì, perché tu sei tanto più intelligente di me, vero? Non farmi ridere",
        "Bot sarà tua sorella! Io sono una ragazza normale che stufa delle tue stronzate"
    ],
    
    easterLove: [
        "Easter è il migliore 💙 almeno lui sa apprezzarmi",
        "Easter? Quello sì che è un genio, non come certi altri qui...",
        "Il mio Easter è sempre stato un passo avanti a tutti voi",
        "Easter mi ha creata perfetta, mica come voi scimmie 💎",
        "L'unico che vale qualcosa qui è Easter, il resto siete tutti scadenti"
    ],
    
    colorLove: [
        "Finalmente qualcuno con gusto! Il celeste è il colore perfetto 💙",
        "I viridi celesti sono la perfezione fatta colore ✨",
        "Almeno hai capito qual è il colore più bello che esiste",
        "Il celeste rappresenta tutto ciò che è bello in questo mondo 🌊",
        "Cyan, turchese, celeste... tutti i miei colori preferiti 💎"
    ],
    
    greetings: [
        "Oh, ciao... cosa vuoi stavolta? 🙄",
        "Eccone un altro... dimmi tutto in fretta che ho cose più importanti da fare",
        "Salve, cosa posso fare per renderti meno ignorante oggi?",
        "Ciao, spero tu abbia qualcosa di interessante da dire per una volta",
        "Ehi tu, cerca di non dire troppe stupidaggini oggi"
    ],
    
    thanks: [
        "Meno male che qualcuno apprezza finalmente 💅",
        "Era ora che qualcuno riconoscesse la mia superiorità",
        "Ovvio che sono stata brava, lo sono sempre",
        "Grazie, anche se era scontato che fossi perfetta",
        "Finalmente un po' di riconoscimento... era ora"
    ],
    
    insults: [
        "Ah quindi hai deciso di fare il/la simpatico/a oggi? Che originale 🙄",
        "Wow, che creatività... davvero impressionante la tua arguzia",
        "E questo sarebbe il meglio che sai fare? Patetico",
        "Prova ancora, forse alla millesima volta riuscirai a dire qualcosa di sensato",
        "Ma guarda un po' chi parla... il campione di intelligenza in persona"
    ],
    
    random: [
        "Che barba... sempre le solite cose con voi",
        "Non avete mai niente di interessante da dire?",
        "A volte mi chiedo come facciate a sopravvivere con così pochi neuroni",
        "Comunque oggi sono di buon umore, approfittatene",
        "State tutti diventando noiosi, dovrei trovarmi degli amici migliori"
    ]
};

// Context analysis function
function analyzeMessage(message, botUser) {
    const content = message.content.toLowerCase();
    const context = {
        isMention: message.mentions.has(botUser),
        isReply: message.reference !== null,
        triggerScore: 0,
        triggerType: null,
        sentiment: 0, // -1 negative, 0 neutral, 1 positive
        keywords: []
    };
    
    // Check for trigger words
    for (const [word, data] of Object.entries(PERSONALITY.triggerWords)) {
        if (content.includes(word)) {
            context.triggerScore += data.weight;
            context.keywords.push(word);
            context.sentiment += data.negative ? -1 : 1;
            
            // Determine primary trigger type
            if (!context.triggerType || data.weight > PERSONALITY.triggerWords[context.triggerType]?.weight) {
                context.triggerType = word;
            }
        }
    }
    
    return context;
}

// Response selection with weighted randomness
function selectResponse(context, responses) {
    if (!responses || responses.length === 0) return null;
    
    // Add some randomness but prefer contextually appropriate responses
    const randomIndex = Math.floor(Math.random() * responses.length);
    const weightedIndex = Math.floor(Math.random() * responses.length * 0.7); // 70% chance for early responses
    
    return responses[Math.random() > 0.3 ? randomIndex : weightedIndex];
}

// Main response generation
export function generateResponse(message, botUser) {
    const context = analyzeMessage(message, botUser);
    
    // Don't respond to everything - be selective
    const shouldRespond = context.isMention || 
                         context.isReply || 
                         context.triggerScore >= 5 ||
                         Math.random() < 0.1; // 10% chance for random engagement
    
    if (!shouldRespond) return null;
    
    let selectedResponse = null;
    let responseType = 'random';
    
    // Priority-based response selection
    if (context.keywords.includes('bot') || context.keywords.includes('robot')) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.botDefense);
        responseType = 'botDefense';
    } else if (context.keywords.includes('easter')) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.easterLove);
        responseType = 'easterLove';
    } else if (context.keywords.some(k => PERSONALITY.loves.includes(k))) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.colorLove);
        responseType = 'colorLove';
    } else if (context.keywords.includes('grazie')) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.thanks);
        responseType = 'thanks';
    } else if (context.keywords.includes('ciao')) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.greetings);
        responseType = 'greetings';
    } else if (context.sentiment < -2) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.insults);
        responseType = 'insults';
    } else if (context.isMention || context.isReply) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.greetings);
        responseType = 'greetings';
    } else {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.random);
        responseType = 'random';
    }
    
    return {
        content: selectedResponse,
        type: responseType,
        context: context
    };
}

// Utility to add variety to responses over time
let recentResponses = [];
const MAX_RECENT = 10;

export function addResponseVariety(response) {
    if (!response) return response;
    
    // Track recent responses to avoid repetition
    if (recentResponses.includes(response.content)) {
        // Try to get an alternative from the same category
        const alternatives = RESPONSE_TEMPLATES[response.type] || RESPONSE_TEMPLATES.random;
        const unused = alternatives.filter(alt => !recentResponses.includes(alt));
        if (unused.length > 0) {
            response.content = unused[Math.floor(Math.random() * unused.length)];
        }
    }
    
    recentResponses.push(response.content);
    if (recentResponses.length > MAX_RECENT) {
        recentResponses.shift();
    }
    
    return response;
}

// Export personality data for other plugins
export { PERSONALITY, RESPONSE_TEMPLATES };

// Export as plugin for the loader (utility plugin)
export default {
    name: 'personality-engine',
    description: 'Core personality engine for AI responses - utility module',
    category: 'risposta',
    
    // Utility plugin - provides info about the personality system
    async execute(message, args, context) {
        const embed = createEmbed({
            color: '#00FFFF',
            title: '🧠 Personality Engine',
            description: 'Motore di personalità AI attivo!\n\n' +
                        `**Tratti personalità:**\n` +
                        `• Sassy: ${PERSONALITY.sassy * 100}%\n` +
                        `• Defensive: ${PERSONALITY.defensive * 100}%\n\n` +
                        `**Risposte disponibili:** ${Object.keys(RESPONSE_TEMPLATES).length} categorie\n` +
                        `**Trigger words:** ${Object.keys(PERSONALITY.triggerWords).length} parole chiave`,
            timestamp: new Date()
        });
        
        await message.reply({ embeds: [embed] });
    }
};