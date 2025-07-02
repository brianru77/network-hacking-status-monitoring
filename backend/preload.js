const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  //네트워크 사용량 가져오기
  getNetworkUsage: () => ipcRenderer.invoke('getNetworkUI'),

  //연결된 IP 목록 가져오기 (netstat -ano)
  getConnections: () => ipcRenderer.invoke('getConnections'),

  //PID로부터 실행 경로 가져오기
  getProcessPath: (pid) => ipcRenderer.invoke('getProcessPath', pid),

  //IP 주소로 국가/지역/기관 정보 가져오기
  getIpInfo: (ip) => ipcRenderer.invoke('getIpInfo', ip),
});