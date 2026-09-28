#!/usr/bin/env python3
"""Package covers for the homepage Clips shelf (mission aom-site:clip-packages).

Each cover is the client's most social moment, set like a YouTube/Reels thumbnail: the frame, a face where
there is one, a huge hook in the client's own type with one phrase on a brand-colour highlight. Logos are NOT
baked in; the card shows the client's logo large in its own header band.

Sources live in sibling repos (AOM-EA, AMBITION). Re-run after swapping a source for a real frame from the
client's finished clip:  python3 build_covers.py  (needs Pillow).  Writes public/home-v4/assets/clips/<slug>/.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

HOME = Path(__file__).resolve().parents[3]
EA = HOME.parent / 'aom-ea'
AMB = HOME.parent / 'AMBITION'
FONTS = EA / '.claude/skills/clip/fonts'
OUT = HOME / 'public/home-v4/assets/clips'
W, H = 1080, 1920


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def fill(im, box=None, focus_x=0.5):
    """Crop `box` from `im` (or all of it), then cover-fit to W x H around focus_x."""
    if box:
        im = im.crop(box)
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = int((im.width - W) * focus_x)
    y = (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def punch(im):
    im = ImageEnhance.Color(im).enhance(1.18)
    return ImageEnhance.Contrast(im).enhance(1.08)


def shade(im, top=0.72, mid=0.0, bottom=0.9, color=(0, 0, 0)):
    """Top and bottom darkening so text reads and the card's name block sits on a calm floor."""
    g = Image.new('L', (1, H))
    for y in range(H):
        t = y / H
        if t < 0.42:
            a = top + (mid - top) * (t / 0.42)
        elif t < 0.62:
            a = mid
        else:
            a = mid + (bottom - mid) * ((t - 0.62) / 0.38)
        g.putpixel((0, y), int(255 * max(0, min(1, a))))
    layer = Image.new('RGB', (W, H), color)
    return Image.composite(layer, im, g.resize((W, H)))


def text_block(d, lines, y, fonts_colors, stroke=10, align='left', x=64, gap=6, hl=None):
    """lines: list of (text, fontname, size, fill, highlight_bg or None). Returns bottom y."""
    for text, fname, size, col, bg in lines:
        f = font(fname, size)
        l, t, r, b = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
        tw, th = r - l, b - t
        tx = x if align == 'left' else (W - tw) // 2
        if bg:
            pad = 18
            d.rounded_rectangle((tx - pad, y - pad // 2, tx + tw + pad, y + th + pad // 2), radius=14, fill=bg)
            d.text((tx - l, y - t), text, font=f, fill=col)
        else:
            d.text((tx - l, y - t), text, font=f, fill=col, stroke_width=stroke, stroke_fill=(0, 0, 0))
        y += th + gap + (18 if bg else 0)
    return y


def face_bubble(canvas, face, center, r, ring):
    face = face.resize((2 * r, 2 * r), Image.LANCZOS)
    mask = Image.new('L', (2 * r, 2 * r), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 2 * r - 1, 2 * r - 1), fill=255)
    cx, cy = center
    d = ImageDraw.Draw(canvas)
    d.ellipse((cx - r - 22, cy - r - 22, cx + r + 22, cy + r + 22), fill=(0, 0, 0))
    d.ellipse((cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14), fill=ring)
    canvas.paste(face, (cx - r, cy - r), mask)


def save(im, slug, name):
    p = OUT / slug / name
    p.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').resize((720, 1280), Image.LANCZOS).save(p, quality=80, optimize=True, progressive=True)
    print('wrote', p.relative_to(HOME), p.stat().st_size // 1024, 'KB')


def oak_street():
    # The fire clip's story as a before/after thumbnail, from the real Oak Street render: the fire, the rebuilt
    # property, Tim's face on the seam, the hook on the brand's forest green.
    src = Image.open(EA / 'corner/users/aom/projects/outreach/clipping-sample/oak-street-brand/current-clip-frame.jpg').convert('RGB')
    im = Image.new('RGB', (W, H), (33, 63, 37))
    fire = punch(src.crop((0, 360, 1080, 1000)))
    after = punch(src.crop((0, 1140, 1080, 1800)))
    im.paste(fire, (0, 600)); im.paste(after, (0, 1240))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 1236, W, 1244), fill=(121, 178, 40))
    y = text_block(d, [
        ('HOW A FIRE', 'RobotoSlab-ExtraBold.ttf', 150, (251, 245, 230), None),
        ('MADE INVESTORS', 'RobotoSlab-ExtraBold.ttf', 104, (251, 245, 230), None),
    ], 90, None, stroke=0)
    text_block(d, [('$1 MILLION', 'RobotoSlab-ExtraBold.ttf', 150, (27, 41, 31), (121, 178, 40))], y + 22, None)
    for label, yy, bg in (('2023: THE FIRE', 640, (200, 45, 40)), ('NOW: BRAND NEW', 1280, (33, 63, 37))):
        text_block(d, [(label, 'Poppins-ExtraBold.ttf', 52, (255, 255, 255), bg)], yy, None)
    face = src.crop((838, 912, 1040, 1114))
    face_bubble(im, face, (860, 1240), 170, (121, 178, 40))
    save(im, 'oak-street', 'cover.jpg')


