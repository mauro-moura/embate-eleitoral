# Embate Eleitoral

Projeto de brincadeira para acompanhar a apuração das eleições presidenciais de forma
descontraída: os candidatos num "embate de Kamehameha" em pixel art, com dados ao vivo do TSE.
O braço e a rajada de cada um crescem conforme a votação. Sem vínculo com o TSE nem com partidos.

Configurado agora para 2026: Lula × Flávio Bolsonaro.

## Rodar

```sh
./setup.sh          # porta 8000
./setup.sh 8080     # outra porta (fica salva para as próximas vezes)
```

Precisa só de Python 3.7+. Com systemd, o site vira um serviço de usuário (`embate-eleitoral`) que
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
  visível". `--instalar` cria o atalho "Embate Eleitoral (widget)" no menu de aplicativos.
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

O site é 100% estático e o TSE libera CORS para `github.io`, então funciona sem mudar nada.

1. No GitHub, crie o repositório `embate-eleitoral` **vazio** (sem README, licença nem
   .gitignore, para não conflitar com o histórico daqui). Para o Pages gratuito, ele precisa
   ser **público**.
2. Aqui no projeto, aponte o remote e envie a `main`:
   ```sh
   git remote add origin https://github.com/<usuario>/embate-eleitoral.git
   git push -u origin main
   ```
   (Com chave SSH configurada: `git@github.com:<usuario>/embate-eleitoral.git`.)
3. No repositório: **Settings → Pages → Build and deployment**. Em *Source*, escolha
   **Deploy from a branch**; em *Branch*, `main` e pasta `/ (root)`; **Save**.
4. Aguarde o deploy em **Actions** (1 ou 2 minutos). O site fica em
   `https://<usuario>.github.io/embate-eleitoral/`.
5. Opcional: na página inicial do repositório, na engrenagem de **About**, cole a descrição,
   marque *Use your GitHub Pages website* e adicione os topics.

Depois disso, todo `git push` na `main` publica a versão nova. No Pages o botão WIDGET abre a
janela flutuante direto (é `https`), e os lançadores aceitam o endereço:
`widget/embate-widget.sh --url https://<usuario>.github.io/embate-eleitoral/`.

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
systemctl --user disable --now embate-eleitoral    # com systemd
rm ~/.config/systemd/user/embate-eleitoral.service
kill "$(cat .embate.pid)"                          # sem systemd
```

## Dados

Os dados vêm direto dos arquivos públicos do TSE (`resultados.tse.jus.br`), que liberam CORS.
A página atualiza sozinha a cada 30s. **AUTO** usa o 2º turno se o arquivo já existir no TSE;
senão, o 1º.

## Trocar de eleição

Tudo o que é da eleição fica em `src/js/eleicao.js`: ano, endereço e códigos do TSE e os dois
lutadores (`esquerda` e `direita`), cada um com número, nome de exibição, partido, cores, sprite
e o visual do boneco desenhado pelo código. Os códigos novos saem de
`https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` (instruções no próprio arquivo).

## Ajustes

Em `src/js/app.js`, no objeto `CFG`: `exagero` amplia a diferença na cena (47% × 45% quase não
aparece; `1` = proporção real). Placar, barras e tabela sempre mostram os números reais.
Sprites opcionais: veja [PROMPTS.md](PROMPTS.md).
