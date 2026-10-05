'use strict';

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
const CFG = {
  base: 'https://resultados.tse.jus.br/oficial/ele2026',
  // Códigos das eleições presidenciais de 2026 (ver /oficial/comum/config/ele-c.json)
  turnos: { 1: '6257', 2: '6258' },
  refreshMs: 30000,
  // Amplia a diferença na cena (47% x 45% quase não aparece). 1 = proporção real.
  exagero: 4,
  lula: {
    n: '13', cor: '#e8402e', clara: '#ffb199', escura: '#8f1a0f',
    // Sprite opcional: tira horizontal de quadros quadrados, virado para a DIREITA.
    sprite: 'src/img/sprites/lula.png',
  },
  flavio: {
    n: '22', cor: '#2f7bf0', clara: '#a9cbff', escura: '#123b8c',
    sprite: 'src/img/sprites/flavio.png',
  },
};

const UFS = [
  // uf, nome, coluna, linha (posição aproximada no "mapa" em grade)
  ['rr', 'Roraima', 2, 1], ['ap', 'Amapá', 4, 1],
  ['am', 'Amazonas', 2, 2], ['pa', 'Pará', 4, 2], ['ma', 'Maranhão', 5, 2], ['ce', 'Ceará', 6, 2], ['rn', 'Rio Grande do Norte', 7, 2],
  ['ac', 'Acre', 1, 3], ['ro', 'Rondônia', 2, 3], ['to', 'Tocantins', 4, 3], ['pi', 'Piauí', 5, 3], ['pe', 'Pernambuco', 6, 3], ['pb', 'Paraíba', 7, 3],
  ['mt', 'Mato Grosso', 3, 4], ['go', 'Goiás', 4, 4], ['ba', 'Bahia', 5, 4], ['se', 'Sergipe', 6, 4], ['al', 'Alagoas', 7, 4],
  ['ms', 'Mato Grosso do Sul', 3, 5], ['df', 'Distrito Federal', 4, 5], ['mg', 'Minas Gerais', 5, 5], ['es', 'Espírito Santo', 6, 5],
  ['pr', 'Paraná', 3, 6], ['sp', 'São Paulo', 4, 6], ['rj', 'Rio de Janeiro', 5, 6],
  ['sc', 'Santa Catarina', 3, 7],
  ['rs', 'Rio Grande do Sul', 3, 8], ['zz', 'Exterior', 7, 8],
].map(([uf, nome, col, lin]) => ({ uf, nome, col, lin }));

// ---------------------------------------------------------------------------
// Dados do TSE
// ---------------------------------------------------------------------------
const num = (s) => parseFloat(String(s ?? '0').replace(',', '.')) || 0;
const fmtPct = (x) => x.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
const fmtInt = (x) => x.toLocaleString('pt-BR');

