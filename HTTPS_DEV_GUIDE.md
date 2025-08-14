# HTTPS 开发环境配置指南

本指南将帮助您在开发模式下启用 HTTPS，以便在本地环境中测试 HTTPS 相关功能。

## 🚀 快速开始

### 1. 生成自签名证书

在项目根目录运行以下命令生成开发用的自签名证书：

```bash
# Windows
scripts\generate-certs.bat

# Linux/Mac
./scripts/generate-certs.sh
```

### 2. 配置环境变量

在 `.env.local` 文件中添加或修改以下配置：

```bash
# 启用 HTTPS
HTTPS=true

# 证书文件路径（相对于项目根目录）
SSL_CERT_FILE=./certs/server.crt
SSL_KEY_FILE=./certs/server.key

# SSL 域名（可选，默认为 localhost）
SSL_DOMAIN=localhost

# 更新相关 URL 为 HTTPS
NEXT_PUBLIC_CAS_SERVICE_URL=https://localhost:3000/login
NEXTAUTH_URL=https://localhost:3000
```

### 3. 启动 HTTPS 开发服务器

```bash
npm run dev:https
```

### 4. 访问应用

在浏览器中访问：`https://localhost:3000`

**注意**：首次访问时，浏览器会显示安全警告，因为使用的是自签名证书。点击"高级"→"继续访问"即可。

## 📋 详细配置说明

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `HTTPS` | 是否启用 HTTPS | `false` |
| `SSL_CERT_FILE` | SSL 证书文件路径 | `./certs/server.crt` |
| `SSL_KEY_FILE` | SSL 私钥文件路径 | `./certs/server.key` |
| `SSL_DOMAIN` | SSL 证书域名 | `localhost` |
| `PORT` | 服务器端口 | `3000` |

### 证书生成选项

生成的自签名证书包含以下域名和IP：
- `localhost`
- `*.localhost`
- `127.0.0.1`
- `::1`
- 自定义域名（通过 `SSL_DOMAIN` 环境变量设置）

### 自定义域名配置

如果您需要使用自定义域名（如 `dev.example.com`），请：

1. 在 `.env.local` 中设置：
   ```bash
   SSL_DOMAIN=dev.example.com
   ```

2. 在系统 hosts 文件中添加：
   ```
   127.0.0.1 dev.example.com
   ```

3. 重新生成证书：
   ```bash
   # 删除旧证书
   rm -rf certs/
   
   # 重新生成
   scripts\generate-certs.bat  # Windows
   ./scripts/generate-certs.sh # Linux/Mac
   ```

## 🔧 故障排除

### 1. OpenSSL 未安装

**Windows 用户**：
- 下载安装：https://slproweb.com/products/Win32OpenSSL.html
- 或使用包管理器：
  ```bash
  # Chocolatey
  choco install openssl
  
  # Scoop
  scoop install openssl
  ```

**Linux 用户**：
```bash
# Ubuntu/Debian
sudo apt-get install openssl

# CentOS/RHEL
sudo yum install openssl
```

**Mac 用户**：
```bash
# Homebrew
brew install openssl
```

### 2. 证书权限问题

确保证书文件有正确的权限：
```bash
# Linux/Mac
chmod 600 certs/server.key
chmod 644 certs/server.crt
```

### 3. 端口被占用

如果 3000 端口被占用，可以修改端口：
```bash
# 在 .env.local 中设置
PORT=3001
```

然后访问：`https://localhost:3001`

### 4. 浏览器安全警告

这是正常现象，因为使用的是自签名证书。在开发环境中：

1. **Chrome/Edge**：点击"高级" → "继续访问 localhost（不安全）"
2. **Firefox**：点击"高级" → "接受风险并继续"
3. **Safari**：点击"显示详细信息" → "访问此网站"

## 🌐 生产环境注意事项

- 本指南仅适用于开发环境
- 生产环境请使用正式的 SSL 证书（如 Let's Encrypt）
- 不要将自签名证书用于生产环境

## 📝 相关文件

- `scripts/generate-certs.bat` - Windows 证书生成脚本
- `scripts/generate-certs.sh` - Linux/Mac 证书生成脚本
- `server.js` - 自定义服务器配置
- `package.json` - npm 脚本配置
- `.env.local` - 环境变量配置

## 🔗 相关链接

- [Next.js 自定义服务器文档](https://nextjs.org/docs/advanced-features/custom-server)
- [OpenSSL 文档](https://www.openssl.org/docs/)
- [自签名证书最佳实践](https://letsencrypt.org/docs/certificates-for-localhost/)