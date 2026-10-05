// Estilo "Street Fighter": fliperama dos anos 90 no calçadão de Copacabana. Barras de vida
// no topo (quem lidera tem a barra cheia), selo KO e o % apurado no lugar do cronômetro.
// Os dois lançam bolas de fogo sem parar; elas explodem no ponto de choque, que quem tem
// mais voto empurra para o lado do outro. O nome de cada arremesso vem de "golpes" em
// eleicao.js. Contrato dos estilos: ver estilos/kamehameha.js.
window.ESTILOS = window.ESTILOS || {};

(() => {
  const X_ESQ = 58;
  const PERIODO = 0.75;        // segundos entre bolas de fogo do mesmo lutador
  const BOLAS = 4;             // bolas "no ar" por lutador (ciclo = PERIODO * BOLAS)
  const VELOCIDADE = 95;       // px por segundo
  const EXPLOSAO = 0.3;        // duração da explosão no choque
  const FONTE = '8px "Press Start 2P", monospace';
  const PEQUENA = '5px "Press Start 2P", monospace';
  const PISO = 122;            // começo do calçadão

  window.ESTILOS.streetfighter = {
    nome: 'STREET FIGHTER',
    descricao: 'trocando bolas de fogo num fliperama no calçadão de Copacabana',
    pose: 'dois',
    placarProprio: true,
    apuradoProprio: true, // o % apurado já fica no lugar do cronômetro

    fundo(g, { W, H }) {
      // pôr do sol
      const ceu = ['#2a1b4a', '#4a2462', '#7a2f6a', '#b5446a', '#e2705a', '#f6a25a'];
      const alt = Math.ceil(70 / ceu.length);
      ceu.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * alt, W, alt); });
      g.fillStyle = '#ffd36a'; g.beginPath(); g.arc(96, 70, 16, Math.PI, 0); g.fill();
      // Pão de Açúcar e o bondinho
      g.fillStyle = '#3a2a4a';
      morro(g, 228, 70, 30, 34); morro(g, 286, 70, 22, 22);
      g.fillStyle = '#2a1f38'; g.fillRect(228 - 30, 66, 60, 4);
      g.strokeStyle = '#1c1426'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(228, 37); g.lineTo(286, 49); g.stroke();
      g.fillStyle = '#e04848'; g.fillRect(255, 41, 3, 2);
      // mar
      g.fillStyle = '#1f4a7a'; g.fillRect(0, 70, W, 26);
      g.fillStyle = '#2d6aa0'; g.fillRect(0, 70, W, 2);
      // areia, grade e calçadão
      g.fillStyle = '#e8c88a'; g.fillRect(0, 96, W, 14);
      g.fillStyle = '#c9a66a'; for (let x = 0; x < W; x += 7) g.fillRect(x, 101 + (x % 3), 2, 1);
      g.fillStyle = '#d8d0c0'; g.fillRect(0, 110, W, 2);
      for (let x = 2; x < W; x += 10) g.fillRect(x, 110, 1, 12);
      g.fillRect(0, 115, W, 1);
      // ondas do calçadão de Copacabana: largas e com contraste suave, para não
      // tremeluzir (moiré) com o tremor da tela
      for (let y = PISO; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const onda = Math.floor((y + Math.sin(x * 0.11) * 4) / 6) % 2;
          g.fillStyle = onda ? '#d9d2c3' : '#4a4642';
          g.fillRect(x, y, 1, 1);
        }
      }
    },

    quadro(api) {
      const { ctx, W, t, pL, pF, esq, dir } = api;
      animarFundo(ctx, W, t);

      const mL = api.lutador('esquerda', X_ESQ, pL);
      const mF = api.lutador('direita', W - X_ESQ, pF);
      if (api.vivo) {
        const y = Math.round((mL.y + mF.y) / 2);
        const choque = mL.x + (mF.x - mL.x) * pL;
        // nomes dos golpes em alturas diferentes, para não se encostarem
        arremessos(api, mL.x, choque, y, 1, 3 + 5 * pL, esq, 0, X_ESQ, 67);
        arremessos(api, mF.x, choque, y, -1, 3 + 5 * pF, dir, PERIODO / 2, W - X_ESQ, 79);
      }
      hud(api, Math.max(pL, pF));
    },
  };

  function morro(g, x, base, raio, alto) {
    g.beginPath();
    g.moveTo(x - raio, base);
    g.quadraticCurveTo(x - raio * 0.8, base - alto * 1.3, x, base - alto);
    g.quadraticCurveTo(x + raio * 0.8, base - alto * 1.3, x + raio, base);
    g.fill();
  }

  // Brilho no mar e torcida balançando atrás da grade.
  function animarFundo(ctx, W, t) {
    ctx.fillStyle = '#7fb4e0';
    for (let i = 0; i < 14; i++) {
      const x = (i * 37 + t * 8) % W;
      ctx.fillRect(Math.round(x), 74 + (i * 5) % 20, 4 + (i % 3) * 2, 1);
    }
    const cores = ['#3b2e4f', '#4a3a5c', '#2f2540'];
    for (let i = 0; i < 26; i++) {
      const x = 4 + i * 12.3;
      const pulo = Math.max(0, Math.sin(t * 6 + i * 1.7)) * 2;
      const y = 103 - Math.round(pulo);
      ctx.fillStyle = cores[i % 3];
      ctx.fillRect(Math.round(x), y + 4, 7, 8);
      ctx.fillRect(Math.round(x) + 1, y, 5, 5);
      if (i % 4 === 0) ctx.fillRect(Math.round(x) + (i % 8 ? 6 : -1), y - 3 - Math.round(pulo), 2, 5); // braço pra cima
    }
  }

  // Bolas de fogo saindo da mão (x0) até o choque; explodem ao chegar. Sem estado: a posição
  // de cada bola sai do tempo.
  function arremessos(api, x0, choque, y, dir, raio, cfg, fase, xPes, yNome) {
    const { t } = api;
    const viagem = Math.max(0.05, Math.abs(choque - x0) / VELOCIDADE);
    const ciclo = PERIODO * BOLAS;
    for (let n = 0; n < BOLAS; n++) {
      const idade = (t + fase + n * PERIODO) % ciclo;
      if (idade < viagem) {
        bolaDeFogo(api, x0 + dir * VELOCIDADE * idade, y, raio, cfg, dir);
        if (idade < 0.6) nomeDoGolpe(api, cfg, xPes, Math.floor((t + fase + n * PERIODO) / ciclo) + n, yNome);
      } else if (idade < viagem + EXPLOSAO) {
        explosao(api, choque, y, (idade - viagem) / EXPLOSAO, raio, cfg);
      }
    }
  }

  function bolaDeFogo(api, x, y, r, cfg, dir) {
    const { ctx, t } = api;
    for (let k = 4; k >= 1; k--) {   // cauda
      ctx.globalAlpha = 0.18 * (5 - k);
      ctx.fillStyle = cfg.cor;
      const rr = r * (1 - k * 0.16);
      ctx.beginPath(); ctx.arc(x - dir * k * r * 0.7, y + Math.sin(t * 30 + k) * 1.2, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    api.bola(x, y, r + Math.sin(t * 40) * 0.6, cfg);
    ctx.fillStyle = cfg.clara;
    ctx.fillRect(Math.round(x + dir * r * 0.3), Math.round(y - r * 0.5), 1, 1);
  }

  function explosao(api, x, y, prog, r, cfg) {
    const { ctx } = api;
    const raio = r + prog * 10;
    ctx.globalAlpha = 1 - prog;
    ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(x, y, raio * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cfg.clara; ctx.lineWidth = 1;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * raio * 0.6, y + Math.sin(a) * raio * 0.6);
      ctx.lineTo(x + Math.cos(a) * raio * 1.4, y + Math.sin(a) * raio * 1.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (prog < 0.15) api.faisca(x, y, cfg.clara, 1.4);
  }

  function nomeDoGolpe(api, cfg, x, n, y) {
    const { ctx, W } = api;
    const lista = cfg.golpes && cfg.golpes.length ? cfg.golpes : ['HADOUKEN'];
    const texto = lista[((n % lista.length) + lista.length) % lista.length] + '!';
    ctx.font = FONTE; ctx.textBaseline = 'middle';
    const larg = ctx.measureText(texto).width;
    const cx = Math.min(W - larg / 2 - 4, Math.max(larg / 2 + 4, x));
    ctx.textAlign = 'center';
    contorno(ctx, texto, cx, y, cfg.clara);
    ctx.textAlign = 'left';
  }

  function hud(api, topo) {
    const { ctx, W } = api;
    const fmt = (v) => (v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '--');
    barra(ctx, 8, 8, 128, api.pL / topo, 1);
    barra(ctx, W - 136, 8, 128, api.pF / topo, -1);
    // selo KO e o "cronômetro" (urnas apuradas)
    ctx.fillStyle = '#a01818'; ctx.fillRect(W / 2 - 14, 5, 28, 14);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(W / 2 - 13, 6, 26, 1);
    ctx.font = FONTE; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.fillText('KO', W / 2, 8);
    ctx.fillStyle = '#ffd23f'; ctx.fillText(String(Math.floor(api.apurado)), W / 2, 23);
    ctx.font = PEQUENA; ctx.fillStyle = '#f2ede2'; ctx.fillText('APURADO', W / 2, 33);
    // nomes e porcentagens
    ctx.font = FONTE; ctx.textAlign = 'left';
    contorno(ctx, `${api.esq.nome.toUpperCase()} ${fmt(api.pctEsq)}`, 8, 20, '#f8f0c0');
    ctx.textAlign = 'right';
    contorno(ctx, `${fmt(api.pctDir)} ${api.dir.nome.toUpperCase()}`, W - 8, 20, '#f8f0c0');
    ctx.textAlign = 'left';
    // resultado (ex.: VAI TER 2º ROUND!) parado no meio da tela
    if (api.faixa) {
      ctx.font = FONTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const larg = ctx.measureText(api.faixa).width + 14;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(W / 2 - larg / 2, 44, larg, 14);
      contorno(ctx, api.faixa, W / 2, 51, '#ffd23f');
      ctx.textAlign = 'left';
    }
  }

  // Barra de vida: amarela, com o dano em vermelho do lado de dentro (perto do KO).
  function barra(ctx, x, y, w, vida, lado) {
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, w + 2, 10);
    ctx.fillStyle = '#c01818'; ctx.fillRect(x, y, w, 8);
    const cheio = Math.max(1, Math.round(w * vida));
    ctx.fillStyle = '#f8d020';
    ctx.fillRect(lado > 0 ? x : x + w - cheio, y, cheio, 8);
    ctx.fillStyle = '#fff4a0';
    ctx.fillRect(lado > 0 ? x : x + w - cheio, y + 1, cheio, 2);
  }

  function contorno(ctx, texto, x, y, cor) {
    ctx.fillStyle = '#000';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillText(texto, x + dx, y + dy);
    ctx.fillStyle = cor; ctx.fillText(texto, x, y);
  }
})();
