import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { validateRequiredEnvVars, validateEnvConsistency, getEnvSummary } from '@/utils/env-validator'
import { logger } from '@/utils/logger'

/**
 * 环境变量检查 API
 * GET /api/env - 获取环境变量状态
 */
export async function GET(request: NextRequest) {
  try {
    // 检查认证状态（可选，根据需要启用）
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    logger.info('[Env API] Environment check requested', {
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent')
    })
    
    // 执行环境变量验证
    const requiredValidation = validateRequiredEnvVars()
    const consistencyValidation = validateEnvConsistency()
    const envSummary = getEnvSummary()
    
    // 构建响应
    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      validation: {
        required: {
          isValid: requiredValidation.isValid,
          errors: requiredValidation.errors
        },
        consistency: {
          isValid: consistencyValidation.isValid,
          warnings: consistencyValidation.warnings
        }
      },
      environment: envSummary,
      summary: {
        allValid: requiredValidation.isValid && consistencyValidation.isValid,
        errorCount: requiredValidation.errors.length,
        warningCount: consistencyValidation.warnings.length,
        nodeEnv: process.env.NODE_ENV,
        httpsEnabled: process.env.HTTPS === 'true'
      }
    }
    
    // 根据验证结果设置状态码
    const statusCode = requiredValidation.isValid ? 200 : 500
    
    return NextResponse.json(response, { status: statusCode })
    
  } catch (error) {
    logger.error('[Env API] Environment check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Environment check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * 环境变量同步检查
 * POST /api/env/sync - 强制重新验证环境变量
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[Env API] Environment sync requested', {
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent')
    })
    
    // 重新验证环境变量
    const requiredValidation = validateRequiredEnvVars()
    const consistencyValidation = validateEnvConsistency()
    
    // 记录验证结果
    if (!requiredValidation.isValid) {
      logger.error('[Env API] Required environment variables validation failed', {
        errors: requiredValidation.errors
      })
    }
    
    if (!consistencyValidation.isValid) {
      logger.warn('[Env API] Environment consistency warnings', {
        warnings: consistencyValidation.warnings
      })
    }
    
    const response = {
      status: 'synced',
      timestamp: new Date().toISOString(),
      validation: {
        required: requiredValidation,
        consistency: consistencyValidation
      },
      message: requiredValidation.isValid 
        ? 'Environment variables are valid' 
        : 'Environment validation failed'
    }
    
    const statusCode = requiredValidation.isValid ? 200 : 400
    
    return NextResponse.json(response, { status: statusCode })
    
  } catch (error) {
    logger.error('[Env API] Environment sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Environment sync failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}