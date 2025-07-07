import { NextRequest, NextResponse } from 'next/server'
import { validateUsername, generateSecureState } from '@/utils/csrf'
import { 
  logger, 
  logCasValidationStart, 
  logCasValidationSuccess, 
  logCasValidationFailure,
  logSecurity,
  SecurityEventType 
} from '@/utils/logger'

// CAS票据验证使用原生fetch实现

// 获取客户端IP
function getClientIP(request: NextRequest): string {
  return request.ip || 
         request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

// 生成安全状态参数的内部函数
function generateSecureStateInternal(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 15)
  const combined = `${timestamp}-${random}`
  
  // 简单的编码（实际应用中应使用更强的加密）
  return Buffer.from(combined).toString('base64url')
}

// 验证请求来源


// 验证票据格式
function validateTicketFormat(ticket: string): { valid: boolean; reason?: string } {
  // CAS票据通常以ST-开头，后跟随机字符串
  const ticketPattern = /^ST-[A-Za-z0-9\-_]+$/
  
  if (!ticket) {
    return { valid: false, reason: 'Ticket is required' }
  }
  
  if (ticket.length < 10 || ticket.length > 256) {
    return { valid: false, reason: 'Invalid ticket length' }
  }
  
  if (!ticketPattern.test(ticket)) {
    return { valid: false, reason: 'Invalid ticket format' }
  }
  
  return { valid: true }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const clientIP = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    const { searchParams } = new URL(request.url)
    const ticket = searchParams.get('ticket')
    
    // 记录CAS验证开始
    if (ticket) {
      logCasValidationStart(ticket, clientIP, userAgent)
    }
    
    logger.info('[CAS Validate] Processing ticket validation request', {
      ticket: ticket ? ticket.substring(0, 10) + '...' : 'null',
      clientIP,
      userAgent,
      timestamp: new Date().toISOString()
    })
    
    // 验证请求来源（对于CAS重定向，referer通常是CAS服务器）
    const referer = request.headers.get('referer')
    const expectedOrigin = process.env.NEXTAUTH_URL || ''
    const casBaseUrl = process.env.CAS_BASE_URL || process.env.NEXT_PUBLIC_CAS_BASE_URL || ''
    
    // 提取CAS服务器的主机部分（不包含路径）
    const casHostUrl = casBaseUrl ? new URL(casBaseUrl).origin : ''
    
    // 允许的来源：本地应用和CAS服务器（包括主机和完整URL）
    const allowedOrigins = [expectedOrigin, casBaseUrl, casHostUrl].filter(Boolean)
    
    if (referer && !allowedOrigins.some(origin => referer.includes(origin) || origin.includes(referer.replace(/\/$/, '')))) {
      logger.warn('[CAS Validate] Request origin validation failed', {
        referer: referer || 'null',
        expectedOrigin,
        casBaseUrl,
        casHostUrl,
        allowedOrigins,
        clientIP,
        userAgent
      })
      
      logSecurity({
        type: SecurityEventType.INVALID_ORIGIN,
        severity: 'MEDIUM',
        description: `Invalid request origin for CAS validation: referer=${referer || 'null'}`,
        ip: clientIP,
        userAgent,
        additionalData: { endpoint: '/api/cas/validate', expectedOrigin, casBaseUrl }
      })
      
      return NextResponse.json(
        { error: 'Invalid request origin', code: 'ORIGIN_INVALID' },
        { status: 403 }
      )
    }
    
    // 验证票据格式
    if (!ticket) {
      logger.warn('[CAS Validate] No ticket provided', { clientIP, userAgent })
      
      logSecurity({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: 'LOW',
        description: 'CAS validation request without ticket parameter',
        ip: clientIP,
        userAgent
      })
      
      return NextResponse.json(
        { error: 'Ticket parameter is required', code: 'TICKET_MISSING' },
        { status: 400 }
      )
    }
    
    const ticketValidation = validateTicketFormat(ticket)
    if (!ticketValidation.valid) {
      logger.warn('[CAS Validate] Ticket format validation failed', {
        reason: ticketValidation.reason,
        ticketPrefix: ticket.substring(0, 10) + '...',
        clientIP,
        userAgent
      })
      
      logCasValidationFailure(ticket, `Invalid ticket format: ${ticketValidation.reason}`, clientIP, userAgent)
      
      return NextResponse.json(
        { error: ticketValidation.reason, code: 'TICKET_INVALID_FORMAT' },
        { status: 400 }
      )
    }
    
    // 检查必要的环境变量
    const casServerUrl = process.env.CAS_BASE_URL
    const casServiceUrl = process.env.CAS_SERVICE_URL
    
    if (!casServerUrl || !casServiceUrl) {
      logger.error('[CAS Validate] Missing required environment variables', {
        error: 'Environment configuration error',
        casServerUrl: !!casServerUrl,
        casServiceUrl: !!casServiceUrl,
        clientIP,
        userAgent,
        processingTime: Date.now() - startTime
      })
      
      return NextResponse.json(
        { error: 'Server configuration error', code: 'CONFIG_ERROR' },
        { status: 500 }
      )
    }
    
    logger.info('[CAS Validate] Validating ticket with CAS server', {
      casServerUrl,
      serviceUrl: casServiceUrl,
      ticketPrefix: ticket.substring(0, 10) + '...',
      clientIP,
      userAgent
    })
    
    // 直接使用fetch验证CAS票据，不依赖node-cas库
    
    // 设置超时和自定义请求头
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
    
    try {
      const response = await fetch(`${casServerUrl}/serviceValidate?ticket=${encodeURIComponent(ticket)}&service=${encodeURIComponent(casServiceUrl)}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'KB-Frontend-CAS-Client/1.0',
          'Accept': 'application/xml, text/xml',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`CAS server responded with status: ${response.status}`)
      }
      
      const xmlText = await response.text()
      logger.debug('[CAS Validate] Received response from CAS server', {
        status: response.status,
        contentLength: xmlText.length,
        clientIP,
        userAgent
      })
      
      // 解析XML响应（使用正则表达式，避免DOMParser依赖）
      const successMatch = xmlText.match(/<cas:authenticationSuccess[^>]*>([\s\S]*?)<\/cas:authenticationSuccess>|<authenticationSuccess[^>]*>([\s\S]*?)<\/authenticationSuccess>/)
      const failureMatch = xmlText.match(/<cas:authenticationFailure[^>]*code="([^"]*)">([\s\S]*?)<\/cas:authenticationFailure>|<authenticationFailure[^>]*code="([^"]*)">([\s\S]*?)<\/authenticationFailure>/)
      
      if (successMatch) {
        const successContent = successMatch[1] || successMatch[2]
        const userMatch = successContent.match(/<cas:user>([^<]+)<\/cas:user>|<user>([^<]+)<\/user>/)
        const username = (userMatch?.[1] || userMatch?.[2])?.trim()
        
        if (!username) {
          logger.error('[CAS Validate] No username found in CAS response', {
            clientIP,
            userAgent,
            ticketPrefix: ticket.substring(0, 10) + '...'
          })
          
          logCasValidationFailure(ticket, 'No username in CAS response', clientIP, userAgent)
          
          return NextResponse.json(
            { error: 'Invalid CAS response: no username', code: 'CAS_NO_USERNAME' },
            { status: 500 }
          )
        }
        
        // 验证用户名格式
        const usernameValidation = validateUsername(username)
        if (!usernameValidation.valid) {
          logger.warn('[CAS Validate] Username validation failed', {
            username,
            reason: usernameValidation.reason,
            clientIP,
            userAgent
          })
          
          logCasValidationFailure(ticket, `Invalid username format: ${usernameValidation.reason}`, clientIP, userAgent)
          
          return NextResponse.json(
            { error: usernameValidation.reason, code: 'USERNAME_INVALID' },
            { status: 400 }
          )
        }
        
        // 记录成功的CAS验证
        logCasValidationSuccess(username, ticket, clientIP, userAgent)
        
        logger.info('[CAS Validate] Ticket validation successful', {
          username,
          processingTime: Date.now() - startTime,
          clientIP,
          userAgent
        })
        
        // 生成安全状态参数
        const state = generateSecureStateInternal()
        const timestamp = Date.now()
        
        // 构建重定向URL
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('cas_user', username)
        redirectUrl.searchParams.set('cas_login', 'success')
        redirectUrl.searchParams.set('state', state)
        redirectUrl.searchParams.set('timestamp', timestamp.toString())
        
        return NextResponse.redirect(redirectUrl)
        
      } else if (failureMatch) {
        const failureCode = failureMatch[1] || failureMatch[3] || 'UNKNOWN'
        const failureMessage = (failureMatch[2] || failureMatch[4])?.trim() || 'Authentication failed'
        
        logger.warn('[CAS Validate] CAS authentication failed', {
          code: failureCode,
          message: failureMessage,
          ticket: ticket.substring(0, 10) + '...',
          clientIP,
          userAgent
        })
        
        logCasValidationFailure(ticket, `CAS auth failed: ${failureCode} - ${failureMessage}`, clientIP, userAgent)
        
        return NextResponse.json(
          { 
            error: `CAS authentication failed: ${failureMessage}`, 
            code: `CAS_AUTH_FAILED_${failureCode}` 
          },
          { status: 401 }
        )
        
      } else {
        logger.error('[CAS Validate] Invalid CAS response format', {
          xmlLength: xmlText.length,
          xmlPreview: xmlText.substring(0, 200),
          clientIP,
          userAgent
        })
        
        logCasValidationFailure(ticket, 'Invalid CAS response format', clientIP, userAgent)
        
        return NextResponse.json(
          { error: 'Invalid CAS response format', code: 'CAS_INVALID_RESPONSE' },
          { status: 500 }
        )
      }
      
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        logger.error('[CAS Validate] CAS server request timeout', {
          clientIP,
          userAgent,
          ticketPrefix: ticket.substring(0, 10) + '...'
        })
        
        logCasValidationFailure(ticket, 'CAS server timeout', clientIP, userAgent)
        
        return NextResponse.json(
          { error: 'CAS server request timeout', code: 'CAS_TIMEOUT' },
          { status: 504 }
        )
      }
      
      logger.error('[CAS Validate] Error communicating with CAS server', {
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        clientIP,
        userAgent,
        ticketPrefix: ticket.substring(0, 10) + '...'
      })
      
      logCasValidationFailure(ticket, `Communication error: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`, clientIP, userAgent)
      
      return NextResponse.json(
        { error: 'Failed to communicate with CAS server', code: 'CAS_COMMUNICATION_ERROR' },
        { status: 502 }
      )
    }
    
  } catch (error) {
    logger.error('[CAS Validate] Unexpected error during ticket validation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ticket: request.url.includes('ticket=') ? 'present' : 'missing',
      processingTime: Date.now() - startTime,
      clientIP,
      userAgent
    })
    
    const ticket = new URL(request.url).searchParams.get('ticket')
    if (ticket) {
      logCasValidationFailure(ticket, `Internal error: ${error instanceof Error ? error.message : 'Unknown'}`, clientIP, userAgent)
    }
    
    return NextResponse.json(
      { error: 'Internal server error during ticket validation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
