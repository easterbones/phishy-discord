/* utf8 */
import chalk from 'chalk';
import gradient from 'gradient-string';

// Main gradient: rosa, viola, celeste
const mainGradient = gradient(['#e84393', '#6c5ce7', '#00cec9']);

// Color definitions
const rosa = chalk.hex('#e84393');
const viola = chalk.hex('#6c5ce7');
const celeste = chalk.hex('#00cec9');

// Helper: apply the main gradient to a string safely. Falls back to the raw string on error.
function customGradient(str) {
  try {
    if (typeof mainGradient === 'function') return mainGradient(String(str));
  } catch (e) {
    // ignore and fall through
  }
  return String(str);
}


// Decorative header and emoji labels
const STAR = '★';
const ARROW = '➤';
const SEP = customGradient('━'.repeat(46));
const title = customGradient(` ${STAR} ${global.nomebot || 'PhiShy'} ${STAR} `);

// Media emoji mapping
const MEDIA_EMOJI = {
  image: '✦',
  video: '✪',
  audio: '♬',
  document: '✎',
  sticker: '✶',
  unknown: '◈'
};

// Stub type mapping for Discord events
const STUB_TYPE_MAP = {
  'GUILD_MEMBER_ADD': 'MEMBER_JOIN',
  'GUILD_MEMBER_REMOVE': 'MEMBER_LEAVE',
  'GUILD_MEMBER_UPDATE': 'MEMBER_UPDATE',
  'MESSAGE_DELETE': 'MESSAGE_DELETE',
  'MESSAGE_UPDATE': 'MESSAGE_EDIT',
  'GUILD_BAN_ADD': 'USER_BANNED',
  'GUILD_BAN_REMOVE': 'USER_UNBANNED',
  'CHANNEL_CREATE': 'CHANNEL_CREATE',
  'CHANNEL_DELETE': 'CHANNEL_DELETE',
  'ROLE_CREATE': 'ROLE_CREATE',
  'ROLE_DELETE': 'ROLE_DELETE'
};