def ambition():
    # Crane day: the chiller on the hook against the sky. The most shared kind of job-site moment.
    src = Image.open(AMB / 'public/images/ambition/PS520046.jpg').convert('RGB')
    im = punch(fill(src, (600, 0, 1400, 1279), focus_x=0.5))
    im = shade(im, top=0.55, mid=0.0, bottom=0.92, color=(14, 22, 38))
    d = ImageDraw.Draw(im)
    y = text_block(d, [('CRANE DAY.', 'BarlowCondensed-ExtraBold.ttf', 220, (255, 255, 255), None)], 150, None, stroke=10)
    text_block(d, [('NEW CHILLER ON THE HOOK', 'BarlowCondensed-ExtraBold.ttf', 92, (255, 255, 255), (229, 44, 42))], y + 26, None)
    save(im, 'ambition', 'cover.jpg')


def wolfpack():
    # Hydro jetting: techs, water, the truck. Wolfpack's most watchable job.
    src = Image.open(HOME / 'public/wolfpack-site/assets/hero-jetting.jpg').convert('RGB')
    im = punch(fill(src, (300, 0, 900, 952), focus_x=0.5))
    im = shade(im, top=0.7, mid=0.0, bottom=0.92, color=(12, 14, 18))
    d = ImageDraw.Draw(im)
    y = text_block(d, [
        ('SEWER LINE', 'Montserrat-Black.ttf', 132, (255, 255, 255), None),
    ], 160, None, stroke=10)
    text_block(d, [('JETTED CLEAN', 'Montserrat-Black.ttf', 120, (255, 255, 255), (74, 152, 210))], y + 30, None)
    save(im, 'wolfpack', 'cover.jpg')


def kody_logo():
    # Kody has no logo file: KR monogram ring + "Arizona Living" in his headline serif, gold on navy.
    gold, cream = (188, 160, 98), (247, 241, 230)
    f_mono, f_word = font('DMSerifDisplay-Regular.ttf', 78), font('DMSerifDisplay-Regular.ttf', 96)
    tw = ImageDraw.Draw(Image.new('RGB', (1, 1))).textbbox((0, 0), 'Arizona Living', font=f_word)
    im = Image.new('RGBA', (170 + 26 + tw[2] - tw[0] + 8, 170), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, 166, 166), outline=gold, width=5)
    l, t, r, b = d.textbbox((0, 0), 'KR', font=f_mono)
    d.text((85 - (r - l) / 2 - l, 85 - (b - t) / 2 - t), 'KR', font=f_mono, fill=gold)
    d.text((196 - tw[0], 85 - (tw[3] - tw[1]) / 2 - tw[1]), 'Arizona Living', font=f_word, fill=cream)
    p = OUT / 'kody' / 'logo.png'
    im.save(p, optimize=True)
    print('wrote', p.relative_to(HOME))


def kody():
    # Kody's "dry heat" frame already reads as a thumbnail (face + hook); keep it at full resolution.
    src = Image.open(EA / 'corner/users/aom/projects/outreach/missions/clipping-viability/deliverables/kody-proof/kody-look-proof.mp4.still_9.0.png').convert('RGB')
    save(src, 'kody', 'cover.jpg')


if __name__ == '__main__':
    oak_street(); ambition(); wolfpack(); kody(); kody_logo()
