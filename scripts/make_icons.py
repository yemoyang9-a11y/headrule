"""Generate Headrule icons (extension + store) with PIL. No external assets."""
from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "extension", "icons")
STORE_DIR = os.path.join(ROOT, "store")
os.makedirs(ICON_DIR, exist_ok=True)
os.makedirs(STORE_DIR, exist_ok=True)

BLUE = (31, 111, 235, 255)
BLUE_DARK = (18, 78, 172, 255)
WHITE = (255, 255, 255, 255)


def glyph(size: int, scale: int = 8) -> Image.Image:
    """Draw at high resolution then downsample for clean edges."""
    S = size * scale
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(S * 0.22)
    # vertical gradient background clipped to a rounded square
    grad = Image.new("RGBA", (S, S), BLUE)
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        t = y / max(S - 1, 1)
        col = tuple(int(BLUE[i] * (1 - t) + BLUE_DARK[i] * t) for i in range(3)) + (255,)
        gd.line((0, y, S, y), fill=col)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=r, fill=255)
    img.paste(grad, (0, 0), mask)
    # "H" made of three bars
    pad = int(S * 0.22)
    bar = int(S * 0.13)
    top, bottom = pad, S - pad
    d.rounded_rectangle((pad, top, pad + bar, bottom), radius=bar // 3, fill=WHITE)
    d.rounded_rectangle((S - pad - bar, top, S - pad, bottom), radius=bar // 3, fill=WHITE)
    mid = S // 2
    d.rounded_rectangle((pad, mid - bar // 2, S - pad, mid + bar // 2), radius=bar // 3, fill=WHITE)
    # small "rule" tick on the crossbar to hint at rules/switch
    d.ellipse((mid - bar * 0.55, mid - bar * 0.55, mid + bar * 0.55, mid + bar * 0.55), fill=BLUE)
    d.ellipse((mid - bar * 0.3, mid - bar * 0.3, mid + bar * 0.3, mid + bar * 0.3), fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


for s in (16, 32, 48, 128):
    glyph(s).save(os.path.join(ICON_DIR, f"icon{s}.png"))

# Chrome Web Store guideline: 96x96 artwork centred inside a 128x128
# canvas with 16px of transparent padding on every side.
_store = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
_store.paste(glyph(96), (16, 16), glyph(96))
_store.save(os.path.join(STORE_DIR, "store-icon-128.png"))
glyph(512).save(os.path.join(STORE_DIR, "icon-512.png"))

# Small promo tile 440x280
tile = Image.new("RGBA", (440, 280), (13, 17, 23, 255))
d = ImageDraw.Draw(tile)
logo = glyph(96)
tile.alpha_composite(logo, (40, 92))
try:
    from PIL import ImageFont
    font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    font_r = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 17)
except Exception:
    font_b = font_r = None
d.text((160, 98), "Headrule", fill=WHITE, font=font_b)
d.text((160, 152), "Modify HTTP headers.", fill=(200, 210, 220, 255), font=font_r)
d.text((160, 176), "No accounts. No tracking.", fill=(200, 210, 220, 255), font=font_r)
tile.convert("RGB").save(os.path.join(STORE_DIR, "promo-small-440x280.png"))
print("icons written")
