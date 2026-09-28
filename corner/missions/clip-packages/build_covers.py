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
KODY_TOP = 420  # masthead height; the reel frame (and the card's looping clip) sits below it: KODY_TOP / H2 = 17.95%


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


def masthead(im, texture_src, crop, tint=None):
    """Brand masthead band (0..KODY_TOP) cut from the client's own GPT texture, so the logo has a designed home."""
    tex = Image.open(texture_src).convert('RGB')
    tex = cover_fit(tex.crop(crop), W, KODY_TOP, 0.5, 0.5)
    if tint:
        tex = Image.blend(tex, Image.new('RGB', tex.size, tint), 0.35)
    im.paste(tex, (0, 0))


def ambition():
    # Ambition's LinkedIn/"Social Posts" system (AOM-EA ambition-mechanical/deliverables/social/carousel-field-crew):
    # radial navy #1A2140 -> #0E1426 with a 16 px halftone dot grid, round badge on a white disc, huge Barlow
    # Condensed caps (white line + red line), real footage fading into the navy. Footage = its real reel
    # (public/videos/ambition-vertical.mp4) at 12.4 s, cropped above the burned-in caption band.
    import subprocess, imageio_ffmpeg, tempfile
    red, white = (229, 44, 42), (255, 255, 255)
    # ground: radial navy + halftone
    im = Image.new('RGB', (W, H2), (14, 20, 38))
    glow = Image.new('L', (W, H2), 0)
    ImageDraw.Draw(glow).ellipse((-W // 2, -H2 // 3, W + W // 2, H2 // 2), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(260))
    im = Image.composite(Image.new('RGB', (W, H2), (26, 33, 64)), im, glow)
    dots = Image.new('RGBA', (W, H2), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    for y in range(0, H2, 24):
        for x in range(0, W, 24):
            dd.ellipse((x, y, x + 3, y + 3), fill=(255, 255, 255, 18))
    im.paste(dots, (0, 0), dots)
    d = ImageDraw.Draw(im)
    # badge on white, clear of the earpiece
    cx, cy, r = W // 2, 250, 98
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=white)
    badge = Image.open(EA / '.claude/skills/clip/brand-kits/ambition-mechanical/logo-badge.png').convert('RGBA').resize((180, 180), Image.LANCZOS)
    im.paste(badge, (cx - 90, cy - 90), badge)
    # headline: white line, red line, centred like the series cover
    y = 410
    for text, col, start in (('OPERATING ROOMS', white, 200), ('WENT DOWN.', red, 230)):
        f, (l, t, r2, b) = fit_text(d, text, 'BarlowCondensed-ExtraBold.ttf', W - 110, start)
        d.text(((W - (r2 - l)) // 2 - l, y - t), text, font=f, fill=col)
        y += (b - t) + 26
    # real reel frame, faded into the navy top and bottom
    tmp = Path(tempfile.gettempdir()) / 'ambition-frame.png'
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y', '-ss', '12.4', '-i',
                    str(HOME / 'public/videos/ambition-vertical.mp4'), '-frames:v', '1', str(tmp)], check=True)
    frame = Image.open(tmp).convert('RGB').crop((0, 0, 720, 840))
    ph_h = 1260
    photo = punch(cover_fit(frame, W, ph_h, 0.5, 0.35))
    fade = Image.new('L', (1, ph_h))
    for yy in range(ph_h):
        t = yy / ph_h
        fade.putpixel((0, yy), int(255 * min(1, t / 0.14, (1 - t) / 0.3)))
    py = y + 30
    im.paste(photo, (0, py), fade.resize((W, ph_h)))
    # subline from the reel's own captions ("this keeps ... surgeries running")
    fs = font('BarlowCondensed-SemiBold.ttf', 66)
    sub = 'The swap that keeps surgeries running.'
    l, t, r2, b = d.textbbox((0, 0), sub, font=fs)
    d.text(((W - (r2 - l)) // 2 - l, py + ph_h - 170 - t), sub, font=fs, fill=white)
    save2(im, 'ambition')


def wolfpack():
    # No Wolfpack reel footage reachable yet, so its frame is built like one of its reels: the best job photo
    # full-bleed, reel-style hook, and the before/after sewer-camera shots Wolfpack already publishes.
    ink, blue, white = (12, 14, 18), (47, 128, 196), (255, 255, 255)
    im = Image.new('RGB', (W, H2), ink)
    # masthead: dark with a blue glow, full logo knocked out
    band = Image.new('RGB', (W, KODY_TOP), ink)
    glow = Image.new('L', (W, KODY_TOP), 0)
    ImageDraw.Draw(glow).ellipse((W // 2 - 520, -260, W // 2 + 520, KODY_TOP + 200), fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    band = Image.composite(Image.new('RGB', band.size, blue), band, glow)
    im.paste(band, (0, 0))
    paste_logo(im, HOME / 'public/wolfpack-site/assets/wolfpack-logo-knockout.png', 210, center=W // 2, top=168)
    photo = punch(cover_fit(Image.open(HOME / 'public/wolfpack-site/assets/jet-hero.jpg').convert('RGB'), W, 1920, 0.42, 0.5))
    photo = shade(photo, top=0.55, mid=0.0, bottom=0.55, color=ink)
    im.paste(photo, (0, KODY_TOP))
    d = ImageDraw.Draw(im)
    d.rectangle((0, KODY_TOP - 6, W, KODY_TOP), fill=blue)
    y = KODY_TOP + 90
    f, (l, t, r, b) = fit_text(d, 'SEWER LINE,', 'Montserrat-Black.ttf', W - 140, 140, stroke=8)
    d.text(((W - (r - l)) // 2 - l, y - t), 'SEWER LINE,', font=f, fill=white, stroke_width=8, stroke_fill=ink)
    y += (b - t) + 34
    f2, (l2, t2, r2, b2) = fit_text(d, 'BEFORE & AFTER', 'Montserrat-Black.ttf', W - 220, 110)
    bw = (r2 - l2) + 56
    d.rounded_rectangle(((W - bw) // 2, y - 18, (W + bw) // 2, y + (b2 - t2) + 22), radius=18, fill=blue)
    d.text(((W - (r2 - l2)) // 2 - l2, y - t2), 'BEFORE & AFTER', font=f2, fill=white)
    # before/after camera insets, like the reel's own split
    lab = font('Montserrat-Black.ttf', 44)
    for i, (src, label) in enumerate((('pipe-before.jpg', 'BEFORE'), ('pipe-after.jpg', 'AFTER'))):
        cx = 290 + i * 500
        cy = KODY_TOP + 1320
        r = 210
        ph = cover_fit(Image.open(HOME / 'public/wolfpack-site/assets' / src).convert('RGB'), 2 * r, 2 * r)
        face_bubble(im, ph, (cx, cy), r, blue if i else (199, 80, 47))
        lw = d.textbbox((0, 0), label, font=lab)
        d.rounded_rectangle((cx - (lw[2] - lw[0]) // 2 - 24, cy + r + 10, cx + (lw[2] - lw[0]) // 2 + 24, cy + r + 84), radius=12,
                            fill=blue if i else (199, 80, 47))
        d.text((cx - (lw[2] - lw[0]) // 2 - lw[0], cy + r + 20 - lw[1]), label, font=lab, fill=white)
    d.polygon([(W // 2 - 26, KODY_TOP + 1290), (W // 2 + 30, KODY_TOP + 1320), (W // 2 - 26, KODY_TOP + 1350)], fill=white)
    save2(im, 'wolfpack')


def oak_street():
    # The fire clip as it plays (real frame from the Oak Street render): logo masthead, slab-serif hook, the fire,
    # the rebuilt property, Tim's face on the seam.
    src = Image.open(EA / 'corner/users/aom/projects/outreach/clipping-sample/oak-street-brand/current-clip-frame.jpg').convert('RGB')
    green, lime, cream = (33, 63, 37), (121, 178, 40), (251, 245, 230)
    im = Image.new('RGB', (W, H2), green)
    d = ImageDraw.Draw(im)
    paste_logo(im, EA / 'corner/users/aom/projects/outreach/clipping-sample/oak-street-brand/logo-for-dark-bg.png', 210, center=W // 2, top=160)
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


# ---------------------------------------------------------------------------------------------------------------
# Per-clip covers (R7): every clip in every package gets its own cover in its client's system, hook and imagery
# taken from that clip's own content (plans, captions, the post that went with it). Files: <slug>/c1..c3.jpg.
# c1 of each package is the package card cover (cover.jpg). Photos under CC BY / BY-SA carry their credit line.
# ---------------------------------------------------------------------------------------------------------------
KO = EA / 'corner/users/aom/projects/outreach/clipping-sample'


def save_clip(im, slug, n):
    p = OUT / slug / f'c{n}.jpg'
    im.convert('RGB').resize((720, 1560), Image.LANCZOS).save(p, quality=80, optimize=True, progressive=True)
    print('wrote', p.relative_to(HOME), p.stat().st_size // 1024, 'KB')


def credit(d, text, x, y, col=(255, 255, 255)):
    f = font('Inter-SemiBold.ttf', 24)
    d.text((x + 1, y + 1), text, font=f, fill=(0, 0, 0))
    d.text((x, y), text, font=f, fill=col)


def chip(d, text, x, y, bg, fg=(255, 255, 255), size=40, fname='Inter-ExtraBold.ttf', pad=18, radius=10):
    f = font(fname, size)
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.rounded_rectangle((x, y, x + (r - l) + 2 * pad, y + (b - t) + 2 * pad), radius=radius, fill=bg)
    d.text((x + pad - l, y + pad - t), text, font=f, fill=fg)
    return y + (b - t) + 2 * pad


def rounded_paste(im, ph, x, y, radius):
    m = Image.new('L', ph.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, ph.width - 1, ph.height - 1), radius=radius, fill=255)
    im.paste(ph, (x, y), m)


# ---- Kody: Arizona Living masthead, serif hook with one gold word, his desk shot, caption bar, photo panel ----
def kody_clip(n, hook, face_src, caption, photo, tag, cred, card):
    gold, amber, cream = (188, 160, 98), (246, 173, 85), (247, 241, 230)
    navy = (11, 26, 46)
    im = Image.new('RGB', (W, H2), navy)
    d = ImageDraw.Draw(im)
    for i in range(14):   # quiet contour lines, as on his plates
        r = 260 + i * 70
        d.ellipse((W - 180 - r, 820 - r, W - 180 + r, 820 + r), outline=(20, 40, 66), width=2)
    paste_logo(im, OUT / 'kody' / 'logo.png', 128, center=W // 2, top=190)
    d.line((W // 2 - 140, KODY_TOP - 40, W // 2 + 140, KODY_TOP - 40), fill=gold, width=3)
    y = KODY_TOP + 20
    for parts in hook:   # each line = [(text, is_gold), ...], shrunk to fit the screen
        size = 96
        while True:
            fh = font('DMSerifDisplay-Regular.ttf', size)
            widths = [d.textbbox((0, 0), t, font=fh) for t, _ in parts]
            total = sum(b[2] - b[0] for b in widths)
            if total <= W - 130 or size <= 60:
                break
            size -= 4
        x = (W - total) // 2
        for (t, g), bb in zip(parts, widths):
            d.text((x - bb[0], y - bb[1]), t, font=fh, fill=gold if g else cream)
            x += bb[2] - bb[0]
        y += 112
    d.line((W // 2 - 190, y + 10, W // 2 + 190, y + 10), fill=gold, width=3)
    fy = y + 50
    face = cover_fit(Image.open(face_src).convert('RGB').crop((330, 20, 950, 600)), W, 560, 0.5, 0.35)
    im.paste(punch(face), (0, fy))
    cy = fy + 560 + 30   # caption bar, one amber word
    fc = font('Inter-ExtraBold.ttf', 60)
    widths = [d.textbbox((0, 0), t, font=fc) for t, _ in caption]
    total = sum(b[2] - b[0] for b in widths)
    d.rounded_rectangle((40, cy, W - 40, cy + 110), radius=10, fill=(8, 18, 34))
    x = (W - total) // 2
    for (t, a), bb in zip(caption, widths):
        d.text((x - bb[0], cy + 55 - (bb[3] - bb[1]) // 2 - bb[1]), t, font=fc, fill=amber if a else (255, 255, 255))
        x += bb[2] - bb[0]
    py = cy + 150
    ph = punch(cover_fit(Image.open(photo).convert('RGB'), W - 80, 560))
    rounded_paste(im, ph, 40, py, 16)
    chip(d, tag, 64, py + 24, (8, 18, 34), cream, 34, 'DMSerifDisplay-Regular.ttf', 16, 8)
    credit(d, cred, 64, py + 560 - 44)
    # the clip's own badge line, set like his 110-degree card
    ky = py + 600
    d.rounded_rectangle((40, ky, W - 40, ky + 190), radius=14, fill=(16, 34, 58), outline=(40, 64, 96), width=2)
    fk = font('Inter-ExtraBold.ttf', 30)
    l, t, r, b = d.textbbox((0, 0), card[0], font=fk)
    d.text(((W - (r - l)) // 2 - l, ky + 28 - t), card[0], font=fk, fill=cream)
    d.line((W // 2 - 60, ky + 76, W // 2 + 60, ky + 76), fill=gold, width=3)
    f2, (l, t, r, b) = fit_text(d, card[1], 'DMSerifDisplay-Regular.ttf', W - 160, 76)
    d.text(((W - (r - l)) // 2 - l, ky + 96 - t), card[1], font=f2, fill=(255, 255, 255))
    save_clip(im, 'kody', n)


# ---- Oak Street: logo masthead, slab-serif hook with a lime box, before/after photo panels, Tim on the seam ----
def oak_clip(n, hook, boxed, top_photo, top_tag, bottom, cred):
    green, lime, cream = (33, 63, 37), (121, 178, 40), (251, 245, 230)
    src = Image.open(KO / 'oak-street-brand/current-clip-frame.jpg').convert('RGB')
    im = Image.new('RGB', (W, H2), green)
    d = ImageDraw.Draw(im)
    paste_logo(im, KO / 'oak-street-brand/logo-for-dark-bg.png', 210, center=W // 2, top=160)
    y = 440
    for i, line in enumerate(hook):
        f, (l, t, r, b) = fit_text(d, line, 'RobotoSlab-ExtraBold.ttf', W - 128, 150 if i == 0 else 104)
        d.text((64 - l, y - t), line, font=f, fill=cream)
        y += (b - t) + 14
    y = text_block(d, [(boxed, 'RobotoSlab-ExtraBold.ttf', 132, (27, 41, 31), lime)], y + 16, None)
    fy = y + 50
    im.paste(punch(cover_fit(Image.open(top_photo).convert('RGB'), W, 620)), (0, fy))
    chip(d, top_tag, 40, fy + 36, (200, 45, 40), (255, 255, 255), 44, 'Poppins-ExtraBold.ttf', 16, 8)
    ay = fy + 620
    d.rectangle((0, ay - 4, W, ay + 4), fill=lime)
    kind = bottom[0]
    if kind == 'photo':
        _, bph, btag = bottom
        im.paste(punch(cover_fit(Image.open(bph).convert('RGB'), W, H2 - ay - 4)), (0, ay + 4))
        chip(d, btag, 40, ay + 40, green, (255, 255, 255), 44, 'Poppins-ExtraBold.ttf', 16, 8)
    else:   # stat band
        _, value, label = bottom
        f = font('RobotoSlab-ExtraBold.ttf', 250)
        l, t, r, b = d.textbbox((0, 0), value, font=f)
        d.text(((W - (r - l)) // 2 - l, ay + 110 - t), value, font=f, fill=lime)
        fl = font('Poppins-ExtraBold.ttf', 44)
        l2, t2, r2, b2 = d.textbbox((0, 0), label, font=fl)
        d.text(((W - (r2 - l2)) // 2 - l2, ay + 110 + (b - t) + 40 - t2), label, font=fl, fill=cream)
    credit(d, cred, 40, ay - 50)
    face_bubble(im, src.crop((838, 912, 1040, 1114)), (860, ay), 170, lime)
    save_clip(im, 'oak-street', n)


# ---- Wolfpack: blue-glow masthead, full-bleed job photo, white hook + blue box, a proof element below ----
def wolf_clip(n, line1, boxed, photo, focus_x, extra):
    ink, blue, white = (12, 14, 18), (47, 128, 196), (255, 255, 255)
    im = Image.new('RGB', (W, H2), ink)
    band = Image.new('RGB', (W, KODY_TOP), ink)
    glow = Image.new('L', (W, KODY_TOP), 0)
    ImageDraw.Draw(glow).ellipse((W // 2 - 520, -260, W // 2 + 520, KODY_TOP + 200), fill=110)
    band = Image.composite(Image.new('RGB', band.size, blue), band, glow.filter(ImageFilter.GaussianBlur(90)))
    im.paste(band, (0, 0))
    paste_logo(im, HOME / 'public/wolfpack-site/assets/wolfpack-logo-knockout.png', 210, center=W // 2, top=168)
    ph = punch(cover_fit(Image.open(photo).convert('RGB'), W, 1920, focus_x, 0.5))
    im.paste(shade(ph, top=0.6, mid=0.0, bottom=0.6, color=ink), (0, KODY_TOP))
    d = ImageDraw.Draw(im)
    d.rectangle((0, KODY_TOP - 6, W, KODY_TOP), fill=blue)
    y = KODY_TOP + 90
    f, (l, t, r, b) = fit_text(d, line1, 'Montserrat-Black.ttf', W - 140, 140, stroke=8)
    d.text(((W - (r - l)) // 2 - l, y - t), line1, font=f, fill=white, stroke_width=8, stroke_fill=ink)
    y += (b - t) + 34
    f2, (l2, t2, r2, b2) = fit_text(d, boxed, 'Montserrat-Black.ttf', W - 220, 104)
    bw = (r2 - l2) + 56
    d.rounded_rectangle(((W - bw) // 2, y - 18, (W + bw) // 2, y + (b2 - t2) + 22), radius=18, fill=blue)
    d.text(((W - (r2 - l2)) // 2 - l2, y - t2), boxed, font=f2, fill=white)
    if extra[0] == 'checks':   # job checklist, like their site cards
        yy = KODY_TOP + 1180
        for item in extra[1]:
            fi = font('Montserrat-Black.ttf', 50)
            l, t, r, b = d.textbbox((0, 0), item, font=fi)
            d.rounded_rectangle((70, yy, 70 + 90 + (r - l) + 40, yy + 96), radius=16, fill=(255, 255, 255))
            d.ellipse((88, yy + 20, 144, yy + 76), fill=blue)
            d.line([(102, yy + 49), (113, yy + 60), (132, yy + 36)], fill=white, width=8)
            d.text((164 - l, yy + 48 - (b - t) // 2 - t), item, font=fi, fill=ink)
            yy += 122
    elif extra[0] == 'fix':
        fi = font('Montserrat-Black.ttf', 56)
        text = extra[1]
        l, t, r, b = d.textbbox((0, 0), text, font=fi)
        x0 = (W - (r - l)) // 2 - 40
        yy = KODY_TOP + 1320
        d.rounded_rectangle((x0, yy, x0 + (r - l) + 80, yy + 120), radius=20, fill=white)
        d.text((x0 + 40 - l, yy + 60 - (b - t) // 2 - t), text, font=fi, fill=ink)
    save_clip(im, 'wolfpack', n)


# ---- Ambition: LinkedIn series (halftone navy, badge on white, white + red Barlow caps, footage fading in) ----
def amb_clip(n, line1, line2, photo, sub, focus=(0.5, 0.4)):
    red, white = (229, 44, 42), (255, 255, 255)
    im = Image.new('RGB', (W, H2), (14, 20, 38))
    glow = Image.new('L', (W, H2), 0)
    ImageDraw.Draw(glow).ellipse((-W // 2, -H2 // 3, W + W // 2, H2 // 2), fill=255)
    im = Image.composite(Image.new('RGB', (W, H2), (26, 33, 64)), im, glow.filter(ImageFilter.GaussianBlur(260)))
    dots = Image.new('RGBA', (W, H2), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    for yy in range(0, H2, 24):
        for xx in range(0, W, 24):
            dd.ellipse((xx, yy, xx + 3, yy + 3), fill=(255, 255, 255, 18))
    im.paste(dots, (0, 0), dots)
    d = ImageDraw.Draw(im)
    cx, cy, r = W // 2, 250, 98
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=white)
    badge = Image.open(EA / '.claude/skills/clip/brand-kits/ambition-mechanical/logo-badge.png').convert('RGBA').resize((180, 180), Image.LANCZOS)
    im.paste(badge, (cx - 90, cy - 90), badge)
    y = 410
    for text, col, start in ((line1, white, 200), (line2, red, 230)):
        f, (l, t, r2, b) = fit_text(d, text, 'BarlowCondensed-ExtraBold.ttf', W - 110, start)
        d.text(((W - (r2 - l)) // 2 - l, y - t), text, font=f, fill=col)
        y += (b - t) + 26
    ph_h = 1260
    ph = punch(cover_fit(Image.open(photo).convert('RGB'), W, ph_h, *focus))
    fade = Image.new('L', (1, ph_h))
    for yy in range(ph_h):
        t = yy / ph_h
        fade.putpixel((0, yy), int(255 * min(1, t / 0.14, (1 - t) / 0.3)))
    py = y + 30
    im.paste(ph, (0, py), fade.resize((W, ph_h)))
    fs = font('BarlowCondensed-SemiBold.ttf', 66)
    l, t, r2, b = d.textbbox((0, 0), sub, font=fs)
    d.text(((W - (r2 - l)) // 2 - l, py + ph_h - 170 - t), sub, font=fs, fill=white)
    save_clip(im, 'ambition', n)


def clip_covers():
    import shutil
    for slug in ('kody', 'wolfpack', 'oak-street', 'ambition'):
        shutil.copy(OUT / slug / 'cover.jpg', OUT / slug / 'c1.jpg')   # clip 1 = the package cover
    face = KO / 'prospects/kody-romero/src/face_still.png'
    kody_clip(2, [[('Phoenix is affordable,', False)], [('but not ', False), ('dirt cheap', True)]], face,
              [('a budget and an ', False), ('affordable', True), (' city', False)],
              KO / 'prospects/kody-romero/photo-picks/m2-suburb-homes-mountains.jpg', 'Moving from the Midwest?',
              'Photo: kevin dooley, CC BY 2.0', ('NEW WATER INFRASTRUCTURE', 'Costs are likely to rise'))
    kody_clip(3, [[('Why 55+ communities', False)], [('feel ', False), ('empty', True), (' every summer', False)]], face,
              [('empties out every single ', False), ('summer', True)],
              KO / 'prospects/kody-romero/photo-picks/s1-sun-city-aerial.jpg', 'Sun City, Arizona',
              'Photo: Ken Lund, CC BY-SA 2.0', ('WHAT I WALK CLIENTS THROUGH', 'Before they buy, not after.'))
    oak_clip(2, ['THE $265 BILLION', 'REASON TO WATCH'], 'PHOENIX', KO / 'plans/images/tsmc-fab21.jpg',
             'TSMC ARIZONA, NORTH PHOENIX', ('stat', '$265B', "TSMC'S INVESTMENT IN PHOENIX"),
             'Photo: TrickHunter, CC BY-SA 4.0')
    oak_clip(3, ['WHY NEW HOMES', 'IN ARIZONA'], 'SAVE WATER', KO / 'plans/images/waddell-sprinklers.jpg',
             'THE FARMS', ('photo', KO / 'plans/images/land-in-transition.jpg', 'NOW: NEIGHBORHOODS'),
             'Photos: kevin dooley, CC BY 2.0')
    wolf_clip(2, "TOILET WON'T", 'STOP RUNNING?', HOME / 'public/wolfpack-site/assets/pm-hero.jpg', 0.5,
              ('fix', 'THE FIX: A NEW DIAPHRAGM'))
    wolf_clip(3, 'RESTAURANT', 'PLUMBING TOP OUT', HOME / 'public/wolfpack-site/assets/fog-hero.jpg', 0.55,
              ('checks', ['NEW FLOOR DRAINS', 'FRESH COPPER', '2" GAS LINE, 8 DROPS']))
    amb_clip(2, 'DIRTY FILTERS', 'EVERY 3 MONTHS.', AMB / 'public/images/ambition/PS521300.jpg',
             'Arizona is a very dusty place.', (0.5, 0.45))
    amb_clip(3, 'SWAMP COOLERS OUT.', 'REAL AC IN.', AMB / 'public/images/ambition/PS520058.jpg',
             'New units craned onto the roof.', (0.45, 0.4))


if __name__ == '__main__':
    kody_logo(); oak_street(); ambition(); wolfpack(); kody(); avatars(); clip_covers()
