# Headrule 인수인계 문서

1호 제품 "Headrule"(크롬 HTTP 헤더 수정 확장 프로그램)의 코드, 랜딩 페이지, 스토어 등록 자료, 자동 배포 파이프라인이 모두 준비된 상태입니다. 이 문서는 예모님이 직접 해야 하는 일만 순서대로 적은 것입니다. 전부 합쳐도 한나절이면 끝나고, 비용은 5달러(스토어 등록비)입니다. 도메인은 선택입니다.

## 0. 지금 상태 (5분 요약)

만들어진 것:
- `extension/` 크롬 확장 프로그램 본체. 실제 크롬에서 요청 헤더 추가·삭제, 응답 헤더 수정, 도메인 필터, 일시정지, ModHeader 파일 가져오기까지 자동 테스트로 확인 완료 (`npm test`).
- `site/` 랜딩 페이지와 개인정보처리방침. GitHub Pages로 자동 배포됩니다.
- `store/` 스토어 등록 문안(`listing.md`), 아이콘, 스크린샷 3장, 프로모 타일.
- `.github/workflows/` 태그를 올리면 테스트 → zip → 크롬 웹스토어 업로드 → 심사 제출까지 자동. 사이트도 push 하면 자동 배포.
- `dist/headrule-1.0.0.zip` 스토어에 올릴 첫 파일.

돈 흐름: 무료 설치 → 팝업에서 프로필 추가나 정규식 필터를 쓰려 하면 "Pro $9" 안내 → Lemon Squeezy 결제 페이지 → 이메일로 라이선스 키 발송 → 옵션 페이지에 키 입력 → 활성화. 결제·세금·환불·정산은 전부 Lemon Squeezy가 처리하고 한국 은행 계좌로 입금됩니다. 서버가 없으므로 운영비는 0원입니다.

사람이 하는 일: 아래 1~3번을 한 번만 하고, 4번(런칭 주 홍보)에 몇 시간 쓰면 됩니다. 그 뒤로는 주 1회 리뷰와 지원 메일 확인 정도입니다.

## 1. 계정 세 개 만들기 (약 1시간)

### 1-1. 크롬 웹스토어 개발자 등록 ($5, 1회)
1. https://chrome.google.com/webstore/devconsole 접속, 확장 프로그램 전용으로 쓸 구글 계정으로 로그인 (개인 Gmail이어도 됩니다).
2. 등록비 $5 결제. 이메일 인증까지 끝내면 대시보드가 열립니다.
3. 대시보드 → Account → "Publisher display name"을 정합니다. 본명 대신 "Headrule" 같은 이름을 써도 됩니다.
4. 결제 정보(payments)는 유료 앱을 안 팔 것이므로 건너뜁니다. Pro는 스토어 밖(Lemon Squeezy)에서 팝니다. 이건 허용되는 방식이고, 스토어 설명에도 그렇게 적어 뒀습니다.

### 1-2. Lemon Squeezy 스토어 만들기 (무료, 결제 시 5% + $0.50)
1. https://app.lemonsqueezy.com 가입 → 스토어 이름 "Headrule" → 스토어 주소 `headrule.lemonsqueezy.com`.
2. Settings → General → 사업자 정보: 개인(Individual)으로 등록. 사업자등록번호 없이 가능합니다.
3. Settings → Payouts → 한국(Republic of Korea) 은행 계좌 등록. 신분증 확인이 뜨면 진행합니다 (첫 정산 전에 한 번).
4. Products → New product:
   - 이름: Headrule Pro
   - 가격: $9, 결제 유형 "Single payment"
   - "License keys" 토글 ON, Activation limit: 5 (한 사람이 브라우저 5개까지 쓰게 해 주는 값. 넉넉히 주세요)
   - Refund policy: 14 days (랜딩 페이지에 14일 환불이라고 적혀 있습니다)
   - 설명에 한 줄: "Unlocks unlimited profiles, regex URL filters, import/export and sync in the Headrule Chrome extension. Paste the license key into Headrule → Options."
5. 저장 후 "Share" → 체크아웃 링크 복사 (`https://headrule.lemonsqueezy.com/buy/xxxxxxxx` 형태).
6. 숫자 ID 두 개 확인: Settings → Stores 에서 Store ID, Products 목록에서 Product ID (URL 끝의 숫자).
7. 코드에 반영:
   - `extension/lib/config.js` 의 `buyUrl`, `lemonSqueezy.storeId`, `lemonSqueezy.productId`
   - `site/index.html` 의 `REPLACE_WITH_CHECKOUT_ID` 두 군데
