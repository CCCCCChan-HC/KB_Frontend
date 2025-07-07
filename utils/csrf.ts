import { getCsrfToken } from 'next-auth/react'

// 获取 CSRF Token
export async function getCSRFToken(): Promise<string | undefined> {
    try {
        return await getCsrfToken()
    } catch (error) {
        console.error('Failed to get CSRF token:', error)
        return undefined
    }
}

// 验证 CSRF Token（服务端使用）
export function validateCSRFToken(token: string, expectedToken: string): boolean {
    return token === expectedToken
}

// 生成随机 nonce（额外安全措施）
export function generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
}

// 生成安全状态参数
export function generateSecureState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           Date.now().toString(36)
}

// 验证用户名格式
export function validateUsername(username: string): { valid: boolean; reason?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, reason: 'Username is required and must be a string' }
  }
  
  if (username.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters long' }
  }
  
  if (username.length > 50) {
    return { valid: false, reason: 'Username must be no more than 50 characters long' }
  }
  
  // 用户名规则：3-50个字符，只允许字母、数字、下划线、连字符和点号
  const usernameRegex = /^[a-zA-Z0-9._-]{3,50}$/
  if (!usernameRegex.test(username)) {
    return { valid: false, reason: 'Username can only contain letters, numbers, dots, underscores, and hyphens' }
  }
  
  return { valid: true }
}

// 验证时间戳（防止重放攻击）
export function validateTimestamp(timestamp: string, maxAgeMs: number = 5 * 60 * 1000): boolean {
    const requestTime = parseInt(timestamp)
    if (isNaN(requestTime)) return false
    
    const currentTime = Date.now()
    const timeDiff = currentTime - requestTime
    
    return timeDiff >= 0 && timeDiff <= maxAgeMs
}