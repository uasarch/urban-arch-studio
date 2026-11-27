# Projects (photos and text)

Every folder here is one project on the website. Each folder holds:

- **`info.txt`** — the project's text: title, category, client, type, year, area, location, region, status, scope, and whether it is featured on the home page.
- **Photos** — named in the order you want them shown: `01.jpg`, `02.jpg`, `03.jpg` … `01` is the **cover photo** (projects grid and home page). JPG, PNG or WebP; ideally under about 1 MB each (around 2000 px wide).

## Change a project

- **Text:** open its `info.txt`, change the words after the colons, save. Leave a value empty to hide that detail.
- **Photos:** put the new photos in its folder. Once a folder has photos, they **replace all** of that project's old photos, so include every photo you want shown. A folder without photos keeps the old ones.
- **Projects page order:** set `Pin: 1` … `Pin: 9` on the projects you want shown first, in that order. All other projects follow, newest first. Leave `Pin:` empty to let a project fall back to newest first.
- **Text-only photos:** if a photo is just a block of text (a description card), put its number in `Text photos:`, e.g. `Text photos: 2` or `Text photos: 24, 25`. It still shows when the project is opened, but is left out of the Option C Gallery view.
- **Home page:** "Recent projects" shows the projects with `Pin: 1` to `Pin: 6`, in that order. If fewer are pinned, the newest projects fill the rest.
- **Home page slideshow:** that has its own folder, `slideshow-photos/` (see the README there).

## Add a new project

1. Make a new folder here, named in lower case with dashes, e.g. `sharma-residence`.
2. Copy any project's `info.txt` into it and fill it in (Title and Category are required).
3. Add its photos as `01.jpg`, `02.jpg` …

## Remove a project

Delete its folder.

## Then publish

Upload the changes to GitHub (on github.com, or push from your computer) and run the update — or simply ask Claude to "update the projects". To run it yourself: `python tools/update_project_photos.py`. It lists anything it couldn't understand, such as a misspelt Status.

Don't rename a folder that has no photos of its own yet: the name links it to its old photos.

## Folders

