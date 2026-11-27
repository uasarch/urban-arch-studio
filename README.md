# Urban Arch Studio — Website

Static rebuild of urbanarchstudio.co.in (HTML + CSS + JS, no WordPress), hosted on GitHub Pages.

## Pages
The main site is **Option C**, at the top of this folder:
- `index.html` (home), `projects.html` (Grid / List / Gallery), `contact.html`, `portal.html` (client login), `admin.html` (studio staff)
- `styles.css`, `script.js`, `work.css`, `work.js`, `portal.*`, `admin.*`, `data/portal-demo.js`
- The project list is shared with Option B: `options/option-b/data/projects.js`, built by `tools/update_project_photos.py` from `project-photos/`
- The home slideshow comes from `slideshow-photos/` (`tools/update_slideshow.py`)
- `options/option-c/*.html` only forward here (old links keep working). The old design is `options/option-a/`.
- `data/projects.js` at the top is the old design's list and is no longer used by the main site.

## Editing
- **Projects and photos**: see `project-photos/README.md`, then run `python tools/update_project_photos.py`.
- **Images**: all original site images are in `assets/uploads/` (same folder structure as WordPress).

## Contact form
By default the forms open the visitor's email app addressed to utkarsh@urbanarchstudio.co.in.
To receive submissions directly, create a free form at https://formspree.io and put its URL in
`data-endpoint=""` on the `<form id="contactForm">` in `contact.html`.

## Publishing changes
```
git add .
git commit -m "Update site"
git push
```
GitHub Pages redeploys automatically within a minute or two.

## Comparing options
- `options/index.html` — side-by-side comparison of the current site and draft options.
- `options/option-a/` — a full draft copy of the site for trying changes. It shares the images in `assets/` (paths start `../../assets/`), is hidden from search engines (`noindex`), and shows an "Option A · draft" badge.
- The root site stays untouched until an option is chosen. To finalise, copy the chosen option's files back to the root (change `../../assets/` back to `assets/` and remove the badge and `noindex`).
- `options/option-b/` — Projects page with a "Browse by" switch: Type, Residential / Commercial, Status, Location, Year (no counts). Each project in `options/option-b/data/projects.js` has two extra fields: `sector` (Residential | Commercial | Public & Institutional) and `region` (Ranchi | Mumbai | Rest of Jharkhand | Rest of India | International). Year uses the first year in `year`. Layout follows big.dk: an image grid sorted newest year first; clicking a project opens it in place below its row, with details on the left and large photos scrolling sideways on the right (arrows, swipe, trackpad or keyboard). Each project has its own link: `projects.html#p=<project-name>`.
- For another option, copy `options/option-a/` to `options/option-b/` and add a card for it in `options/index.html`.
