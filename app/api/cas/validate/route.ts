import { NextResponse } from 'next/server'
import CAS from 'node-cas'
import { promisify } from 'util'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const ticket = searchParams.get('ticket')

    if (!ticket) {
        return NextResponse.json({ error: 'Missing ticket parameter' }, { status: 400 })
    }

    try {
        // 实例化CAS
        const cas = new CAS({
            cas_url: process.env.CAS_BASE_URL!,
            service_url: process.env.CAS_SERVICE_URL!
        })

        // 手动验证CAS ticket（因为node-cas库的authenticate方法需要Express的req/res对象）
        const casLoginUrl = `${process.env.CAS_BASE_URL}${cas._validateUri || '/serviceValidate'}`
        const serviceUrl = encodeURIComponent(process.env.CAS_SERVICE_URL!)
        const validateUrl = `${casLoginUrl}?ticket=${ticket}&service=${serviceUrl}`

        try {
            const response = await fetch(validateUrl)
            const body = await response.text()

            // 使用CAS实例的内部验证方法
            const validatePromise = promisify(cas._validate.bind(cas))
            const username = await validatePromise(body)

            // CAS验证成功，重定向到登录页面并传递用户信息
            console.log('CAS validation successful for user:', username)

            // 重定向到登录页面，让前端处理登录
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('cas_user', username || '')
            redirectUrl.searchParams.set('cas_login', 'success')

            return NextResponse.redirect(redirectUrl)
        } catch (validateError) {
            console.error('CAS validation error:', validateError)
            return NextResponse.json({ error: 'CAS server communication failed' }, { status: 500 })
        }
    } catch (error) {
        console.error('CAS validation error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
