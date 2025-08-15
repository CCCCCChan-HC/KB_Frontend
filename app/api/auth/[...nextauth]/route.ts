import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from "next-auth/providers/credentials"
import { validateUsername } from '@/utils/csrf'
import {
    logger,
    logSecurity,
    SecurityEventType
} from '@/utils/logger'

// CAS ticket验证函数
async function validateCASTicket(ticket: string, clientIP: string, userAgent: string) {
    try {
        // 验证票据格式
        const ticketPattern = /^ST-[A-Za-z0-9\-_]+$/
        if (!ticket || ticket.length < 10 || ticket.length > 256 || !ticketPattern.test(ticket)) {
            logger.warn('[NextAuth] Invalid CAS ticket format', {
                ticketPrefix: ticket?.substring(0, 10) + '...',
                clientIP,
                userAgent
            })
            return null
        }

        // 检查必要的环境变量
        const casServerUrl = process.env.CAS_BASE_URL
        const casServiceUrl = process.env.CAS_SERVICE_URL

        if (!casServerUrl || !casServiceUrl) {
            logger.error('[NextAuth] Missing CAS environment variables', {
                casServerUrl: !!casServerUrl,
                casServiceUrl: !!casServiceUrl
            })
            return null
        }

        logger.info('[NextAuth] Validating CAS ticket', {
            ticketPrefix: ticket.substring(0, 10) + '...',
            clientIP,
            userAgent
        })

        // 验证CAS票据
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

        const response = await fetch(`${casServerUrl}/serviceValidate?ticket=${encodeURIComponent(ticket)}&service=${encodeURIComponent(casServiceUrl)}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'KB-Frontend-NextAuth-CAS/1.0',
                'Accept': 'application/xml, text/xml',
                'Cache-Control': 'no-cache'
            },
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            logger.error('[NextAuth] CAS server error', {
                status: response.status,
                ticketPrefix: ticket.substring(0, 10) + '...'
            })
            return null
        }

        const xmlText = await response.text()

        // 解析XML响应
        const successMatch = xmlText.match(/<cas:authenticationSuccess[^>]*>([\s\S]*?)<\/cas:authenticationSuccess>|<authenticationSuccess[^>]*>([\s\S]*?)<\/authenticationSuccess>/)
        const failureMatch = xmlText.match(/<cas:authenticationFailure[^>]*code="([^"]*)">[\s\S]*?<\/cas:authenticationFailure>|<authenticationFailure[^>]*code="([^"]*)">[\s\S]*?<\/authenticationFailure>/)

        if (successMatch) {
            const successContent = successMatch[1] || successMatch[2]
            const userMatch = successContent.match(/<cas:user>([^<]+)<\/cas:user>|<user>([^<]+)<\/user>/)
            const username = (userMatch?.[1] || userMatch?.[2])?.trim()

            if (!username) {
                logger.error('[NextAuth] No username in CAS response', {
                    ticketPrefix: ticket.substring(0, 10) + '...'
                })
                return null
            }

            // 验证用户名格式
            const usernameValidation = validateUsername(username)
            if (!usernameValidation.valid) {
                logger.warn('[NextAuth] CAS username validation failed', {
                    username,
                    reason: usernameValidation.reason
                })

                logSecurity({
                    type: SecurityEventType.LOGIN_FAILURE,
                    severity: 'MEDIUM',
                    description: `CAS login with invalid username format: ${usernameValidation.reason}`,
                    ip: clientIP,
                    userAgent,
                    userId: username,
                    additionalData: {
                        reason: 'cas_invalid_username_format',
                        validationError: usernameValidation.reason
                    }
                })

                return null
            }

            logger.info('[NextAuth] CAS authentication successful', {
                username,
                clientIP,
                userAgent
            })

            logSecurity({
                type: SecurityEventType.LOGIN_SUCCESS,
                severity: 'LOW',
                description: `User ${username} successfully authenticated via CAS`,
                ip: clientIP,
                userAgent,
                userId: username,
                additionalData: { authMethod: 'cas' }
            })

            return {
                id: username,
                name: username,
                email: `${username}@example.com`
            }

        } else if (failureMatch) {
            const failureCode = failureMatch[1] || failureMatch[2] || 'UNKNOWN'
            logger.warn('[NextAuth] CAS authentication failed', {
                code: failureCode,
                ticketPrefix: ticket.substring(0, 10) + '...'
            })

            logSecurity({
                type: SecurityEventType.LOGIN_FAILURE,
                severity: 'MEDIUM',
                description: `CAS authentication failed: ${failureCode}`,
                ip: clientIP,
                userAgent,
                additionalData: {
                    reason: 'cas_auth_failed',
                    casErrorCode: failureCode
                }
            })

            return null
        } else {
            logger.error('[NextAuth] Invalid CAS response format', {
                xmlLength: xmlText.length,
                ticketPrefix: ticket.substring(0, 10) + '...'
            })
            return null
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.error('[NextAuth] CAS server timeout', {
                ticketPrefix: ticket.substring(0, 10) + '...'
            })
        } else {
            logger.error('[NextAuth] CAS validation error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ticketPrefix: ticket.substring(0, 10) + '...'
            })
        }

        logSecurity({
            type: SecurityEventType.LOGIN_FAILURE,
            severity: 'HIGH',
            description: `CAS validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ip: clientIP,
            userAgent,
            additionalData: {
                reason: 'cas_validation_error',
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        })

        return null
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                ticket: { label: "CAS Ticket", type: "text" },
                state: { label: "State", type: "text" },
                timestamp: { label: "Timestamp", type: "text" }
            },
            async authorize(credentials, req) {
                try {
                    const clientIP = req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string || 'unknown'
                    const userAgent = req?.headers?.['user-agent'] as string || 'unknown'

                    // 检查是否提供了CAS ticket
                    if (credentials?.ticket) {
                        // CAS ticket验证流程
                        return await validateCASTicket(credentials.ticket, clientIP, userAgent)
                    }

                    // 原有的用户名验证流程（保持向后兼容）
                    if (!credentials?.username) {
                        logger.warn('[NextAuth] No username or ticket provided in credentials')

                        logSecurity({
                            type: SecurityEventType.LOGIN_FAILURE,
                            severity: 'LOW',
                            description: 'Login attempt without username or ticket',
                            ip: clientIP,
                            userAgent,
                            additionalData: { reason: 'missing_credentials' }
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
                            ip: clientIP,
                            userAgent,
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
                        ip: clientIP,
                        userAgent,
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
                        username: credentials?.username,
                        hasTicket: !!credentials?.ticket
                    })

                    logSecurity({
                        type: SecurityEventType.LOGIN_FAILURE,
                        severity: 'HIGH',
                        description: `Authentication system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        ip: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string || 'unknown',
                        userAgent: req?.headers?.['user-agent'] as string || 'unknown',
                        userId: credentials?.username,
                        additionalData: {
                            reason: 'system_error',
                            error: error instanceof Error ? error.message : 'Unknown error',
                            hasTicket: !!credentials?.ticket
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
        signIn: '/login', // 自定义登录页
        error: '/login' // 自定义错误页面，重定向到登录页
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
                secure: process.env.NEXTAUTH_URL?.startsWith("https") ?? false
            }
        },
        csrfToken: {
            name: 'next-auth.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NEXTAUTH_URL?.startsWith("https") ?? false
            }
        }
    },
    // 启用调试模式（开发环境）
    debug: process.env.NODE_ENV === 'development',
    useSecureCookies: true,
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
