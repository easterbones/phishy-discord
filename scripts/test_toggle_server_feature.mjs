import { ensureChannelSettings, setChannelSetting, getChannelSettings } from '../lib/utils.js';

const guildId = '1325148425007665284';
const SERVER_KEY = '__server__';

console.log('Prima:', getChannelSettings(guildId, SERVER_KEY));
ensureChannelSettings(guildId, SERVER_KEY);
setChannelSetting(guildId, SERVER_KEY, 'welcome', false);
console.log('Dopo impostazione welcome=false:', getChannelSettings(guildId, SERVER_KEY));

// toggle back
setChannelSetting(guildId, SERVER_KEY, 'welcome', true);
console.log('Ripristinato welcome=true:', getChannelSettings(guildId, SERVER_KEY));
