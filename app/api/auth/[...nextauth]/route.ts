import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" }
            },
            async authorize(credentials) {
                // 统一使用 CAS 登录，不区分环境
                if (credentials?.username) {
                    return {
                        id: credentials.username,
                        name: credentials.username,
                        // email: `${credentials.username}@example.com`
                    }
                }

                return null
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session.user) {
                session.user.id = token.id as string
            }
            return session
        }
    },
    pages: {
        signIn: '/login' // 自定义登录页
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
