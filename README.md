# Embate 2026

Site local, de brincadeira, que mostra a apuração da eleição presidencial de 2026 como um
"embate de Kamehameha" entre Lula e Flávio Bolsonaro. O braço e a rajada de cada um crescem
conforme a votação.

## Rodar

```sh
./setup.sh          # porta 8000
./setup.sh 8080     # outra porta (fica salva para as próximas vezes)
```

Precisa só de Python 3.7+. Com systemd, o site vira um serviço de usuário (`embate2026`) que
sobe sozinho no boot. Sem systemd, roda em segundo plano até reiniciar a máquina.
Rodar o script de novo reinicia o site.

Abrir o `index.html` direto (file://) não funciona, porque o navegador bloqueia as chamadas ao TSE.

## Widget

O botão **WIDGET** tira a luta da página e coloca numa janelinha flutuante que fica por cima
de todas as outras janelas (dá para redimensionar e arrastar para o canto). Fechando a janelinha,
a luta volta para a página. Usa a API *Document Picture-in-Picture*: só Chrome, Chromium e Edge
(versão 116 em diante), e só em `localhost` ou `https`.

Em outros navegadores, o botão abre `?widget` num popup pequeno: a mesma luta, só que sem o
"sempre por cima". Esse endereço também serve para fonte de navegador no OBS ou para uma
janela de app: `chromium --app="http://localhost:8000/?widget" --window-size=480,270`.

## Publicar no GitHub Pages

O site é 100% estático e o TSE libera CORS para `github.io`, então funciona direto:

1. Crie um repositório no GitHub e envie a `main`:
   `git remote add origin git@github.com:<usuario>/<repo>.git && git push -u origin main`
2. No repositório: **Settings → Pages → Build and deployment → Deploy from a branch**,
   branch `main`, pasta `/ (root)`.
3. Em um ou dois minutos o site fica em `https://<usuario>.github.io/<repo>/`.

Todo `git push` na `main` publica a versão nova. O widget PiP também funciona lá (é `https`).

## Atualizar

```sh
./update.sh
```

Faz `git pull` (se houver remote) e reinicia o site na mesma porta. Recusa rodar se houver
mudanças locais não commitadas.

## Prints

`.tools/` guarda o script de prints; o Playwright e o Chromium ficam em `.tools/node_modules/` e
`.tools/browsers/`, fora do git (~680 MB):

```sh
node .tools/prints.mjs                 # usa http://localhost:8000/
```

Para recriar a pasta numa máquina nova:

```sh
cd .tools && npm ci && PLAYWRIGHT_BROWSERS_PATH="$PWD/browsers" npx playwright install chromium
```

## Parar / remover

```sh
systemctl --user disable --now embate2026          # com systemd
rm ~/.config/systemd/user/embate2026.service
kill "$(cat .embate.pid)"                          # sem systemd
```

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
