#!/usr/bin/env bash
# Atualiza o Embate 2026 (git pull) e reinicia o site na mesma porta.
#
# Uso: ./update.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

info() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

[[ -d .git ]] || erro "$DIR não é um repositório git"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] \
  || erro "há mudanças locais não commitadas. Commite ou descarte antes de atualizar (git status)"

if [[ -z "$(git remote)" ]]; then
  info "Nenhum remote configurado; pulando o git pull."
  echo "    Para atualizar de um repositório: git remote add origin <url> && git push -u origin $(git branch --show-current)"
elif ! git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
  erro "a branch $(git branch --show-current) não acompanha nenhuma branch remota. Rode: git branch -u origin/<branch>"
else
  ANTES="$(git rev-parse HEAD)"
  info "Buscando atualizações"
  git pull --ff-only --quiet
  if [[ "$(git rev-parse HEAD)" == "$ANTES" ]]; then
    info "Já está na versão mais recente."
  else
    info "Novidades:"
    git log --oneline "$ANTES..HEAD" | sed 's/^/    /'
  fi
fi

exec "$DIR/setup.sh"
