'use strict';

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
// Eleição, candidatos e visual ficam em src/js/eleicao.js.
const CFG = {
  ...window.ELEICAO,
  refreshMs: 30000,
  // Amplia a diferença na cena (47% x 45% quase não aparece). 1 = proporção real.
  exagero: 4,
};
const TITULO = 'Embate Eleitoral';

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
  return `${CFG.base}/${ele}/dados/${uf}/${uf}-c${CFG.cargo}-e${ele.padStart(6, '0')}-u.json`;
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
          // "e" = 's' NÃO quer dizer eleito: após a totalização o TSE marca assim também quem
          // vai ao 2º turno. Quem decide é a situação: "Eleito", "2º turno", "Não eleito"...
          eleito: /^eleito/i.test(c.st || ''), segundoTurno: /2º turno/i.test(c.st || ''),
          situacao: c.st || '',
        });
      }
    }
  }
  cands.sort((a, b) => b.votos - a.votos);
  const byN = Object.fromEntries(cands.map((c) => [c.n, c]));
  const s = j.s || {}, v = j.v || {}, e = j.e || {};
  return {
    cands,
    esquerda: byN[CFG.esquerda.numero] || { votos: 0, pct: 0 },
    direita: byN[CFG.direita.numero] || { votos: 0, pct: 0 },
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
// Referências guardadas no início: elementos levados para a janela do widget
// deixam de ser encontrados por document.getElementById da página principal.
const ELS = Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));
const $ = (id) => ELS[id];

function render() {
  const b = estado.br;
  const { esquerda, direita } = b;

  $('pct-esquerda').textContent = fmtPct(esquerda.pct);
  $('pct-direita').textContent = fmtPct(direita.pct);
  $('votos-esquerda').textContent = fmtInt(esquerda.votos) + ' votos';
  $('votos-direita').textContent = fmtInt(direita.votos) + ' votos';
  $('barra-esquerda').style.width = Math.min(100, esquerda.pct) + '%';
  $('barra-direita').style.width = Math.min(100, direita.pct) + '%';

  $('apurado').textContent = fmtPct(b.apurado);
  $('barra-apurado').style.width = b.apurado + '%';
  $('meta').textContent = `${estado.turno}º turno · atualizado pelo TSE em ${b.data} às ${b.hora}`
    + (b.totalizado ? ' · totalização encerrada' : '');

  const outros = b.cands.filter((c) => c.n !== CFG.esquerda.numero && c.n !== CFG.direita.numero && c.votos > 0);
  const extras = outros.map((c) => `<span>${c.nome}: <b>${fmtPct(c.pct)}</b></span>`);
  extras.push(`<span>Brancos: <b>${fmtPct(b.brancos)}</b></span>`, `<span>Nulos: <b>${fmtPct(b.nulos)}</b></span>`,
    `<span>Abstenção: <b>${fmtPct(b.abstencao)}</b></span>`);
  $('extras').innerHTML = extras.join('');

  $('mini-esquerda').textContent = fmtPct(esquerda.pct);
  $('mini-direita').textContent = fmtPct(direita.pct);
  $('mini-apurado').textContent = `${fmtPct(b.apurado)} apurado`;

  // Faixa de vencedor / situação
  const faixa = $('faixa');
  const eleito = b.cands.find((c) => c.eleito);
  // 2º turno: o TSE marca na situação após totalizar; antes disso, deduz pela apuração completa
  // sem ninguém com mais de 50% dos válidos (50% + 1 elege no 1º turno).
  const vaiPro2 = estado.turno === 1 && !eleito && (b.cands.some((c) => c.segundoTurno)
    || (b.apurado >= 99.99 && !b.cands.some((c) => c.pct > 50)));
  if (eleito) { faixa.textContent = `${eleito.nome} VENCEU!`; faixa.hidden = false; }
  else if (vaiPro2) { faixa.textContent = 'VAI TER 2º ROUND!'; faixa.hidden = false; }
  else faixa.hidden = true;
  api.faixa = faixa.hidden ? '' : faixa.textContent;
  api.pctEsq = esquerda.pct; api.pctDir = direita.pct; api.apurado = b.apurado;

  const fatia = esquerda.votos + direita.votos > 0 ? esquerda.votos / (esquerda.votos + direita.votos) : 0.5;
  cena.alvo = Math.min(0.92, Math.max(0.08, 0.5 + (fatia - 0.5) * CFG.exagero));
  cena.vivo = true;

  renderEstados();
}

