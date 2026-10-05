// Tira prints do site com o Chromium guardado em .tools/browsers.
// Uso: node .tools/prints.mjs [url] [pasta]   (padrão: http://localhost:8000/  prints/)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(aqui, 'browsers');
const { chromium } = await import('playwright');

const url = process.argv[2] || 'http://localhost:8000/';
const pasta = path.resolve(process.argv[3] || path.join(aqui, '..', 'prints'));

const b = await chromium.launch();
const pronto = (p) => p.waitForFunction(() => document.getElementById('mini-lula').textContent !== '--%', null, { timeout: 30000 });

for (const [nome, w, h, sufixo] of [['desktop', 1280, 900, ''], ['celular', 400, 860, ''], ['widget', 480, 240, '?widget']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => console.log(`[${nome}] erro de JS: ${e.message}`));
  await p.goto(url + sufixo);
  await pronto(p);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: path.join(pasta, `${nome}.png`), fullPage: nome !== 'widget' });
  if (nome === 'desktop') await p.locator('.arena').screenshot({ path: path.join(pasta, 'arena.png') });
  console.log(`${nome}.png`);
}
await b.close();
