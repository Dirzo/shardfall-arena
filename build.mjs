/* Builds public/index.html: the game plus the online client. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'game');
const read = f => fs.readFileSync(f, 'utf8');
const parts = ['p2.js', 'p3.js', 'p4.js', 'p5.js', 'p7.js', 'p6.js', 'p8.js'].map(f => read(path.join(SRC, f)));
const head = read(path.join(SRC, 'p1.html'));
const net = read(path.join(here, 'net_client.js'));
/* Bake in a server address for pages hosted somewhere else:
   node build.mjs --server wss://your-app.onrender.com            */
const arg = process.argv.find(a => a.startsWith('--server'));
const server = (arg && (arg.split('=')[1] || process.argv[process.argv.indexOf(arg) + 1])) || process.env.SHARDFALL_SERVER || '';
const cfg = server ? `<script>const SHARDFALL_SERVER = ${JSON.stringify(server)};</script>\n` : '';
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Shardfall Arena — Online</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Grenze+Gotisch:wght@500;700;800&family=Barlow+Semi+Condensed:wght@400;500;600;700&family=Alegreya+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>[hidden]{display:none!important}</style>
${cfg}</head><body>
${head}
<script>
${parts.join('\n;\n')}
;
${net}
;
boot();
</script>
</body></html>`;
fs.mkdirSync(path.join(here, 'public'), { recursive: true });
fs.writeFileSync(path.join(here, 'public', 'index.html'), html);
console.log('built public/index.html', (html.length / 1024).toFixed(0) + ' KB' + (server ? ` (server: ${server})` : ''));