function corLider(c, margem) {
  // Quanto maior a vantagem, mais saturado o tile.
  const base = c.n === CFG.esquerda.numero ? CFG.esquerda : c.n === CFG.direita.numero ? CFG.direita : null;
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
      if (lid.n === CFG.esquerda.numero) vL++;
      else if (lid.n === CFG.direita.numero) vF++;
    }
    tile.style.background = corLider(lid, margem);
    tile.innerHTML = `<b>${u.uf.toUpperCase()}</b><span>${lid.pct.toFixed(0)}%</span>`;
    tile.title = `${u.nome} — ${fmtPct(r.apurado)} apurado\n${CFG.esquerda.nome} ${fmtPct(r.esquerda.pct)} · ${CFG.direita.nome} ${fmtPct(r.direita.pct)}`;
    mapa.appendChild(tile);

    const mini = (c, cor) => `<span class="mini"><i style="width:${c.pct}%;background:${cor}"></i></span>${fmtPct(c.pct)}`;
    linhas.push(`<tr>
      <td>${u.uf.toUpperCase()}</td><td>${u.nome}</td><td>${fmtPct(r.apurado)}</td>
      <td>${mini(r.esquerda, CFG.esquerda.cor)}</td><td>${mini(r.direita, CFG.direita.cor)}</td>
      <td><span class="lider" style="background:${corLider(lid, 99)}">${lid.nome.split(' ')[0]}</span> +${margem.toFixed(margem < 1 ? 2 : 1)}<span class="pp"> pp</span></td>
    </tr>`);
  }

  $('tabela').innerHTML = linhas.join('');
  $('contagem').innerHTML = `<span class="l">${CFG.esquerda.nome} na frente em ${vL}</span>`
    + ` · <span class="f">${CFG.direita.nome} na frente em ${vF}</span> (de 27 UFs)`;
}

// ---------------------------------------------------------------------------
// Cena do embate (canvas em baixa resolução, ampliado com pixelated)
// ---------------------------------------------------------------------------
const canvas = $('arena');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, CHAO = 138;

