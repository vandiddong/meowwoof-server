# 붐케르크1.10.0 업로드용 파일

실제 호스팅 이전 없이 준비한 완성본입니다. 현재 공개 게임·서버·DNS는 변경하지 않았습니다.

- [사이트 업로드ZIP](https://raw.githubusercontent.com/vandiddong/meowwoof-server/deploy-files/boomkerque-v1.10.0-site.zip) — **호스팅에는 이 파일만** 올리세요. ZIP 최상위에 index.html과assets가 있습니다.
- [안내·정리표 포함 전체 묶음](https://raw.githubusercontent.com/vandiddong/meowwoof-server/deploy-files/boomkerque-v1.10.0-launch-kit.zip) — 사이트ZIP·업로드 안내·광고 준비 체크리스트·테스터 안내·결과 정리표(XLSX/CSV)·검증 결과.
- [SHA256 체크섬](SHA256SUMS.txt) · [검증 요약](verification.json)

게임은 사이트의 루트경로(/)에서 실행하는 정적 배포본입니다. 기존 GitHub Pages의 /meowwoof-server/ 폴더에 그대로 덮어쓰는 용도가 아닙니다. 파일 더블클릭으로 게임을 실행하는 방식이 아니라 정적 호스팅에 업로드하는 방식입니다. 소개·방법·개인정보·이용 안내·문의 페이지를 포함합니다.

전체5라운드·모바일조작·소리·훈련·기록·통계 브라우저 검사와 별도 사이트 페이지 검사8개가 통과했습니다. 로컬 안내HTML 직접열기는 관리 브라우저 제한으로 미실행이며, 파일 구조/링크는 별도 확인했습니다. 실제 기기·실제 호스팅/TLS·엣지 헤더 적용·광고 심사/수익을 검증한 상태는 아닙니다.

현재 게임JS/CSS는 기존1.10.0 빌드와 바이트가 같고, 원본TS/소스맵/DB/키는 포함하지 않았습니다. 실행용JavaScript는 난독화된 빌드로, 완전한 은닉/해킹 차단을 보장하지 않습니다. 광고ID·광고SDK·공식API·로그인·결제는 연결하지 않았습니다. 호스팅과 광고 제품을 선택하면 실제 주소·메타데이터·운영 정책/보유 기간·동의 조건을 갱신하고 심사를 진행해야 합니다.

기존 공개 게임: https://vandiddong.github.io/meowwoof-server/?v=1.10.0
