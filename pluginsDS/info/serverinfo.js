import { createEmbed } from '../../lib/utils.js';

export default {
    name: 'serverinfo',
    description: 'Mostra informazioni dettagliate sul server',
    aliases: ['server', 'guildinfo'],
    guildOnly: true,
    execute: async (message, args, { client, config, db }) => {
        const guild = message.guild;

        // Ottieni statistiche dal database
        const serverStats = db.get(`guilds.${guild.id}`) || {};

        const embed = createEmbed({
            color: config.embedColors.info,
            title: `📊 ${guild.name}`,
            thumbnail: guild.iconURL({ dynamic: true, size: 256 }),
            fields: [
                {
                    name: '👑 Proprietario',
                    value: `<@${guild.ownerId}>`,
                    inline: true
                },
                {
                    name: '👥 Membri',
                    value: `${guild.memberCount}`,
                    inline: true
                },
                {
                    name: '📅 Creato il',
                    value: guild.createdAt.toLocaleDateString('it-IT'),
                    inline: true
                },
                {
                    name: '💬 Canali',
                    value: `${guild.channels.cache.filter(c => c.type === 0).size} testo\n${guild.channels.cache.filter(c => c.type === 2).size} vocali`,
                    inline: true
                },
                {
                    name: '🎭 Ruoli',
                    value: `${guild.roles.cache.size}`,
                    inline: true
                },
                {
                    name: '🚀 Boost',
                    value: `${guild.premiumSubscriptionCount || 0} (${guild.premiumTier ? `Livello ${guild.premiumTier}` : 'Nessuno'})`,
                    inline: true
                },
                {
                    name: '🆔 ID Server',
                    value: `\`${guild.id}\``,
                    inline: false
                }
            ],
            botAvatar: client.user.displayAvatarURL()
        });

        message.reply({ embeds: [embed] });
    }
};
