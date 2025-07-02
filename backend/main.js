const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const iconv = require('iconv-lite'); //인코딩 문제 해결용

//네트워크 사용량 정보 가져오기
function getNetworkUsage() {
  return new Promise((resolve, reject) => {
    const cmd = 'powershell -Command "Get-Counter -Counter \\"\\Network Interface(*)\\Bytes Received/sec\\", \\"\\Network Interface(*)\\Bytes Sent/sec\\""';

    exec(cmd, { encoding: 'buffer' }, (error, stdout) => {
      if (error) {
        console.error('PowerShell 실행 오류:', error);
        return reject(error);
      }

      const decoded = iconv.decode(stdout, 'cp949');
      const lines = decoded.split('\n').map(line => line.trim()).filter(line => line);
      const data = [];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const match = line.match(/\\Network Interface\((.+?)\)\\(Bytes (Received|Sent)\/sec)/i);

        if (match) {
          const iface = match[1].trim();
          const type = match[2].toLowerCase().includes('received') ? 'received' : 'sent';
          const valueLine = lines[i + 1];
          const value = parseFloat(valueLine);

          if (!isNaN(value)) {
            data.push({ interface: iface, type, value });
          }
        }
      }

      console.log("✅ 네트워크 데이터:", data);
      resolve(data);
    });
  });
}

//연결 정보 가져오기
function getConnections() {
  return new Promise((resolve, reject) => {
    exec('netstat -ano', (err, stdout) => {
      if (err) return reject(err);

      const lines = stdout.split('\n').slice(4);
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

//PID로 실행 파일 경로 가져오기
function getProcessPath(pid) {
  return new Promise((resolve) => {
    exec(`powershell -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).Path"`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve("경로 확인 실패");
      resolve(stdout.trim());
    });
  });
}

//IP 정보 조회 (ip-api 사용)
async function getIpInfo(ip) {
  const isLocalOrInvalid = (
    ip.startsWith('192.') || ip.startsWith('10.') ||
    ip.startsWith('172.') || ip === '127.0.0.1' ||
    ip === '::1' || ip === '0.0.0.0'
  );

  if (isLocalOrInvalid) {
    return { country: '-', region: '-', org: '-' };
  }

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
    console.error(`❌ IP 정보 조회 실패 (${ip}):`, error.message);
    return { country: '-', region: '-', org: '-' };
  }
}

//IPC 핸들러 등록
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

//Electron 윈도우 생성
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

  win.loadFile(path.join(__dirname, '../frontend/build/index.html'));
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
});