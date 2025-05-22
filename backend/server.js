//CORS 설정 추가 라우저가 백엔드에 접근할 수 있게 허용
const cors = require('cors');

const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');
const app = express();
app.use(cors());
const port = 3001;

// 의심스로운 폴더로 찾아 가기 
app.get('/process-info', (req, res) => {
  const pid = req.query.pid;

  exec(`wmic process where ProcessId=${pid} get ExecutablePath`, (err, stdout) => {
    if (err) return res.status(500).send('프로세스 정보 조회 실패');

    const lines = stdout.split('\n').filter(line => line.trim());
    const path = lines[1]?.trim(); //실행경로
    if (path) res.json({ path });
    else res.status(404).send('경로 없음');
  });
});

// 비동기 IP 위치 조회 함수
async function getGeoInfo(ip) {
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}`);
    return {
      country: data.country,
      region: data.regionName,
      org: data.org
    };
  } catch {
    return {
      country: 'Unknown',
      region: '',
      org: ''
    };
  }
}

app.get('/connections', (req, res) => {
  exec('netstat -ano', async (err, stdout, stderr) => {
    if (err) {
      return res.status(500).send('netstat 실행 오류');
    }

    const lines = stdout.split('\n').slice(4);
    const results = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [proto, local, foreign, state, pid] = parts;
        const ip = foreign.split(':')[0];

        // 0.0.0.0이나 ::: 등은 제외
        if (ip === '0.0.0.0' || ip === '::' || ip === '[::]') continue;

        const geo = await getGeoInfo(ip);

        results.push({
          proto,
          local,
          foreign,
          ip,
          port: foreign.split(':')[1] || '',
          state,
          pid,
          geo
        });
      }
    }

    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`서버 실행됨: http://localhost:${port}`);
});