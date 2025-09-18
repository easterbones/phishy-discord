import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '../lib/print.js');

console.log('Reading', file);
const buf = fs.readFileSync(file);
// detect BOM for UTF-16 LE (ff fe) or UTF-16 BE (fe ff) or UTF-8 BOM (ef bb bf)
const hex = buf.slice(0,4).toString('hex');
console.log('leading hex:', hex);
let text;
if (hex.startsWith('fffe')) {
  console.log('Detected UTF-16LE BOM, decoding as utf16le');
  text = buf.toString('utf16le');
} else if (hex.startsWith('feff')) {
  console.log('Detected UTF-16BE BOM, decoding as utf16be');
  // Node doesn't support utf16be directly; swap bytes
  const swapped = Buffer.from(buf);
  for (let i = 0; i + 1 < swapped.length; i += 2) {
    const a = swapped[i]; swapped[i] = swapped[i+1]; swapped[i+1] = a;
  }
  text = swapped.toString('utf16le');
} else if (hex.startsWith('efbb')) {
  console.log('Detected UTF-8 BOM, trimming and decoding');
  text = buf.slice(3).toString('utf8');
} else {
  console.log('No BOM detected, attempting utf8 first');
  text = buf.toString('utf8');
}

// Optionally, ensure consistent line endings
text = text.replace(/\r\n/g, '\n');

console.log('Rewriting file as UTF-8 without BOM');
fs.writeFileSync(file, text, { encoding: 'utf8' });
console.log('Done');
