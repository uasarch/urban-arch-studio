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
