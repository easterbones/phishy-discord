// Plugin test con import senza estensione
import utils from './utils'  // Manca .js

export default {
    name: 'test-missing-js-extension',
    
    onMessageCreate: function(message) {
        message.reply('Test');
    }
}