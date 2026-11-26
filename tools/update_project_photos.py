"""Build the Option B project list from the folders in project-photos/.

Each folder in project-photos/ is one project:
  project-photos/<folder>/info.txt         the project's text (title, location, year, ...)
  project-photos/<folder>/01.jpg, 02.jpg   its photos, shown in file-name order; 01 is the cover

* A new folder (with an info.txt) adds a new project; deleting a folder removes that project.
* A project whose folder has no photos keeps the photos it already had on the site.
* Editing info.txt (even the title) updates that project; the folder name is what links them,
  so don't rename a folder that has no photos of its own yet.

Usage (from the website folder):
  python tools/update_project_photos.py            update the site from the folders
  python tools/update_project_photos.py --export   write info.txt into every folder from the
                                                   current project list (creates missing folders)
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "project-photos"
SITE = ROOT / "options" / "option-b"
DATA = SITE / "data" / "projects.js"
PREFIX = "../../project-photos"          # how the Option B pages reach project-photos/
IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
# Big photos are resized to web size; the untouched original is kept outside the website folder
ORIGINALS = ROOT.parent / "project-photos-originals"
MAX_SIDE = 2400                # pixels on the longest side
MAX_BYTES = 1_200_000          # anything larger than this is re-saved

# info.txt label -> field in projects.js, in the order they are written
FIELDS = [
    ("Title", "title"), ("Category", "category"), ("Sector", "sector"), ("Client", "client"),
    ("Type", "type"), ("Year", "year"), ("Area", "area"), ("Location", "location"),
    ("Region", "region"), ("Status", "status"), ("Scope", "scope"), ("Featured", "featured"),
    ("Pin", "pin"),
]
CATEGORIES = {"architecture": "Architecture", "interior": "Interior Design", "landscape": "Landscape"}
ALLOWED = {
    "sector": ["Residential", "Commercial", "Public & Institutional"],
    "region": ["Ranchi", "Mumbai", "Rest of Jharkhand", "Rest of India", "International"],
    "status": ["Completed", "Ongoing", "Proposed", "Architecture Competition"],
}
HEADER = """# Project details for the Urban Arch Studio website.
# Change the text after each colon, then upload. Lines starting with # are ignored.
#   Category: Architecture | Interior Design | Landscape
#   Sector:   Residential | Commercial | Public & Institutional
#   Region:   Ranchi | Mumbai | Rest of Jharkhand | Rest of India | International
#   Status:   Completed | Ongoing | Proposed | Architecture Competition
#   Year:     e.g. 2021, 2018 - 2021, or 2024 - Ongoing
#   Featured: yes = show it in "Selected work" on the home page
#   Pin:      1 to 9 = show it first on the Projects page, in that order (empty = newest first)
"""
DATA_HEADER = """// Project list for the Option B pages. It is built from the folders in project-photos/
// by tools/update_project_photos.py, so change project-photos/<project>/info.txt instead of this file.
// category: architecture | interior | landscape
// sector:   Residential | Commercial | Public & Institutional
// region:   Ranchi | Mumbai | Rest of Jharkhand | Rest of India | International
// status:   Completed | Ongoing | Proposed | Architecture Competition
// year:     the first 4-digit year is used for the Year filter
"""


def slug(text):
    s = str(text).lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def natural_key(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def load_data():
    text = DATA.read_text(encoding="utf-8")
    return json.loads(text[text.index("["):text.rindex("]") + 1])


def save_data(projects):
    body = json.dumps(projects, indent=2, ensure_ascii=False)
    DATA.write_text(DATA_HEADER + "window.PROJECTS = " + body + ";\n", encoding="utf-8")
    # make browsers fetch the new list: version the script link by its content
    ver = hashlib.sha1(body.encode("utf-8")).hexdigest()[:8]
    for page in SITE.glob("*.html"):
        html = page.read_text(encoding="utf-8")
        new = re.sub(r"data/projects\.js(\?v=[\w-]+)?\"", f'data/projects.js?v={ver}"', html)
        if new != html:
            page.write_text(new, encoding="utf-8")


def assign_folders(projects):
    """Give every project a folder name (once); a repeated title gets its category added."""
    used = {p["folder"] for p in projects if p.get("folder")}
    for p in projects:
        if p.get("folder"):
            continue
        name = slug(p["title"])
        if name in used:
            name += "-" + p["category"]
        p["folder"] = name
        used.add(name)


def write_info(folder, p):
    lines = [HEADER]
    for label, key in FIELDS:
        value = p.get(key, "")
        if key == "category":
            value = CATEGORIES.get(value, value)
        if key == "featured":
            value = "yes" if value else "no"
        if key == "pin":
            value = value or ""
        lines.append(f"{label}: {value}")
    (folder / "info.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def read_info(path, problems):
    info = {}
    labels = {label.lower(): key for label, key in FIELDS}
    for n, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            problems.append(f"{path.parent.name}/info.txt line {n}: no colon, ignored")
            continue
        label, value = (s.strip() for s in line.split(":", 1))
        key = labels.get(label.lower())
        if not key:
            problems.append(f"{path.parent.name}/info.txt line {n}: unknown label '{label}', ignored")
            continue
        info[key] = value
    # tidy and check values
    if "category" in info:
        v = info["category"].lower()
        cat = next((k for k, name in CATEGORIES.items() if v in (k, name.lower()) or v.startswith(k)), None)
        if cat:
            info["category"] = cat
        else:
            problems.append(f"{path.parent.name}: Category '{info['category']}' should be Architecture, Interior Design or Landscape")
    for key, allowed in ALLOWED.items():
        if info.get(key):
            match = next((a for a in allowed if a.lower() == info[key].lower()), None)
            if match:
                info[key] = match
            else:
                problems.append(f"{path.parent.name}: {key.title()} '{info[key]}' is not one of: {', '.join(allowed)}")
    if "featured" in info:
        if info["featured"].lower() in ("yes", "y", "true", "1"):
            info["featured"] = True
        else:
            info.pop("featured")
            info["_unfeature"] = True
    if "pin" in info:
        if info["pin"].isdigit() and int(info["pin"]) > 0:
            info["pin"] = int(info["pin"])
        else:
            if info["pin"]:
                problems.append(f"{path.parent.name}: Pin '{info['pin']}' should be a number like 1, 2, 3 (or empty)")
            info.pop("pin")
            info["_unpin"] = True
    return info


def shrink_photos():
    """Resize big photos to web size in place; the original is copied to ORIGINALS first.
    PNGs become JPGs (much smaller). Needs Pillow: python -m pip install pillow"""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("Pillow is not installed, so big photos were not shrunk (python -m pip install pillow).")
        return []
    done = []
    for f in sorted(PHOTOS.glob("*/*")):
        if not f.is_file() or f.suffix.lower() not in IMAGE_TYPES:
            continue
        with Image.open(f) as im:
            big = max(im.size) > MAX_SIDE or f.stat().st_size > MAX_BYTES or f.suffix.lower() == ".png"
            if not big:
                continue
            backup = ORIGINALS / f.parent.name / f.name
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
        done.append((f"{f.parent.name}/{f.name}", before, out.stat().st_size))
    return done


def photos_in(folder):
    files = [f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_TYPES]
    # ?v= is a fingerprint of the photo, so a photo replaced under the same name gets a new
    # link and browsers fetch it instead of showing the copy they saved earlier
    return [f"{PREFIX}/{quote(folder.name)}/{quote(f.name)}?v={hashlib.sha1(f.read_bytes()).hexdigest()[:8]}"
            for f in sorted(files, key=lambda f: natural_key(f.name))]


def export():
    projects = load_data()
    assign_folders(projects)
    PHOTOS.mkdir(exist_ok=True)
    for p in projects:
        d = PHOTOS / p["folder"]
        d.mkdir(exist_ok=True)
        write_info(d, p)
        stale = d / ".gitkeep"
        if stale.exists():
            stale.unlink()
    save_data(projects)
    print(f"Wrote info.txt for {len(projects)} projects.")


def update():
    shrunk = shrink_photos()
    if shrunk:
        mb = lambda n: f"{n / 1e6:.1f} MB"
        print(f"Shrunk {len(shrunk)} photos to web size (originals kept in {ORIGINALS}):")
        for name, a, b in shrunk:
            print(f"  {name}: {mb(a)} -> {mb(b)}")
    videos = [f"{f.parent.name}/{f.name}" for f in PHOTOS.glob("*/*") if f.suffix.lower() in (".mp4", ".mov", ".m4v")]
    if videos:
        print("Videos are not uploaded (too big for GitHub) and are not shown on the site:", ", ".join(videos))
    old = load_data()
    assign_folders(old)
    by_folder = {p["folder"]: p for p in old}
    problems, added, changed, removed = [], [], [], []
    result = []

    folders = sorted((d for d in PHOTOS.iterdir() if d.is_dir() and not d.name.startswith(".")), key=lambda d: d.name)
    present = {d.name for d in folders}
    # keep the existing order for known projects, then add new ones
    order = [p["folder"] for p in old if p["folder"] in present] + [d.name for d in folders if d.name not in by_folder]

    for name in order:
        d = PHOTOS / name
        info_file = d / "info.txt"
        before = by_folder.get(name)
        p = dict(before) if before else {"folder": name}
        if info_file.exists():
            info = read_info(info_file, problems)
            if info.pop("_unfeature", False):
                p.pop("featured", None)
            if info.pop("_unpin", False):
                p.pop("pin", None)
            p.update(info)  # an empty value clears that detail on the site
        elif not before:
            problems.append(f"{name}: new folder has no info.txt, skipped")
            continue
        pics = photos_in(d)
        if pics:
            p["images"] = pics
        missing = [k for k in ("title", "category") if not p.get(k)]
        if missing:
            problems.append(f"{name}: needs {' and '.join(missing)} in info.txt, skipped")
            continue
        if not p.get("images"):
            problems.append(f"{name}: has no photos yet, so it won't look right on the site")
            p["images"] = []
        for key in ("sector", "client", "type", "year", "area", "location", "region", "status", "scope"):
            p.setdefault(key, "")
        # keep a tidy field order
        ordered = {key: p[key] for _, key in FIELDS if key in p}
        ordered["images"] = p["images"]
        ordered["folder"] = name
        result.append(ordered)
        if not before:
            added.append(ordered["title"])
        elif ordered != before:
            changed.append(ordered["title"])

    for p in old:
        if p["folder"] not in present:
            removed.append(p["title"])

    if result != old:
        save_data(result)
    print(f"{len(result)} projects. Added {len(added)}, updated {len(changed)}, removed {len(removed)}.")
    for label, items in (("Added", added), ("Updated", changed), ("Removed (folder deleted)", removed)):
        for t in items:
            print(f"  {label}: {t}")
    if problems:
        print("Please check:")
        for msg in problems:
            print("  -", msg)


if __name__ == "__main__":
    export() if "--export" in sys.argv else update()
