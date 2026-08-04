@echo off
title STG 中文版
cd /d C:\Users\Administrator\stg_cn\site
echo 正在启动本地服务器...
echo 启动后浏览器打开: http://127.0.0.1:8080/gallery.html
echo 关闭此窗口即停止服务
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8080/gallery.html'"
python -m http.server 8080
pause
