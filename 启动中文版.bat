@echo off
title ME Motion Studio
cd /d C:\Users\Administrator\font-animation\site
echo Starting local server...
echo Gallery: http://127.0.0.1:8080/gallery.html
echo Search Typing: http://127.0.0.1:8080/searchtyping.html
echo Close this window to stop the server.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8080/gallery.html'"
python -m http.server 8080
pause
