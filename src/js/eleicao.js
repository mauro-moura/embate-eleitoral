// Configuração da eleição acompanhada: códigos do TSE, candidatos, cores e visual.
//
// Os códigos ficam em https://resultados.tse.jus.br/oficial/comum/config/ele-c.json:
// procure o ciclo "ele<ano>" e, dentro dele, a eleição federal cujo cargo é "Presidente".
// O "cd" dela é o 1º turno e o "cdt2" é o 2º turno.
window.ELEICAO = {
  ano: 2026,
  base: 'https://resultados.tse.jus.br/oficial/ele2026',
  turnos: { 1: '6257', 2: '6258' },
  cargo: '0001', // Presidente

  // Lutador da esquerda da tela.
  esquerda: {
    numero: '13',
    nome: 'Lula',
    partido: 'PT',
    // Nomes de golpe usados no estilo Pokémon (revezam na caixa de texto).
    golpes: ['FAZ O L', 'PICANHA', 'O AMOR VENCEU'],
    cor: '#e8402e', clara: '#ffb199', escura: '#8f1a0f',
    // Sprite opcional (ver PROMPTS.md). Sem ele, o lutador é desenhado pelo código com o visual abaixo.
    sprite: 'src/img/sprites/lula.png',
    spriteKart: 'src/img/sprites/lula-kart.png', // piloto no kart (estilo Mario Kart)
    visual: {
      terno: '#26335f', ternoEsc: '#18213f', camisa: '#f3f3f3', gravata: '#d4202a', calca: '#1f2a50',
      pele: '#e0a77f', peleEsc: '#b97d58', cabelo: '#cfd0d4', sobrancelha: '#8d8d8d',
      barba: '#e8e8ea', oculos: true, broche: '#d4202a',
    },
  },

  // Lutador da direita da tela (desenhado espelhado).
  direita: {
    numero: '22',
    nome: 'Flávio',
    partido: 'PL',
    golpes: ['ZERO UM', 'VERDE E AMARELO', 'DEUS, PÁTRIA E FAMÍLIA'],
    cor: '#2f7bf0', clara: '#a9cbff', escura: '#123b8c',
    sprite: 'src/img/sprites/flavio.png',
    spriteKart: 'src/img/sprites/flavio-kart.png',
    visual: {
      terno: '#2b2f3c', ternoEsc: '#1b1e28', camisa: '#f3f3f3', gravata: '#1ea84a', calca: '#22252f',
      pele: '#f0bf98', peleEsc: '#c9906b', cabelo: '#2a1d14', sobrancelha: '#2a1d14',
      barba: null, oculos: false, broche: '#2f7bf0',
    },
  },
};
