import fs from 'fs';
import path from 'path';

// Utility per gestire il database JSON
class Database {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                this.data = JSON.parse(data);
            } else {
                // Crea directory se non esiste
                const dir = path.dirname(this.filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                this.data = {};
                this.save();
            }
        } catch (error) {
            console.error('Errore nel caricamento del database:', error);
            this.data = {};
        }
    }

    save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Errore nel salvataggio del database:', error);
        }
    }

    // Alias compatibile: alcuni moduli chiamano db.write()
    write() {
        return this.save();
    }

    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.data;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    set(key, value) {
        const keys = key.split('.');
        let obj = this.data;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!obj[k] || typeof obj[k] !== 'object') {
                obj[k] = {};
            }
            obj = obj[k];
        }

        obj[keys[keys.length - 1]] = value;
        this.save();
    }

    delete(key) {
        const keys = key.split('.');
        let obj = this.data;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!obj[k] || typeof obj[k] !== 'object') {
                return false;
            }
            obj = obj[k];
        }

        if (keys[keys.length - 1] in obj) {
            delete obj[keys[keys.length - 1]];
            this.save();
            return true;
        }

        return false;
    }

    add(key, amount) {
        const current = this.get(key, 0);
        if (typeof current === 'number' && typeof amount === 'number') {
            this.set(key, current + amount);
            return true;
        }
        return false;
    }

    subtract(key, amount) {
        return this.add(key, -amount);
    }
}

// Secondary databases to keep main user records small
const INFO_DB_PATH = path.join(process.cwd(), 'database', 'informations.json');
const RPG_DB_PATH = path.join(process.cwd(), 'database', 'rpg.json');
const infosDB = new Database(INFO_DB_PATH);
const rpgDB = new Database(RPG_DB_PATH);
// Channels DB: store per-server channel settings
const CHANNELS_DB_PATH = path.join(process.cwd(), 'database', 'channels.json');
const channelsDB = new Database(CHANNELS_DB_PATH);

// RPG helpers: centralized access to rpgDB and default initialization
/**
 * Ensure an RPG record exists for a user and return it.
 * Returns object { id, name, data }
 */
function getRpgRecord(userId) {
    const key = `users.${userId}`;
    const rec = rpgDB.get(key) || { id: userId, name: null, data: {} };
    if (!rec.data) rec.data = {};
    return rec;
}

/**
 * Ensure the RPG `data` object contains required defaults.
 */
function ensureRpgDefaults(rpgData) {
    const defaults = {
        dolci: 0,
        credito: 0,
        token: 0,
        vita: 100,
        health: 100,
        scudo: 0,
        exp: 0,
        livello: 1,
        rank: 'Novizio',
        lavoro: null,
        casa: null,
        uova: 0
    };
    for (const [k, v] of Object.entries(defaults)) {
        if (rpgData[k] === undefined) rpgData[k] = v;
    }
    return rpgData;
}

function saveRpgRecord(userId, record) {
    const key = `users.${userId}`;
    rpgDB.set(key, record);
}

/**
 * Initialize all existing RPG records to ensure required defaults exist.
 * Returns number of records updated.
 */
function initializeAllRpgDefaults() {
    const users = rpgDB.get('users') || {};
    let updated = 0;
    for (const [uid, userRecord] of Object.entries(users)) {
        // userRecord should be { id, name, data }
        if (!userRecord || !userRecord.data) {
            continue;
        }
        let changed = false;
        const defaults = {
            dolci: 0,
            credito: 0,
            token: 0,
            vita: 100,
            health: 100,
            scudo: 0,
            exp: 0,
            livello: 1,
            rank: 'Novizio',
            lavoro: null,
            casa: null,
            uova: 0
        };
        for (const [k, v] of Object.entries(defaults)) {
            if (userRecord.data[k] === undefined) {
                userRecord.data[k] = v;
                changed = true;
            }
        }
        if (changed) {
            rpgDB.set(`users.${uid}`, userRecord);
            updated++;
        }
    }
    return updated;
}

// Utility per gestire cooldown dei comandi
class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }

    set(userId, command, time) {
        if (!this.cooldowns.has(userId)) {
            this.cooldowns.set(userId, new Map());
        }
        this.cooldowns.get(userId).set(command, Date.now() + time);
    }

    get(userId, command) {
        if (!this.cooldowns.has(userId)) return 0;
        return this.cooldowns.get(userId).get(command) || 0;
    }

    has(userId, command) {
        const time = this.get(userId, command);
        return time > Date.now();
    }

    getRemainingTime(userId, command) {
        const time = this.get(userId, command);
        return Math.max(0, time - Date.now());
    }

    clear(userId, command) {
        if (this.cooldowns.has(userId)) {
            this.cooldowns.get(userId).delete(command);
        }
    }
}

