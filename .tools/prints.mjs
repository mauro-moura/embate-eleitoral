// Tira prints do site com o Chromium guardado em .tools/browsers.
// Uso: node .tools/prints.mjs [url] [pasta]   (padrão: https://localhost:8000/  prints/)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(aqui, 'browsers');
const { chromium } = await import('playwright');

const url = process.argv[2] || 'https://localhost:8000/';
const pasta = path.resolve(process.argv[3] || path.join(aqui, '..', 'prints'));

const b = await chromium.launch();
const pronto = (p) => p.waitForFunction(() => document.getElementById('mini-esquerda').textContent !== '--%', null, { timeout: 30000 });

const telas = [['desktop', 1280, 900, '?estilo=kamehameha'], ['celular', 400, 860, '?estilo=kamehameha'],
  ['widget', 480, 240, '?widget&estilo=kamehameha'], ['widget-naruto', 480, 240, '?widget&estilo=naruto']];
for (const [nome, w, h, sufixo] of telas) {
  // ignoreHTTPSErrors: o certificado é da CA local, que o Chromium daqui não conhece.
  const p = await b.newPage({ viewport: { width: w, height: h }, ignoreHTTPSErrors: true });
  p.on('pageerror', (e) => console.log(`[${nome}] erro de JS: ${e.message}`));
  await p.goto(url + sufixo);
  await pronto(p);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: path.join(pasta, `${nome}.png`), fullPage: !nome.startsWith('widget') });
  if (nome === 'desktop') await p.locator('.arena').screenshot({ path: path.join(pasta, 'arena.png') });
  console.log(`${nome}.png`);
}
await b.close();
