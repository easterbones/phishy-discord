import { readFile } from 'fs/promises';
const pluginPath = new URL('../PhiShy-MD/plugins/antiporno.js', import.meta.url).pathname;
(async () => {
  try {
    const mod = await import(pluginPath);
    const isNSFW = mod.isNSFW || mod.default && mod.default.isNSFW;
    if (!isNSFW) {
      console.error('isNSFW function not exported from plugin at', pluginPath);
      process.exit(2);
    }
    const candidates = [
      new URL('../PhiShy-MD/test.jpg', import.meta.url).pathname,
      new URL('../PhiShy-MD/test.jpg', import.meta.url).pathname.replace('C:/C:', 'C:'),
      new URL('../PhiShy-MD/test.jpg', import.meta.url).pathname.replace('%20', ' '),
    ];
    let buf = null;
    for (const p of candidates) {
      try {
        buf = await readFile(p);
        console.log('Using test image at', p);
        break;
      } catch (e) {
        // continue
      }
    }
    if (!buf) {
      throw new Error('No test image found in candidate paths: ' + candidates.join(', '));
    }
    console.log('Loaded image', imgPath, 'size', buf.length);
    const result = await isNSFW(buf, 0.6);
    console.log('isNSFW result:', result);
  } catch (e) {
    console.error('Test failed:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();