import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'help',
    description: 'Mostra tutti i comandi disponibili',
    aliases: ['commands', 'aiuto'],
    execute: async (message, args, { client, config }) => {
        const commands = client.commands;

        // Raggruppa comandi per categoria
        const categories = {};
        commands.forEach(cmd => {
            const category = cmd.category || 'Altro';
            if (!categories[category]) categories[category] = [];
            categories[category].push(cmd);
        });

        // Crea embed principale
        const embed = createEmbed({
            color: config.embedColors.info,
            title: '📋 Comandi Disponibili',
            description: `Usa \`${config.prefix}<comando>\` per eseguire un comando.\n**Totale comandi:** ${commands.size}`,
            botAvatar: client.user.displayAvatarURL()
        });

        // Aggiungi campi per ogni categoria
        Object.keys(categories).forEach(category => {
            const cmds = categories[category];
            const cmdList = cmds.map(cmd => `\`${config.prefix}${cmd.name}\``).join(', ');

            embed.fields.push({
                name: `📁 ${category} (${cmds.length})`,
                value: cmdList || 'Nessun comando',
                inline: false
            });
        });

        // Aggiungi info utili
        embed.fields.push({
            name: 'ℹ️ Info',
            value: `**Prefisso:** \`${config.prefix}\`\n**Versione:** ${config.bot.version}\n**Sviluppatore:** ${config.bot.author}`,
            inline: false
        });

        message.reply({ embeds: [embed] });
    }
};
