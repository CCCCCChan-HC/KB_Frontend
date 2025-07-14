import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { 
  logger, 
  logSecurity, 
  SecurityEventType 
} from '@/utils/logger'

// 需要CSRF保护的路径
const CSRF_PROTECTED_PATHS = [
  '/api/cas/validate',
  '/api/auth/signin',
  '/api/auth/signout'
]

export default withAuth(
  function middleware(request: NextRequest) {
    const response = NextResponse.next()
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const pathname = request.nextUrl.pathname
    const method = request.method
    
    // 添加安全响应头
    const securityHeaders = getSecurityHeaders()
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // 速率限制检查
    if (!checkRateLimit(clientIP)) {
      logger.warn('[Middleware] Rate limit exceeded', {
        ip: clientIP,
        path: pathname,
        method,
        userAgent
      })
      
      logSecurity({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: 'MEDIUM',
        description: `Rate limit exceeded for IP ${clientIP}`,
        ip: clientIP,
        userAgent,
        additionalData: {
          path: pathname,
          method,
          limit: 100,
          window: '15 minutes'
        }
      })
      
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: securityHeaders
      })
    }
    
    // CSRF保护
    if (shouldCheckCSRF(request)) {
      if (!validateCSRFToken(request)) {
        logger.warn('[Middleware] CSRF token validation failed', {
          ip: clientIP,
          path: pathname,
          method,
          userAgent,
          hasHeaderToken: !!request.headers.get('x-csrf-token'),
          hasCookieToken: !!request.cookies.get('next-auth.csrf-token')?.value
        })
        
        logSecurity({
          type: SecurityEventType.CSRF_ATTACK,
          severity: 'HIGH',
          description: `CSRF token validation failed for ${method} ${pathname}`,
          ip: clientIP,
          userAgent,
          additionalData: {
            path: pathname,
            method,
            hasHeaderToken: !!request.headers.get('x-csrf-token'),
            hasCookieToken: !!request.cookies.get('next-auth.csrf-token')?.value
          }
        })
        
        return new NextResponse('CSRF Token Invalid', { 
          status: 403,
          headers: securityHeaders
        })
      }
    }
    
    // 请求来源验证
    if (shouldValidateOrigin(request)) {
      if (!validateRequestOrigin(request)) {
        const origin = request.headers.get('origin')
        const referer = request.headers.get('referer')
        
        logger.warn('[Middleware] Invalid request origin', {
          ip: clientIP,
          path: pathname,
          method,
          origin,
          referer,
          userAgent
        })
        
        logSecurity({
          type: SecurityEventType.SUSPICIOUS_REQUEST,
          severity: 'HIGH',
          description: `Invalid request origin for ${method} ${pathname}`,
          ip: clientIP,
          userAgent,
          additionalData: {
            path: pathname,
            method,
            origin,
            referer,
            expectedHost: request.headers.get('host')
          }
        })
        
        return new NextResponse('Invalid Request Origin', { 
          status: 403,
          headers: securityHeaders
        })
      }
    }
    
    // 记录敏感路径访问
    if (pathname.startsWith('/api/auth/')) {
      logger.info('[Middleware] Sensitive API access', {
        ip: clientIP,
        path: pathname,
        method,
        userAgent
      })
    }
    
    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // 允许访问登录页面和API认证路由
        if (pathname.startsWith('/login') ||
            pathname.startsWith('/api/auth')) {
          return true
        }
        
        // 记录未授权访问尝试
        if (!token) {
          const clientIP = getClientIP(req)
          
          logger.info('[Middleware] Unauthorized access attempt', {
            ip: clientIP,
            path: pathname,
            userAgent: req.headers.get('user-agent')
          })
          
          logSecurity({
            type: SecurityEventType.UNAUTHORIZED_ACCESS,
            severity: 'LOW',
            description: `Unauthorized access attempt to ${pathname}`,
            ip: clientIP,
            userAgent: req.headers.get('user-agent') || 'unknown',
            additionalData: {
              path: pathname,
              hasToken: false
            }
          })
        }
        
        // 其他路径需要认证
        return !!token
      },
    },
  }
)

// 安全响应头配置
function getSecurityHeaders() {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  }
}

// 检查是否需要CSRF保护
function shouldCheckCSRF(request: NextRequest): boolean {
  const { pathname } = request.nextUrl
  const method = request.method
  
  // 只对POST、PUT、DELETE、PATCH请求进行CSRF检查
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return false
  }
  
  return CSRF_PROTECTED_PATHS.some(path => pathname.startsWith(path))
}

// 验证CSRF Token
function validateCSRFToken(request: NextRequest): boolean {
  const csrfTokenFromHeader = request.headers.get('x-csrf-token')
  const csrfTokenFromCookie = request.cookies.get('next-auth.csrf-token')?.value
  
  if (!csrfTokenFromHeader || !csrfTokenFromCookie) {
    return false
  }
  
  // 简单的token比较，实际应用中应该使用更安全的验证方法
  return csrfTokenFromHeader === csrfTokenFromCookie
}

// 检查是否需要验证请求来源
function shouldValidateOrigin(request: NextRequest): boolean {
  const { pathname } = request.nextUrl
  const method = request.method
  
  // 对敏感API路径进行来源验证
  const sensitiveAPIs = ['/api/cas/', '/api/auth/']
  
  return method !== 'GET' && sensitiveAPIs.some(api => pathname.startsWith(api))
}

// 验证请求来源
function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  
  if (!origin && !referer) {
    return false
  }
  
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`, // 开发环境
    process.env.NEXTAUTH_URL
  ].filter(Boolean)
  
  if (origin) {
    return allowedOrigins.includes(origin)
  }
  
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      return allowedOrigins.includes(refererUrl.origin)
    } catch {
      return false
    }
  }
  
  return false
}

// 获取客户端IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.ip ||
         'unknown'
}

// 简单的速率限制（内存存储，生产环境应使用Redis等）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}



export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
