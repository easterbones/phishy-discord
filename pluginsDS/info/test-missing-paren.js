// Plugin test con virgola mancante
export default {
    name: 'test-missing-comma',
    
    onMessageCreate: function(message) {
        if (message.content === '!test') {
            message.reply('Test plugin');
        }
    }
}