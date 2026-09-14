"""Compose Chrome Web Store screenshots (1280x800) from raw UI captures."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
W, H = 1280, 800
BG_TOP, BG_BOT = (13, 17, 23), (22, 34, 60)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# test/smoke.mjs captures raw-*.png at this device pixel ratio (SHOT_SCALE)
# so screenshots stay crisp on retina displays. Crop thresholds below are
# written in logical (1x) pixels, then multiplied by RAW_SCALE and the
# cropped raw image is downsampled back to logical size with LANCZOS -- this
# keeps every layout number in this file unchanged while getting a sharper,
# supersampled result than capturing at 1x directly.
RAW_SCALE = 3


def load_raw_logical(name, crop_box):
    """Open a hi-res raw capture, crop with logical-pixel coords, then
    downsample by RAW_SCALE to the original logical size for antialiasing."""
    img = Image.open(os.path.join(STORE, name)).convert("RGB")
    x0, y0, x1, y1 = crop_box
    box = (x0 * RAW_SCALE, y0 * RAW_SCALE, min(x1, img.width // RAW_SCALE) * RAW_SCALE, min(y1, img.height // RAW_SCALE) * RAW_SCALE)
    img = img.crop(box)
    return img.resize((img.width // RAW_SCALE, img.height // RAW_SCALE), Image.LANCZOS)


def background():
    img = Image.new("RGB", (W, H), BG_TOP)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        d.line((0, y, W, y), fill=tuple(int(BG_TOP[i] * (1 - t) + BG_BOT[i] * t) for i in range(3)))
    return img


def shadowed(img, radius=14, offset=(0, 18), blur=28, alpha=140):
    """Return an RGBA canvas with a soft shadow behind a rounded image."""
    pad = blur * 2
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((pad + offset[0], pad + offset[1], pad + img.width + offset[0], pad + img.height + offset[1]), radius=radius, fill=(0, 0, 0, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur // 2))
    canvas.alpha_composite(shadow)
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
    rounded = Image.new("RGBA", img.size, (0, 0, 0, 0))
    rounded.paste(img.convert("RGBA"), (0, 0), mask)
    canvas.alpha_composite(rounded, (pad, pad))
    return canvas


def text_block(d, x, y, title, sub, title_size=44, sub_size=22, max_w=560):
    ft = ImageFont.truetype(FONT_B, title_size)
    fs = ImageFont.truetype(FONT_R, sub_size)
    yy = y
    for line in title.split("\n"):
        d.text((x, yy), line, font=ft, fill=(255, 255, 255))
        yy += title_size + 10
    yy += 8
    for line in sub.split("\n"):
        d.text((x, yy), line, font=fs, fill=(190, 200, 215))
        yy += sub_size + 10


def shot_popup():
    img = background()
    d = ImageDraw.Draw(img)
    text_block(d, 80, 120, "Modify any HTTP header.", "Set, append or remove request and response\nheaders. Scope each rule to a URL or domain.\nRules apply instantly, no reload needed.")
    raw = load_raw_logical("raw-popup.png", (0, 0, 680, 262))
    scale = 0.95
    raw = raw.resize((int(raw.width * scale), int(raw.height * scale)), Image.LANCZOS)
    card = shadowed(raw)
    img.paste(card, (W - card.width + 40, 250), card)
    logo = Image.open(os.path.join(STORE, "icon-512.png")).resize((56, 56), Image.LANCZOS)
    img.paste(logo, (80, 48), logo)
    d.text((150, 58), "Headrule", font=ImageFont.truetype(FONT_B, 30), fill=(255, 255, 255))
    img.save(os.path.join(STORE, "screenshot-1-1280x800.png"))


def shot_privacy():
    img = background()
    d = ImageDraw.Draw(img)
    logo = Image.open(os.path.join(STORE, "icon-512.png")).resize((160, 160), Image.LANCZOS)
    img.paste(logo, (W // 2 - 80, 150), logo)
    ft = ImageFont.truetype(FONT_B, 50)
    fs = ImageFont.truetype(FONT_R, 24)
    title = "No accounts. No tracking. No remote code."
    tw = d.textlength(title, font=ft)
    d.text(((W - tw) / 2, 350), title, font=ft, fill=(255, 255, 255))
    lines = [
        "Built on Chrome's declarativeNetRequest API, so Headrule never reads page content.",
        "Nothing leaves your browser. Rules are stored locally and optionally synced by Chrome.",
        "Pause everything with one switch or Alt+Shift+H.",
    ]
    y = 440
    for line in lines:
        lw = d.textlength(line, font=fs)
        d.text(((W - lw) / 2, y), line, font=fs, fill=(190, 200, 215))
        y += 40
    img.save(os.path.join(STORE, "screenshot-2-1280x800.png"))


def shot_options():
    img = background()
    d = ImageDraw.Draw(img)
    text_block(d, 80, 120, "Pro: profiles, import,\nsync. One payment.", "Switch between staging, production and client\nprofiles. Import your ModHeader export in one\nclick. Regex URL filters. No subscription.", title_size=40)
    raw = load_raw_logical("raw-options.png", (80, 0, 900 - 80, 600))
    scale = 0.78
    raw = raw.resize((int(raw.width * scale), int(raw.height * scale)), Image.LANCZOS)
    card = shadowed(raw)
    img.paste(card, (W - card.width + 30, 150), card)
    img.save(os.path.join(STORE, "screenshot-3-1280x800.png"))


shot_popup()
shot_privacy()
shot_options()
print("store screenshots written")
