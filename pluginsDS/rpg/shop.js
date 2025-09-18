import fs from 'fs'
import path from 'path'
// --- Helper functions and shop data (ported from PhiShy-MD) ---
function formatNumber(num) {
  return String(num).replace(/\d/g, d => `${d}͏`);
}

const durataScudo = {
    scudo: 1 * 60 * 60 * 1000,
    scudo3h: 3 * 60 * 60 * 1000,
    scudo6h: 6 * 60 * 60 * 1000,
    scudo12h: 12 * 60 * 60 * 1000
}

// Discount system (minimal subset)
const discountSystem = {
    discountRanges: [
        { min: 10, max: 25, weight: 50 },
        { min: 30, max: 45, weight: 30 },
        { min: 50, max: 70, weight: 15 },
        { min: 75, max: 90, weight: 5 }
    ],
    durationOptions: [30, 45, 60, 90, 120, 180],
    discountChance: 0.3,
    refreshInterval: 15 * 60 * 1000,
    generateRandomDiscount() {
        const random = Math.random() * 100;
        let weightSum = 0;
        for (const range of this.discountRanges) {
            weightSum += range.weight;
            if (random <= weightSum) return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        }
        return this.discountRanges[0].min;
    },
    generateRandomDuration() {
        return this.durationOptions[Math.floor(Math.random() * this.durationOptions.length)];
    },
    isDiscountValid(discountData) {
        if (!discountData || !discountData.expiresAt) return false;
        return new Date() < new Date(discountData.expiresAt);
    },
    generateDiscounts(shopItems) {
        const discounts = {};
        const now = new Date();
        for (const [category, items] of Object.entries(shopItems)) {
            for (const item of items) {
                if (Math.random() < this.discountChance) {
                    const discount = this.generateRandomDiscount();
                    const duration = this.generateRandomDuration();
                    const expiresAt = new Date(now.getTime() + (duration * 60 * 1000));
                    discounts[item.item] = {
                        percentage: discount,
                        expiresAt: expiresAt.toISOString(),
                        originalPrice: item.price,
                        discountedPrice: Math.floor(item.price * (100 - discount) / 100)
                    };
                }
            }
        }
        return discounts;
    },
    getDiscountedPrice(itemKey, originalPrice, activeDiscounts) {
        const discount = activeDiscounts[itemKey];
        if (!discount || !this.isDiscountValid(discount)) return { price: originalPrice, hasDiscount: false };
        return {
            price: discount.discountedPrice,
            hasDiscount: true,
            discount: discount.percentage,
            originalPrice: originalPrice,
            expiresAt: discount.expiresAt
        };
    },
    formatTimeRemaining(expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const remaining = expiry - now;
        if (remaining <= 0) return null;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
};

// Minimal shop items (copy a subset or full list as needed)
const shopItems = {
    '🧪 POZIONI': [
        { name: 'Pozione Minore (25 HP)', price: 20, item: 'pozioneminore', aliases: ['pozione minore', 'cura minore'] },
        { name: 'Pozione Maggiore (50 HP)', price: 40, item: 'pozionemaggiore', aliases: ['pozione maggiore', 'cura maggiore'] },
        { name: 'Pozione Definitiva (100 HP)', price: 80, item: 'pozionedefinitiva', aliases: ['pozione definitiva', 'cura definitiva'] }
    ],
    '🚗 VEICOLI': [
        { name: 'Macchina 🚗', price: 300, item: 'macchina', aliases: ['auto'] },
        { name: 'Moto 🏍️', price: 200, item: 'moto', aliases: ['motocicletta'] },
        { name: 'Bicicletta 🚴🏻', price: 50, item: 'bici', aliases: ['bicicletta'] }
    ]
};

const CASE = [
  { key: 'monolocale', name: 'Monolocale', price: 500, affitto: 100, intervallo: 3 * 24 * 60 * 60 * 1000, aliases: ['monolocale', 'mono'] },
  { key: 'villa', name: 'Villa', price: 3000, affitto: 600, intervallo: 7 * 24 * 60 * 60 * 1000, aliases: ['villa'] },
  { key: 'castello', name: 'Castello', price: 10000, affitto: 2000, intervallo: 14 * 24 * 60 * 60 * 1000, aliases: ['castello'] }
];

if (!shopItems['🏡 CASE']) {
  shopItems['🏡 CASE'] = CASE.map(c => ({ name: c.name, price: c.price, item: c.key, aliases: c.aliases }));
}

function createAliasMap() {
    const aliasMap = {};
    for (const category of Object.values(shopItems)) {
        for (const item of category) {
            aliasMap[item.item] = { name: item.name, price: item.price, aliases: [item.item, ...(item.aliases || [])] };
        }
    }
    return aliasMap;
}

function getActiveDiscounts() {
    if (!global.shopDiscounts) {
        global.shopDiscounts = { discounts: {}, lastRefresh: 0 };
    }
    const now = Date.now();
    const timeSinceRefresh = now - global.shopDiscounts.lastRefresh;
    if (timeSinceRefresh > discountSystem.refreshInterval || Object.keys(global.shopDiscounts.discounts).length === 0) {
        for (const [key, discount] of Object.entries(global.shopDiscounts.discounts)) {
            if (!discountSystem.isDiscountValid(discount)) delete global.shopDiscounts.discounts[key];
        }
        const newDiscounts = discountSystem.generateDiscounts(shopItems);
        global.shopDiscounts.discounts = { ...global.shopDiscounts.discounts, ...newDiscounts };
        global.shopDiscounts.lastRefresh = now;
    }
    return global.shopDiscounts.discounts;
}

function searchShopItem(query) {
    const results = [];
    const searchTerm = (query || '').toLowerCase();
    const activeDiscounts = getActiveDiscounts();
    for (const [category, items] of Object.entries(shopItems)) {
        for (const item of items) {
            if (item.name.toLowerCase().includes(searchTerm) || item.item.toLowerCase().includes(searchTerm) || (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(searchTerm)))) {
                const priceInfo = discountSystem.getDiscountedPrice(item.item, item.price, activeDiscounts);
                results.push({ item: item.item, name: item.name, category, priceInfo });
            }
        }
    }
    return results;
}

