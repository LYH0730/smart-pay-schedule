'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signup } from './actions'

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const errorParam = searchParams.get('error')

  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // 로그인 핸들러 (엔터 키 또는 로그인 버튼 클릭 시 실행)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // 폼 제출 방지

    if (!email || !password) {
      setLocalError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setLocalError('')

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setLocalError(res.error)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setLocalError('로그인 중 알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 회원가입 핸들러 (버튼 클릭 시 명시적으로 호출)
  const handleSignup = async () => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    await signup(formData); // Server Action 호출
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <h2 className="mt-6 text-4xl font-black tracking-tight text-slate-900">
            <span className="text-orange-500">Smart</span> Pay
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-500">
            소상공인을 위한 간편 급여 정산 솔루션
          </p>
        </div>
        
        {/* onSubmit={handleLogin} 추가: 엔터 키가 로그인을 트리거함 */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full rounded-t-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full rounded-b-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* 로그인 버튼: type="submit" (기본 동작) */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-xl bg-slate-900 py-3 px-4 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all shadow-lg disabled:opacity-50"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
            
            {/* 회원가입 버튼: type="button" + onClick (명시적 호출) */}
            <button
              type="button"
              onClick={handleSignup}
              className="group relative flex w-full justify-center rounded-xl bg-white border border-slate-300 py-3 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all"
            >
              회원가입
            </button>
          </div>
          
          {message && (
            <p className="mt-4 text-center text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg">
              {decodeURIComponent(message)}
            </p>
          )}
          {(errorParam || localError) && (
            <p className="mt-4 text-center text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg">
              {localError || (errorParam ? decodeURIComponent(errorParam) : '')}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  )
}
