@echo off
echo buildando
go build .
if %ERRORLEVEL% neq 0 (
    echo Build failed!
    exit /b %ERRORLEVEL%
)
echo iniciando
:: Run the executable
backend_game.exe