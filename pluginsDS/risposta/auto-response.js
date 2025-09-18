import { generateResponse, addResponseVariety } from './personality-engine.js';
import { createEmbed } from '../../lib/utils.js';

// Cooldown management to prevent spam
const userCooldowns = new Map();
const COOLDOWN_MS = 30000; // 30 seconds between responses to same user
const GLOBAL_COOLDOWN_MS = 5000; // 5 seconds between any responses

let lastResponseTime = 0;

function isOnCooldown(userId) {
    const now = Date.now();
    const userLastResponse = userCooldowns.get(userId) || 0;
    const globalCooldownMet = now - lastResponseTime > GLOBAL_COOLDOWN_MS;
    const userCooldownMet = now - userLastResponse > COOLDOWN_MS;
    
    return !globalCooldownMet || !userCooldownMet;
}

function setCooldown(userId) {
    const now = Date.now();
    userCooldowns.set(userId, now);
    lastResponseTime = now;
}

// Main auto-response logic
async function handleAutoResponse(message, { client, config }) {
    // Ignore bot messages and system messages
    if (message.author.bot || message.system) return;
    
    // Check cooldowns
    if (isOnCooldown(message.author.id)) return;
    
    // Generate response using personality engine
    const response = generateResponse(message, client.user);
    if (!response) return;
    
    // Add variety to prevent repetition
    const finalResponse = addResponseVariety(response);
    if (!finalResponse || !finalResponse.content) return;
    
    try {
        // Set cooldown before responding
        setCooldown(message.author.id);
        
        // Decide between plain text or embed based on response type
        const shouldUseEmbed = ['easterLove', 'colorLove'].includes(response.type);
        
        if (shouldUseEmbed) {
            const embed = createEmbed({
                color: config.embedColors?.info || '#00FFFF', // Cyan default
                description: finalResponse.content,
                timestamp: new Date()
            });
            
            await message.reply({ 
                embeds: [embed], 
                allowedMentions: { repliedUser: false } 
            });
        } else {
            await message.reply({ 
                content: finalResponse.content, 
                allowedMentions: { repliedUser: false } 
            });
        }
        
        // Log response for debugging (optional)
        console.log(`[AutoResponse] ${response.type} -> ${message.author.tag}: "${finalResponse.content}"`);
        
    } catch (error) {
        console.error('[AutoResponse] Error sending response:', error);
    }
}

// Export as message create handler
export async function onMessageCreate(message, context) {
    await handleAutoResponse(message, context);
}

// Also export as plugin for manual testing
export default {
    name: 'autoresponder',
    description: 'Sistema di risposta automatica con personalità per Phishy',
    category: 'risposta',
    
    async execute(message, args, context) {
        // Manual trigger for testing
        const testResponse = generateResponse(message, context.client.user);
        if (testResponse) {
            const finalResponse = addResponseVariety(testResponse);
            await message.reply(finalResponse.content || 'Sistema di risposta attivo ma nessuna risposta generata.');
        } else {
            await message.reply('Sistema di risposta attivo ma nessun trigger rilevato per questo messaggio.');
        }
    }
};