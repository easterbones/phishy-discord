# Phishy Discord Bot

This repository contains a Discord bot project (converted from a WhatsApp codebase). It uses discord.js v14 and file-based JSON databases.

Quick start

- Install dependencies:

```powershell
npm install
```

- Run locally (set your token as environment variable):

```powershell
$env:DISCORD_TOKEN = "your_token_here"; node main.js
```

Notes

- The repo contains local JSON databases under `database/` and `PhiShy-MD/database/`; these are intentionally ignored from git to avoid committing runtime or private data.
- Some features (image conversion) require `sharp` which has native binaries. If sharp installation fails on Windows, see sharp docs for troubleshooting.
- Before pushing to a remote, update `config/config.js` with your server-specific IDs and owner settings.