const cena = {
  alvo: 0.5,     // fatia do lutador da esquerda entre os dois (0..1)
  p: 0.5,        // valor animado
  vivo: false,   // false até chegar o primeiro dado
  particulas: [],
  sprites: { esquerda: null, direita: null },
  estilo: 'kamehameha',
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

// --- Lutador procedural (virado para a direita quando dir = 1) ---
// pose 'dois': os dois braços à frente; 'um': só o da frente, o outro recolhido.
function desenharLutador(v, x, dir, braco, grossura, t, pose, chao = CHAO) {
  const bob = Math.round(Math.sin(t * 7 + (dir > 0 ? 0 : 1.5)) * 0.8);
  const y = chao;
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
  r(4, by(-49), 3, 1, v.sobrancelha);
  r(5, by(-48), 1, 1, '#111'); // olho
  if (v.oculos) { r(3, by(-48), 4, 1, '#222'); r(3, by(-47), 1, 1, '#222'); r(6, by(-47), 1, 1, '#222'); }
  // braços estendidos: COMPRIMENTO e GROSSURA dependem da porcentagem
  r(3, by(-35), braco, grossura, v.terno);
  if (pose === 'um') {
    r(-11, by(-35), 4, 10, v.ternoEsc); // braço de trás, recolhido
    r(-11, by(-25), 4, 3, v.peleEsc);
  } else {
    r(3, by(-35 + grossura), braco, Math.max(2, grossura - 1), v.ternoEsc);
  }
  r(3 + braco, by(-36), 4, grossura * 2 + 1, v.pele);
  r(3 + braco + 3, by(-35), 1, grossura * 2 - 1, v.peleEsc);
  return { x: x + dir * (3 + braco + 5), y: y + by(-35 + grossura) };
}

function desenharSprite(s, x, dir, escala, t, chao = CHAO) {
  const q = Math.floor(t * 8) % s.quadros;
  const lado = s.img.height;
  const tam = Math.round(64 * escala);
  ctx.save();
  ctx.translate(x, chao);
  ctx.scale(dir, 1);
  ctx.drawImage(s.img, q * lado, 0, lado, lado, -tam / 2, -tam, tam, tam);
  ctx.restore();
  // mãos assumidas na borda frontal, ~55% da altura
  return { x: x + dir * (tam / 2 - 4), y: chao - tam * 0.55 };
}

function bola(x, y, raio, cfg) {
  ctx.fillStyle = cfg.escura; ctx.beginPath(); ctx.arc(x, y, raio + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(x, y, raio, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, raio * 0.5, 0, Math.PI * 2); ctx.fill();
}

function aura(x, cfg, forca, t, chao = CHAO) {
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
      ctx.fillRect(Math.round(x + dx), chao - lh, 2, lh);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Estilo do embate (src/js/estilos/*.js) ---
const ESTILOS = window.ESTILOS;
const fundos = {};
function fundoDo(id) {
  if (!fundos[id]) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    ESTILOS[id].fundo(c.getContext('2d'), { W, H, CHAO });
    fundos[id] = c;
  }
  return fundos[id];
}

// Medidas do lutador para a fatia p (0..1) dele: braço de 4 a 26px, grossura de 2 a 6.
const medidas = (p) => ({ braco: Math.round(4 + 22 * p), grossura: Math.round(2 + 4 * p), escala: 0.85 + 0.3 * p });

// Ferramentas que os estilos recebem a cada quadro.
const api = {
  ctx, W, H, CHAO,
  t: 0, pL: 0.5, pF: 0.5, vivo: false,
  esq: CFG.esquerda, dir: CFG.direita,
  // Dados da apuração (para estilos que mostram números) e texto da faixa ('' se não houver).
  pctEsq: 0, pctDir: 0, apurado: 0, faixa: '',
  // Desenha o lutador ('esquerda' ou 'direita') com os pés em (x, chao); devolve onde fica a mão da frente.
  lutador(lado, x, p, chao = CHAO) {
    const dir = lado === 'esquerda' ? 1 : -1;
    const m = medidas(p);
    const sprite = cena.sprites[lado];
    return sprite
      ? desenharSprite(sprite, x, dir, m.escala, api.t, chao)
      : desenharLutador(CFG[lado].visual, x, dir, m.braco, m.grossura, api.t, ESTILOS[cena.estilo].pose, chao);
  },
  // Distância horizontal entre os pés (x) e a mão da frente.
  alcance(lado, p) {
    const m = medidas(p);
    return cena.sprites[lado] ? Math.round(64 * m.escala) / 2 - 4 : m.braco + 8;
  },
  aura: (x, cfg, forca, chao = CHAO) => aura(x, cfg, forca, api.t, chao),
  bola: (x, y, raio, cores) => bola(x, y, raio, cores),
  faisca(x, y, cor, forca = 1) {
    const a = Math.random() * Math.PI * 2, vel = (0.6 + Math.random() * 1.8) * forca;
    cena.particulas.push({ x, y, vx: Math.cos(a) * vel, vy: Math.sin(a) * vel - 0.3, vida: 30 + Math.random() * 20, cor });
  },
  linha(x0, y0, x1, y1, cor) {
    ctx.fillStyle = cor;
    const passos = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= passos; i++) {
      ctx.fillRect(Math.round(x0 + (x1 - x0) * i / passos), Math.round(y0 + (y1 - y0) * i / passos), 1, 1);
    }
  },
};

const t0 = performance.now();
function quadro() {
  api.t = (performance.now() - t0) / 1000;
  cena.p += (cena.alvo - cena.p) * 0.03;
  api.pL = cena.p; api.pF = 1 - cena.p; api.vivo = cena.vivo;

  const tremor = cena.vivo ? Math.round(Math.sin(api.t * 45) * 0.6) : 0;
  ctx.setTransform(1, 0, 0, 1, tremor, 0);
  ctx.drawImage(fundoDo(cena.estilo), 0, 0);
  ESTILOS[cena.estilo].quadro(api);

  cena.particulas = cena.particulas.filter((s) => s.vida-- > 0);
  for (const s of cena.particulas) {
    s.x += s.vx; s.y += s.vy; s.vy += 0.04;
    ctx.fillStyle = s.cor; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
  }
}

// O loop roda na janela onde a arena está: com a aba em segundo plano, o
// requestAnimationFrame da página principal para, mas o do widget continua.
let loopId = 0;
function iniciarLoop(win) {
  const id = ++loopId;
  const passo = () => {
    if (id !== loopId) return;
    quadro();
    win.requestAnimationFrame(passo);
  };
  win.requestAnimationFrame(passo);
}

// ---------------------------------------------------------------------------
// Widget: arena numa janela flutuante sempre por cima (Document Picture-in-Picture,
// Chrome/Edge 116+). Sem suporte, abre a página em modo ?widget num popup.
// ---------------------------------------------------------------------------
// Plano B (celular, Safari, http): a arena vira um vídeo ao vivo (canvas → stream) no
// picture-in-picture de vídeo, a mesma janelinha flutuante de players de vídeo.
const videoPiP = { tela: null, video: null, timer: 0 };

function desenharTelaVideo() {
  const tela = videoPiP.tela, g = tela.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(canvas, 0, 0, tela.width, tela.height);
  if (ESTILOS[cena.estilo].placarProprio || !estado.br) return;
  // O placar em HTML não entra no vídeo: desenha por cima.
  const { esquerda, direita } = estado.br;
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, tela.width, 46);
  g.font = '20px "Press Start 2P", monospace'; g.textBaseline = 'middle';
  g.fillStyle = CFG.esquerda.cor; g.textAlign = 'left';
  g.fillText(`${CFG.esquerda.nome.toUpperCase()} ${fmtPct(esquerda.pct)}`, 14, 24);
  g.fillStyle = CFG.direita.cor; g.textAlign = 'right';
  g.fillText(`${fmtPct(direita.pct)} ${CFG.direita.nome.toUpperCase()}`, tela.width - 14, 24);
  if (api.faixa) {
    g.font = '18px "Press Start 2P", monospace'; g.textAlign = 'center';
    const larg = g.measureText(api.faixa).width + 28, x = (tela.width - larg) / 2, y = tela.height - 56;
    g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x, y, larg, 40);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.strokeRect(x, y, larg, 40);
    g.fillStyle = '#ffd23f'; g.fillText(api.faixa, tela.width / 2, y + 21);
  }
}

async function abrirWidgetVideo() {
  if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return; }
  if (!videoPiP.tela) {
    videoPiP.tela = Object.assign(document.createElement('canvas'), { width: 960, height: 480 });
    const v = videoPiP.video = document.createElement('video');
    v.muted = true; v.playsInline = true;
    v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(v);
    desenharTelaVideo();
    v.srcObject = videoPiP.tela.captureStream(30);
    v.addEventListener('leavepictureinpicture', () => { clearInterval(videoPiP.timer); videoPiP.timer = 0; });
  }
  await videoPiP.video.play();
  await videoPiP.video.requestPictureInPicture();
  // Com o app em segundo plano o requestAnimationFrame para; o timer mantém o vídeo vivo
  // enquanto o navegador deixar (alguns congelam timers de abas escondidas).
  clearInterval(videoPiP.timer);
  videoPiP.timer = setInterval(() => { if (document.hidden) quadro(); desenharTelaVideo(); }, 1000 / 30);
}

async function abrirWidget() {
  if (!('documentPictureInPicture' in window) && document.pictureInPictureEnabled
      && 'captureStream' in HTMLCanvasElement.prototype) {
    try { await abrirWidgetVideo(); return; } catch { /* cai no popup abaixo */ }
  }
  if (!('documentPictureInPicture' in window)) {
    window.open(`?widget&estilo=${cena.estilo}`, 'embate-widget', 'popup,width=480,height=270');
    const dica = $('dica-widget');
    dica.textContent = window.isSecureContext
      ? 'Este navegador não tem janela flutuante (só Chrome/Edge 116+). Abri um popup comum. '
        + 'Para fixar no topo e em todos os ambientes de trabalho, use o lançador da pasta widget/ (veja o README).'
      : 'A janela flutuante só funciona em https ou localhost, e este endereço é http. Abri um popup comum. '
        + 'Para fixar no topo e em todos os ambientes de trabalho, use o lançador da pasta widget/ (veja o README).';
    dica.hidden = false;
    return;
  }
  if (documentPictureInPicture.window) { documentPictureInPicture.window.focus(); return; }

  const arena = document.querySelector('.arena');
  const pip = await documentPictureInPicture.requestWindow({ width: 480, height: 240 });

  for (const folha of document.styleSheets) {
    try {
      const style = pip.document.createElement('style');
      style.textContent = [...folha.cssRules].map((r) => r.cssText).join('\n');
      pip.document.head.append(style);
    } catch {
      // Folha de outra origem (Google Fonts): não dá para ler as regras, então linka.
      const link = pip.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = folha.href;
      pip.document.head.append(link);
    }
  }
  pip.document.title = `${TITULO} ${CFG.ano}`;
  pip.document.body.classList.add('widget');

  const lugar = document.createElement('div');
  lugar.className = 'arena-destacada';
  lugar.textContent = 'A arena está no widget. Feche a janelinha para trazer de volta.';
  arena.replaceWith(lugar);
  pip.document.body.append(arena);
  iniciarLoop(pip);

  pip.addEventListener('pagehide', () => {
    lugar.replaceWith(arena);
    iniciarLoop(window);
  });
}

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-turno]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-turno]').forEach((b) => b.classList.toggle('ativo', b === btn));
    estado.escolha = btn.dataset.turno;
    carregar();
  });
});

