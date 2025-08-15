FROM --platform=linux/amd64 node:18-bullseye-slim
# FROM node:18-bullseye-slim

WORKDIR /app

# 使用阿里云镜像源并安装openssl用于生成自签证书，curl用于健康检查
RUN echo 'deb http://mirrors.aliyun.com/debian/ bullseye main non-free contrib' > /etc/apt/sources.list && \
    echo 'deb http://mirrors.aliyun.com/debian-security bullseye-security main' >> /etc/apt/sources.list && \
    echo 'deb http://mirrors.aliyun.com/debian/ bullseye-updates main non-free contrib' >> /etc/apt/sources.list && \
    apt-get update && apt-get install -y --no-install-recommends openssl curl && \
    rm -rf /var/lib/apt/lists/*

COPY . .

# 脚本加执行权限
RUN chmod +x /app/scripts/generate-certs.sh

# 使用 npm 而不是 yarn，并设置网络重试
RUN npm config set registry https://registry.npmmirror.com/
RUN npm config set fetch-timeout 300000
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000
RUN npm install
RUN npm run build

EXPOSE 3000

# 允许在容器启动时通过环境变量启用HTTPS
# HTTPS=true 将以HTTPS启动；否则HTTP
ENV HTTPS=false
ENV SSL_CERT_FILE=/app/certs/server.crt
ENV SSL_KEY_FILE=/app/certs/server.key

# 入口：
# - 如果HTTPS=true并且没有挂载证书，则自动生成自签证书
# - 然后使用node启动Next.js，监听HTTPS或HTTP
CMD bash -lc 'if [ "$HTTPS" = "true" ]; then /app/scripts/generate-certs.sh; node server.js; else node server.js; fi'