8. 결제 테스트: Lemon Squeezy 상단의 "Test mode"를 켜고 테스트 카드(4242 4242 4242 4242)로 한 번 사 본 뒤, 받은 키를 확장 옵션 페이지에 넣어 "Pro active"가 뜨는지 확인. 확인이 끝나면 Test mode를 끕니다.

### 1-3. GitHub 저장소 (무료)
1. github.com 에서 새 저장소 `headrule` 생성. Private 권장 (Pro 잠금 코드가 들어 있으므로).
2. 이 폴더를 push:
   ```
   cd headrule
   git remote add origin git@github.com:yemoyang9-a11y/headrule.git
   git push -u origin main
   ```
3. Settings → Pages → Source 를 "GitHub Actions"로 바꿉니다. 다음 push 부터 `site/`가 `https://yemoyang9-a11y.github.io/headrule/` 에 올라갑니다.
4. 도메인(선택): `headrule.dev` 같은 도메인을 사면 Settings → Pages → Custom domain 에 넣고, `site/CNAME` 파일에 도메인을 한 줄 적어 push 합니다. 도메인 없이 github.io 주소로 시작해도 됩니다. 그 경우 `extension/lib/config.js` 의 `siteUrl`, `supportEmail` 과 `site/index.html`, `site/privacy.html` 의 주소·이메일을 실제 값으로 바꿔 주세요. (참고: headrule.dev 도메인이 비어 있는지는 확인하지 못했습니다. 다른 도메인이어도 상관없습니다.)

## 2. 첫 배포는 수동으로 한 번 (약 40분, 심사 대기 며칠)

첫 업로드는 대시보드에서 직접 해야 확장 ID가 생깁니다. 그 뒤부터는 자동입니다.

1. `npm run zip` → `dist/headrule-1.0.0.zip` 생성 (이미 만들어져 있습니다).
2. 웹스토어 대시보드 → "New item" → zip 업로드.
3. Store listing 탭: `store/listing.md` 내용을 그대로 붙여넣습니다. 아이콘은 `store/store-icon-128.png`, 스크린샷은 `store/screenshot-1~3-1280x800.png`, 프로모 타일은 `store/promo-small-440x280.png`.
4. Privacy practices 탭: `listing.md` 아래쪽의 "Privacy practices" 문안을 그대로 씁니다. 개인정보처리방침 URL은 배포된 사이트의 `privacy.html` 주소.
5. Distribution 탭: Public, 모든 지역, Free.
6. "Submit for review". `<all_urls>` 권한 때문에 보통 며칠 걸립니다. 반려되면 이유가 메일로 오는데, 거의 항상 "권한 사유 설명 부족"이라 문안을 조금 더 자세히 쓰고 재제출하면 됩니다.
7. 승인되면 대시보드 URL에 32자리 확장 ID가 보입니다. `site/index.html` 의 `REPLACE_WITH_EXTENSION_ID` 를 바꿔 push 하세요.

## 3. 자동 배포 연결 (한 번만, 약 30분)

이걸 해 두면 다음부터는 `node scripts/bump.mjs 1.0.1` → 커밋 → `git tag v1.0.1` → push 만으로 심사 제출까지 끝납니다.

1. https://console.cloud.google.com 에서 새 프로젝트 생성 (이름 아무거나).
2. APIs & Services → Library → "Chrome Web Store API" 검색 → Enable.
3. APIs & Services → OAuth consent screen → External → 앱 이름 "Headrule CI", 본인 이메일 → 저장. 마지막 단계에서 반드시 **"Publish app"**(In production) 상태로 바꿉니다. Testing 상태면 토큰이 7일마다 만료돼 자동화가 끊깁니다. 검증(verification)은 필요 없습니다. 본인만 쓰니까요.
4. Credentials → Create credentials → OAuth client ID → Application type "Desktop app" → Client ID와 Client secret 복사.
5. 터미널에서 `npx chrome-webstore-upload-keys` 실행 → 안내에 따라 위 Client ID/secret 입력 → 브라우저가 열리면 1-1에서 쓴 구글 계정으로 승인 → Refresh token 출력.
6. GitHub 저장소 → Settings → Secrets and variables → Actions → 다음 다섯 개 등록:
   - `CWS_EXTENSION_ID` (2-7의 32자리)
   - `CWS_PUBLISHER_ID` (웹스토어 대시보드 → Account 페이지의 Publisher ID)
   - `CWS_CLIENT_ID`
   - `CWS_CLIENT_SECRET`
   - `CWS_REFRESH_TOKEN`
