/**
 * Script kiểm tra cập nhật mới từ kho nguồn gốc (upstream)
 * Chạy bằng lệnh: node scripts/check-upstream.js
 */
const { execSync } = require('child_process');

const gitCmd = '"C:\\Users\\TBC\\AppData\\Local\\GitHubDesktop\\app-3.5.8\\resources\\app\\git\\cmd\\git.exe"';

try {
    console.log('🔄 Đang kiểm tra cập nhật từ upstream (jlcodes99/vscode-antigravity-cockpit)...');
    execSync(`${gitCmd} fetch upstream --quiet`, { stdio: 'inherit' });

    const latestCommit = execSync(`${gitCmd} log -n 5 --oneline upstream/main`, { encoding: 'utf8' }).trim();
    console.log('\n📌 5 commit mới nhất từ kho gốc:');
    console.log(latestCommit);
    console.log('\n💡 Để tích hợp bản cập nhật này vào Antigravity YangDvu mà vẫn giữ 100% tiếng Việt & bảo mật:');
    console.log('👉 Bạn chỉ cần nhắn tin cho AI: "Cập nhật các tính năng mới từ upstream vào Antigravity YangDvu giúp tôi"');
} catch (err) {
    console.error('❌ Lỗi khi kiểm tra upstream:', err.message);
}
