// Estilo "Mortal Kombat": ponte de pedra sobre um poço de espinhos, céu vermelho e lua.
// Barras de vida verdes com o nome dentro (quem lidera tem a barra cheia). Quem tem chapéu
// (visual.chapeu em eleicao.js) arremessa o chapéu girando, como o Kung Lao; sem chapéu, a
// esquerda lança uma lança na corrente e a direita bolas de gelo. Os golpes se chocam
// no ponto que quem tem mais voto empurra para o lado do outro. O nome de cada arremesso
// vem de "golpes" em eleicao.js. Contrato dos estilos: ver estilos/kamehameha.js.
window.ESTILOS = window.ESTILOS || {};

(() => {
  const X_ESQ = 58;
  const PONTE = 138;                   // topo da ponte (onde os pés pisam)
  const FONTE = '8px "Press Start 2P", monospace';
  const LANCA = { vel: 150, segura: 0.15, descanso: 0.4 };
  const GELO = { vel: 90, explosao: 0.35 };
  const CHAPEU = { vel: 130, segura: 0.12, descanso: 0.45 };

  window.ESTILOS.mortalkombat = {
    nome: 'MORTAL KOMBAT',
    descricao: 'trocando lança e gelo numa ponte sobre um poço de espinhos',
    pose: 'dois',
    placarProprio: true,
    apuradoProprio: true,

    fundo(g, { W, H }) {
      const ceu = ['#120408', '#24070e', '#3a0b14', '#561019', '#70161c', '#8a2420'];
      const alt = Math.ceil(PONTE / ceu.length);
      ceu.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * alt, W, alt); });
      // lua
      g.fillStyle = '#f0d8b8'; g.beginPath(); g.arc(W / 2, 46, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d8b898'; g.fillRect(W / 2 - 8, 40, 5, 4); g.fillRect(W / 2 + 4, 50, 4, 3);
      // montanhas pontudas ao fundo
      g.fillStyle = '#1a0609';
      for (let x = 0; x < W; x++) {
        const h = 26 + Math.abs(((x * 0.9) % 40) - 20) * 1.1 + Math.sin(x * 0.05) * 6;
        g.fillRect(x, 112 - h, 1, h + 30);
      }
      // pilares com tochas nas pontas da ponte
      for (const x of [14, W - 22]) {
        g.fillStyle = '#3a3438'; g.fillRect(x, 96, 8, PONTE - 96);
        g.fillStyle = '#2a2428'; g.fillRect(x, 96, 2, PONTE - 96);
        g.fillStyle = '#4a4448'; g.fillRect(x - 2, 94, 12, 3);
      }
      // ponte de pedra
      g.fillStyle = '#5a5258'; g.fillRect(0, PONTE, W, 10);
      g.fillStyle = '#433c42';
      for (let x = 0; x < W; x += 12) { g.fillRect(x, PONTE, 1, 10); g.fillRect(x + 6, PONTE + 5, 1, 5); }
      g.fillRect(0, PONTE + 5, W, 1);
      g.fillStyle = '#6e666c'; g.fillRect(0, PONTE, W, 1);
      // poço de espinhos
      g.fillStyle = '#0a0204'; g.fillRect(0, PONTE + 10, W, H - PONTE - 10);
      g.fillStyle = '#6a6066';
      for (let x = 2; x < W; x += 9) {
        for (let k = 0; k < 6; k++) g.fillRect(x + k, H - 1 - k * 2, 9 - 2 * k > 0 ? 9 - 2 * k : 1, 2);
      }
    },

    quadro(api) {
      const { W, t, pL, pF, esq, dir } = api;
      animarFundo(api);
      const xL = X_ESQ, xF = W - X_ESQ;
      // Chapéu em voo é calculado antes, para desenhar o lutador sem ele na cabeça.
      const choque0 = xL + api.alcance('esquerda', pL) + ((xF - api.alcance('direita', pF)) - (xL + api.alcance('esquerda', pL))) * pL;
      const yGolpe = PONTE - 31;
      // Ritmo do golpe da esquerda (chapéu ou lança); o da direita bate no mesmo instante.
      const ritmo = temChapeu(esq)
        ? ritmoChapeu(xL + 1, PONTE - 55, choque0, yGolpe)
        : ritmoLanca(choque0 - (xL + api.alcance('esquerda', pL)));
      const vooL = api.vivo && temChapeu(esq) ? voo(t, xL + 1, PONTE - 55, choque0, yGolpe) : null;
      const vooF = api.vivo && temChapeu(dir) ? voo(t + 0.9, xF - 1, PONTE - 55, choque0, yGolpe) : null;
      const mL = api.lutador('esquerda', xL, pL, PONTE, { semChapeu: !!vooL });
      const mF = api.lutador('direita', xF, pF, PONTE, { semChapeu: !!vooF });
      if (api.vivo) {
        const y = Math.round((mL.y + mF.y) / 2);
        const choque = mL.x + (mF.x - mL.x) * pL;
        if (temChapeu(esq)) chapeu(api, vooL, choque, y, pL, esq, xL, 62, 1);
        else lanca(api, mL.x, choque, y, pL, esq, X_ESQ, ritmo);
        if (temChapeu(dir)) chapeu(api, vooF, choque, y, pF, dir, xF, 74, -1);
        else gelo(api, mF.x, choque, y, pF, dir, W - X_ESQ, ritmo);
      }
      hud(api, pL / Math.max(pL, pF), pF / Math.max(pL, pF));
    },

    // Vencedor comemora (de chapéu, se tiver), o outro de joelhos; sem fatality.
    vitoria(api) {
      const { W, vencedor } = api;
      const cfgV = vencedor === 'esquerda' ? api.esq : api.dir;
      animarFundo(api);
      for (const lado of ['esquerda', 'direita']) {
        api.lutador(lado, lado === 'esquerda' ? X_ESQ : W - X_ESQ, 0.5, PONTE,
          { pose: lado === vencedor ? 'comemora' : 'sentado' });
      }
      hud(api, vencedor === 'esquerda' ? 1 : 0, vencedor === 'direita' ? 1 : 0);
      api.textoVitoria(`${cfgV.nome.toUpperCase()} VENCEU!`, api.pctVencedor(), 40);
    },
  };

  const temChapeu = (cfg) => !!(cfg.visual && cfg.visual.chapeu);

  function ritmoLanca(dist) {
    const ida = Math.max(0.05, dist / LANCA.vel);
    return { impacto: ida, ciclo: ida + LANCA.segura + ida * 0.6 + LANCA.descanso };
  }

  // Voo do chapéu no instante t (bumerangue): sai da cabeça em arco, bate no choque e volta.
  // null quando está descansando na cabeça.
  // Ciclo e instante do impacto do chapéu (o gelo do outro lado se sincroniza com isso).
  function ritmoChapeu(x0, y0, x1, y1) {
    const ida = Math.hypot(x1 - x0, y1 - y0) / CHAPEU.vel;
    return { impacto: ida, ciclo: ida + CHAPEU.segura + ida * 0.7 + CHAPEU.descanso };
  }

  function voo(t, x0, y0, x1, y1) {
    const ida = Math.hypot(x1 - x0, y1 - y0) / CHAPEU.vel, volta = ida * 0.7;
    const ciclo = ida + CHAPEU.segura + volta + CHAPEU.descanso;
    const fase = t % ciclo;
    let s;
    if (fase < ida) s = fase / ida;
    else if (fase < ida + CHAPEU.segura) s = 1;
    else if (fase < ida + CHAPEU.segura + volta) s = 1 - (fase - ida - CHAPEU.segura) / volta;
    else return null;
    return {
      x: x0 + (x1 - x0) * s, y: y0 + (y1 - y0) * s - Math.sin(s * Math.PI) * 12,
      fase, voltando: fase >= ida + CHAPEU.segura, batendo: fase >= ida && fase < ida + CHAPEU.segura,
      n: Math.floor(t / ciclo),
    };
  }

  // Fedora girando de lado, com a aba brilhando como lâmina (estilo Kung Lao).
  function chapeu(api, v, choque, y, p, cfg, xPes, yNome, dir) {
    if (!v) return;
    const { ctx, t } = api;
    const c = cfg.visual.chapeu;
    const esc = 1 + 0.8 * p;
    const giro = t * 22;
    const rx = 9 * esc, ry = 2.2 * esc;
    // rastro de movimento atrás do chapéu
    const atras = v.voltando ? dir : -dir;
    ctx.fillStyle = cfg.clara;
    for (let k = 1; k <= 3; k++) ctx.fillRect(Math.round(v.x + atras * (rx + k * 4)), Math.round(v.y - 3 + k * 2), 3, 1);
    // aba
    ctx.fillStyle = c.sombra; ctx.beginPath(); ctx.ellipse(v.x, v.y + 1, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.cor; ctx.beginPath(); ctx.ellipse(v.x, v.y, rx, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    // copa: a largura pulsa com o giro, como vista de lado girando
    const cw = Math.max(3, Math.round(10 * esc * (0.6 + 0.4 * Math.abs(Math.cos(giro)))));
    const ch = Math.round(5 * esc);
    const topo = Math.round(v.y - ry * 0.5 - ch);
    ctx.fillStyle = c.cor; ctx.fillRect(Math.round(v.x - cw / 2), topo, cw, ch);
    ctx.fillStyle = c.sombra; ctx.fillRect(Math.round(v.x - 1), topo, 2, 1);
    ctx.fillStyle = c.faixa; ctx.fillRect(Math.round(v.x - cw / 2), topo + ch - Math.max(1, Math.round(1.5 * esc)), cw, Math.max(1, Math.round(1.5 * esc)));
    // brilho da lâmina percorrendo a aba
    ctx.fillStyle = '#ffffff';
    for (const k of [0, Math.PI]) {
      ctx.fillRect(Math.round(v.x + Math.cos(giro + k) * rx), Math.round(v.y + Math.sin(giro + k) * ry), 2, 1);
    }
    if (v.batendo) {
      api.bola(choque, y, 3 + 4 * p, { escura: cfg.escura, cor: '#fff3c0' });
      api.faisca(choque, y, cfg.clara, 1.5);
    }
    if (v.fase < 0.6) nomeDoGolpe(api, cfg, xPes, v.n, yNome);
  }

  // Chamas das tochas e morcegos cruzando o céu.
  function animarFundo(api) {
    const { ctx, W, t } = api;
    for (const x of [18, W - 18]) {
      for (let i = 0; i < 6; i++) {
        const h = 4 + Math.abs(Math.sin(t * 9 + i * 1.3)) * 6;
        ctx.fillStyle = ['#ffd040', '#ff8a20', '#e04010'][i % 3];
        ctx.fillRect(Math.round(x - 3 + i), Math.round(93 - h), 1, Math.round(h));
      }
    }
    ctx.fillStyle = '#0a0204';
    for (let i = 0; i < 4; i++) {
      const x = (i * 97 + t * (14 + i * 3)) % (W + 30) - 15;
      const y = 22 + i * 9 + Math.sin(t * 2 + i) * 3;
      const asa = Math.floor(t * 8 + i) % 2 ? 1 : -1;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      ctx.fillRect(Math.round(x) - 2, Math.round(y) + asa, 2, 1);
      ctx.fillRect(Math.round(x) + 2, Math.round(y) + asa, 2, 1);
    }
  }

  // Lança presa numa corrente: vai até o choque, segura e volta. Uma por vez.
  function lanca(api, x0, choque, y, p, cfg, xPes, ritmo) {
    const { ctx, t } = api;
    const dist = Math.abs(choque - x0);
    const ida = ritmo.impacto, volta = ida * 0.6;
    const fase = t % ritmo.ciclo;
    let alcance;
    if (fase < ida) alcance = fase / ida;
    else if (fase < ida + LANCA.segura) alcance = 1;
    else if (fase < ida + LANCA.segura + volta) alcance = 1 - (fase - ida - LANCA.segura) / volta;
    else return;
    const ponta = x0 + dist * alcance;
    const grossura = 1 + Math.round(2 * p);
    // corrente: elos alternados
    for (let x = x0; x < ponta; x += 3) {
      ctx.fillStyle = Math.floor(x / 3) % 2 ? '#b8b0a8' : '#6e6862';
      ctx.fillRect(Math.round(x), Math.round(y - grossura / 2 + Math.sin(x * 0.4) * 0.6), 3, grossura);
    }
    // ponta da lança (kunai)
    const tam = 4 + Math.round(4 * p);
    ctx.fillStyle = '#e8e4dc';
    for (let i = 0; i < tam; i++) {
      const meia = Math.round((tam - i) / 2);
      ctx.fillRect(Math.round(ponta + i), Math.round(y - meia), 1, meia * 2 + 1);
    }
    ctx.fillStyle = cfg.cor; ctx.fillRect(Math.round(ponta - 2), Math.round(y - 1), 2, 3);
    if (fase >= ida && fase < ida + LANCA.segura) {
      api.bola(choque, y, 3 + 4 * p, { escura: cfg.escura, cor: '#ffb040' });
      api.faisca(choque, y, cfg.clara, 1.5);
    }
    if (fase < 0.6) nomeDoGolpe(api, cfg, xPes, Math.floor(t / ritmo.ciclo), 62);
  }

  // Uma bola de gelo por ciclo, lançada na hora certa para chegar ao choque junto com o
  // golpe do outro lado (ritmo.impacto): os golpes colidem no ar.
  function gelo(api, x0, choque, y, p, cfg, xPes, ritmo) {
    const { ctx, t } = api;
    const viagem = Math.max(0.05, Math.abs(choque - x0) / GELO.vel);
    const inicio = ritmo.impacto - viagem;
    const r = 3 + 4 * p;
    const idade = (((t - inicio) % ritmo.ciclo) + ritmo.ciclo) % ritmo.ciclo;
    if (idade < viagem) {
      const x = x0 - GELO.vel * idade;
      ctx.globalAlpha = 0.35; ctx.fillStyle = cfg.clara;   // névoa atrás
      ctx.beginPath(); ctx.arc(x + r * 1.4, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      api.bola(x, y, r, cfg);
      ctx.fillStyle = '#ffffff';                            // cristais
      for (let k = 0; k < 4; k++) {
        const a = t * 6 + k * Math.PI / 2;
        ctx.fillRect(Math.round(x + Math.cos(a) * (r + 2)), Math.round(y + Math.sin(a) * (r + 2)), 1, 1);
      }
      if (idade < 0.6) nomeDoGolpe(api, cfg, xPes, Math.floor((t - inicio) / ritmo.ciclo), 74);
    } else if (idade < viagem + GELO.explosao) {
      const prog = (idade - viagem) / GELO.explosao;
      ctx.globalAlpha = 1 - prog;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + 0.3;
        api.linha(choque, y, choque + Math.cos(a) * (r + prog * 10), y + Math.sin(a) * (r + prog * 10), k % 2 ? '#ffffff' : cfg.clara);
      }
      ctx.globalAlpha = 1;
    }
  }

  function nomeDoGolpe(api, cfg, x, n, y) {
    const { ctx, W } = api;
    const lista = cfg.golpes && cfg.golpes.length ? cfg.golpes : ['VEM PRA CÁ'];
    const texto = lista[((n % lista.length) + lista.length) % lista.length] + '!';
    ctx.font = FONTE; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const larg = ctx.measureText(texto).width;
    contorno(ctx, texto, Math.min(W - larg / 2 - 4, Math.max(larg / 2 + 4, x)), y, cfg.clara);
    ctx.textAlign = 'left';
  }

  function hud(api, vidaEsq, vidaDir) {
    const { ctx, W } = api;
    const fmt = (v) => (v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '--');
    barra(ctx, 8, 6, 136, vidaEsq, 1, api.esq.nome.toUpperCase());
    barra(ctx, W - 144, 6, 136, vidaDir, -1, api.dir.nome.toUpperCase());
    ctx.font = FONTE; ctx.textBaseline = 'top';
    ctx.textAlign = 'left'; contorno(ctx, fmt(api.pctEsq), 8, 20, '#f0e0a0');
    ctx.textAlign = 'right'; contorno(ctx, fmt(api.pctDir), W - 8, 20, '#f0e0a0');
    ctx.textAlign = 'center'; contorno(ctx, `URNAS ${fmt(api.apurado)}`, W / 2, 20, '#ffd23f');
    if (api.faixa) {
      ctx.textBaseline = 'middle';
      const larg = ctx.measureText(api.faixa).width + 14;
      // logo abaixo do placar, fora do caminho dos golpes (o chapéu passa mais embaixo)
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - larg / 2, 34, larg, 14);
      contorno(ctx, api.faixa, W / 2, 41, '#ffd23f');
    }
    ctx.textAlign = 'left';
  }

  // Barra verde com o nome dentro; o dano aparece em vermelho do lado de dentro.
  function barra(ctx, x, y, w, vida, lado, nome) {
    ctx.fillStyle = '#d8d0b0'; ctx.fillRect(x - 1, y - 1, w + 2, 12);
    ctx.fillStyle = '#a00808'; ctx.fillRect(x, y, w, 10);
    const cheio = Math.round(w * vida); // pode zerar (vitória)
    ctx.fillStyle = '#20b020'; ctx.fillRect(lado > 0 ? x : x + w - cheio, y, cheio, 10);
    ctx.fillStyle = '#60e060'; ctx.fillRect(lado > 0 ? x : x + w - cheio, y + 1, cheio, 2);
    ctx.font = FONTE; ctx.textBaseline = 'top';
    ctx.textAlign = lado > 0 ? 'left' : 'right';
    contorno(ctx, nome, lado > 0 ? x + 3 : x + w - 3, y + 1, '#f8f0a0');
    ctx.textAlign = 'left';
  }

  function contorno(ctx, texto, x, y, cor) {
    ctx.fillStyle = '#000';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillText(texto, x + dx, y + dy);
    ctx.fillStyle = cor; ctx.fillText(texto, x, y);
  }
})();
