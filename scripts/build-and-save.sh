#!/bin/bash

# KB Frontend - 构建和保存Docker镜像脚本
# 用于在ServerA上构建镜像并保存为tar文件，以便传输到ServerB

set -e

echo "🚀 开始构建KB Frontend Docker镜像..."

# 设置镜像名称和标签
IMAGE_NAME="kb_frontend-kb-frontend"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
TAR_FILE="kb_frontend_image.tar"

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行或无法访问"
    exit 1
fi

echo "📦 构建镜像: ${FULL_IMAGE_NAME}"

# 构建镜像
docker compose build kb-frontend

# 标记镜像
docker tag kb_frontend-kb-frontend:latest ${FULL_IMAGE_NAME}

echo "💾 保存镜像到文件: ${TAR_FILE}"

# 保存镜像到tar文件
docker save -o ${TAR_FILE} ${FULL_IMAGE_NAME}

# 检查文件大小
FILE_SIZE=$(du -h ${TAR_FILE} | cut -f1)
echo "✅ 镜像已保存: ${TAR_FILE} (${FILE_SIZE})"

echo ""
echo "📋 下一步操作:"
echo "1. 将 ${TAR_FILE} 传输到ServerB"
echo "2. 在ServerB上运行: docker load -i ${TAR_FILE}"
echo "3. 复制 docker-compose.serverb.yml 到ServerB并重命名为 docker-compose.yml"
echo "4. 创建 .env.local 文件配置ServerB的环境变量"
echo "5. 在ServerB上运行: docker compose up -d"
echo ""
echo "🔧 传输命令示例:"
echo "scp ${TAR_FILE} user@serverb:/path/to/deployment/"
echo "scp docker-compose.serverb.yml user@serverb:/path/to/deployment/docker-compose.yml"
echo "scp .env.runtime user@serverb:/path/to/deployment/.env.local"
echo ""
echo "✨ 构建完成！"