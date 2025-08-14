# KB Frontend 运行时环境变量部署指南

本指南介绍如何实现**单次构建 + 单次镜像构建**，支持在不同IP和服务器上灵活部署的解决方案。

## 🎯 解决方案概述

基于 [next-runtime-env](https://juejin.cn/post/7410989416866742299) 的方案，实现：

- ✅ **单次构建**：只需构建一次Next.js应用
- ✅ **单次镜像**：只需构建一次Docker镜像
- ✅ **多环境部署**：同一镜像可部署到不同服务器
- ✅ **运行时配置**：通过环境变量动态配置应用
- ✅ **零代码修改**：部署时无需修改代码

## 🔧 技术实现

### 1. 运行时环境变量支持

使用 `next-runtime-env` 库实现运行时环境变量获取：

```typescript
// utils/env.ts
import { env } from 'next-runtime-env'

export const getAppId = () => env('NEXT_PUBLIC_APP_ID') || ''
export const getApiUrl = () => env('NEXT_PUBLIC_API_URL') || ''
// ... 其他环境变量获取函数
```

### 2. 动态渲染配置

在 `app/layout.tsx` 中添加 `PublicEnvScript`：

```tsx
import { PublicEnvScript } from 'next-runtime-env'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <PublicEnvScript />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 3. 配置文件更新

所有配置文件都使用运行时环境变量：

```typescript
// config/index.ts
import { getAppId, getAppKey, getApiUrl } from '@/utils/env'

export const APP_ID = getAppId()
export const API_KEY = getAppKey()
export const API_URL = getApiUrl()
```

## 📦 部署流程

### ServerA（构建服务器）

1. **构建和保存镜像**：
   ```bash
   # 使用提供的脚本
   chmod +x scripts/build-and-save.sh
   ./scripts/build-and-save.sh
   
   # 或手动执行
   docker compose build kb-frontend
   docker save -o kb_frontend_image.tar kb_frontend-kb-frontend:latest
   ```

2. **传输文件到ServerB**：
   ```bash
   # 传输镜像文件
   scp kb_frontend_image.tar user@serverb:/path/to/deployment/
   
   # 传输配置文件
   scp docker-compose.serverb.yml user@serverb:/path/to/deployment/docker-compose.yml
   scp .env.runtime user@serverb:/path/to/deployment/.env.local
   ```

### ServerB（目标服务器）

1. **配置环境变量**：
   ```bash
   # 编辑 .env.local 文件，配置ServerB的具体环境
   nano .env.local
   ```

   示例配置：
   ```bash
   # ServerB生产环境配置
   NEXT_PUBLIC_APP_ID=your-app-id
   NEXT_PUBLIC_API_URL=https://api.your-domain.com/v1
   NEXT_PUBLIC_CAS_BASE_URL=https://sso.your-domain.com/cas
   NEXT_PUBLIC_CAS_SERVICE_URL=https://kb.your-domain.com/login
   
   CAS_BASE_URL=http://cas-server:8443/cas
   CAS_SERVICE_URL=https://kb.your-domain.com/login
   
   NEXTAUTH_URL=https://kb.your-domain.com
   NEXTAUTH_SECRET=your-production-secret
   
   HTTPS=true
   SSL_DOMAIN=kb.your-domain.com
   ```

2. **部署服务**：
   ```bash
   # 使用提供的脚本
   chmod +x scripts/deploy-serverb.sh
   ./scripts/deploy-serverb.sh
   
   # 或手动执行
   docker load -i kb_frontend_image.tar
   docker compose up -d
   ```

## 📁 文件结构

```
KB_Frontend/
├── utils/env.ts                    # 运行时环境变量工具
├── .env.runtime                    # 环境变量配置模板
├── docker-compose.yml              # ServerA构建配置
├── docker-compose.serverb.yml      # ServerB部署配置
├── scripts/
│   ├── build-and-save.sh          # ServerA构建脚本
│   └── deploy-serverb.sh           # ServerB部署脚本
└── RUNTIME_DEPLOYMENT.md           # 本文档
```

## 🔄 多环境部署示例

### 开发环境
```bash
# .env.local
NEXT_PUBLIC_CAS_BASE_URL=http://localhost:8443/cas
NEXT_PUBLIC_CAS_SERVICE_URL=http://localhost:3000/login
NEXTAUTH_URL=http://localhost:3000
HTTPS=false
SSL_DOMAIN=localhost
```

### 测试环境
```bash
# .env.local
NEXT_PUBLIC_CAS_BASE_URL=https://test-sso.company.com/cas
NEXT_PUBLIC_CAS_SERVICE_URL=https://test-kb.company.com/login
NEXTAUTH_URL=https://test-kb.company.com
HTTPS=true
SSL_DOMAIN=test-kb.company.com
```

### 生产环境
```bash
# .env.local
NEXT_PUBLIC_CAS_BASE_URL=https://sso.company.com/cas
NEXT_PUBLIC_CAS_SERVICE_URL=https://kb.company.com/login
NEXTAUTH_URL=https://kb.company.com
HTTPS=true
SSL_DOMAIN=kb.company.com
```

## 🛠️ 运维操作

### 更新环境变量
```bash
# 修改配置
nano .env.local

# 重启服务应用新配置
docker compose up -d --force-recreate
```

### 查看服务状态
```bash
# 检查容器状态
docker compose ps

# 查看实时日志
docker compose logs -f kb-frontend

# 检查健康状态
docker compose exec kb-frontend curl -k https://localhost:3000/api/config
```

### 故障排除
```bash
# 重启服务
docker compose restart kb-frontend

# 完全重新部署
docker compose down
docker compose up -d

# 查看详细日志
docker compose logs --tail=100 kb-frontend
```

## ⚠️ 注意事项

1. **环境变量优先级**：
   - `.env.local` 文件中的变量优先级最高
   - Docker Compose 环境变量次之
   - 默认值最低

2. **HTTPS配置**：
   - 自签证书适用于内网环境
   - 生产环境建议使用有效SSL证书
   - 可通过挂载卷提供自定义证书

3. **安全考虑**：
   - 生产环境必须更改 `NEXTAUTH_SECRET`
   - 敏感信息不要提交到代码仓库
   - 使用强密码和安全的密钥

4. **性能影响**：
   - 运行时环境变量会轻微影响性能
   - 对于高性能要求的场景，可考虑构建时配置

## 🚀 优势总结

- **部署效率**：一次构建，多处部署
- **配置灵活**：运行时动态配置
- **维护简单**：统一镜像，差异化配置
- **环境一致**：避免构建差异导致的问题
- **快速切换**：修改配置即可切换环境

这种方案特别适合需要在多个环境（开发、测试、生产）或多个客户站点部署相同应用的场景。