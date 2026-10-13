# BOMB RUN

PC와 모바일 브라우저에서 플레이하는 3D 지도 기억력·비행·폭격 정확도 게임입니다. 기존 `../server.js` 게임 서버와 독립적으로 동작합니다. 로그인, API 키, 외부 그래픽 에셋이 필요하지 않습니다. 대상은 무인 훈련 상자입니다.

## 공개 게임

https://vandiddong.github.io/meowwoof-server/

설치나 로그인 없이 접속할 수 있습니다. 친구방과 일일 도전은 명확히 표시된 로컬 모드이며 온라인 백엔드는 아직 연결하지 않았습니다.

## 실행

Node.js 24 권장(최소 22.12), npm을 사용합니다.

```sh
cd /workspace/meowwoof-server/bomb-run
npm ci
npm run dev
```

개발 서버 기본 포트는 5173입니다. 실행 중인 서버의 주소로 접속합니다. 모바일 기기로 확인할 때는 같은 네트워크에서 개발 머신의 접근 가능한 주소를 사용하세요. `npm run dev -- --port 5174`로 포트를 변경할 수 있습니다.

```sh
npm run build
npm run preview
```

프로덕션 결과는 `dist/`이며 preview의 기본 포트는 4173입니다.

## 조작과 플레이

- 5초 작전 지도 → 0.65초 지도 퇴장 → 20초 비행 → 한 발 투하 → 착탄 결과. 5라운드, 최대 500점.
- WASD: 가속·감속·좌우 선회. Space: 투하. 드래그: 카메라 회전. R: 카메라 복구.
- 모바일: 좌우 버튼, ＋/− 속도 버튼, DROP, 빈 화면 드래그. 멀티터치와 화면 안전 영역 대응. 가로 화면 권장.
- 지도는 북쪽이 위이며 출발 지점은 표시하지 않습니다. 고도는 자동 유지되고 최대 지형보다 높습니다.
- 기본 경쟁 플레이에는 착탄 예상선이 없습니다. 연습에서는 설정으로 궤적을 켤 수 있습니다.
- 비행 중 투하하면 20초를 넘어도 착탄까지 계산합니다. 미투하 시 0점입니다.
- 설정, 개인 최고 기록, 로컬 방, 로컬 일일 기록은 브라우저 저장소에 유지됩니다. 저장소 사용이 제한된 브라우저에서도 기본 싱글플레이는 실행됩니다.
- 비활성 탭과 설정 창에서는 일시 정지됩니다. 프레임이 느려져도 활성 비행의 타이머는 실제 경과 시간을 사용합니다.

## 구현된 기능

**Phase 1:** Three.js 로우폴리 3D 지형·프로펠러 비행기, 추적/폭탄/결과 카메라, 관성·속도별 선회·뱅크, 지형 경계 유도, PC 및 터치 입력, 작전 지도, 라운드 타이머, 한 발 제한, 중력·속도 상속·항력·고정 바람, 3D 지면 충돌, 거리 기반 점수, 5라운드 결과, Web Audio 합성 엔진·투하·착탄 사운드.

**Phase 2:** 결정론적 시드 생성, 12종 아키타입, 산·계곡·강·호수·숲·마을·풍차·탑·성·농장·등대, 연결 도로와 강 교차 다리, 지붕 색으로 구별하는 유사 마을, 지도와 월드의 동일 데이터, 불투명 지도 손상, 목표·필수 단서 보존, 난이도 가중치, 다섯 개 출발 후보와 라운드별 순환 배정, 정답 방향을 바로 알려주지 않는 비슷한 초기 헤딩 오차, bounded rejection sampling 및 검증된 결정론적 대체 후보.

**로컬 경쟁:** AI 4명은 실제 동일 비행·폭탄 물리를 시뮬레이션합니다. 같은 기기에서 최대 5명 친구가 동일 코드를 사용해 비동기 플레이할 수 있습니다. 6자리 코드는 맵·바람 조건을 공유하지만 다른 기기의 기록을 동기화하지 않습니다. 오늘의 도전은 UTC 날짜 기반 **로컬 데모**이고 첫 완료 기록과 최고 기록, 전날 기록, 연습을 구분합니다.

