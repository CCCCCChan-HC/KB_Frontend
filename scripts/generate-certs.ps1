# PowerShell 版本的证书生成脚本
# 生成用于开发的自签名 TLS 证书

Write-Host "Generating self-signed TLS certificates for development..." -ForegroundColor Green

# 创建证书目录
if (-not (Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs" | Out-Null
}

# 检查是否已存在证书
if ((Test-Path "certs\server.key") -and (Test-Path "certs\server.crt")) {
    Write-Host "TLS certificates already exist, skipping generation..." -ForegroundColor Yellow
    exit 0
}

# 设置域名（优先使用环境变量，否则使用默认值）
$SSL_DOMAIN = if ($env:SSL_DOMAIN) { $env:SSL_DOMAIN } else { "localhost" }

# 如果设置了 NEXT_PUBLIC_CAS_SERVICE_URL，尝试从中提取域名
if ($env:NEXT_PUBLIC_CAS_SERVICE_URL) {
    try {
        $uri = [System.Uri]$env:NEXT_PUBLIC_CAS_SERVICE_URL
        if ($uri -and $uri.Host) { $SSL_DOMAIN = $uri.Host }
    } catch {
        # 如果 URL 解析失败，保持使用默认或环境变量中的值
    }
}

# 兜底，避免空白域名导致 OpenSSL 报错
if ([string]::IsNullOrWhiteSpace($SSL_DOMAIN)) { $SSL_DOMAIN = "localhost" }

Write-Host "Env SSL_DOMAIN: $($env:SSL_DOMAIN)" -ForegroundColor DarkGray
Write-Host "Using domain: $SSL_DOMAIN" -ForegroundColor Cyan

# 生成证书配置文件
$configContent = @"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CN
ST = State
L = City
O = Organization
OU = Organizational Unit
CN = $SSL_DOMAIN

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $SSL_DOMAIN
DNS.2 = localhost
DNS.3 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
"@

$configPath = "certs\server.conf"
$configContent | Out-File -FilePath $configPath -Encoding UTF8

# 检查 OpenSSL 是否可用
try {
    $null = & openssl version 2>&1
} catch {
    Write-Host "Error: OpenSSL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install OpenSSL first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host "2. Or install via Chocolatey: choco install openssl" -ForegroundColor Yellow
    Write-Host "3. Or install via Scoop: scoop install openssl" -ForegroundColor Yellow
    exit 1
}

# 生成私钥
Write-Host "Generating private key..." -ForegroundColor Blue
$result = & openssl genrsa -out "certs\server.key" 2048 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to generate private key" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

# 生成自签名证书
Write-Host "Generating self-signed certificate..." -ForegroundColor Blue
$result = & openssl req -new -x509 -key "certs\server.key" -out "certs\server.crt" -days 365 -config $configPath -extensions v3_req 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to generate certificate" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host "--- OpenSSL config content ---" -ForegroundColor DarkGray
    Get-Content $configPath | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
    exit 1
}

Write-Host ""
Write-Host "✅ TLS certificates generated successfully!" -ForegroundColor Green
Write-Host "Certificate: certs\server.crt" -ForegroundColor White
Write-Host "Private Key: certs\server.key" -ForegroundColor White
Write-Host "Domain: $SSL_DOMAIN" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env.local file with HTTPS settings" -ForegroundColor White
Write-Host "2. Run: npm run dev:https" -ForegroundColor White
Write-Host "3. Access: https://$SSL_DOMAIN:3000" -ForegroundColor White
Write-Host ""
Write-Host "Note: You may need to accept the self-signed certificate in your browser." -ForegroundColor Gray