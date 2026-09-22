# lessons.md

작업 중 발견한 오류와, 검증까지 끝난 해결책을 기록합니다.

## 2026-09-22 · 이 컴퓨터에서 Playwright가 없어 테스트·스크린샷이 안 돌아감

- **문제.** `node <script>.mjs` 실행 시 `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`. `node_modules` 폴더 자체가 없었음.
- **원인.** 이전 작업은 클라우드 작업공간에서 했고, 로컬 저장소에는 의존성을 설치한 적이 없음.
- **해결(검증됨).** 프로젝트 폴더에서 `npm ci` 다음 `npx playwright install chromium`. 이후 `npm test` 가 smoke 11개와 Pro 54개를 모두 통과함.

## 2026-09-22 · 브라우저 창에서 HTML 파일을 직접 열면 아이콘이 빈 칸

- **문제.** Claude 앱 브라우저 창에 `site/modheader-alternative/index.html` 을 파일로 직접 열자 상단 아이콘이 빈 칸으로 나옴(`naturalWidth` 0).
- **원인.** 브라우저 창은 로컬 파일을 `data:` 주소로 띄우기 때문에 페이지에 기준 주소가 없어, 절대 경로(`/icon-128.png`)든 상대 경로든 이미지 파일을 찾지 못함. 사이트 코드 문제가 아님.
- **해결(검증됨).** `.claude/launch.json` 의 `site` 설정(`python -m http.server 8765 --directory site`)으로 로컬 서버를 띄워 `http://localhost:8765/...` 로 열면 아이콘이 정상 로드됨. 페이지 확인은 항상 서버 주소로 한다.
