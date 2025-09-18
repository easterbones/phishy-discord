import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import config from '../../config/config.js';

// Helper: build command lists
function getCommandsByCategory(commands, categoryName) {
    const categoryCommands = commands.filter(cmd => cmd.category === categoryName);
    if (categoryCommands.size === 0) return null;
    return categoryCommands.map(cmd => `\`${config.prefixes[0]}${cmd.name}\` - ${cmd.description}`).join('\n');
}

function getAllCommands(commands) {
    const categories = {};
    commands.forEach(cmd => {
        const category = cmd.category || 'Altro';
        if (!categories[category]) categories[category] = [];
        categories[category].push(cmd);
    });

    let result = '';
    Object.keys(categories).forEach(category => {
        result += `**${category}:**\n`;
        result += categories[category].map(cmd => `\`${config.prefixes[0]}${cmd.name}\``).join(', ') + '\n\n';
    });

    return result;
}

async function showBotStats(interactionOrClient, client) {
    // interactionOrClient may be an interaction or ignored
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    const seconds = Math.floor(uptime % 60);

    const embed = {
        color: 0x00ff00,
        title: '📊 Statistiche del Bot',
        fields: [
            {
                name: '🤖 Bot Info',
                value: `**Nome:** ${client.user.username}\n**ID:** ${client.user.id}\n**Creato:** ${client.user.createdAt.toLocaleDateString('it-IT')}`,
                inline: true
            },
            {
                name: '📈 Statistiche',
                value: `**Server:** ${client.guilds.cache.size}\n**Utenti:** ${client.users.cache.size}\n**Ping:** ${client.ws.ping}ms`,
                inline: true
            },
            {
                name: '⏰ Uptime',
                value: `${days}g ${hours}h ${minutes}m ${seconds}s`,
                inline: true
            }
        ],
        footer: { text: 'PhiShy Discord Bot', icon_url: client.user.displayAvatarURL() },
        timestamp: new Date()
    };

    const backButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('menu_back').setLabel('🔙 Torna al Menu').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
        );

    // interactionOrClient might be an interaction (preferred) or a message-like
    try {
        if (interactionOrClient && typeof interactionOrClient.update === 'function') {
            await interactionOrClient.update({ embeds: [embed], components: [backButton] });
        } else if (interactionOrClient && typeof interactionOrClient.reply === 'function') {
            await interactionOrClient.reply({ embeds: [embed], components: [backButton] }).catch(() => {});
        } else {
            // fallback: send to the client's first channel (rare)
        }
    } catch (_) {}
}

async function handleAlbumInteraction(interaction, customId, db) {
    const [prefix, guildId, rawName, rawIndex] = customId.split(':');
    if (prefix === 'album_close') {
        try { await interaction.update({ components: [] }); } catch (_) {}
        return;
    }

    const safeName = (rawName || '').toLowerCase();
    const idx = Math.max(0, parseInt(rawIndex || '0', 10) || 0);
    const albums = db.get(`guilds.${guildId}.albums`) || {};
    const album = albums[safeName];
    if (!album || !Array.isArray(album) || album.length === 0) {
        await interaction.reply({ content: '📭 Album vuoto o inesistente', flags: 64 }).catch(() => {});
        return;
    }

    let newIndex = idx;
    if (prefix === 'album_prev') newIndex = (idx - 1 + album.length) % album.length;
    if (prefix === 'album_next') newIndex = (idx + 1) % album.length;

    const imageUrl = album[newIndex];

    const embed = new EmbedBuilder()
        .setColor(config.embedColors.default)
        .setTitle(`🖼️ Album: ${rawName} (${newIndex + 1}/${album.length})`)
        .setImage(imageUrl)
        .setFooter({ text: 'PhiShy Discord Bot', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`album_prev:${guildId}:${safeName}:${newIndex}`).setLabel('⬅️ Indietro').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`album_close:${guildId}:${safeName}:${newIndex}`).setLabel('⏹️ Chiudi').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`album_next:${guildId}:${safeName}:${newIndex}`).setLabel('Avanti ➡️').setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [controls] });
}

