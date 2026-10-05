// Estilo "Rasengan × Chidori": os dois avançam e se encontram no meio, sobre a água, num
// cenário inspirado no Vale do Fim. Esquerda segura um Rasengan (esfera girando), direita
// um Chidori (raios). Quem tem mais voto empurra o ponto de encontro e o outro recua.
// Contrato dos estilos: ver estilos/kamehameha.js.
window.ESTILOS = window.ESTILOS || {};

(() => {
  const AGUA = 136; // linha d'água do rio

  window.ESTILOS.naruto = {
    nome: 'RASENGAN × CHIDORI',
    descricao: 'avançando um contra o outro com Rasengan e Chidori',
    pose: 'um',

    fundo(g, { W, H }) {
      // céu noturno
      const faixas = ['#070a1c', '#0b1230', '#101a40', '#16234f', '#1d2d5c', '#253866'];
      const alt = Math.ceil(AGUA / faixas.length); // céu até a água: nada transparente
      faixas.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * alt, W, alt); });
      let seed = 11;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      g.fillStyle = '#cfd8ff';
      for (let i = 0; i < 40; i++) g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 50), 1, 1);
      // lua
      g.fillStyle = '#f4edc9'; g.beginPath(); g.arc(W / 2, 22, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#dcd3a8'; g.fillRect(W / 2 - 5, 18, 3, 3); g.fillRect(W / 2 + 3, 25, 2, 2);

      // penhascos dos dois lados, com as estátuas no alto
      for (const lado of [-1, 1]) {
        const borda = lado < 0 ? 0 : W;
        for (let i = 0; i < 112; i++) {
          const x = lado < 0 ? i : W - 1 - i;
          const topo = 34 + i * 0.32 + Math.sin(i * 0.5) * 2 + (i > 90 ? (i - 90) * 2.2 : 0);
          g.fillStyle = i % 9 < 2 ? '#2b2f45' : '#363b55';
          g.fillRect(x, Math.round(topo), 1, AGUA - Math.round(topo));
        }
        // estátua: base, corpo, ombros e cabeça
        const ex = borda + lado * -38;
        g.fillStyle = '#4a4f6b';
        g.fillRect(ex - 13, 28, 26, 22);
        g.fillRect(ex - 9, 14, 18, 16);
        g.fillStyle = '#5a6080';
        g.fillRect(ex - 6, 4, 12, 12);
        g.fillStyle = '#3c4058';
        g.fillRect(ex - 13, 28, 26, 2);
        g.fillRect(ex + lado * -2, 8, 3, 2); // olho virado para o centro
      }

      // cachoeira ao fundo, entre os penhascos
      g.fillStyle = '#5d86b8'; g.fillRect(W / 2 - 46, 58, 92, AGUA - 58);
      g.fillStyle = '#363b55'; g.fillRect(W / 2 - 54, 52, 108, 6); // borda de pedra no alto
      g.fillStyle = '#2b2f45'; g.fillRect(W / 2 - 54, 57, 108, 1);

      // rio
      g.fillStyle = '#1b4470'; g.fillRect(0, AGUA, W, H - AGUA);
      g.fillStyle = '#255a8f'; g.fillRect(0, AGUA, W, 1);
    },

    quadro(api) {
      const { ctx, W, t, pL, pF, esq, dir } = api;
      cachoeira(ctx, W, t);

      // Encontro no meio: com mais votos, empurra o ponto de choque para o lado do outro.
      const centro = W / 2 + (pL - 0.5) * 150 + Math.sin(t * 5) * 1.2;
      const rL = 4 + 7 * pL, rF = 4 + 7 * pF;
      const xL = centro - rL - api.alcance('esquerda', pL) - 1;
      const xF = centro + rF + api.alcance('direita', pF) + 1;

      api.aura(xL, esq, pL);
      api.aura(xF, dir, pF);
      const mL = api.lutador('esquerda', xL, pL);
      const mF = api.lutador('direita', xF, pF);
      reflexo(ctx, xL, esq); reflexo(ctx, xF, dir);
      if (!api.vivo) return;

      rasengan(api, mL.x + rL, mL.y, rL, esq);
      chidori(api, mF.x - rF, mF.y, rF, dir, pF);

      // choque: clarão que pulsa + ondas de impacto
      const y = Math.round((mL.y + mF.y) / 2);
      const onda = (t * 40) % 36;
      ctx.globalAlpha = Math.max(0, 1 - onda / 36) * 0.6;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(centro, y, onda, onda * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      const pulso = 3 + Math.abs(Math.sin(t * 20)) * 3;
      ctx.fillStyle = Math.floor(t * 12) % 2 ? '#ffffff' : '#e8f4ff';
      ctx.beginPath(); ctx.arc(centro, y, pulso, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 3; i++) api.faisca(centro, y, [esq.clara, dir.clara, '#fff'][i]);
      // respingos no rio
      if (Math.random() < 0.5) api.faisca(centro + (Math.random() - 0.5) * 20, AGUA, '#9cc8f0', 1.2);
    },
  };

  function cachoeira(ctx, W, t) {
    for (let x = W / 2 - 46; x < W / 2 + 46; x += 3) {
      const y = 58 + ((t * 70 + x * 13) % (AGUA - 58));
      ctx.fillStyle = '#a9cdf2'; ctx.fillRect(x, Math.round(y), 1, 7);
    }
    // espuma no pé da cachoeira e marolas no rio
    ctx.fillStyle = 'rgba(220,240,255,.5)';
    for (let i = 0; i < 12; i++) {
      const x = W / 2 - 48 + i * 8 + Math.sin(t * 6 + i) * 2;
      ctx.fillRect(Math.round(x), AGUA - 3 + Math.round(Math.sin(t * 9 + i)), 6, 3);
    }
    ctx.fillStyle = '#3a72a8';
    for (let i = 0; i < 9; i++) {
      const x = (i * 41 + t * 12) % (W + 20) - 10;
      ctx.fillRect(Math.round(x), AGUA + 6 + (i % 3) * 6, 10, 1);
    }
  }

  function reflexo(ctx, x, cfg) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = cfg.cor;
    ctx.fillRect(Math.round(x - 10), AGUA + 2, 20, 2);
    ctx.globalAlpha = 1;
  }

  // Esfera girando nas cores do lutador, com espiral branca.
  function rasengan(api, cx, cy, r, cfg) {
    const { ctx, t } = api;
    ctx.fillStyle = cfg.escura; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cfg.clara; ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 3; k++) {
      for (let s = 0.15; s <= 1; s += 0.06) {
        const a = -t * 16 + k * 2.094 + s * 3.4;
        ctx.fillStyle = s > 0.7 ? cfg.escura : '#fff';
        ctx.fillRect(Math.round(cx + Math.cos(a) * r * s), Math.round(cy + Math.sin(a) * r * s), 1, 1);
      }
    }
    // anel tracejado girando na borda
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      if (Math.floor(a * 10 - t * 50) % 2) continue;
      ctx.fillStyle = cfg.clara;
      ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 1)), Math.round(cy + Math.sin(a) * (r + 1)), 1, 1);
    }
  }

  // Bola de raios estalando, com faíscas em zigue-zague para todo lado.
  function chidori(api, cx, cy, r, cfg, forca) {
    const { ctx } = api;
    ctx.fillStyle = cfg.escura; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8 + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cfg.clara; ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    const raios = 4 + Math.round(7 * forca);
    for (let i = 0; i < raios; i++) {
      let x = cx, y = cy;
      const a = Math.random() * Math.PI * 2;
      const passos = 3 + Math.floor(Math.random() * (2 + r / 2));
      const cor = [cfg.clara, '#fff', cfg.cor][i % 3];
      for (let p = 0; p < passos; p++) {
        const nx = x + Math.cos(a) * 4 + (Math.random() - 0.5) * 5;
        const ny = y + Math.sin(a) * 4 + (Math.random() - 0.5) * 5;
        api.linha(x, y + 1, nx, ny + 1, cfg.escura); // sombra: destaca o raio de fundos claros
        api.linha(x, y, nx, ny, cor);
        x = nx; y = ny;
      }
    }
    if (Math.random() < 0.6) api.faisca(cx, cy, cfg.clara, 1.6);
  }
})();
