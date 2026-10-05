// Estilo "Kamehameha": cada lutador dispara uma rajada com os dois braços; quem tem mais
// voto empurra o ponto de choque para o lado do outro.
//
// Cada estilo registra em window.ESTILOS:
//   nome     texto do botão
//   pose     'dois' (dois braços à frente) ou 'um' (um braço à frente)
//   fundo(g, api)   desenha o cenário fixo uma vez (canvas próprio)
//   quadro(api)     desenha o que anima, por cima do cenário (ver api em app.js)
window.ESTILOS = window.ESTILOS || {};

(() => {
  window.ESTILOS.kamehameha = {
    nome: 'KAMEHAMEHA',
    descricao: 'disparando rajadas de energia um contra o outro',
    pose: 'dois',

    fundo(g, { W, H, CHAO }) {
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
    },

    quadro(api) {
      const { ctx, W, t, pL, pF, esq, dir } = api;
      const xL = 46, xF = W - 46;
      api.aura(xL, esq, pL);
      api.aura(xF, dir, pF);
      const mL = api.lutador('esquerda', xL, pL);
      const mF = api.lutador('direita', xF, pF);
      if (!api.vivo) return;

      const yB = Math.round((mL.y + mF.y) / 2);
      // Ponto de choque: quem tem mais voto empurra o encontro para o lado do outro.
      const choque = Math.round(mL.x + (mF.x - mL.x) * pL + Math.sin(t * 3) * 1.5);
      rajada(api, mL.x, choque, yB, 3 + 9 * pL, esq);
      rajada(api, mF.x, choque, yB, 3 + 9 * pF, dir);

      const rc = 8 + Math.sin(t * 18) * 2;
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(choque, yB, rc + 6, 0, Math.PI * 2); ctx.fill();
      api.bola(choque, yB, rc, { escura: '#ffb000', cor: '#fff3a0' });
      for (let i = 0; i < 3; i++) api.faisca(choque, yB, [esq.clara, dir.clara, '#fff', '#ffd23f'][i % 4]);
    },
  };

  // Rajada de energia de x0 até x1, com a bola nas mãos em x0.
  function rajada(api, x0, x1, y, grossura, cfg) {
    const { ctx, t } = api;
    const ini = Math.min(x0, x1), fim = Math.max(x0, x1);
    for (let x = ini; x < fim; x += 2) {
      const onda = Math.sin(x * 0.35 - t * 30 * Math.sign(x1 - x0)) * 1.2;
      const h = grossura + onda;
      ctx.fillStyle = cfg.escura; ctx.fillRect(x, Math.round(y - h / 2 - 2), 2, Math.round(h + 4));
      ctx.fillStyle = cfg.cor; ctx.fillRect(x, Math.round(y - h / 2), 2, Math.round(h));
      ctx.fillStyle = cfg.clara; ctx.fillRect(x, Math.round(y - h / 4), 2, Math.max(1, Math.round(h / 2)));
    }
    api.bola(x0, y, grossura / 2 + 2 + Math.sin(t * 25) * 0.8, cfg);
  }
})();
