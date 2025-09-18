import 'dotenv/config';
import 'source-map-support/register.js';
import { Client, GatewayIntentBits, Events, Collection, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } from 'discord.js';
import { existsSync, readFileSync, watch,} from 'fs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as stackTrace from 'stack-trace';

// Importa configurazioni e utility
import config from './config/config.js';
import { Database, CooldownManager, createEmbed, getUserData, incrementMessages, addXp, updateUserNames, disableAfk, ensureChannelSettings } from './lib/utils.js';
import printDiscord, { printBotEvent, printCommandExecution, printSystemLog, printPluginLog, printSlashLog, printDuplicateLog } from './lib/print.js';
import registerHandlers from './handler.js';
import { autoFixFile, analyzeCode } from './lib/auto-fix.js';

// Helper: log dedupe events in a consistent way
function logDedupe(type, id, details = '') {
    try {
        printDuplicateLog(type, id, details);
    } catch (_) {
        printDuplicateLog(type, id, details);
    }
}

// Helper: track auto-fix attempts to prevent infinite loops
const autoFixAttempts = new Map();

// Helper: analyze plugin errors in detail
async function analyzePluginError(error, pluginPath, pluginFile) {
    const details = {
        file: pluginFile,
        path: pluginPath,
        type: error.name || 'UnknownError',
        message: error.message || 'No error message'
    };

    // Extract line number and column from stack trace
    if (error.stack) {
        const trace = stackTrace.parse(error);
        if (trace && trace.length > 0) {
            // Find the first stack frame that references our plugin file
            const pluginFrame = trace.find(frame => 
                frame.getFileName() && frame.getFileName().includes(pluginFile)
            );
            
            if (pluginFrame) {
                details.line = pluginFrame.getLineNumber();
                details.column = pluginFrame.getColumnNumber();
                details.function = pluginFrame.getFunctionName() || 'anonymous';
            } else if (trace[0]) {
                // Fallback to first frame
                details.line = trace[0].getLineNumber();
                details.column = trace[0].getColumnNumber();
                details.function = trace[0].getFunctionName() || 'anonymous';
            }
        }
        
        // Also try to extract line info from error message patterns
        const lineMatch = error.stack.match(/at.*?:(\d+):(\d+)/);
        if (lineMatch && !details.line) {
            details.line = parseInt(lineMatch[1]);
            details.column = parseInt(lineMatch[2]);
        }
    }

    // TENTATIVO AUTO-FIX per errori di sintassi (con protezione anti-loop)
    if (error.name === 'SyntaxError' || error.message.includes('missing') || error.message.includes('expected')) {
        const attemptKey = pluginPath;
        const currentAttempts = autoFixAttempts.get(attemptKey) || 0;
        
        // Limita i tentativi di auto-fix per evitare loop infiniti
        if (currentAttempts < 2) {
            try {
                autoFixAttempts.set(attemptKey, currentAttempts + 1);
                printSystemLog('info', `🔧 Tentativo auto-correzione #${currentAttempts + 1} per: ${pluginFile}`);
                
                const autoFixResult = await autoFixFile(pluginPath);
                
                if (autoFixResult.success) {
                    details.autoFixed = true;
                    details.fixesApplied = autoFixResult.fixesApplied;
                details.backupPath = autoFixResult.backupPath;
                
                printSystemLog('success', `✅ Auto-correzione riuscita per: ${pluginFile}`, {
                    'Correzioni Applicate': autoFixResult.fixesApplied.length,
                    'Backup Creato': autoFixResult.backupPath.split('\\').pop(),
                    'Errori Risolti': autoFixResult.fixesApplied.map(f => f.type).join(', ')
                });
                
                return details; // Restituisci i dettagli con info auto-fix
            } else {
                details.autoFixFailed = true;
                details.autoFixReason = autoFixResult.reason;
                printSystemLog('warning', `⚠️ Auto-correzione fallita per: ${pluginFile}`, {
                    'Motivo': autoFixResult.reason
                });
            }
        } catch (autoFixError) {
            details.autoFixError = autoFixError.message;
            printSystemLog('warning', `⚠️ Errore durante auto-correzione: ${pluginFile}`, {
                'Errore': autoFixError.message
            });
        }
        } else {
            details.autoFixSkipped = true;
            details.autoFixReason = `Limite tentativi raggiunto (${currentAttempts}/2)`;
            printSystemLog('warning', `⚠️ Auto-correzione saltata per: ${pluginFile} (troppi tentativi)`);
        }
    }

    // Categorize common error types
    if (error.name === 'SyntaxError') {
        details.category = 'Syntax Error';
        details.suggestion = 'Check for missing brackets, quotes, or semicolons';
    } else if (error.name === 'ReferenceError') {
        details.category = 'Reference Error';
        details.suggestion = 'Check for undefined variables or missing imports';
    } else if (error.name === 'TypeError') {
        details.category = 'Type Error';
        details.suggestion = 'Check for incorrect data types or null/undefined values';
    } else if (error.name === 'ModuleNotFoundError' || error.code === 'MODULE_NOT_FOUND') {
        details.category = 'Import Error';
        details.suggestion = 'Check import paths and ensure all dependencies are installed';
    } else {
        details.category = 'Runtime Error';
        details.suggestion = 'Check the error message for specific details';
    }

    return details;
}

