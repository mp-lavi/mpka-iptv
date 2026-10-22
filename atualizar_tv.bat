@echo off
chcp 65001 >nul
echo ========================================================
echo   MPKA Iptv - Atualizador Rapido via Wi-Fi (Samsung TV)
echo ========================================================
echo.

set "NODE_BIN=C:\Users\mpedu\.gemini\antigravity\brain\52c10d68-becd-4d5e-beda-d742a5df1f25\scratch\runtime\node.exe"
set "SDB_BIN=C:\tizentv-tools\sdb\sdb.exe"
set "TV_IP=192.168.15.111"

echo [1/4] Empacotando e assinando MPKAIptv.wgt com certificado Samsung...
"%NODE_BIN%" -e "const { TVWebApp } = require('C:/Users/mpedu/.antigravity/extensions/tizensdk.tizentv-1.3.3/node_modules/@tizentv/webide-common-tizentv'); (async () => { const app = TVWebApp.openProject('d:/APP TIZEN'); await app.buildWidget('C:/tizen-studio-data/vscode-tizentv/resource/profiles.xml', '.project,.tproject,atualizar_tv.bat,.git,.gitignore,README.md'); console.log('Pacote .wgt assinado com sucesso!'); })()"

echo.
echo [2/4] Conectando a TV (%TV_IP%)...
"%SDB_BIN%" connect %TV_IP%

echo.
echo [3/4] Enviando e atualizando o app na TV (mantendo seus dados salvos)...
"%SDB_BIN%" -s %TV_IP%:26101 push "d:\APP TIZEN\MPKAIptv.wgt" /home/owner/share/tmp/sdk_tools/tmp/MPKAIptv.wgt
"%SDB_BIN%" -s %TV_IP%:26101 shell 0 vd_appinstall mpkaiptv01.MPKAIptv /home/owner/share/tmp/sdk_tools/tmp/MPKAIptv.wgt

echo.
echo [4/4] Abrindo o MPKA Iptv na TV...
"%SDB_BIN%" -s %TV_IP%:26101 shell 0 was_execute mpkaiptv01.MPKAIptv

echo.
echo ========================================================
echo   Atualizacao concluida!
echo ========================================================
pause
