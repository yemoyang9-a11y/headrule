# Headrule 런칭 글 모음

크롬 웹스토어 승인이 난 다음에 쓰는 글들입니다. 승인 전에 올리면 설치 링크가 없어서 효과가 없습니다.

아래 `[EXTENSION_URL]` 자리에는 승인 후 받는 웹스토어 주소를 넣으세요. 저에게 확장 ID를 주시면 제가 다 채워서 다시 드리겠습니다.

---

## 0. 올리기 전에 알아 둘 것

**계정 상태.** 레딧은 가입한 지 얼마 안 됐거나 활동 이력이 없는 계정이 링크를 올리면 자동으로 걸러집니다. 올리기 며칠 전부터 관련 서브레딧에서 남의 글에 댓글 몇 개라도 달아 두세요.

**같은 글을 여러 곳에 복사하지 마세요.** 아래 글들을 서로 다르게 써 둔 이유가 그것입니다. 똑같은 문장을 여러 서브레딧에 뿌리면 스팸으로 처리됩니다.

**본인이 만들었다고 밝히세요.** 숨기면 나중에 들켰을 때 훨씬 큰 손해입니다. 아래 글들에는 전부 밝히는 문장이 들어 있습니다.

**ModHeader 이야기를 할 때.** "악성코드였다", "정보를 훔쳤다" 같은 단정은 쓰지 마세요. 확인된 사실은 이렇습니다. 2026년 7월 구글과 마이크로소프트가 스토어에서 내렸고, Stripe OLT라는 보안업체가 확장 안에 숨겨진 데이터 수집 코드가 있다는 분석을 공개했습니다. 그 코드는 비활성 상태였고 실제로 데이터가 전송된 증거는 확인되지 않았다고 보도됐습니다. 아래 글들은 이 선을 지켜서 썼습니다. 남의 제품을 깎아내리는 대신 내 제품이 뭘 안 하는지를 말하는 쪽이 설득력도 더 큽니다.

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
I built this after ModHeader was pulled from the Chrome and Edge stores in July. I used it every day for API work and suddenly had nothing, and the replacements I tried were either abandoned or wanted an account.

Headrule does one thing: add, set or remove HTTP request and response headers, scoped to a URL or domain. It is built on declarativeNetRequest, so it has no content scripts and cannot read page content. There is no account, no analytics and no remote code. The only network call it ever makes is a license check, and only if you buy the paid tier.

