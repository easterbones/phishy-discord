// Plugin migrate: enable/disable features for a guild (Discord)
// This plugin only provides the toggle mechanism and persistence; it does NOT implement the features themselves.
import { PermissionsBitField } from 'discord.js';
import { ensureChannelSettings, setChannelSetting, getChannelSettings } from '../../lib/utils.js';
import antiinsta from './antiinsta.js';
import antitemu from './antitemu.js';

// Whitelist / mapping of allowed feature names to internal storage keys
const FEATURE_MAP = {
  // italian keys mapped to storage keys used historically
  benvenuto: 'welcome',
  chatgpt: 'chatgpt',
  bestemmiometro: 'bestemmiometro',
  comandieseguiti: 'comandieseguiti',
  antielimina: 'antielimina',
  antilink: 'antilink',
  antiinsta: 'antiinsta',
  antitemu: 'antitemu',
  autosticker: 'autosticker',
  antispam: 'antispam',
  antispoiler: 'antispoiler',
  adminmode: 'adminmode',
  prvonly: 'soloprivato',
  soloprivato: 'soloprivato',
  gconly: 'grouponly',
  sologruppo: 'grouponly',
  anticall: 'antiCall',
  antiprivato: 'antiPrivate',
  antitrava: 'antiTraba',
  antitiktok: 'antitiktok',
  antitelegram: 'antitelegram',
  antiporno: 'antiporno',
  antipaki: 'antiArab',
  antivoip: 'antivoip',
  talk: 'talk',
  autolevelup: 'autolevelup',
  antiruba: 'antiruba'
};

function allowedFeaturesList() {
  return Object.keys(FEATURE_MAP).sort().join(', ');
}

export const slash = {
  name: 'enable',
  description: 'Abilita o disabilita una funzionalità del server',
  options: [
    { name: 'feature', description: 'Nome della feature (es. antilink)', type: 3, required: true, autocomplete: true },
    { name: 'state', description: 'on/off', type: 3, required: true, choices: [ { name: 'on', value: 'on' }, { name: 'off', value: 'off' } ] }
  ]
};

const plugin = {
  name: 'enable',
  description: 'Abilita o disabilita una funzionalità nel server',

  // Called when the project executes a prefix command (command executor should call this)
  async execute(message, args = [], { client, db, config }) {
    try {
      if (!message.guild) {
        await message.reply('Questo comando può essere usato solo in un server.');
        return;
      }

      const guildId = message.guild.id;
      const featureInput = (args[0] || '').toString().toLowerCase();
      const stateArg = (args[1] || '').toString().toLowerCase();
      if (!featureInput || !stateArg) {
        await message.reply(`Uso: ${config.prefixes?.[0] || '!'}enable <feature> <on|off>\nFeature consentite: ${allowedFeaturesList()}`);
        return;
      }

      const mapped = FEATURE_MAP[featureInput];
      if (!mapped) {
        await message.reply(`Feature non riconosciuta: **${featureInput}**\nFeature consentite: ${allowedFeaturesList()}`);
        return;
      }

      const state = /^(on|1|true|enable)$/i.test(stateArg);

      const member = await message.guild.members.fetch(message.author.id);
      const isAdmin = member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator);
      if (!isAdmin) {
        await message.reply('Devi essere un amministratore del server per modificare le impostazioni.');
        return;
      }

      // Apply only to the current channel where the command was used
      const channelId = message.channel?.id || null;
      if (!channelId) {
        await message.reply('Impossibile determinare il canale corrente.');
        return;
      }

      ensureChannelSettings(guildId, channelId);
      setChannelSetting(guildId, channelId, mapped, state);

      await message.reply(`Feature **${featureInput}** è ora **${state ? 'abilitata' : 'disabilitata'}** in questo canale.`);
    } catch (err) {
      console.error('enable:execute', err);
      try { await message.reply('Errore interno durante l\'operazione.'); } catch (_) {}
    }
  },

  // Handler for message create to allow a more flexible prefix-based usage if the bot uses a different executor
  async onMessageCreate(message, { client, db, config }) {
    try {
      if (!message.guild) return;
      const prefix = (config.prefixes && config.prefixes[0]) || '!';
      const content = message.content?.trim();
      if (!content) return;

      if (!content.toLowerCase().startsWith((prefix + 'enable').toLowerCase())) return;
      const rest = content.slice((prefix + 'enable').length).trim();
      const parts = rest.split(/\s+/).filter(Boolean);
      if (parts.length < 2) {
        await message.reply(`Uso: ${prefix}enable <feature> <on|off>\nFeature consentite: ${allowedFeaturesList()}`);
        return;
      }

      // delegate to the execute function using stable reference
      await plugin.execute(message, parts, { client, db, config });
    } catch (e) {
      console.error('enable:onMessageCreate', e);
    }
  },

  // Slash interaction handler
  async onInteractionCreate(interaction, { client, db, config }) {
    try {
      // Autocomplete handling
      if (interaction.isAutocomplete && interaction.isAutocomplete()) {
        const focused = interaction.options.getFocused(true);
        if (focused && focused.name === 'feature') {
          const value = focused.value.toLowerCase();
          const suggestions = Object.keys(FEATURE_MAP)
            .filter(k => k.startsWith(value))
            .slice(0, 25)
            .map(k => ({ name: k, value: k }));
          return interaction.respond(suggestions).catch(() => {});
        }
        return;
      }

      if (!interaction.isCommand()) return;
      if (interaction.commandName !== 'enable') return;

      const featureInput = interaction.options.getString('feature')?.toLowerCase();
      const state = interaction.options.getString('state') === 'on';

      const mapped = FEATURE_MAP[featureInput];
      if (!mapped) {
        await interaction.reply({ content: `Feature non riconosciuta: **${featureInput}**\nFeature consentite: ${allowedFeaturesList()}`, ephemeral: true });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const isAdmin = member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator);
      if (!isAdmin) {
        await interaction.reply({ content: 'Devi essere un amministratore del server per modificare le impostazioni.', ephemeral: true });
        return;
      }

      const guildId = interaction.guild.id;
      const channelId = interaction.channelId || null;
      if (!channelId) {
        await interaction.reply({ content: 'Impossibile determinare il canale corrente.', ephemeral: true });
        return;
      }

      ensureChannelSettings(guildId, channelId);
      setChannelSetting(guildId, channelId, mapped, state);

      await interaction.reply({ content: `Feature **${featureInput}** è ora **${state ? 'abilitata' : 'disabilitata'}** in questo canale.`, ephemeral: true });
    } catch (err) {
      console.error('enable:onInteractionCreate', err);
      try { await interaction.reply({ content: 'Errore interno durante l\'operazione.', ephemeral: true }); } catch (_) {}
    }
  }
};

export default plugin;