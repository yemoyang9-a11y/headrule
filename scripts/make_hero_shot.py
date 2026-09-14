"""Compose the landing-page hero screenshot (site/screenshot-popup.png).

Wraps the raw popup capture in a small fake browser toolbar (address pill +
extension icon row) so it reads as a real product shot instead of a bare
pasted screenshot, and renders it from the hi-res raw-popup.png captured at
SHOT_SCALE in test/smoke.mjs so it stays crisp on retina displays.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
SITE = os.path.join(ROOT, "site")
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

SHOT_SCALE = 3          # must match test/smoke.mjs deviceScaleFactor
OUT_SCALE = 2           # final export density (2x is enough for retina)
LOGICAL_W = 680
LOGICAL_CONTENT_H = 262  # same popup crop height used by make_screenshots.py
TOOLBAR_H = 42           # logical px


def rounded(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def lock_icon(draw, cx, cy, s, color):
    """Tiny padlock glyph drawn from primitives (no emoji font needed)."""
    body = (cx - s, cy - s * 0.2, cx + s, cy + s * 1.1)
    draw.rounded_rectangle(body, radius=s * 0.25, fill=color)
    draw.arc((cx - s * 0.7, cy - s * 1.6, cx + s * 0.7, cy - s * 0.1), 180, 360, fill=color, width=max(1, int(s * 0.35)))


def build():
    raw = Image.open(os.path.join(STORE, "raw-popup.png")).convert("RGB")
    content = raw.crop((0, 0, LOGICAL_W * SHOT_SCALE, min(raw.height, LOGICAL_CONTENT_H * SHOT_SCALE)))

    s = SHOT_SCALE
    canvas_w = content.width
    toolbar_h = TOOLBAR_H * s
    canvas_h = toolbar_h + content.height
    canvas = Image.new("RGB", (canvas_w, canvas_h), "#ffffff")
    d = ImageDraw.Draw(canvas)

    # Toolbar background + hairline separator.
    d.rectangle((0, 0, canvas_w, toolbar_h), fill=(246, 247, 249))
    d.line((0, toolbar_h - 1, canvas_w, toolbar_h - 1), fill=(222, 225, 230), width=max(1, s // 3))

    # Fake address pill on the left, roughly matching a real Chrome toolbar.
    pill_pad = 16 * s
    pill_h = 24 * s
    pill_top = (toolbar_h - pill_h) // 2
    pill_right = canvas_w - 132 * s
    rounded(d, (pill_pad, pill_top, pill_right, pill_top + pill_h), radius=pill_h // 2, fill=(233, 236, 239))
    lock_icon(d, pill_pad + 20 * s, toolbar_h // 2, 3.4 * s, (120, 128, 138))
    font_addr = ImageFont.truetype(FONT_R, int(11 * s))
    d.text((pill_pad + 34 * s, toolbar_h // 2 - int(6.5 * s)), "app.example.com", font=font_addr, fill=(90, 98, 108))

    # A couple of neutral "other extension" icon slots, then Headrule active.
    icon = 22 * s
    gap = 14 * s
    x = canvas_w - pill_pad - icon
    for _ in range(2):
        rounded(d, (x, toolbar_h // 2 - icon // 2, x + icon, toolbar_h // 2 + icon // 2), radius=6 * s, fill=(223, 226, 230))
        x -= icon + gap

    # Headrule icon, highlighted as the "active / just clicked" one, with a
    # caret pointing down into the popup to sell the dropdown illusion.
    hi_pad = 6 * s
    hi_box = (x - hi_pad, toolbar_h // 2 - icon // 2 - hi_pad, x + icon + hi_pad, toolbar_h // 2 + icon // 2 + hi_pad)
    rounded(d, hi_box, radius=8 * s, fill=(224, 236, 253))
    logo_path = os.path.join(STORE, "icon-512.png")
    logo = Image.open(logo_path).convert("RGBA").resize((icon, icon), Image.LANCZOS)
    canvas.paste(logo, (x, toolbar_h // 2 - icon // 2), logo)

    # The actual popup UI, unmodified, directly under the toolbar.
    canvas.paste(content, (0, toolbar_h))

    # Small notch under the active icon, drawn on top of the popup's top
    # edge -- the same visual trick real browsers use to connect an open
    # popup back to the toolbar icon that spawned it.
    caret_cx = x + icon // 2
    caret_y = toolbar_h - 1
    caret_r = 6 * s
    d.polygon([(caret_cx - caret_r, caret_y), (caret_cx + caret_r, caret_y), (caret_cx, caret_y + caret_r)], fill=(224, 236, 253))

    # A hairline border around the whole thing reads better once downsized.
    ImageDraw.Draw(canvas).rectangle((0, 0, canvas_w - 1, canvas_h - 1), outline=(215, 218, 222), width=max(1, s // 3))

    out = canvas.resize((canvas_w * OUT_SCALE // s, canvas_h * OUT_SCALE // s), Image.LANCZOS)
    out_path = os.path.join(SITE, "screenshot-popup.png")
    out.save(out_path, optimize=True)
    print(f"wrote {out_path} ({out.width}x{out.height})")


build()
