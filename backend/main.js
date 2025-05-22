const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  const path = require('path');
  win.loadFile(path.join(__dirname, '../frontend/build/index.html'));
  console.log("Trying to load:", path.join(__dirname, '../frontend/build/index.html'));
}

app.whenReady().then(() => {
  exec('node server.js', (err) => {
    if (err) console.error('서버 실행 오류:', err);
  });

  createWindow();
});