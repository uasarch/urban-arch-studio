# Home page slideshow

The photos in these two folders are the full-screen slideshow at the top of the home page (Options B and C).

| Folder | Shown on | Best photo shape |
|---|---|---|
| `desktop/` | computers and tablets | wide, about **1920 × 800** px |
| `mobile/` | phones | tall, about **920 × 1150** px |

Photos play in **file-name order**: `01.jpg`, `02.jpg`, `03.jpg` … `01` is the first one people see.

## Change the slideshow

- **Replace a photo:** put the new photo in with the same name (e.g. a new `03.jpg`).
- **Add a photo:** give it the next number, e.g. `11.jpg`. To put it in between, rename the files so the numbers are in the order you want.
- **Remove a photo:** delete it.
- **Phones:** if you don't have tall versions, empty the `mobile/` folder and phones will show the desktop photos, cropped to fit the screen. Keep the important part of each photo near the middle.

JPG, PNG or WebP. Very big photos are resized to web size automatically; the original is kept in `slideshow-photos-originals`, next to the website folder.

## Then publish

Upload the changes to GitHub and run the update, or just ask Claude to "update the slideshow". To run it yourself:

```
python tools/update_slideshow.py
```

(It also runs as part of `python tools/update_project_photos.py`.)
