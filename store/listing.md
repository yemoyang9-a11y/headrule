# Chrome Web Store listing (copy-paste into the Developer Dashboard)

## Store listing

**Name** (max 75)
Headrule - Modify HTTP Request & Response Headers

**Summary** (max 132 characters)
Add, set or remove HTTP headers per URL. Profiles, instant apply, no accounts, no tracking. A clean ModHeader alternative.

**Category**
Developer Tools

**Language**
English

**Description**

Headrule modifies HTTP request and response headers for any URL, directly inside Chrome. It is built for the everyday jobs of API and frontend developers: sending an Authorization token to a staging API, faking a User-Agent or Referer, toggling a feature-flag header, or adding CORS headers while you develop locally.

WHAT IT DOES
• Set, append or remove any request or response header
• Scope each rule to a domain (||api.example.com), a URL prefix, or a regular expression
• Rules apply instantly, no page reload
• Profiles for staging, production, client work, CORS debugging
• One switch (or Alt+Shift+H) pauses every rule
• The toolbar badge shows how many rules are live
• Clear error messages when Chrome cannot apply a rule

WHY HEADRULE
Headrule uses Chrome's declarativeNetRequest API. Your rules are handed to the browser's own request engine, which means no background script reading your traffic, no content scripts, and no way for the extension to see page content. There is no account, no analytics and no remote code. The only network request it ever makes is the license check when you activate Pro.

SWITCHING FROM MODHEADER
ModHeader was removed from the Chrome and Edge stores in July 2026. Headrule imports ModHeader JSON exports (request headers, response headers, enabled states, comments) so you can carry your profiles over in one click.

FREE AND PRO
Free: unlimited request and response rules, URL filters, one profile, pause switch. Pro ($9, one payment, no subscription): unlimited profiles, regex URL filters, import/export, and sync across your Chrome devices.

WORKS WITH
Chrome, Edge, Brave, Arc and other Chromium browsers.

SUPPORT
yemoyang9@gmail.com · Privacy policy: https://yemoyang9-a11y.github.io/headrule/privacy.html

Headrule is an independent project and is not affiliated with Google or with ModHeader.

**Icon**: store/store-icon-128.png (128×128)
**Screenshots** (1280×800): store/screenshot-1-1280x800.png, screenshot-2-1280x800.png, screenshot-3-1280x800.png
**Small promo tile** (440×280): store/promo-small-440x280.png

## Privacy practices tab

**Single purpose description**
Headrule lets the user define rules that add, modify or remove HTTP request and response headers for chosen URLs.

**Permission justifications**
- declarativeNetRequest: Required to modify request and response headers; this is the extension's only function.
- storage: Saves the user's header rules and profiles locally (and in chrome.storage.sync when the user enables sync).
- alarms: Schedules a weekly re-validation of the user's Pro license key.
- Host permission (<all_urls>): A header rule with an empty URL filter must apply to every request the user makes. The extension does not read page content and has no content scripts.

**Remote code**: No, I am not using remote code.

**Data usage**: Check none of the data-collection boxes. Certify all three statements (no sale, no unrelated use, no creditworthiness use).

**Privacy policy URL**: https://yemoyang9-a11y.github.io/headrule/privacy.html

## Distribution
Visibility: Public · Regions: All regions · Pricing: Free (Pro is sold outside the store via Lemon Squeezy; this is allowed as long as the listing says so)
