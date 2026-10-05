#!/usr/bin/env bash
# Roda no COMPUTADOR CLIENTE (Linux ou macOS): instala a CA local do Embate Eleitoral para
# o navegador confiar no https do Raspberry.
#
# Uso: ssl/instalar-ca.sh https://IP-DO-PI:8000     (baixa /ca.crt do site)
#      ssl/instalar-ca.sh caminho/para/ca.crt        (arquivo copiado do Pi)
#
# Instala no sistema (pede sudo), no banco do Chrome/Chromium/Edge/Brave (Linux) e nos
# perfis do Firefox. Feche e abra os navegadores depois.
set -euo pipefail

NOME="Embate Eleitoral CA local"
info() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[1;35mAVISO:\033[0m %s\n' "$*" >&2; }
erro() { printf '\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

[[ $# -eq 1 ]] || erro "uso: $0 https://IP-DO-PI:8000  (ou o caminho do ca.crt)"
command -v openssl >/dev/null || erro "openssl não encontrado"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
CA="$TMP/embate-eleitoral-ca.crt"

if [[ "$1" =~ ^https?:// ]]; then
  URL="${1%/}"
  info "Baixando $URL/ca.crt"
  # -k: ainda não confiamos na CA; a impressão digital abaixo é que garante que é a certa.
  curl -fsSk "$URL/ca.crt" -o "$CA" || erro "não consegui baixar $URL/ca.crt (o site está em https?)"
else
  [[ -f "$1" ]] || erro "arquivo não encontrado: $1"
  cp "$1" "$CA"
fi

openssl x509 -in "$CA" -noout 2>/dev/null || erro "isso não é um certificado"
openssl x509 -in "$CA" -noout -text | grep -q "CA:TRUE" || erro "esse certificado não é de uma CA"
echo "    $(openssl x509 -in "$CA" -noout -subject)"
echo "    Impressão digital: $(openssl x509 -in "$CA" -noout -fingerprint -sha256 | cut -d= -f2)"
read -r -p "Confere com a impressão digital mostrada pelo gerar-certificado.sh no Pi? [s/N] " ok
[[ "$ok" =~ ^[sS] ]] || erro "cancelado"

# --- macOS: chaveiro do usuário (Chrome, Edge, Brave, Safari e Firefox usam) --------
if [[ "$(uname -s)" == Darwin ]]; then
  info "Adicionando ao chaveiro (vai pedir sua senha)"
  security add-trusted-cert -r trustRoot -k "$HOME/Library/Keychains/login.keychain-db" "$CA"
  info "Pronto. Feche e abra os navegadores."
  exit 0
fi

# --- Linux: sistema ----------------------------------------------------------------------
if command -v update-ca-certificates >/dev/null; then          # Debian, Ubuntu, Raspberry Pi OS
  info "Instalando no sistema (sudo)"
  sudo cp "$CA" /usr/local/share/ca-certificates/embate-eleitoral-ca.crt
  sudo update-ca-certificates >/dev/null
elif command -v update-ca-trust >/dev/null; then              # Fedora, RHEL
  info "Instalando no sistema (sudo)"
  sudo cp "$CA" /etc/pki/ca-trust/source/anchors/embate-eleitoral-ca.crt
  sudo update-ca-trust
elif command -v trust >/dev/null; then                        # Arch
  info "Instalando no sistema (sudo)"
  sudo trust anchor --store "$CA"
else
  aviso "não reconheci como instalar no sistema; seguindo só com os navegadores"
fi

# --- Linux: navegadores (usam bancos NSS próprios, não o do sistema) -------------------
if ! command -v certutil >/dev/null; then
  aviso "certutil não instalado; Chrome e Firefox não vão confiar ainda."
  echo "    Instale e rode de novo: sudo apt install libnss3-tools | sudo dnf install nss-tools | sudo pacman -S nss"
  exit 0
fi

instalar_nss() {  # $1 = pasta do banco NSS, $2 = descrição
  certutil -d "sql:$1" -D -n "$NOME" >/dev/null 2>&1 || true   # troca versão antiga
  if certutil -d "sql:$1" -A -t "C,," -n "$NOME" -i "$CA" 2>/dev/null; then
    echo "    ok: $2"
  else
    aviso "não consegui instalar em $2 (navegador aberto? feche e rode de novo)"
  fi
}

info "Instalando nos navegadores"
# Chrome, Chromium, Edge e Brave no Linux compartilham ~/.pki/nssdb.
mkdir -p "$HOME/.pki/nssdb"
[[ -f "$HOME/.pki/nssdb/cert9.db" ]] || certutil -d "sql:$HOME/.pki/nssdb" -N --empty-password
instalar_nss "$HOME/.pki/nssdb" "Chrome/Chromium/Edge/Brave"
[[ -f "$HOME/snap/chromium/current/.pki/nssdb/cert9.db" ]] \
  && instalar_nss "$HOME/snap/chromium/current/.pki/nssdb" "Chromium (snap)"

# Firefox: cada perfil tem o seu banco (inclui o perfil do lançador do widget).
achou_ff=0
for db in "$HOME"/.mozilla/firefox/*/cert9.db \
          "$HOME"/snap/firefox/common/.mozilla/firefox/*/cert9.db \
          "$HOME"/.var/app/org.mozilla.firefox/.mozilla/firefox/*/cert9.db \
          "${XDG_DATA_HOME:-$HOME/.local/share}"/embate-widget/firefox/cert9.db; do
  [[ -f "$db" ]] || continue
  achou_ff=1
  instalar_nss "$(dirname "$db")" "Firefox ($(basename "$(dirname "$db")"))"
done
((achou_ff)) || echo "    (nenhum perfil do Firefox encontrado)"

info "Pronto. Feche e abra os navegadores."
