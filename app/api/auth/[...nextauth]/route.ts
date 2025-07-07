import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from "next-auth/providers/credentials"
import { validateUsername } from '@/utils/csrf'
import { 
  logger, 
  logSecurity, 
  SecurityEventType 
} from '@/utils/logger'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" }
            },
            async authorize(credentials, req) {
                try {
                    if (!credentials?.username) {
                        logger.warn('[NextAuth] No username provided in credentials')
                        
                        logSecurity({
                            type: SecurityEventType.LOGIN_FAILURE,
                            severity: 'LOW',
                            description: 'Login attempt without username',
                            ip: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string,
                            userAgent: req?.headers?.['user-agent'] as string,
                            additionalData: { reason: 'missing_username' }
                        })
                        
                        return null
                    }
                    
                    // 验证用户名格式
                    const usernameValidation = validateUsername(credentials.username)
                    if (!usernameValidation.valid) {
                        logger.warn('[NextAuth] Username validation failed', {
                            username: credentials.username,
                            reason: usernameValidation.reason
                        })
                        
                        logSecurity({
                            type: SecurityEventType.LOGIN_FAILURE,
                            severity: 'MEDIUM',
                            description: `Login attempt with invalid username format: ${usernameValidation.reason}`,
                            ip: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string,
                            userAgent: req?.headers?.['user-agent'] as string,
                            userId: credentials.username,
                            additionalData: { 
                                reason: 'invalid_username_format',
                                validationError: usernameValidation.reason
                            }
                        })
                        
                        return null
                    }
                    
                    logger.info('[NextAuth] User authenticated successfully', {
                        username: credentials.username
                    })
                    
                    logSecurity({
                        type: SecurityEventType.LOGIN_SUCCESS,
                        severity: 'LOW',
                        description: `User ${credentials.username} successfully authenticated`,
                        ip: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string,
                        userAgent: req?.headers?.['user-agent'] as string,
                        userId: credentials.username,
                        additionalData: { authMethod: 'credentials' }
                    })
                    
                    return {
                        id: credentials.username,
                        name: credentials.username,
                        email: `${credentials.username}@example.com`
                    }
                } catch (error) {
                    logger.error('[NextAuth] Authentication error', {
            errorMessage: error instanceof Error ? error.message : 'Unknown auth error',
            username: credentials?.username
          })
                    
                    logSecurity({
                        type: SecurityEventType.LOGIN_FAILURE,
                        severity: 'HIGH',
                        description: `Authentication system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        ip: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string,
                        userAgent: req?.headers?.['user-agent'] as string,
                        userId: credentials?.username,
                        additionalData: { 
                            reason: 'system_error',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }
                    })
                }

                return null
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
            if (user) {
                token.id = user.id
                token.name = user.name
                token.loginTime = Date.now()
                
                logger.debug('[NextAuth] JWT token created', {
                    username: user.name,
                    provider: account?.provider
                })
            }
            return token
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session.user && token) {
                session.user.id = token.id as string
                session.user.name = token.name as string
                session.user.loginTime = token.loginTime as number
                session.loginTime = token.loginTime
                
                logger.debug('[NextAuth] Session created', {
                    username: session.user.name,
                    loginTime: new Date(token.loginTime as number).toISOString()
                })
            }
            return session
        }
    },
    pages: {
        signIn: '/login' // 自定义登录页
    },
    // 增强安全配置
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24小时
        updateAge: 60 * 60, // 1小时更新一次
    },
    cookies: {
        sessionToken: {
            name: 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        },
        csrfToken: {
            name: 'next-auth.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    },
    // 启用调试模式（开发环境）
    debug: process.env.NODE_ENV === 'development',
    // 安全事件处理
    events: {
        async signIn({ user, account, profile }) {
            logger.info('[NextAuth Event] User signed in', {
                user: user?.name,
                account: account?.provider,
                timestamp: new Date().toISOString()
            })
            
            if (user?.name) {
                logSecurity({
                    type: SecurityEventType.LOGIN_SUCCESS,
                    severity: 'LOW',
                    description: `User ${user.name} signed in via ${account?.provider || 'unknown'}`,
                    userId: user.name,
                    additionalData: {
                        provider: account?.provider,
                        signInMethod: 'nextauth_event'
                    }
                })
            }
        },
        async signOut({ session, token }) {
            logger.info('[NextAuth Event] User signed out', {
                session: session?.user?.name,
                timestamp: new Date().toISOString()
            })
            
            if (session?.user?.name) {
                logSecurity({
                    type: SecurityEventType.LOGOUT,
                    severity: 'LOW',
                    description: `User ${session.user.name} signed out`,
                    userId: session.user.name,
                    additionalData: {
                        signOutMethod: 'nextauth_event'
                    }
                })
            }
        },
        async session({ session, token }) {
            // 记录会话访问（可选）
            if (process.env.NODE_ENV === 'development') {
                logger.debug('[NextAuth Event] Session accessed', {
                    user: session?.user?.name,
                    timestamp: new Date().toISOString()
                })
            }
        }
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
