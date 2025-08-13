# Docker 部署指南

## 功能特性

### 1. 运行时环境变量支持
- 支持通过挂载 `.env.local` 文件实现运行时配置更新
- 无需重新构建镜像即可修改应用配置
- 自动检测并加载运行时配置

### 2. HTTPS/TLS 支持
- 内置自签证书生成功能
- 支持生产环境 HTTPS 部署
- 解决 cookies 传递和安全性问题

## 快速开始

### 1. 基础 HTTP 部署

```bash
# 构建镜像
docker build -t kb-frontend:latest .

# 运行容器（HTTP模式）
docker run -d \
  --name kb-frontend \
  -p 3000:3000 \
  -v $(pwd)/.env.local:/app/.env.local:ro \
  kb-frontend:latest
```

### 2. HTTPS 部署（自签证书）

```bash
# 运行容器（HTTPS模式 - 自动生成自签证书）
docker run -d \
  --name kb-frontend \
  -p 3000:3000 \
  -e HTTPS=true \
  -e SSL_DOMAIN=your-domain.com \
  -v $(pwd)/.env.local:/app/.env.local:ro \
  kb-frontend:latest
```

### 3. 使用 Docker Compose

```bash
# 复制并编辑环境配置
cp .env.example .env.local

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 环境配置

### .env.local 文件示例

```bash
# Dify 应用配置
NEXT_PUBLIC_APP_ID=your_app_id
NEXT_PUBLIC_APP_KEY=your_app_key
NEXT_PUBLIC_API_URL=http://your-dify-api:8000/v1

# CAS 认证配置
NEXT_PUBLIC_CAS_BASE_URL=https://your-cas-server/cas
NEXT_PUBLIC_CAS_SERVICE_URL=https://your-domain.com/login
CAS_BASE_URL=http://your-cas-server:8443/cas
CAS_SERVICE_URL=https://your-domain.com/login

# NextAuth 配置
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-key

# 环境设置
NODE_ENV=production
```

## 高级配置

### 1. 使用自定义 TLS 证书

```bash
# 创建证书目录
mkdir -p ./certs

# 将您的证书文件放置在 certs 目录
# certs/server.crt - TLS 证书
# certs/server.key - 私钥

# 运行容器并挂载自定义证书
docker run -d \
  --name kb-frontend \
  -p 3000:3000 \
  -e HTTPS=true \
  -v $(pwd)/.env.local:/app/.env.local:ro \
  -v $(pwd)/certs:/app/certs:ro \
  kb-frontend:latest
```

### 2. 配合 Nginx 反向代理

创建 `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream kb-frontend {
        server kb-frontend:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/certs/server.crt;
        ssl_certificate_key /etc/nginx/certs/server.key;

        location / {
            proxy_pass http://kb-frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 3. 环境变量说明

| 变量名 | 描述 | 默认值 | 示例 |
|--------|------|--------|------|
| `HTTPS` | 启用HTTPS模式 | `false` | `true` |
| `SSL_DOMAIN` | SSL证书域名 | `localhost` | `example.com` |
| `SSL_CERT_FILE` | 证书文件路径 | `/app/certs/server.crt` | - |
| `SSL_KEY_FILE` | 私钥文件路径 | `/app/certs/server.key` | - |

## 运行时配置更新

### 更新配置而无需重启容器

1. 编辑 `.env.local` 文件
2. 刷新浏览器页面即可加载新配置

```bash
# 修改配置文件
echo "NEXT_PUBLIC_API_URL=http://new-api-server:8000/v1" >> .env.local

# 无需重启容器，直接刷新浏览器即可
```

### 故障排除

#### 问题1：配置未生效
- 检查 `.env.local` 文件是否正确挂载
- 确认浏览器已刷新页面
- 查看容器日志：`docker logs kb-frontend`

#### 问题2：HTTPS 证书问题
- 确认 `HTTPS=true` 环境变量已设置
- 检查证书文件权限和路径
- 查看证书生成日志

#### 问题3：CAS 认证失败
- 确认 CAS 服务器地址可访问
- 检查 NextAuth 配置
- 验证 cookies 设置（HTTPS环境下需要secure标志）

### 监控和日志

```bash
# 查看容器日志
docker logs -f kb-frontend

# 检查健康状态
docker exec kb-frontend curl -f http://localhost:3000/api/config

# 查看证书信息
docker exec kb-frontend openssl x509 -in /app/certs/server.crt -text -noout
```

## 安全建议

1. **生产环境**：使用有效的TLS证书，避免自签证书
2. **密钥管理**：定期更换 `NEXTAUTH_SECRET`
3. **网络安全**：使用防火墙限制容器网络访问
4. **更新维护**：定期更新基础镜像和依赖包

## 性能优化

1. **资源限制**：设置容器CPU和内存限制
2. **缓存策略**：配置适当的缓存头
3. **负载均衡**：在高负载环境下使用多容器实例

```yaml
# docker-compose.yml 中的资源限制示例
services:
  kb-frontend:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```