import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import * as bcrypt from "bcryptjs"; 

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. 입력값 검증
        if (!credentials?.email || !credentials?.password) {
          console.log('[DEBUG] Missing credentials');
          throw new Error('이메일과 비밀번호를 입력해주세요.');
        }

        try {
          // 2. DB에서 유저 찾기
          const user = await db.user.findUnique({
            where: { email: credentials.email }
          });
          console.log('[DEBUG] User found:', user ? 'YES' : 'NO');

          if (!user) {
            console.log('[DEBUG] User not found error thrown');
            throw new Error('등록되지 않은 이메일입니다.');
          }

          // 4. 비밀번호 검증
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log('[DEBUG] Password match result:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('[DEBUG] Password mismatch error thrown');
            throw new Error('비밀번호가 일치하지 않습니다.');
          }

          // 5. 성공 시 유저 객체 반환
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
  session: {
    strategy: "jwt",
  },
  
  // 수정: 운영 환경(HTTPS)에서만 true, 로컬은 false
  useSecureCookies: process.env.NODE_ENV === "production", 
  
  cookies: {
    sessionToken: {
      // 운영 환경에서는 __Secure- 를 붙이고, 로컬에서는 기본 이름을 사용
      name: process.env.NODE_ENV === "production" ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production", // 운영 환경에서만 secure 적용
      },
    },
  },
  // 디버깅 비활성화
  debug: false,

  pages: {
    signIn: "/login",
  },

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
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};