// Utility per formattare tempo
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}g ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Utility per creare embed Discord
function createEmbed(options = {}) {
    const embed = {
        color: options.color || 0x0099ff,
        timestamp: new Date(),
        footer: {
            text: 'PhiShy Discord Bot',
            icon_url: options.botAvatar || null
        },
        fields: options.fields || [] // Inizializza sempre fields come array
    };

    if (options.title) embed.title = options.title;
    if (options.description) embed.description = options.description;
    if (options.thumbnail) embed.thumbnail = { url: options.thumbnail };
    if (options.image) embed.image = { url: options.image };
    if (options.author) embed.author = options.author;

    return embed;
}

// Utility per verificare permessi
function hasPermission(member, requiredPermissions) {
    if (!member || !requiredPermissions || requiredPermissions.length === 0) {
        return true; // Nessun permesso richiesto
    }

    return requiredPermissions.some(perm => member.permissions.has(perm));
}






// Utility per ottenere user dal database




function getUserData(db, userId) {
    const userKey = `users.${userId}`;
    let userData = db.get(userKey);

    if (!userData) {
        userData = {
            id: userId,
            // store canonical username and displayName/nickname
            name: null,
            displayName: null,
            xp: 0,
            level: 1,
            // lightweight main record; large/volatile data stored in secondary DBs
            coins: 100,
            inventory: []
        };
        db.set(userKey, userData);
    }

    return userData;
}

// Save username/displayName from a Discord GuildMember-like object
// member: expected shape { id, user: { username }, displayName, nickname }
function setUserNamesFromMember(db, member) {
    if (!member || !member.id) return false;
    const userId = member.id;
    const username = (member.user && member.user.username) ? member.user.username : null;
    // Discord provides displayName; fallback to nickname or username
    const displayName = member.displayName || member.nickname || username || null;
    return updateUserNames(db, userId, username, displayName);
}

// Save username/displayName from a Message-like object
// message: expected shape { author: { id, username }, member: { displayName, nickname } }
function setUserNamesFromMessage(db, message) {
    if (!message) return false;
    const author = message.author || {};
    const member = message.member || {};
    const userId = author.id || (member && member.id);
    if (!userId) return false;
    const username = author.username || (member.user && member.user.username) || null;
    const displayName = member.displayName || member.nickname || username || null;
    return updateUserNames(db, userId, username, displayName);
}

// Centralized helpers for user attribute management
function incrementMessages(db, userId) {
    // store message counter in infosDB to keep main user small
    const infoKey = `users.${userId}`;
    let info = infosDB.get(infoKey) || { id: userId, name: null, messages: 0, commands: 0, joinedAt: Date.now() };
    info.messages = (info.messages || 0) + 1;
    infosDB.set(infoKey, info);
    return info;
}

/**
 * Add XP to a user and optionally update name/displayName/lastXp.
 * opts: { name, displayName, lastXp }
 */
function addXp(db, userId, amount, opts = {}) {
    const userKey = `users.${userId}`;
    const user = getUserData(db, userId);
    if (opts.name) user.name = opts.name;
    if (opts.displayName) user.displayName = opts.displayName;
    user.exp = (user.exp || 0) + (Number(amount) || 0);
    user.xp = user.exp; // retrocompat
    if (opts.lastXp) user.lastXp = opts.lastXp;
    db.set(userKey, user);
    return user;
}

function updateUserNames(db, userId, name, displayName) {
    const userKey = `users.${userId}`;
    const user = getUserData(db, userId);
    if (name) user.name = name;
    if (displayName) user.displayName = displayName;
    db.set(userKey, user);
    // also update light info and rpg DBs so they include id+name for listing
    const infoKey = `users.${userId}`;
    const info = infosDB.get(infoKey) || { id: userId, name: name || user.name || null, displayName: displayName || user.displayName || null, messages: 0, commands: 0, joinedAt: Date.now() };
    info.name = name || info.name;
    info.displayName = displayName || info.displayName;
    infosDB.set(infoKey, info);

    const rpgKey = `users.${userId}`;
    const rpg = rpgDB.get(rpgKey) || { id: userId, name: name || info.name || null, data: {} };
    rpg.name = name || rpg.name;
    rpgDB.set(rpgKey, rpg);
    return user;
}

function disableAfk(db, userId) {
    const userKey = `users.${userId}`;
    const user = getUserData(db, userId);
    if (user.afk && user.afk.enabled) {
        user.afk.enabled = false;
        db.set(userKey, user);
        return true;
    }
    return false;
}

export {
    Database,
    CooldownManager,
    formatTime,
    createEmbed,
    hasPermission,
    getUserData,
    incrementMessages,
    addXp,
    updateUserNames,
    setUserNamesFromMember,
    setUserNamesFromMessage,
    disableAfk
};

// Channel settings helpers
function defaultChannelSettings() {
    return {
        name: null,
        isBanned: false,
        welcome: true,
        detect: true,
        sWelcome: '',
        sBenvenuto: '',
        sBentornato: '',
        sBye: '',
        sPromote: '',
        sDemote: '',
        delete: false,
        gpt: false,
        bestemmiometro: true,
        antielimina: true,
        antilink: true,
        antiinsta: false,
        antitiktok: false,
        antilink2: false,
        antiviewonce: false,
        antitraba: true,
        antiarab: true,
        modoadmin: false,
        talk: true,
        antispam: false,
        antivoip: true,
        antiporno: true,
        expired: 0,
        messaggi: 0,
        blasphemy: 0,
        eliminati: 0
    };
}

