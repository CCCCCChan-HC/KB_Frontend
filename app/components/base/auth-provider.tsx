'use client'
import { SessionProvider } from 'next-auth/react'

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode
}) {
    // 明确设置baseUrl，确保客户端使用宿主机IP而不是localhost
    const baseUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL

    return (
        <SessionProvider baseUrl={baseUrl}>
            {children}
        </SessionProvider>
    )
}
