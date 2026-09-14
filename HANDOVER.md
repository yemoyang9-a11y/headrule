# Headrule 진행 체크리스트

1호 제품 Headrule(크롬 HTTP 헤더 수정 확장 프로그램)의 현재 상태와 남은 일입니다.
2026년 9월 14일 기준으로 다시 정리했습니다.

## 지금까지 끝난 것

- 확장 프로그램 본체 완성. 실제 크롬에서 헤더가 진짜 바뀌는지 자동 테스트 11개 항목 전부 통과.
- 랜딩 페이지와 개인정보처리방침 작성 완료.
- 스토어 등록 문안, 아이콘, 스크린샷 3장, 프로모 타일 제작 완료.
- GitHub 저장소 생성(Public) 및 push 완료. 주소는 github.com/yemoyang9-a11y/headrule
- GitHub Pages를 GitHub Actions 방식으로 켜 둠.
- CI 자동 테스트가 GitHub 서버에서 초록불 통과. 스토어용 zip도 자동 생성됨.
- 크롬 웹스토어 개발자 등록비 5달러 결제, 판매자(trader)로 선택.
- 레몬스퀴지 가입, 스토어 이름 Headrule, 주소 headrule.lemonsqueezy.com, 연락처 이메일 설정, 로고 업로드.
- 정산 계좌용 신한은행 SWIFT 코드 확인(SHBKKRSE).

## 지금 확인해야 할 것 (5분)

아래 네 가지는 했는지 확실하지 않아서 한 번씩 열어 보셔야 합니다.

1. **사이트가 실제로 열리는지.** https://yemoyang9-a11y.github.io/headrule/ 를 주소창에 넣어 보세요. 안 열리면 저장소 Actions 탭 → Deploy site → Re-run all jobs.
2. **레몬스퀴지 통화가 USD인지.** Settings → General → Currency. 첫 판매 전에만 바꿀 수 있습니다.
3. **크롬 웹스토어 본인 확인이 통과했는지.** 개발자 대시보드에 경고 배너가 남아 있는지 보세요. 주소 증빙 서류를 아직 못 올렸다면 신한 앱에서 주소가 찍힌 거래내역서나 잔액증명서를 뽑아 올리면 됩니다.
4. **레몬스퀴지 정산 계좌 등록.** 예금주명은 신한 앱에 등록된 영문 이름과 똑같이, SWIFT는 SHBKKRSE, 계좌번호는 하이픈 없이 숫자만.

## 남은 일

### 1. 레몬스퀴지 스토어 활성화 마무리

사업 설문의 두 칸에 이렇게 넣습니다.

웹사이트:
```
https://yemoyang9-a11y.github.io/headrule/
```

제품 설명(영어로):
```
I sell Headrule, a Chrome browser extension for web developers and QA engineers that lets them add, change or remove HTTP request and response headers while testing websites and APIs. The extension is free on the Chrome Web Store, and customers find it through Chrome Web Store search and my website. I charge a single one-time payment of $9 for a "Pro" license key that unlocks extra features such as multiple rule profiles, regex URL filters and import/export. There is no subscription, and the license key is delivered automatically by email after checkout.
```

승인은 영업일 기준 2~3일 걸립니다.

### 2. 상품 만들기

Products → New product에서 다섯 가지만 맞추면 됩니다.

- 이름: Headrule Pro
- 가격: 9 USD, 결제 유형 Single payment
- License keys 토글 켜기, Activation limit 5
- Refund policy 14 days
- 설명 한 줄: Unlocks unlimited profiles, regex URL filters, import/export and sync in the Headrule Chrome extension. Paste the license key into Headrule → Options.

만든 뒤 **아래 세 가지를 저에게 보내 주세요.** 제가 코드에 넣겠습니다.

- 체크아웃 링크 (Share 버튼에서 복사, headrule.lemonsqueezy.com/buy/... 형태)
- Store ID (Settings → Stores)
- Product ID (상품 목록 URL 끝의 숫자)

주의: 스토어 활성화 승인 전에 만든 상품은 테스트 모드 것이라 승인 후 Copy to Live Mode로 옮겨야 하고, 그때 ID가 새로 생깁니다. 저에게는 승인 뒤 라이브 모드 값을 보내 주세요.

### 3. 크롬 웹스토어에 첫 업로드 (약 40분, 심사 며칠)

첫 업로드만 손으로 하고 그 뒤부터는 자동입니다.

1. 웹스토어 대시보드 → New item → `dist/headrule-1.0.0.zip` 업로드. (zip이 없으면 프로젝트 폴더에서 `npm run zip`)
2. Store listing 탭: `store/listing.md` 내용을 그대로 붙여넣기. 아이콘 `store/store-icon-128.png`, 스크린샷 `store/screenshot-1~3-1280x800.png`, 프로모 타일 `store/promo-small-440x280.png`.
3. Privacy practices 탭: `listing.md` 아래쪽 문안 그대로. 개인정보처리방침 URL은 `https://yemoyang9-a11y.github.io/headrule/privacy.html`
4. Distribution 탭: Public, 모든 지역, Free.
5. Submit for review. 모든 사이트 접근 권한 때문에 보통 며칠 걸립니다. 반려되면 이유가 메일로 오는데 거의 항상 권한 사유 설명이 부족하다는 내용이라, 문안을 더 자세히 쓰고 재제출하면 됩니다.
6. 승인되면 32자리 확장 ID가 생깁니다. 그것도 저에게 보내 주시면 랜딩 페이지 설치 버튼에 연결하겠습니다.

