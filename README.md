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

Há dois jeitos de deixar a luta num cantinho da tela.

### Lançador (recomendado): sempre no topo e em todos os ambientes de trabalho

Abre só a luta numa janela pequena sem barras, no canto inferior direito, e pede ao sistema
para deixá-la por cima de tudo e visível em todos os ambientes de trabalho. Rodar de novo
reaproveita a janela que já estiver aberta.

| Sistema | Comando | Navegadores |
|---|---|---|
| Linux | `widget/embate-widget.sh --url http://IP-DO-PI:8000` | Chrome, Chromium, Edge, Brave, Firefox |
| Windows | dois cliques em `widget\embate-widget.bat`, ou `widget\embate-widget.ps1 -Url http://IP-DO-PI:8000` | Chrome, Edge, Brave, Firefox |
| macOS | `widget/embate-widget.sh --url http://IP-DO-PI:8000` | Chrome, Edge, Brave (ver abaixo) |

Opções: navegador (`--navegador firefox` / `-Navegador firefox`; padrão: o primeiro instalado)
e tamanho (`--tamanho 480x270` / `-Largura 480 -Altura 270`). Também dá para definir o endereço
uma vez com a variável `EMBATE_URL`.

- **Linux:** precisa do `wmctrl` (`sudo apt install wmctrl`). No Wayland, o navegador do widget
  roda via XWayland para isso funcionar; GNOME e KDE aceitam, outros compositores podem ignorar.
  Nesse caso: botão direito na barra de título, "Sempre no topo" e "Sempre na área de trabalho
  visível". `--instalar` cria o atalho "Embate 2026 (widget)" no menu de aplicativos.
- **Windows:** o "sempre no topo" funciona sem nada extra. Para aparecer em todas as áreas de
  trabalho, instale uma vez `Install-Module VirtualDesktop -Scope CurrentUser`; sem ele, faça à
  mão: Win+Tab, botão direito no widget, "Mostrar esta janela em todas as áreas de trabalho".
- **macOS:** o sistema não deixa um script fixar a janela de outro app. O lançador abre o site
  com o PiP liberado mesmo em `http` da rede local; clique em **WIDGET**. O Firefox não tem
  janela flutuante para páginas, então no macOS ele não fica no topo.
- **Firefox:** não tem modo "app"; o lançador cria um perfil próprio (em
  `~/.local/share/embate-widget/firefox` ou `%LOCALAPPDATA%\embate-widget\firefox`) com abas e
  barras escondidas.

### Botão WIDGET na página

Usa a API *Document Picture-in-Picture* para soltar a luta numa janela flutuante sempre por cima.
Só existe no Chrome, Chromium, Edge e Brave (116+), e **só em `https` ou `localhost`**. Acessando
pelo IP (`http://192.168.x.x:8000`) a API some e o botão abre um popup comum, que não fica por cima.
Para usar o PiP pela rede: publique no GitHub Pages (é `https`) ou, no Chrome, adicione o
endereço em `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.

O endereço `?widget` (ex.: `http://localhost:8000/?widget`) mostra só a luta e serve também
como fonte de navegador no OBS.

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
