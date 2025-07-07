'use client'

interface LoginFormProps {
    onCasLogin: () => void
    csrfToken?: string | null
    isProcessing?: boolean
    error?: string | null
    onClearError?: () => void
}

export default function LoginForm({ 
    onCasLogin, 
    csrfToken, 
    isProcessing = false, 
    error,
    onClearError 
}: LoginFormProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">登录</h1>

                {/* 错误信息显示 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        <div className="flex justify-between items-start">
                            <span className="text-sm">{error}</span>
                            {onClearError && (
                                <button
                                    onClick={onClearError}
                                    className="ml-2 text-red-500 hover:text-red-700 font-bold"
                                    aria-label="关闭错误信息"
                                >
                                    ×
                                </button>
                            )}
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
                    onClick={onCasLogin}
                    disabled={isProcessing || !csrfToken}
                    className={`w-full py-3 px-4 rounded-md transition-all duration-200 font-medium ${
                        isProcessing || !csrfToken
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
