"""Point the Option B website at the photos in project-photos/.

How it works
  project-photos/<project-folder>/01.jpg, 02.jpg, ...
  * Every project has its own folder, named after the project (see project-photos/README.md).
  * Photos are shown in file-name order; the first one is the cover photo.
  * A project whose folder is empty keeps the photos it already had.

Usage (from the website folder):
  python tools/update_project_photos.py           update the project list from the folders
  python tools/update_project_photos.py --init    also create an (empty) folder for every project
"""
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "project-photos"
DATA = ROOT / "options" / "option-b" / "data" / "projects.js"
# how the Option B pages (options/option-b/*.html) reach the repo root
PREFIX = "../../project-photos"
IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


def slug(text):
    """Same rule the website uses for project links (projects.html#p=<slug>)."""
    s = str(text).lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def natural_key(name):
    """Sort 2.jpg before 10.jpg."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def main():
    init = "--init" in sys.argv
    text = DATA.read_text(encoding="utf-8")
    start, end = text.index("["), text.rindex("]") + 1
    projects = json.loads(text[start:end])

    # folder name for each project (a repeated name gets the category added, like on the site)
    seen, folders = set(), {}
    for i, p in enumerate(projects):
        name = slug(p["title"])
        if name in seen:
            name += "-" + p["category"]
        seen.add(name)
        folders[name] = i

    PHOTOS.mkdir(exist_ok=True)
    if init:
        for name in folders:
            d = PHOTOS / name
            d.mkdir(exist_ok=True)
            keep = d / ".gitkeep"
            if not any(d.iterdir()):
                keep.touch()

    updated, unknown = [], []
    for d in sorted(p for p in PHOTOS.iterdir() if p.is_dir()):
        files = sorted((f.name for f in d.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_TYPES), key=natural_key)
        if d.name not in folders:
            if files:
                unknown.append(d.name)
            continue
        if not files:
            continue
        p = projects[folders[d.name]]
        new = [f"{PREFIX}/{quote(d.name)}/{quote(f)}" for f in files]
        if p.get("images") != new:
            p["images"] = new
            updated.append(f"{p['title']} ({len(new)} photos)")

    if updated:
        DATA.write_text(text[:start] + json.dumps(projects, indent=2, ensure_ascii=False) + text[end:], encoding="utf-8")
    print(f"Updated {len(updated)} project(s)" + (":" if updated else "."))
    for u in updated:
        print("  -", u)
    if unknown:
        print("These folders don't match any project name (check the spelling in project-photos/README.md):")
        for u in unknown:
            print("  -", u)


if __name__ == "__main__":
    main()
