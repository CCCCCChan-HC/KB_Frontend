@echo off
REM KB Frontend - 构建和保存Docker镜像脚本 (Windows版本)
REM 用于在ServerA上构建镜像并保存为tar文件，以便传输到ServerB

setlocal enabledelayedexpansion

echo 🚀 开始构建KB Frontend Docker镜像...

REM 设置镜像名称和标签
set IMAGE_NAME=kb_frontend-kb-frontend
set IMAGE_TAG=latest
set FULL_IMAGE_NAME=%IMAGE_NAME%:%IMAGE_TAG%
set TAR_FILE=kb_frontend_image.tar

REM 检查Docker是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker未运行或无法访问
    exit /b 1
)

echo 📦 构建镜像: %FULL_IMAGE_NAME%

REM 构建镜像
docker compose build kb-frontend
if errorlevel 1 (
    echo ❌ 镜像构建失败
    exit /b 1
)

REM 标记镜像
docker tag kb_frontend-kb-frontend:latest %FULL_IMAGE_NAME%

echo 💾 保存镜像到文件: %TAR_FILE%

REM 保存镜像到tar文件
docker save -o %TAR_FILE% %FULL_IMAGE_NAME%
if errorlevel 1 (
    echo ❌ 镜像保存失败
    exit /b 1
)

REM 检查文件大小
for %%A in (%TAR_FILE%) do set FILE_SIZE=%%~zA
set /a FILE_SIZE_MB=%FILE_SIZE%/1024/1024
echo ✅ 镜像已保存: %TAR_FILE% (~%FILE_SIZE_MB%MB)

echo.
echo 📋 下一步操作:
echo 1. 将 %TAR_FILE% 传输到ServerB
echo 2. 在ServerB上运行: docker load -i %TAR_FILE%
echo 3. 复制 docker-compose.serverb.yml 到ServerB并重命名为 docker-compose.yml
echo 4. 创建 .env.local 文件配置ServerB的环境变量
echo 5. 在ServerB上运行: docker compose up -d
echo.
echo 🔧 传输命令示例:
echo scp %TAR_FILE% user@serverb:/path/to/deployment/
echo scp docker-compose.serverb.yml user@serverb:/path/to/deployment/docker-compose.yml
echo scp .env.runtime user@serverb:/path/to/deployment/.env.local
echo.
echo ✨ 构建完成！

pause