Promise.all([carregarSprite(CFG.esquerda.sprite), carregarSprite(CFG.direita.sprite)]).then(([l, f]) => {
  cena.sprites.esquerda = l;
  cena.sprites.direita = f;
});

if (new URLSearchParams(location.search).has('widget')) {
  document.body.classList.add('widget');
  // Título único: os lançadores de widget/ acham a janela por ele.
  document.title = `${TITULO} - Widget`;
} else {
  document.title = `${TITULO} ${CFG.ano}`;
}

// Nomes, partidos e cores vêm de eleicao.js.
for (const k of ['esquerda', 'direita']) {
  const c = CFG[k];
  $(`nome-${k}`).textContent = c.nome.toUpperCase();
  $(`info-${k}`).textContent = `${c.partido} · ${c.numero}`;
  $(`mini-nome-${k}`).textContent = c.nome.toUpperCase();
  $(`th-${k}`).textContent = c.nome;
  for (const tom of ['cor', 'clara', 'escura']) {
    document.documentElement.style.setProperty(`--${k}${tom === 'cor' ? '' : '-' + tom}`, c[tom]);
  }
}
$('ano').textContent = CFG.ano;
// Estilo: ?estilo= na URL (widget, links) > último escolhido neste navegador > kamehameha.
function escolherEstilo(id) {
  if (!ESTILOS[id]) id = 'kamehameha';
  cena.estilo = id;
  canvas.setAttribute('aria-label', `${CFG.esquerda.nome} e ${CFG.direita.nome} ${ESTILOS[id].descricao}`);
  // Estilos com placar próprio na cena (ex.: pokemon) escondem a faixa e o mini-placar via CSS.
  canvas.parentElement.dataset.estilo = id;
  document.querySelectorAll('.estilos button').forEach((b) => b.classList.toggle('ativo', b.dataset.estilo === id));
  try { localStorage.setItem('estilo', id); } catch { /* sem storage: só não lembra */ }
  const url = new URL(location.href);
  url.searchParams.set('estilo', id);
  history.replaceState(null, '', url);
}

for (const [id, e] of Object.entries(ESTILOS)) {
  const b = document.createElement('button');
  b.dataset.estilo = id;
  b.textContent = e.nome;
  b.addEventListener('click', () => escolherEstilo(id));
  $('estilos').append(b);
}
let salvo = null;
try { salvo = localStorage.getItem('estilo'); } catch { /* idem */ }
escolherEstilo(new URLSearchParams(location.search).get('estilo') || salvo);
$('btn-widget').addEventListener('click', abrirWidget);

iniciarLoop(window);
carregar();

// PWA: instalável e abre offline (o service worker só funciona em https ou localhost).
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sem PWA, o site segue normal */ });
}
setInterval(carregar, CFG.refreshMs);
