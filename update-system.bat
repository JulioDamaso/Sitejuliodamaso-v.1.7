@echo off
setlocal EnableExtensions

rem Atualiza o codigo sem substituir banco, anexos, .env ou chave do PocketBase.
set "ROOT=%~dp0"
set "PACKAGE=%~1"
if "%PACKAGE%"=="" set "PACKAGE=%ROOT%app.tar.gz"
if not exist "%PACKAGE%" (echo [ERRO] Pacote nao encontrado: %PACKAGE%& echo Uso: update-system.bat caminho\para\app.tar.gz& exit /b 1)

call "%ROOT%backup-system.bat"
if errorlevel 1 (echo [ERRO] Atualizacao cancelada porque o backup falhou.& exit /b 1)

for /f %%i in ('powershell -NoProfile -Command "Join-Path $env:TEMP ('jd-office-update-' + [guid]::NewGuid().ToString())"') do set "STAGE=%%i"
mkdir "%STAGE%"
tar.exe -xzf "%PACKAGE%" -C "%STAGE%"
if errorlevel 1 (echo [ERRO] Falha ao extrair o pacote.& exit /b 1)

rem Preserva dados, segredos e backups locais. O restante do codigo pode ser atualizado.
robocopy "%STAGE%" "%ROOT%" /E /XF .env .encryption-key /XD pb_data node_modules backups vault
if errorlevel 8 (echo [ERRO] Falha ao copiar a nova versao.& exit /b 1)

cd /d "%ROOT%"
npm install
if errorlevel 1 (echo [ERRO] npm install falhou.& exit /b 1)
npm run build
if errorlevel 1 (echo [ERRO] build falhou; o backup continua preservado.& exit /b 1)
call "%ROOT%start-all.bat"
echo Atualizacao concluida. As migracoes do PocketBase serao executadas na inicializacao.
endlocal