function urlResultado(turno, uf) {
  const ele = CFG.turnos[turno];
  return `${CFG.base}/${ele}/dados/${uf}/${uf}-c0001-e${ele.padStart(6, '0')}-u.json`;
}

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) {
    const e = new Error(`HTTP ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

function parseResultado(j) {
  const cands = [];
  const carg = (j.carg || [])[0] || {};
  for (const a of carg.agr || []) {
    for (const p of a.par || []) {
      for (const c of p.cand || []) {
        cands.push({
          n: c.n, nome: c.nmu, partido: p.sg,
          votos: +c.vap || 0, pct: num(c.pvapn),
          eleito: c.e === 's', situacao: c.st || '',
        });
      }
    }
  }
  cands.sort((a, b) => b.votos - a.votos);
  const byN = Object.fromEntries(cands.map((c) => [c.n, c]));
  const s = j.s || {}, v = j.v || {}, e = j.e || {};
  return {
    cands,
    lula: byN[CFG.lula.n] || { votos: 0, pct: 0 },
    flavio: byN[CFG.flavio.n] || { votos: 0, pct: 0 },
    apurado: num(s.pstn),
    data: j.dg, hora: j.hg,
    totalizado: j.tf === 's',
    brancos: num(v.pvbn), nulos: num(v.ptvnn), abstencao: num(e.pan),
  };
}

// ---------------------------------------------------------------------------
// Estado + carregamento
// ---------------------------------------------------------------------------
const estado = {
  escolha: 'auto',   // 'auto' | '1' | '2'
  turno: null,
  br: null,
  ufs: {},
};

async function carregar() {
  const meta = document.getElementById('meta');
  try {
    let turno = estado.escolha === 'auto' ? null : +estado.escolha;
    let br = null;
    if (!turno) {
      // Se o arquivo do 2º turno já existe, ele manda; senão, 1º turno.
      try { br = await getJSON(urlResultado(2, 'br')); turno = 2; }
      catch (e) { if (e.status && e.status < 500) turno = 1; else throw e; }
    }
    if (!br) br = await getJSON(urlResultado(turno, 'br'));

    estado.turno = turno;
    estado.br = parseResultado(br);

    const res = await Promise.allSettled(UFS.map((u) => getJSON(urlResultado(turno, u.uf))));
    estado.ufs = {};
    res.forEach((r, i) => { if (r.status === 'fulfilled') estado.ufs[UFS[i].uf] = parseResultado(r.value); });

    meta.classList.remove('erro');
    render();
  } catch (e) {
    meta.classList.add('erro');
    meta.textContent = e.status === 404 || e.status === 403
      ? `Ainda não há dados do ${estado.escolha}º turno no TSE.`
      : `Falha ao buscar dados do TSE (${e.message}). Tentando de novo em ${CFG.refreshMs / 1000}s…`;
  }
}

// ---------------------------------------------------------------------------
// Render HTML
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function render() {
  const b = estado.br;
  const { lula, flavio } = b;

  $('pct-lula').textContent = fmtPct(lula.pct);
  $('pct-flavio').textContent = fmtPct(flavio.pct);
  $('votos-lula').textContent = fmtInt(lula.votos) + ' votos';
  $('votos-flavio').textContent = fmtInt(flavio.votos) + ' votos';
  $('barra-lula').style.width = Math.min(100, lula.pct) + '%';
  $('barra-flavio').style.width = Math.min(100, flavio.pct) + '%';

  $('apurado').textContent = fmtPct(b.apurado);
  $('barra-apurado').style.width = b.apurado + '%';
  $('meta').textContent = `${estado.turno}º turno · atualizado pelo TSE em ${b.data} às ${b.hora}`
    + (b.totalizado ? ' · totalização encerrada' : '');

  const outros = b.cands.filter((c) => c.n !== CFG.lula.n && c.n !== CFG.flavio.n && c.votos > 0);
  const extras = outros.map((c) => `<span>${c.nome}: <b>${fmtPct(c.pct)}</b></span>`);
  extras.push(`<span>Brancos: <b>${fmtPct(b.brancos)}</b></span>`, `<span>Nulos: <b>${fmtPct(b.nulos)}</b></span>`,
    `<span>Abstenção: <b>${fmtPct(b.abstencao)}</b></span>`);
  $('extras').innerHTML = extras.join('');

  // Faixa de vencedor / situação
  const faixa = $('faixa');
  const eleito = b.cands.find((c) => c.eleito);
  // O TSE não marca "2º turno" no campo de situação; deduz pela apuração completa sem ninguém > 50%.
  const vaiPro2 = estado.turno === 1 && b.apurado >= 99.99 && !b.cands.some((c) => c.pct > 50);
  if (eleito) { faixa.textContent = `${eleito.nome} VENCEU!`; faixa.hidden = false; }
  else if (vaiPro2) { faixa.textContent = 'VAI TER 2º ROUND!'; faixa.hidden = false; }
  else faixa.hidden = true;

  const fatia = lula.votos + flavio.votos > 0 ? lula.votos / (lula.votos + flavio.votos) : 0.5;
  cena.alvo = Math.min(0.92, Math.max(0.08, 0.5 + (fatia - 0.5) * CFG.exagero));
  cena.vivo = true;

  renderEstados();
}

function corLider(c, margem) {
  // Quanto maior a vantagem, mais saturado o tile.
  const base = c.n === CFG.lula.n ? CFG.lula : c.n === CFG.flavio.n ? CFG.flavio : null;
  const t = Math.min(1, 0.35 + margem / 25);
  if (!base) return `rgba(150,150,150,${t})`;
  const [r, g, bl] = base.cor.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${bl},${t})`;
}

function renderEstados() {
  const mapa = $('mapa');
  const linhas = [];
  let vL = 0, vF = 0;
  mapa.innerHTML = '';

  for (const u of UFS) {
    const r = estado.ufs[u.uf];
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.style.gridColumn = u.col;
    tile.style.gridRow = u.lin;

    if (!r || !r.cands.length || r.cands[0].votos === 0) {
      tile.classList.add('sem');
      tile.innerHTML = `<b>${u.uf.toUpperCase()}</b><span>—</span>`;
      tile.title = `${u.nome}: sem votos apurados`;
      linhas.push(`<tr><td>${u.uf.toUpperCase()}</td><td>${u.nome}</td><td>${r ? fmtPct(r.apurado) : '—'}</td><td>—</td><td>—</td><td>—</td></tr>`);
      mapa.appendChild(tile);
      continue;
    }

    const [lid, seg] = r.cands;
    const margem = lid.pct - (seg ? seg.pct : 0);
    if (u.uf !== 'zz') {
      if (lid.n === CFG.lula.n) vL++;
      else if (lid.n === CFG.flavio.n) vF++;
    }
    tile.style.background = corLider(lid, margem);
    tile.innerHTML = `<b>${u.uf.toUpperCase()}</b><span>${lid.pct.toFixed(0)}%</span>`;
    tile.title = `${u.nome} — ${fmtPct(r.apurado)} apurado\nLula ${fmtPct(r.lula.pct)} · Flávio ${fmtPct(r.flavio.pct)}`;
    mapa.appendChild(tile);

    const mini = (c, cor) => `<span class="mini"><i style="width:${c.pct}%;background:${cor}"></i></span>${fmtPct(c.pct)}`;
    linhas.push(`<tr>
      <td>${u.uf.toUpperCase()}</td><td>${u.nome}</td><td>${fmtPct(r.apurado)}</td>
      <td>${mini(r.lula, CFG.lula.cor)}</td><td>${mini(r.flavio, CFG.flavio.cor)}</td>
      <td><span class="lider" style="background:${corLider(lid, 99)}">${lid.nome.split(' ')[0]}</span> +${margem.toFixed(margem < 1 ? 2 : 1)}<span class="pp"> pp</span></td>
    </tr>`);
  }

  $('tabela').innerHTML = linhas.join('');
  $('contagem').innerHTML = `<span class="l">Lula na frente em ${vL}</span> · <span class="f">Flávio na frente em ${vF}</span> (de 27 UFs)`;
}

// ---------------------------------------------------------------------------
// Cena do embate (canvas em baixa resolução, ampliado com pixelated)
// ---------------------------------------------------------------------------
const canvas = $('arena');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, CHAO = 138;
const X_LULA = 46, X_FLAVIO = W - 46;

const cena = {
  alvo: 0.5,     // fatia do Lula entre os dois (0..1)
  p: 0.5,        // valor animado
  vivo: false,   // false até chegar o primeiro dado
  particulas: [],
  sprites: { lula: null, flavio: null },
};

const VISUAL = {
  lula: {
    terno: '#26335f', ternoEsc: '#18213f', camisa: '#f3f3f3', gravata: '#d4202a', calca: '#1f2a50',
    pele: '#e0a77f', peleEsc: '#b97d58', cabelo: '#cfd0d4', barba: '#e8e8ea', oculos: true, broche: '#d4202a',
  },
  flavio: {
    terno: '#2b2f3c', ternoEsc: '#1b1e28', camisa: '#f3f3f3', gravata: '#1ea84a', calca: '#22252f',
    pele: '#f0bf98', peleEsc: '#c9906b', cabelo: '#2a1d14', barba: null, oculos: false, broche: '#2f7bf0',
  },
};

// Carrega sprite opcional; magenta (#FF00FF) vira transparente (chroma key).
function carregarSprite(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = img.width; off.height = img.height;
      const o = off.getContext('2d');
      o.drawImage(img, 0, 0);
      try {
        const d = o.getImageData(0, 0, off.width, off.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const [r, g, b] = [d.data[i], d.data[i + 1], d.data[i + 2]];
          if (r > 180 && b > 180 && g < 90) d.data[i + 3] = 0;
        }
        o.putImageData(d, 0, 0);
      } catch { /* aberto via file:// — sem chroma key, usa PNG transparente */ }
      resolve({ img: off, quadros: Math.max(1, Math.round(img.width / img.height)) });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// --- Cenário (desenhado uma vez) ---
const fundo = document.createElement('canvas');
fundo.width = W; fundo.height = H;
(function desenharFundo() {
  const g = fundo.getContext('2d');
  const faixas = ['#0b0d24', '#141641', '#1f1d57', '#2f2266', '#47286e', '#6a2f6c', '#8f3a62'];
  const alt = Math.ceil(100 / faixas.length);
  faixas.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * alt, W, alt); });
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#fff';
  for (let i = 0; i < 50; i++) g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 60), 1, 1);
  // montanhas
  g.fillStyle = '#2a1f4a';
  for (let x = 0; x < W; x++) {
    const h = 22 + Math.sin(x * 0.045) * 9 + Math.sin(x * 0.13) * 4;
    g.fillRect(x, 100 - h, 1, h + 40);
  }
  g.fillStyle = '#1c1636';
  for (let x = 0; x < W; x++) {
    const h = 12 + Math.sin(x * 0.07 + 2) * 6 + Math.sin(x * 0.21) * 2;
    g.fillRect(x, 112 - h, 1, h + 40);
  }
  // bandeira do Brasil ao fundo
  const bx = W / 2 - 15, by = 18;
  g.fillStyle = '#555'; g.fillRect(bx - 2, by, 1, 50);
  g.fillStyle = '#119c3f'; g.fillRect(bx, by, 30, 20);
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.moveTo(bx + 15, by + 2); g.lineTo(bx + 28, by + 10); g.lineTo(bx + 15, by + 18); g.lineTo(bx + 2, by + 10); g.fill();
  g.fillStyle = '#1b3b9a'; g.beginPath(); g.arc(bx + 15, by + 10, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.fillRect(bx + 10, by + 9, 10, 1);
  // chão
  g.fillStyle = '#3b3550'; g.fillRect(0, CHAO, W, H - CHAO);
  g.fillStyle = '#4f4868'; g.fillRect(0, CHAO, W, 2);
  g.fillStyle = '#2d2840';
  for (let x = 0; x < W; x += 16) g.fillRect(x + ((x / 16) % 2) * 8, CHAO + 8, 8, 2);
  for (let x = 4; x < W; x += 24) g.fillRect(x, CHAO + 16, 10, 2);
})();

