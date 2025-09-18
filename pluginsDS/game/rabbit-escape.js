import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../lib/utils.js';

const CUSTOM_ID_PREFIX = 'rabbitGame';

// Simple per-user session store
const sessions = new Map();

// NPCs (trust influences story)
const NPCS = {
  lia:   { id: 'lia',   name: 'Lia',   role: 'amica cosplayer' },
  sergio:{ id: 'sergio',name: 'Sergio',role: 'autista notturno' },
  rina:  { id: 'rina',  name: 'Rina',  role: 'rigattiera' },
  marco: { id: 'marco', name: 'Marco', role: 'chitarrista' }
};

// Items (no emoji to avoid encoding issues)
const ITEMS = {
  accendino: { key: 'accendino', name: 'Accendino', desc: 'Accende stoppini e candele.' },
  spray:     { key: 'spray',     name: 'Spray urticante', desc: 'Acceca e rallenta per pochi secondi.' },
  maschera:  { key: 'maschera',  name: 'Maschera', desc: 'Aiuta a confondersi tra la folla.' },
  amuleto:   { key: 'amuleto',   name: 'Amuleto', desc: 'Protegge da presenze ostili.' },
  nota1:     { key: 'nota1',     name: 'Frammento di nota I', desc: 'Un pezzo di storia dimenticata.' },
  nota2:     { key: 'nota2',     name: 'Frammento di nota II', desc: 'Un ricordo scritto a mano.' },
  nota3:     { key: 'nota3',     name: 'Frammento di nota III', desc: 'Una verità che vuole emergere.' }
};

const nodeCollectibles = {
  intro: [], street: [],
  vicolo: ['accendino','spray','nota1'],
  piazza: ['maschera','nota2'],
  rigattiere: ['amuleto','nota3'],
  tetti: [], cimitero: []
};

function getSession(userId) {
  let s = sessions.get(userId);
  if (!s) {
    s = { character: { key: 'protagonist', name: 'Ragazza' }, inventory: {}, flags: {}, npcs: {}, collected: {}, startedAt: Date.now() };
    sessions.set(userId, s);
  }
  return s;
}
function addItem(session, key) { session.inventory[key] = (session.inventory[key] || 0) + 1; }
function hasItem(session, key) { return (session.inventory[key] || 0) > 0; }
function trust(session, id) { session.npcs[id] = session.npcs[id] || { trust: 0, met: false }; return session.npcs[id]; }
function addTrust(session, id, d=1) { const n = trust(session, id); n.trust += d; n.met = true; }
function getTrust(session, id) { return (session.npcs[id]?.trust) || 0; }

