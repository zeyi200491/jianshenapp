@echo off
cd /d E:\Ai jjfajgsw\jianshenapp
set API_DATA_MODE=database
apps\api\node_modules\.bin\ts-node.cmd apps\api\src\main.ts 1>>"E:\Ai jjfajgsw\jianshenapp\.logs\api-dev.out.log" 2>>"E:\Ai jjfajgsw\jianshenapp\.logs\api-dev.err.log"
