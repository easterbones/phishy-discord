import { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

// Register runtime event handlers (message, interaction, guild events, errors)
export default async function registerHandlers({ client, db, config, cooldowns, createEmbed, addXp, updateUserNames, disableAfk, incrementMessages, printDiscord, printBotEvent, printCommandExecution, printSystemLog, printDuplicateLog }) {
    // Helper: log dedupe events in a consistent way
    function logDedupe(type, id, details = '') {
        try {
            printDuplicateLog(type, id, details);
        } catch (_) {
            printDuplicateLog(type, id, details);
        }
    }

    // Anti-duplicazione: traccia messaggi già processati (ID) e pulizia periodica
    const processedMessages = new Map(); // messageId -> timestamp
    const MESSAGE_TTL = 30 * 1000; // 30s
    setInterval(() => {
        const now = Date.now();
        for (const [id, ts] of processedMessages.entries()) {
            if (now - ts > MESSAGE_TTL) processedMessages.delete(id);
        }
    }, 10 * 1000).unref?.();

    // Anti-duplicazione interazioni
    const processedInteractions = new Set();

    // MessageCreate handler
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return;

        // Execute plugin messageCreate hooks (if any)
        try {
            if (client.pluginHandlers && Array.isArray(client.pluginHandlers.messageCreate) && client.pluginHandlers.messageCreate.length) {
                for (const handler of client.pluginHandlers.messageCreate) {
                    Promise.resolve().then(() => handler(message)).catch(e => printSystemLog('error', 'Plugin messageCreate handler error', { error: e.message }));
                }
            }
        } catch (e) {
            printSystemLog('error', 'Error running plugin message handlers', { error: e.message });
        }

        try {
            if (processedMessages.has(message.id)) {
                logDedupe('message', message.id, `${message.author?.tag || ''}: ${String(message.content || '').slice(0, 80)}`);
                return;
            }
            processedMessages.set(message.id, Date.now());
        } catch (_) {}

        try {
            incrementMessages(db, message.author.id);
        } catch (e) {
            printSystemLog('warning', 'Impossibile aggiornare le statistiche utente', { error: e?.message || e });
        }

        // Livellamento e XP
        // Levelling/XP moved to pluginsDS/rpg/levelling.js (onMessageCreate hook)

        // AFK removal
        try {
            const afk = db.get(`users.${message.author.id}.afk`);
            if (afk && afk.enabled) {
                const disabled = disableAfk(db, message.author.id);
                if (disabled) {
                    const embed = createEmbed({
                        color: config.embedColors.success,
                        title: '🙌 Bentornato! Modalità AFK disattivata',
                        description: afk.reason ? `Motivo precedente: ${afk.reason}` : undefined,
                        botAvatar: client.user.displayAvatarURL()
                    });
                    message.reply({ embeds: [embed] }).catch(() => {});
                }
            }
        } catch (_) {}

        // Menzioni AFK
        try {
            if (message.mentions && message.mentions.users && message.mentions.users.size > 0) {
                const notes = [];
                message.mentions.users.forEach(u => {
                    const afk = db.get(`users.${u.id}.afk`);
                    if (afk && afk.enabled) {
                        const since = afk.since ? new Date(afk.since).toLocaleString('it-IT') : 'sconosciuto';
                        notes.push(`• <@${u.id}> è AFK${afk.reason ? `: ${afk.reason}` : ''} (dal ${since})`);
                    }
                });
                if (notes.length) {
                    const embed = createEmbed({
                        color: config.embedColors.warning,
                        title: '📴 Utente in AFK',
                        description: notes.join('\n'),
                        botAvatar: client.user.displayAvatarURL()
                    });
                    message.reply({ embeds: [embed] }).catch(() => {});
                }
            }
        } catch (_) {}

        // Log dei messaggi
        printDiscord(message, client, 'message');

        // Comandi (delegati a plugin system già caricato in client.commands)
        const usedPrefix = config.prefixes.find(prefix => message.content.startsWith(prefix));
        if (!usedPrefix) {
            try {
                const guildId = message.guild?.id;
                if (guildId) {
                    const triggers = db.get(`guilds.${guildId}.autoresponses`) || [];
                    if (Array.isArray(triggers) && triggers.length) {
                        const content = message.content.toLowerCase();
                        const hit = triggers.find(t => {
                            if (!t || !t.trigger) return false;
                            const mode = (t.mode || 'equals').toLowerCase();
                            const trig = String(t.trigger).toLowerCase();
                            if (mode === 'starts') return content.startsWith(trig);
                            if (mode === 'includes') return content.includes(trig);
                            return content === trig;
                        });
                        if (hit) {
                            const resp = hit.response || hit.reply || '';
                            if (resp) await message.reply({ content: resp }).catch(() => {});
                        }
                    }
                }
            } catch (_) {}
            return;
        }

        const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '❌ Comando non trovato',
                description: `Il comando \`${usedPrefix}${commandName}\` non esiste.\nUsa \`${usedPrefix}help\` per vedere tutti i comandi disponibili.`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        if (command.cooldown && cooldowns.has(message.author.id, command.name)) {
            const remainingTime = cooldowns.getRemainingTime(message.author.id, command.name);
            const embed = createEmbed({
                color: config.embedColors.warning,
                title: '⏰ Cooldown attivo',
                description: `Devi aspettare ancora **${Math.ceil(remainingTime / 1000)} secondi** prima di usare questo comando.`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        if (command.permissions && !message.member.permissions.has(command.permissions)) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '🚫 Permessi insufficienti',
                description: `Non hai i permessi necessari per usare questo comando.`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        if (command.guildOnly && !message.guild) {
            const embed = createEmbed({
                color: config.embedColors.error,
                title: '🏠 Comando solo server',
                description: `Questo comando può essere usato solo in un server.`,
                botAvatar: client.user.displayAvatarURL()
            });
            return message.reply({ embeds: [embed] });
        }

        try {
            await command.execute(message, args, { client, db, config, cooldowns });
            printCommandExecution(command, message, true);
            if (command.cooldown) cooldowns.set(message.author.id, command.name, command.cooldown);
            db.add('stats.totalCommands', 1);
            db.add(`users.${message.author.id}.stats.commands`, 1);
        } catch (error) {
            printCommandExecution(command, message, false, error);
            printSystemLog('error', `Errore esecuzione comando ${command.name}`, { error: error.message });
            const embed = createEmbed({ color: config.embedColors.error, title: '💥 Errore interno', description: `Si è verificato un errore durante l'esecuzione del comando.`, botAvatar: client.user.displayAvatarURL() });
            if (message.replied || message.deferred) {
                await message.followUp({ embeds: [embed], flags: 64 });
            } else {
                await message.reply({ embeds: [embed] });
            }
        }
    });

    // InteractionCreate handler
    client.on(Events.InteractionCreate, async (interaction) => {
        try {
            if (processedInteractions.has(interaction.id)) {
                logDedupe('interaction', interaction.id, interaction.customId || interaction.commandName || '');
                return;
            }
            processedInteractions.add(interaction.id);
            setTimeout(() => processedInteractions.delete(interaction.id), 30 * 1000).unref?.();
        } catch (_) {}

        printBotEvent('interaction_create', {
            'Tipo': interaction.type,
            'ID': interaction.id,
            'Utente': interaction.user?.tag,
            'Custom ID': interaction.customId || 'N/A',
            'Tipo Componente': interaction.componentType || 'N/A',
            'Comando Slash': interaction.commandName || 'N/A'
        }, client);

        // Slash command handling
        if (interaction.isCommand && interaction.isCommand()) {
            const commandName = interaction.commandName;
            const command = client.commands.get(commandName);
            if (!command) {
                printSystemLog('error', `Comando slash non trovato: ${commandName}`);
                return interaction.reply({ content: '❌ Comando non disponibile al momento.', ephemeral: true });
            }

            try {
                const args = [];
                if (interaction.options) {
                    interaction.options.data.forEach(option => { if (option.value) args.push(option.value.toString()); });
                }
                try {
                    if (!interaction.replied && !interaction.deferred && typeof interaction.deferReply === 'function') {
                        await interaction.deferReply({ ephemeral: false }).catch(() => {});
                        interaction.deferred = true;
                    }
                } catch (_) {}

                const nowTs = Date.now();
                const mockMessage = {
                    id: `${interaction.id || 'interaction'}-${nowTs}`,
                    createdTimestamp: nowTs,
                    createdAt: new Date(nowTs),
                    author: interaction.user,
                    guild: interaction.guild,
                    channel: interaction.channel,
                    member: interaction.member,
                    content: '',
                    replied: false,
                    deferred: false,
                    reacted: false,
                    reply: async (content) => {
                        const payload = (typeof content === 'string') ? { content } : content;
                        const buildSentProxy = () => {
                            const sentTime = Date.now();
                            return { id: `${interaction.id || 'reply'}-${sentTime}`, createdTimestamp: sentTime, createdAt: new Date(sentTime), edit: async (editPayload) => { try { if (interaction.editReply) return await interaction.editReply(editPayload); } catch (_) {} try { return await interaction.followUp?.(editPayload); } catch (_) {} return null; } };
                        };

                        try {
                            if (interaction.deferred && !interaction.replied && typeof interaction.editReply === 'function') {
                                interaction.replied = true; mockMessage.replied = true; await interaction.editReply(payload).catch(async (err) => { try { await interaction.followUp(payload).catch(() => {}); } catch (_) {} }); return buildSentProxy();
                            }
                            if (!interaction.replied && !interaction.deferred) {
                                interaction.replied = true; mockMessage.replied = true; await interaction.reply(payload).catch(async (err) => { const already = err && (err.code === 50035 || err.message?.includes('already been sent') || err.name === 'InteractionAlreadyReplied'); if (already) { try { interaction.replied = true; mockMessage.replied = true; await interaction.followUp(payload).catch(() => {}); } catch (_) {} } else throw err; }); return buildSentProxy();
                            } else {
                                interaction.replied = true; mockMessage.replied = true; await interaction.followUp(payload).catch(() => {}); return buildSentProxy();
                            }
                        } catch (err) {
                            try { interaction.replied = true; mockMessage.replied = true; await interaction.followUp(payload).catch(() => {}); return buildSentProxy(); } catch (_) { return null; }
                        }
                    },
                    followUp: interaction.followUp ? interaction.followUp.bind(interaction) : async () => null,
                    edit: interaction.editReply ? interaction.editReply.bind(interaction) : async () => null,
                    delete: async () => {},
                    deferReply: async (...args) => { try { interaction.deferred = true; mockMessage.deferred = true; const res = await interaction.deferReply(...args); interaction.deferred = true; mockMessage.deferred = true; return res; } catch (e) { return null; } }
                };

                await command.execute(mockMessage, args, { client, db, config, cooldowns });
                printCommandExecution(command, mockMessage, true);
                if (command.cooldown) cooldowns.set(interaction.user.id, command.name, command.cooldown);
                db.add('stats.totalCommands', 1);
                db.add(`users.${interaction.user.id}.stats.commands`, 1);
            } catch (error) {
                printCommandExecution(command, { author: interaction.user }, false, error);
                printSystemLog('error', `Errore esecuzione comando slash ${command.name}`, { error: error.message });
                const embed = createEmbed({ color: config.embedColors.error, title: '💥 Errore interno', description: `Si è verificato un errore durante l'esecuzione del comando.` });
                if (interaction.replied || interaction.deferred) { await interaction.followUp({ embeds: [embed], flags: 64 }); } else { await interaction.reply({ embeds: [embed], flags: 64 }); }
            }
            return;
        }

        // Allow plugins to handle interactions (buttons/selects/etc.)
        try {
            if (client.pluginHandlers && Array.isArray(client.pluginHandlers.interactionCreate) && client.pluginHandlers.interactionCreate.length) {
                for (const handler of client.pluginHandlers.interactionCreate) {
                    Promise.resolve().then(() => handler(interaction)).catch(e => printSystemLog('error', 'Plugin interactionCreate handler error', { error: e.message }));
                }
            }
        } catch (e) {
            printSystemLog('error', 'Error running plugin interaction handlers', { error: e.message });
        }

        if (!interaction.isButton || !interaction.isButton()) return;

        // If no plugin handled the button specifically, fallback behavior can be added here in future.
    });

    // Guild/member/other event handlers
    client.on(Events.GuildMemberAdd, (member) => {
        printBotEvent('guild_member_add', {
            'Utente': member.user.tag,
            'ID Utente': member.user.id,
            'Server': member.guild.name,
            'ID Server': member.guild.id,
            'Account Creato': member.user.createdAt.toLocaleDateString('it-IT'),
            'Membri Totali': member.guild.memberCount
        }, client);
    });

    client.on(Events.MessageDelete, (message) => {
        const _deletedSeen = global.__deletedSeen || (global.__deletedSeen = new Map());
        try {
            const key = message.id || `${message.channel?.id || 'channel'}:${Date.now()}`;
            if (_deletedSeen.has(key)) { logDedupe('message_delete', key, `${message.author?.tag || 'unknown'}`); return; }
            _deletedSeen.set(key, Date.now());
            setTimeout(() => _deletedSeen.delete(key), 30000).unref?.();
        } catch (_) {}
        if (message.author?.bot) return;
        printBotEvent('message_delete', {
            'Autore': message.author?.tag || 'Sconosciuto',
            'ID Autore': message.author?.id || 'N/A',
            'Canale': message.channel.name,
            'ID Canale': message.channel.id,
            'Server': message.guild?.name || 'DM',
            'Contenuto': message.content?.substring(0, 100) || 'Nessun contenuto',
            'ID Messaggio': message.id
        }, client);
    });

    client.on(Events.GuildCreate, (guild) => {
        printBotEvent('guild_join', {
            'Server': guild.name,
            'ID Server': guild.id,
            'Proprietario': guild.ownerId,
            'Membri': guild.memberCount,
            'Canali': guild.channels.cache.size,
            'Ruoli': guild.roles.cache.size
        }, client);
    });

    client.on(Events.GuildDelete, (guild) => {
        printBotEvent('guild_leave', { 'Server': guild.name, 'ID Server': guild.id, 'Membri': guild.memberCount }, client);
    });

    client.on(Events.GuildMemberRemove, (member) => {
        printBotEvent('guild_member_remove', {
            'Utente': member.user.tag,
            'ID Utente': member.user.id,
            'Server': member.guild.name,
            'ID Server': member.guild.id,
            'Ruoli': member.roles.cache.map(r => r.name).join(', ') || 'Nessuno'
        }, client);
    });

    client.on(Events.Error, (error) => {
        printBotEvent('discord_error', { 'Tipo': 'Error', 'Messaggio': error.message, 'Stack': error.stack?.substring(0, 200) + '...' }, client);
    });

    client.on(Events.Warn, (warning) => {
        printBotEvent('discord_warning', { 'Tipo': 'Warning', 'Messaggio': warning }, client);
    });

    process.on('unhandledRejection', (error) => {
        printBotEvent('unhandled_rejection', { 'Tipo': 'Unhandled Rejection', 'Messaggio': error.message, 'Stack': error.stack?.substring(0, 300) + '...' }, client);
    });

    process.on('uncaughtException', (error) => {
        printBotEvent('uncaught_exception', { 'Tipo': 'Uncaught Exception', 'Messaggio': error.message, 'Stack': error.stack?.substring(0, 300) + '...' }, client);
        process.exit(1);
    });
}
