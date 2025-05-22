# 해킹으로부터 내 컴퓨터를 보호하는
## 네트워크 상태 모니터링 프로그램
## 소개
### Electron + React 기반
- Backend (Node.js / Express + Electron)
Node.js 기반의 Express 서버 (네트워크 정보 처리, netstat -ano)
Electron으로.exe로 패키징
- netstat -ano 실행 → IP, 포트, PID 정보 수집
- IP의 국가/위치 조회
- 이상 포트/접속 여부 대시보드 형태로 시각화

### 빌드 화면
<p align="center">
<img src="https://github.com/user-attachments/assets/52173755-817e-4731-bef0-36577e5460be" width="100%" height="100%">
<img src="https://github.com/user-attachments/assets/89940088-0151-4de8-813a-9eb82b3a4253" width="100%" height="100%">
</p> 

> 연결되어 있는 포트 국가/지역/기관 정보들을 표기

### 빌드 영상 
<p align="center">
<img src="https://github.com/user-attachments/assets/03b18e1a-dd17-49a2-941f-9146f96b120a" width="100%" height="100%">
<img src="https://github.com/user-attachments/assets/d32d0303-a4fa-4990-b06a-5d059d25c9a0" width="100%" height="100%">
</p>  

> 해당 위치에 파일이 없으면 "정보를 가져오는데 실패했습니다", 해당 위치에 파일이 있으면 이동.
---
