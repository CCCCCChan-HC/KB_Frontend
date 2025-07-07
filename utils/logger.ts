// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SECURITY = 4
}

// 日志接口
interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
  ip?: string
  userAgent?: string
  userId?: string
  sessionId?: string
}

// 安全事件类型
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  CSRF_ATTACK = 'CSRF_ATTACK',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INVALID_ORIGIN = 'INVALID_ORIGIN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  CAS_VALIDATION_FAILURE = 'CAS_VALIDATION_FAILURE',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT'
}

// 安全事件接口
interface SecurityEvent {
  type: SecurityEventType
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  ip?: string
  userAgent?: string
  userId?: string
  sessionId?: string
  additionalData?: Record<string, any>
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private enableConsoleOutput: boolean
  private enableFileOutput: boolean
  private logBuffer: LogEntry[] = []
  private maxBufferSize: number = 1000

  private constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
    this.enableConsoleOutput = true
    this.enableFileOutput = process.env.NODE_ENV === 'production'
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  // 设置日志级别
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  // 通用日志方法
  private log(entry: LogEntry): void {
    if (entry.level < this.logLevel) {
      return
    }

    // 添加到缓冲区
    this.logBuffer.push(entry)
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift() // 移除最旧的日志
    }

    // 控制台输出
    if (this.enableConsoleOutput) {
      this.outputToConsole(entry)
    }

    // 文件输出（生产环境）
    if (this.enableFileOutput) {
      this.outputToFile(entry)
    }
  }

  // 控制台输出
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp
    const level = LogLevel[entry.level]
    const message = entry.message
    const context = entry.context ? JSON.stringify(entry.context, null, 2) : ''
    
    const logMessage = `[${timestamp}] [${level}] ${message}${context ? '\n' + context : ''}`

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage)
        break
      case LogLevel.INFO:
        console.info(logMessage)
        break
      case LogLevel.WARN:
        console.warn(logMessage)
        break
      case LogLevel.ERROR:
      case LogLevel.SECURITY:
        console.error(logMessage)
        if (entry.error) {
          console.error(entry.error.stack)
        }
        break
    }
  }

  // 文件输出（简化实现，实际应用中可能需要使用专门的日志库）
  private outputToFile(entry: LogEntry): void {
    // 在实际应用中，这里应该写入到日志文件或发送到日志服务
    // 由于浏览器环境限制，这里只是占位符
    if (typeof window === 'undefined') {
      // 服务器端环境
      try {
        const logData = {
          ...entry,
          error: entry.error ? {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name
          } : undefined
        }
        // 这里可以集成第三方日志服务，如 Winston, Pino 等
        console.log('[FILE_LOG]', JSON.stringify(logData))
      } catch (error) {
        console.error('Failed to write log to file:', error)
      }
    }
  }

  // Debug 日志
  public debug(message: string, context?: Record<string, any>): void {
    this.log({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context
    })
  }

  // Info 日志
  public info(message: string, context?: Record<string, any>): void {
    this.log({
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      context
    })
  }

  // Warning 日志
  public warn(message: string, context?: Record<string, any>): void {
    this.log({
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      context
    })
  }

  // Error 日志
  public error(message: string, context?: Record<string, any> | Error, error?: Error): void {
    let errorObj: Error | undefined
    let contextObj: Record<string, any> | undefined
    
    // 处理参数重载：支持 (message, context) 和 (message, error, context)
    if (context instanceof Error) {
      errorObj = context
      contextObj = error as Record<string, any> | undefined
    } else {
      contextObj = context
      errorObj = error
    }
    
    this.log({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context: contextObj,
      error: errorObj
    })
  }

  // 安全事件日志
  public security(event: SecurityEvent, ip?: string, userAgent?: string): void {
    const message = `Security Event: ${event.type} - ${event.description}`
    const context = {
      eventType: event.type,
      severity: event.severity,
      ip: ip || event.ip,
      userAgent: userAgent || event.userAgent,
      userId: event.userId,
      sessionId: event.sessionId,
      additionalData: event.additionalData
    }

    this.log({
      level: LogLevel.SECURITY,
      message,
      timestamp: new Date().toISOString(),
      context,
      ip: ip || event.ip,
      userAgent: userAgent || event.userAgent,
      userId: event.userId,
      sessionId: event.sessionId
    })

    // 对于高危安全事件，可以触发额外的告警
    if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
      this.triggerSecurityAlert(event, context)
    }
  }

  // 触发安全告警
  private triggerSecurityAlert(event: SecurityEvent, context: Record<string, any>): void {
    // 在实际应用中，这里可以:
    // 1. 发送邮件通知
    // 2. 发送短信告警
    // 3. 推送到监控系统
    // 4. 记录到安全事件数据库
    console.error(`🚨 SECURITY ALERT: ${event.type}`, context)
    
    // 示例：可以集成告警服务
    // await this.sendSecurityAlert(event, context)
  }

  // CAS 相关日志方法
  public casValidationStart(ticket: string, ip?: string, userAgent?: string): void {
    this.info('CAS ticket validation started', {
      ticket: ticket.substring(0, 10) + '...', // 只记录票据的前10位
      ip,
      userAgent
    })
  }

  public casValidationSuccess(username: string, ticket: string, ip?: string, userAgent?: string): void {
    this.info('CAS ticket validation successful', {
      username,
      ticket: ticket.substring(0, 10) + '...',
      ip,
      userAgent
    })

    this.security({
      type: SecurityEventType.LOGIN_SUCCESS,
      severity: 'LOW',
      description: `User ${username} successfully authenticated via CAS`,
      ip,
      userAgent,
      userId: username,
      additionalData: {
        authMethod: 'CAS',
        ticket: ticket.substring(0, 10) + '...'
      }
    })
  }

  public casValidationFailure(ticket: string, error: string, ip?: string, userAgent?: string): void {
    this.warn('CAS ticket validation failed', {
      ticket: ticket.substring(0, 10) + '...',
      error,
      ip,
      userAgent
    })

    this.security({
      type: SecurityEventType.CAS_VALIDATION_FAILURE,
      severity: 'MEDIUM',
      description: `CAS ticket validation failed: ${error}`,
      ip,
      userAgent,
      additionalData: {
        ticket: ticket.substring(0, 10) + '...',
        error
      }
    })
  }

  // 获取最近的日志
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count)
  }

  // 获取安全事件日志
  public getSecurityLogs(count: number = 50): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === LogLevel.SECURITY)
      .slice(-count)
  }

  // 清空日志缓冲区
  public clearBuffer(): void {
    this.logBuffer = []
  }
}

// 导出单例实例
export const logger = Logger.getInstance()

// 导出便捷方法
export const logDebug = (message: string, context?: Record<string, any>) => logger.debug(message, context)
export const logInfo = (message: string, context?: Record<string, any>) => logger.info(message, context)
export const logWarn = (message: string, context?: Record<string, any>) => logger.warn(message, context)
export const logError = (message: string, error?: Error, context?: Record<string, any>) => logger.error(message, context, error)
export const logSecurity = (event: SecurityEvent, ip?: string, userAgent?: string) => logger.security(event, ip, userAgent)

// CAS 相关便捷方法
export const logCasValidationStart = (ticket: string, ip?: string, userAgent?: string) => 
  logger.casValidationStart(ticket, ip, userAgent)
export const logCasValidationSuccess = (username: string, ticket: string, ip?: string, userAgent?: string) => 
  logger.casValidationSuccess(username, ticket, ip, userAgent)
export const logCasValidationFailure = (ticket: string, error: string, ip?: string, userAgent?: string) => 
  logger.casValidationFailure(ticket, error, ip, userAgent)