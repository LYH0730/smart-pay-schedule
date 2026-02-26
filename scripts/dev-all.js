import { spawn } from 'child_process';

console.log('🔗 SSH 터널링을 시작합니다...');

const ssh = spawn('ssh', [
    '-p', '36509',
    '-N',
    '-L', '54322:127.0.0.1:54322',
    'buzz3272@smart-pay.duckdns.org'
], {
    stdio: 'inherit' // 사용자가 비밀번호를 입력할 수 있도록 터미널 IO 연결
});

// SSH가 켜지고 사용자가 비밀번호를 입력할 충분한 시간(8초)을 기다린 후 Next.js 서버를 올립니다.
setTimeout(() => {
    console.log('\n\n✅ 터널링이 연결되었거나 백그라운드로 전환되었습니다.');
    console.log('🚀 Next.js 개발 서버를 시작합니다...\n');
    const next = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
    });

    // 프로세스가 종료될 때 SSH 터널도 같이 꺼주기 위함
    next.on('close', (code) => {
        ssh.kill();
        process.exit(code);
    });
}, 8000);

// 사용자가 Ctrl+C를 누르면 둘 다 종료
process.on('SIGINT', () => {
    ssh.kill();
    process.exit();
});