// --- Lutador procedural (virado para a direita quando dir = 1) ---
function desenharLutador(v, x, dir, braco, grossura, t) {
  const bob = Math.round(Math.sin(t * 7 + (dir > 0 ? 0 : 1.5)) * 0.8);
  const y = CHAO;
  const r = (dx, dy, w, h, c) => {
    ctx.fillStyle = c;
    const px = dir > 0 ? x + dx : x - dx - w;
    ctx.fillRect(Math.round(px), Math.round(y + dy), w, h);
  };
  const by = (dy) => dy + bob; // parte de cima balança

  // pernas em base de luta
  r(-11, -19, 5, 17, v.calca); r(-13, -2, 8, 2, '#111');
  r(4, -19, 5, 17, v.calca); r(4, -2, 9, 2, '#111');
  // tronco
  r(-8, by(-38), 16, 20, v.terno);
  r(-8, by(-38), 3, 20, v.ternoEsc);
  r(-1, by(-38), 5, 7, v.camisa);
  r(1, by(-37), 2, 9, v.gravata);
  r(-5, by(-33), 3, 3, v.broche);
  // pescoço e cabeça
  r(-2, by(-41), 5, 3, v.peleEsc);
  r(-5, by(-52), 11, 11, v.pele);
  r(-4, by(-48), 2, 3, v.peleEsc); // orelha
  r(-6, by(-54), 12, 4, v.cabelo);
  r(-6, by(-51), 3, 5, v.cabelo);
  if (v.barba) { r(-1, by(-45), 8, 5, v.barba); r(3, by(-44), 3, 1, '#9c5a48'); }
  else { r(4, by(-44), 2, 1, '#8a4636'); }
  r(4, by(-49), 3, 1, v.cabelo === '#2a1d14' ? v.cabelo : '#8d8d8d'); // sobrancelha
  r(5, by(-48), 1, 1, '#111'); // olho
  if (v.oculos) { r(3, by(-48), 4, 1, '#222'); r(3, by(-47), 1, 1, '#222'); r(6, by(-47), 1, 1, '#222'); }
  // braços estendidos: COMPRIMENTO e GROSSURA dependem da porcentagem
  r(3, by(-35), braco, grossura, v.terno);
  r(3, by(-35 + grossura), braco, Math.max(2, grossura - 1), v.ternoEsc);
  r(3 + braco, by(-36), 4, grossura * 2 + 1, v.pele);
  r(3 + braco + 3, by(-35), 1, grossura * 2 - 1, v.peleEsc);
  return { x: x + dir * (3 + braco + 5), y: y + by(-35 + grossura) };
}

