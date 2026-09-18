"""Lemon Squeezy checkout image for Headrule Pro (1600x1200, 4:3)."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
SITE = os.path.join(ROOT, "site")
W, H = 1600, 1200
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


def shadowed(img, radius=16, offset=(0, 22), blur=34, alpha=150):
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

logo = Image.open(os.path.join(STORE, "icon-512.png")).convert("RGBA").resize((96, 96), Image.LANCZOS)
img.paste(logo, (110, 100), logo)
d.text((232, 118), "Headrule", font=ImageFont.truetype(FONT_B, 54), fill=(255, 255, 255))

d.text((110, 268), "Pro", font=ImageFont.truetype(FONT_B, 96), fill=(255, 255, 255))

sub = [
    "Unlimited profiles  ·  Regex URL filters",
    "Import / export  ·  Sync across devices",
]
y = 400
for line in sub:
    d.text((110, y), line, font=ImageFont.truetype(FONT_R, 34), fill=(180, 192, 210))
    y += 52

# Price pill
pill_font = ImageFont.truetype(FONT_B, 34)
label = "$9 once  ·  no subscription"
tw = d.textlength(label, font=pill_font)
px, py = 110, 545
d.rounded_rectangle((px, py, px + tw + 64, py + 74), radius=37, fill=(31, 111, 235))
d.text((px + 32, py + 18), label, font=pill_font, fill=(255, 255, 255))

# Product shot
shot = Image.open(os.path.join(SITE, "screenshot-popup.png")).convert("RGB")
target_h = 458
target_w = round(shot.width * target_h / shot.height)
shot = shot.resize((target_w, target_h), Image.LANCZOS)
card = shadowed(shot)
img.paste(card, ((W - card.width) // 2, 700 - (card.height - target_h) // 2), card)

out = os.path.join(STORE, "product-image-1600x1200.png")
img.save(out, optimize=True)
print(f"wrote {out} ({img.width}x{img.height})")
