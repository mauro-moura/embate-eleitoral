// Gera os ícones do PWA (src/img/icones/) em pixel art, desenhando num canvas 32x32 e
// ampliando sem suavizar. Cores dos lutadores vêm de src/js/eleicao.js.
// Uso: node .tools/icones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(aqui, 'browsers');
const { chromium } = await import('playwright');

const eleicao = fs.readFileSync(path.join(raiz, 'src/js/eleicao.js'), 'utf8');
const saida = path.join(raiz, 'src/img/icones');
fs.mkdirSync(saida, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage();
await p.addScriptTag({ content: eleicao });
const icones = await p.evaluate(() => {
  const { esquerda: L, direita: R } = window.ELEICAO;
  // margem: maskable precisa do desenho dentro do círculo seguro (80% central)
  function desenhar(margem) {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#0d0f1a'; g.fillRect(0, 0, 32, 32);
    const px = (x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(x, y, w, h); };
    const m = margem, meio = 16;
    // rajadas
    px(m, meio - 3, meio - m, 6, L.escura); px(m, meio - 2, meio - m, 4, L.cor); px(m, meio - 1, meio - m, 2, L.clara);
    px(meio, meio - 3, 32 - meio - m, 6, R.escura); px(meio, meio - 2, 32 - meio - m, 4, R.cor); px(meio, meio - 1, 32 - meio - m, 2, R.clara);
    // choque
    px(meio - 4, meio - 4, 8, 8, '#ffb000'); px(meio - 3, meio - 5, 6, 10, '#ffb000'); px(meio - 5, meio - 3, 10, 6, '#ffb000');
    px(meio - 3, meio - 3, 6, 6, '#fff3a0'); px(meio - 1, meio - 1, 2, 2, '#ffffff');
    // faíscas
    for (const [x, y] of [[9, 8], [22, 7], [12, 23], [24, 22], [16, 5], [16, 26]]) {
      const k = (x - 16) * (margem ? 0.8 : 1);
      px(Math.round(16 + k), y + (margem ? (y < 16 ? 2 : -2) : 0), 1, 1, '#ffd23f');
    }
    return c;
  }
  const exportar = (c, tam) => {
    const o = document.createElement('canvas'); o.width = o.height = tam;
    const g = o.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, tam, tam);
    return o.toDataURL('image/png');
  };
  const normal = desenhar(2), maskable = desenhar(6);
  return {
    'icone-192.png': exportar(normal, 192),
    'icone-512.png': exportar(normal, 512),
    'icone-maskable-512.png': exportar(maskable, 512),
    'apple-touch-icon.png': exportar(maskable, 180),
  };
});
for (const [nome, url] of Object.entries(icones)) {
  fs.writeFileSync(path.join(saida, nome), Buffer.from(url.split(',')[1], 'base64'));
  console.log(path.join('src/img/icones', nome));
}
await b.close();
