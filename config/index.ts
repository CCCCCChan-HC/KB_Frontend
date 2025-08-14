import type { AppInfo } from '@/types/app'
import { getAppId, getAppKey, getApiUrl } from '@/utils/env'

export const APP_ID = getAppId()
export const API_KEY = getAppKey()
export const API_URL = getApiUrl()

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
