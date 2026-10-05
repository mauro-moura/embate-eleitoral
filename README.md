# Embate 2026

Site local, de brincadeira, que mostra a apuração da eleição presidencial de 2026 como um
"embate de Kamehameha" entre Lula e Flávio Bolsonaro. O braço e a rajada de cada um crescem
conforme a votação.

## Rodar

```sh
python3 -m http.server 8000
```

Depois abra <http://localhost:8000>. Abrir o `index.html` direto (file://) não funciona,
porque o navegador bloqueia as chamadas ao TSE.

## Dados

Os dados vêm direto dos arquivos públicos do TSE (`resultados.tse.jus.br`), que liberam CORS.
A página atualiza sozinha a cada 30s.

- **AUTO**: usa o 2º turno se o arquivo já existir no TSE; senão, o 1º.
- Códigos: 1º turno `6257`, 2º turno `6258` (em `CFG.turnos`, `src/js/app.js`).

## Ajustes

Em `src/js/app.js`, no objeto `CFG`:

- `exagero`: amplia a diferença na cena (47% × 45% quase não aparece). `1` = proporção real.
  Placar, barras e tabela sempre mostram os números reais.
- `lula.sprite` / `flavio.sprite`: sprites opcionais. Veja [PROMPTS.md](PROMPTS.md).
