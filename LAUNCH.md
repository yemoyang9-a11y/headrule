# Headrule 런칭 글 모음

크롬 웹스토어 승인이 난 다음에 쓰는 글들입니다. 승인 전에 올리면 설치 링크가 없어서 효과가 없습니다.

웹스토어 주소는 2026-09-18 게시 후 채워 넣었습니다.

---

## 0. 올리기 전에 알아 둘 것

**계정 상태.** 레딧은 가입한 지 얼마 안 됐거나 활동 이력이 없는 계정이 링크를 올리면 자동으로 걸러집니다. 올리기 며칠 전부터 관련 서브레딧에서 남의 글에 댓글 몇 개라도 달아 두세요.

**같은 글을 여러 곳에 복사하지 마세요.** 아래 글들을 서로 다르게 써 둔 이유가 그것입니다. 똑같은 문장을 여러 서브레딧에 뿌리면 스팸으로 처리됩니다.

**본인이 만들었다고 밝히세요.** 숨기면 나중에 들켰을 때 훨씬 큰 손해입니다. 아래 글들에는 전부 밝히는 문장이 들어 있습니다.

**ModHeader 이야기를 할 때.** "악성코드였다", "정보를 훔쳤다" 같은 단정은 쓰지 마세요. 확인된 사실은 이렇습니다. 2026년 7월 구글과 마이크로소프트가 스토어에서 내렸고, Stripe OLT라는 보안업체가 확장 안에 숨겨진 데이터 수집 코드가 있다는 분석을 공개했습니다. 그 코드는 비활성 상태였고 실제로 데이터가 전송된 증거는 확인되지 않았다고 보도됐습니다. 아래 글들은 이 선을 지켜서 썼습니다. 남의 제품을 깎아내리는 대신 내 제품이 뭘 안 하는지를 말하는 쪽이 설득력도 더 큽니다.

**겪지 않은 경험담은 쓰지 마세요.** 2026-09-22 에 "ModHeader를 매일 썼다", "써 본 대체품이 다 별로였다" 같은 문장을 초안에서 뺐습니다. HN·레딧은 작성자에게 바로 되묻는 곳이라 사실이 아닌 개인 이야기는 금방 드러납니다. 실제로 겪은 일이 있으면 그때 본인 말로 넣습니다. 사용자 수는 Stripe OLT 보고서의 "약 90만 명"을 씁니다(일부 기사의 160만 명은 출처가 다름).

**일정 (2026-09-22 갱신).** HN·레딧 계정을 9/20~21에 새로 만들었기 때문에 링크 글은 한 주 미룹니다.

| 언제 | 할 일 |
|---|---|
| 9/22~9/28 | 계정 키우기(링크 없이 댓글, 아래 0-1), AlternativeTo 등록(8번), dev.to 글(6번) |
| 9/29(화) 또는 9/30(수) 밤 10시 | Show HN (1번) |
| HN 다음 날 | r/chrome_extensions (2번), 저장해 둔 "ModHeader 대안" 글에 댓글 (4번) |
| 그다음 주 | r/webdev (3번) |
| 그 뒤 화~목 | Product Hunt (5번) |

**0-1. 계정 키우기 (첫 주).** 하루 두세 개, 링크 없이. 레딧은 r/webdev, r/chrome_extensions, r/javascript 의 질문 글에 답하거나 경험을 나눕니다. 서브레딧마다 계정 나이·카르마 기준이 다르니 각 서브레딧의 Rules 를 먼저 봅니다. HN은 개발 도구·브라우저 이야기에 댓글을 답니다. 두 곳 모두 AI가 쓴 티가 나는 댓글을 싫어하므로, 하고 싶은 말을 한국어로 정리해 Claude에게 영어로 옮겨 달라고 하는 방식으로 씁니다. "ModHeader 대안" 질문 글은 이 주에는 저장만 합니다.

**ModHeader 사실관계 원본.** Stripe OLT 보고서(2026-07-13 게시, 09-10 갱신): https://stripeolt.com/knowledge-hub/threat-research/chrome-extension-hidden-data-exfiltration-900k-users/ . 분석 버전 7.0.18, 방문 기록 업로드는 비어 있는 허용 목록 때문에 꺼져(dormant) 있었고, 보고서는 방문 기록 전송을 관찰하지 못했다고 씀. 설치·업데이트·삭제 때 제품·버전·브라우저 종류를 제3자 도메인으로 보낸 것은 보고서에 있음. 일부 경쟁사 블로그의 "방문 도메인을 몰래 보냈다"는 표현은 보고서보다 셉니다. 우리는 보고서 표현을 넘지 않습니다.

---

## 1. Hacker News (Show HN)