7. 확인: `node scripts/bump.mjs 1.0.1` → `git commit -am v1.0.1` → `git tag v1.0.1` → `git push && git push --tags` → Actions 탭에서 초록불이 뜨고 대시보드에 1.0.1이 "Pending review"로 올라오면 완성.

## 4. 런칭 주에 사람이 할 홍보 (총 3~5시간, 이게 매출을 좌우합니다)

조사에서 확인한 사실: 성공한 소규모 확장 프로그램은 거의 다 "이미 사람들이 검색하는 이름"을 차지했고, 첫 사용자는 사람이 직접 커뮤니티에 올려서 만들었습니다. Headrule의 검색어는 "ModHeader alternative"입니다. 승인된 날부터 일주일 안에 아래를 순서대로 합니다. 글 초안은 제가 다 써 드릴 수 있으니 올리기만 하면 됩니다.

1. Hacker News "Show HN: Headrule, a ModHeader replacement with no telemetry" (본문에 왜 만들었는지 세 문장, 데이터 안 모은다는 점 강조).
2. Reddit r/webdev, r/chrome_extensions, r/javascript 에 같은 내용. ModHeader 삭제 소식을 다룬 기존 글의 댓글에도 짧게 링크.
3. Product Hunt 런칭 (화~목요일 아침, 미국 시간 기준 00:01 PT 등록).
4. dev.to 에 글 한 편: "ModHeader was pulled from the store. Here is how to move your headers in 5 minutes." 이 글이 검색 유입을 오래 만들어 줍니다.
5. 6개월 뒤 Product Hunt 재런칭 (조사에서 반복 가능한 채널로 확인된 방법).

## 5. 이후 운영 (주 30분)

- 지원 메일: 거의 안 옵니다. 오면 대부분 "이 헤더가 왜 안 바뀌나요"인데, 팝업이 오류 이유를 줄 아래에 보여 주므로 그 스크린샷을 요청하면 끝납니다. Claude에게 메일 본문을 붙여 넣고 답장 초안을 받으세요.
- 리뷰: 대시보드에서 주 1회 확인. 별점 낮은 리뷰에는 짧게 답글.
- 크롬 정책 메일: "Manifest" 나 "policy" 제목의 메일이 오면 무시하지 말고 저한테 가져오세요. 코드 수정은 저에게 맡기면 됩니다.
- 세금: Lemon Squeezy가 각국 부가세는 처리하지만 국내 종합소득세(5월)는 본인이 신고합니다. 정산 내역을 다운로드해 두세요.

## 6. 2호, 3호 제품에 이 템플릿 재사용하기

이 저장소 구조를 그대로 복사하면 됩니다. 바꿀 것은 `extension/` 안의 로직, `lib/config.js` 의 이름과 ID, `store/listing.md`, `site/index.html` 문안, 그리고 `scripts/make_icons.py` 의 색과 글자입니다. 테스트(`test/smoke.mjs`)와 배포(`.github/workflows/`)는 그대로 씁니다. 2호 후보는 조사 결과대로 Linkclump 대체(드래그로 링크 여러 개 열기), 3호는 Marinara 대체(뽀모도로)입니다. 말씀만 하시면 같은 방식으로 이어서 만듭니다.

## 7. 비용 정리

| 항목 | 금액 |
|---|---|
| 크롬 웹스토어 개발자 등록 | $5 (1회) |
| Lemon Squeezy | 0원, 판매 시 5% + $0.50 |
| GitHub, GitHub Pages, Actions | 0원 |
| 도메인 (선택) | 연 1~2만원 |
| 서버 | 없음 |

## 8. 솔직한 기대치

조사 기준으로 크롬 확장의 70%는 사용자 100명을 못 넘기고, 인디 개발자가 월 $100~500에 닿는 데 보통 6~12개월이 걸립니다. Headrule이 그보다 나은 출발점을 가진 이유는 90만 명이 쓰던 제품의 빈자리를 노리고, 개발자 고객은 지불 의사가 있으며, 사이트 구조 변경에 영향을 받지 않아 유지보수가 거의 없다는 점입니다. 그래도 한 개에 걸지 말고 2호, 3호를 같은 파이프라인으로 이어 붙이는 것이 계획의 핵심입니다.