// World nodes and options
const NODES = {
  intro: {
    title: 'Notte di Halloween',
    desc: 'Sei una ragazza uscita di casa nella notte di Halloween. Un uomo con maschera da coniglio ti osserva a distanza.',
    options: [
      { id: 'intro_go', label: 'Esci in strada', detail: 'La porta sbatte alle tue spalle.', type: 'node', to: 'street' },
      { id: 'intro_call_lia', label: 'Chiama Lia', detail: 'La tua amica sussurra dalla piazza.', type: 'node', to: 'piazza', effects: s=>addTrust(s,'lia',1) },
      { id: 'intro_watch', label: 'Osserva dalla finestra', detail: 'Scruti il coniglio da lontano.', type: 'node', to: 'street', effects: s=>addItem(s,'nota1') }
    ]
  },
  street: {
    title: 'Strada Principale',
    desc: 'Luci intermittenti, coriandoli e sirene. Il coniglio avanza costante.',
    options: [
      { id: 'str_vicolo', label: 'Svolta nel vicolo', detail: 'Corridoio umido e cassonetti.', type: 'node', to: 'vicolo' },
      { id: 'str_piazza', label: 'Confonditi nella piazza', detail: 'Musica e costumi.', type: 'node', to: 'piazza' },
      { id: 'str_riga', label: 'Entra dal rigattiere', detail: 'Porta cigolante e odore di libri.', type: 'node', to: 'rigattiere' }
    ]
  },
  vicolo: {
    title: 'Il Vicolo',
    desc: 'I muri sudano umidità; i passi dietro di te accelerano.',
    options: [
      { id: 'vic_scala', label: 'Scala antincendio', detail: 'Verso i tetti del cinema.', type: 'node', to: 'vicolo', minigame: { type: 'reflex', timeMs: 5000, success: { type: 'node', to: 'tetti' }, fail: { type: 'ending', to: 'alley_caught' } } },
      { id: 'vic_hide', label: 'Nasconditi dietro i cassonetti', detail: 'Trattieni il fiato.', type: 'ending', to: 'alley_caught' },
      { id: 'vic_fuochi', label: 'Accendi petardi', detail: 'Scintille e rumore.', type: 'ending', to: 'alley_fireworks' }
    ]
  },
  piazza: {
    title: 'Piazza del Festival',
    desc: 'Marionette giganti e bassi distorti. Lia intravede la tua sagoma.',
    options: [
      { id: 'pia_palco', label: 'Sali sul palco e chiedi aiuto', detail: 'Fari puntati e microfoni.', type: 'ending', to: 'crowd_guardian', effects: s=>addTrust(s,'marco',1) },
      { id: 'pia_smaschera', label: 'Affronta e smaschera', detail: 'Se scopri chi è, forse lo fermi.', type: 'node', to: 'piazza', minigame: { type: 'riddle', success: { type: 'ending', to: 'identity_reveal' }, fail: { type: 'ending', to: 'panic_trample' } }, effects: s=>addTrust(s,'lia',1) },
      { id: 'pia_caos', label: 'Apriti un varco', detail: 'Spintoni e caos.', type: 'ending', to: 'panic_trample' }
    ]
  },
  rigattiere: {
    title: 'La Casa del Rigattiere',
    desc: 'Specchi incrinati, librerie traballanti, ombre nelle cornici.',
    options: [
      { id: 'rig_barri', label: 'Blocca la porta', detail: 'Guadagni secondi.', type: 'ending', to: 'house_siege', effects: s=>addTrust(s,'rina',-1) },
      { id: 'rig_botola', label: 'Apri la botola', detail: 'Galleria sotto la strada.', type: 'ending', to: 'house_tunnel_escape', effects: s=>addTrust(s,'rina',1) },
      { id: 'rig_specchi', label: 'Sala degli specchi', detail: 'Riflessi ovunque: muoviti a tempo.', type: 'node', to: 'rigattiere', minigame: { type: 'qte', length: 4, timeMs: 12000, success: { type: 'node', to: 'cimitero' }, fail: { type: 'ending', to: 'mirror_shards' } } }
    ]
  },
  tetti: {
    title: 'Tetti del Cinema',
    desc: 'Ghiaia e antenne. Alcune lastre sembrano sicure, altre rischiose.',
    options: [
      { id: 'tetti_pattern', label: 'Segui il pattern di lastre', detail: 'Memorizza e ripeti la sequenza.', type: 'node', to: 'tetti', minigame: { type: 'pattern', length: 4, timeMs: 20000, success: { type: 'ending', to: 'dawn_rooftops' }, fail: { type: 'ending', to: 'slip_fall' } } }
    ]
  },
  cimitero: {
    title: 'Cimitero Antico',
    desc: 'Cipressi e lapidi. Una lanterna tremola più avanti.',
    options: [
      { id: 'cim_lab', label: 'Segui il sentiero nel labirinto', detail: 'Scegli le direzioni giuste.', type: 'node', to: 'cimitero', minigame: { type: 'maze', length: 5, timeMs: 25000, success: { type: 'ending', to: 'lantern_guide' }, fail: { type: 'ending', to: 'lost_in_mist' } } }
    ]
  }
};

