const { execSync } = require('child_process');
const fs = require('fs');

console.log('Testing SSH connection...');
const command = 'ssh -o BatchMode=yes -o StrictHostKeyChecking=no -p 36509 buzz3272@smart-pay.duckdns.org "ls -la /home/buzz3272/projects/smart-pay-schedule"';

try {
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    fs.writeFileSync('ssh-result.txt', `STDOUT:\n${output}`);
    console.log('Success, wrote to ssh-result.txt');
} catch (error) {
    fs.writeFileSync('ssh-result.txt', `ERROR:\n${error.message}\n\nSTDERR:\n${error.stderr}\n\nSTDOUT:\n${error.stdout}`);
    console.log('Error, wrote to ssh-result.txt');
}
