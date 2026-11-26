// SAMPLE DATA for the client portal prototype. Made up - not a real client or project.
// In the live portal this comes from the private database, and a client only ever receives their own project.
// The admin page (admin.html) edits a copy of this saved in the browser; see portalData() below.
window.PORTAL_SAMPLE = {
  admin: { username: "admin", password: "admin123" },
  projects: [
    {
      id: "sample-3bhk-lalpur",
      sample: true,
      login: { username: "demo", password: "demo123" },
      project: {
        title: "3BHK Residence Interiors",
        location: "Lalpur, Ranchi",
        client: "Sample Client",
        architect: "Utkarsh Raipat",
        handover: "2027-03-05",
        updated: "2026-11-24"
      },
      // planned and actual dates per stage; progress is % of the stage done
      stages: [
        { name: "Design & approvals",       planned: ["2026-07-01", "2026-08-10"], actual: ["2026-07-01", "2026-08-18"], progress: 100 },
        { name: "Demolition & civil",       planned: ["2026-08-11", "2026-09-15"], actual: ["2026-08-19", "2026-09-20"], progress: 100 },
        { name: "Electrical & plumbing",    planned: ["2026-09-10", "2026-10-15"], actual: ["2026-09-18", "2026-10-20"], progress: 100 },
        { name: "False ceiling",            planned: ["2026-10-10", "2026-11-10"], actual: ["2026-10-15", "2026-11-12"], progress: 100 },
        { name: "Flooring & tiling",        planned: ["2026-11-01", "2026-12-05"], actual: ["2026-11-05", null],         progress: 60 },
        { name: "Carpentry & furniture",    planned: ["2026-11-20", "2027-01-25"], actual: ["2026-11-24", null],         progress: 10 },
        { name: "Painting & polish",        planned: ["2027-01-10", "2027-02-15"], actual: [null, null],                 progress: 0 },
        { name: "Lights, fixtures & handover", planned: ["2027-02-10", "2027-03-05"], actual: [null, null],             progress: 0 }
      ],
      // Bill of quantities: [item, qty, unit, rate (Rs), % executed]
      boq: [
        { group: "Civil works", items: [
          ["Demolition & debris removal", 1, "LS", 45000, 100],
          ["Brickwork, 115 mm walls", 380, "sq ft", 210, 100],
          ["Wall plastering", 1250, "sq ft", 65, 100],
          ["Waterproofing, toilets & balcony", 420, "sq ft", 95, 100]
        ]},
        { group: "Electrical", items: [
          ["Concealed wiring points", 86, "points", 1450, 100],
          ["Distribution board & MCB upgrade", 1, "LS", 38000, 100],
          ["Light fixtures, supply & fixing", 64, "nos", 1850, 0]
        ]},
        { group: "Plumbing & sanitary", items: [
          ["CPVC / UPVC water & drain lines", 1, "LS", 72000, 100],
          ["Sanitaryware & CP fittings", 3, "sets", 58000, 0]
        ]},
        { group: "False ceiling", items: [
          ["Gypsum false ceiling", 1180, "sq ft", 115, 100],
          ["Cove & profile light provisions", 210, "rft", 160, 100]
        ]},
        { group: "Flooring & tiling", items: [
          ["Vitrified tiles 1200 x 600, supply & laying", 1150, "sq ft", 185, 70],
          ["Toilet wall & floor tiles", 640, "sq ft", 145, 50],
          ["Granite kitchen platform", 42, "rft", 1250, 0]
        ]},
        { group: "Carpentry & furniture", items: [
          ["Modular kitchen", 1, "LS", 385000, 15],
          ["Wardrobes, laminate finish", 210, "sq ft", 1650, 10],
          ["TV unit & living storage", 1, "LS", 145000, 0],
          ["Beds with storage", 3, "nos", 62000, 0],
          ["Main & room doors", 6, "nos", 28500, 0]
        ]},
        { group: "Painting & polish", items: [
          ["Wall putty & emulsion paint", 3400, "sq ft", 38, 0],
          ["PU polish on woodwork", 520, "sq ft", 210, 0]
        ]},
        { group: "Handover", items: [
          ["Deep cleaning & snag fixing", 1, "LS", 18000, 0]
        ]}
      ],
      // payment schedule as % of the contract value; paid = date paid
      payments: [
        { milestone: "Booking advance",            pct: 10, due: "2026-07-01", paid: "2026-07-02" },
        { milestone: "Design sign-off",            pct: 10, due: "2026-08-20", paid: "2026-08-20" },
        { milestone: "Civil works complete",       pct: 20, due: "2026-09-25", paid: "2026-09-25" },
        { milestone: "Electrical & plumbing complete", pct: 15, due: "2026-10-25", paid: "2026-10-24" },
        { milestone: "False ceiling complete",     pct: 10, due: "2026-11-20", paid: null },
        { milestone: "Flooring complete",          pct: 10, due: "2026-12-10", paid: null },
        { milestone: "Carpentry complete",         pct: 15, due: "2027-01-30", paid: null },
        { milestone: "Handover",                   pct: 10, due: "2027-03-05", paid: null }
      ],
      updates: [
        { date: "2026-11-24", stage: "Carpentry & furniture",
          note: "Final measurements for the modular kitchen and wardrobes taken on site. Factory production has started; delivery expected in the first week of January.",
          photos: ["../../assets/uploads/2025/09/4-15.jpg"] },
        { date: "2026-11-20", stage: "Flooring & tiling",
          note: "Living and dining tiles laid, about 70% of the flooring done. Toilet wall tiling is under way in the master bathroom.",
          photos: ["../../assets/uploads/2025/09/2-26.jpg", "../../assets/uploads/2025/09/1-29.jpg"] },
        { date: "2026-11-12", stage: "False ceiling",
          note: "False ceiling finished and checked. Cove lighting channels are ready for fixtures.",
          photos: ["../../assets/uploads/2025/09/3-19.jpg"] },
        { date: "2026-10-20", stage: "Electrical & plumbing",
          note: "Plumbing pressure test passed. All wiring points tested; distribution board upgraded.",
          photos: ["../../assets/uploads/2025/09/5-9.jpg"] }
      ]
    }
  ]
};

// Prototype storage: the admin page saves edits in this browser (localStorage); the portal reads them back.
window.PORTAL_KEY = "uas-portal-data-v1";
window.portalData = () => {
  try {
    const saved = localStorage.getItem(window.PORTAL_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* storage blocked or bad data: fall back to the sample */ }
  return JSON.parse(JSON.stringify(window.PORTAL_SAMPLE));
};
window.savePortalData = data => {
  localStorage.setItem(window.PORTAL_KEY, JSON.stringify(data)); // throws if storage is full or blocked
};
