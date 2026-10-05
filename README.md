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

## Atualizar

```sh
./update.sh
```

Faz `git pull` (se houver remote) e reinicia o site na mesma porta. Recusa rodar se houver
mudanças locais não commitadas.

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