// Endings
const ENDINGS = {
  alley_caught:         { type: 'fail',    title: 'Catturata nel Vicolo',   text: 'Un guanto ti afferra dal buio.' },
  alley_fireworks:      { type: 'fail',    title: 'Fuochi che si Rivoltano', text: 'Le scintille ti accecano per prime.' },
  rooftop_escape:       { type: 'success', title: 'Fuga sui Tetti',          text: 'Attraversi le terrazze e svanisci tra le luci.' },
  crowd_guardian:       { type: 'success', title: 'Scudo di Folla',          text: 'Pubblico e sicurezza ti aprono la via.' },
  identity_reveal:      { type: 'neutral', title: 'Sotto la Maschera',       text: 'Il volto noto che non ti aspettavi.' },
  panic_trample:        { type: 'fail',    title: 'Calpestata dal Caos',     text: 'La marea travolge tutto, anche te.' },
  house_siege:          { type: 'fail',    title: 'Assedio nella Casa',      text: 'Le assi cedono una ad una.' },
  house_tunnel_escape:  { type: 'success', title: 'Galleria Segreta',        text: 'Sbuchi al canale tra barche decorate.' },
  spray_escape:         { type: 'success', title: 'Occhi che Bruciano',      text: 'Lo spray lo acceca: guadagni metri preziosi.' },
  fireworks_escape:     { type: 'success', title: 'Pioggia di Scintille',    text: 'Rumore e fumo aprono un varco.' },
  mask_blend:           { type: 'neutral', title: 'Volto tra i Volti',       text: 'Con la maschera ti confondi nella folla.' },
  truth_unveiled:       { type: 'success', title: 'La Verità',               text: 'I frammenti ricompongono il segreto della città.' },
  slip_fall:            { type: 'fail',    title: 'Scivolata nel Vuoto',     text: 'Un passo falso sul tetto.' },
  dawn_rooftops:        { type: 'success', title: 'Alba sui Tetti',          text: 'La sequenza giusta ti porta al primo chiarore.' },
  mirror_shards:        { type: 'fail',    title: 'Frantumi di Specchi',     text: 'Un riflesso ti tradisce.' },
  lantern_guide:        { type: 'success', title: 'La Lanterna Guida',       text: 'Segui il percorso giusto fuori dal cimitero.' },
  lost_in_mist:         { type: 'fail',    title: 'Persa tra le Nebbie',     text: 'Il labirinto si richiude dietro di te.' }
};

function applyOptionEffects(opt, session) {
  try { if (typeof opt?.effects === 'function') opt.effects(session); } catch {}
}

function getRenderableNode(nodeId, session) {
  const base = NODES[nodeId]; if (!base) return null;
  const node = { title: base.title, desc: base.desc, options: [...base.options] };
  for (const key of (nodeCollectibles[nodeId] || [])) {
    if (!session.collected[`${nodeId}:${key}`]) {
      const it = ITEMS[key]; node.options.push({ id: `collect_${nodeId}_${key}`, label: `Raccogli ${it.name}`, detail: it.desc, type: 'collect', to: key });
    }
  }
  return node;
}

function resolveEnding(baseId, session) {
  if (baseId === 'alley_caught') {
    if (hasItem(session, 'spray')) return 'spray_escape';
    if (hasItem(session, 'amuleto')) return 'mask_blend';
  }
  if (baseId === 'alley_fireworks' && hasItem(session, 'accendino')) return 'fireworks_escape';
  if (baseId === 'panic_trample' && (hasItem(session, 'maschera') || getTrust(session,'marco') >= 1)) return 'crowd_guardian';
  if (baseId === 'identity_reveal') {
    const notes = ['nota1','nota2','nota3'].every(k => hasItem(session, k));
    if (notes && getTrust(session, 'lia') >= 2 && hasItem(session, 'amuleto')) return 'truth_unveiled';
  }
  if (baseId === 'house_siege' && getTrust(session,'rina') >= 1) return 'house_tunnel_escape';
  return baseId;
}

