@echo off
chcp 65001 >nul
cd /d "d:\APP TIZEN"
echo ========================================================
echo   MPKA Iptv - Publicar Atualizacao no GitHub (OTA)
echo   Repositorio: https://github.com/mp-lavi/mpka-iptv
echo ========================================================
echo.
git add -A
git commit -m "Atualizacao OTA MPKA Iptv" 2>nul
echo Enviando arquivos para o GitHub (se pedir login, clique em "Sign in with your browser")...
git push -u origin main
echo.
echo ========================================================
echo   Pronto! Os arquivos ja estao no seu GitHub!
echo ========================================================
pause