**접근성/성능:** 키보드·터치, 큰 버튼, 풍차·탑 등 모양에 따른 구분, 사운드 전환, 감소된 움직임, 카메라 감도, 수동/자동 픽셀 비율, 나무 인스턴싱, 지형 단일 메시, 라운드 메시 자원 해제. 유료 에셋, 원격 폰트 요청이 없습니다.

## 온라인 백엔드와 제한

Phase 3의 실제 호스팅 백엔드는 연결하지 않았습니다. `OnlineRoomService`에 인증된 방 생성/참가, 현재 라운드만 제공, 리플레이 제출, 공개 리더보드 인터페이스가 있습니다. `verifyReplay`는 서버가 신뢰하는 월드와 배정 슬롯을 사용해 입력·투하 시점의 유효성을 검사하고 비행·착탄·점수를 재계산합니다. 게임은 실제 고정 틱 입력 로그를 수집하며 최종 화면에서 JSON 기록을 다운로드할 수 있습니다. 클라이언트가 보낸 점수만 신뢰하는 구조가 아닙니다.

실제 운영에는 인증, DB/RLS, 방 최대 인원 원자적 제한, 제출 중복 방지, 서버 날짜·비밀값 시드, 라운드 공개 권한, 서버 측 검증 실행과 레이트 리밋이 추가로 필요합니다. 브라우저 내 로컬 모드의 좌표·시드·기록은 숨길 수 없으며 랭킹 신뢰성을 보장하지 않습니다. 인터페이스만으로 온라인 경쟁이나 안티치트를 제공한다고 주장하지 않습니다.

난이도는 기하 구조 기반 휴리스틱입니다. 출발 지점의 거리·헤딩·접근 가능성과 식별 단서를 검증하지만 실제 인간의 가시성·기억 난이도를 완벽하게 예측하지 않습니다. 아키타입은 절차적으로 변형된 스타일이며 해안/고원/나선 도로는 단순화된 형상입니다. 폭포·폐허, 완전한 voxel 높이 블록, 거리별 LOD, 실제 기기 FPS 보증은 포함하지 않았습니다. 지도 손상은 원형 불투명 잉크·물얼룩·찢김 마스크로 실제 정보를 가립니다.

검증은 Chromium 데스크톱 및 모바일 터치 에뮬레이션에서 수행합니다. Android 실제 기기, iPhone Safari/Chrome, Edge의 실기기 검증은 별도로 필요합니다.

## 설정

`src/game/GameConfig.ts`의 `CONFIG`에서 다음을 조정합니다.

| 영역 | 설정 |
| --- | --- |
| 진행 | 라운드 수(현재 생성/화면은 5라운드용), 지도 5초, 지도 퇴장, 비행 20초, 고정 틱 1/120초 |
| 월드 | 1200m 크기, 최고 높이 110m, 지형 분할 80, 나무 320, 마을/숲 수, 바람 최대값, 출발 반경, 재생성 횟수 |
| 난이도 | 라운드별 목표 범위, 손상 범위, 거리·유사성·대칭성·고유성·가시성 대리값·손상·접근 가능성 가중치 |
| 비행 | 고도 155m, 최저/기준/최고 속도 32/49/76m/s, 가속 응답, 선회 응답, 최대 뱅크, 경계 여유 |
| 폭탄 | 중력 9.81, 항력 0.12, 바람 가속 계수 0.75, 충돌 반경 1.5m |
| 점수 | `round(100 × exp(-(distance / 90)^1.3))`, 거리 스케일·지수 |
| 표현 | 결과/연기 시간, 픽셀 비율, 기본 사용자 설정 |

큰 설정 변경은 생성 규칙 검증과 테스트를 함께 실행하세요. 점수는 총점→누적 오차(미투하 패널티 포함)→최고 라운드 점수로 정렬합니다.

## 파일 목록

