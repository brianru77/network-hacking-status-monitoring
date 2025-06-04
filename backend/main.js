const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios'); // IP 정보용

// 네트워크 사용량 파싱
function getNetworkUsage() {
  return new Promise((resolve, reject) => {
    exec('powershell -Command "Get-Counter -Counter \\"\\Network Interface(*)\\Bytes Received/sec\\", \\"\\Network Interface(*)\\Bytes Sent/sec\\""', (error, stdout) => {
      if (error) return reject(error);

      const lines = stdout.split('\n').map(line => line.trim()).filter(line => line);
      const data = [];

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/\\\\.*?network interface\((.*?)\)\\(bytes (?:received|sent)\/sec)/i);
        if (match) {
          const value = parseFloat(lines[i + 1]);
          if (!isNaN(value)) {
            data.push({
              interface: match[1],
              type: match[2].toLowerCase().includes('received') ? '받은 데이터' : '보낸 데이터',
              value
            });
          }
        }
      }

      resolve(data);
    });
  });
}

// netstat 기반 연결 정보
function getConnections() {
  return new Promise((resolve, reject) => {
    exec('netstat -ano', (err, stdout) => {
      if (err) return reject(err);

      const lines = stdout.split('\n').slice(4); // 헤더 제외
      const results = [];

      for (let line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const [protocol, local, remote, state, pid] = parts;
          const [ip, port] = remote.includes(':') ? remote.split(':') : [remote, ''];

          if (protocol.toLowerCase().startsWith('tcp')) {
            results.push({ protocol, ip, port, state, pid });
          }
        }
      }

      resolve(results);
    });
  });
}

// 🔍 PID -> 실행 파일 경로
function getProcessPath(pid) {
  return new Promise((resolve) => {
    exec(`powershell -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).Path"`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve("경로 확인 실패");
      resolve(stdout.trim());
    });
  });
}

// IP 정보 가져오기 (ip-api.com)
async function getIpInfo(ip) {
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,org`);
    if (data.status === 'success') {
      return {
        country: data.country || '-',
        region: data.regionName || '-',
        org: data.org || '-',
      };
    }
    return { country: '-', region: '-', org: '-' };
  } catch (error) {
    console.error('IP 정보 조회 오류:', error.message);
    return { country: '-', region: '-', org: '-' };
  }
}

//
// IPC 핸들러
//
ipcMain.handle('getNetworkUI', async () => {
  try {
    return await getNetworkUsage();
  } catch (err) {
    console.error('네트워크 사용량 오류:', err);
    return null;
  }
});

ipcMain.handle('getConnections', async () => {
  try {
    return await getConnections();
  } catch (err) {
    console.error('연결 정보 오류:', err);
    return [];
  }
});

ipcMain.handle('getProcessPath', async (_event, pid) => {
  try {
    return await getProcessPath(pid);
  } catch (err) {
    console.error('경로 조회 오류:', err);
    return '경로 확인 실패';
  }
});

ipcMain.handle('getIpInfo', async (_event, ip) => {
  return await getIpInfo(ip);
});

//
// 윈도우 생성
//
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  const buildPath = path.resolve(__dirname, '../frontend/build/index.html');
  win.loadFile(buildPath);
}

// 앱 시작
app.whenReady().then(() => {
  createWindow();
});