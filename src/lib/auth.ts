import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import * as bcrypt from "bcryptjs"; 

export const authOptions: NextAuthOptions = {
  // 로그인 시 사용자 입력을 받아 인증하는 로직
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('[DEBUG] Authorize started for:', credentials?.email);

        // 1. 입력값 검증
        if (!credentials?.email || !credentials?.password) {
          console.log('[DEBUG] Missing credentials');
          throw new Error('이메일과 비밀번호를 입력해주세요.');
        }

        try {
          // 2. DB에서 유저 찾기
          console.log('[DEBUG] Finding user in DB...');
          const user = await db.user.findUnique({
            where: { email: credentials.email }
          });
          console.log('[DEBUG] User found:', user ? 'YES' : 'NO');

          // 3. 유저 없음
          if (!user) {
            console.log('[DEBUG] User not found error thrown');
            throw new Error('등록되지 않은 이메일입니다.');
          }

          // 4. 비밀번호 검증
          console.log('[DEBUG] Comparing password...');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log('[DEBUG] Password match result:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('[DEBUG] Password mismatch error thrown');
            throw new Error('비밀번호가 일치하지 않습니다.');
          }

          // 5. 성공 시 유저 객체 반환
          console.log('[DEBUG] Authorize success! Returning user info.');
          return {
            id: user.id,
            email: user.email,
            name: user.shopName,
          };
        } catch (error) {
          console.error('[DEBUG] Authorize error:', error);
          throw error; // 에러를 다시 던져서 NextAuth가 알게 함
        }
      }
    })
  ],
  // 세션 설정 (JWT 방식 사용)
  session: {
    strategy: "jwt",
  },
  // 개발 환경(http)에서도 쿠키 저장 가능하도록 설정
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  // 🌟 디버깅 활성화
  debug: true,

  // 커스텀 로그인 페이지 경로 지정 (기본 UI 대신 사용)
  pages: {
    signIn: "/login",
  },
  // 콜백 함수: 세션에 id 등 추가 정보 포함시키기
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
        session.user.email = token.email;
        (session.user as any).id = token.id as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET, 
};
