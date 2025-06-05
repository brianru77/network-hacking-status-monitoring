## 네트워크 상태 모니터링 프로그램
- Frontend: React (네트워크 상태 시각화 UI)
- Backend: Electron / Node.js
- 통신 방식: Electron IPC (contextBridge + ipcMain/ipcRenderer)
- 실시간 네트워크 수집 방식: PowerShell 명령어 직접 호출
- netstat -ano로 연결된 IP와 포트 그리고 PID 확인
- tasklist, wmic로 실행 중인 프로세스 정보 확인
- Get-Counter 네트워크 송/수신량 확인
- API
> ip-api.com/ipinfo.io 국가, 지역, 기관 식별

---
### 기능

- ip의 국가/위치 조회
- 신뢰할 수 있는 기관인지 확인
- 일반적인 통신 포트를 사용 중인지 확인
- 무응답 상태인지 확인
- 동일한 IP+PID 조합에 비정상 연결있는지 확인
- 의심스러운 열린 포트가 있는지 확인
- 0시부터 6시 새벽 시간에 유지되는 연결이 있는지 확인
> 위 조건에 해당사항 없으면 판단 불가 unknown로 표기.  
> 이상 포트/접속 여부를 대시보드 형태로 시각화.    
> 만약 위험한 접속이 감지될 시 경고 알림.

### 현재_Electron IPC Version
#### 실행 화면
<p align="center">
<img src="https://github.com/user-attachments/assets/4a5094b8-f8c1-401d-a272-e3d73bae62c3" width="100%" height="100%">
  
  > <img src="https://github.com/user-attachments/assets/2dde293e-260f-4fc5-87d4-1e5b8f71e106" width="100%" height="100%">
  - 들어오는 데이터와 나가는 데이터 시각적 확인 가능
  > <img src="https://github.com/user-attachments/assets/8665c639-112b-4737-892f-b5654fb24c40" width="100%" height="100%">
  - 실행 화면 캡쳐본
</p>

#### 위험한 연결 감지 시 경고 알림
<p align="center">
<img src="https://github.com/user-attachments/assets/500a68fb-f863-4078-9af0-92e81bb60d90" width="100%" height="100%">
<img src="https://github.com/user-attachments/assets/51f7bcee-68c0-4acd-a543-d400e894654e" width="100%" height="100%">
</p> 

---

<details>
<summary>구 Express Version 보기</summary>
  
### Electron + React 기반
- Backend (Node.js / Express + Electron)
- Node.js 기반의 Express 서버 (네트워크 정보 처리, netstat -ano)
- Electron으로.exe로 패키징 netstat -ano 실행 → 실시간 IP, 포트, PID 정보 수집

#### 실행 화면
<p align="center">
<img src="https://github.com/user-attachments/assets/e78c84da-eaf2-44d3-8b60-d6c061373896" width="40%" height="100%">
<img src="https://github.com/user-attachments/assets/6f12c92b-3613-440d-8e54-358c9cb4325d" width="40%" height="100%">
</p> 
<p align="center">
<img src="https://github.com/user-attachments/assets/688d70bb-a485-4a6c-9d19-9a0890dae189" width="100%" height="100%">
<img src="https://github.com/user-attachments/assets/bbff33ce-2624-44ce-844a-c5385f21a14a" width="100%" height="100%">

#### 의심되는 파일 위치 열기 
<img src="https://github.com/user-attachments/assets/89940088-0151-4de8-813a-9eb82b3a4253" width="100%" height="100%">
<img src="https://github.com/user-attachments/assets/d32d0303-a4fa-4990-b06a-5d059d25c9a0" width="100%" height="100%">
</p>  

> 해당 위치에 파일이 없으면 "정보를 가져오는데 실패했습니다", 해당 위치에 파일이 있으면 이동.
</details>  

---
