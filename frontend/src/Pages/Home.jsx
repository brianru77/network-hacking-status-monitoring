import React, { useEffect, useState, useRef } from 'react';
import NetworkUI from '../components/NetworkUI';

function Home() {
  const [networkData, setNetworkData] = useState([]);
  const [connections, setConnections] = useState([]);
  const suspiciousChecked = useRef(new Set());
  const [suspiciousPaths, setSuspiciousPaths] = useState({});

  const commonPorts = [80, 443, 22, 8080, 8443];
  const knownPorts = [20, 21, 22, 23, 25, 53, 80, 110, 143, 135, 139, 443, 445, 1433, 3306, 3389, 8080];

  const isWeirdPort = (port) => {
    const num = parseInt(port);
    return !knownPorts.includes(num);
  };

  const isSuspiciousPath = (path) => {
    if (!path || path.trim() === '') return true;
    const lower = path.toLowerCase();
    if (
      lower.includes('appdata') ||
      lower.includes('temp') ||
      lower.endsWith('.scr') ||
      lower.endsWith('.vbs') ||
      (lower.includes('users') && !lower.includes('program files'))
    ) return true;
    if (
      lower.includes('system32') ||
      lower.includes('program files') ||
      lower.includes('windows\\system32')
    ) return false;
    return false;
  };

  useEffect(() => {
    const fetchNetworkData = async () => {
      const rawData = await window.electronAPI.getNetworkUsage();
      const formatted = [];

      rawData.forEach((item) => {
        const existing = formatted.find(f => f.name === item.interface);
        if (existing) {
          if (item.type.toLowerCase().includes("received")) existing.received = item.value;
          else if (item.type.toLowerCase().includes("sent")) existing.sent = item.value;
        } else {
          formatted.push({
            name: item.interface,
            received: item.type.toLowerCase().includes("received") ? item.value : 0,
            sent: item.type.toLowerCase().includes("sent") ? item.value : 0,
          });
        }
      });

      setNetworkData(formatted);
    };

    fetchNetworkData();
    const usageInterval = setInterval(fetchNetworkData, 1000);
    return () => clearInterval(usageInterval);
  }, []);

  useEffect(() => {
    const fetchConnections = async () => {
      const result = await window.electronAPI.getConnections();
      const nowHour = new Date().getHours();
      const ipPidMap = {};
      result.forEach(conn => {
        const key = `${conn.ip}_${conn.pid}`;
        ipPidMap[key] = (ipPidMap[key] || 0) + 1;
      });

      const seenAlerts = new Set();
      const updatedPaths = {};

      const enriched = await Promise.all(result.map(async (conn) => {
        const isLocalOrInvalid = (
          conn.ip.startsWith('192.') || conn.ip.startsWith('10.') || conn.ip.startsWith('172.') ||
          conn.ip.startsWith('127.') || conn.ip === '::1' || conn.ip === '0.0.0.0' || conn.ip === ''
        );

        let geo = { status: 'fail', country: '-', regionName: '-', org: '-' };
        if (!isLocalOrInvalid) {
          try {
            const res = await fetch(`http://ip-api.com/json/${conn.ip}?fields=country,regionName,org,status`);
            const data = await res.json();
            if (data.status === 'success') geo = data;
          } catch (err) {
            console.warn(`❌ IP-API 요청 실패: ${conn.ip}`, err.message);
          }
        }

        const weirdPort = isWeirdPort(conn.port);
        const isUnresponsive = conn.state !== 'ESTABLISHED';
        const isDuplicateConn = ipPidMap[`${conn.ip}_${conn.pid}`] >= 2;
        const isListeningWeird = conn.state === 'LISTENING' && weirdPort;
        const isLateNight = nowHour >= 0 && nowHour <= 6;

        let path = suspiciousPaths[conn.pid];
        if (!suspiciousChecked.current.has(conn.pid)) {
          path = await window.electronAPI.getProcessPath(conn.pid);
          suspiciousChecked.current.add(conn.pid);
          updatedPaths[conn.pid] = path;
        }

        const lowerPath = path?.toLowerCase() || '';
        const isSystemProcess = ['svchost.exe', 'services.exe', 'lsass.exe'].some(p => lowerPath.endsWith(p));
        const isSuspicious = !isSystemProcess && isSuspiciousPath(path);

        let score = 0;
        if (commonPorts.includes(parseInt(conn.port))) score -= 1;
        if (geo.org && ['Google', 'Microsoft', 'Amazon', 'Cloudflare'].some(t => geo.org.includes(t))) score -= 1;
        if (weirdPort) score += 2;
        if (isUnresponsive) score += 1;
        if (isDuplicateConn) score += 1;
        if (isListeningWeird) score += 2;
        if (isLateNight) score += 1;
        if (isSuspicious) score += 2;
        if (['china', 'russia', 'north korea'].some(bad => (geo.country || '').toLowerCase().includes(bad))) score += 2;

        // 시스템 프로세스일 경우 점수 초기화하여 안전하게 처리
        if (isSystemProcess) {
          score = -2;  // 시스템 프로세스는 매우 안전하게 처리
        }

        let riskLevel = '관찰 대상';
        if (score <= -1) riskLevel = commonPorts.includes(parseInt(conn.port)) ? '정상 포트' : '안전한 서버';
        else if (score >= 6) riskLevel = '위험한 연결 해킹 강력 의심';
        else if (score >= 3) riskLevel = '비정상 연결 스캔 봇 가능성';
        else if (score >= 1) riskLevel = '무응답 열린포트or스캔 실패 의심';

        const alertKey = `${conn.ip}_${conn.pid}`;
        if (riskLevel === '위험한 연결 해킹 강력 의심' && !seenAlerts.has(alertKey)) {
          new Notification("🚨 위험 연결 감지", {
            body: `${conn.ip} (${geo.org || '알 수 없음'}) 위험 연결 시도`,
          });
          seenAlerts.add(alertKey);
        }

        return {
          ...conn,
          country: geo.country ?? '-',
          region: geo.regionName ?? '-',
          org: geo.org ?? '-',
          weirdPort,
          risk: riskLevel,
          riskScore: score,
          isUnresponsive,
          isDuplicateConn,
          isListeningWeird,
          isLateNight,
          path,
        };
      }));

      setSuspiciousPaths(prev => ({ ...prev, ...updatedPaths }));
      setConnections(enriched);
    };

    fetchConnections();
    const connInterval = setInterval(fetchConnections, 60000); // 1분마다 갱신
    return () => clearInterval(connInterval);
  }, []);

  const handlePidClick = async (pid) => {
    const path = await window.electronAPI.getProcessPath(pid);
    alert(`PID ${pid} 실행 파일 경로: ${path}`);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-center mb-6">📡 네트워크 모니터링 프로그램3</h1>
      <NetworkUI data={networkData} />
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">🔌 연결된 IP 목록</h2>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        >
          새로고침
        </button>
        <div className="overflow-x-auto">
          <table className="table-auto w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 border">프로토콜</th>
                <th className="px-2 py-1 border">IP</th>
                <th className="px-2 py-1 border">국가</th>
                <th className="px-2 py-1 border">지역</th>
                <th className="px-2 py-1 border">기관</th>
                <th className="px-2 py-1 border">포트</th>
                <th className="px-2 py-1 border">상태</th>
                <th className="px-2 py-1 border">PID</th>
                <th className="px-2 py-1 border">파일위치(클릭)</th>
                <th className="px-2 py-1 border">위험도</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((conn, idx) => (
                <tr key={idx} className="text-center">
                  <td className="border px-2 py-1">{conn.protocol}</td>
                  <td className="border px-2 py-1">{conn.ip}</td>
                  <td className="border px-2 py-1">{conn.country}</td>
                  <td className="border px-2 py-1">{conn.region}</td>
                  <td className="border px-2 py-1">{conn.org}</td>
                  <td className="border px-2 py-1" style={{ color: conn.weirdPort ? 'red' : 'inherit' }}>{conn.port} {conn.weirdPort && '⚠️'}</td>
                  <td className="border px-2 py-1">{conn.state}</td>
                  <td className="border px-2 py-1">{conn.pid}</td>
                  <td
                    className="border px-2 py-1 text-blue-500 cursor-pointer hover:underline"
                    onClick={() => handlePidClick(conn.pid)}
                  >
                    경로 보기
                  </td>
                  <td
                    className="border px-2 py-1 font-semibold"
                    style={{
                      color:
                        conn.risk === '위험한 연결 해킹 강력 의심' ? 'red' :
                        conn.risk === '비정상 연결 스캔 봇 가능성' ? 'orange' :
                        conn.risk === '무응답 열린포트or스캔 실패 의심' ? 'goldenrod' :
                        'green'
                    }}
                  >
                    {conn.risk}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Home;