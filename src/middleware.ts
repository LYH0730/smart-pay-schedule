import { withAuth } from "next-auth/middleware"

export default withAuth({
  // 로그인 페이지 설정 (비로그인 접근 시 여기로 이동)
  pages: {
    signIn: "/login",
  },
})

// 보호할 경로 설정 (대시보드 하위 경로 포함)
export const config = { matcher: ["/dashboard/:path*"] }
