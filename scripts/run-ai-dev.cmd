@echo off
cd /d E:\Ai jjfajgsw\jianshenapp\apps\ai-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 1>>"E:\Ai jjfajgsw\jianshenapp\.logs\ai-dev.out.log" 2>>"E:\Ai jjfajgsw\jianshenapp\.logs\ai-dev.err.log"
