import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ensureChannelSettings, getChannelSettings } from '../../lib/utils.js';
import { getRpgRecord, saveRpgRecord, addInfoWarning } from '../../lib/utils.js';
import { PermissionsBitField } from 'discord.js';

let sharpAvailable = false;
let sharp = null;
try {
  sharp = await import('sharp');
  sharpAvailable = true;
} catch (e) {
  sharpAvailable = false;
}

const processed = new Set();
const TTL = 20 * 1000;

function getImageUrlFromMessage(message) {
  try {
    if (message.attachments && message.attachments.size > 0) {
      const a = message.attachments.find(a => /png|jpe?g|webp|gif/i.test(a.name || a.url || ''));
      if (a) return a.url;
    }
  } catch (_) {}
  try {
    const m = String(message.content || '').match(/https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp)/i);
    if (m) return m[0];
  } catch (_) {}
  return null;
}

async function downloadToTemp(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('download failed');
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = path.join(os.tmpdir(), `autosticker-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  await fs.promises.writeFile(tmp, buf);
  return tmp;
}

async function convertToWebp(inputPath) {
  if (!sharpAvailable) throw new Error('sharp not available');
  const out = `${inputPath}.webp`;
  await sharp.default(inputPath).resize(512, 512, { fit: 'inside' }).webp({ lossless: false, quality: 80 }).toFile(out);
  return out;
}

async function convertToPngBuffer(inputPath) {
  if (!sharpAvailable) throw new Error('sharp not available');
  const buf = await sharp.default(inputPath).resize(512, 512, { fit: 'inside' }).png({ compressionLevel: 9 }).toBuffer();
  return buf;
}

async function onMessageCreate(message, { client, db }) {
  try {
    if (!message || !message.guild || !message.channel) return;
    if (message.author?.bot) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;
    ensureChannelSettings(guildId, channelId, message.channel.name || null);
    const chSettings = getChannelSettings(guildId, channelId) || getChannelSettings(guildId, '__server__') || {};
    if (!chSettings.autosticker) return;

    if (processed.has(message.id)) return;
    processed.add(message.id);
    setTimeout(() => processed.delete(message.id), TTL);

    const imageUrl = getImageUrlFromMessage(message);
    if (!imageUrl) return;

    let tmpPath = null;
    let webpPath = null;
    try {
      tmpPath = await downloadToTemp(imageUrl);
      if (sharpAvailable) {
        webpPath = await convertToWebp(tmpPath);
        // Try to create a temporary guild sticker using a PNG buffer (Discord accepts PNG/APNG/Lottie)
        let sentAsSticker = false;
        try {
          const guild = message.guild;
          const me = guild?.members?.me;
          const canManage = me && (me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) || me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers));
            if (canManage && guild && guild.stickers && typeof guild.stickers.create === 'function') {
            // convert to PNG buffer suitable for sticker upload
            const pngBuffer = await convertToPngBuffer(tmpPath);
            const created = await guild.stickers.create({ name: `auto-${Date.now()}`, file: pngBuffer, tags: 'auto' });
            // send the sticker in channel
            await message.channel.send({ stickers: [created.id] });
            // Persist sticker metadata into rpgDB (user-specific stickers list) and informations DB
            try {
              const userId = message.author.id;
              // rpg record: ensure structure
              const rec = getRpgRecord(userId);
              if (!rec.data) rec.data = {};
              rec.data.stickers = rec.data.stickers || [];
              rec.data.stickers.push({ id: created.id, name: created.name, createdAt: Date.now(), url: created.url || null, guildId: guild.id });
              saveRpgRecord(userId, rec);
              // informations DB: small log entry for the user
              addInfoWarning(userId, { reason: 'autosticker-created', date: Date.now(), channel: message.channel.id, stickerId: created.id, guild: guild.id });
            } catch (persistErr) {
              console.error('autosticker: failed to persist sticker metadata', persistErr);
            }
            // keep the sticker on the guild (do not delete) so it can be saved by users
            sentAsSticker = true;
          }
        } catch (e) {
          // sticker creation failed, fallback to sending file
          sentAsSticker = false;
        }
        if (!sentAsSticker) {
          await message.channel.send({ files: [webpPath] });
        }
      } else {
        // fallback: just re-post the original image
        await message.channel.send({ files: [tmpPath] });
      }
    } catch (e) {
      console.error('autosticker error:', e && e.stack ? e.stack : e);
    } finally {
      try { if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
      try { if (webpPath && fs.existsSync(webpPath)) fs.unlinkSync(webpPath); } catch (_) {}
    }

  } catch (err) {
    console.error('autosticker plugin top-level error', err);
  }
}

export default { onMessageCreate };
