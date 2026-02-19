'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'   // bcrypt -> bcryptjs
import { revalidatePath } from 'next/cache'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    // 1. 유저 찾기
    const user = await db.user.findUnique({ where: { email } })

    if (!user) {
      redirect(`/login?error=${encodeURIComponent('사용자를 찾을 수 없습니다.')}`)
    }

    // 2. 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      redirect(`/login?error=${encodeURIComponent('비밀번호가 일치하지 않습니다.')}`)
    }

    // 3. 로그인 성공 처리
    revalidatePath('/', 'layout')
    redirect('/dashboard')

  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') {
        throw error;
    }
    redirect(`/login?error=${encodeURIComponent('로그인 중 서버 오류가 발생했습니다.')}`)
  }
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    // 1. 이미 가입된 이메일인지 확인
    const existingUser = await db.user.findUnique({ where: { email } })

    if (existingUser) {
      redirect(`/login?error=${encodeURIComponent('이미 가입된 이메일입니다.')}`)
    }

    // 2. 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10)

    // 3. DB 저장
    await db.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

  } catch (e: any) {
    if (e.message === 'NEXT_REDIRECT') {
        throw e;
    }
    redirect(`/login?error=${encodeURIComponent('회원가입 중 오류가 발생했습니다.')}`)
  }

  revalidatePath('/', 'layout')
  redirect(`/login?message=${encodeURIComponent('회원가입이 완료되었습니다. 로그인을 해주세요.')}`)
}

export async function signOut() {
  revalidatePath('/', 'layout')
  redirect('/login')
}