/**
 * Ensure the channels DB contains the server entry and channel entry with defaults.
 * serverId: guild id
 * channelId: channel id
 */
function ensureChannelSettings(serverId, channelId, channelName = null) {
    channelsDB.data = channelsDB.data || {};
    channelsDB.data[serverId] = channelsDB.data[serverId] || {};
    channelsDB.data[serverId][channelId] = channelsDB.data[serverId][channelId] || defaultChannelSettings();
    const settings = channelsDB.data[serverId][channelId];
    if (channelName) settings.name = channelName;
    // Ensure numeric defaults
    if (typeof settings.expired !== 'number') settings.expired = 0;
    if (typeof settings.messaggi !== 'number') settings.messaggi = 0;
    if (typeof settings.blasphemy !== 'number') settings.blasphemy = 0;
    if (typeof settings.eliminati !== 'number') settings.eliminati = 0;
    // Normalize keys to lowercase to avoid case-mismatch (e.g., antiLink vs antilink)
    try {
        for (const k of Object.keys(settings)) {
            const lk = String(k).toLowerCase();
            if (lk !== k) {
                // Don't overwrite an existing lowercase key
                if (settings[lk] === undefined) settings[lk] = settings[k];
                // remove the original key to canonicalize storage
                delete settings[k];
            }
        }
    } catch (e) {
        // if normalization fails, proceed without blocking
        console.error('ensureChannelSettings: key normalization failed', e);
    }
    channelsDB.save();
    return settings;
}

function getChannelSettings(serverId, channelId) {
    if (!channelsDB.data) return null;
    return (channelsDB.data[serverId] || {})[channelId] || null;
}

function setChannelSetting(serverId, channelId, key, value) {
    ensureChannelSettings(serverId, channelId);
    channelsDB.data[serverId][channelId][key] = value;
    channelsDB.save();
}

function listChannelsForServer(serverId) {
    channelsDB.data = channelsDB.data || {};
    return Object.entries(channelsDB.data[serverId] || {}).map(([channelId, settings]) => ({ channelId, settings }));
}

export {
    channelsDB,
    ensureChannelSettings,
    getChannelSettings,
    setChannelSetting,
    listChannelsForServer
};

/**
 * Add a lightweight warning record to informations DB for a user.
 * entry: { reason, date, channel, moderator }
 */
function addInfoWarning(userId, entry) {
    if (!userId || !entry) return false;
    const key = `users.${userId}`;
    const info = infosDB.get(key) || { id: userId, name: null, messages: 0, commands: 0, joinedAt: Date.now(), warnings: [] };
    info.warnings = info.warnings || [];
    info.warnings.push(entry);
    infosDB.set(key, info);
    return true;
}

function removeInfoWarning(userId, criteria = {}) {
    if (!userId) return false;
    const key = `users.${userId}`;
    const info = infosDB.get(key) || { id: userId, name: null, messages: 0, commands: 0, joinedAt: Date.now(), warnings: [] };
    if (!Array.isArray(info.warnings) || info.warnings.length === 0) return false;

    // Find first index matching all provided criteria keys
    const idx = info.warnings.findIndex(w => {
        return Object.entries(criteria).every(([k, v]) => {
            if (v === undefined || v === null) return true;
            return String(w[k]) === String(v);
        });
    });

    if (idx === -1) return false;
    info.warnings.splice(idx, 1);
    infosDB.set(key, info);
    return true;
}

export { addInfoWarning, removeInfoWarning };

// Export RPG helpers
export { getRpgRecord, ensureRpgDefaults, saveRpgRecord, initializeAllRpgDefaults };

// Migration helper: scan main users and move `stats` and `rpg` into separate DBs
export function migrateUserDataToSecondaryDBs(mainDb) {
    const users = mainDb.get('users') || {};
    let moved = 0;
    for (const [uid, data] of Object.entries(users)) {
        const userKey = `users.${uid}`;
        let mutated = false;
        if (data.stats) {
            const info = infosDB.get(userKey) || { id: uid, name: data.name || null, displayName: data.displayName || null, messages: 0, commands: 0, joinedAt: Date.now() };
            info.messages = data.stats.messages || info.messages;
            info.commands = data.stats.commands || info.commands;
            info.joinedAt = data.stats.joinedAt || info.joinedAt;
            infosDB.set(userKey, info);
            delete data.stats;
            mutated = true;
        }
        if (data.rpg) {
            const rpg = rpgDB.get(userKey) || { id: uid, name: data.name || null, data: {} };
            rpg.data = Object.assign(rpg.data || {}, data.rpg);
            rpgDB.set(userKey, rpg);
            delete data.rpg;
            mutated = true;
        }
        if (mutated) {
            mainDb.set(userKey, data);
            moved++;
        }
    }
    return moved;
}