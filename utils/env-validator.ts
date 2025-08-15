/**
 * 环境变量验证工具
 * 确保所有必需的环境变量都已正确配置
 */

import { logger } from './logger'

// 必需的环境变量配置
interface RequiredEnvVars {
  // 应用配置
  NEXT_PUBLIC_APP_ID?: string
  NEXT_PUBLIC_APP_KEY?: string
  NEXT_PUBLIC_API_URL?: string
  
  // CAS 配置
  NEXT_PUBLIC_CAS_BASE_URL: string
  NEXT_PUBLIC_CAS_SERVICE_URL: string
  CAS_BASE_URL: string
  CAS_SERVICE_URL: string
  
  // NextAuth 配置
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string
  
  // 环境设置
  NODE_ENV: string
}

// 可选的环境变量
interface OptionalEnvVars {
  HTTPS?: string
  SSL_DOMAIN?: string
  SSL_CERT_FILE?: string
  SSL_KEY_FILE?: string
}

/**
 * 验证必需的环境变量
 */
export function validateRequiredEnvVars(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 检查必需的环境变量
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'NEXT_PUBLIC_CAS_BASE_URL',
    'NEXT_PUBLIC_CAS_SERVICE_URL',
    'CAS_BASE_URL',
    'CAS_SERVICE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'NODE_ENV'
  ]
  
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${varName}`)
    }
  }
  
  // 验证 URL 格式
  const urlVars = [
    'NEXT_PUBLIC_CAS_BASE_URL',
    'NEXT_PUBLIC_CAS_SERVICE_URL',
    'CAS_BASE_URL',
    'CAS_SERVICE_URL',
    'NEXTAUTH_URL'
  ]
  
  for (const varName of urlVars) {
    const value = process.env[varName]
    if (value && !isValidUrl(value)) {
      errors.push(`Invalid URL format for ${varName}: ${value}`)
    }
  }
  
  // 验证 NEXTAUTH_SECRET 长度
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && secret.length < 32) {
    errors.push('NEXTAUTH_SECRET should be at least 32 characters long')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证环境变量一致性
 */
export function validateEnvConsistency(): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []
  
  // 检查客户端和服务器端 CAS URL 是否一致
  const clientCasBase = process.env.NEXT_PUBLIC_CAS_BASE_URL
  const serverCasBase = process.env.CAS_BASE_URL
  
  if (clientCasBase && serverCasBase) {
    // 在 Docker 环境中，服务器端可能使用内部网络地址
    const clientHost = extractHost(clientCasBase)
    const serverHost = extractHost(serverCasBase)
    
    if (clientHost !== serverHost && !isDockerEnvironment()) {
      warnings.push(`CAS base URL mismatch: client=${clientCasBase}, server=${serverCasBase}`)
    }
  }
  
  const clientCasService = process.env.NEXT_PUBLIC_CAS_SERVICE_URL
  const serverCasService = process.env.CAS_SERVICE_URL
  
  if (clientCasService && serverCasService && clientCasService !== serverCasService) {
    warnings.push(`CAS service URL mismatch: client=${clientCasService}, server=${serverCasService}`)
  }
  
  // 检查 NEXTAUTH_URL 与 CAS service URL 的一致性
  const nextAuthUrl = process.env.NEXTAUTH_URL
  if (nextAuthUrl && clientCasService) {
    const nextAuthHost = extractHost(nextAuthUrl)
    const casServiceHost = extractHost(clientCasService)
    
    if (nextAuthHost !== casServiceHost) {
      warnings.push(`NEXTAUTH_URL and CAS service URL host mismatch: ${nextAuthHost} vs ${casServiceHost}`)
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  }
}

/**
 * 获取当前环境变量配置摘要
 */
export function getEnvSummary(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CAS_BASE_URL: process.env.NEXT_PUBLIC_CAS_BASE_URL,
    NEXT_PUBLIC_CAS_SERVICE_URL: process.env.NEXT_PUBLIC_CAS_SERVICE_URL,
    CAS_BASE_URL: process.env.CAS_BASE_URL,
    CAS_SERVICE_URL: process.env.CAS_SERVICE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '[REDACTED]' : undefined,
    HTTPS: process.env.HTTPS,
    SSL_DOMAIN: process.env.SSL_DOMAIN,
    NEXT_PUBLIC_APP_ID: process.env.NEXT_PUBLIC_APP_ID ? '[SET]' : undefined,
    NEXT_PUBLIC_APP_KEY: process.env.NEXT_PUBLIC_APP_KEY ? '[REDACTED]' : undefined,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  }
}

/**
 * 在应用启动时验证环境变量
 */
export function validateEnvironmentOnStartup(): void {
  logger.info('[Env Validator] Starting environment validation...')
  
  const requiredValidation = validateRequiredEnvVars()
  const consistencyValidation = validateEnvConsistency()
  
  // 记录环境变量摘要
  logger.info('[Env Validator] Environment summary:', getEnvSummary())
  
  // 处理错误
  if (!requiredValidation.isValid) {
    logger.error('[Env Validator] Required environment variables validation failed:', {
      errors: requiredValidation.errors
    })
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed: ${requiredValidation.errors.join(', ')}`)
    }
  }
  
  // 处理警告
  if (!consistencyValidation.isValid) {
    logger.warn('[Env Validator] Environment consistency warnings:', {
      warnings: consistencyValidation.warnings
    })
  }
  
  logger.info('[Env Validator] Environment validation completed', {
    requiredValid: requiredValidation.isValid,
    consistencyValid: consistencyValidation.isValid,
    errorCount: requiredValidation.errors.length,
    warningCount: consistencyValidation.warnings.length
  })
}

// 辅助函数
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function extractHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function isDockerEnvironment(): boolean {
  return process.env.DOCKER === 'true' || 
         process.env.KUBERNETES_SERVICE_HOST !== undefined ||
         process.env.HOSTNAME?.includes('docker') === true
}