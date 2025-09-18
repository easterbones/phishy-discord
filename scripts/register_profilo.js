import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';
import config from '../config/config.js';

// Read token and optional GUILD_ID from environment
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || config.bot?.token;
const GUILD_ID = process.env.GUILD_ID || process.env.TEST_GUILD_ID || null;

if (!TOKEN) {
    console.error('DISCORD_TOKEN or config.bot.token is required');
    process.exit(1);
}

// Load the profilo plugin to get metadata
const pluginPath = path.resolve('./pluginsDS/info/profilo.js');
let plugin;
try {
    plugin = await import(`file://${pluginPath}`);
} catch (e) {
    console.error('Could not import profilo plugin:', e);
    process.exit(1);
}

const commandData = {
    name: plugin.default.name.toLowerCase(),
    description: plugin.default.description || 'Visualizza il profilo di un utente',
    options: [
        {
            name: 'user',
            description: 'Utente da visualizzare (opzionale)',
            type: 6, // USER
            required: false
        }
    ]
};

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        if (GUILD_ID) {
            console.log(`Registering command as guild command in ${GUILD_ID}...`);
            const appInfo = await rest.get(Routes.oauth2CurrentApplication());
            const res = await rest.put(Routes.applicationGuildCommands(appInfo.id, GUILD_ID), { body: [commandData] });
            console.log('Guild commands registered:', res.length);
        } else {
            console.log('Registering command globally (may take up to 1 hour to appear)...');
            const appInfo = await rest.get(Routes.oauth2CurrentApplication());
            const res = await rest.put(Routes.applicationCommands(appInfo.id), { body: [commandData] });
            console.log('Global commands registered:', res.length);
        }
        console.log('Done.');
    } catch (error) {
        console.error('Error registering command:', error);
        process.exit(1);
    }
})();
