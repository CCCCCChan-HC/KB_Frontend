'use client'
import { SessionProvider } from 'next-auth/react'
import { env } from 'next-runtime-env'

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode
}) {
    // 明确设置baseUrl，确保客户端使用宿主机IP而不是localhost
    // 使用 next-runtime-env 支持运行时环境变量更新
    const baseUrl = env('NEXT_PUBLIC_NEXTAUTH_URL')

    return (
        <SessionProvider baseUrl={baseUrl}>
            {children}
        </SessionProvider>
    )
}
