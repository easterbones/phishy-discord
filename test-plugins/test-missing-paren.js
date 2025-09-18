// Plugin test con parentesi mancante
export default {
    name: 'test-missing-paren',
    
    onMessageCreate: function(message) {
        if (message.content === '!test') {
            message.reply('Test plugin');  // Manca la parentesi di chiusura
        }
    }
}