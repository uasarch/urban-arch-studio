# Urban Arch Studio — Website

A fast, dependency-free one-page studio website (HTML + CSS + JS), hosted on GitHub Pages.

## Files
- `index.html` — all page content (edit text, contact details, project names here)
- `styles.css` — colours, fonts, layout (colours are at the top under `:root`)
- `script.js` — menu, scroll animations, project filters
- `images/` — put your project photos here

## Adding real project photos
1. Copy a photo into `images/`, e.g. `images/courtyard-house.jpg`.
2. In `index.html`, find the project and change
   `<div class="project-media p1"></div>` to
   `<div class="project-media p1" style="--img:url('images/courtyard-house.jpg')"></div>`

## Contact form
The form currently opens the visitor's email app. To receive submissions directly, create a free form at
https://formspree.io and replace the form's `action` with your Formspree URL (and remove `enctype="text/plain"`).

## Publishing changes
```
git add .
git commit -m "Update site"
git push
```
GitHub Pages redeploys automatically within a minute or two.
