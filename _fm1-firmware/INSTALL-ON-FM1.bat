@echo off
rem Slimehedron for the FM-1: double-click to open the installer page for slimehedron-fm1.fwsc (in this folder).
rem It serves SLOOP's own installer page from WSL on this pc only, then opens it in your browser.
rem Use Chrome or Edge, a data USB cable, close other MIDI apps. Close this window when the install is done.
echo Starting the installer page for slimehedron-fm1.fwsc ...
start "" cmd /c "timeout /t 6 >nul & start http://localhost:8766/webapp/installer/"
wsl -e bash -lc "sh '/mnt/c/flah plugins/plinky/fm1/firmware/install-site.sh' '/mnt/c/flah plugins/plinky/_fm1-firmware/slimehedron-fm1.fwsc'"
pause
