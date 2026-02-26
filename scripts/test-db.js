import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('🔄 데이터베이스 연결 테스트 중...');

        // DB에서 사용자 목록 1명 조회 (존재 여부만 확인)
        const users = await prisma.user.findMany({
            take: 1
        });

        console.log('✅ 데이터베이스 연결 성공!');
        console.log('테스트 데이터:', users.length > 0 ? `유저 1명 확인 (ID: ${users[0].id})` : '유저 데이터 없음 (하지만 빈 테이블 조회 성공)');
        console.log('\n이제 정상적으로 DB를 사용할 수 있습니다.');
    } catch (error) {
        console.error('❌ 데이터베이스 연결 실패!');
        console.error(error);
    } finally {
        await prisma.$disconnect()
    }
}

main()
