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


H2 = 2340  # phone screen (9:19.5). Cards are phones, so covers are drawn at phone proportions.


def cover_fit(im, w, h, focus_x=0.5, focus_y=0.5):
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = int((im.width - w) * focus_x), int((im.height - h) * focus_y)
    return im.crop((x, y, x + w, y + h))


def fit_text(d, text, fname, max_w, start, stroke=0):
    size = start
    while size > 20:
        f = font(fname, size)
        l, t, r, b = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
        if r - l <= max_w:
            return f, (l, t, r, b)
        size -= 4
    return font(fname, size), d.textbbox((0, 0), text, font=font(fname, size))


def paste_logo(canvas, path, box_h, center=None, left=None, top=0):
    lg = Image.open(path).convert('RGBA')
    lg = lg.crop(lg.getbbox())
    w = round(lg.width * box_h / lg.height)
    lg = lg.resize((w, box_h), Image.LANCZOS)
    x = left if left is not None else center - w // 2
    canvas.paste(lg, (x, top), lg)
    return w


def save2(im, slug):
    p = OUT / slug / 'cover.jpg'
    im.convert('RGB').resize((720, 1560), Image.LANCZOS).save(p, quality=80, optimize=True, progressive=True)
    print('wrote', p.relative_to(HOME), p.stat().st_size // 1024, 'KB')


def ambition():
    # Ambition's GPT reel system (brand-kits/ambition-mechanical/templates/reel-slab-window): halftone navy plate,
    # red torn-paper title strip, footage in the window. Badge sits on the seam like a sticker.
    T = EA / '.claude/skills/clip/brand-kits/ambition-mechanical/templates/reel-slab-window_plate.png'
    plate = Image.open(T).convert('RGBA')
    plate = plate.resize((W, round(plate.height * W / plate.width)), Image.LANCZOS)   # 1080 x 1974
    top = 120
    band = plate.crop((0, 0, W, 434))
    im = Image.new('RGB', (W, H2), (14, 22, 38))
    photo = punch(cover_fit(Image.open(AMB / 'public/images/ambition/PS520046.jpg').convert('RGB'), W, H2 - (top + 434), 0.5, 0.35))
    im.paste(photo, (0, top + 434))
    texture = plate.crop((0, 0, W, top)).transpose(Image.FLIP_TOP_BOTTOM)
    im.paste(texture, (0, 0), texture)
    im.paste(band, (0, top), band)
    d = ImageDraw.Draw(im)
    # strip in the plate spans ~x 50-880, y 40-160 (scaled); set the hook on it
    f, (l, t, r, b) = fit_text(d, 'CRANE DAY', 'BarlowCondensed-ExtraBold.ttf', 760, 150)
    d.text((70 - l, top + 100 - (b - t) // 2 - t), 'CRANE DAY', font=f, fill=(255, 255, 255))
    f2 = font('BarlowCondensed-ExtraBold.ttf', 84)
    d.text((64, top + 250), 'NEW CHILLER ON THE HOOK', font=f2, fill=(255, 255, 255), stroke_width=4, stroke_fill=(14, 22, 38))
    badge = Image.open(EA / '.claude/skills/clip/brand-kits/ambition-mechanical/logo-badge.png').convert('RGBA').resize((330, 330), Image.LANCZOS)
    bx, by = 1080 - 56 - 330, top + 434 + 60   # sticker on the footage, just under the seam
    d.ellipse((bx - 12, by - 12, bx + 342, by + 342), fill=(14, 22, 38))
    im.paste(badge, (bx, by), badge)
    save2(im, 'ambition')


def wolfpack():
    # Wolfpack's own look (site + GPT posts): paper ground, heavy dark type, one phrase in the logo's blue,
    # full-colour logo as the masthead, job photo filling the lower screen.
    ink, blue, paper = (12, 14, 18), (47, 128, 196), (242, 241, 236)
    im = Image.new('RGB', (W, H2), paper)
    d = ImageDraw.Draw(im)
    lw = paste_logo(im, HOME / 'public/wolfpack-site/assets/wolfpack-logo.png', 330, left=64, top=150)
    lab = font('Inter-SemiBold.ttf', 34)
    for i, line in enumerate(('SERVICE CALL', 'PHOENIX, AZ')):
        d.text((64 + lw + 40, 360 + i * 50), line, font=lab, fill=(90, 94, 102))
    d.rectangle((64, 540, W - 64, 546), fill=ink)
    f, (l, t, r, b) = fit_text(d, 'SEWER LINE', 'ArchivoBlack-Regular.ttf', W - 128, 170)
    d.text((64 - l, 600 - t), 'SEWER LINE', font=f, fill=ink)
    y = 600 + (b - t) + 26
    f2, (l2, t2, r2, b2) = fit_text(d, 'JETTED CLEAN.', 'ArchivoBlack-Regular.ttf', W - 128, 170)
    d.text((64 - l2, y - t2), 'JETTED CLEAN.', font=f2, fill=blue)
    py = y + (b2 - t2) + 70
    photo = punch(cover_fit(Image.open(HOME / 'public/wolfpack-site/assets/hero-jetting.jpg').convert('RGB'), W, H2 - py, 0.42, 0.5))
    im.paste(photo, (0, py))
    save2(im, 'wolfpack')


def oak_street():
    # The fire clip as it plays (real frame from the Oak Street render): logo masthead, slab-serif hook, the fire,
    # the rebuilt property, Tim's face on the seam.
    src = Image.open(EA / 'corner/users/aom/projects/outreach/clipping-sample/oak-street-brand/current-clip-frame.jpg').convert('RGB')
    green, lime, cream = (33, 63, 37), (121, 178, 40), (251, 245, 230)
    im = Image.new('RGB', (W, H2), green)
    d = ImageDraw.Draw(im)
    paste_logo(im, EA / 'corner/users/aom/projects/outreach/clipping-sample/oak-street-brand/logo-for-dark-bg.png', 250, center=W // 2, top=120)
    y = text_block(d, [
        ('HOW A FIRE', 'RobotoSlab-ExtraBold.ttf', 150, cream, None),
        ('MADE INVESTORS', 'RobotoSlab-ExtraBold.ttf', 104, cream, None),
    ], 440, None, stroke=0)
    y = text_block(d, [('$1 MILLION', 'RobotoSlab-ExtraBold.ttf', 150, (27, 41, 31), lime)], y + 22, None)
    fy = y + 60
    im.paste(punch(src.crop((0, 360, 1080, 1000))), (0, fy))
    ay = fy + 640
    im.paste(punch(src.crop((0, 1140, 1080, 1800))), (0, ay))   # stop above the render's own bottom caption
    d.rectangle((0, ay - 4, W, ay + 4), fill=lime)
    for label, yy, bg in (('2023: THE FIRE', fy + 40, (200, 45, 40)), ('NOW: BRAND NEW', ay + 40, green)):
        text_block(d, [(label, 'Poppins-ExtraBold.ttf', 52, (255, 255, 255), bg)], yy, None)
    face_bubble(im, src.crop((838, 912, 1040, 1114)), (860, ay), 170, lime)
    save2(im, 'oak-street')


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


KODY_TOP = 420  # the card overlays Kody's looping clip at this offset (KODY_TOP / H2 of the screen)


def kody():
    # Kody's real "dry heat" frame under an Arizona Living masthead (his wordmark on his navy).
    src = Image.open(EA / 'corner/users/aom/projects/outreach/missions/clipping-viability/deliverables/kody-proof/kody-look-proof.mp4.still_9.0.png').convert('RGB')
    navy = src.getpixel((20, 20))
    im = Image.new('RGB', (W, H2), navy)
    im.paste(src, (0, KODY_TOP))
    paste_logo(im, OUT / 'kody' / 'logo.png', 128, center=W // 2, top=190)
    d = ImageDraw.Draw(im)
    d.line((W // 2 - 140, KODY_TOP - 40, W // 2 + 140, KODY_TOP - 40), fill=(188, 160, 98), width=3)
    save2(im, 'kody')


def avatars():
    # Round account avatars for the card's Instagram-style account row.
    def ring(img, bg, name):
        S = 240
        av = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).ellipse((0, 0, S - 1, S - 1), fill=255)
        disc = Image.new('RGBA', (S, S), bg + (255,))
        av.paste(disc, (0, 0), m)
        if img is not None:
            img = img.crop(img.getbbox()); k = 0.72 * S / max(img.size)
            img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
            av.paste(img, ((S - img.width) // 2, (S - img.height) // 2), img)
        av.save(OUT / name / 'avatar.png', optimize=True)
        return av
    badge = Image.open(EA / '.claude/skills/clip/brand-kits/ambition-mechanical/logo-badge.png').convert('RGBA').resize((240, 240), Image.LANCZOS)
    badge.save(OUT / 'ambition' / 'avatar.png', optimize=True)
    ring(Image.open(HOME / 'public/wolfpack-site/assets/wolfpack-icon.png').convert('RGBA'), (242, 241, 236), 'wolfpack')
    ring(Image.open(EA / 'corner/users/aom/projects/outreach/clipping-sample/oak-street-brand/tree-icon-lime.png').convert('RGBA'), (33, 63, 37), 'oak-street')
    av = ring(None, (11, 26, 46), 'kody')
    d = ImageDraw.Draw(av); f = font('DMSerifDisplay-Regular.ttf', 104)
    d.ellipse((10, 10, 229, 229), outline=(188, 160, 98), width=6)
    l, t, r, b = d.textbbox((0, 0), 'KR', font=f); d.text((120 - (r - l) / 2 - l, 120 - (b - t) / 2 - t), 'KR', font=f, fill=(188, 160, 98))
    av.save(OUT / 'kody' / 'avatar.png', optimize=True)
    print('wrote avatars')


if __name__ == '__main__':
    kody_logo(); oak_street(); ambition(); wolfpack(); kody(); avatars()
