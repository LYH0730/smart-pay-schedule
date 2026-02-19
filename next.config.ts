import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 도커나 프록시(Nginx) 환경에서 최적화된 실행 모드
  output: 'standalone',
  
  // 보안 및 성능 관련 설정 (필요시 추가)
  reactStrictMode: true,
};

export default nextConfig;