Free covers unlimited rules in one profile. A one-time $9 license adds multiple profiles, regex URL filters, import/export (including ModHeader's JSON export) and sync. No subscription.

Source is public: https://github.com/yemoyang9-a11y/headrule

I would especially like feedback on the URL filter syntax and on which rich text editors break the import. Happy to answer anything.
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
When ModHeader disappeared from the store in July I went looking for a replacement and could not find one I trusted. Most of what is left is either unmaintained or asks you to sign in.

So I wrote Headrule. It is a Manifest V3 extension that does one job: add, set or remove HTTP request and response headers, with a URL or domain filter per rule.

A few decisions I made deliberately, and I would like to hear if you disagree:

- declarativeNetRequest only. No content scripts, no background request listener. The extension physically cannot see your page content.
- No account, no analytics, no remote code. The entire source is public.
- The paid tier is a one-time $9 license, not a subscription. Free gives you unlimited rules in one profile.
- It imports ModHeader's JSON export, so if you still have your old export file your profiles carry over.

Install: [EXTENSION_URL]
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

Free tier is unlimited rules in one profile. A one-time $9 license adds profiles, regex filters and import/export. No subscription, no account, no analytics.

Install: [EXTENSION_URL]
Source: https://github.com/yemoyang9-a11y/headrule

Disclosure: I made it. Mostly I am curious how other people solved this in the meantime. Proxy? Editing the code? A different extension I missed?
```

---

## 4. 기존 "ModHeader 대안 있나요" 글에 다는 댓글

레딧이나 HN에서 그런 질문 글을 찾아 답니다. 새 글보다 전환이 좋습니다. 짧게 씁니다.

```
I ended up building one because I could not find a replacement I trusted. Headrule, Manifest V3, declarativeNetRequest only, no account and no analytics, source is public. Free tier covers unlimited rules. It also imports ModHeader's JSON export if you still have yours.

[EXTENSION_URL]

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
Pro: $9 once, no subscription. Unlimited profiles, regex filters, import/export including ModHeader files, and sync.
```

**Maker's first comment**
```
Hi everyone. I am a solo developer and I built Headrule because the header extension I relied on every day was removed from the Chrome and Edge stores in July, after a security firm published an analysis of hidden data-collection code in it.

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

For a lot of people that extension was ModHeader. In July 2026 it was removed from both the Chrome Web Store and the Edge Add-ons store, after the UK security firm Stripe OLT published an analysis reporting hidden data-collection code inside it. Reporting at the time noted the collector was dormant and that no evidence emerged of data actually being transmitted, but the extension is gone either way, and if you had rules saved in it they went with it.

This post covers what changed, what your options are, and how to get your header rules working again.

## Why this happened at all

Header modification used to be built on the blocking `webRequest` API, which let an extension intercept every request, inspect it, and rewrite it in JavaScript. That is enormously powerful and enormously hard to audit, because nothing about the API forces the extension to limit itself to headers.

Manifest V3 removed blocking `webRequest` for most extensions and replaced it with `declarativeNetRequest`. The difference matters more than it sounds. With declarativeNetRequest, an extension hands Chrome a list of rules and Chrome applies them itself. The extension never sees the request. It cannot log your URLs from that API, because it never receives them.

That is a real security improvement, and it is also why a header tool written today can be meaningfully more trustworthy than one written in 2019.

## What to look for in a replacement

Whatever you pick, check three things before you install it.

**Does it need an account?** A header modifier has no reason to know who you are. If it asks you to sign in, ask yourself what it is syncing and where.

**What permissions does it request?** A declarativeNetRequest-based tool needs `declarativeNetRequest`, `storage`, and host access. If it also asks for `webRequest`, `scripting`, or `tabs`, it is doing more than headers.

**Is the source available?** You cannot audit a minified bundle. You can audit a public repository.

## Moving your rules

If you still have ModHeader installed somewhere, or you exported your profiles at some point, you have a JSON file with your rules in it. That file is worth keeping. Several replacements can read it, including the one I built.

If you never exported, your rules are gone and you will be retyping them. Sorry. Export early next time.

## The tool I built

Full disclosure: after failing to find a replacement I trusted, I wrote one. It is called [Headrule]([EXTENSION_URL]) and the [source is public](https://github.com/yemoyang9-a11y/headrule).

It does one thing. Add, set or remove request and response headers, scoped by URL. Rules apply the moment you type them, with no page reload, because they go straight into Chrome's own request engine.

What it deliberately does not do: no account, no analytics, no crash reporting, no remote code, no content scripts. The only network request it makes on its own is a license check, and only if you buy the paid tier.

Free covers unlimited rules with URL filters in one profile. Pro is nine dollars once, not a subscription, and adds multiple profiles, regex URL filters, import and export including ModHeader files, and sync across your Chrome devices.

## Things that will trip you up

A few Chrome rules that surprise people, regardless of which extension you use.

**Append only works on a handful of request headers.** Chrome permits appending to `Accept`, `Accept-Language`, `Cache-Control`, `Cookie`, `User-Agent`, `X-Forwarded-For` and a few others. For anything else you have to use set. Response headers can be appended freely.

**Some headers cannot be touched at all.** `Host` is the obvious one. Chrome refuses for security reasons.

**Extensions can collide.** If two extensions both modify the same header, the one with higher priority wins and the other silently does nothing. If a rule is not applying, check whether something else is also modifying it.

**Host permissions are all or nothing.** A rule with an empty URL filter has to apply everywhere, so the extension has to ask for access to all sites. Chrome's permission model does not offer a middle ground here. That is worth knowing when you evaluate the scary-looking install prompt.

## Closing

The removal was a nuisance, but the underlying shift is good. A header tool built on declarativeNetRequest genuinely cannot do the thing that got the old one pulled. If you are picking a replacement, that is the property worth optimizing for.
```

---

## 7. 올린 다음에 할 일

첫 24시간 동안 댓글에 답하세요. 이게 전환율을 크게 바꿉니다. 특히 HN과 Product Hunt는 작성자가 성실하게 답하면 순위가 올라갑니다.

부정적인 댓글이 달려도 방어하지 마세요. "좋은 지적입니다, 고치겠습니다" 한 줄이 논쟁보다 훨씬 낫습니다. 실제로 고칠 수 있는 건 저에게 가져오시면 됩니다.

버그 제보가 오면 그대로 저에게 붙여 넣으세요. 고쳐서 새 버전을 올리는 건 명령 세 줄이면 끝납니다.
