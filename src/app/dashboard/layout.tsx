import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🛡️ [Server Side Auth Guard]
  // 대시보드 레이아웃은 Server Component이므로 여기서 안전하게 세션을 검사합니다.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <>
      {children}
    </>
  );
}