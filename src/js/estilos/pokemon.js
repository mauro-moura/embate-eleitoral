// Estilo "Pokémon": tela de batalha de RPG portátil dos anos 90/2000.
// Esquerda em primeiro plano (embaixo), direita ao fundo (em cima), caixas de HP e caixa de
// texto. Os nomes dos golpes vêm de "golpes" em eleicao.js; o efeito visual é chama na
// esquerda e jato na direita. Os ataques se cruzam na diagonal e quem tem mais voto empurra
// o ponto de choque. HP: quem lidera tem a barra cheia.
// Contrato dos estilos: ver estilos/kamehameha.js.
window.ESTILOS = window.ESTILOS || {};

(() => {
  const CHAO_ESQ = 120, CHAO_DIR = 72;     // pés de cada lutador
  const X_ESQ = 72, X_DIR = 246;
  const CAIXA_Y = 124;                     // topo da caixa de texto
  const FONTE = '8px "Press Start 2P", monospace';

  window.ESTILOS.pokemon = {
    nome: 'POKÉMON',
    descricao: 'numa batalha de RPG, trocando golpes',
    pose: 'dois',
    placarProprio: true, // a cena já mostra nomes, HP e mensagens

    fundo(g, { W, H }) {
      const faixas = ['#b8e0f8', '#c8e8f0', '#d8f0e8', '#e0f0d0', '#d0e8b0', '#c0e0a0'];
      const alt = Math.ceil(CAIXA_Y / faixas.length);
      faixas.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * alt, W, alt); });
      // nuvens
      g.fillStyle = '#f4fbff';
      for (const [x, y] of [[150, 14], [190, 22], [60, 46]]) {
        g.fillRect(x, y, 26, 5); g.fillRect(x + 5, y - 3, 14, 3);
      }
      // plataformas de grama
      plataforma(g, X_ESQ, CHAO_ESQ, 50, 9);
      plataforma(g, X_DIR, CHAO_DIR, 42, 8);
      g.fillStyle = '#2c3848'; g.fillRect(0, CAIXA_Y, W, H - CAIXA_Y);
    },

    quadro(api) {
      const { t, pL, pF, esq, dir } = api;
      const mF = api.lutador('direita', X_DIR, pF, CHAO_DIR);
      const mL = api.lutador('esquerda', X_ESQ, pL, CHAO_ESQ);

      // HP: quem lidera tem a barra cheia; o outro, proporcional.
      const topo = Math.max(pL, pF);
      caixaHP(api, 6, 6, esqOuDir(api, 'direita'), pF / topo, false);
      caixaHP(api, 186, 84, esqOuDir(api, 'esquerda'), pL / topo, true);

      if (api.vivo) {
        const cx = mL.x + (mF.x - mL.x) * pL + Math.sin(t * 4) * 1.5;
        const cy = mL.y + (mF.y - mL.y) * pL;
        chamas(api, mL.x, mL.y, cx, cy, 2 + 5 * pL, esq);
        jato(api, mF.x, mF.y, cx, cy, 2 + 5 * pF, dir);
        const r = 4 + Math.abs(Math.sin(t * 16)) * 3;
        api.bola(cx, cy, r, { escura: '#f8b800', cor: '#fff8b0' });
        for (let i = 0; i < 2; i++) api.faisca(cx, cy, [esq.clara, dir.clara][i]);
      }
      caixaTexto(api, mensagens(api));
    },
  };

  function esqOuDir(api, lado) {
    const cfg = lado === 'esquerda' ? api.esq : api.dir;
    return { cfg, pct: lado === 'esquerda' ? api.pctEsq : api.pctDir };
  }

  function plataforma(g, x, y, rx, ry) {
    g.fillStyle = '#88b060'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a8d078'; g.beginPath(); g.ellipse(x, y - 1, rx - 4, ry - 3, 0, 0, Math.PI * 2); g.fill();
  }

  function caixaHP(api, x, y, { cfg, pct }, hp, comNumero) {
    const { ctx } = api;
    const w = 128, h = comNumero ? 32 : 24;
    ctx.fillStyle = '#404848'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f8f8e0'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = cfg.cor; ctx.fillRect(x + 2, y + 2, 3, h - 4);
    ctx.font = FONTE; ctx.textBaseline = 'top';
    ctx.fillStyle = '#303030'; ctx.fillText(cfg.nome.toUpperCase(), x + 8, y + 5);
    ctx.fillStyle = '#707070'; ctx.textAlign = 'right'; ctx.fillText(cfg.partido, x + w - 6, y + 5);
    ctx.textAlign = 'left';
    // barra de HP
    const bx = x + 26, by = y + 15, bw = w - 34;
    ctx.fillStyle = '#404848'; ctx.fillRect(bx - 20, by - 1, bw + 22, 6);
    ctx.fillStyle = '#f8c838'; ctx.font = '5px "Press Start 2P", monospace'; ctx.fillText('HP', bx - 18, by);
    ctx.fillStyle = '#506058'; ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = hp > 0.5 ? '#48c050' : hp > 0.2 ? '#f8c030' : '#e83828';
    ctx.fillRect(bx, by, Math.max(1, Math.round(bw * hp)), 4);
    if (comNumero) {
      ctx.font = FONTE; ctx.fillStyle = '#303030'; ctx.textAlign = 'right';
      ctx.fillText(pct ? pct.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '--', x + w - 6, y + 21);
      ctx.textAlign = 'left';
    }
  }

  function mensagens(api) {
    if (!api.vivo) return ['Carregando a apuração...'];
    const lider = api.pctEsq >= api.pctDir ? api.esq : api.dir;
    // A cada volta pelas mensagens, cada um usa o próximo golpe da lista.
    const volta = Math.floor(api.t / (3.5 * 4));
    const golpe = (cfg, padrao) => {
      const lista = cfg.golpes && cfg.golpes.length ? cfg.golpes : [padrao];
      return lista[volta % lista.length];
    };
    const m = [
      `${api.esq.nome.toUpperCase()} usou ${golpe(api.esq, 'LANÇA-CHAMAS')}!`,
      `${api.dir.nome.toUpperCase()} usou ${golpe(api.dir, 'HIDRO BOMBA')}!`,
      `${lider.nome.toUpperCase()} está na frente!`,
    ];
    if (api.faixa) m.push(api.faixa);
    else m.push(`Urnas apuradas: ${api.apurado.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`);
    return m;
  }

  // Caixa de texto com efeito de máquina de escrever; troca de mensagem a cada 3,5s.
  function caixaTexto(api, msgs) {
    const { ctx, W, H, t } = api;
    ctx.fillStyle = '#c84838'; ctx.fillRect(3, CAIXA_Y + 3, W - 6, H - CAIXA_Y - 6);
    ctx.fillStyle = '#f8f8f8'; ctx.fillRect(6, CAIXA_Y + 6, W - 12, H - CAIXA_Y - 12);
    const i = Math.floor(t / 3.5) % msgs.length;
    const visiveis = Math.floor((t % 3.5) * 30);
    const texto = msgs[i].slice(0, visiveis);
    ctx.font = FONTE; ctx.textBaseline = 'top'; ctx.fillStyle = '#383838';
    // quebra em até duas linhas de 36 caracteres
    const linhas = quebrar(texto, 36);
    linhas.slice(0, 2).forEach((l, n) => ctx.fillText(l, 12, CAIXA_Y + 11 + n * 11));
    if (visiveis >= msgs[i].length && Math.floor(t * 3) % 2) {
      ctx.fillStyle = '#c84838'; ctx.fillRect(W - 18, H - 13, 5, 3); ctx.fillRect(W - 17, H - 10, 3, 1);
    }
  }

  function quebrar(texto, max) {
    const linhas = [''];
    for (const palavra of texto.split(' ')) {
      const atual = linhas[linhas.length - 1];
      if ((atual + ' ' + palavra).trim().length > max) linhas.push(palavra);
      else linhas[linhas.length - 1] = (atual + ' ' + palavra).trim();
    }
    return linhas;
  }

  // Rajada de fogo: bolhas que crescem e tremulam ao longo da diagonal.
  function chamas(api, x0, y0, x1, y1, grossura, cfg) {
    const { ctx, t } = api;
    for (let s = 0; s <= 1; s += 0.035) {
      const x = x0 + (x1 - x0) * s, y = y0 + (y1 - y0) * s;
      const r = grossura * (0.5 + 0.5 * s) + Math.sin(s * 40 - t * 30) * 1.2;
      const dy = Math.sin(s * 25 + t * 22) * 1.5;
      ctx.fillStyle = cfg.escura; ctx.beginPath(); ctx.arc(x, y + dy, r + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(x, y + dy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s % 0.105 < 0.04 ? '#ffe070' : cfg.clara;
      ctx.beginPath(); ctx.arc(x, y + dy, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Jato d'água: faixa ondulada com bolhas brancas correndo para o choque.
  function jato(api, x0, y0, x1, y1, grossura, cfg) {
    const { ctx, t } = api;
    const ang = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let s = 0; s <= 1; s += 0.02) {
      const onda = Math.sin(s * 30 - t * 25) * 1.2;
      const x = x0 + (x1 - x0) * s + nx * onda, y = y0 + (y1 - y0) * s + ny * onda;
      ctx.fillStyle = cfg.escura; ctx.beginPath(); ctx.arc(x, y, grossura / 2 + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(x, y, grossura / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cfg.clara; ctx.fillRect(Math.round(x), Math.round(y - grossura / 4), 1, 1);
    }
    for (let k = 0; k < 5; k++) {
      const s = ((t * 1.6 + k / 5) % 1);
      const x = x0 + (x1 - x0) * s + nx * Math.sin(k * 7) * grossura / 2;
      const y = y0 + (y1 - y0) * s + ny * Math.sin(k * 7) * grossura / 2;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.stroke();
    }
  }
})();
