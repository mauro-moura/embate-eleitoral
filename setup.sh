#!/usr/bin/env bash
# Instala o Embate 2026 e já deixa o site rodando.
# Pode rodar de novo sem medo: para a instância anterior e sobe outra.
#
# Uso: ./setup.sh [porta]        (padrão: 8000, ou a última porta usada)
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICO=embate2026
CONF="$DIR/.embate.conf"
PIDFILE="$DIR/.embate.pid"
LOG="$DIR/.embate.log"
UNIT="$HOME/.config/systemd/user/$SERVICO.service"

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
nossa_instancia() {
  if tem_systemd && [[ -f "$UNIT" ]]; then
    systemctl --user is-active --quiet "$SERVICO" && return 0
  fi
  [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null \
    && grep -q http.server "/proc/$(cat "$PIDFILE")/cmdline" 2>/dev/null
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
if tem_systemd; then
  info "Instalando serviço systemd de usuário ($SERVICO)"
  mkdir -p "$(dirname "$UNIT")"
  cat > "$UNIT" <<EOF
[Unit]
Description=Embate 2026 - site da apuração
After=network-online.target

[Service]
ExecStart=$PYTHON -m http.server $PORTA --directory $DIR
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
  nohup "$PYTHON" -m http.server "$PORTA" --directory "$DIR" > "$LOG" 2>&1 &
  echo $! > "$PIDFILE"
  MODO="processo em segundo plano (PID $(cat "$PIDFILE"), log em .embate.log)"
fi

# --- Confere se respondeu ---------------------------------------------------------
for _ in $(seq 1 20); do
  if "$PYTHON" -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:$PORTA/', timeout=1)" 2>/dev/null; then
    IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
    info "Embate 2026 no ar: $MODO"
    echo "    Neste computador:  http://localhost:$PORTA"
    [[ -n "$IP" ]] && echo "    Na rede local:     http://$IP:$PORTA"
    exit 0
  fi
  sleep 0.5
done

if tem_systemd; then
  erro "o servidor não respondeu. Veja o log com: journalctl --user -u $SERVICO -n 30"
else
  erro "o servidor não respondeu. Veja o log em $LOG"
fi
