## 네트워크 모니터링 프로그램
### Electron + React 기반
- Backend (Node.js / Express + Electron)
- Node.js 기반의 Express 서버 (네트워크 정보 처리, netstat -ano)
- Electron으로.exe로 패키징 netstat -ano 실행 → 실시간 IP, 포트, PID 정보 수집

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

### 현재 버전_New Version


---

<details>
<summary>구버전 보기</summary>

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