가장 먼저, 화요일에서 목요일 사이 한국 시간 밤 10시에서 자정 사이에 올리세요. 미국 아침 시간입니다.

**Title**
```
Show HN: Headrule – A Chrome header modifier with no telemetry
```

**URL**
```
https://headrule.com/
```

**Text (첫 댓글로 바로 답니다)**
```
I built this after ModHeader was pulled from the Chrome and Edge stores in July. The Stripe OLT report that preceded the removal counted about 900,000 users, and anyone whose profiles lived only in the extension lost them with it. I wanted a replacement whose behaviour you can verify rather than take on trust.

Headrule does one thing: add, set or remove HTTP request and response headers, scoped to a URL or domain. It is built on declarativeNetRequest, so it has no content scripts and cannot read page content. There is no account, no analytics and no remote code. The only network call it ever makes is a license check, and only if you buy the paid tier.

Free covers unlimited rules in one profile. Importing ModHeader's JSON export is free. A one-time $9 license adds multiple profiles, regex URL filters and sync through your own Chrome account. No subscription.

Source is public: https://github.com/yemoyang9-a11y/headrule

I would especially like feedback on the URL filter syntax, and if you have an old ModHeader export that does not import cleanly, I would like to see it. Happy to answer anything.
```

---

## 2. Reddit: r/chrome_extensions

가장 반응이 좋을 곳입니다. 개발자들이 모여 있고 자기 확장 홍보가 허용됩니다.

**Title**
```
I rebuilt a header modifier from scratch after ModHeader was pulled, with zero telemetry
```

**Body**
```
When ModHeader disappeared from the store in July, a lot of people lost the tool they used to set request headers, and their saved profiles with it. I wanted a replacement small enough that you can check what it does yourself.

So I wrote Headrule. It is a Manifest V3 extension that does one job: add, set or remove HTTP request and response headers, with a URL or domain filter per rule.

A few decisions I made deliberately, and I would like to hear if you disagree:

- declarativeNetRequest only. No content scripts, no background request listener. The extension physically cannot see your page content.
- No account, no analytics, no remote code. The entire source is public.
- The paid tier is a one-time $9 license, not a subscription. Free gives you unlimited rules in one profile.
- It imports ModHeader's JSON export, so if you still have your old export file your profiles carry over.

Install: https://chromewebstore.google.com/detail/mclcmbfklofongahjpfioipdipbldipp
Source: https://github.com/yemoyang9-a11y/headrule

I am the developer. Happy to take feature requests, and if something does not work on a site you use I would like to know which one.
```

---

## 3. Reddit: r/webdev

여기는 홍보 규칙이 더 엄격합니다. 서브레딧 규칙을 먼저 읽고, 자기 홍보 요일 제한이 있으면 지키세요. 제품 소개보다 겪은 문제 이야기로 시작하는 편이 낫습니다.

**Title**
```
Chrome has no built-in way to set a request header, and the extension most of us used is gone
```

**Body**
```
Adding an Authorization header to a staging API, faking a User-Agent, or patching CORS headers while developing locally are all things you cannot do from Chrome itself. For years the answer was a header extension. The most popular one was removed from the Chrome and Edge stores in July after a security firm published an analysis of hidden data-collection code in it.

That left a gap, and it bothered me enough that I built a replacement. It is called Headrule. It is built on declarativeNetRequest, which means the rules are handed to Chrome's own request engine rather than being applied by a script watching your traffic. Practically, that means the extension has no content scripts and cannot read the pages you visit.

Free tier is unlimited rules in one profile. Importing a ModHeader export is free too. A one-time $9 license adds unlimited profiles, regex filters and sync through your own Chrome account. No subscription, no account, no analytics.

Install: https://chromewebstore.google.com/detail/mclcmbfklofongahjpfioipdipbldipp
Source: https://github.com/yemoyang9-a11y/headrule

Disclosure: I made it. Mostly I am curious how other people solved this in the meantime. Proxy? Editing the code? A different extension I missed?
```

---

## 4. 기존 "ModHeader 대안 있나요" 글에 다는 댓글

레딧이나 HN에서 그런 질문 글을 찾아 답니다. 새 글보다 전환이 좋습니다. 짧게 씁니다.

```
I built one after ModHeader was removed. Headrule, Manifest V3, declarativeNetRequest only, no account and no analytics, source is public. Free tier covers unlimited rules. It also imports ModHeader's JSON export if you still have yours.

What carries over from a ModHeader export, and what to check in any replacement: https://headrule.com/modheader-alternative/

Disclosure: I am the author.
```

---

## 5. Product Hunt

