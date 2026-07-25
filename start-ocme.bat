@echo off
cd /d "%~dp0"
start "OCME MVP" cmd /k npm start
start http://127.0.0.1:4173
