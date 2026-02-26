'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function SignOutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // 1. Supabase 로그아웃 실행
      await supabase.auth.signOut();

      // 2. [강력 조치] 로컬 스토리지 및 세션 스토리지 강제 초기화
      // Supabase 세션 데이터가 여기에 남아 미들웨어를 속이는 경우가 많습니다.
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // 3. Next-Auth 로그아웃 및 리다이렉트
      // redirect: true를 주어 페이지를 아예 새로 고침(Hard Reload)하며 이동합니다.
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      });

    } catch (error) {
      console.error('Logout error:', error);
      // 에러 시 강제 새로고침으로 세션 꼬임 방지
      window.location.href = '/login';
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      disabled={isLoggingOut}
      className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
    </button>
  );
}