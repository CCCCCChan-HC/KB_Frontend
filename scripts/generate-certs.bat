@echo off
setlocal enabledelayedexpansion

echo Generating self-signed TLS certificates for development...

:: 创建证书目录
if not exist "certs" mkdir certs

:: 检查是否已存在证书
if exist "certs\server.key" if exist "certs\server.crt" (
    echo TLS certificates already exist, skipping generation...
    exit /b 0
)

:: 设置默认域名
set SSL_DOMAIN=localhost
if defined NEXT_PUBLIC_CAS_SERVICE_URL (
    for /f "tokens=3 delims=:/" %%a in ("%NEXT_PUBLIC_CAS_SERVICE_URL%") do set SSL_DOMAIN=%%a
)

echo Using domain: %SSL_DOMAIN%

:: 生成证书配置文件
echo [req] > certs\server.conf
echo distinguished_name = req_distinguished_name >> certs\server.conf
echo req_extensions = v3_req >> certs\server.conf
echo prompt = no >> certs\server.conf
echo. >> certs\server.conf
echo [req_distinguished_name] >> certs\server.conf
echo C = CN >> certs\server.conf
echo ST = State >> certs\server.conf
echo L = City >> certs\server.conf
echo O = Organization >> certs\server.conf
echo OU = Organizational Unit >> certs\server.conf
echo CN = %SSL_DOMAIN% >> certs\server.conf
echo. >> certs\server.conf
echo [v3_req] >> certs\server.conf
echo keyUsage = critical, digitalSignature, keyEncipherment >> certs\server.conf
echo extendedKeyUsage = serverAuth >> certs\server.conf
echo subjectAltName = @alt_names >> certs\server.conf
echo. >> certs\server.conf
echo [alt_names] >> certs\server.conf
echo DNS.1 = %SSL_DOMAIN% >> certs\server.conf
echo DNS.2 = localhost >> certs\server.conf
echo DNS.3 = *.localhost >> certs\server.conf
echo IP.1 = 127.0.0.1 >> certs\server.conf
echo IP.2 = ::1 >> certs\server.conf

:: 检查OpenSSL是否可用
openssl version >nul 2>&1
if errorlevel 1 (
    echo Error: OpenSSL is not installed or not in PATH
    echo Please install OpenSSL first:
    echo 1. Download from: https://slproweb.com/products/Win32OpenSSL.html
    echo 2. Or install via Chocolatey: choco install openssl
    echo 3. Or install via Scoop: scoop install openssl
    exit /b 1
)

:: 生成私钥
echo Generating private key...
openssl genrsa -out certs\server.key 2048
if errorlevel 1 (
    echo Error: Failed to generate private key
    exit /b 1
)

:: 生成自签名证书
echo Generating self-signed certificate...
openssl req -new -x509 -key certs\server.key -out certs\server.crt -days 365 -config certs\server.conf -extensions v3_req
if errorlevel 1 (
    echo Error: Failed to generate certificate
    exit /b 1
)

echo.
echo ✅ TLS certificates generated successfully!
echo Certificate: certs\server.crt
echo Private Key: certs\server.key
echo Domain: %SSL_DOMAIN%
echo.
echo Next steps:
echo 1. Update your .env.local file with HTTPS settings
echo 2. Run: npm run dev:https
echo 3. Access: https://%SSL_DOMAIN%:3000
echo.
echo Note: You may need to accept the self-signed certificate in your browser.