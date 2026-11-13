@echo off
title SafeRoute Delhi - FastAPI Backend
echo ====================================================
echo Starting SafeRoute Backend Server on port 8000
echo ====================================================
if exist .venv\Scripts\python.exe (
    call .venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    call python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
)
pause