function buildNodeEmbed(nodeId, ctx, user, session) {
  const node = getRenderableNode(nodeId, session);
  const lines = node.options.map(opt => `- ${opt.label} — ${opt.detail}`).join('\n');
  const fields = [];
  fields.push({ name: 'Personaggio', value: `${session.character.name}`, inline: true });
  const inv = Object.entries(session.inventory).map(([k,c])=> `${ITEMS[k]?.name||k}${c>1?` x${c}`:''}`).join(', ');
  fields.push({ name: 'Zaino', value: inv || 'vuoto', inline: true });
  const rel = Object.entries(session.npcs).map(([id,v])=> `${NPCS[id]?.name||id}: ${v.trust>=0?'+':''}${v.trust}`).join(' • ');
  if (rel) fields.push({ name: 'Relazioni', value: rel, inline: false });
  return createEmbed({ color: ctx.config.embedColors.info, title: node.title, description: `${node.desc}\n\n${lines}`, botAvatar: ctx.client.user.displayAvatarURL(), fields, author: { name: `${user.username || user.globalName || 'Giocatrice'} — Fuga di Halloween` } });
}

function buildEndingEmbed(endId, ctx, user) {
  const e = ENDINGS[endId];
  const color = e.type === 'success' ? ctx.config.embedColors.success : e.type === 'fail' ? ctx.config.embedColors.error : ctx.config.embedColors.info;
  return createEmbed({ color, title: e.title, description: e.text, botAvatar: ctx.client.user.displayAvatarURL(), author: { name: `${user.username || user.globalName || 'Giocatrice'} — Epilogo` } });
}

function buildRows(userId, node) {
  const rows = []; let row = new ActionRowBuilder();
  for (const opt of node.options) {
    if (row.components.length === 5) { rows.push(row); row = new ActionRowBuilder(); }
    row.addComponents(new ButtonBuilder().setCustomId(`${CUSTOM_ID_PREFIX}|${userId}|${opt.type}|${opt.to}|${opt.id}`).setLabel(opt.label).setStyle(ButtonStyle.Secondary));
  }
  if (row.components.length) rows.push(row);
  return rows;
}