// Helper: validate plugin structure and provide specific error messages
function validatePluginStructure(plugin, pluginFile) {
    const errors = [];
    
    if (!plugin) {
        errors.push('Plugin module returned null/undefined');
        return errors;
    }

    const hasCommand = plugin.default && plugin.default.name && plugin.default.execute;
    const hasTopLevelHooks = (typeof plugin.onMessageCreate === 'function') || 
                            (typeof plugin.onMessage === 'function') || 
                            (typeof plugin.onInteractionCreate === 'function') || 
                            (typeof plugin.onInteraction === 'function');
    const hasDefaultHooks = plugin.default && (
                            (typeof plugin.default.onMessageCreate === 'function') || 
                            (typeof plugin.default.onMessage === 'function') || 
                            (typeof plugin.default.onInteractionCreate === 'function') || 
                            (typeof plugin.default.onInteraction === 'function')
                          );

    if (!hasCommand && !hasTopLevelHooks && !hasDefaultHooks) {
        errors.push('Plugin must export either:');
        errors.push('  - A default object with name and execute function (command)');
        errors.push('  - Lifecycle hooks (onMessageCreate, onInteractionCreate, etc.)');
        errors.push('  - Hooks under default export');
        
        if (plugin.default) {
            if (!plugin.default.name) errors.push('  Missing: default.name');
            if (!plugin.default.execute) errors.push('  Missing: default.execute function');
        } else {
            errors.push('  Missing: default export');
        }
    }

    // Check for common issues
    if (plugin.default && typeof plugin.default.execute !== 'function' && plugin.default.execute !== undefined) {
        errors.push('default.execute must be a function, not ' + typeof plugin.default.execute);
    }

    if (plugin.default && plugin.default.name && typeof plugin.default.name !== 'string') {
        errors.push('default.name must be a string, not ' + typeof plugin.default.name);
    }

    return errors;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea una nuova istanza del client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions
    ]
});

// Token del bot: usa variabile ambiente o config
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || config.bot?.token;

// Inizializza database e cooldown manager
const db = new Database(config.database.file);
const cooldowns = new CooldownManager();

// Collezione per i comandi
client.commands = new Collection();

// Anti-duplicazione: traccia messaggi già processati (ID) e pulizia periodica
const processedMessages = new Map(); // messageId -> timestamp
const MESSAGE_TTL = 30 * 1000; // 30s, sufficiente per evitare doppi handler/spam gateway
setInterval(() => {
    const now = Date.now();
    for (const [id, ts] of processedMessages.entries()) {
        if (now - ts > MESSAGE_TTL) processedMessages.delete(id);
    }
    // Pulisci anche i tentativi di auto-fix vecchi
    if (autoFixAttempts.size > 50) {
        autoFixAttempts.clear();
    }
}, 10 * 1000).unref?.();

