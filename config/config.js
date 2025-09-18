// Configurazione principale del bot PhiShy Discord
const config = {
    // Informazioni bot
    bot: {
        name: 'PhiShy',
        version: '1.0.0',
        author: 'easterbones'
    },

    prefixes: ['!', '.', ',', '#'],

    owner: ['123456789012345678'], // Sostituisci con il tuo ID Discord

    // Canali speciali
    channels: {
        logs: '1376294811677757512', // Sostituisci con ID canale logs
        welcome: '1353069058794323968' // Sostituisci con ID canale welcome
    },

    // Permessi
    permissions: {
        adminCommands: ['ADMINISTRATOR'],
        modCommands: ['MANAGE_MESSAGES', 'KICK_MEMBERS'],
        funCommands: [], // Comandi fun accessibili a tutti
        rpgCommands: [] // Comandi RPG accessibili a tutti
    },

    // Limiti
    limits: {
        maxWarns: 3,
        cooldownTime: 5000, // 5 secondi
        maxDailyXP: 100
    },

    // Database
    database: {
        file: './database/database.json',
        backupInterval: 3600000 // 1 ora
    },

    // API Keys (aggiungi le tue)
    apis: {
        weather: 'your-weather-api-key',
        translate: 'your-translate-api-key',
        // Aggiungi altre API keys qui
    },

    // Emoji personalizzati
    emojis: {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        dolci: '🍬',
        heart: '❤️',
        star: '⭐',
        fire: '🔥'
    },

    // Messaggi embed
    embedColors: {
        default: 0x0099ff,
        success: 0x00ff00,
        error: 0xff0000,
        warning: 0xffff00,
        info: 0x0099ff
    },
    // Livellamento
    xpChance: 0.25, // probabilità che un messaggio dia XP (0..1)
    levelMultiplier: 1.0 // moltiplicatore della difficoltà di livello (>1 rende più difficile salire)
};

export default config;