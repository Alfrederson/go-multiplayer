@REM SET GOCACHE=%CD%/.build
@echo off
echo gerando
@REM del generator.exe
go run -ldflags="-s -w" cmd/gen_msg_codes/main.go 
if %ERRORLEVEL% neq 0 (
    echo codegen failed!
    exit /b %ERRORLEVEL%
)

echo buildando
go build .
if %ERRORLEVEL% neq 0 (
    echo Build failed!
    exit /b %ERRORLEVEL%
)
echo iniciando
:: Run the executable
backend_game.exe