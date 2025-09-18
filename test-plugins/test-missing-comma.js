// Plugin test con virgola mancante
export default {
    name: 'test-missing-comma',
    
    onMessageCreate: function(message) {
        // Manca la virgola dopo name
        message.reply('Test');
    }
}