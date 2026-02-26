'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function SignOutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 브라우저용 Supabase 클라이언트 생성
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);

    try {
      // 1. Supabase 로그아웃 (이걸 해야 미들웨어에서 user가 null이 됩니다)
      await supabase.auth.signOut();

      // 2. Next-Auth 로그아웃 및 페이지 리다이렉트
      // redirect: true는 브라우저를 완전히 새로고침하며 이동시켜 좀비 세션을 방지합니다.
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      });

    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
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