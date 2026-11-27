"""Build the landing page slideshow (Options B and C) from the photos in slideshow-photos/.

  slideshow-photos/desktop/   wide photos for computers (about 1920 x 800 works well)
  slideshow-photos/mobile/    tall photos for phones (about 920 x 1150 works well)

Photos are shown in file-name order: 01.jpg, 02.jpg, ...
* If mobile/ is empty, phones show the desktop photos (cropped to fit the screen).
* If desktop/ is empty, the slideshow is left as it is.
* Big photos are resized to web size; the untouched original is kept outside the website folder.

Usage (from the website folder):
  python tools/update_slideshow.py
It also runs as part of: python tools/update_project_photos.py
"""
import hashlib
import re
import shutil
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SLIDES = ROOT / "slideshow-photos"
PAGES = [ROOT / "options" / "option-b" / "index.html", ROOT / "options" / "option-c" / "index.html"]
PREFIX = "../../slideshow-photos"        # how the Option B / C pages reach slideshow-photos/
ORIGINALS = ROOT.parent / "slideshow-photos-originals"
IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
MAX_SIDE = 2400
MAX_BYTES = 1_200_000
ALT = "Urban Arch Studio project"


def natural_key(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def shrink(folder):
    """Resize big photos in place (original copied to ORIGINALS first); PNGs become JPGs."""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("Pillow is not installed, so big slideshow photos were not shrunk (python -m pip install pillow).")
        return
    for f in sorted(folder.iterdir()):
        if not f.is_file() or f.suffix.lower() not in IMAGE_TYPES:
            continue
        with Image.open(f) as im:
            if not (max(im.size) > MAX_SIDE or f.stat().st_size > MAX_BYTES or f.suffix.lower() == ".png"):
                continue
            backup = ORIGINALS / folder.name / f.name
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copy2(f, backup)
            im = ImageOps.exif_transpose(im)
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            if im.mode in ("RGBA", "LA", "P"):
                im = im.convert("RGBA")
                bg = Image.new("RGB", im.size, "white")
                bg.paste(im, mask=im.split()[-1])
                im = bg
            elif im.mode != "RGB":
                im = im.convert("RGB")
            out = f.with_suffix(".jpg")
            if out != f and out.exists():
                out = f.with_name(f.stem + "-png.jpg")
            before = f.stat().st_size
            im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
        if out != f:
            f.unlink()
        print(f"  shrunk {folder.name}/{f.name}: {before / 1e6:.1f} MB -> {out.stat().st_size / 1e6:.1f} MB")


def photos(folder):
    if not folder.is_dir():
        return []
    shrink(folder)
    files = sorted((f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_TYPES),
                   key=lambda f: natural_key(f.name))
    # ?v= changes when a photo changes, so browsers fetch a replaced photo instead of an old saved copy
    return [f"{PREFIX}/{folder.name}/{quote(f.name)}?v={hashlib.sha1(f.read_bytes()).hexdigest()[:8]}" for f in files]


def slides_html(urls, first_loads_now):
    lines = []
    for i, url in enumerate(urls):
        attr = "src" if (i == 0 and first_loads_now) else "data-src"
        active = ' class="active"' if i == 0 else ""
        lines.append(f'        <img {attr}="{url}" alt="{ALT}"{active}>')
    return "\n".join(lines)


def update():
    desktop = photos(SLIDES / "desktop")
    mobile = photos(SLIDES / "mobile")
    if not desktop:
        print("Slideshow: slideshow-photos/desktop has no photos, so the slideshow was left as it is.")
        return
    if not mobile:
        mobile = desktop
        print("Slideshow: slideshow-photos/mobile has no photos, so phones show the desktop photos.")
    sets = {"desktop": slides_html(desktop, True), "mobile": slides_html(mobile, False)}
    changed = []
    for page in PAGES:
        text = page.read_text(encoding="utf-8")
        new = text
        for name, html in sets.items():
            pattern = re.compile(r'(<div class="hero-slider" data-set="%s">\r?\n)(.*?)(\r?\n\s*</div>)' % name, re.S)
            if not pattern.search(new):
                print(f"Slideshow: couldn't find the {name} slideshow in {page.relative_to(ROOT)}")
                continue
            nl = "\r\n" if "\r\n" in text else "\n"
            new = pattern.sub(lambda m: m.group(1) + html.replace("\n", nl) + m.group(3), new, count=1)
        if new != text:
            page.write_text(new, encoding="utf-8", newline="")
            changed.append(page.parent.name)
    print(f"Slideshow: {len(desktop)} desktop and {len(mobile)} phone photos"
          + (f"; updated {', '.join(changed)}." if changed else "; no change."))


if __name__ == "__main__":
    update()
