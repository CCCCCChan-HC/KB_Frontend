import { getLocaleOnServer } from '@/i18n/server'
import AuthProvider from '@/app/components/base/auth-provider'
import { PublicEnvScript } from 'next-runtime-env'

import './styles/globals.css'
import './styles/markdown.scss'

const LocaleLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = getLocaleOnServer()
  return (
    <html lang={locale ?? 'en'} className="h-full">
      <head>
        <PublicEnvScript />
      </head>
      <body className="h-full">
        <AuthProvider>
          <div className="overflow-x-auto">
            <div className="w-screen h-screen min-w-[300px]">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

export default LocaleLayout