// Human readable filesize helper
function hr(size) {
  if (!size || size === 0) return '0 B';
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const units = ['B','KB','MB','GB','TB'];
  return (size / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

// Replace mentions in text
async function replaceMentions(text, message) {
  if (!text || typeof text !== 'string') return text;

  // Replace user mentions
  const mentionRegex = /<@!?(\d+)>/g;
  let processedText = text.replace(mentionRegex, (match, id) => {
    const user = message.guild?.members.cache.get(id)?.user || message.client.users.cache.get(id);
    return user ? `@${user.username}` : match;
  });

  // Replace channel mentions
  const channelRegex = /<#(\d+)>/g;
  processedText = processedText.replace(channelRegex, (match, id) => {
    const channel = message.guild?.channels.cache.get(id);
    return channel ? `#${channel.name}` : match;
  });

  // Replace role mentions
  const roleRegex = /<@&(\d+)>/g;
  processedText = processedText.replace(roleRegex, (match, id) => {
    const role = message.guild?.roles.cache.get(id);
    return role ? `@${role.name}` : match;
  });

  return processedText;
}

// Main print function for Discord messages
export default async function printDiscord(message, client, eventType = 'message') {
  try {
    // Skip bot messages unless it's a specific event or our own bot messages
    if (message.author?.bot && eventType === 'message' && message.author.id !== client.user.id) return;

    let img;
    const oraAttuale = new Date();
    const oraItaliana = oraAttuale.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Get user data from database if available
    let user = null;
    try {
      if (global.db && message.author) {
        user = global.db.data.users?.[message.author.id];
      }
    } catch (e) {
      // Ignore database errors
    }

    // Determine chat type and name
    const isDM = !message.guild;
    const chatName = isDM ? 'Chat privata' : `Server: ${message.guild.name}`;
    const chatId = isDM ? 'DM' : message.guild.id;

    // Get member information
    const member = message.member;
    const roles = member?.roles?.cache?.map(role => role.name).slice(0, 3).join(', ') || 'Nessuno';
    const permissions = member?.permissions?.toArray().slice(0, 3).join(', ') || 'Utente base';

    // Message content processing
    let content = message.content || '';
    const processedContent = await replaceMentions(content, message);

    // Attachments analysis
    const attachments = message.attachments;
    let mediaKind = null;
    let mediaSize = 0;
    let mediaInfo = '';

    if (attachments.size > 0) {
      const firstAttachment = attachments.first();
      const contentType = firstAttachment.contentType || '';

      if (contentType.startsWith('image/')) {
        mediaKind = 'image';
        mediaSize = firstAttachment.size;
        mediaInfo = `${firstAttachment.width}x${firstAttachment.height}`;
      } else if (contentType.startsWith('video/')) {
        mediaKind = 'video';
        mediaSize = firstAttachment.size;
        mediaInfo = `${Math.floor((firstAttachment.duration || 0) / 60)}:${((firstAttachment.duration || 0) % 60).toString().padStart(2, '0')}`;
      } else if (contentType.startsWith('audio/')) {
        mediaKind = 'audio';
        mediaSize = firstAttachment.size;
        mediaInfo = `${Math.floor((firstAttachment.duration || 0) / 60)}:${((firstAttachment.duration || 0) % 60).toString().padStart(2, '0')}`;
      } else {
        mediaKind = 'document';
        mediaSize = firstAttachment.size;
        mediaInfo = firstAttachment.name || 'File';
      }
    }

    // Embeds analysis
    const embeds = message.embeds;
    let embedInfo = '';
    if (embeds.length > 0) {
      embedInfo = `${embeds.length} embed(s)`;
      if (embeds[0].title) embedInfo += ` - "${embeds[0].title}"`;
    }

    // Stickers
    let stickerInfo = '';
    if (message.stickers.size > 0) {
      const sticker = message.stickers.first();
      stickerInfo = `Sticker: ${sticker.name}`;
      mediaKind = 'sticker';
    }

    // Components (buttons, select menus)
    let componentInfo = '';
    if (message.components.length > 0) {
      const buttons = message.components.flatMap(row => row.components).filter(comp => comp.type === 2).length;
      const selects = message.components.flatMap(row => row.components).filter(comp => comp.type === 3).length;
      componentInfo = `${buttons} button(s), ${selects} select(s)`;
    }

    // Print header
    console.log('\n' + title + '\n' + chalk.hex('#95a5a6')(SEP));

    // Date and time
    console.log(chalk.hex('#6c5ce7')(ARROW), chalk.bold.magenta('⌚ Date:'), chalk.hex('#f39c12')(oraItaliana));

    // Event type
    const eventLabel = STUB_TYPE_MAP[eventType] || eventType.toUpperCase();
    console.log(chalk.hex('#6c5ce7')(ARROW), chalk.bold.magenta('⚡ Event:'), chalk.red(eventLabel));

    // Sender info
    if (message.author) {
      const isBot = message.author.bot;
      const isOwnBot = message.author.id === client.user.id;
      const senderColor = isOwnBot ? chalk.magenta : chalk.cyan;
      const senderLabel = isOwnBot ? '🤖 Bot' : '❖ Sender';
      
      console.log(chalk.hex('#2ecc71')(ARROW), chalk.bold.magenta(senderLabel + ':'), senderColor(message.author.username), chalk.gray(`(${message.author.id})`));
      if (isBot) {
        console.log(chalk.hex('#2ecc71')(ARROW), chalk.bold.magenta('🔧 Bot Type:'), chalk.yellow(isOwnBot ? 'OWN_BOT' : 'OTHER_BOT'));
      }
      console.log(chalk.hex('#2ecc71')(ARROW), chalk.bold.magenta('📱 Nick:'), chalk.green(member?.nickname || 'Nessuno'));
      console.log(chalk.hex('#2ecc71')(ARROW), chalk.bold.magenta('🏷️ Tag:'), chalk.yellow(message.author.tag));
    }

    // Chat info
    console.log(chalk.hex('#1abc9c')(ARROW), chalk.bold.magenta('▣ Chat:'), chalk.yellow(isDM ? 'DM' : 'Server'), chalk.gray('| ' + chatId));
    if (!isDM) {
      console.log(chalk.hex('#1abc9c')(ARROW), chalk.bold.magenta('🏠 Server:'), chalk.cyan(message.guild.name));
      console.log(chalk.hex('#1abc9c')(ARROW), chalk.bold.magenta('📺 Channel:'), chalk.blue(message.channel.name), chalk.gray(`(${message.channel.id})`));
    }

    // Member info (if in server)
    if (member) {
      console.log(chalk.hex('#3498db')(ARROW), chalk.bold.magenta('👤 Joined:'), chalk.white(member.joinedAt?.toLocaleDateString('it-IT') || 'Unknown'));
      console.log(chalk.hex('#3498db')(ARROW), chalk.bold.magenta('🎭 Roles:'), chalk.hex('#9b59b6')(roles));
      console.log(chalk.hex('#3498db')(ARROW), chalk.bold.magenta('🔑 Perms:'), chalk.hex('#e67e22')(permissions));
    }

    // User stats (from database)
    if (user) {
      const level = user.level || 1;
      const coins = user.coins || 0;
      const xp = user.xp || 0;
      console.log(chalk.hex('#f1c40f')(ARROW), chalk.bold.magenta('📊 Stats:'), chalk.yellow(`Lv.${level} • ${coins} 💰 • ${xp} XP`));
    }

    // Message type and content
    console.log(chalk.hex('#95a5a6')(ARROW), chalk.bold.magenta('📝 Type:'), chalk.white(message.type || 'DEFAULT'));

    // Media information
    if (mediaKind) {
      const em = MEDIA_EMOJI[mediaKind] || MEDIA_EMOJI.unknown;
      console.log(chalk.hex('#8e44ad')(ARROW), chalk.bold.magenta(`${em} Media:`), chalk.cyan(mediaKind), chalk.gray('|'), chalk.white(hr(mediaSize)), mediaInfo ? chalk.gray('|') : '', mediaInfo ? chalk.white(mediaInfo) : '');
    } else {
      console.log(chalk.hex('#95a5a6')(ARROW), chalk.bold.magenta('∅ Media:'), chalk.gray('none'));
    }

    // Embeds
    if (embedInfo) {
      console.log(chalk.hex('#27ae60')(ARROW), chalk.bold.magenta('📄 Embeds:'), chalk.green(embedInfo));
    }

    // Stickers
    if (stickerInfo) {
      console.log(chalk.hex('#8e44ad')(ARROW), chalk.bold.magenta('🎭 Sticker:'), chalk.magenta(stickerInfo));
    }

    // Components
    if (componentInfo) {
      console.log(chalk.hex('#f39c12')(ARROW), chalk.bold.magenta('🎮 Components:'), chalk.hex('#f39c12')(componentInfo));
    }

    // Message content
    if (processedContent) {
      console.log(chalk.hex('#f1c40f')(ARROW), chalk.bold.magenta('💬 Content:'), chalk.white(processedContent));
    }

    // Message ID and other metadata
    console.log(chalk.hex('#95a5a6')(ARROW), chalk.bold.magenta('🆔 ID:'), chalk.gray(message.id));
    if (message.reference) {
      console.log(chalk.hex('#95a5a6')(ARROW), chalk.bold.magenta('↩️ Reply to:'), chalk.gray(message.reference.messageId));
    }

    console.log(chalk.hex('#95a5a6')(SEP) + '\n');

    // Print message content with formatting
    if (processedContent) {
      try {
        const isOwnBot = message.author?.id === client.user.id;
        const contentColor = message.error != null ? chalk.red : 
                           message.isCommand ? chalk.yellow : 
                           isOwnBot ? chalk.blue : chalk.white;
        console.log(message.error != null ? chalk.red(processedContent) : 
                  message.isCommand ? chalk.yellow(processedContent) : 
                  isOwnBot ? chalk.blue(processedContent) : processedContent);
      } catch (e) {
        console.log('Errore nella stampa del messaggio:', e, '\nMessaggio:', typeof processedContent === 'string' ? processedContent : String(processedContent));
      }
    }

    // Print attachments info
    if (attachments.size > 0) {
      console.log(`📎 ALLEGATI: ${attachments.size} file(s)`);
      attachments.forEach((att, index) => {
        console.log(`  ${index + 1}. ${att.name || 'File'} (${hr(att.size)})`);
      });
    }

    console.log();

  } catch (error) {
    console.error('Errore nella funzione printDiscord:', error);
  }
}

// Function to print bot events
export function printBotEvent(eventType, details, client) {
  try {
    const oraAttuale = new Date();
    const oraItaliana = oraAttuale.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    console.log('\n' + title + '\n' + chalk.hex('#95a5a6')(SEP));
    console.log(chalk.hex('#f39c12')(ARROW), chalk.bold.magenta('★ Bot:'), chalk.cyan(client.user.username));
    console.log(chalk.hex('#f39c12')(ARROW), chalk.bold.magenta('⌚ Date:'), chalk.hex('#f39c12')(oraItaliana));
    console.log(chalk.hex('#e74c3c')(ARROW), chalk.bold.magenta('⚡ Event:'), chalk.red(eventType.toUpperCase()));

    if (typeof details === 'object') {
      Object.entries(details).forEach(([key, value]) => {
        console.log(chalk.hex('#3498db')(ARROW), chalk.bold.magenta(`${key}:`), chalk.white(String(value)));
      });
    } else {
      console.log(chalk.hex('#3498db')(ARROW), chalk.bold.magenta('Details:'), chalk.white(String(details)));
    }

    console.log(chalk.hex('#95a5a6')(SEP) + '\n');

  } catch (error) {
    console.error('Errore nella funzione printBotEvent:', error);
  }
}

// Function to print command execution
export function printCommandExecution(command, message, success = true, error = null) {
  try {
    const oraAttuale = new Date();
    const oraItaliana = oraAttuale.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    console.log('\n' + title + '\n' + chalk.hex('#95a5a6')(SEP));
    // Ensure message is at least an object to avoid blowing up on missing values
    message = message || {};

    // Resolve client/user safely: mockMessage from interactions might not include a client property
    const clientUser = (message.client && message.client.user) || (global && global.client && global.client.user) || { username: global?.config?.bot?.name || 'PhiShy', id: 'N/A' };
    const botName = clientUser.username || global?.config?.bot?.name || 'PhiShy';
    console.log(chalk.hex('rgba(15, 208, 226, 1)')(ARROW), chalk.bold.magenta('★ Bot:'), chalk.cyan(botName));
    console.log(chalk.hex('#f39c12')(ARROW), chalk.bold.magenta('⌚ Date:'), chalk.hex('#f39c12')(oraItaliana));
    const cmdName = command && command.name ? command.name : (command && typeof command === 'string' ? command : 'unknown');
    console.log(chalk.hex('#e74c3c')(ARROW), chalk.bold.magenta('⚙️ Command:'), chalk.yellow(cmdName));

    // Resolve user safely (interaction mockMessage should have author from interaction.user)
    const author = message.author || message.user || {};
    const userName = author.username || author.tag || 'Unknown';
    const userId = author.id || 'N/A';
    console.log(chalk.hex('#2ecc71')(ARROW), chalk.bold.magenta('👤 User:'), chalk.cyan(userName), chalk.gray(`(${userId})`));

    // Resolve channel safely
    const channel = message.channel || {};
    const channelName = channel.name || (channel.id ? `<#${channel.id}>` : 'N/A');
    console.log(chalk.hex('#1abc9c')(ARROW), chalk.bold.magenta('📺 Channel:'), chalk.blue(channelName));

    // Content/args fallback for slash commands
    const content = (typeof message.content === 'string' && message.content.length) ? message.content : (message.args ? String(message.args) : '(slash command / no content)');
    console.log(chalk.hex('#f1c40f')(ARROW), chalk.bold.magenta('📝 Args:'), chalk.white(content));

    if (success) {
      console.log(chalk.hex('#27ae60')(ARROW), chalk.bold.magenta('✅ Status:'), chalk.green('SUCCESS'));
    } else {
      console.log(chalk.hex('#e74c3c')(ARROW), chalk.bold.magenta('❌ Status:'), chalk.red('FAILED'));
      if (error) {
        console.log(chalk.hex('#e74c3c')(ARROW), chalk.bold.magenta('💥 Error:'), chalk.red(error.message || String(error)));
      }
    }

    console.log(chalk.hex('#95a5a6')(SEP) + '\n');

  } catch (error) {
    console.error('Errore nella funzione printCommandExecution:', error);
  }
}

// Additional logging functions for organized output
export function printSystemLog(type, message, details = {}) {
  try {
    const oraAttuale = new Date();
    const oraItaliana = oraAttuale.toLocaleString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const typeColors = {
      info: '#3498db',
      success: '#27ae60', 
      warning: '#f39c12',
      error: '#e74c3c',
      debug: '#9b59b6'
    };
    
    const typeEmojis = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔧'
    };

    const color = typeColors[type] || typeColors.info;
    const emoji = typeEmojis[type] || typeEmojis.info;
    
    console.log(chalk.hex(color)(`[${oraItaliana}] ${emoji} ${type.toUpperCase()}: ${message}`));
    
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(chalk.gray(`  ${key}: ${value}`));
      });
    }
  } catch (e) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

export function printPluginLog(action, pluginName, details = {}) {
  printSystemLog('info', `Plugin ${action}: ${pluginName}`, details);
}

export function printSlashLog(action, commandName, details = {}) {
  printSystemLog('info', `Slash command ${action}: ${commandName}`, details);
}

export function printDuplicateLog(type, id, details = '') {
  printSystemLog('warning', `Duplicato bloccato [${type}] ${id}`, { dettagli: details });
}