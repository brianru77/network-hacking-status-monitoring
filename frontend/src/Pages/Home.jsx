import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';  // PieChart용
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, Legend as BarLegend } from 'recharts';  // BarChart용
import { LineChart, Line, XAxis as LineXAxis, YAxis as LineYAxis, CartesianGrid as LineGrid, Tooltip as LineTooltip } from 'recharts';  // LineChart용
import NetworkUI from '../components/NetworkUI';

Modal.setAppElement('#root');  // 모달에 대한 설정

const Home = () => {
  const [networkData, setNetworkData] = useState([]);
  const [connections, setConnections] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [observedConnections, setObservedConnections] = useState([]);  // 관찰 대상 프로세스를 상태로 저장
  const [alertLogs, setAlertLogs] = useState([]);
  const suspiciousChecked = useRef(new Set());
  const [suspiciousPaths, setSuspiciousPaths] = useState({});
  const [showRiskProcess, setShowRiskProcess] = useState(false);  // 위험 프로세스 리스트 보여주기 위한 상태
  const [debugMode, setDebugMode] = useState(false);  // 디버깅 모드 상태

  const [stats, setStats] = useState({
    riskDistribution: [],
    countryConnections: [],
    lateNightConnections: [],
    observedCount: 0,
    alertLogs: []
  });

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

  // 모달 열기
  const openModal = () => setModalIsOpen(true);

  // 모달 닫기
  const closeModal = () => setModalIsOpen(false);

  // 관찰 대상 점검하기
  const handleCheckObserved = () => {
    const riskyConnections = connections.filter(conn => {
      const path = conn.path ? conn.path.toLowerCase() : '';
      return !['svchost.exe', 'services.exe', 'lsass.exe'].some(exe => path.includes(exe));
    });
    setObservedConnections(riskyConnections);
    setShowRiskProcess(true);  // 위험 프로세스 리스트를 표시
  };

  // 디버깅 기능 (로그 출력)
  const logDebugInfo = (message) => {
    if (debugMode) {
      console.log(message);
    }
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
            console.warn(` IP-API 요청 실패: ${conn.ip}`, err.message);
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
        let riskLevel = '관찰 대상';
        let riskColor = 'black'; // 기본 색깔: 검정

        if (conn.ip === '' || conn.ip === '0.0.0.0') {
          riskLevel = '관찰 대상';
          riskColor = 'black';
          score = 0;
        } else if (commonPorts.includes(parseInt(conn.port))) {
          riskLevel = '정상 포트';
          riskColor = 'green'; // 초록색
          score = 1;
        } else if (geo.org && ['Google', 'Microsoft', 'Amazon', 'Cloudflare'].some(t => geo.org.includes(t))) {
          riskLevel = '안전한 서버';
          riskColor = 'green'; // 초록색
          score = 1;
        } else if (isUnresponsive) {
          riskLevel = '응답없음/스캔공격 또는 패킷 필터링 의심';
          riskColor = '#FFEB3B'; // 노란색
          score = 2;
        } else if (isLateNight) {
          riskLevel = '자동화 공격/스캔/침입시도/DDoS 공격 의심';
          riskColor = '#FFEB3B'; // 노란색
          score = 2;
        } else if (isDuplicateConn) {
          riskLevel = '취약점 스캐닝 위한 악성 프로세스 연결시도 의심';
          riskColor = 'orange'; // 주황색
          score = 3;
        } else if (weirdPort) {
          riskLevel = '일반적으로 사용되지 않는 포트/비정상적 연결';
          riskColor = 'orange'; // 주황색
          score = 3;
        } else if (isSuspicious) {
          riskLevel = '비정상 파일 경로/의심되는 확장자로 악성코드 의심';
          riskColor = 'red'; // 빨간색
          score = 4;
        } else if (['china', 'russia', 'north korea'].some(bad => (geo.country || '').toLowerCase().includes(bad))) {
          riskLevel = '사이버 공격/스파이 활동/정보 유출 시도';
          riskColor = 'red'; // 빨간색
          score = 4;
        } else if (isListeningWeird) {
          riskLevel = '시스템을 감염시키려는 백도어 의심';
          riskColor = 'darkred'; // 검붉은색
          score = 5;
        }

        return {
          ...conn,
          country: geo.country ?? '-',
          region: geo.regionName ?? '-',
          org: geo.org ?? '-',
          risk: riskLevel,
          riskScore: score,
          riskColor: riskColor,
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
  }, [debugMode]);

  const handlePidClick = async (pid) => {
    const path = await window.electronAPI.getProcessPath(pid);
    alert(`PID ${pid} 실행 파일 경로: ${path}`);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-center mb-6">네트워크 모니터링 프로그램</h1>
      <NetworkUI data={networkData} />
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">연결된 IP 목록</h2>

        <div className="flex mb-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
          >
            새로고침
          </button>
          <button
            onClick={openModal}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            리스크 통계 보기
          </button>
        </div>

        <Modal isOpen={modalIsOpen} onRequestClose={closeModal}>
          <h2>리스크 통계</h2>
          <div className="border p-4 rounded-lg shadow-lg bg-white">
            <h3 className="font-semibold text-lg">위험 분포</h3>
            <ul>
              {stats.riskDistribution.map((item, idx) => (
                <li key={idx}>
                  {item.riskLevel}: {item.count}
                </li>
              ))}
            </ul>
          </div>

          <div className="border p-4 rounded-lg shadow-lg bg-white mt-4">
            <h3 className="font-semibold text-lg">국가별 연결 수</h3>
            <ul>
              {stats.countryConnections.map((item, idx) => (
                <li key={idx}>
                  {item.country}: {item.count}
                </li>
              ))}
            </ul>
          </div>

          {/* 여기다가 다른 항목 추가할거 추가하자 */}
        </Modal>

        <button onClick={handleCheckObserved} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mb-4">
          관찰대상 점검하기
        </button>

        {/* 위험 프로세스 리스트가 보여지도록 */}
        {showRiskProcess && (
          <div>
            <h3>위험 프로세스 리스트</h3>
            <ul>
              {observedConnections.map((conn, idx) => (
                <li key={idx}>
                  PID: {conn.pid}, 경로: {conn.path}
                </li>
              ))}
            </ul>
          </div>
        )}

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
                  <td className="border px-2 py-1" style={{ color: conn.weirdPort ? 'red' : 'inherit' }}>
                    {conn.port} {conn.weirdPort && '⚠️'}
                  </td>
                  <td className="border px-2 py-1">{conn.state}</td>
                  <td className="border px-2 py-1">{conn.pid}</td>
                  <td className="border px-2 py-1 text-blue-500 cursor-pointer hover:underline" onClick={() => handlePidClick(conn.pid)}>
                    경로 보기
                  </td>
                  <td
                    className="border px-2 py-1 font-semibold"
                    style={{
                      color: conn.riskColor
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
};

export default Home;