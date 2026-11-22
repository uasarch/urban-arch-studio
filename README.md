# Urban Arch Studio — Website

Static rebuild of urbanarchstudio.co.in (HTML + CSS + JS, no WordPress), hosted on GitHub Pages.

## Pages
- `index.html` — Home: hero slider, About Us, services, About the Firm, Founders
- `projects.html` — all projects with filters (Architecture / Interior Design / Landscape), per-project image sliders and a full-screen lightbox
- `contact.html` — contact details & form, office addresses, careers

## Editing
- **Projects**: edit `data/projects.js`. Each entry has `title`, `category` (`architecture` | `interior` | `landscape`), `client`, `type`, `year`, `area`, `location`, `status`, `scope` and a list of `images`. Add photos under `assets/` and list their paths.
- **Home hero slider**: the `<img>` lists in `index.html` (one set for desktop, one for mobile).
- **Colours & fonts**: top of `styles.css` (`:root`).
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
