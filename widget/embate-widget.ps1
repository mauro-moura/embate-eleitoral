# Abre o widget do Embate Eleitoral numa janela pequena, sem barras e sempre no topo (Windows).
#
# Uso: powershell -ExecutionPolicy Bypass -File widget\embate-widget.ps1 [-Url URL] [-Navegador chrome|edge|brave|firefox] [-Largura 480] [-Altura 270] [-Estilo kamehameha|naruto]
#   ou dois cliques em widget\embate-widget.bat
#
# Para aparecer em todas as áreas de trabalho virtuais, instale uma vez o módulo VirtualDesktop:
#   Install-Module VirtualDesktop -Scope CurrentUser
param(
  [string]$Url = $(if ($env:EMBATE_URL) { $env:EMBATE_URL } else { 'http://localhost:8000/' }),
  [ValidateSet('', 'chrome', 'edge', 'brave', 'firefox')][string]$Navegador = '',
  [int]$Largura = 480,
  [int]$Altura = 270,
  [string]$Estilo = ''
)
$ErrorActionPreference = 'Stop'
$Titulo = 'Embate Eleitoral - Widget'   # document.title da página em modo ?widget

function Info($m) { Write-Host "==> $m" -ForegroundColor Yellow }
function Aviso($m) { Write-Host "AVISO: $m" -ForegroundColor Magenta }

$base = ($Url -split '[?#]')[0]
if ($base -notlike '*.html') { $base = $base.TrimEnd('/') + '/' }
$widgetUrl = "${base}?widget"
if ($Estilo) { $widgetUrl += "&estilo=$Estilo" }

$pf86 = ${env:ProgramFiles(x86)}
$candidatos = [ordered]@{
  chrome  = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "$pf86\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
  edge    = @("$pf86\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")
  brave   = @("$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe", "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe")
  firefox = @("$env:ProgramFiles\Mozilla Firefox\firefox.exe", "$pf86\Mozilla Firefox\firefox.exe")
}
$nomes = if ($Navegador) { @($Navegador) } else { @($candidatos.Keys) }
$bin = $null
foreach ($n in $nomes) {
  $bin = $candidatos[$n] | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($bin) { $Navegador = $n; break }
}
if (-not $bin) { throw "Não achei Chrome, Edge, Brave nem Firefox instalado." }
Info "Usando $Navegador ($bin)"

function Achar-Janela { Get-Process | Where-Object { $_.MainWindowTitle -like "*$Titulo*" } | Select-Object -First 1 }

$dados = Join-Path $env:LOCALAPPDATA 'embate-widget'
New-Item -ItemType Directory -Force -Path $dados | Out-Null

if (Achar-Janela) {
  Info 'O widget já estava aberto; só reaplicando a posição.'
} elseif ($Navegador -eq 'firefox') {
  # Firefox não tem modo "app": perfil próprio, com CSS que esconde abas e barras.
  $perfil = Join-Path $dados 'firefox'
  New-Item -ItemType Directory -Force -Path (Join-Path $perfil 'chrome') | Out-Null
  @'
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.tabs.inTitlebar", 0);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.aboutwelcome.enabled", false);
user_pref("startup.homepage_welcome_url", "");
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
user_pref("browser.sessionstore.resume_from_crash", false);
'@ | Set-Content -Encoding ASCII (Join-Path $perfil 'user.js')
  '#TabsToolbar, #nav-bar, #PersonalToolbar, #titlebar, #notifications-toolbar { visibility: collapse !important; }' |
    Set-Content -Encoding ASCII (Join-Path $perfil 'chrome\userChrome.css')
  Start-Process $bin -ArgumentList @('--profile', "`"$perfil`"", '--no-remote', '--new-instance', $widgetUrl)
} else {
  Start-Process $bin -ArgumentList @("--app=$widgetUrl", "--user-data-dir=`"$(Join-Path $dados $Navegador)`"",
    '--no-first-run', '--no-default-browser-check', "--window-size=$Largura,$Altura")
}

# Acha a janela pelo título (até 15s).
$janela = $null
for ($i = 0; $i -lt 60 -and -not $janela; $i++) {
  Start-Sleep -Milliseconds 250
  $janela = Achar-Janela
}
if (-not $janela) {
  Aviso "A janela do widget não apareceu em 15s (o site $base está no ar?)."
  exit 1
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class EmbateWin {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
}
'@
[void][EmbateWin]::SetProcessDPIAware()
$area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$x = $area.Right - $Largura - 24
$y = $area.Bottom - $Altura - 24
# HWND_TOPMOST = -1: fica por cima de todas as janelas (canto inferior direito).
[void][EmbateWin]::SetWindowPos($janela.MainWindowHandle, [IntPtr](-1), $x, $y, $Largura, $Altura, 0x0040)

if (Get-Module -ListAvailable -Name VirtualDesktop) {
  Import-Module VirtualDesktop
  Pin-Window $janela.MainWindowHandle
  Info 'Widget aberto: sempre no topo e em todas as áreas de trabalho.'
} else {
  Info 'Widget aberto e sempre no topo.'
  Aviso 'Para aparecer em todas as áreas de trabalho: Win+Tab, botão direito no widget, "Mostrar esta janela em todas as áreas de trabalho". Ou instale uma vez: Install-Module VirtualDesktop -Scope CurrentUser'
}
