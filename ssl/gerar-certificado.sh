#!/usr/bin/env bash
# Roda NO RASPBERRY: cria uma CA local (só na primeira vez) e um certificado HTTPS para o
# site, assinado por ela. Depois reinicia o site em https com ./setup.sh.
#
# Uso: ssl/gerar-certificado.sh [nome-ou-ip-extra ...]
#   Sempre inclui localhost, <hostname>.local e os IPv4 de rede local da máquina.
#   Rode de novo se o IP do Raspberry mudar (a CA é reaproveitada).
#
# Os arquivos ficam fora do projeto, em ~/.local/share/embate-eleitoral/ssl, para a chave
# da CA nunca ser servida pelo site nem ir para o git.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/embate-eleitoral/ssl"

info() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

command -v openssl >/dev/null || erro "openssl não encontrado (sudo apt install openssl)"
mkdir -p "$SSL_DIR"
chmod 700 "$SSL_DIR"
cd "$SSL_DIR"
umask 077

# Faixas de rede local. A CA só pode assinar certificados dentro delas (name constraints):
# mesmo que a chave vazasse, não serviria para falsificar sites da internet.
PERMITIDOS="permitted;DNS:localhost,permitted;DNS:local"
PERMITIDOS+=",permitted;IP:127.0.0.0/255.0.0.0,permitted;IP:10.0.0.0/255.0.0.0"
PERMITIDOS+=",permitted;IP:172.16.0.0/255.240.0.0,permitted;IP:192.168.0.0/255.255.0.0"
PERMITIDOS+=",permitted;IP:100.64.0.0/255.192.0.0"

ip_local() {
  [[ "$1" =~ ^(10|127)\. || "$1" =~ ^192\.168\. || "$1" =~ ^172\.(1[6-9]|2[0-9]|3[01])\. \
     || "$1" =~ ^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\. ]]
}

if [[ ! -f ca.key ]]; then
  info "Criando a CA local (só desta vez)"
  openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
    -keyout ca.key -out ca.crt -days 3650 -sha256 \
    -subj "/CN=Embate Eleitoral CA local ($(hostname))" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "nameConstraints=critical,$PERMITIDOS" 2>/dev/null
fi

HOST="$(hostname)"
SAN="DNS:localhost,DNS:${HOST%%.*}.local,IP:127.0.0.1"
for ip in $(hostname -I 2>/dev/null); do
  [[ "$ip" == *:* ]] && continue   # só IPv4
  ip_local "$ip" && SAN+=",IP:$ip"
done
for extra in "$@"; do
  if [[ "$extra" =~ ^[0-9.]+$ ]]; then
    ip_local "$extra" || erro "$extra não é IP de rede local; a CA não pode assiná-lo"
    SAN+=",IP:$extra"
  else
    [[ "$extra" == localhost || "$extra" == *.local ]] || erro "$extra precisa terminar em .local"
    SAN+=",DNS:$extra"
  fi
done

info "Gerando o certificado do site"
openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
  -keyout servidor.key -out servidor.csr -subj "/CN=${HOST%%.*}.local" 2>/dev/null
# 825 dias: limite que Apple e navegadores aceitam para certificados de servidor.
openssl x509 -req -in servidor.csr -CA ca.crt -CAkey ca.key -set_serial "0x$(openssl rand -hex 16)" \
  -days 825 -sha256 -out servidor.crt -extfile <(printf '%s\n' \
    "subjectAltName=$SAN" \
    "basicConstraints=critical,CA:FALSE" \
    "keyUsage=critical,digitalSignature" \
    "extendedKeyUsage=serverAuth") 2>/dev/null
rm -f servidor.csr
chmod 644 ca.crt servidor.crt
openssl verify -CAfile ca.crt servidor.crt >/dev/null || erro "o certificado gerado não passou na verificação"

echo "    Vale para: ${SAN//,/ }"
echo "    Impressão digital da CA (confira ao instalar nos clientes):"
echo "    $(openssl x509 -noout -fingerprint -sha256 -in ca.crt | cut -d= -f2)"

"$RAIZ/setup.sh"