| Folder | Project | Location | Year |
|---|---|---|---|
| `aashirvad` | Aashirvad | Tupudana, Ranchi | 2019 - 2021 |
| `amit-das-s-farmhouse` | Amit Das's Farmhouse | Amliya Kalyanpur, Jharkhand | 2021 |
| `amit-goregoan-west` | Amit, Goregoan West | Goregaon West, Mumbai | 2022 |
| `aranya-restaurant` | Aranya Restaurant | Airport Road, Ranchi | 2023 |
| `army-officer-s-living` | Army Officer's Living | West Bengal | 2018 |
| `autee-residence` | Autee Residence | Malad East, Mumbai | 2023 |
| `bachuda-s-bungalow-extension` | Bachuda’s Bungalow Extension | Tharpakna, Ranchi | 2019 |
| `bangalore-iim-plot` | Bangalore IIM Plot | Pandurang Nagar, Bangalore | 2021 |
| `basargarh-apartment` | Basargarh Apartment | Basargarh, Ranchi | 2021 |
| `bhagat-bhavan` | Bhagat Bhavan | North Office Para, Ranchi | 2025 - Ongoing |
| `bungalow-extension` | Bungalow Extension | Birsa Nagar, Ranchi | 2020 |
| `casa-coimbatore` | Casa Coimbatore | Coimbatore, Tamil Nadu | 2020 |
| `chandrika-nivas` | Chandrika Nivas | Ghatkopar West, Mumbai | 2019 |
| `cv-farmhouse` | CV Farmhouse | Tirumalapur, Telangana | 2023 |
| `darpan-parekh` | Darpan Parekh | Harrow, London | 2024 |
| `devkinandan` | Devkinandan | Morabadi, Ranchi | 2024 - Ongoing |
| `dr-yogesh-mehta` | Dr. Yogesh Mehta | Thane West, Mumbai | 2022 |
| `ekal-foundation-skill-development-centre` | Ekal Foundation – Skill Development Centre | Jarangloi, Odisha | 2018 - 2021 |
| `ggfmc-physiotherapy-center` | GGFMC Physiotherapy Center | Andheri East, Mumbai | 2022 |
| `gossner-college-gate` | Gossner College Gate | Club Road, Ranchi | 2022 |
| `hitesh` | Hitesh | Awadesh Nagar, Ranchi | 2024 - Ongoing |
| `homoeopathic-clinic` | Homoeopathic Clinic | Mulund West, Mumbai | 2024 |
| `induneil` | Induneil | Kathal More, Ranchi | 2025 - Ongoing |
| `kalyani-enclave` | Kalyani Enclave | Morabadi, Ranchi | 2018 - 2021 |
| `keshav-kunj` | Keshav Kunj | Vaisnavi Vihar, Ranchi | 2024 - Ongoing |
| `kshitij-raj-lalpur-ranchi` | Kshitij Raj, Lalpur, Ranchi | Lalpur, Ranchi | 2024 |
| `mahesh-shukla-dahisar-west` | Mahesh Shukla, Dahisar West | Dahisar West, Mumbai | 2025 |
| `mp-s-office` | MP's Office | Ashok Nagar, Ranchi | 2019 |
| `mr-achal-bangani` | Mr. Achal Bangani | Goregoan West, Mumbai | 2021 |
| `mr-bharat` | Mr. Bharat | Bandra West, Mumbai | 2019 |
| `mr-kiran-shah` | Mr. Kiran Shah | Borivali East, Mumbai | 2024 |
| `mr-kushal-shah` | Mr. Kushal Shah | Kemps Corner, Mumbai | 2022 |
| `mr-neeraj-kumar` | Mr. Neeraj Kumar | Buti, Ranchi | 2019 |
| `mr-pawan-keshari` | Mr. Pawan Keshari | Deogarh, Jharkhand | 2019 |
| `mr-prabhakar-jaiswal` | Mr. Prabhakar Jaiswal | Kathal More, Ranchi | 2019 |
| `mr-pragnesh-thakkar` | Mr. Pragnesh Thakkar | Mulund West, Mumbai | 2021 |
| `mr-rishi-jagtiani` | Mr. Rishi Jagtiani | Andheri West, Mumbai | 2021 |
| `mr-sanjay-agarwal` | Mr. Sanjay Agarwal | Mulund West, Mumbai | 2023 |
| `mr-vishal-varsheney` | Mr. Vishal Varsheney | Kandra, Jamshedpur | 2019 |
| `mr-vivek-raipat` | Mr. Vivek Raipat | Hinoo, Ranchi | 2020 |
| `mridula-nivas` | Mridula Nivas | Kathal More, Ranchi | 2019 - 2021 |
| `mrs-amrita-khakhar` | Mrs. Amrita Khakhar | Versova, Andheri, Mumbai | 2019 |
| `mrs-veena-varma` | Mrs. Veena Varma | Sea Woods, New Mumbai | 2019 |
| `ms-priyadarshani-singh` | Ms. Priyadarshani Singh | Bokaro, Jharkhand | 2019 |
| `narendra-enclave` | Narendra Enclave | Dungari, Tupudana, Ranchi | 2024 - Ongoing |
| `oak-elegance` | Oak Elegance | Kathal More, Ranchi | 2024 |
| `oak-elegance-landscape` | Oak Elegance | Kathal More, Ranchi | 2022 |
| `oak-forest` | Oak Forest | Kathal More, Ranchi | 2023 |
| `oak-serenity` | Oak Serenity | Chutia, Ranchi | 2024 |
| `pharmacy-dashmesh` | Pharmacy, Dashmesh | North Office Para, Ranchi | 2021 |
| `rameshwaram-gardens` | Rameshwaram Gardens | Khunti | 2023 - Ongoing |
| `rameshwaram-village` | Rameshwaram Village | Rameshwaram Village, Dumardaga, Khunti | 2023 |
| `reve-your-serene-abode` | Reve_Your Serene Abode | Jambrung, Karjat, Maharashtra | 2021 - 2025 |
| `rg-bungalow` | RG Bungalow | Khunti | 2023 - Ongoing |
| `rv-community-center` | RV - Community Center | Rameshwaram Village, Dumardaga, Khunti | 2023 |
| `rv-temple` | RV Temple | Rameshwaram Village, Dumardaga, Khunti | 2023 |
| `sdm-house` | SDM House | Salvador Do Mundo, Goa | 2025 |
| `shashank-kumar` | Shashank Kumar | Harmu, Ranchi | 2024 |
| `shree-radhe` | Shree Radhe | Dungari, Tupudana, Ranchi | 2024 - Ongoing |
| `sinheshwar-niwas` | Sinheshwar Niwas | Hinoo, Ranchi | 2025 - Ongoing |
| `sports-complex` | Sports Complex | First Al Khail St - Jumeirah Heights, Dubai | 2022 |
| `srinivas` | Srinivas | Tupudana, Ranchi | 2024 - Ongoing |
| `st-michael-s-school-gate` | St. Michael's School Gate | Pahartoli, Ranchi | 2022 |
| `statue-of-oneness` | Statue of Oneness | Omkareshwar, Madhya Pradesh | 2022 |
| `the-curve-dental-solutions` | The Curve Dental Solutions | Andheri West, Mumbai | 2021 |
| `trivani-garden` | Trivani Garden | Ranchi | 2025 - Ongoing |
| `uma-enclave` | Uma Enclave | North Office Para, Ranchi | 2025 - Ongoing |
| `villa-rodrigues` | Villa Rodrigues | Virar, Maharashtra | 2017 |
| `vishakhapatnam-project` | Vishakhapatnam Project | Allipuram, Vishakhapatnam | 2023 |