function buildEndingRows(userId) {
  return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${CUSTOM_ID_PREFIX}|${userId}|restart|intro|restart`).setLabel('Ricomincia').setStyle(ButtonStyle.Secondary))];
}

// Minigames: reflex, riddle, pattern, qte, maze
function buildMinigameEmbed(session, ctx) {
  const mg = session.minigame; if (!mg) return null;
  if (mg.type === 'reflex') return createEmbed({ color: ctx.config.embedColors.warning, title: 'Minigioco — Riflessi', description: `Premi ${mg.target} entro ${Math.round((mg.timeMs||5000)/1000)}s!`, botAvatar: ctx.client.user.displayAvatarURL() });
  if (mg.type === 'riddle') return createEmbed({ color: ctx.config.embedColors.info, title: 'Minigioco — Indovinello', description: mg.riddle.question, botAvatar: ctx.client.user.displayAvatarURL() });
  if (mg.type === 'pattern' || mg.type === 'qte') {
    const step = (mg.index||0) + 1; const total = (mg.sequence||[]).length; const header = mg.type === 'pattern' ? 'Pattern' : 'Sequenza';
    const desc = mg.show ? `Memorizza: ${mg.sequence.join(' ')}` : `Ripeti la sequenza. Progresso ${step-1}/${total}`;
    return createEmbed({ color: ctx.config.embedColors.info, title: `Minigioco — ${header}`, description: desc, botAvatar: ctx.client.user.displayAvatarURL() });
  }
  if (mg.type === 'maze') {
    const step = (mg.index||0) + 1; const total = (mg.path||[]).length;
    return createEmbed({ color: ctx.config.embedColors.info, title: 'Minigioco — Labirinto', description: `Scegli la direzione (N/E/S/O). Progresso ${step-1}/${total}`, botAvatar: ctx.client.user.displayAvatarURL() });
  }
  return null;
}

function buildMinigameButtons(userId, session) {
  const mg = session.minigame; const row = new ActionRowBuilder();
  if (mg.type === 'reflex') { for (const ch of mg.choices) row.addComponents(new ButtonBuilder().setCustomId(`${CUSTOM_ID_PREFIX}|${userId}|mg|${mg.id}|${ch}`).setLabel(ch).setStyle(ButtonStyle.Secondary)); return [row]; }
  if (mg.type === 'riddle') { for (const c of mg.riddle.choices) row.addComponents(new ButtonBuilder().setCustomId(`${CUSTOM_ID_PREFIX}|${userId}|mg|${mg.id}|${c.id}`).setLabel(c.text).setStyle(ButtonStyle.Secondary)); return [row]; }
  if (mg.type === 'pattern' || mg.type === 'qte') { for (const ch of mg.choices) row.addComponents(new ButtonBuilder().setCustomId(`${CUSTOM_ID_PREFIX}|${userId}|mg|${mg.id}|${ch}`).setLabel(ch).setStyle(ButtonStyle.Secondary)); return [row]; }
  if (mg.type === 'maze') { for (const d of ['N','E','S','O']) row.addComponents(new ButtonBuilder().setCustomId(`${CUSTOM_ID_PREFIX}|${userId}|mg|${mg.id}|${d}`).setLabel(d).setStyle(ButtonStyle.Secondary)); return [row]; }
  return [];
}

function startMinigame(interaction, ctx, session, opt) {
  const mg = { id: opt.id, type: opt.minigame.type, startAt: Date.now(), timeMs: opt.minigame.timeMs || 15000, success: opt.minigame.success, fail: opt.minigame.fail };
  if (mg.type === 'reflex') { mg.choices = ['A','B','C','D']; mg.target = mg.choices[Math.floor(Math.random()*mg.choices.length)]; mg.expires = mg.startAt + (mg.timeMs||5000); }
  else if (mg.type === 'riddle') { const bank = { piazza_smaschera: { question: 'Mi indossi per cambiare identità alla festa. Cosa sono?', correct: 'A', choices: [ { id: 'A', text: 'Maschera' }, { id: 'B', text: 'Zucca' }, { id: 'C', text: 'Mantello' } ] } }; mg.riddle = bank[opt.id] || { question: 'Cosa illumina senza bruciare?', correct: 'B', choices: [ { id: 'A', text: 'Cenere' }, { id: 'B', text: 'Luna' }, { id: 'C', text: 'Ghiaccio' } ] }; mg.expires = mg.startAt + (mg.timeMs||15000); }
  else if (mg.type === 'pattern' || mg.type === 'qte') { mg.choices = ['A','B','C','D']; const len = opt.minigame.length || 4; mg.sequence = Array.from({length: len}, ()=> mg.choices[Math.floor(Math.random()*mg.choices.length)]); mg.index = 0; mg.show = true; mg.expires = mg.startAt + (mg.timeMs||20000); }
  else if (mg.type === 'maze') { const dirs = ['N','E','S','O']; const len = opt.minigame.length || 5; mg.path = Array.from({length: len}, ()=> dirs[Math.floor(Math.random()*dirs.length)]); mg.index = 0; mg.expires = mg.startAt + (mg.timeMs||25000); }
  session.minigame = mg; const embed = buildMinigameEmbed(session, ctx); const comps = buildMinigameButtons(interaction.user.id, session); return interaction.update({ embeds: [embed], components: comps, content: '' });
}

function finishMinigame(interaction, ctx, session, answer) {
  const mg = session.minigame; if (!mg) return;
  let ok = false;
  if (mg.type === 'reflex') ok = (Date.now() <= mg.expires) && (answer === mg.target);
  else if (mg.type === 'riddle') ok = (Date.now() <= mg.expires) && (answer === mg.riddle.correct);
  else if (mg.type === 'pattern' || mg.type === 'qte') {
    if (Date.now() <= mg.expires) { const expected = mg.sequence[mg.index]; ok = (answer === expected); if (ok) { mg.index++; mg.show = false; if (mg.index < mg.sequence.length) { session.minigame = mg; const embed = buildMinigameEmbed(session, ctx); const comps = buildMinigameButtons(interaction.user.id, session); return interaction.update({ embeds: [embed], components: comps }); } } }
  } else if (mg.type === 'maze') {
    if (Date.now() <= mg.expires) { const expected = mg.path[mg.index]; ok = (answer === expected); if (ok) { mg.index++; if (mg.index < mg.path.length) { session.minigame = mg; const embed = buildMinigameEmbed(session, ctx); const comps = buildMinigameButtons(interaction.user.id, session); return interaction.update({ embeds: [embed], components: comps }); } } }
  }
  const route = ok ? mg.success : mg.fail; delete session.minigame;
  if (route.type === 'node') return showNode(interaction, route.to, ctx);
  if (route.type === 'ending') { const resolved = resolveEnding(route.to, session); const embed = buildEndingEmbed(resolved, ctx, interaction.user); const components = buildEndingRows(interaction.user.id); return interaction.update({ embeds: [embed], components }); }
}

async function showNode(interaction, nodeId, ctx) {
  const s = getSession(interaction.user.id); const node = getRenderableNode(nodeId, s);
  const embed = buildNodeEmbed(nodeId, ctx, interaction.user, s); const components = buildRows(interaction.user.id, node);
  await interaction.update({ embeds: [embed], components, content: '' });
}

export default {
  name: 'halloweengame', description: 'Gioco a bivi: notte di Halloween.', aliases: ['fuga','coniglio','rabbit'], cooldown: 5,
  async execute(message, args, { client, config }) {
    const s = getSession(message.author.id); s.inventory = {}; s.flags = {}; s.npcs = {}; s.collected = {}; s.startedAt = Date.now();
    const ctx = { client, config }; const node = getRenderableNode('intro', s); const embed = buildNodeEmbed('intro', ctx, message.author, s); const components = buildRows(message.author.id, node);
    await message.reply({ content: 'La storia inizia…', embeds: [embed], components, allowedMentions: { repliedUser: false } });
  },
  async onInteractionCreate(interaction, { client, config }) {
    if (!interaction.isButton()) return; const parts = interaction.customId.split('|'); if (parts.length < 5) return;
    const [prefix, ownerId, type, to, optId] = parts; if (prefix !== CUSTOM_ID_PREFIX) return;
    if (interaction.user.id !== ownerId) { await interaction.reply({ content: 'Solo chi ha avviato la fuga può scegliere.', ephemeral: true }).catch(()=>{}); return; }
    const ctx = { client, config }; const s = getSession(interaction.user.id);
    if (type === 'restart') { s.inventory = {}; s.flags = {}; s.npcs = {}; s.collected = {}; s.startedAt = Date.now(); const node = getRenderableNode('intro', s); const embed = buildNodeEmbed('intro', ctx, interaction.user, s); const components = buildRows(interaction.user.id, node); await interaction.update({ embeds: [embed], components }); return; }
    // Determine current node by title
    const title = interaction.message.embeds?.[0]?.title || ''; const map = Object.fromEntries(Object.entries(NODES).map(([k,v])=>[v.title,k])); const currentNodeId = map[title] || 'intro';
    const node = NODES[currentNodeId]; const opt = (node?.options||[]).find(o=>o.id===optId); if (opt) applyOptionEffects(opt, s);
    if (type === 'collect') { if (ITEMS[to]) { s.collected[`${currentNodeId}:${to}`] = true; addItem(s, to); } await showNode(interaction, currentNodeId, ctx); return; }
    if (type === 'mg') { await finishMinigame(interaction, ctx, s, optId); return; }
    if (type === 'node' && opt?.minigame) { await startMinigame(interaction, ctx, s, opt); return; }
    if (type === 'node') { await showNode(interaction, to, ctx); return; }
    if (type === 'ending') { const resolved = resolveEnding(to, s); const embed = buildEndingEmbed(resolved, ctx, interaction.user); const components = buildEndingRows(interaction.user.id); await interaction.update({ embeds: [embed], components }); return; }
  }
};

