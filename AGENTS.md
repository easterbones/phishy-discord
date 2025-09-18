# Repository Guidelines

## Project Structure & Module Organization
- Entry: `main.js` (client + plugin loader), events in `handler.js`.
- Core utilities: `lib/` (DB, logging, auto-fix, leveling).
- Commands/handlers: `pluginsDS/` and `plugins/` grouped by category (e.g., `pluginsDS/tools/ping.js`).
- Config: `config/config.js` (prefixes, IDs, DB path).
- Data: `database/*.json` (runtime state; treat as local data).
- Assets and JSON lists: `src/`.
- Maintenance scripts: `scripts/*.js|mjs` (deploy commands, migrations, checks).
- Examples for failure cases: `test-plugins/`.

## Build, Test, and Development Commands
- Install deps: `npm install`
- Run bot locally: `DISCORD_TOKEN=... node main.js`
- Register slash commands (if used): `node scripts/deploy-commands.js`
- Useful checks: `node scripts/check_tfjs_node.mjs`, `node scripts/test_nsfw.mjs`
- Note: `npm test` is not configured; rely on manual/adhoc scripts above.

## Coding Style & Naming Conventions
- ESM only (`"type": "module"`); use `import`/`export`.
- 4-space indent, single quotes, semicolons.
- Filenames: lowercase kebab-case for plugins (`my-command.js`).
- Plugin shape:
  ```js
  export default {
    name: 'ping', aliases: ['p'], cooldown: 3000,
    permissions: [], guildOnly: false,
    async execute(message, args, ctx) { await message.reply('Pong!'); }
  };
  // Optional hooks (top-level or under default):
  export function onMessageCreate(message) {}
  export function onInteractionCreate(interaction) {}
  ```

## Testing Guidelines
- No formal test suite; validate in a test server.
- Exercise both prefix commands and hooks. Keep changes small and reversible.
- Avoid committing `database/*.json` with real data; regenerate locally when possible.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- Scope by area: `feat(plugins-tools): add ping cooldown`.
- PRs: clear description, linked issue (if any), reproduction steps, screenshots of Discord output when relevant, and notes on config/env changes.

## Security & Configuration Tips
- Never commit tokens. Set `DISCORD_TOKEN` via `.env`/environment. Optional: `TOKEN` is also read.
- Update channel IDs and owners in `config/config.js` for your server.
- Node.js 18+ recommended (Discord.js v14).
