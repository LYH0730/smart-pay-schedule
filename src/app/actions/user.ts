'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// 가게 이름 업데이트 서버 액션
export async function updateShopName(userId: string, newName: string) {
  try {
    if (!userId || !newName) {
      return { success: false, error: '유효하지 않은 요청입니다.' }
    }

    await db.user.update({
      where: { id: userId },
      data: { shopName: newName },
    })

    // 대시보드 페이지의 데이터를 갱신 (선택 사항)
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Failed to update shop name:', error)
    return { success: false, error: '가게 이름 저장 중 오류가 발생했습니다.' }
  }
}

// 가게 이름 조회 서버 액션 (최신 데이터 동기화용)
export async function getShopName(userId: string) {
  try {
    if (!userId) return { success: false, error: '로그인이 필요합니다.' };

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { shopName: true }
    });
    
    return { success: true, name: user?.shopName || "나의 가게" };
  } catch (error) {
    console.error('Failed to fetch shop name:', error);
    return { success: false, error: "가게 정보를 불러오지 못했습니다." };
  }
}
