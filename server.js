const { createServer } = require('http')
require('dotenv').config({ path: '.env.local' })
const { createServer: createHttpsServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

// 环境变量验证（在 Next.js 应用准备之前）
function validateEnvironment() {
  console.log('🔍 Validating environment variables...')

  const required = [
    'NEXT_PUBLIC_CAS_BASE_URL',
    'NEXT_PUBLIC_CAS_SERVICE_URL',
    'CAS_BASE_URL',
    'CAS_SERVICE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error('Please check your .env.local file or environment configuration.')

    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    } else {
      console.warn('⚠️  Continuing in development mode with missing variables...')
    }
  } else {
    console.log('✅ All required environment variables are set')
  }

  // 显示环境变量摘要
  console.log('📋 Environment Summary:')
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`)
  console.log(`   CAS_BASE_URL: ${process.env.NEXT_PUBLIC_CAS_BASE_URL || 'not set'}`)
  console.log(`   HTTPS: ${process.env.HTTPS || 'false'}`)
}

// 执行环境变量验证
validateEnvironment()

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

// 检查是否启用HTTPS
const httpsEnabled = process.env.HTTPS === 'true'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  let server

  if (httpsEnabled) {
    // HTTPS模式
    const httpsOptions = {}

    try {
      const certFile = process.env.SSL_CERT_FILE || '/app/certs/server.crt'
      const keyFile = process.env.SSL_KEY_FILE || '/app/certs/server.key'

      if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
        httpsOptions.cert = fs.readFileSync(certFile)
        httpsOptions.key = fs.readFileSync(keyFile)

        server = createHttpsServer(httpsOptions, (req, res) => {
          // Manually set the encrypted flag for Next.js to recognize HTTPS
          req.socket.encrypted = true
          // Also set forwarded headers, which are often respected by frameworks like Next.js
          req.headers['x-forwarded-proto'] = 'https'
          req.headers['x-forwarded-host'] = req.headers.host
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
    console.log(`📄 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🔐 HTTPS enabled: ${httpsEnabled ? 'Yes' : 'No'}`)
  })
})