function desenharSprite(s, x, dir, escala, t) {
  const q = Math.floor(t * 8) % s.quadros;
  const lado = s.img.height;
  const tam = Math.round(64 * escala);
  ctx.save();
  ctx.translate(x, CHAO);
  ctx.scale(dir, 1);
  ctx.drawImage(s.img, q * lado, 0, lado, lado, -tam / 2, -tam, tam, tam);
  ctx.restore();
  // mãos assumidas na borda frontal, ~55% da altura
  return { x: x + dir * (tam / 2 - 4), y: CHAO - tam * 0.55 };
}

// --- Rajada de energia de (x0) até (x1) ---
function desenharRajada(x0, x1, y, grossura, cfg, t) {
  const ini = Math.min(x0, x1), fim = Math.max(x0, x1);
  for (let x = ini; x < fim; x += 2) {
    const onda = Math.sin(x * 0.35 - t * 30 * Math.sign(x1 - x0)) * 1.2;
    const h = grossura + onda;
    ctx.fillStyle = cfg.escura; ctx.fillRect(x, Math.round(y - h / 2 - 2), 2, Math.round(h + 4));
    ctx.fillStyle = cfg.cor; ctx.fillRect(x, Math.round(y - h / 2), 2, Math.round(h));
    ctx.fillStyle = cfg.clara; ctx.fillRect(x, Math.round(y - h / 4), 2, Math.max(1, Math.round(h / 2)));
  }
  // bola nas mãos
  const rb = grossura / 2 + 2 + Math.sin(t * 25) * 0.8;
  bola(x0, y, rb, cfg);
}

