#!/bin/bash

# 创建证书目录
mkdir -p /app/certs

# 检查是否已存在证书
if [ -f "/app/certs/server.key" ] && [ -f "/app/certs/server.crt" ]; then
    echo "TLS certificates already exist, skipping generation..."
    exit 0
fi

echo "Generating self-signed TLS certificates..."

# 生成私钥
openssl genrsa -out /app/certs/server.key 2048

# 生成证书签名请求配置文件
cat > /app/certs/server.conf <<EOF
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
CN = ${SSL_DOMAIN:-localhost}

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${SSL_DOMAIN:-localhost}
DNS.2 = localhost
DNS.3 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# 生成自签名证书
openssl req -new -x509 -key /app/certs/server.key -out /app/certs/server.crt -days 365 -config /app/certs/server.conf -extensions v3_req

# 设置正确的权限
chmod 600 /app/certs/server.key
chmod 644 /app/certs/server.crt

echo "TLS certificates generated successfully!"
echo "Certificate: /app/certs/server.crt"
echo "Private key: /app/certs/server.key"