async function handleMenuInteraction(interaction, customId, client) {
    const category = customId.replace('menu_', '');
    const commands = interaction.client.commands;

    let title, description, color, commandsList;

    switch (category) {
        case 'fun':
            title = '🎉 Comandi Divertimento';
            description = 'Comandi per divertirti e passare il tempo!';
            color = 0xffd700;
            commandsList = getCommandsByCategory(commands, 'Fun');
            break;
        case 'game':
            title = '🎮 Comandi Gioco';
            description = 'Giochi e sfide per tutti!';
            color = 0x00ff00;
            commandsList = getCommandsByCategory(commands, 'Game');
            break;
        case 'tools':
            title = '🛠️ Comandi Utility';
            description = 'Strumenti utili per la gestione quotidiana';
            color = 0x0099ff;
            commandsList = getCommandsByCategory(commands, 'Tools');
            break;
        case 'info':
            title = 'ℹ️ Comandi Informativi';
            description = 'Ottieni informazioni su server, utenti e altro';
            color = 0x00ffff;
            commandsList = getCommandsByCategory(commands, 'Info');
            break;
        case 'admin':
            title = '🛡️ Comandi Admin';
            description = 'Strumenti di moderazione (solo per amministratori)';
            color = 0xff0000;
            commandsList = getCommandsByCategory(commands, 'Admin');
            break;
        case 'rpg':
            title = '🎲 Sistema RPG';
            description = 'Comandi per il sistema di ruolo e progressione';
            color = 0xffa500;
            commandsList = getCommandsByCategory(commands, 'RPG');
            break;
        case 'animali':
            title = '🐾 Animali Virtuali';
            description = 'Gestisci i tuoi animali virtuali';
            color = 0xff69b4;
            commandsList = getCommandsByCategory(commands, 'Animali');
            break;
        case 'risposta':
            title = '💬 Risposte Automatiche';
            description = 'Sistema di risposte intelligenti';
            color = 0xdda0dd;
            commandsList = getCommandsByCategory(commands, 'Risposta');
            break;
        case 'all':
            title = '📜 Tutti i Comandi';
            description = 'Lista completa di tutti i comandi disponibili';
            color = 0x808080;
            commandsList = getAllCommands(commands);
            break;
        case 'stats':
            await showBotStats(interaction, client);
            return;
        default:
            return;
    }

    const embed = {
        color: color,
        title: title,
        description: description,
        fields: [{ name: '📋 Comandi Disponibili', value: commandsList || 'Nessun comando in questa categoria', inline: false }],
        footer: { text: 'PhiShy Discord Bot • Usa !help per più dettagli', icon_url: interaction.client.user.displayAvatarURL() },
        timestamp: new Date()
    };

    const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_back').setLabel('🔙 Torna al Menu').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
    );

    await interaction.update({ embeds: [embed], components: [backButton] });
}

