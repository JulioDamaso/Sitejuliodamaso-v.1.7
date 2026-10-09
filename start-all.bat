@echo off
setlocal

rem Inicia PocketBase (via WSL), API e frontend em janelas separadas.
set "ROOT=%~dp0"
set "PB_DIR=%ROOT%apps\pocketbase"
if not exist "%PB_DIR%\.encryption-key" (echo [ERRO] Chave do PocketBase nao encontrada.& exit /b 1)
set /p "PB_ENCRYPTION_KEY="<"%PB_DIR%\.encryption-key"
if not exist "%ROOT%apps\api\.env" (echo [ERRO] Arquivo apps\api\.env nao encontrado.& exit /b 1)
for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%apps\api\.env") do (
    if "%%A"=="PB_SUPERUSER_EMAIL" set "PB_SUPERUSER_EMAIL=%%B"
    if "%%A"=="PB_SUPERUSER_PASSWORD" set "PB_SUPERUSER_PASSWORD=%%B"
)
if not defined PB_SUPERUSER_EMAIL (echo [ERRO] PB_SUPERUSER_EMAIL nao configurado em apps\api\.env.& exit /b 1)
if not defined PB_SUPERUSER_PASSWORD (echo [ERRO] PB_SUPERUSER_PASSWORD nao configurado em apps\api\.env.& exit /b 1)
for /f "tokens=1" %%i in ('wsl.exe -- hostname -I') do set "POCKETBASE_URL=http://%%i:8090"

where node >nul 2>nul || (echo [ERRO] Node.js nao foi encontrado no PATH.& exit /b 1)
where npm >nul 2>nul || (echo [ERRO] npm nao foi encontrado no PATH.& exit /b 1)
where wsl >nul 2>nul || (echo [ERRO] WSL e necessario porque o binario PocketBase deste projeto e Linux.& exit /b 1)

echo Iniciando PocketBase em http://localhost:8090...
start "PocketBase" /D "%PB_DIR%" wsl.exe --cd "%PB_DIR%" -- env "PB_ENCRYPTION_KEY=%PB_ENCRYPTION_KEY%" "PB_SUPERUSER_EMAIL=%PB_SUPERUSER_EMAIL%" "PB_SUPERUSER_PASSWORD=%PB_SUPERUSER_PASSWORD%" ./pocketbase serve --http=0.0.0.0:8090 --encryptionEnv=PB_ENCRYPTION_KEY --migrationsDir=./pb_migrations --hooksDir=./pb_hooks --hooksWatch=false

echo Iniciando API em http://localhost:3001...
start "API" /D "%ROOT%apps\api" cmd /k "set POCKETBASE_URL=%POCKETBASE_URL%&& npm run dev"

echo Iniciando frontend em http://localhost:3000...
start "Frontend" /D "%ROOT%apps\web" cmd /k "set VITE_POCKETBASE_URL=%POCKETBASE_URL%&& npm run dev"

echo Sistema iniciado. Feche as tres janelas para encerrar os servicos.
endlocal
