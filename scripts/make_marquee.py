"""Chrome Web Store marquee promo tile (1400x560)."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
SITE = os.path.join(ROOT, "site")
W, H = 1400, 560
BG_TOP, BG_BOT = (13, 17, 23), (22, 34, 60)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def background():
    img = Image.new("RGB", (W, H), BG_TOP)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        d.line((0, y, W, y), fill=tuple(int(BG_TOP[i] * (1 - t) + BG_BOT[i] * t) for i in range(3)))
    return img


def shadowed(img, radius=14, offset=(0, 18), blur=30, alpha=150):
    pad = blur * 2
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (pad + offset[0], pad + offset[1], pad + img.width + offset[0], pad + img.height + offset[1]),
        radius=radius, fill=(0, 0, 0, alpha))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(blur // 2)))
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
    rounded = Image.new("RGBA", img.size, (0, 0, 0, 0))
    rounded.paste(img.convert("RGBA"), (0, 0), mask)
    canvas.alpha_composite(rounded, (pad, pad))
    return canvas


img = background()
d = ImageDraw.Draw(img)

logo = Image.open(os.path.join(STORE, "icon-512.png")).convert("RGBA").resize((64, 64), Image.LANCZOS)
img.paste(logo, (80, 74), logo)
d.text((164, 88), "Headrule", font=ImageFont.truetype(FONT_B, 38), fill=(255, 255, 255))

# Right half holds the product shot; size it first so the text can be
# fitted to whatever width is actually left.
shot = Image.open(os.path.join(SITE, "screenshot-popup.png")).convert("RGB")
target_w = 600
shot = shot.resize((target_w, round(shot.height * target_w / shot.width)), Image.LANCZOS)
card = shadowed(shot)
card_x = W - card.width + 40
img.paste(card, (card_x, (H - card.height) // 2), card)

LEFT = 80
avail = card_x + 60 - LEFT - 40  # visible card edge, minus a gutter

headline = ["Modify HTTP headers", "in Chrome."]
size = 54
while size > 28:
    f = ImageFont.truetype(FONT_B, size)
    if max(d.textlength(l, font=f) for l in headline) <= avail:
        break
    size -= 2
f = ImageFont.truetype(FONT_B, size)
y = 196
for line in headline:
    d.text((LEFT, y), line, font=f, fill=(255, 255, 255))
    y += size + 10

sub = ["Set, append or remove request and", "response headers per URL. No tracking."]
ssize = 24
while ssize > 14:
    fs = ImageFont.truetype(FONT_R, ssize)
    if max(d.textlength(l, font=fs) for l in sub) <= avail:
        break
    ssize -= 1
fs = ImageFont.truetype(FONT_R, ssize)
y += 18
for line in sub:
    d.text((LEFT, y), line, font=fs, fill=(178, 190, 208))
    y += ssize + 12

label = "A clean ModHeader alternative"
psize = 23
while psize > 14:
    pf = ImageFont.truetype(FONT_B, psize)
    if d.textlength(label, font=pf) + 48 <= avail:
        break
    psize -= 1
pf = ImageFont.truetype(FONT_B, psize)
tw = d.textlength(label, font=pf)
py = y + 16
d.rounded_rectangle((LEFT, py, LEFT + tw + 48, py + psize + 28), radius=(psize + 28) // 2, fill=(31, 111, 235))
d.text((LEFT + 24, py + 14), label, font=pf, fill=(255, 255, 255))

out = os.path.join(STORE, "promo-marquee-1400x560.png")
img.save(out, optimize=True)
print(f"wrote {out} ({img.width}x{img.height})")