```text
bomb-run/
  index.html, package.json, package-lock.json, tsconfig.json, vite.config.ts
  src/main.ts, src/style.css
  src/game/Game.ts, GameState.ts, GameConfig.ts
  src/world/WorldGenerator.ts, WorldRenderer.ts, SeededRandom.ts
  src/flight/FlightPhysics.ts, FlightControls.ts
  src/bomb/BombPhysics.ts, ImpactScoring.ts
  src/map/TacticalMap.ts
  src/ui/UI.ts
  src/audio/AudioManager.ts
  src/network/RoomService.ts, ScoreVerification.ts
  tests/game.test.ts
  tools/generation-report.ts, browser-smoke.mjs
  generation-report.json, browser-report.json
  screenshots/*.png
  README.md
```

`WorldGenerator`는 공통 좌표 생성·평가·검증을 묶고 `WorldRenderer`는 표현만 담당합니다. 물리 및 리플레이 검증은 DOM/WebGL 없이 실행됩니다.

## 테스트

```sh
npm test
npm run report -- 1000
# build / preview 실행 후 별도 터미널에서:
npm run test:browser
```

브라우저 검증 도구는 이 클라우드 머신의 `/usr/bin/chromium`을 사용합니다. `CHROMIUM_EXECUTABLE_PATH`로 다른 Chromium 경로를 지정할 수 있습니다. 이 클라우드의 Chromium이 없으면 Playwright가 설치한 기본 Chromium을 사용합니다. GitHub Actions는 Playwright Chromium을 공식 설치 절차로 설치합니다. `BOMB_RUN_TEST_URL`로 검증 서버 주소를 지정할 수 있습니다. 생성 보고서를 순수 JSON으로 다시 저장하려면 `npx tsx tools/generation-report.ts 1000 > generation-report.json`을 실행하세요.

23개 로직 테스트는 시드 재현·다양성, 다리 정합성, 랜드마크/목표/출발 유효성, 난이도·폐기·단서 보존, 지도 좌표, FPS 독립성, 동일 착탄, 미투하, 한 발, 5라운드 점수, PC/모바일 동일 입력 물리, 리플레이 검증을 포함합니다. 1,000개 시드 리포트는 각 라운드 200개를 검사하고 성공률·난이도·아키타입·폐기율을 기록합니다.

## 배포

Vercel, Netlify, Cloudflare Pages 등 정적 호스팅에서 프로젝트 루트를 `bomb-run`으로 지정하고 설치 `npm ci`, 빌드 `npm run build`, 출력 디렉터리 `dist`를 지정하세요. SPA 라우팅 없이 한 페이지로 동작합니다. HTTPS 사용을 권장합니다. 기존 Socket.IO 서버는 이 게임의 필수 구성요소가 아닙니다. 실제 온라인 모드는 서버 연결 후 별도 배포해야 합니다. GitHub Pages 배포용 빌드는 `npm run build:pages`로 생성합니다. 저장소 경로 `/meowwoof-server/`에 맞게 에셋 URL을 설정합니다. `.github/workflows/deploy-bomb-run.yml`은 잠금 파일 설치, 규칙 테스트, 1,000개 맵 검증, 데스크톱·모바일 브라우저 플레이 확인 후 `gh-pages` 브랜치에 완성된 정적 파일을 게시합니다.

GitHub Pages를 처음 켤 때는 저장소 Settings → Pages에서 Source를 `Deploy from a branch`, Branch를 `gh-pages`, 폴더를 `/ (root)`로 선택하고 Save를 누릅니다. 이것은 GitHub 저장소 설정 권한이 필요한 한 번의 작업입니다. 이후 main의 게임 변경은 자동으로 빌드·배포됩니다. 사이트가 활성화된 경우 CI가 Pages 빌드를 요청하고 `build.json`의 소스 커밋이 현재 버전인지 확인한 다음 공개 주소에서 5라운드와 모바일 입력을 다시 검증합니다.

현재 실제 공개 상태는 별도 배포 확인 결과를 기준으로 판단해야 합니다. 소스 업로드·gh-pages 업로드·Pages 활성화·공개 사이트 검증은 서로 다른 단계입니다.