async function showMainMenuInteraction(interaction, client) {
    const commands = client.commands;

    const menuEmbed = new EmbedBuilder()
        .setColor(config.embedColors.default)
        .setTitle('📚 𝐌𝐞𝐧𝐮 𝐝𝐞𝐢 𝐜𝐨𝐦𝐚𝐧𝐝𝐢')
        .setDescription(`\n**ꜱᴄᴇɢʟɪ ʟᴀ ᴄᴀᴛᴇɢᴏʀɪᴀ ꜱᴏᴛᴛᴏꜱᴛᴀɴᴛᴇ:**\n\n══════ •⊰✧⊱• ══════\n> MADE BY🏅 𓊈ҽαʂƚҽɾ𓊉𓆇𓃹 update ${new Date().toLocaleDateString('it-IT')} 📅\n\n**ꜱᴛᴀᴛɪꜱᴛɪᴄʜᴇ ʙᴏᴛ:**\n• 🤖 **Server serviti:** ${client.guilds.cache.size}\n• 👥 **Utenti totali:** ${client.users.cache.size}\n• 📦 **Comandi caricati:** ${commands.size}\n• ⚡ **Ping:** ${client.ws.ping}ms`).trim()
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setImage('https://i.ibb.co/7d1hbwyQ/allalaallaal.png')
        .setFooter({ text: `PhiShy Discord Bot • ${config.bot.author}`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_fun').setLabel('🎉 Fun').setStyle(ButtonStyle.Primary).setEmoji('🎉'),
        new ButtonBuilder().setCustomId('menu_game').setLabel('🎮 Game').setStyle(ButtonStyle.Primary).setEmoji('🎮'),
        new ButtonBuilder().setCustomId('menu_tools').setLabel('🛠️ Tools').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
        new ButtonBuilder().setCustomId('menu_info').setLabel('ℹ️ Info').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️'),
        new ButtonBuilder().setCustomId('menu_admin').setLabel('🛡️ Admin').setStyle(ButtonStyle.Danger).setEmoji('🛡️')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_rpg').setLabel('🎲 RPG').setStyle(ButtonStyle.Success).setEmoji('🎲'),
        new ButtonBuilder().setCustomId('menu_animali').setLabel('🐾 Animali').setStyle(ButtonStyle.Success).setEmoji('🐾'),
        new ButtonBuilder().setCustomId('menu_risposta').setLabel('💬 Risposte').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
        new ButtonBuilder().setCustomId('menu_all').setLabel('📜 Tutti').setStyle(ButtonStyle.Primary).setEmoji('📜'),
        new ButtonBuilder().setCustomId('menu_stats').setLabel('📊 Stats').setStyle(ButtonStyle.Secondary).setEmoji('📊')
    );

    await interaction.update({ embeds: [menuEmbed], components: [row1, row2] });
}

export default {
    name: 'menu',
    description: 'Mostra il menu interattivo del bot',
    slash: { name: 'menu', description: 'Mostra il menu del bot' },
    execute: async (message, args, { client, db }) => {
        // Reuse the interaction-style menu for messages (reply)
        try {
            // Emulate an interaction by sending the same embed + components
            const menuEmbed = new EmbedBuilder()
                .setColor(config.embedColors.default)
                .setTitle('📚 𝐌𝐞𝐧𝐮 𝐝𝐞𝐢 𝐜𝐨𝐦𝐚𝐧𝐝𝐢')
                .setDescription(`\n**ꜱᴄᴇɢʟɪ ʟᴀ ᴄᴀᴛᴇɢᴏʀɪᴀ ꜱᴏᴛᴛᴏꜱᴛᴀɴᴛᴇ:**\n\n══════ •⊰✧⊱• ══════\n> MADE BY🏅 𓊈ҽαʂƚҽɾ𓊉𓆇𓃹 update ${new Date().toLocaleDateString('it-IT')} 📅\n\n**ꜱᴛᴀᴛɪꜱᴛɪᴄʜᴇ ʙᴏᴛ:**\n• 🤖 **Server serviti:** ${client.guilds.cache.size}\n• 👥 **Utenti totali:** ${client.users.cache.size}\n• 📦 **Comandi caricati:** ${client.commands.size}\n• ⚡ **Ping:** ${client.ws.ping}ms`).trim()
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setImage('https://i.ibb.co/7d1hbwyQ/allalaallaal.png')
                .setFooter({ text: `PhiShy Discord Bot • ${config.bot.author}`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('menu_fun').setLabel('🎉 Fun').setStyle(ButtonStyle.Primary).setEmoji('🎉'),
                new ButtonBuilder().setCustomId('menu_game').setLabel('🎮 Game').setStyle(ButtonStyle.Primary).setEmoji('🎮'),
                new ButtonBuilder().setCustomId('menu_tools').setLabel('🛠️ Tools').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('menu_info').setLabel('ℹ️ Info').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️'),
                new ButtonBuilder().setCustomId('menu_admin').setLabel('🛡️ Admin').setStyle(ButtonStyle.Danger).setEmoji('🛡️')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('menu_rpg').setLabel('🎲 RPG').setStyle(ButtonStyle.Success).setEmoji('🎲'),
                new ButtonBuilder().setCustomId('menu_animali').setLabel('🐾 Animali').setStyle(ButtonStyle.Success).setEmoji('🐾'),
                new ButtonBuilder().setCustomId('menu_risposta').setLabel('💬 Risposte').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
                new ButtonBuilder().setCustomId('menu_all').setLabel('📜 Tutti').setStyle(ButtonStyle.Primary).setEmoji('📜'),
                new ButtonBuilder().setCustomId('menu_stats').setLabel('📊 Stats').setStyle(ButtonStyle.Secondary).setEmoji('📊')
            );

            await message.reply({ embeds: [menuEmbed], components: [row1, row2] });
        } catch (e) { console.error('menu plugin execute error', e); }
    },
    // Lifecycle hook for interactions (buttons)
    onInteractionCreate: async (interaction, { client, db }) => {
        try {
            if (!interaction.isButton()) return;
            const { customId } = interaction;
            if (customId.startsWith('menu_')) {
                if (customId === 'menu_back') {
                    await showMainMenuInteraction(interaction, client);
                } else {
                    await handleMenuInteraction(interaction, customId, client);
                }
                return;
            }

            if (customId.startsWith('album_')) {
                try { await handleAlbumInteraction(interaction, customId, db); } catch (e) { console.error('Errore gestione album (plugin):', e); }
                return;
            }
        } catch (e) { console.error('menu plugin interaction error', e); }
    }
};