화요일에서 목요일, 미국 태평양 시간 00:01에 등록합니다. 한국 시간으로 오후 4시 또는 5시(서머타임 여부에 따라)입니다.

**Name**
```
Headrule
```

**Tagline (60자 이내)**
```
Modify HTTP headers in Chrome. No account, no tracking.
```

**Description**
```
Headrule adds, sets or removes HTTP request and response headers for any URL, directly inside Chrome. Built for the daily work of API and frontend development: sending an Authorization token to a staging API, faking a User-Agent, patching CORS headers while developing locally.

It runs on Chrome's declarativeNetRequest API, so it has no content scripts and cannot read page content. No account, no analytics, no remote code. The source is public.

Free: unlimited request and response rules, URL filters, one profile.
Pro: $9 once, no subscription. Unlimited profiles, regex filters, and sync through your own Chrome account. ModHeader import is free.
```

**Maker's first comment**
```
Hi everyone. I am a solo developer and I built Headrule after ModHeader, a header extension with about 900,000 users, was removed from the Chrome and Edge stores in July, following a security firm's analysis of hidden data-collection code in it.

I wanted a replacement I could actually verify, so I made the opposite tradeoffs: declarativeNetRequest instead of a request listener, no account, no analytics, no remote code, and the full source public so anyone can check.

The paid tier is a single $9 payment rather than a subscription, because this is a tool you use for years and I do not think a utility like this should bill you monthly.

I would love feedback on the URL filter syntax in particular. And if you have a site where a header rule does not apply, tell me which one and I will fix it.
```

---

## 6. dev.to 글

이 글이 가장 오래 갑니다. 검색으로 몇 달 동안 사람을 데려옵니다. 승인 직후에 올리세요.

**Title**
```
ModHeader is gone. Here is how to move your header rules in five minutes
```

**Tags**: webdev, chrome, javascript, productivity

**Body**
```markdown
If you do API or frontend work in Chrome, at some point you needed to change a request header. Add an Authorization token to a staging environment. Pretend to be an iPhone. Patch a CORS header while developing against a local server. Chrome gives you no way to do any of that on its own, so most of us installed an extension.

For a lot of people that extension was ModHeader. In July 2026 it was removed from both the Chrome Web Store and the Edge Add-ons store, after the security firm Stripe OLT published [an analysis](https://stripeolt.com/knowledge-hub/threat-research/chrome-extension-hidden-data-exfiltration-900k-users/) reporting a browsing-history collector inside it. In the version they examined, the collector was switched off, and they did not observe history being uploaded. The extension is gone either way, and if you had rules saved in it they went with it.

This post covers what changed, what your options are, and how to get your header rules working again.

## Why this happened at all

Header modification used to be built on the blocking `webRequest` API, which let an extension intercept every request, inspect it, and rewrite it in JavaScript. That is enormously powerful and enormously hard to audit, because nothing about the API forces the extension to limit itself to headers.

Manifest V3 removed blocking `webRequest` for most extensions and replaced it with `declarativeNetRequest`. The difference matters more than it sounds. With declarativeNetRequest, an extension hands Chrome a list of rules and Chrome applies them itself. The extension never sees the request. It cannot log your URLs from that API, because it never receives them.

That is a real security improvement, and it is also why a header tool written today can be meaningfully more trustworthy than one written in 2019.

## What to look for in a replacement

Whatever you pick, check three things before you install it.

**Does it need an account?** A header modifier has no reason to know who you are. If it asks you to sign in, check what it stores and where.

**What permissions does it request?** A declarativeNetRequest-based tool needs `declarativeNetRequest`, `storage`, and host access. If it also asks for `webRequest`, `scripting`, or `tabs`, it is doing more than headers.

**Is the source available?** You cannot audit a minified bundle. You can audit a public repository.

## Moving your rules

If you still have ModHeader installed somewhere, or you exported your profiles at some point, you have a JSON file with your rules in it. That file is worth keeping. Several replacements can read it, including the one I built. I wrote up [exactly what carries over from a ModHeader export](https://headrule.com/modheader-alternative/#carries-over) and what gets switched off or skipped, so you know what to check after importing.

If you never exported, your rules are gone and you will be retyping them. Sorry. Export early next time.

## The tool I built

Full disclosure: I wrote one. It is called [Headrule](https://chromewebstore.google.com/detail/mclcmbfklofongahjpfioipdipbldipp) and the [source is public](https://github.com/yemoyang9-a11y/headrule).

It does one thing. Add, set or remove request and response headers, scoped by URL. Rules apply from the next request after you type them, because they go straight into Chrome's own request engine.

What it deliberately does not do: no account, no analytics, no crash reporting, no remote code, no content scripts. The only network request it makes on its own is a license check, and only if you buy the paid tier.

Free covers unlimited rules with URL filters in one profile, plus import and export including ModHeader files. Pro is nine dollars once, not a subscription, and adds multiple profiles, regex URL filters, and sync through your own Chrome account.

## Things that will trip you up

A few Chrome rules that surprise people, regardless of which extension you use.

**Append only works on a handful of request headers.** Chrome permits appending to `Accept`, `Accept-Language`, `Cache-Control`, `Cookie`, `User-Agent`, `X-Forwarded-For` and a few others. For anything else you have to use set. Response headers can be appended freely.

**Extensions can collide.** If two extensions both modify the same header, Chrome evaluates the most recently installed extension first and the other one can silently lose. If a rule is not applying, check whether something else is also modifying it.

**The install prompt looks scary for a reason.** A rule with an empty URL filter has to apply everywhere, so most header tools ask for access to all sites up front. What matters is what the extension does with that access, so check for content scripts and extra permissions in its manifest.

## Closing

The removal was a nuisance, but the underlying shift is good. A header tool built on declarativeNetRequest genuinely cannot do the thing that got the old one pulled. If you are picking a replacement, that is the property worth optimizing for.
```

