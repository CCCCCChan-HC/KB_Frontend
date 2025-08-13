const { createServer } = require('http')
const { createServer: createHttpsServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

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