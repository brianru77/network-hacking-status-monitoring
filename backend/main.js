const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

// 네트워크 사용량 함수
function getNetworkUsage() {
  return new Promise((resolve, reject) => {
    exec('powershell -Command "Get-Counter -Counter \\"\\Network Interface(*)\\Bytes Received/sec\\", \\"\\Network Interface(*)\\Bytes Sent/sec\\""', (error, stdout, stderr) => {
      if (error) {
        console.error('PowerShell 실행 오류:', error);
        reject(error);
        return;
      }

      console.log('PowerShell 출력 내용:', stdout);
      console.log('stderr:', stderr);

      const lines = stdout.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log('lines:', lines);

      const data = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/\\\\.*?network interface\((.*?)\)\\(bytes (?:received|sent)\/sec)/i);
        if (match) {
          const valueLine = lines[i + 1];
          const value = parseFloat(valueLine);
          if (!isNaN(value)) {
            data.push({
              interface: match[1],
              type: match[2].toLowerCase().includes('received') ? '받은 데이터' : '보낸 데이터',
              value: value
            });
          }
        }
      }

      console.log('최종 파싱 데이터:', data);
      resolve(data);
    });
  });
}
// IPC 핸들러 등록
ipcMain.handle('getNetworkUI', async () => {
  try {
    const data = await getNetworkUsage();
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
});

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
  console.log("Trying to load:", buildPath);
}

app.whenReady().then(() => {
  exec('node server.js', (err) => {
    if (err) console.error('서버 실행 오류:', err);
  });

  createWindow();
});