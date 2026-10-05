#!/usr/bin/env bash
# Abre o widget do Embate 2026 numa janela pequena, sem barras, sempre no topo e em
# todos os ambientes de trabalho. Linux (X11, ou Wayland via XWayland) e macOS.
#
# Uso: widget/embate-widget.sh [opções]
#   --url URL          endereço do site (padrão: $EMBATE_URL ou http://localhost:8000/)
#   --navegador NOME   chrome | chromium | edge | brave | firefox (padrão: o primeiro instalado)
#   --tamanho LxA      tamanho da janela (padrão: 480x270)
#   --instalar         cria um atalho "Embate 2026 (widget)" no menu de aplicativos (Linux)
set -euo pipefail

URL="${EMBATE_URL:-http://localhost:8000/}"
NAV=""
LARG=480
ALT=270
INSTALAR=0
TITULO="Embate 2026 - Widget"   # document.title da página em modo ?widget
SO="$(uname -s)"

info() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[1;35mAVISO:\033[0m %s\n' "$*" >&2; }
erro() { printf '\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

while (($#)); do
  case "$1" in
    --url) URL="${2:?falta o endereço}"; shift 2 ;;
    --navegador) NAV="${2:?falta o nome do navegador}"; shift 2 ;;
    --tamanho)
      [[ "${2:-}" =~ ^([0-9]+)x([0-9]+)$ ]] || erro "tamanho inválido: ${2:-} (use LxA, ex.: 480x270)"
      LARG="${BASH_REMATCH[1]}"; ALT="${BASH_REMATCH[2]}"; shift 2 ;;
    --instalar) INSTALAR=1; shift ;;
    -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) erro "opção desconhecida: $1 (veja --help)" ;;
  esac
done

if [[ "$SO" == Darwin ]]; then
  DADOS="$HOME/Library/Application Support/embate-widget"
else
  DADOS="${XDG_DATA_HOME:-$HOME/.local/share}/embate-widget"
fi

# http://x:8000 -> http://x:8000/?widget ; .../index.html -> .../index.html?widget
BASE="${URL%%[?#]*}"
[[ "$BASE" == *.html ]] || BASE="${BASE%/}/"
WIDGET_URL="$BASE?widget"
ORIGEM="$(sed -E 's#^([a-z]+://[^/]+).*#\1#' <<<"$BASE")"

# --- Atalho no menu ----------------------------------------------------------
if ((INSTALAR)); then
  [[ "$SO" == Linux ]] || erro "--instalar só existe no Linux"
  ATALHO="${XDG_DATA_HOME:-$HOME/.local/share}/applications/embate-widget.desktop"
  mkdir -p "$(dirname "$ATALHO")"
  EXEC="\"$(cd "$(dirname "$0")" && pwd)/$(basename "$0")\" --url \"$URL\" --tamanho ${LARG}x$ALT"
  [[ -n "$NAV" ]] && EXEC+=" --navegador $NAV"
  cat > "$ATALHO" <<EOF
[Desktop Entry]
Type=Application
Name=Embate 2026 (widget)
Comment=Apuração da eleição como luta, sempre no topo
Exec=$EXEC
Icon=applications-games
Terminal=false
Categories=Game;
EOF
  info "Atalho criado: $ATALHO"
  exit 0
fi

# --- Acha o navegador ----------------------------------------------------------
candidatos() {
  if [[ "$SO" == Darwin ]]; then
    case "$1" in
      chrome) echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ;;
      chromium) echo "/Applications/Chromium.app/Contents/MacOS/Chromium" ;;
      edge) echo "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" ;;
      brave) echo "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" ;;
      firefox) echo "/Applications/Firefox.app/Contents/MacOS/firefox" ;;
    esac
  else
    case "$1" in
      chrome) echo google-chrome; echo google-chrome-stable ;;
      chromium) echo chromium; echo chromium-browser ;;
      edge) echo microsoft-edge; echo microsoft-edge-stable ;;
      brave) echo brave-browser; echo brave ;;
      firefox) echo firefox ;;
    esac
  fi
}

