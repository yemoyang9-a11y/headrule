# Headrule

Modify HTTP request and response headers in Chrome. Manifest V3, built on `declarativeNetRequest`, no content scripts, no telemetry.

```
extension/        the unpacked extension (load this folder at chrome://extensions)
  manifest.json
  background.js   syncs rules -> declarativeNetRequest dynamic rules, badge, license re-check
  lib/            config (edit IDs/URLs here), storage schema, rule translation, license API
  popup/          rule editor
  options/        license activation, import/export, settings
site/             static landing page + privacy policy (GitHub Pages)
store/            Chrome Web Store listing copy, icons, screenshots
test/smoke.mjs    end-to-end test in real Chromium (headers actually change)
scripts/          icons, screenshots, zip, version bump
.github/          CI, tag-triggered store release, Pages deploy
```

## Develop

```
npm install                 # playwright (test only)
npm test                    # loads the extension in Chromium and checks headers really change
npm run shots               # regenerate store screenshots
npm run zip                 # dist/headrule-<version>.zip
node scripts/bump.mjs 1.0.1 # bump version everywhere
```

Load unpacked: `chrome://extensions` → Developer mode → Load unpacked → `extension/`.

## Release

1. `node scripts/bump.mjs X.Y.Z`
2. `git commit -am "vX.Y.Z" && git tag vX.Y.Z && git push && git push --tags`
3. The `release.yml` workflow runs the smoke test, zips, uploads to the Chrome Web Store and submits for review.

## Configuration

`extension/lib/config.js` holds the Lemon Squeezy store/product IDs, the checkout URL, the site URL and the free-tier limits. `site/index.html` has two placeholders to replace: the Chrome Web Store link and the checkout link.

## License

Source-available for audit. Copyright the author. You may read and build it for personal use; redistribution of the extension or its Pro features is not permitted.
