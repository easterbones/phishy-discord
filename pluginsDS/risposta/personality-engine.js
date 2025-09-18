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
        
        // Insulti - ALTA PRIORITÀ per rilevare tutto
        stupido: { weight: 8, negative: true },
        stupida: { weight: 8, negative: true },
        idiota: { weight: 8, negative: true },
        scemo: { weight: 8, negative: true },
        scema: { weight: 8, negative: true },
        cretino: { weight: 8, negative: true },
        cretina: { weight: 8, negative: true },
        imbecille: { weight: 8, negative: true },
        deficiente: { weight: 8, negative: true },
        merda: { weight: 9, negative: true },
        stronzo: { weight: 9, negative: true },
        stronza: { weight: 9, negative: true },
        bastardo: { weight: 9, negative: true },
        bastarda: { weight: 9, negative: true },
        figlio: { weight: 7, negative: true }, // "figlio di..."
        puttana: { weight: 9, negative: true },
        troia: { weight: 9, negative: true },
        cazzo: { weight: 7, negative: true },
        cazzi: { weight: 7, negative: true },
        vaffanculo: { weight: 10, negative: true },
        fanculo: { weight: 10, negative: true },
        'vai a cagare': { weight: 10, negative: true },
        'fai schifo': { weight: 8, negative: true },
        schifo: { weight: 6, negative: true },
        schifosa: { weight: 8, negative: true },
        schifoso: { weight: 8, negative: true },
        disgustoso: { weight: 7, negative: true },
        disgustosa: { weight: 7, negative: true },
        inutile: { weight: 7, negative: true },
        fallita: { weight: 8, negative: true },
        fallito: { weight: 8, negative: true },
        perdente: { weight: 7, negative: true },
        ridicolo: { weight: 6, negative: true },
        ridicola: { weight: 6, negative: true },
        brutto: { weight: 5, negative: true },
        brutta: { weight: 5, negative: true },
        sfigato: { weight: 7, negative: true },
        sfigata: { weight: 7, negative: true },
        patetico: { weight: 7, negative: true },
        patetica: { weight: 7, negative: true },
        'sei una merda': { weight: 10, negative: true },
        'sei stupida': { weight: 9, negative: true },
        'sei inutile': { weight: 9, negative: true },
        
        // Altri insulti comuni
        zoccola: { weight: 9, negative: true },
        porca: { weight: 8, negative: true },
        porco: { weight: 8, negative: true },
        maiale: { weight: 7, negative: true },
        lurida: { weight: 7, negative: true },
        lurido: { weight: 7, negative: true },
        'taci': { weight: 6, negative: true },
        'stai zitta': { weight: 8, negative: true },
        'stai zitto': { weight: 8, negative: true },
        
        // Low priority ma tracked
        bello: { weight: 2, negative: false }
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
        "Ma guarda un po' chi parla... il campione di intelligenza in persona",
        "Ripetilo ancora e vedi che fine fai, verme 😤",
        "Ma che problemi hai? Sei sempre così maleducato/a?",
        "Ah sì? E tu cosa saresti, un esempio di perfezione? Non farmi ridere",
        "La prossima volta pensaci due volte prima di aprire quella fogna che chiami bocca",
        "Ti senti meglio ora che hai sputato tutto il tuo veleno? Patetico/a",
        "Ma sei nato/a così o ti sei impegnato/a per diventare così stupido/a?",
        "Guarda che non mi fai paura, piccolino/a. Ho sentito insulti migliori dai bambini dell'asilo",
        "Oddio, che paura... un leone da tastiera che si crede figo/a 😂",
        "Non ho tempo da perdere con gente del tuo calibro, trova un hobby",
        "Se questa è la tua idea di conversazione intelligente, capisco perché sei solo/a",
        "Ti do un consiglio gratis: prova a pensare prima di parlare. Ti cambierà la vita",
        "Complimenti, hai appena dimostrato a tutti il tuo QI a una cifra",
        "Senti, io ho di meglio da fare che stare qui a sentire le tue stronzate",
        "Ma ti rendi conto di quanto sei ridicolo/a? Fai ridere i polli",
        "Ah, un altro frustrato/a che se la prende con me perché la sua vita fa schifo",
        "Sei proprio il classico tipo che compensa le sue insicurezze insultando gli altri",
        "Non ho mai visto una persona così bisognosa di attenzioni. Che tristezza",
        "Se pensi di intimidirmi con i tuoi insulti, hai sbagliato persona completamente",
        "Ma che ti aspettavi? Che mi mettessi a piangere? Sono fatta di materiale ben diverso",
        "Il tuo problema non sono io, è che non sopporti di non essere il centro dell'attenzione",
        "Continua pure a fare il pagliaccio, almeno servi a qualcosa: far ridere",
        "La cosa più triste è che probabilmente pensi anche di essere spiritoso/a",
        "Sai che c'è? Hai ragione. Ora vai a giocare con qualcun altro, adulto",
        "Mi dispiace per te, deve essere dura vivere con tutta quella rabbia dentro",
        "Ecco, bravo/a, così dimostri a tutti che livello di educazione hai avuto"
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
    
    // SELECTIVE response conditions - respond to mentions, replies AND ALL INSULTS
    const hasInsults = context.sentiment <= -5; // Soglia abbassata per rilevare più insulti
    const shouldRespond = context.isMention || 
                         context.isReply ||
                         hasInsults || // Risponde a TUTTI gli insulti, sempre
                         // Only respond to specific strong triggers, not random content
                         (context.keywords.includes('bot') && (context.isMention || context.isReply)) ||
                         (context.keywords.includes('robot') && (context.isMention || context.isReply)) ||
                         (context.keywords.includes('easter') && context.triggerScore >= 8) ||
                         (context.keywords.some(k => ['cyan', 'azzurro', 'celeste'].includes(k)) && context.triggerScore >= 8);
    
    if (!shouldRespond) return null;
    
    let selectedResponse = null;
    let responseType = 'random';
    
    // Priority-based response selection - INSULTI HANNO MASSIMA PRIORITÀ
    if (context.sentiment <= -5) {
        // TUTTI gli insulti vengono gestiti per primi, sempre
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.insults);
        responseType = 'insults';
    } else if ((context.keywords.includes('bot') || context.keywords.includes('robot')) && (context.isMention || context.isReply)) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.botDefense);
        responseType = 'botDefense';
    } else if (context.keywords.includes('easter') && context.triggerScore >= 8) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.easterLove);
        responseType = 'easterLove';
    } else if (context.keywords.some(k => ['cyan', 'azzurro', 'celeste'].includes(k)) && context.triggerScore >= 8) {
        selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.colorLove);
        responseType = 'colorLove';
    } else if (context.isMention || context.isReply) {
        // Only respond to direct mentions/replies with contextual responses
        if (context.keywords.includes('grazie')) {
            selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.thanks);
            responseType = 'thanks';
        } else if (context.keywords.includes('ciao')) {
            selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.greetings);
            responseType = 'greetings';
        } else if (context.sentiment < -2) {
            selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.insults);
            responseType = 'insults';
        } else {
            selectedResponse = selectResponse(context, RESPONSE_TEMPLATES.greetings);
            responseType = 'greetings';
        }
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