#!/usr/bin/env bash
# Instala o Embate Eleitoral e já deixa o site rodando.
# Pode rodar de novo sem medo: para a instância anterior e sobe outra.
#
# Uso: ./setup.sh [porta]        (padrão: 8000, ou a última porta usada)
#
# Se existir o certificado gerado por ssl/gerar-certificado.sh, o site sobe em HTTPS.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICO=embate-eleitoral
CONF="$DIR/.embate.conf"
PIDFILE="$DIR/.embate.pid"
LOG="$DIR/.embate.log"
UNIT="$HOME/.config/systemd/user/$SERVICO.service"
SSL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/embate-eleitoral/ssl"

info() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[1;35mAVISO:\033[0m %s\n' "$*" >&2; }
erro() { printf '\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

PORTA_SALVA=""
[[ -f "$CONF" ]] && PORTA_SALVA="$(sed -n 's/^PORTA=//p' "$CONF")"
PORTA="${1:-${PORTA_SALVA:-8000}}"

# --- Pré-requisitos ---------------------------------------------------------
PYTHON="$(command -v python3 || true)"
[[ -n "$PYTHON" ]] || erro "python3 não encontrado. Instale com: sudo apt install python3"
"$PYTHON" -c 'import sys; sys.exit(sys.version_info < (3, 7))' || erro "é preciso Python 3.7 ou mais novo"
[[ "$PORTA" =~ ^[0-9]+$ ]] && (( PORTA >= 1024 && PORTA <= 65535 )) || erro "porta inválida: $PORTA (use 1024 a 65535)"

tem_systemd() { systemctl --user show-environment >/dev/null 2>&1; }

porta_ocupada() {
  "$PYTHON" - "$1" <<'PY'
import socket, sys
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # ignora TIME_WAIT, só detecta quem escuta
try:
    s.bind(("", int(sys.argv[1])))
except OSError:
    sys.exit(0)
sys.exit(1)
PY
}

# --- Para o que estiver rodando -----------------------------------------------
# Serviço com o nome antigo (antes de virar "Embate Eleitoral"): remove para liberar a porta.
UNIT_ANTIGA="$HOME/.config/systemd/user/embate2026.service"
if tem_systemd && [[ -f "$UNIT_ANTIGA" ]]; then
  info "Removendo o serviço antigo embate2026"
  systemctl --user disable --now embate2026 >/dev/null 2>&1 || true
  rm -f "$UNIT_ANTIGA"
  systemctl --user daemon-reload
fi

nossa_instancia() {
  if tem_systemd && [[ -f "$UNIT" ]]; then
    systemctl --user is-active --quiet "$SERVICO" && return 0
  fi
  [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null \
    && grep -qE 'server\.py|http\.server' "/proc/$(cat "$PIDFILE")/cmdline" 2>/dev/null
}

# Checa a porta ANTES de derrubar o site atual, para não deixá-lo fora do ar à toa.
# Só pula a checagem se a porta for a que a nossa própria instância está usando.
if ! { [[ "$PORTA" == "$PORTA_SALVA" ]] && nossa_instancia; }; then
  porta_ocupada "$PORTA" && erro "a porta $PORTA já está em uso por outro programa. Rode: ./setup.sh <outra-porta>"
fi

if tem_systemd && [[ -f "$UNIT" ]]; then
  systemctl --user stop "$SERVICO" 2>/dev/null || true
fi
if nossa_instancia; then
  info "Parando instância anterior (PID $(cat "$PIDFILE"))"
  kill "$(cat "$PIDFILE")"
  sleep 1
fi
rm -f "$PIDFILE"

echo "PORTA=$PORTA" > "$CONF"

# --- Sobe o servidor -----------------------------------------------------------
CMD=("$PYTHON" "$DIR/server.py" --porta "$PORTA" --dir "$DIR")
ESQUEMA=http
if [[ -f "$SSL_DIR/servidor.crt" && -f "$SSL_DIR/servidor.key" ]]; then
  CMD+=(--cert "$SSL_DIR/servidor.crt" --key "$SSL_DIR/servidor.key" --ca "$SSL_DIR/ca.crt")
  ESQUEMA=https
fi

if tem_systemd; then
  info "Instalando serviço systemd de usuário ($SERVICO)"
  mkdir -p "$(dirname "$UNIT")"
  cat > "$UNIT" <<EOF
[Unit]
Description=Embate Eleitoral - site da apuração
After=network-online.target

[Service]
ExecStart=$(printf '"%s" ' "${CMD[@]}")
Restart=on-failure

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now "$SERVICO" >/dev/null 2>&1

  # Sem "linger", o serviço só sobe depois que você faz login.
  if [[ "$(loginctl show-user "$USER" -p Linger --value 2>/dev/null)" != "yes" ]]; then
    loginctl enable-linger "$USER" 2>/dev/null \
      || aviso "para o site subir sozinho no boot, sem login, rode uma vez: sudo loginctl enable-linger $USER"
  fi
  MODO="serviço systemd (sobe sozinho no boot)"
else
  aviso "systemd não disponível; rodando em segundo plano (não volta sozinho após reiniciar)"
  nohup "${CMD[@]}" > "$LOG" 2>&1 &
  echo $! > "$PIDFILE"
  MODO="processo em segundo plano (PID $(cat "$PIDFILE"), log em .embate.log)"
fi

# --- Confere se respondeu ---------------------------------------------------------
for _ in $(seq 1 20); do
  if "$PYTHON" - "$ESQUEMA" "$PORTA" "$SSL_DIR/ca.crt" 2>/dev/null <<'PY'
import ssl, sys, urllib.request
esquema, porta, ca = sys.argv[1:]
ctx = ssl.create_default_context(cafile=ca) if esquema == 'https' else None
urllib.request.urlopen(f'{esquema}://localhost:{porta}/', timeout=1, context=ctx)
PY
  then
    IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
    info "Embate Eleitoral no ar ($ESQUEMA): $MODO"
    echo "    Neste computador:  $ESQUEMA://localhost:$PORTA"
    [[ -n "$IP" ]] && echo "    Na rede local:     $ESQUEMA://$IP:$PORTA"
    if [[ "$ESQUEMA" == https ]]; then
      echo "    Para os navegadores confiarem, instale a CA em cada computador cliente:"
      echo "      ssl/instalar-ca.sh $ESQUEMA://${IP:-localhost}:$PORTA   (Linux/macOS; Windows: veja o README)"
    fi
    exit 0
  fi
  sleep 0.5
done

if tem_systemd; then
  erro "o servidor não respondeu. Veja o log com: journalctl --user -u $SERVICO -n 30"
else
  erro "o servidor não respondeu. Veja o log em $LOG"
fi