// Carica tutti i plugin
async function loadPlugins(options = {}) {
    const silent = !!options.silent;
    const pluginRootNames = ['pluginsDS', 'plugins'];
    const pluginRoots = pluginRootNames
        .map(name => ({ name, path: path.join(__dirname, name) }))
        .filter(root => {
            try {
                return fs.statSync(root.path).isDirectory();
            } catch (_) {
                return false;
            }
        });
    let pluginCount = 0; // Contatore plugin caricati con successo
    
    // Ensure we start from a clean state when (re)loading plugins
    client.commands.clear();
    // plugin lifecycle handlers collected here (e.g., messageCreate, interactionCreate hooks)
    client.pluginHandlers = { messageCreate: [], interactionCreate: [] };

    const loadErrors = [];
    for (const root of pluginRoots) {
        let categories = [];
        try {
            categories = fs.readdirSync(root.path);
        } catch (e) {
            loadErrors.push({
                file: root.name,
                reason: 'directory_unreadable',
                errors: [e.message],
                path: root.path
            });
            continue;
        }

        for (const category of categories) {
            const categoryPath = path.join(root.path, category);

            if (fs.statSync(categoryPath).isDirectory()) {
                const pluginFiles = fs.readdirSync(categoryPath).filter(file => 
                    file.endsWith('.js') && 
                    !file.startsWith('.temp_') && 
                    !file.includes('.backup.') &&
                    !file.startsWith('.')
                );

                for (const file of pluginFiles) {
                    try {
                        const pluginPath = path.join(categoryPath, file);
                    // Safety: only attempt to import actual .js files (skip directories, .map, etc.)
                    if (!pluginPath.endsWith('.js')) continue;
                    try {
                        const stat = fs.statSync(pluginPath);
                        if (!stat.isFile()) continue;
                    } catch (_) {
                        continue;
                    }
                    const plugin = await import(`file://${pluginPath}`);

                    // Validate plugin structure first
                    const validationErrors = validatePluginStructure(plugin, file);
                    if (validationErrors.length > 0) {
                        loadErrors.push({ 
                            file: `${root.name}/${category}/${file}`, 
                            reason: 'invalid_structure',
                            errors: validationErrors,
                            path: pluginPath
                        });
                        continue; // Skip this plugin
                    }

                    // Determine if module exports a traditional command (default with execute)
                    let registeredAsCommand = false;
                    if (plugin.default && plugin.default.name && plugin.default.execute) {
                        const cmd = plugin.default;
                        if (plugin.slash) cmd.slash = plugin.slash;
                        if (plugin.slashExecute) cmd.slashExecute = plugin.slashExecute;
                        client.commands.set(cmd.name, cmd);
                        registeredAsCommand = true;
                    }

                    // Some plugins may only export lifecycle hooks (no command). Consider them valid as long as they export at least one recognized hook.
                    const hasTopLevelHook = (typeof plugin.onMessageCreate === 'function') || (typeof plugin.onMessage === 'function') || (typeof plugin.onInteractionCreate === 'function') || (typeof plugin.onInteraction === 'function');
                    const hasDefaultHook = plugin.default && ((typeof plugin.default.onMessageCreate === 'function') || (typeof plugin.default.onMessage === 'function') || (typeof plugin.default.onInteractionCreate === 'function') || (typeof plugin.default.onInteraction === 'function'));

                    if (!registeredAsCommand && !(hasTopLevelHook || hasDefaultHook)) {
                        loadErrors.push({ 
                            file: `${root.name}/${category}/${file}`, 
                            reason: 'no_valid_exports',
                            path: pluginPath,
                            errors: ['Plugin does not export commands or lifecycle hooks']
                        });
                    }

                    // Collect optional lifecycle hooks exported by the module (e.g., onMessageCreate, onInteractionCreate)
                    try {
                        // Helper to register a hook function with proper context
                        const registerMessageHook = (fn) => {
                            if (typeof fn === 'function') client.pluginHandlers.messageCreate.push((message) => fn(message, { client, db, config, cooldowns }));
                        };
                        const registerInteractionHook = (fn) => {
                            if (typeof fn === 'function') client.pluginHandlers.interactionCreate.push((interaction) => fn(interaction, { client, db, config, cooldowns }));
                        };

                        // Top-level exports
                        registerMessageHook(plugin.onMessageCreate);
                        registerMessageHook(plugin.onMessage);
                        registerInteractionHook(plugin.onInteractionCreate);
                        registerInteractionHook(plugin.onInteraction);

                        // Also check under default export (many plugins export hooks there)
                        if (plugin.default && typeof plugin.default === 'object') {
                            registerMessageHook(plugin.default.onMessageCreate || plugin.default.onMessage);
                            registerInteractionHook(plugin.default.onInteractionCreate || plugin.default.onInteraction);
                        }
                    } catch (e) {
                        // non-fatal: continue
                        loadErrors.push({ 
                            file: `${root.name}/${category}/${file}`, 
                            reason: 'hook_registration_error',
                            errors: [e.message],
                            path: pluginPath
                        });
                    }
                    
                    // Plugin caricato con successo (flusso normale)
                    pluginCount++;
                    // Pulisci i tentativi di auto-fix per questo plugin se caricato con successo
                    autoFixAttempts.delete(path.join(categoryPath, file));
                    
                } catch (error) {
                    const errorDetails = await analyzePluginError(error, path.join(categoryPath, file), file);
                    
                    // Se l'auto-fix è riuscito, ritenta il caricamento
                    if (errorDetails.autoFixed) {
                        try {
                            const retryModule = await import(path.join(categoryPath, file) + '?cache=' + Date.now());
                            const validation = validatePluginStructure(retryModule);
                            
                            if (validation.valid) {
                                printSystemLog('success', `✅ Plugin auto-corretto e caricato: ${root.name}/${category}/${file}`);
                                
                                // Continua con il caricamento normale del plugin
                                const plugin = retryModule.default || retryModule;
                                
                                if (plugin.commands) {
                                    plugin.commands.forEach(cmd => {
                                        if (client.commands.has(cmd.data.name)) {
                                            logDedupe('commands', cmd.data.name, `${root.name}/${category}/${file}`);
                                        } else {
                                            client.commands.set(cmd.data.name, cmd);
                                        }
                                    });
                                }
                                
                                ['onMessageCreate', 'onInteractionCreate', 'onReady'].forEach(hook => {
                                    if (plugin[hook]) {
                                        client.pluginHandlers[hook] = client.pluginHandlers[hook] || [];
                                        client.pluginHandlers[hook].push(plugin[hook]);
                                    }
                                });
                                
                                pluginCount++;
                                // Pulisci i tentativi di auto-fix per questo plugin se caricato con successo
                                autoFixAttempts.delete(path.join(categoryPath, file));
                                continue; // Plugin caricato con successo
                            }
                        } catch (retryError) {
                            printSystemLog('warning', `⚠️ Retry dopo auto-fix fallito: ${root.name}/${category}/${file}`, {
                                'Errore Retry': retryError.message
                            });
                        }
                    }
                    
                    loadErrors.push({ 
                        file: `${root.name}/${category}/${file}`, 
                        reason: 'exception', 
                        error: String(error),
                        details: errorDetails,
                        path: path.join(categoryPath, file)
                    });
                }
            }
        }
    }
    }

    // Summary: print only total loaded and any errors
    if (!silent) printPluginLog('caricati', `${pluginCount} plugin(s)`);
    if (loadErrors.length > 0) {
        printSystemLog('error', `${loadErrors.length} errori nel caricamento dei plugin`);
        loadErrors.forEach(err => {
            if (err.reason === 'invalid_structure') {
                printSystemLog('error', `Plugin struttura non valida: ${err.file}`);
                err.errors.forEach(structError => {
                    printSystemLog('error', `  └─ ${structError}`, { file: err.path });
                });
            } else if (err.reason === 'no_valid_exports') {
                printSystemLog('error', `Plugin senza export validi: ${err.file}`);
                err.errors.forEach(expError => {
                    printSystemLog('error', `  └─ ${expError}`, { file: err.path });
                });
            } else if (err.reason === 'hook_registration_error') {
                printSystemLog('warning', `Errore registrazione hook: ${err.file}`);
                err.errors.forEach(hookError => {
                    printSystemLog('warning', `  └─ ${hookError}`, { file: err.path });
                });
            } else if (err.reason === 'directory_unreadable') {
                printSystemLog('warning', `Impossibile leggere la directory plugin: ${err.file}`, {
                    'Percorso': err.path,
                    'Errore': err.errors?.[0] || 'sconosciuto'
                });
            } else if (err.reason === 'exception') {
                const details = err.details;
                printSystemLog('error', `Errore caricamento ${err.file}`, {
                    'Tipo': details.category || details.type,
                    'Messaggio': details.message,
                    'Riga': details.line || 'N/A',
                    'Colonna': details.column || 'N/A',
                    'Funzione': details.function || 'N/A',
                    'File': details.path,
                    'Suggerimento': details.suggestion || 'Controlla il codice del plugin'
                });
            } else {
                // Fallback for old format
                printSystemLog('error', `Errore caricamento ${err.file}: ${err.error}`);
            }
        });
    }

    // Initialize a single watcher for hot-reloading plugins (debounced)
    try {
        if (!global._pluginsWatcherInitialized || !(global._pluginsWatcherInitialized instanceof Set)) {
            global._pluginsWatcherInitialized = new Set();
        }

        for (const root of pluginRoots) {
            const watcherPath = root.path;
            if (global._pluginsWatcherInitialized.has(watcherPath)) continue;

            let reloadTimer = null;
            watch(watcherPath, { recursive: true }, async (eventType, filename) => {
                if (!filename) return;
                if (reloadTimer) clearTimeout(reloadTimer);
                reloadTimer = setTimeout(async () => {
                    try {
                        // Try to import the specific changed file to provide detailed logs
                        const fullPath = path.join(watcherPath, filename);
                        let relPath = `${root.name}/${filename.replace(/\\/g, '/')}`;
                        try {
                            // Only attempt import for .js files that exist and are files
                            if (!fullPath.endsWith('.js')) {
                                printSystemLog('info', `Ignored watcher event for non-js file: ${relPath}`);
                                return;
                            }
                            try {
                                const st = fs.statSync(fullPath);
                                if (!st.isFile()) {
                                    printSystemLog('info', `Ignored watcher event for non-file: ${relPath}`);
                                    return;
                                }
                            } catch (statErr) {
                                printSystemLog('warning', `Watcher stat failure for: ${relPath}`, { error: statErr.message });
                                return;
                            }

                            const imported = await import(`file://${fullPath}?update=${Date.now()}`);
                            printSystemLog('info', `Plugin aggiornato: ${relPath}`);
                            // Re-run plugin loader silently and update slash commands
                            await loadPlugins({ silent: true });
                            await registerSlashCommands();
                        } catch (importErr) {
                            const errorDetails = await analyzePluginError(importErr, fullPath, relPath);
                            
                            // Se l'auto-fix è riuscito, ritenta il caricamento
                            if (errorDetails.autoFixed) {
                                try {
                                    const retryImport = await import(`file://${fullPath}?update=${Date.now()}`);
                                    printSystemLog('success', `✅ Plugin hot-reload auto-corretto: ${relPath}`);
                                    await loadPlugins({ silent: true });
                                    await registerSlashCommands();
                                    return; // Successo!
                                } catch (retryErr) {
                                    printSystemLog('warning', `⚠️ Retry hot-reload fallito: ${relPath}`, {
                                        'Errore': retryErr.message
                                    });
                                }
                            }
                            
                            printSystemLog('error', `Errore caricamento plugin: ${relPath}`, {
                                'Tipo': errorDetails.category || errorDetails.type,
                                'Messaggio': errorDetails.message,
                                'Riga': errorDetails.line || 'N/A',
                                'Colonna': errorDetails.column || 'N/A',
                                'Auto-Fix': errorDetails.autoFixed ? '✅ Applicato' : (errorDetails.autoFixFailed ? '❌ Fallito' : '⚠️ Non tentato'),
                                'Suggerimento': errorDetails.suggestion || 'Controlla il codice del plugin'
                            });
                            // Also run a silent reload to keep state consistent
                            await loadPlugins({ silent: true }).catch(() => {});
                        }
                    } catch (e) {
                        printSystemLog('error', 'Error reloading plugins (watch handler)', { error: e.message });
                    }
                }, 300);
            });

            global._pluginsWatcherInitialized.add(watcherPath);
        }
    } catch (e) {
        printSystemLog('error', 'Unable to initialize plugins watcher', { error: e.message });
    }
}

