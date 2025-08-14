#!/bin/bash

# KB Frontend - ServerB部署脚本
# 用于在ServerB上加载镜像并启动服务

set -e

echo "🚀 开始在ServerB上部署KB Frontend..."

# 配置变量
TAR_FILE="kb_frontend_image.tar"
IMAGE_NAME="kb_frontend-kb-frontend:latest"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.local"

# 检查必要文件
echo "📋 检查部署文件..."

if [ ! -f "${TAR_FILE}" ]; then
    echo "❌ 镜像文件不存在: ${TAR_FILE}"
    echo "请确保已从ServerA传输镜像文件"
    exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "❌ Docker Compose文件不存在: ${COMPOSE_FILE}"
    echo "请确保已复制 docker-compose.serverb.yml 并重命名为 docker-compose.yml"
    exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
    echo "⚠️  环境变量文件不存在: ${ENV_FILE}"
    echo "建议创建 .env.local 文件配置环境变量"
    echo "可以参考 .env.runtime 文件"
fi

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行或无法访问"
    exit 1
fi

echo "📦 加载Docker镜像..."

# 加载镜像
docker load -i ${TAR_FILE}

echo "🔍 验证镜像加载..."

# 验证镜像
if docker images | grep -q "kb_frontend-kb-frontend"; then
    echo "✅ 镜像加载成功"
else
    echo "❌ 镜像加载失败"
    exit 1
fi

echo "🛑 停止现有服务..."

# 停止现有服务（如果存在）
docker compose down 2>/dev/null || true

echo "🚀 启动服务..."

# 启动服务
docker compose up -d

echo "⏳ 等待服务启动..."
sleep 10

echo "📊 检查服务状态..."

# 检查服务状态
docker compose ps

echo ""
echo "🔍 检查服务日志..."
docker compose logs --tail=20 kb-frontend

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 服务信息:"
echo "- 容器状态: $(docker compose ps --format 'table {{.Service}}\t{{.Status}}')"
echo "- 访问地址: https://$(hostname):3000 (如果启用HTTPS)"
echo "- 访问地址: http://$(hostname):3000 (如果使用HTTP)"
echo ""
echo "🔧 常用命令:"
echo "- 查看日志: docker compose logs -f kb-frontend"
echo "- 重启服务: docker compose restart kb-frontend"
echo "- 停止服务: docker compose down"
echo "- 更新环境变量后重启: docker compose up -d --force-recreate"
echo ""
echo "📝 注意事项:"
echo "- 如需修改环境变量，请编辑 .env.local 文件后重启服务"
echo "- 如使用自签证书，浏览器可能显示安全警告，这是正常的"
echo "- 生产环境建议使用有效的SSL证书"