import type { AppInfo } from '@/types/app'

// 运行时配置获取函数
const getRuntimeConfig = () => {
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    return (window as any).__RUNTIME_CONFIG__
  }
  return null
}

// 获取配置值的函数，优先使用运行时配置
const getConfigValue = (envKey: string, runtimeKey: string) => {
  const runtime = getRuntimeConfig()
  if (runtime && runtime[runtimeKey]) {
    return runtime[runtimeKey]
  }
  return process.env[envKey] || ''
}

export const APP_ID = getConfigValue('NEXT_PUBLIC_APP_ID', 'APP_ID')
export const API_KEY = getConfigValue('NEXT_PUBLIC_APP_KEY', 'API_KEY')
export const API_URL = getConfigValue('NEXT_PUBLIC_API_URL', 'API_URL')

export const APP_INFO: AppInfo = {
  title: 'Chat APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'zh-Hans',
}

export const isShowPrompt = false
export const promptTemplate = 'I want you to act as a javascript console.'

export const API_PREFIX = '/api'

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48
