# 📅 개발 업데이트 리포트 (2026-02-19)

## 🎯 주요 목표
**Supabase Auth 의존성 제거 및 자체 인증 시스템(Prisma + NextAuth) 구축**
- 외부 서비스(Supabase) 장애나 정책 변경에 영향을 받지 않는 **독립적인 인증 시스템** 확보.
- 리눅스 서버에 설치된 PostgreSQL DB를 직접 제어하여 데이터 주권 확보.
- 사용자 경험(UX) 중심의 기능 개선 (자동 저장, 자연스러운 로그인 흐름).

---

## 🛠️ 상세 작업 내역

### 1. 인증 시스템 (Authentication)
*   **시스템 전환:** Supabase Auth → **NextAuth.js (v4)** + **Prisma** + **Bcryptjs**.
*   **보안 암호화:** `bcryptjs`를 도입하여 비밀번호를 해싱(Hashing) 후 DB에 저장하도록 변경.
*   **로그인 로직:**
    *   `src/lib/auth.ts`: Credentials Provider 설정, 로그인 검증 로직(`authorize`) 구현.
    *   개발 환경(`http://localhost`)에서도 세션이 유지되도록 쿠키 정책(`secure: false`) 조정.
*   **회원가입 로직:**
    *   `src/app/login/actions.ts`: 중복 이메일 체크 및 유저 생성 로직을 Server Action으로 구현.
    *   한글 에러 메시지 깨짐 현상 해결 (`encodeURIComponent` 적용).

### 2. 데이터베이스 & API
*   **Prisma 설정:**
    *   `src/lib/db.ts`: PrismaClient 싱글톤(Singleton) 패턴 적용으로 커넥션 풀 고갈 방지.
*   **API 라우트:**
    *   `src/app/api/auth/[...nextauth]/route.ts`: NextAuth 엔드포인트 생성.
*   **서버 액션:**
    *   `src/app/actions/user.ts`: 유저 정보 조회(`getShopName`) 및 수정(`updateShopName`) 액션 추가.

### 3. 프론트엔드 & UX 개선
*   **로그인 페이지 (`src/app/login/page.tsx`):**
    *   로그인(엔터 키)과 회원가입(버튼 클릭) 동작을 명확히 분리하여 오작동 방지.
    *   `useSearchParams`를 통해 서버 에러 메시지를 UI에 표시.
*   **가게 이름 자동 저장 (`src/components/ShopNameEditor.tsx`):**
    *   `onBlur` 이벤트를 활용하여 입력 종료 시 자동으로 DB에 저장되는 기능 구현 (Notion 스타일).
    *   `DashboardClient`와 연동하여, 새로고침 시에도 최신 가게 이름을 DB에서 즉시 동기화하도록 개선.
*   **로그아웃:**
    *   `src/components/SignOutButton.tsx`: NextAuth `signOut` 함수로 교체하여 세션 쿠키 삭제 기능 정상화.

### 4. 시스템 설정 & 보안
*   **미들웨어 (`src/middleware.ts`):**
    *   파일 위치를 프로젝트 루트에서 `src/` 내부로 이동하여 Next.js가 정상 인식하도록 수정.
    *   `/dashboard` 경로에 대한 비로그인 접근 원천 차단.
*   **레이아웃 (`src/app/layout.tsx`):**
    *   `SessionProvider`(`src/components/Providers.tsx`)를 적용하여 전역 세션 관리 환경 구축.
    *   `DashboardLayout`에서 중복된 인증 검사 로직 제거 (미들웨어로 위임).

---

## 📂 주요 변경 파일 목록

| 구분 | 파일 경로 | 내용 |
| :--- | :--- | :--- |
| **Config** | `src/lib/db.ts` | Prisma Client 싱글톤 설정 |
| **Config** | `src/lib/auth.ts` | NextAuth 설정 (로그인 로직, 쿠키) |
| **API** | `src/app/api/auth/[...nextauth]/route.ts` | 인증 API 엔드포인트 |
| **Action** | `src/app/actions/user.ts` | 유저 정보(가게 이름) 조회/수정 |
| **Action** | `src/app/login/actions.ts` | 회원가입 로직 (Prisma) |
| **Page** | `src/app/login/page.tsx` | 로그인 UI (Client Component) |
| **Comp** | `src/components/ShopNameEditor.tsx` | 가게 이름 자동 저장 컴포넌트 |
| **Comp** | `src/components/DashboardClient.tsx` | DB 데이터 실시간 동기화 적용 |
| **System** | `src/middleware.ts` | 대시보드 접근 보안 설정 |
| **System** | `src/components/SignOutButton.tsx` | 로그아웃 기능 정상화 |

---

## ✅ 확인된 이슈 및 해결
1.  **로그인 후 튕김 현상:** `middleware.ts` 위치 오류 수정 및 쿠키 설정 변경으로 해결.
2.  **데이터 불일치:** "나의 가게" 초기값 문제 -> `useEffect`에서 DB 최신값(`getShopName`)을 가져와 덮어쓰도록 수정.
3.  **한글 에러:** 리다이렉트 URL 인코딩 처리로 해결.

---

**작성일:** 2026년 2월 19일
**작성자:** Gemini CLI Agent