function generateShopText(usedPrefix, balance = 0) {
    const activeDiscounts = getActiveDiscounts();
    let text = `💰 Saldo attuale: ${formatNumber(balance)} 🍬\n\n`;
    for (const [category, items] of Object.entries(shopItems)) {
        text += `**${category}**\n`;
        items.forEach(item => {
            const priceInfo = discountSystem.getDiscountedPrice(item.item, item.price, activeDiscounts);
            if (priceInfo.hasDiscount) text += `• ${item.name} — ~~${formatNumber(priceInfo.originalPrice)}~~ ➜ ${formatNumber(priceInfo.price)}\n`;
            else text += `• ${item.name} — ${formatNumber(priceInfo.price)}\n`;
        });
        text += `\n`;
    }
    text += `Usa ${usedPrefix}compra <oggetto> [quantità]\n`;
    return text;
}

// Entry point converted: Discord-style plugin
async function execute(message, args = [], { client, db, config, usedPrefix = '!' , command = '' } = {}) {
    try {
        const userId = message.author?.id;
        if (!userId) return;
        const aliasMap = createAliasMap();
        let user = db.get(`users.${userId}`) || { limit: 0 };

        // show shop list
        if ((command === 'shop' || command === 'negozio') && args.length === 0) {
            const text = generateShopText(usedPrefix, user.limit || 0);
            await message.channel.send({ content: text });
            return;
        }

        // search shop
        if ((command === 'shop' || command === 'negozio') && args.length > 0) {
            const q = args.join(' ');
            const results = searchShopItem(q);
            if (results.length === 0) {
                await message.reply(`Nessun oggetto trovato per "${q}".`);
                return;
            }
            const lines = results.slice(0, 10).map(r => {
                const p = r.priceInfo;
                return `${r.name} — ${formatNumber(p.price)}${p.hasDiscount ? ` (sconto ${p.discount}%)` : ''}`;
            });
            await message.channel.send({ content: `Risultati per "${q}":\n` + lines.join('\n') });
            return;
        }

        // compra
        if (command === 'compra' || command === 'buy' || command === 'acquista') {
            const itemInput = args[0];
            if (!itemInput) return message.reply('Specifica l\'oggetto da comprare.');
            const quantity = Math.max(1, parseInt(args[1]) || 1);
            const key = itemInput.toLowerCase();
            let found = null;
            for (const [k, v] of Object.entries(aliasMap)) {
                if (k === key || (v.aliases && v.aliases.map(a=>a.toLowerCase()).includes(key))) { found = { key: k, info: v }; break; }
            }
            if (!found) return message.reply('Oggetto non trovato.');
            const priceInfo = discountSystem.getDiscountedPrice(found.key, found.info.price, getActiveDiscounts());
            const total = priceInfo.price * quantity;
            if ((user.limit || 0) < total) return message.reply(`Non hai abbastanza dolci. Servono ${formatNumber(total)}.`);
            user.limit = (user.limit || 0) - total;
            user[found.key] = (user[found.key] || 0) + quantity;
            db.set(`users.${userId}`, user);
            await message.reply(`Hai acquistato ${found.info.name} x${quantity} per ${formatNumber(total)}. Saldo rimanente: ${formatNumber(user.limit)}.`);
            return;
        }

        // vendi
        if (command === 'vendi' || command === 'sell') {
            const itemInput = args[0];
            if (!itemInput) return message.reply('Specifica l\'oggetto da vendere.');
            const quantity = Math.max(1, parseInt(args[1]) || 1);
            const key = itemInput.toLowerCase();
            let foundKey = null;
            for (const [k, v] of Object.entries(aliasMap)) {
                if (k === key || (v.aliases && v.aliases.map(a=>a.toLowerCase()).includes(key))) { foundKey = k; break; }
            }
            if (!foundKey) return message.reply('Oggetto non trovato.');
            if (!user[foundKey] || user[foundKey] < quantity) return message.reply('Non hai abbastanza di questo oggetto.');
            const sellPrice = Math.floor((aliasMap[foundKey].price) * 0.6);
            const total = sellPrice * quantity;
            user[foundKey] -= quantity;
            if (user[foundKey] <= 0) delete user[foundKey];
            user.limit = (user.limit || 0) + total;
            db.set(`users.${userId}`, user);
            await message.reply(`Hai venduto ${aliasMap[foundKey].name} x${quantity} per ${formatNumber(total)}. Saldo: ${formatNumber(user.limit)}.`);
            return;
        }

    } catch (err) {
        console.error('shop execute error', err);
        try { await message.reply('Errore interno del comando shop'); } catch (e) { /* ignore */ }
    }
}

export default { name: 'shop', description: 'Mostra il negozio, acquista o vendi oggetti RPG', category: 'rpg', execute };

// Funzione per pulire automaticamente i dati scaduti (chiamata periodicamente)
setInterval(() => {
    if (global.shopDiscounts && global.shopDiscounts.discounts) {
        let cleaned = false
        for (const [key, discount] of Object.entries(global.shopDiscounts.discounts)) {
            if (!discountSystem.isDiscountValid(discount)) {
                delete global.shopDiscounts.discounts[key]
                cleaned = true
            }
        }
        if (cleaned) {
            console.log('🧹 Sconti scaduti rimossi automaticamente')
        }
    }
}, 5 * 60 * 1000) // Ogni 5 minuti

// Funzione di utilità per admin - forza rigenerazione sconti
global.forceRefreshDiscounts = () => {
    if (global.shopDiscounts) {
        global.shopDiscounts = {
            discounts: {},
            lastRefresh: 0
        }
        console.log('🔄 Sconti rigenerati forzatamente')
        return true
    }
    return false
}