import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'menu',
    description: 'Mostra il menu principale dei comandi con categorie interattive',
    aliases: ['comandi', 'aiuto', 'commands'],
    category: 'Tools',
    execute: async (message, args, { client, config }) => {
        const commands = client.commands;

        // Raggruppa comandi per categoria
        const categories = {};
        commands.forEach(cmd => {
            const category = cmd.category || 'Altro';
            if (!categories[category]) categories[category] = [];
            categories[category].push(cmd);
        });

        // Crea embed principale del menu
        const menuEmbed = new EmbedBuilder()
            .setColor(config.embedColors.default)
            .setTitle('📚 𝐌𝐞𝐧𝐮 𝐝𝐞𝐢 𝐜𝐨𝐦𝐚𝐧𝐝𝐢')
            .setDescription(`
**ꜱᴄᴇɢʟɪ ʟᴀ ᴄᴀᴛᴇɢᴏʀɪᴀ ꜱᴏᴛᴛᴏꜱᴛᴀɴᴛᴇ:**

══════ •⊰✧⊱• ══════
> MADE BY🏅 𓊈ҽαʂƚҽɾ𓊉𓆇𓃹 update ${new Date().toLocaleDateString('it-IT')} 📅

**ꜱᴛᴀᴛɪꜱᴛɪᴄʜᴇ ʙᴏᴛ:**
• 🤖 **Server serviti:** ${client.guilds.cache.size}
• 👥 **Utenti totali:** ${client.users.cache.size}
• 📦 **Comandi caricati:** ${commands.size}
• ⚡ **Ping:** ${client.ws.ping}ms
            `.trim())
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .setImage('https://i.ibb.co/7d1hbwyQ/allalaallaal.png') // Immagine di sfondo come nel WhatsApp
            .setFooter({
                text: `PhiShy Discord Bot • ${config.bot.author}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Crea i bottoni per le categorie
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('menu_fun')
                    .setLabel('🎉 Fun')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎉'),
                new ButtonBuilder()
                    .setCustomId('menu_game')
                    .setLabel('🎮 Game')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎮'),
                new ButtonBuilder()
                    .setCustomId('menu_tools')
                    .setLabel('🛠️ Tools')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛠️'),
                new ButtonBuilder()
                    .setCustomId('menu_info')
                    .setLabel('ℹ️ Info')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️'),
                new ButtonBuilder()
                    .setCustomId('menu_admin')
                    .setLabel('🛡️ Admin')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛡️')
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('menu_rpg')
                    .setLabel('🎲 RPG')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎲'),
                new ButtonBuilder()
                    .setCustomId('menu_animali')
                    .setLabel('🐾 Animali')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🐾'),
                new ButtonBuilder()
                    .setCustomId('menu_risposta')
                    .setLabel('💬 Risposte')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💬'),
                new ButtonBuilder()
                    .setCustomId('menu_all')
                    .setLabel('📜 Tutti')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📜'),
                new ButtonBuilder()
                    .setCustomId('menu_stats')
                    .setLabel('📊 Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await message.reply({
            embeds: [menuEmbed],
            components: [row1, row2]
        });
    }
};
