const { spawn, execSync } = require('child_process');
const path = require('path');

const uiDir = path.join(__dirname, 'APP_UI_草稿');

console.log('=========================================');
console.log('   飲食營養 APP 系統清理並啟動中...     ');
console.log('=========================================');

// 強制清理 Port 3000 和 3001 的指令
const killPorts = () => {
    try {
        console.log('[0/2] 正在清理殘留的連線埠 (3000, 3001)...');
        if (process.platform === 'win32') {
            // Windows 平台清理指令
            const ports = [3000, 3001];
            ports.forEach(port => {
                try {
                    const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
                    const lines = stdout.split('\n');
                    lines.forEach(line => {
                        const match = line.trim().match(/\s+(\d+)$/);
                        if (match) {
                            const pid = match[1];
                            if (pid !== '0') {
                                execSync(`taskkill /F /PID ${pid}`);
                                console.log(`      - 已強制關閉佔用 Port ${port} 的程式 (PID: ${pid})`);
                            }
                        }
                    });
                } catch (e) {
                    // 如果該 Port 沒被佔用，execSync 會報錯，忽略即可
                }
            });
        }
    } catch (err) {
        console.log('      - 埠號清理完成或無需清理');
    }
};

killPorts();

// 1. 啟動後端 API Server
console.log('[1/2] 正在啟動後端資料伺服器 (Port 3001)...');
const backend = spawn('node', ['server.cjs'], { 
    cwd: uiDir, 
    stdio: 'inherit', 
    shell: true 
});

// 2. 啟動前端網頁介面 (Port 3000)
console.log('[2/2] 正在啟動前端網頁介面 (Port 3000)...');
const frontend = spawn('npm', ['run', 'dev'], { 
    cwd: uiDir, 
    stdio: 'inherit', 
    shell: true 
});

// 處理程式關閉
process.on('SIGINT', () => {
    console.log('\n正在關閉系統...');
    backend.kill();
    frontend.kill();
    process.exit();
});
