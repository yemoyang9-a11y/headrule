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
support@headrule.com · Privacy policy: https://headrule.com/privacy.html

Headrule is an independent project and is not affiliated with Google or with ModHeader.

**Icon**: store/store-icon-128.png (128×128)
**Screenshots** (1280×800): store/screenshot-1-1280x800.png, screenshot-2-1280x800.png, screenshot-3-1280x800.png
**Small promo tile** (440×280): store/promo-small-440x280.png

## Privacy practices tab

**Single purpose description**
Headrule has a single purpose: it lets the user define rules that add, modify or remove HTTP request and response headers for URLs the user chooses. Every part of the interface exists to create, scope, enable or disable those header rules. The extension does nothing else.

**Permission justifications**

declarativeNetRequest
This is the API that performs the extension's only function. The header rules the user creates are converted into declarativeNetRequest dynamic rules so that Chrome's own network stack applies them. Without this permission the extension cannot modify any header and has no purpose.

storage
Stores the user's header rules, profiles and settings locally so they persist between browser sessions. chrome.storage.sync is used only when the user explicitly enables the sync option, to carry the same rules to their other Chrome devices. Nothing is sent to any server of ours.

alarms
Schedules a weekly background re-validation of a paid Pro license key against the Lemon Squeezy license API. This is the only scheduled task in the extension and it runs at most once per week. Users who never buy Pro never trigger it.

Host permission (<all_urls>)
A header rule with an empty URL filter must apply to every request the user makes, so the extension needs the broad host permission in order to register such rules. The permission is used for one thing only: scoping declarativeNetRequest rules. Headrule has no content scripts, never injects code into pages, never reads page content, tab URLs or browsing history, and makes no network request of its own apart from the Pro license check.

**Remote code**: Select "No, I am not using remote code." The extension ships every line of code it runs inside the package.

**Data usage**: Check none of the data-collection categories, then certify all three statements (no sale to third parties, no use unrelated to the single purpose, no use to determine creditworthiness or for lending).

**Privacy policy URL**: https://headrule.com/privacy.html

## Distribution
Visibility: Public · Regions: All regions · Pricing: Free (Pro is sold outside the store via Lemon Squeezy; this is allowed as long as the listing says so)
