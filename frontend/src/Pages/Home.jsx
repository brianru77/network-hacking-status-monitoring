import React, { useEffect, useState } from 'react';
import NetworkUI from '../components/NetworkUI';

function Home() {
  const [networkData, setNetworkData] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);

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

      const enriched = await Promise.all(result.map(async (conn) => {
        const geo = await fetch(`http://ip-api.com/json/${conn.ip}?fields=country,regionName,org,status`).then(res => res.json());

        return {
          ...conn,
          country: geo.status === "success" ? geo.country : '-',
          region: geo.status === "success" ? geo.regionName : '-',
          org: geo.status === "success" ? geo.org : '-',
          risk: getRiskLevel(conn.ip),
        };
      }));

      setConnections(enriched);
    };

    fetchConnections();
    const connInterval = setInterval(fetchConnections, 10000);
    return () => clearInterval(connInterval);
  }, []);

  const handlePidClick = async (pid) => {
    const path = await window.electronAPI.getProcessPath(pid);
    setSelectedPath(path);
    alert(`PID ${pid} 실행 파일 경로: ${path}`);
  };

  const getRiskLevel = (ip) => {
    if (ip.startsWith('192.') || ip.startsWith('10.') || ip.startsWith('172.')) return 'low';
    if (ip.startsWith('127.') || ip === '::1') return 'local';
    if (ip.includes('china') || ip.startsWith('222.') || ip.startsWith('61.')) return 'high';
    return 'unknown';
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-center mb-6">📡 네트워크 상태 대시보드</h1>

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
                <th className="px-2 py-1 border">파일위치</th>
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
                  <td className="border px-2 py-1">{conn.port}</td>
                  <td className="border px-2 py-1">{conn.state}</td>
                  <td className="border px-2 py-1">{conn.pid}</td>
                  <td
                    className="border px-2 py-1 text-blue-500 cursor-pointer hover:underline"
                    onClick={() => handlePidClick(conn.pid)}
                  >
                    경로 보기
                  </td>
                  <td className="border px-2 py-1 font-semibold text-gray-600">
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