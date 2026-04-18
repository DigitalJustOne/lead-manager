@echo off
echo Iniciando Back-End Local (SQLite + Express)...
start cmd /k "cd backend && npm start"

echo Iniciando Front-End (Vite + React)...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo EL CRM LOCAL HA SIDO INICIADO.
echo - El servidor Backend esta en el puerto 3001
echo - La interfaz Frontend esta abriendose en tu navegador...
echo ========================================================
