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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요.');
        }

        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            throw new Error('등록되지 않은 이메일입니다.');
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            throw new Error('비밀번호가 일치하지 않습니다.');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.shopName,
          };
        } catch (error) {
          console.error('Authorize error:', error);
          throw error; 
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  
  // 수정 포인트: useSecureCookies를 명시하여 프록시 환경임을 NextAuth에 알립니다.
  useSecureCookies: true, 
  
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`, // HTTPS 환경 표준 이름
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },

  debug: true,

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