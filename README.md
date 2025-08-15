# Knowledge Base Frontend

基于 [Next.js](https://nextjs.org/) 构建的知识库前端应用，集成了 CAS 单点登录和 NextAuth 认证系统。

## 功能特性

- 🔐 **CAS 单点登录**：集成 CAS 认证系统，支持统一身份验证
- 🛡️ **NextAuth 集成**：使用 NextAuth 管理用户会话和认证状态
- 💬 **对话系统**：基于 Dify API 的智能对话功能
- 🌍 **国际化支持**：支持多语言切换（中文、英文、日文、西班牙文、越南文）
- 📱 **响应式设计**：适配桌面端和移动端
- 🎨 **现代化 UI**：使用 Tailwind CSS 构建的美观界面

## 环境配置

创建 `.env.local` 文件并配置以下环境变量：

### 基础应用配置
```bash
# APP ID: Dify 应用的唯一标识符
# 可在应用详情页面 URL 中找到，例如：https://cloud.dify.ai/app/xxx/workflow 中的 xxx
NEXT_PUBLIC_APP_ID=your_app_id

# APP API Key: Dify 应用的 API 密钥
# 在应用的"API 访问"页面点击右上角"API Key"按钮生成
NEXT_PUBLIC_APP_KEY=your_app_key

# API URL: Dify API 的基础 URL
# 如果使用 Dify 云服务，设置为：https://api.dify.ai/v1
NEXT_PUBLIC_API_URL=your_api_url
```

### CAS 认证配置
```bash
# CAS 服务器配置
# 客户端使用（浏览器访问）
NEXT_PUBLIC_CAS_BASE_URL=http://your-cas-server:8443/cas
NEXT_PUBLIC_CAS_SERVICE_URL=http://your-app-domain/login

# 服务器端使用（容器内访问）
CAS_BASE_URL=http://your-cas-server:8443/cas
CAS_SERVICE_URL=http://your-app-domain/login
```

### NextAuth 配置
```bash
# NextAuth 配置
NEXTAUTH_URL=http://your-app-domain
NEXTAUTH_SECRET=your_nextauth_secret_key

# 环境设置
NODE_ENV=production
```

### 应用配置

在 `config/index.ts` 文件中配置应用信息：

```typescript
export const APP_INFO: AppInfo = {
  title: 'Knowledge Base',
  description: '智能知识库系统',
  copyright: '© 2024 Your Company',
  privacy_policy: 'https://your-domain.com/privacy',
  default_language: 'zh-Hans'
}

// 是否显示提示词模板
export const isShowPrompt = false
// 默认提示词模板
export const promptTemplate = 'I want you to act as a javascript console.'
```

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或者
yarn install
# 或者
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 文件为 `.env.local` 并填入相应的配置值：

```bash
cp .env.example .env.local
```

### 3. 启动开发服务器

```bash
npm run dev
# 或者
yarn dev
# 或者
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 4. 构建生产版本

```bash
npm run build
npm run start
```



## 技术栈

- **前端框架**: Next.js 14
- **UI 框架**: React 18
- **样式**: Tailwind CSS
- **认证**: NextAuth.js + CAS
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **国际化**: i18next
- **代码编辑器**: Monaco Editor
- **Markdown 渲染**: react-markdown
- **类型检查**: TypeScript

## 项目结构

```
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API 路由
│   │   ├── auth/          # NextAuth 认证路由
│   │   ├── chat-messages/ # 聊天消息 API
│   │   └── conversations/ # 对话管理 API
│   ├── components/        # React 组件
│   │   ├── base/          # 基础组件
│   │   ├── chat/          # 聊天相关组件
│   │   └── sidebar/       # 侧边栏组件
│   ├── login/             # 登录页面
│   └── styles/            # 全局样式
├── config/                # 应用配置
├── hooks/                 # 自定义 React Hooks
├── i18n/                  # 国际化配置和语言文件
├── service/               # API 服务层
├── src/                   # 源代码
│   └── auth.ts           # NextAuth 配置
├── types/                 # TypeScript 类型定义
└── utils/                 # 工具函数
```

## 开发说明

### 可用脚本

```bash
npm run dev        # 启动开发服务器
npm run build      # 构建生产版本
npm run start      # 启动生产服务器
npm run lint       # 运行 ESLint 检查
npm run fix        # 自动修复 ESLint 问题
```

### 代码规范

项目使用 ESLint 和 Husky 确保代码质量：

- 提交前自动运行 lint 检查
- 使用 TypeScript 进行类型检查
- 遵循 React 和 Next.js 最佳实践

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_APP_ID` | Dify 应用 ID | `a078f8d9-0a40-4424-9d9a-dfc911ed1694` |
| `NEXT_PUBLIC_APP_KEY` | Dify API 密钥 | `app-a7fcQsLOKrx7SKZNsayGsCTm` |
| `NEXT_PUBLIC_API_URL` | Dify API 地址 | `https://api.dify.ai/v1` |
| `NEXT_PUBLIC_CAS_BASE_URL` | CAS 服务器地址 | `https://cas.example.com/cas` |
| `NEXT_PUBLIC_CAS_SERVICE_URL` | CAS 回调地址 | `https://your-app.com/login` |
| `NEXTAUTH_URL` | 应用访问地址 | `https://your-app.com` |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | `your-secret-key` |

## 部署

### 1. Docker 部署（推荐）

#### 构建镜像

```bash
docker build . -t knowledge-base-frontend:latest
```

#### 单容器运行

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_APP_ID=your_app_id \
  -e NEXT_PUBLIC_APP_KEY=your_app_key \
  -e NEXT_PUBLIC_API_URL=your_api_url \
  -e NEXT_PUBLIC_CAS_BASE_URL=your_cas_url \
  -e NEXT_PUBLIC_CAS_SERVICE_URL=your_service_url \
  -e NEXTAUTH_URL=your_app_url \
  -e NEXTAUTH_SECRET=your_secret \
  -e NODE_ENV=production \
  knowledge-base-frontend:latest
```

#### Docker Compose 部署

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_APP_ID=your_app_id
      - NEXT_PUBLIC_APP_KEY=your_app_key
      - NEXT_PUBLIC_API_URL=your_api_url
      - NEXT_PUBLIC_CAS_BASE_URL=your_cas_url
      - NEXT_PUBLIC_CAS_SERVICE_URL=your_service_url
      - NEXTAUTH_URL=your_app_url
      - NEXTAUTH_SECRET=your_secret
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs  # 可选：日志持久化
```

启动服务：

```bash
docker-compose up -d
```

#### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Vercel 部署

> ⚠️ 如果使用 [Vercel Hobby](https://vercel.com/pricing) 计划，消息可能会因为限制而被截断。

#### 步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **在 Vercel 中导入项目**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 选择你的 GitHub 仓库

3. **配置环境变量**
   在 Vercel 项目设置中添加以下环境变量：
   ```
   NEXT_PUBLIC_APP_ID=your_app_id
   NEXT_PUBLIC_APP_KEY=your_app_key
   NEXT_PUBLIC_API_URL=your_api_url
   NEXT_PUBLIC_CAS_BASE_URL=your_cas_url
   NEXT_PUBLIC_CAS_SERVICE_URL=your_service_url
   NEXTAUTH_URL=your_app_url
   NEXTAUTH_SECRET=your_secret
   NODE_ENV=production
   ```

4. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成

#### 自动部署

配置 GitHub Actions 实现自动部署：

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy to Vercel
        uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### 3. 自托管部署

#### 传统部署方式

1. **构建应用**
   ```bash
   npm run build
   ```

2. **启动生产服务器**
   ```bash
   npm run start
   ```

3. **使用 PM2 管理进程**
   ```bash
   # 安装 PM2
   npm install -g pm2
   
   # 启动应用
   pm2 start npm --name "knowledge-base" -- start
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

4. **配置反向代理**
   参考上面的 Nginx 配置

5. **设置 SSL 证书**
   ```bash
   # 使用 Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

#### 系统服务部署

创建 systemd 服务文件：

```ini
# /etc/systemd/system/knowledge-base.service
[Unit]
Description=Knowledge Base Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/knowledge-base
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl enable knowledge-base
sudo systemctl start knowledge-base
sudo systemctl status knowledge-base
```

## 故障排除

### 常见问题

1. **CAS 登录失败**
   - 检查 CAS 服务器配置
   - 确认 `CAS_SERVICE_URL` 与实际访问地址一致
   - 查看浏览器控制台错误信息

2. **API 调用失败**
   - 检查 Dify API 配置
   - 确认 API 密钥有效
   - 检查网络连接

3. **环境变量不生效**
   - 确认 `.env.local` 文件存在
   - 重启开发服务器
   - 检查变量名拼写

## 下一步计划

### 1. 使用next-runtime-env实现运行时环境变量

### 2. 修复无限跳转和环境变量不一致问题[✔]

### 3. 缩减镜像大小

### 4. 发布Production版本，增加https支持

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
