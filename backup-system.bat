@echo off
setlocal EnableExtensions

rem Backup f?sico do PocketBase: preserva banco, anexos e chave de criptografia.
set "ROOT=%~dp0"
set "PB_DIR=%ROOT%apps\pocketbase"
set "BACKUP_DIR=%ROOT%backups"
if not exist "%PB_DIR%\pb_data" (echo [ERRO] apps\pocketbase\pb_data nao encontrada.& exit /b 1)
if not exist "%PB_DIR%\.encryption-key" (echo [ERRO] Chave do PocketBase nao encontrada.& exit /b 1)
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "ARCHIVE=%BACKUP_DIR%\pocketbase-%STAMP%.zip"
tar.exe -a -c -f "%ARCHIVE%" -C "%PB_DIR%" pb_data .encryption-key
if errorlevel 1 (echo [ERRO] Falha ao criar %ARCHIVE%.& exit /b 1)
echo Backup criado: %ARCHIVE%
echo Proteja este arquivo: ele contem dados e a chave de criptografia.
endlocal
