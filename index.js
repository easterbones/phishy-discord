#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';

async function runAnimationIfPresent() {
	return new Promise(async (resolve) => {
		// Clear screen and set up
		process.stdout.write('\x1b[2J\x1b[0f\x1b[?25l'); // Clear + hide cursor
		
		// Phase 1: GIGANTIC Cascading Waterfall Animation
		const height = 25;
		const width = 80;
		const drops = [];
		
		// Initialize random drops
		for (let i = 0; i < 40; i++) {
			drops.push({
				x: Math.floor(Math.random() * width),
				y: Math.floor(Math.random() * height),
				char: Math.random() > 0.5 ? '█' : '▓',
				speed: Math.random() * 2 + 1
			});
		}
		
		// Cascading animation for 120 frames
		for (let frame = 0; frame < 120; frame++) {
			// Clear and create grid
			const grid = Array(height).fill().map(() => Array(width).fill(' '));
			
			// Update and draw drops
			drops.forEach(drop => {
				// Add tail effect
				for (let tail = 0; tail < 8; tail++) {
					const tailY = Math.floor(drop.y - tail);
					if (tailY >= 0 && tailY < height && drop.x >= 0 && drop.x < width) {
						const intensity = Math.max(0, 8 - tail);
						const chars = ['█', '▓', '▒', '░', '▒', '░', '·', ' '];
						grid[tailY][drop.x] = chars[tail] || ' ';
					}
				}
				
				// Move drop down
				drop.y += drop.speed;
				
				// Reset drop if it goes off screen
				if (drop.y > height + 10) {
					drop.y = -Math.random() * 10;
					drop.x = Math.floor(Math.random() * width);
					drop.speed = Math.random() * 2 + 1;
				}
			});
			
			// Render frame
			process.stdout.write('\x1b[H'); // Move to top
			const colors = ['\x1b[36m', '\x1b[34m', '\x1b[35m', '\x1b[32m'];
			const color = colors[Math.floor(frame / 30) % colors.length];
			
			grid.forEach(row => {
				console.log(color + row.join('') + '\x1b[0m');
			});
			
			await sleep(50);
		}
		
		// Fade out effect
		for (let fade = 0; fade < 10; fade++) {
			process.stdout.write('\x1b[2J\x1b[0f');
			const opacity = Math.floor((10 - fade) / 10 * 5);
			const fadeChar = ['█', '▓', '▒', '░', '·'][opacity] || ' ';
			for (let i = 0; i < height / 2; i++) {
				console.log('\x1b[90m' + fadeChar.repeat(width / 2) + '\x1b[0m');
			}
			await sleep(100);
		}
		
		process.stdout.write('\x1b[2J\x1b[0f');
		await sleep(300);
		
		// Phase 2: Animated loading with different spinners
		const spinners = [
			['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
			['◐', '◓', '◑', '◒'],
			['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
			['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']
		];
		
		const colors = ['\x1b[31m', '\x1b[33m', '\x1b[32m', '\x1b[35m']; // Red, Yellow, Green, Magenta
		const messages = ['Inizializzazione...', 'Caricamento moduli...', 'Configurazione bot...', 'Avvio sistema...'];
		
		for (let phase = 0; phase < spinners.length; phase++) {
			const frames = spinners[phase];
			const color = colors[phase];
			const message = messages[phase];
			
			for (let cycle = 0; cycle < 8; cycle++) {
				const frame = frames[cycle % frames.length];
				process.stdout.write(`\r${color}${frame} ${message}\x1b[0m`);
				await sleep(150);
			}
			process.stdout.write(`\r\x1b[32m✓ ${message.replace('...', ' completato!')}\x1b[0m\n`);
			await sleep(300);
		}
		
		// Phase 3: Progress bar animation
		process.stdout.write('\n\x1b[36mCaricamento sistema:\x1b[0m\n');
		const progressChars = '█▉▊▋▌▍▎▏';
		const barLength = 30;
		
		for (let i = 0; i <= barLength; i++) {
			const filled = '█'.repeat(i);
			const empty = '░'.repeat(barLength - i);
			const percent = Math.round((i / barLength) * 100);
			const gradient = percent < 50 ? '\x1b[31m' : percent < 80 ? '\x1b[33m' : '\x1b[32m';
			
			process.stdout.write(`\r${gradient}[${filled}${empty}] ${percent}%\x1b[0m`);
			await sleep(80);
		}
		
		// Phase 4: Final flash effect
		await sleep(200);
		for (let i = 0; i < 3; i++) {
			process.stdout.write('\r\x1b[32m[████████████████████████████████] 100% ✨ PRONTO! ✨\x1b[0m');
			await sleep(150);
			process.stdout.write('\r\x1b[32m[████████████████████████████████] 100% ⭐ PRONTO! ⭐\x1b[0m');
			await sleep(150);
		}
		
		process.stdout.write('\n\n\x1b[35m🚀 PhiShy Discord Bot inizializzato con successo! 🚀\x1b[0m\n');
		process.stdout.write('\x1b[?25h'); // Show cursor again
		await sleep(500);
		resolve();
	});
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
	await runAnimationIfPresent();
	console.log('🚀 Lancio main.js');
	const child = spawn(process.execPath, ['main.js'], { stdio: 'inherit' });
	child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

main().catch(e => { console.error('Launcher error:', e); process.exit(1); });

