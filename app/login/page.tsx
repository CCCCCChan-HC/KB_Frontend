'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn, getCsrfToken } from 'next-auth/react'
import LoginForm from '@/app/components/login/login-form'
import { validateUsername, validateTimestamp, generateSecureState } from '@/utils/csrf'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [csrfToken, setCsrfToken] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    // 获取 CSRF Token
    useEffect(() => {
        getCsrfToken().then(token => {
            setCsrfToken(token || null)
        }).catch(err => {
            console.error('Failed to get CSRF token:', err)
            setError('安全令牌获取失败，请刷新页面重试')
        })
    }, [])
    
    // 检查URL错误参数
    useEffect(() => {
        const errorParam = searchParams.get('error')
        if (errorParam) {
            switch (errorParam) {
                case 'expired':
                    setError('登录请求已过期，请重新登录')
                    break
                case 'invalid':
                    setError('用户名格式无效')
                    break
                case 'signin_failed':
                    setError('登录失败，请重试')
                    break
                case 'signin_error':
                    setError('登录过程中发生错误')
                    break
                default:
                    setError('登录过程中发生未知错误')
            }
        }
    }, [searchParams])
    
    // 检查CAS登录成功的参数
    useEffect(() => {
        const casUser = searchParams.get('cas_user')
        const casLogin = searchParams.get('cas_login')
        const state = searchParams.get('state')
        const timestamp = searchParams.get('timestamp')
        
        if (casLogin === 'success' && casUser && state && timestamp) {
            console.log('Processing CAS login callback...')
            
            // 防止重复处理
            if (isProcessing) {
                return
            }
            
            // 验证时间戳（防止重放攻击）
            if (!validateTimestamp(timestamp, 5 * 60 * 1000)) { // 5分钟有效期
                console.error('CAS login request expired or invalid timestamp')
                setError('登录请求已过期，请重新登录')
                // 清除URL参数
                window.history.replaceState({}, '', '/login?error=expired')
                return
            }
            
            // 验证用户名格式
            if (!validateUsername(casUser)) {
                console.error('Invalid username format from CAS:', casUser)
                setError('用户名格式无效')
                window.history.replaceState({}, '', '/login?error=invalid')
                return
            }
            
            // 验证状态参数（基本检查）
            if (state.length < 16) {
                console.error('Invalid state parameter')
                setError('安全验证失败，请重新登录')
                window.history.replaceState({}, '', '/login?error=invalid')
                return
            }
            
            console.log('CAS login validation passed, signing in user:', casUser)
            setIsProcessing(true)
            setError(null)
            
            // 使用NextAuth的credentials provider登录
            signIn('credentials', {
                username: casUser,
                callbackUrl: '/',
                redirect: false // 改为手动处理重定向
            }).then((result) => {
                console.log('NextAuth signIn result:', result)
                if (result?.ok) {
                    // 清除URL参数
                    window.history.replaceState({}, '', '/login')
                    console.log('Login successful, redirecting to home page')
                    router.push('/')
                } else {
                    console.error('NextAuth signIn failed:', result?.error)
                    setError('登录失败：' + (result?.error || '未知错误'))
                    window.history.replaceState({}, '', '/login?error=signin_failed')
                }
            }).catch((error) => {
                console.error('NextAuth signIn error:', error)
                setError('登录过程中发生错误：' + error.message)
                window.history.replaceState({}, '', '/login?error=signin_error')
            }).finally(() => {
                setIsProcessing(false)
            })
        }
    }, [searchParams, router, isProcessing])
    
    // 处理CAS登录
    const handleCasLogin = () => {
        if (isProcessing) {
            console.log('Login already in progress, ignoring click')
            return
        }
        
        if (!csrfToken) {
            setError('安全令牌未就绪，请稍后重试')
            return
        }
        
        // 获取客户端环境变量
        const casBaseUrl = process.env.NEXT_PUBLIC_CAS_BASE_URL
        const casServiceUrl = process.env.NEXT_PUBLIC_CAS_SERVICE_URL
        
        // 检查环境变量是否设置
        if (!casBaseUrl || !casServiceUrl) {
            console.error('CAS环境变量未设置!')
            console.error(`NEXT_PUBLIC_CAS_BASE_URL: ${casBaseUrl}`)
            console.error(`NEXT_PUBLIC_CAS_SERVICE_URL: ${casServiceUrl}`)
            setError('CAS配置错误：请联系系统管理员')
            return
        }

        try {
            // 生成状态参数（防止CSRF攻击）
            const state = generateSecureState()
            sessionStorage.setItem('cas_state', state)
            sessionStorage.setItem('cas_login_time', Date.now().toString())
            
            // 构建CAS登录URL
            const serviceUrl = encodeURIComponent(casServiceUrl)
            const casUrl = `${casBaseUrl}/login?service=${serviceUrl}`

            console.log('Redirecting to CAS login:', casUrl)
            setError(null)
            window.location.href = casUrl
        } catch (error: any) {
            console.error('Error preparing CAS login:', error)
            setError('准备登录时发生错误：' + error.message)
        }
    }

    return (
        <LoginForm 
            onCasLogin={handleCasLogin} 
            csrfToken={csrfToken}
            isProcessing={isProcessing}
            error={error}
            onClearError={() => setError(null)}
        />
    )
}