// Registra i comandi slash con Discord
async function registerSlashCommands() {
    const commands = [];

    // Converte i comandi tradizionali in slash commands
    client.commands.forEach(command => {
        // If the plugin provided explicit slash metadata, use it directly
        if (command.slash && command.slash.name) {
            const fromPlugin = {
                name: command.slash.name,
                description: command.slash.description || command.description || 'Nessuna descrizione',
                options: Array.isArray(command.slash.options) ? command.slash.options : []
            };
            commands.push(fromPlugin);
            return;
        }

        const slashCommand = {
            name: command.name,
            description: command.description || 'Nessuna descrizione',
            options: []
        };

            // Aggiungi opzioni per i comandi che ne hanno bisogno
            if (command.usage) {
                // Funzione di sanitizzazione: discord richiede nomi in lowercase, senza spazi,
                // solo a-z0-9-_ e massimo 32 caratteri
                const sanitizeName = (raw) => {
                    if (!raw) return null;
                    let s = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '_');
                    s = s.replace(/^_+|_+$/g, ''); // trim underscores
                    if (s.length === 0) return null;
                    return s.slice(0, 32);
                };

                // Parsing semplice dell'usage per creare opzioni
                const usageParts = command.usage.split(' ').filter(Boolean);
                const seenNames = new Set();

                usageParts.forEach((part) => {
                    if (slashCommand.options.length >= 10) return; // Discord cap 10 options

                    let isOptional = false;
                    let rawName = null;

                    if (part.startsWith('[') && part.endsWith(']')) {
                        isOptional = true;
                        rawName = part.replace(/[\[\]]/g, '');
                    } else if (part.startsWith('<') && part.endsWith('>')) {
                        isOptional = false;
                        rawName = part.replace(/[<>]/g, '');
                    } else {
                        // skip tokens that are not clearly option syntax
                        return;
                    }

                    const name = sanitizeName(rawName);
                    if (!name) return;
                    if (seenNames.has(name)) return;
                    seenNames.add(name);

                    slashCommand.options.push({
                        name: name,
                        description: `Parametro ${rawName || name}`,
                        type: 3, // STRING
                        required: !isOptional
                    });
                });

                // Validate option names against Discord regex and reorder required options first
                const nameRegex = /^[\w-]{1,32}$/; // letters, numbers, underscore, hyphen
                slashCommand.options = slashCommand.options.filter(opt => {
                    if (!opt || !opt.name) return false;
                    if (!nameRegex.test(opt.name)) {
                        printSystemLog('warning', `Skipping invalid slash option name: ${opt.name} for command ${command.name}`);
                        return false;
                    }
                    return true;
                });

                // Ensure required options come before optional ones (Discord requirement)
                if (slashCommand.options.length > 1) {
                    const required = slashCommand.options.filter(o => o.required);
                    const optional = slashCommand.options.filter(o => !o.required);
                    slashCommand.options = [...required, ...optional].slice(0, 10);
                }
            }

        commands.push(slashCommand);
    });

    try {
        // If a guild id is provided via env, register there for immediate propagation
        const GUILD_ID = process.env.GUILD_ID || process.env.TEST_GUILD_ID || null;
        if (GUILD_ID && client.guilds.cache.has(GUILD_ID)) {
            await client.guilds.cache.get(GUILD_ID).commands.set(commands);
            printSlashLog('registrati', `${commands.length} comandi slash nella guild ${GUILD_ID}`);
        } else {
            // Registra i comandi globalmente (potrebbe richiedere fino a 1 ora per propagarsi)
            await client.application.commands.set(commands);
            printSlashLog('registrati', `${commands.length} comandi slash (globali)`);
        }
    } catch (error) {
        printSystemLog('error', 'Errore registrazione comandi slash', { error: error.message });
    }
}

