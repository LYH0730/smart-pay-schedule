'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

export default function SignOutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
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