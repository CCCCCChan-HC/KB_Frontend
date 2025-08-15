'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { logger } from '@/utils/logger'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

/**
 * 认证守卫组件
 * 用于保护需要认证的页面和组件
 */
export default function AuthGuard({
  children,
  fallback = <AuthLoadingSpinner />,
  redirectTo = '/login',
  requireAuth = true
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (status === 'loading') {
      // 仍在加载认证状态，等待
      return
    }

    if (requireAuth && status === 'unauthenticated') {
      // 需要认证但用户未认证，重定向到登录页
      if (!isRedirecting) {
        logger.info('[AuthGuard] Redirecting unauthenticated user to login', {
          currentPath: window.location.pathname,
          redirectTo
        })
        
        setIsRedirecting(true)
        router.replace(redirectTo)
      }
      return
    }

    if (!requireAuth && status === 'authenticated') {
      // 不需要认证但用户已认证（如登录页），重定向到主页
      if (!isRedirecting) {
        logger.info('[AuthGuard] Redirecting authenticated user from public page', {
          currentPath: window.location.pathname,
          user: session?.user?.name
        })
        
        setIsRedirecting(true)
        router.replace('/')
      }
      return
    }

    // 重置重定向状态
    if (isRedirecting) {
      setIsRedirecting(false)
    }
  }, [status, session, requireAuth, redirectTo, router, isRedirecting])

  // 显示加载状态
  if (status === 'loading' || isRedirecting) {
    return <>{fallback}</>
  }

  // 需要认证但用户未认证
  if (requireAuth && status === 'unauthenticated') {
    return <>{fallback}</>
  }

  // 不需要认证但用户已认证（如登录页）
  if (!requireAuth && status === 'authenticated') {
    return <>{fallback}</>
  }

  // 认证状态符合要求，显示内容
  return <>{children}</>
}

/**
 * 认证加载动画组件
 */
function AuthLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-600 text-sm">
          正在验证身份...
        </div>
      </div>
    </div>
  )
}

/**
 * 受保护页面的高阶组件
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  function AuthGuardedComponent(props: P) {
    // 在服务器端渲染时，直接返回组件，避免认证检查
    if (typeof window === 'undefined') {
      return <Component {...props} />
    }
    
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
  
  // 设置显示名称以便调试
  AuthGuardedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name || 'Component'})`
  
  return AuthGuardedComponent
}

/**
 * 公共页面的高阶组件（如登录页）
 */
export function withPublicGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children' | 'requireAuth'>
) {
  return function PublicGuardedComponent(props: P) {
    return (
      <AuthGuard {...options} requireAuth={false}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

/**
 * 认证状态钩子
 */
export function useAuthStatus() {
  const { data: session, status } = useSession()
  
  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    user: session?.user
  }
}