// Event: Bot pronto
client.once(Events.ClientReady, async (readyClient) => {
    printBotEvent('bot_ready', {
        'Nome Bot': readyClient.user.tag,
        'Server Serviti': readyClient.guilds.cache.size,
        'Utenti Totali': readyClient.users.cache.size,
        'Plugin Caricati': client.commands.size
    }, readyClient);

    // Carica tutti i plugin
    await loadPlugins();

    // Registra i comandi slash
    await registerSlashCommands();

    // Register runtime event handlers (moved to handler.js)
    try {
        await registerHandlers({
            client,
            db,
            config,
            cooldowns,
            createEmbed,
            addXp,
            updateUserNames,
            disableAfk,
            incrementMessages,
            printDiscord,
            printBotEvent,
            printCommandExecution,
            printSystemLog,
            printDuplicateLog
        });
    } catch (e) {
        printSystemLog('error', 'Errore registrazione handler runtime', { error: e.message });
    }

    // Imposta lo status del bot
    client.user.setPresence({
        activities: [{
            name: `${config.prefixes.join('')}help | PhiShy v${config.bot.version}`,
            type: ActivityType.Playing
        }],
        status: 'online'
    });

    // Set global multiplier for levelling difficulty
    try {
        global.multiplier = config.levelMultiplier || 1.0;
    } catch (_) {}

    // Ensure every guild channel has an entry in channelsDB
    try {
        let initialized = 0;
        for (const [gid, guild] of client.guilds.cache) {
            try {
                // fetch to populate cache (may be unnecessary if cache already filled)
                await guild.channels.fetch();
                guild.channels.cache.forEach(ch => {
                    try {
                        // Initialize for text channels, news, threads, voice channels and categories
                        const t = ch.type;
                        const shouldInit = (
                            // text-like channels
                            t === ChannelType.GuildText ||
                            t === ChannelType.GuildAnnouncement ||
                            // threads
                            t === ChannelType.PublicThread ||
                            t === ChannelType.PrivateThread ||
                            t === ChannelType.AnnouncementThread ||
                            // voice and stage
                            t === ChannelType.GuildVoice ||
                            t === ChannelType.GuildStageVoice ||
                            // categories
                            t === ChannelType.GuildCategory ||
                            // fallback for older discord.js where isTextBased exists
                            (typeof ch.isTextBased === 'function' ? ch.isTextBased() : false)
                        );

                        if (shouldInit) {
                            // Use channel name when available; categories and voice channels have names too
                            ensureChannelSettings(gid, ch.id, ch.name || null);
                            initialized++;
                        }
                    } catch (_) {}
                });
            } catch (e) {
                printSystemLog('warning', `Impossibile caricare i canali per la guild ${gid}`, { error: e.message });
            }
        }
        printSystemLog('info', `Inizializzate impostazioni per ${initialized} canali in channels.json`);
    } catch (e) {
        printSystemLog('error', 'Errore inizializzazione channel settings', { error: e.message });
    }
});