---

## 7. 올린 다음에 할 일

첫 24시간 동안 댓글에 답하세요. 이게 전환율을 크게 바꿉니다. 특히 HN과 Product Hunt는 작성자가 성실하게 답하면 순위가 올라갑니다.

부정적인 댓글이 달려도 방어하지 마세요. "좋은 지적입니다, 고치겠습니다" 한 줄이 논쟁보다 훨씬 낫습니다. 실제로 고칠 수 있는 건 저에게 가져오시면 됩니다.

버그 제보가 오면 그대로 저에게 붙여 넣으세요. 고쳐서 새 버전을 올리는 건 명령 세 줄이면 끝납니다.

---

## 8. AlternativeTo 등록

"무엇 대신 쓸 것"을 찾는 사람들이 보는 목록 사이트입니다. 2026-09-22 기준 ModHeader 대안 목록(https://alternativeto.net/software/modheader/)에 Requestly, OpenHeader, Header Override, Header Editor, Live HTTP Headers, VibeHeader가 있고 Headrule은 없습니다. 계정 나이 제한 없이 바로 등록할 수 있습니다.

절차: alternativeto.net 에 로그인 → ModHeader 페이지의 **Add Alternatives**(또는 사이트 메뉴의 앱 추가) → Headrule을 새 앱으로 등록 → ModHeader의 대안으로 연결. 등록은 운영진 검토 후 보이기까지 시간이 걸릴 수 있습니다.

**주의.** 저장소에 LICENSE 파일이 없어 오픈소스가 아니라 "소스 공개"입니다. 라이선스 항목에서 **Open Source를 고르지 말고** Proprietary(또는 Freemium만)로 둡니다. 가격은 Freemium.

**Name**
```
Headrule
```

**Website**
```
https://headrule.com/
```

**Short description** (한 줄)
```
Chrome extension to add, set or remove HTTP request and response headers per URL. No account, no analytics. Imports ModHeader exports for free.
```

**Description**
```
Headrule modifies HTTP request and response headers for any URL, directly inside Chrome and other Chromium browsers. It is built for everyday API and frontend work: sending an Authorization token to a staging API, faking a User-Agent or Referer, toggling a feature-flag header, or adding CORS headers while developing locally.

It runs on Chrome's declarativeNetRequest API, so rules are applied by the browser's own request engine. There are no content scripts, no account, no analytics and no remote code. The source is public on GitHub.

Free: unlimited request and response header rules, URL and domain filters, one profile, pause switch, and import and export including ModHeader JSON files.
Pro ($9 once, no subscription): unlimited profiles, regex URL filters, and sync through your own browser account.

Switching from ModHeader: https://headrule.com/modheader-alternative/
```

**Platforms**: Google Chrome, Microsoft Edge(크롬 웹스토어로 설치), Brave, Vivaldi 등 Chromium 계열. 엣지 애드온 스토어에 올리기 전까지는 "Chrome Web Store 설치"로만 적습니다.

**Tags**: `http-headers`, `developer-tools`, `chrome-extension`, `api-testing`, `request-headers`

**Links**: Chrome Web Store https://chromewebstore.google.com/detail/mclcmbfklofongahjpfioipdipbldipp · Source https://github.com/yemoyang9-a11y/headrule

**Screenshots**: `store/screenshot-1-1280x800.png`, `screenshot-2`, `screenshot-3`

**Alternative to**: ModHeader (그리고 원하면 Requestly, Header Editor 에도 대안으로 연결)
