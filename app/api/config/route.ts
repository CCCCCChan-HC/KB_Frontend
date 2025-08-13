import { NextResponse } from 'next/server'

export async function GET() {
  // 返回运行时配置，供客户端使用
  const config = {
    APP_ID: process.env.NEXT_PUBLIC_APP_ID || '',
    API_KEY: process.env.NEXT_PUBLIC_APP_KEY || '',
    API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    CAS_BASE_URL: process.env.NEXT_PUBLIC_CAS_BASE_URL || '',
    CAS_SERVICE_URL: process.env.NEXT_PUBLIC_CAS_SERVICE_URL || '',
  }

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}