achar() {
  local c
  while IFS= read -r c; do
    if [[ "$c" == /* ]]; then [[ -x "$c" ]] && { echo "$c"; return 0; }
    else command -v "$c" 2>/dev/null && return 0
    fi
  done < <(candidatos "$1")
  return 1
}

if [[ -n "$NAV" ]]; then
  [[ "$NAV" =~ ^(chrome|chromium|edge|brave|firefox)$ ]] || erro "navegador desconhecido: $NAV"
  BIN="$(achar "$NAV")" || erro "não achei o $NAV instalado"
else
  for n in chrome chromium edge brave firefox; do
    if BIN="$(achar "$n")"; then NAV="$n"; break; fi
  done
  [[ -n "$NAV" ]] || erro "não achei Chrome, Chromium, Edge, Brave nem Firefox"
fi
info "Usando $NAV ($BIN)"

# --- Abre a janela ----------------------------------------------------------------
LOG="$DADOS/$NAV.log"
mkdir -p "$DADOS"

janela_widget() { wmctrl -l 2>/dev/null | grep -F "$TITULO" | head -1 | cut -d' ' -f1 || true; }

if [[ "$SO" == Linux ]] && command -v wmctrl >/dev/null && [[ -n "$(janela_widget)" ]]; then
  info "O widget já estava aberto; só reaplicando topo e posição."
  JA_ABERTO=1
else
  JA_ABERTO=0
fi

if ((JA_ABERTO)); then
  :
elif [[ "$NAV" == firefox ]]; then
  # Firefox não tem modo "app": perfil próprio, com CSS que esconde abas e barras.
  PERFIL="$DADOS/firefox"
  mkdir -p "$PERFIL/chrome"
  cat > "$PERFIL/user.js" <<'EOF'
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.tabs.inTitlebar", 0);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.aboutwelcome.enabled", false);
user_pref("startup.homepage_welcome_url", "");
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
user_pref("browser.sessionstore.resume_from_crash", false);
EOF
  cat > "$PERFIL/chrome/userChrome.css" <<'EOF'
#TabsToolbar, #nav-bar, #PersonalToolbar, #titlebar, #notifications-toolbar { visibility: collapse !important; }
EOF
  if [[ "$SO" == Linux ]]; then
    MOZ_ENABLE_WAYLAND=0 "$BIN" --profile "$PERFIL" --no-remote --new-instance "$WIDGET_URL" >"$LOG" 2>&1 &
  else
    "$BIN" --profile "$PERFIL" --no-remote --new-instance "$WIDGET_URL" >"$LOG" 2>&1 &
  fi
else
  ARGS=(--user-data-dir="$DADOS/$NAV" --no-first-run --no-default-browser-check)
  if [[ "$SO" == Darwin ]]; then
    # No macOS não dá para fixar a janela por fora: abre o site e o botão WIDGET usa o PiP,
    # que já fica por cima. A flag libera o PiP também em endereços http da rede local.
    ARGS+=(--app="$BASE" --unsafely-treat-insecure-origin-as-secure="$ORIGEM" --window-size=1100,800)
  else
    ARGS+=(--app="$WIDGET_URL" --class=EmbateWidget --window-size="$LARG,$ALT")
    # wmctrl só enxerga janelas X11; no Wayland o navegador roda via XWayland.
    [[ -n "${WAYLAND_DISPLAY:-}" ]] && ARGS+=(--ozone-platform=x11)
  fi
  "$BIN" "${ARGS[@]}" >"$LOG" 2>&1 &
fi

if [[ "$SO" == Darwin ]]; then
  info "Aberto. Clique em WIDGET para soltar a luta numa janela flutuante sempre no topo."
  [[ "$NAV" == firefox ]] && aviso "o Firefox não tem janela flutuante para páginas; no macOS ele não consegue ficar sempre no topo. Use Chrome, Edge ou Brave."
  exit 0
fi

# --- Linux: sempre no topo + todos os ambientes de trabalho ---------------------------
manual() {
  aviso "$1"
  echo "    Faça à mão: clique com o botão direito na barra de título do widget e marque"
  echo "    \"Sempre no topo\" e \"Sempre na área de trabalho visível\" (ou \"Em todas as áreas de trabalho\")."
  exit 0
}
command -v wmctrl >/dev/null || manual "wmctrl não instalado (sudo apt install wmctrl / sudo dnf install wmctrl / sudo pacman -S wmctrl)."

ID=""
for _ in $(seq 1 60); do
  ID="$(janela_widget)"
  [[ -n "$ID" ]] && break
  sleep 0.25
done
[[ -n "$ID" ]] || manual "a janela do widget não apareceu em 15s (o site $BASE está no ar?). Log: $LOG"

wmctrl -i -r "$ID" -b add,above,sticky || manual "o gerenciador de janelas recusou o pedido."

# Canto inferior direito da área de trabalho, com margem para painéis.
if TELA="$(wmctrl -d | awk '$2 == "*" { print $4 }')" && [[ "$TELA" =~ ^([0-9]+)x([0-9]+)$ ]]; then
  X=$((BASH_REMATCH[1] - LARG - 24))
  Y=$((BASH_REMATCH[2] - ALT - 72))
  wmctrl -i -r "$ID" -e "0,$X,$Y,$LARG,$ALT" || true
fi
info "Widget aberto: sempre no topo e em todos os ambientes de trabalho."
