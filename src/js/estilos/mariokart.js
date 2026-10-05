// Estilo "Mario Kart": a apuração vira corrida. Cada candidato pilota um kart na sua faixa;
// quem tem mais voto fica à frente (a distância cresce com a diferença). Os dois trocam
// cascos e o nome de cada arremesso vem de "golpes" em eleicao.js. HUD com a classificação,
// urnas apuradas no lugar das voltas e bandeira de chegada quando a apuração termina.
// O kart com o piloto usa "spriteKart" de eleicao.js se o arquivo existir; senão é desenhado
// aqui com o "visual" de eleicao.js.
// Contrato dos estilos: ver estilos/kamehameha.js.
window.ESTILOS = window.ESTILOS || {};

(() => {
  const PISTA = { topo: 104, base: 152 };
  const FAIXA_DIR = 126, FAIXA_ESQ = 148;     // rodas de cada kart (direita em cima)
  const FONTE = '8px "Press Start 2P", monospace';
  const ITEM = { periodo: 2.4, voo: 0.7, impacto: 0.4 };

  window.ESTILOS.mariokart = {
    nome: 'MARIO KART',
    descricao: 'apostando corrida de kart e trocando cascos',
    pose: 'dois',
    placarProprio: true,
    apuradoProprio: true,

    fundo(g, { W, H }) {
      const ceu = ['#5ca8f8', '#70b8f8', '#88c8f8', '#a0d8f8'];
      const alt = Math.ceil(PISTA.topo / ceu.length);
      ceu.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * alt, W, alt); });
      // grama embaixo da pista
      g.fillStyle = '#48b040'; g.fillRect(0, PISTA.base, W, H - PISTA.base);
      g.fillStyle = '#389030';
      for (let x = 0; x < W; x += 6) g.fillRect(x + (x % 12 ? 2 : 0), PISTA.base + 4 + (x % 3), 2, 1);
      // asfalto
      g.fillStyle = '#6a6a72'; g.fillRect(0, PISTA.topo, W, PISTA.base - PISTA.topo);
      g.fillStyle = '#5e5e66';
      for (let x = 0; x < W; x += 5) g.fillRect(x, PISTA.topo + 6 + (x * 7) % 40, 1, 1);
    },

    quadro(api) {
      const { ctx, W, t, pL, pF, esq, dir } = api;
      cenario(ctx, W, t);
      pista(ctx, W, t);

      // Posição na pista: quem tem mais voto vai à frente (para a direita).
      const vantagem = (pL - 0.5) * 2;                 // -1..1
      const xL = Math.round(W / 2 + vantagem * 95);
      const xF = Math.round(W / 2 - vantagem * 95);
      if (api.apurado >= 99.99) chegada(ctx, W);

      const atingido = { esquerda: 0, direita: 0 };
      const nomes = [];
      if (api.vivo) {
        itens(api, 'esquerda', xL, FAIXA_ESQ, xF, FAIXA_DIR, esq, 0, atingido, nomes);
        itens(api, 'direita', xF, FAIXA_DIR, xL, FAIXA_ESQ, dir, ITEM.periodo / 2, atingido, nomes);
      }
      kart(api, 'direita', xF, FAIXA_DIR, dir, pF, atingido.direita);  // de trás para a frente
      kart(api, 'esquerda', xL, FAIXA_ESQ, esq, pL, atingido.esquerda);
      for (const n of nomes) nomeDoGolpe(api, ...n);                    // por cima dos karts
      hud(api);
    },
  };

  // Nuvens, morros e árvores rolando em velocidades diferentes (paralaxe).
  function cenario(ctx, W, t) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 97 - t * 6) % (W + 40) + W + 40) % (W + 40) - 20;
      const y = 14 + (i % 2) * 14;
      ctx.fillRect(Math.round(x), y, 22, 5); ctx.fillRect(Math.round(x) + 4, y - 3, 12, 3);
    }
    for (const [cor, vel, base, alto, larg] of [['#58b858', 14, 96, 26, 70], ['#40a048', 28, 104, 16, 46]]) {
      ctx.fillStyle = cor;
      const desloc = (t * vel) % larg;
      for (let x = -larg; x < W + larg; x += larg) {
        const cx = x - desloc + larg / 2;
        ctx.beginPath(); ctx.ellipse(cx, base, larg / 2, alto, 0, Math.PI, 0); ctx.fill();
      }
    }
    // caixas de item "?" flutuando
    for (let i = 0; i < 3; i++) {
      const x = ((i * 120 - t * 40) % (W + 30) + W + 30) % (W + 30) - 15;
      const y = 62 + Math.sin(t * 3 + i) * 3;
      const cores = ['#f8d030', '#f87830', '#58c8f8', '#a070f0'];
      ctx.fillStyle = cores[Math.floor(t * 4 + i) % cores.length];
      ctx.fillRect(Math.round(x), Math.round(y), 10, 10);
      ctx.fillStyle = '#ffffff'; ctx.font = FONTE; ctx.textBaseline = 'top';
      ctx.fillText('?', Math.round(x) + 1, Math.round(y) + 1);
    }
  }

  function pista(ctx, W, t) {
    const desloc = Math.floor(t * 120) % 16;
    // guias vermelhas e brancas
    for (const y of [PISTA.topo - 3, PISTA.base]) {
      for (let x = -16; x < W + 16; x += 8) {
        ctx.fillStyle = Math.floor((x + 16) / 8) % 2 ? '#e83030' : '#f8f8f8';
        ctx.fillRect(x - desloc, y, 8, 3);
      }
    }
    // faixa central tracejada
    ctx.fillStyle = '#f0f0f0';
    for (let x = -16; x < W + 16; x += 16) ctx.fillRect(x - desloc, (FAIXA_DIR + FAIXA_ESQ) / 2 - 8, 8, 1);
  }

  // Bandeira quadriculada de chegada (apuração completa).
  function chegada(ctx, W) {
    const x = W - 22;
    for (let y = PISTA.topo; y < PISTA.base; y += 3) {
      for (let k = 0; k < 2; k++) {
        ctx.fillStyle = (Math.floor((y - PISTA.topo) / 3) + k) % 2 ? '#111' : '#f8f8f8';
        ctx.fillRect(x + k * 3, y, 3, 3);
      }
    }
    ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x + 8, PISTA.topo - 30, 2, 30);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#111' : '#f8f8f8';
        ctx.fillRect(x + 10 + i * 3, PISTA.topo - 30 + j * 3, 3, 3);
      }
    }
  }

  // Kart de lado, virado para a direita, com o piloto sentado. y = chão (base das rodas).
  function kart(api, lado, x, y, cfg, p, balanco) {
    const { ctx, t } = api;
    const v = cfg.visual;
    const sacode = Math.round(Math.sin(t * 30) * 0.6 + Math.sin(t * 50) * 2 * balanco);
    const r = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy + sacode, w, h); };
    // turbo: maior para quem tem mais voto
    const fogo = 3 + Math.round(9 * p) + Math.round(Math.abs(Math.sin(t * 25)) * 3);
    r(-16 - fogo, -9, fogo, 3, '#f8a020'); r(-16 - Math.round(fogo * 0.6), -8, Math.round(fogo * 0.6), 1, '#fff070');
    // poeira
    ctx.fillStyle = 'rgba(220,220,220,.6)';
    for (let i = 0; i < 3; i++) {
      const d = ((t * 60 + i * 9) % 26);
      ctx.fillRect(Math.round(x - 14 - d), y - 3 - (i % 2) - Math.round(d / 9), 3, 2);
    }
    // Sprite do piloto no kart (quadro de 48px, base nas rodas), se existir.
    const s = api.spriteKart(lado);
    if (s) { api.sprite(s, x, 1, 0.75, y + sacode); return; }
    // carroceria
    r(-14, -10, 28, 6, cfg.cor);
    r(-14, -5, 28, 2, cfg.escura);
    r(14, -9, 5, 4, cfg.cor); r(18, -7, 2, 2, cfg.escura);       // bico
    r(-15, -14, 4, 5, cfg.escura);                                 // encosto
    r(-12, -9, 20, 1, cfg.clara);
    // piloto: tronco, braço no volante e cabeça
    r(-10, -20, 9, 10, v.terno);
    r(-3, -19, 2, 6, v.gravata);
    r(-2, -17, 9, 3, v.terno); r(7, -18, 3, 3, v.pele);           // braço e mão
    r(8, -19, 1, 7, '#222');                                       // volante
    r(-10, -30, 9, 10, v.pele);
    r(-11, -32, 10, 4, v.cabelo); r(-11, -29, 2, 4, v.cabelo);
    if (v.barba) { r(-6, -24, 6, 4, v.barba); } else { r(-3, -23, 2, 1, '#8a4636'); }
    r(-3, -27, 2, 1, '#111');
    if (v.oculos) { r(-5, -28, 5, 1, '#222'); }
    // rodas girando
    for (const dx of [-9, 10]) {
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(x + dx, y - 3 + sacode, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9a9aa0';
      const a = t * 25;
      ctx.fillRect(Math.round(x + dx + Math.cos(a) * 2), Math.round(y - 3 + sacode + Math.sin(a) * 2), 1, 1);
      ctx.fillRect(Math.round(x + dx - Math.cos(a) * 2), Math.round(y - 3 + sacode - Math.sin(a) * 2), 1, 1);
    }
  }

  // Cada kart arremessa um casco no outro a cada ITEM.periodo; quem leva balança.
  function itens(api, lado, x0, y0, x1, y1, cfg, fase, atingido, nomes) {
    const { ctx, t } = api;
    const tempo = t + fase;
    const idade = tempo % ITEM.periodo;
    const n = Math.floor(tempo / ITEM.periodo);
    const alvo = lado === 'esquerda' ? 'direita' : 'esquerda';
    if (idade < ITEM.voo) {
      const s = idade / ITEM.voo;
      const x = x0 + 18 * Math.sign(x1 - x0 || 1) * (1 - s) + (x1 - x0) * s;
      const y = (y0 - 8) + (y1 - y0) * s - Math.sin(s * Math.PI) * 14;
      ctx.fillStyle = cfg.escura; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(x, y, 4, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f8f8f8'; ctx.fillRect(Math.round(x - 4), Math.round(y), 9, 2);
      ctx.fillStyle = cfg.clara; ctx.fillRect(Math.round(x - 1), Math.round(y - 3), 2, 2);
      if (idade < 0.6) nomes.push([cfg, x0, y0 - 42, n]);
    } else if (idade < ITEM.voo + ITEM.impacto) {
      const prog = (idade - ITEM.voo) / ITEM.impacto;
      atingido[alvo] = 1 - prog;
      ctx.globalAlpha = 1 - prog;
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        api.linha(x1, y1 - 14, x1 + Math.cos(a) * (6 + prog * 10), y1 - 14 + Math.sin(a) * (6 + prog * 10), k % 2 ? '#fff' : cfg.clara);
      }
      ctx.globalAlpha = 1;
      if (prog < 0.1) api.faisca(x1, y1 - 14, cfg.clara, 1.4);
    }
  }

  function nomeDoGolpe(api, cfg, x, y, n) {
    const { ctx, W } = api;
    const lista = cfg.golpes && cfg.golpes.length ? cfg.golpes : ['CASCO'];
    const texto = lista[((n % lista.length) + lista.length) % lista.length] + '!';
    ctx.font = FONTE; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const larg = ctx.measureText(texto).width;
    contorno(ctx, texto, Math.min(W - larg / 2 - 4, Math.max(larg / 2 + 4, x)), y, cfg.clara);
    ctx.textAlign = 'left';
  }

  // Classificação no canto (1º/2º), urnas no lugar das voltas e o resultado parado.
  function hud(api) {
    const { ctx, W } = api;
    const fmt = (v) => (v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '--');
    const ordem = api.pctEsq >= api.pctDir
      ? [[api.esq, api.pctEsq], [api.dir, api.pctDir]]
      : [[api.dir, api.pctDir], [api.esq, api.pctEsq]];
    ctx.font = FONTE; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ordem.forEach(([cfg, pct], i) => {
      const y = 6 + i * 13;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(4, y - 2, 150, 12);
      contorno(ctx, `${i + 1}º`, 7, y, i === 0 ? '#ffd23f' : '#e0e0e0');
      ctx.fillStyle = cfg.cor; ctx.fillRect(32, y, 4, 8);
      contorno(ctx, `${cfg.nome.toUpperCase()} ${fmt(pct)}`, 40, y, '#ffffff');
    });
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(W - 118, 4, 114, 12);
    contorno(ctx, `URNAS ${fmt(api.apurado)}`, W - 7, 6, '#ffd23f');
    if (api.faixa) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const larg = ctx.measureText(api.faixa).width + 14;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - larg / 2, 40, larg, 14);
      contorno(ctx, api.faixa, W / 2, 47, '#ffd23f');
    }
    ctx.textAlign = 'left';
  }

  function contorno(ctx, texto, x, y, cor) {
    ctx.fillStyle = '#000';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillText(texto, x + dx, y + dy);
    ctx.fillStyle = cor; ctx.fillText(texto, x, y);
  }
})();