function bola(x, y, raio, cfg) {
  ctx.fillStyle = cfg.escura; ctx.beginPath(); ctx.arc(x, y, raio + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(x, y, raio, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, raio * 0.5, 0, Math.PI * 2); ctx.fill();
}

function aura(x, cfg, forca, t) {
  // Chama: colunas mais altas no centro, com labaredas tremendo.
  const h = 48 + 26 * forca, meia = Math.round(13 + 9 * forca);
  for (const [alfa, enc, cor] of [[0.22, 1, cfg.cor], [0.3, 0.6, cfg.clara]]) {
    ctx.globalAlpha = alfa;
    ctx.fillStyle = cor;
    const m = Math.round(meia * enc);
    for (let dx = -m; dx <= m; dx += 2) {
      const forma = Math.sqrt(1 - (dx / (m + 1)) ** 2);
      const lab = Math.sin(dx * 0.9 + t * 18) * 4 + Math.sin(dx * 0.37 - t * 11) * 3;
      const lh = Math.max(0, Math.round((h * enc) * forma + lab));
      ctx.fillRect(Math.round(x + dx), CHAO - lh, 2, lh);
    }
  }
  ctx.globalAlpha = 1;
}

let t0 = performance.now();
function quadro(agora) {
  const t = (agora - t0) / 1000;
  cena.p += (cena.alvo - cena.p) * 0.03;
  const pL = cena.p, pF = 1 - cena.p;

  const tremor = cena.vivo ? Math.round(Math.sin(t * 45) * 0.6) : 0;
  ctx.setTransform(1, 0, 0, 1, tremor, 0);
  ctx.drawImage(fundo, 0, 0);

  aura(X_LULA, CFG.lula, pL, t);
  aura(X_FLAVIO, CFG.flavio, pF, t + 1);

  // Braço vai de 4px (0%) a 26px (100% entre os dois); grossura de 2 a 6.
  const bracoL = Math.round(4 + 22 * pL), bracoF = Math.round(4 + 22 * pF);
  const grossL = Math.round(2 + 4 * pL), grossF = Math.round(2 + 4 * pF);

  const mL = cena.sprites.lula
    ? desenharSprite(cena.sprites.lula, X_LULA, 1, 0.85 + 0.3 * pL, t)
    : desenharLutador(VISUAL.lula, X_LULA, 1, bracoL, grossL, t);
  const mF = cena.sprites.flavio
    ? desenharSprite(cena.sprites.flavio, X_FLAVIO, -1, 0.85 + 0.3 * pF, t)
    : desenharLutador(VISUAL.flavio, X_FLAVIO, -1, bracoF, grossF, t);

  if (cena.vivo) {
    const yB = Math.round((mL.y + mF.y) / 2);
    // Ponto de choque: quem tem mais voto empurra o encontro para o lado do outro.
    const choque = Math.round(mL.x + (mF.x - mL.x) * pL + Math.sin(t * 3) * 1.5);
    desenharRajada(mL.x, choque, yB, 3 + 9 * pL, CFG.lula, t);
    desenharRajada(mF.x, choque, yB, 3 + 9 * pF, CFG.flavio, t);

    // explosão no ponto de choque
    const rc = 8 + Math.sin(t * 18) * 2;
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(choque, yB, rc + 6, 0, Math.PI * 2); ctx.fill();
    bola(choque, yB, rc, { escura: '#ffb000', cor: '#fff3a0' });

    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, vel = 0.6 + Math.random() * 1.8;
      cena.particulas.push({
        x: choque, y: yB, vx: Math.cos(a) * vel, vy: Math.sin(a) * vel - 0.3, vida: 30 + Math.random() * 20,
        cor: [CFG.lula.clara, CFG.flavio.clara, '#fff', '#ffd23f'][i % 4],
      });
    }
  }

  cena.particulas = cena.particulas.filter((s) => s.vida-- > 0);
  for (const s of cena.particulas) {
    s.x += s.vx; s.y += s.vy; s.vy += 0.04;
    ctx.fillStyle = s.cor; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
  }

  requestAnimationFrame(quadro);
}

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------
document.querySelectorAll('.turnos button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.turnos button').forEach((b) => b.classList.toggle('ativo', b === btn));
    estado.escolha = btn.dataset.turno;
    carregar();
  });
});

Promise.all([carregarSprite(CFG.lula.sprite), carregarSprite(CFG.flavio.sprite)]).then(([l, f]) => {
  cena.sprites.lula = l;
  cena.sprites.flavio = f;
});

requestAnimationFrame(quadro);
carregar();
setInterval(carregar, CFG.refreshMs);
