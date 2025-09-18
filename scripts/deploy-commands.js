import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';
import config from '../config/config.js';

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || config.bot?.token;
const GUILD_ID = process.env.GUILD_ID || null;

if (!TOKEN) {
    console.error('DISCORD_TOKEN environment variable or config.bot.token is required.');
    process.exit(1);
}

// Scan pluginsDS for commands that expose a `data` (SlashCommandBuilder)
const pluginsPath = path.resolve('./pluginsDS');
const commands = [];

async function collectCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await collectCommands(full);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            try {
                const mod = await import(`file://${full}`);
                const plugin = mod.default;
                if (plugin && plugin.data) {
                    // plugin.data is a SlashCommandBuilder
                    commands.push(plugin.data.toJSON());
                    console.log('Collected slash command:', plugin.name);
                }
            } catch (e) {
                console.warn('Skipping file on error:', full, e?.message || e);
            }
        }
    }
}

(async () => {
    await collectCommands(pluginsPath);

    if (commands.length === 0) {
        console.log('No slash commands found to register.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        if (GUILD_ID) {
            console.log(`Registering ${commands.length} commands to guild ${GUILD_ID}...`);
            const appInfo = await rest.get(Routes.oauth2CurrentApplication());
            const res = await rest.put(Routes.applicationGuildCommands(appInfo.id, GUILD_ID), { body: commands });
            console.log('Guild commands registered:', res.length);
        } else {
            console.log(`Registering ${commands.length} global commands (may take up to 1 hour)...`);
            const appInfo = await rest.get(Routes.oauth2CurrentApplication());
            const res = await rest.put(Routes.applicationCommands(appInfo.id), { body: commands });
            console.log('Global commands registered:', res.length);
        }
    } catch (error) {
        console.error('Error registering commands:', error);
        process.exit(1);
    }
})();
