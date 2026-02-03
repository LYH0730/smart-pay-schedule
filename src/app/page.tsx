import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function IndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 로그인 상태라면 대시보드로, 아니면 로그인 페이지로 리다이렉트
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }

  // 이 컴포넌트는 리다이렉트를 수행하므로 실제 UI를 렌더링하지 않습니다.
  return null;
}