### 4. 자동 배포 연결 (한 번만, 약 30분)

이걸 해 두면 다음부터는 명령 세 줄로 심사 제출까지 끝납니다.

1. console.cloud.google.com 에서 새 프로젝트 생성.
2. APIs & Services → Library → Chrome Web Store API → Enable.
3. OAuth consent screen → External → 앱 이름 Headrule CI → 저장. 마지막에 반드시 Publish app(In production) 상태로 바꿉니다. Testing 상태면 토큰이 7일마다 만료돼 자동화가 끊깁니다.
4. Credentials → Create credentials → OAuth client ID → Desktop app → Client ID와 secret 복사.
5. 터미널에서 `npx chrome-webstore-upload-keys` 실행 후 안내대로 진행하면 Refresh token이 나옵니다.
6. 저장소 Settings → Secrets and variables → Actions에 다섯 개 등록: CWS_EXTENSION_ID, CWS_PUBLISHER_ID, CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN

이후 새 버전 배포는 이렇게만 하면 됩니다.

```
node scripts/bump.mjs 1.0.1
git commit -am "v1.0.1"
git tag v1.0.1
git push && git push --tags
```

### 5. 런칭 주 홍보 (3~5시간, 매출을 좌우하는 부분)

조사에서 확인한 사실은 이렇습니다. 성공한 소규모 확장 프로그램은 거의 다 사람들이 이미 검색하는 이름을 차지했고, 첫 사용자는 개발자가 직접 커뮤니티에 올려서 만들었습니다. Headrule의 검색어는 "ModHeader alternative"입니다. 승인된 날부터 일주일 안에 순서대로 하세요. 글 초안은 제가 다 써 드립니다.

1. Hacker News에 Show HN으로 올리기. 왜 만들었는지 세 문장, 데이터를 모으지 않는다는 점 강조.
2. Reddit r/webdev, r/chrome_extensions, r/javascript. ModHeader 삭제를 다룬 기존 글 댓글에도 짧게 링크.
3. Product Hunt 런칭. 화요일에서 목요일 사이, 미국 서부 시간 00:01에 등록.
4. dev.to에 글 한 편. 제목은 "ModHeader was pulled from the store. Here is how to move your headers in 5 minutes." 이 글이 검색 유입을 오래 만들어 줍니다.
5. 6개월 뒤 Product Hunt 재런칭.

## 이후 운영 (주 30분)

지원 메일은 거의 안 옵니다. 오면 대부분 특정 헤더가 왜 안 바뀌냐는 질문인데, 팝업이 오류 이유를 규칙 아래에 빨간 글씨로 보여 주므로 그 스크린샷을 요청하면 해결됩니다. 답장 초안이 필요하면 메일 본문을 저에게 붙여 넣으세요.

리뷰는 대시보드에서 주 1회 확인하고 별점 낮은 리뷰에는 짧게 답글을 답니다. 제목에 Manifest나 policy가 들어간 구글 메일은 무시하지 말고 저에게 가져오세요. 코드 수정이 필요한 경우입니다.

세금은 레몬스퀴지가 각국 부가세를 대신 처리하지만 국내 종합소득세는 본인이 5월에 신고합니다. 정산 내역을 받아 두세요. 매출이 꾸준해지면 사업자등록이 필요한지 국세청 상담(126)이나 세무서에 한 번 물어보시는 게 좋습니다.

## 비용

| 항목 | 금액 |
|---|---|
| 크롬 웹스토어 개발자 등록 | 5달러 (1회, 결제 완료) |
| 레몬스퀴지 | 0원, 판매 시 5% + 0.5달러 |
| GitHub, Pages, Actions | 0원 |
| 서버 | 없음 |
| 도메인 (선택) | 연 1~2만원 |

## 2호, 3호로 넘어가기

저장소 구조를 그대로 복사해서 씁니다. 바꿀 것은 extension 폴더 안의 로직, lib/config.js의 이름과 ID, store/listing.md, site/index.html 문안, scripts/make_icons.py의 색과 글자입니다. 테스트와 배포 설정은 손대지 않고 그대로 재사용합니다.

2호 후보는 Linkclump 대체입니다. 드래그로 링크 여러 개를 한 번에 여는 도구로, 사용자 10만 명에 평점 4.62였는데 2026년 8월 29일에 스토어에서 삭제됐습니다. 3호 후보는 Marinara 대체(뽀모도로 타이머)로 사용자 9만 명, 평점 4.77이었습니다.

## 솔직한 기대치

크롬 확장의 70%는 사용자 100명을 못 넘기고, 인디 개발자가 월 100~500달러에 닿는 데 보통 6~12개월이 걸립니다. Headrule이 그보다 나은 출발점을 가진 이유는 90만 명이 쓰던 제품의 빈자리를 노리고, 개발자 고객은 지불 의사가 있으며, 사이트 구조가 바뀌어도 깨지지 않아 유지보수가 거의 없다는 점입니다. 그래도 한 개에 걸지 말고 2호, 3호를 같은 파이프라인으로 이어 붙이는 것이 계획의 핵심입니다.
