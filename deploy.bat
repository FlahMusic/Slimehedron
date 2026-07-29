@echo off
REM ============================================================
REM  Slimehedron one-click deploy. Double-click this file to
REM  push the current folder to GitHub -> GitHub Pages updates.
REM  First run asks you to sign in to GitHub once, then remembers.
REM ============================================================
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Get it from https://git-scm.com/download/win  then run this again.
  pause
  exit /b
)

if not exist ".git" (
  echo First-time setup...
  git init -b main
  git remote add origin https://github.com/FlahMusic/Slimehedron.git
)

REM Identity for the commit (local to this repo, uses GitHub's private no-reply email).
git config user.name "FlahMusic"
git config user.email "FlahMusic@users.noreply.github.com"
REM Make sure we're on 'main' even if init created 'master'.
git branch -M main

git add -A
git commit -m "update slimehedron"
if errorlevel 1 echo (nothing new to commit - pushing anyway)

REM This folder is the master copy, so force it as the source of truth.
git push -u origin main --force

echo.
echo ============================================================
echo  Done. Your site updates at flahmusic.github.io/Slimehedron
echo  in about a minute. If it asked you to log in, that was a
echo  one-time thing - it's saved now.
echo ============================================================
pause
