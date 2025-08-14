import { env } from 'next-runtime-env'

/**
 * 运行时环境变量获取工具
 * 支持在构建后动态修改环境变量，实现单次构建多环境部署
 */

// 应用配置
export const getAppId = () => env('NEXT_PUBLIC_APP_ID') || ''
export const getAppKey = () => env('NEXT_PUBLIC_APP_KEY') || ''
export const getApiUrl = () => env('NEXT_PUBLIC_API_URL') || ''

// CAS配置 - 客户端
export const getCasBaseUrl = () => env('NEXT_PUBLIC_CAS_BASE_URL') || ''
export const getCasServiceUrl = () => env('NEXT_PUBLIC_CAS_SERVICE_URL') || ''

// CAS配置 - 服务端
export const getServerCasBaseUrl = () => env('CAS_BASE_URL') || ''
export const getServerCasServiceUrl = () => env('CAS_SERVICE_URL') || ''

// NextAuth配置
export const getNextAuthUrl = () => env('NEXTAUTH_URL') || ''
export const getNextAuthSecret = () => env('NEXTAUTH_SECRET') || ''

// 环境设置
export const getNodeEnv = () => env('NODE_ENV') || 'development'

// HTTPS设置
export const getHttpsEnabled = () => env('HTTPS') === 'true'
export const getSslDomain = () => env('SSL_DOMAIN') || 'localhost'
export const getSslCertFile = () => env('SSL_CERT_FILE') || '/app/certs/server.crt'
export const getSslKeyFile = () => env('SSL_KEY_FILE') || '/app/certs/server.key'

// 通用环境变量获取函数
export const getRuntimeEnv = (key: string, defaultValue: string = '') => {
  return env(key) || defaultValue
}

// 环境变量配置对象
export const runtimeConfig = {
  app: {
    id: getAppId,
    key: getAppKey,
    apiUrl: getApiUrl,
  },
  cas: {
    baseUrl: getCasBaseUrl,
    serviceUrl: getCasServiceUrl,
    serverBaseUrl: getServerCasBaseUrl,
    serverServiceUrl: getServerCasServiceUrl,
  },
  auth: {
    url: getNextAuthUrl,
    secret: getNextAuthSecret,
  },
  ssl: {
    enabled: getHttpsEnabled,
    domain: getSslDomain,
    certFile: getSslCertFile,
    keyFile: getSslKeyFile,
  },
  nodeEnv: getNodeEnv,
}