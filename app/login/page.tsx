'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn, getCsrfToken, useSession } from 'next-auth/react'
import { validateUsername, validateTimestamp, generateSecureState } from '@/utils/csrf'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { data: session, status } = useSession()
    const [csrfToken, setCsrfToken] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 检查用户是否已登录，如果已登录则重定向到主页
    useEffect(() => {
        console.log('[Login Page] Session status:', status, 'Session:', session)
        console.log('[Login Page] NEXTAUTH_URL:', process.env.NEXT_PUBLIC_NEXTAUTH_URL)
        console.log('[Login Page] Current URL:', window.location.href)
        
        if (status === 'authenticated' && session) {
            console.log('User already authenticated, redirecting to home page')
            console.log('Session user:', session.user)
            // 使用 window.location.href 强制重定向
            window.location.href = '/'
        }
    }, [status, session, router])

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
                // NextAuth 默认错误类型
                case 'CredentialsSignin':
                    setError('用户名或密码错误，请重试')
                    break
                case 'SessionRequired':
                    setError('需要登录才能访问，请先登录')
                    break
                case 'AccessDenied':
                    setError('访问被拒绝，请检查您的权限')
                    break
                case 'Verification':
                    setError('验证失败，请重新登录')
                    break
                case 'Configuration':
                    setError('系统配置错误，请联系管理员')
                    break
                default:
                    setError(`登录过程中发生错误: ${errorParam}`)
            }
            // 清除URL中的错误参数，避免刷新页面时重复显示
            window.history.replaceState({}, '', '/login')
        }
    }, [searchParams])

    // 处理CAS登录回调
    useEffect(() => {
        const handleCasCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search)
            const ticket = urlParams.get('ticket')
            
            if (ticket) {
                console.log('Processing CAS login callback...')
                
                // 防止重复处理
                if (isProcessing) {
                    return
                }
                
                setIsProcessing(true)
                setError(null)
                
                // 立即清理URL参数，防止错误处理useEffect捕获到CredentialsSignin
                window.history.replaceState({}, '', '/login')
                
                try {
                    // 从sessionStorage获取状态参数和时间戳
                    const state = sessionStorage.getItem('cas_state')
                    const timestamp = sessionStorage.getItem('cas_timestamp')
                    
                    if (!state || !timestamp) {
                        throw new Error('登录状态丢失，请重新登录')
                    }
                    
                    // 验证时间戳（5分钟有效期）
                    const timestampNum = parseInt(timestamp)
                    const now = Date.now()
                    if (now - timestampNum > 5 * 60 * 1000) {
                        throw new Error('登录链接已过期，请重新登录')
                    }
                    
                    // 清理sessionStorage
                    sessionStorage.removeItem('cas_state')
                    sessionStorage.removeItem('cas_timestamp')
                    sessionStorage.removeItem('cas_login_time')
                    
                    // 直接使用NextAuth进行CAS登录，传递ticket
                    const result = await signIn('credentials', {
                        ticket: ticket,
                        state: state,
                        timestamp: timestamp,
                        redirect: false
                    })
                    
                    if (result?.ok) {
                        // 登录成功，重定向到主页
                        console.log('Login successful, redirecting to home page')
                        router.push('/')
                    } else {
                        throw new Error(result?.error || '身份验证失败')
                    }
                } catch (err) {
                    console.error('CAS登录失败:', err)
                    setError(err instanceof Error ? err.message : '登录失败，请重试')
                } finally {
                    setIsProcessing(false)
                }
            }
        }
        
        handleCasCallback()
    }, [router, isProcessing])

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
            const timestamp = Date.now().toString()
            // 将状态参数和时间戳存储到sessionStorage，CAS重定向时会保留
            sessionStorage.setItem('cas_timestamp', timestamp)
            const serviceUrl = encodeURIComponent(casServiceUrl)
            const casUrl = `${casBaseUrl}/login?service=${serviceUrl}`

            console.log('Redirecting to CAS login:', casUrl)
            setError(null)
            window.location.href = casUrl
            console.log('', window.location.href)
        } catch (error: any) {
            console.error('Error preparing CAS login:', error)
            setError('准备登录时发生错误：' + error.message)
        }
    }

    // 如果正在检查会话状态或已经认证，显示加载状态
    if (status === 'loading' || (status === 'authenticated' && session)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">
                        {status === 'loading' ? '正在检查登录状态...' : '正在跳转到主页...'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">登录</h1>

                {/* 错误信息显示 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        <div className="flex justify-between items-start">
                            <span className="text-sm">{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="ml-2 text-red-500 hover:text-red-700 font-bold"
                                aria-label="关闭错误信息"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {/* CSRF Token 隐藏字段 */}
                {csrfToken && (
                    <input
                        type="hidden"
                        name="csrfToken"
                        value={csrfToken}
                    />
                )}

                {/* 登录按钮 */}
                <button
                    onClick={handleCasLogin}
                    disabled={isProcessing || !csrfToken}
                    className={`w-full py-3 px-4 rounded-md transition-all duration-200 font-medium ${isProcessing || !csrfToken
                            ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md hover:shadow-lg'
                        }`}
                >
                    {isProcessing ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            处理中...
                        </div>
                    ) : (
                        'CAS登录'
                    )}
                </button>

                {/* 状态信息 */}
                {!csrfToken && !error && (
                    <div className="text-yellow-600 text-sm mt-3 text-center flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></div>
                        正在加载安全令牌...
                    </div>
                )}

                {isProcessing && (
                    <div className="text-blue-600 text-sm mt-3 text-center">
                        正在验证登录信息，请稍候...
                    </div>
                )}

                {/* 安全提示 */}
                <div className="mt-6 text-xs text-gray-500 text-center">
                    <p>本系统使用CAS统一身份认证</p>
                    <p className="mt-1">登录即表示您同意遵守相关使用条款</p>
                </div>
            </div>
        </div>
    )
}
