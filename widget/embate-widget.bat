@echo off
rem Dois cliques para abrir o widget. Repassa os argumentos para o script PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0embate-widget.ps1" %*
if errorlevel 1 pause
