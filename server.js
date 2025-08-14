// Load .env files at runtime for custom server
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

const { createServer } = require('http')
const { createServer: createHttpsServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

// 运行时环境变量获取函数
const getRuntimeEnv = (key, defaultValue = '') => {
  return process.env[key] || defaultValue
}

const dev = getRuntimeEnv('NODE_ENV') !== 'production'
const hostname = '0.0.0.0'
const port = getRuntimeEnv('PORT', '3000')

// 检查是否启用HTTPS
const httpsEnabled = getRuntimeEnv('HTTPS') === 'true'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  //添加环境变量输出
  console.log('=== Environment Variables ===')
  console.log(`NODE_ENV: ${getRuntimeEnv('NODE_ENV', 'development')}`)
  console.log(`PORT: ${getRuntimeEnv('PORT', '3000')}`)
  console.log(`HTTPS: ${getRuntimeEnv('HTTPS', 'false')}`)
  console.log(`SSL_DOMAIN: ${getRuntimeEnv('SSL_DOMAIN', 'localhost')}`)
  console.log('=============================')

  let server

  if (httpsEnabled) {
    // HTTPS模式
    const httpsOptions = {}

    try {
      const certFile = getRuntimeEnv('SSL_CERT_FILE', '/app/certs/server.crt')
      const keyFile = getRuntimeEnv('SSL_KEY_FILE', '/app/certs/server.key')

      if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
        httpsOptions.cert = fs.readFileSync(certFile)
        httpsOptions.key = fs.readFileSync(keyFile)

        server = createHttpsServer(httpsOptions, (req, res) => {
          const parsedUrl = parse(req.url, true)
          handle(req, res, parsedUrl)
        })

        console.log(`🔒 HTTPS server ready on https://${hostname}:${port}`)
      } else {
        console.error('❌ HTTPS enabled but certificates not found!')
        console.error(`Certificate file: ${certFile}`)
        console.error(`Key file: ${keyFile}`)
        console.error('Please ensure certificates exist or disable HTTPS mode.')
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ Failed to load HTTPS certificates:', error.message)
      process.exit(1)
    }
  } else {
    // HTTP模式
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    })

    console.log(`🌐 HTTP server ready on http://${hostname}:${port}`)
  }

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`✅ Server started successfully`)
    console.log(`📄 Environment: ${getRuntimeEnv('NODE_ENV', 'development')}`)
    console.log(`🔐 HTTPS enabled: ${httpsEnabled ? 'Yes' : 'No'}`)
    console.log(`🌍 SSL Domain: ${getRuntimeEnv('SSL_DOMAIN', 'localhost')}`)
  })
})