# 构建阶段
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# 配置npm镜像源和网络设置
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3

# 复制package文件
COPY package.json package-lock.json ./

# 安装依赖（包括开发依赖用于构建）
RUN npm ci --verbose

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-bullseye-slim AS runner

WORKDIR /app

# 使用HTTP镜像源避免SSL证书问题
RUN echo "deb http://mirrors.aliyun.com/debian/ bullseye main" > /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian-security bullseye-security main" >> /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian/ bullseye-updates main" >> /etc/apt/sources.list

# 安装运行时必需的包
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 配置npm镜像源
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3

# 复制package文件并安装生产依赖
COPY package.json package-lock.json ./
RUN npm ci --only=production --verbose && npm cache clean --force

# 从构建阶段复制构建结果
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# 关键：将 app 目录也复制到运行镜像，避免 Next.js 运行时找不到 app/pages 目录
COPY --from=builder /app/app ./app
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/scripts/generate-certs.sh ./scripts/

# 复制其他必要文件
COPY --from=builder /app/config ./config
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/types ./types
COPY --from=builder /app/i18n ./i18n
COPY --from=builder /app/middleware.ts ./

# 设置权限
RUN chmod +x /app/scripts/generate-certs.sh
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV HTTPS=false
ENV SSL_CERT_FILE=/app/certs/server.crt
ENV SSL_KEY_FILE=/app/certs/server.key

CMD ["sh", "-c", "if [ \"$HTTPS\" = \"true\" ]; then /app/scripts/generate-certs.sh; fi; node server.js"]