// Register runtime handlers (moved to handler.js)
// We'll register them after plugins are loaded so plugins can register their hooks.


// Note: runtime handlers were moved to `handler.js`. They will be registered after plugins are loaded.

// Menu and album interaction logic has been moved to plugins under pluginsDS/*
// Plugins may export `onInteractionCreate` or `onInteraction` handlers which are invoked above.

// Event: Membro entra nel server
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

// Event: Messaggio eliminato
client.on(Events.MessageDelete, (message) => {
    // Dedupe delete logs (alcuni client/gateway possono inviare più eventi)
    const _deletedSeen = global.__deletedSeen || (global.__deletedSeen = new Map());
    try {
        const key = message.id || `${message.channel?.id || 'channel'}:${Date.now()}`;
        if (_deletedSeen.has(key)) {
            logDedupe('message_delete', key, `${message.author?.tag || 'unknown'}`);
            return;
        }
        _deletedSeen.set(key, Date.now());
        setTimeout(() => _deletedSeen.delete(key), 30000).unref?.();
    } catch (_) {}

    if (message.author?.bot) return; // Salta messaggi bot
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


// Event: Bot entra in un server
client.on(Events.GuildCreate, (guild) => {
    printBotEvent('guild_join', {
        'Server': guild.name,
        'ID Server': guild.id,
        'Proprietario': guild.ownerId,
        'Membri': guild.memberCount,
        'Canali': guild.channels.cache.size,
        'Ruoli': guild.roles.cache.size
    }, client);
    // inizializza le impostazioni canale per la guild appena aggiunta
    (async () => {
        try {
            await guild.channels.fetch();
            guild.channels.cache.forEach(ch => {
                try {
                    const t = ch.type;
                    const shouldInit = (
                        t === ChannelType.GuildText ||
                        t === ChannelType.GuildAnnouncement ||
                        t === ChannelType.PublicThread ||
                        t === ChannelType.PrivateThread ||
                        t === ChannelType.AnnouncementThread ||
                        t === ChannelType.GuildVoice ||
                        t === ChannelType.GuildStageVoice ||
                        t === ChannelType.GuildCategory ||
                        (typeof ch.isTextBased === 'function' ? ch.isTextBased() : false)
                    );

                    if (shouldInit) ensureChannelSettings(guild.id, ch.id, ch.name || null);
                } catch (_) {}
            });
            printSystemLog('info', `Inizializzate impostazioni canali per guild appena aggiunta: ${guild.id}`);
        } catch (e) {
            printSystemLog('warning', `Impossibile inizializzare canali per guild ${guild.id}`, { error: e.message });
        }
    })();
});

// Event: Bot esce da un server
client.on(Events.GuildDelete, (guild) => {
    printBotEvent('guild_leave', {
        'Server': guild.name,
        'ID Server': guild.id,
        'Membri': guild.memberCount
    }, client);
});

// Event: Membro lascia il server
client.on(Events.GuildMemberRemove, (member) => {
    printBotEvent('guild_member_remove', {
        'Utente': member.user.tag,
        'ID Utente': member.user.id,
        'Server': member.guild.name,
        'ID Server': member.guild.id,
        'Ruoli': member.roles.cache.map(r => r.name).join(', ') || 'Nessuno'
    }, client);
});

// Event: Errori
client.on(Events.Error, (error) => {
    printBotEvent('discord_error', {
        'Tipo': 'Error',
        'Messaggio': error.message,
        'Stack': error.stack?.substring(0, 200) + '...'
    }, client);
});

// Event: Avvertimenti
client.on(Events.Warn, (warning) => {
    printBotEvent('discord_warning', {
        'Tipo': 'Warning',
        'Messaggio': warning
    }, client);
});

// Gestione errori non catturati
process.on('unhandledRejection', (error) => {
    printBotEvent('unhandled_rejection', {
        'Tipo': 'Unhandled Rejection',
        'Messaggio': error.message,
        'Stack': error.stack?.substring(0, 300) + '...'
    }, client);
});

process.on('uncaughtException', (error) => {
    printBotEvent('uncaught_exception', {
        'Tipo': 'Uncaught Exception',
        'Messaggio': error.message,
        'Stack': error.stack?.substring(0, 300) + '...'
    }, client);
    process.exit(1);
});

// Funzione helper per banner ASCII
function printBanner(title, details = {}, type = 'info') {
    const color = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
    const reset = '\x1b[0m';
    const dim = '\x1b[2m';
    const bold = '\x1b[1m';
    
    // Box drawing chars
    const tl = '╭', tr = '╮', bl = '╰', br = '╯', v = '│', h = '─';
    
    // Calculate width based on longest detail
    const width = Math.max(
        title.length,
        ...Object.entries(details).map(([k,v]) => `${k}: ${v}`.length)
    ) + 4;

    // Build banner
    console.log(`${color}${tl}${h.repeat(width)}${tr}${reset}`);
    console.log(`${color}${v}${reset} ${bold}${title}${reset}${' '.repeat(width - title.length - 1)}${color}${v}${reset}`);
    console.log(`${color}${v}${reset}${dim}${h.repeat(width)}${reset}${color}${v}${reset}`);
    
    // Print details
    Object.entries(details).forEach(([key, value]) => {
        const line = `${key}: ${value}`;
        console.log(`${color}${v}${reset} ${line}${' '.repeat(width - line.length - 1)}${color}${v}${reset}`);
    });
    
    console.log(`${color}${bl}${h.repeat(width)}${br}${reset}\n`);
}

// Avvia il bot
client.login(TOKEN)
    .then(() => {
        printBanner('BOT ONLINE', {
            'Stato': 'Connesso e Operativo',
            'Nome': client.user?.tag,
            'Versione': config.bot.version,
            'Data Avvio': new Date().toLocaleString('it-IT')
        }, 'success');

    })
    .catch((error) => {
        printBanner('ERRORE LOGIN', {
            'Motivo': error.message,
            'Data': new Date().toLocaleString('it-IT')
        }, 'error');
        
        printBotEvent('bot_login_error', {
            'Errore': error.message
        }, client);
    });

// Gestione graceful shutdown
function handleShutdown(reason) {
    const serversCount = client.guilds?.cache?.size || 0;
    const uptime = Math.floor(client.uptime / 1000); // in seconds
    
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
    
    printBanner('BOT OFFLINE', {
        'Motivo': reason,
        'Server Serviti': serversCount,
        'Uptime': uptimeStr,
        'Data Chiusura': new Date().toLocaleString('it-IT')
    }, 'info');
    
    
    client.destroy();
    process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT (Ctrl+C)'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
