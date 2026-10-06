# CalendRx - Medication Taper Calendar Generator

A plain static website for generating a prednisone taper schedule, monthly calendar view, tablet breakdown, warnings, and print-friendly output.

This project uses:

- `index.html`
- `style.css`
- `script.js`
- `tutorial.js`
- `password-toggle.js`
- `print-preview.js`
- `print-calendar.css`

There is:

- no framework
- no backend
- no package manager required
- no build step required

It is ready to deploy directly to GitHub and Cloudflare Pages as a static site.

## Patient Assistance Programs

The protected `/tools/patient-assistance/` page searches 260 program listings: 72 from the supplied Innovicares Nova Scotia guide dated October 2, 2026, and 91 from the supplied undated RxHelp Nova Scotia PDF, and 16 from the supplied APOAssist product dropdown screenshot. APOAssist entries link to https://www.apoassist.com/en/ and use a Canada source label rather than implying Nova Scotia-specific coverage. Program tags open official websites. Matching brand names are merged into 216 drug/product cards with both program tags and their own source references. Formulation suffixes remain distinct. Search checks ingredients and aliases from both lists; program filters retain all available tags on matching cards. Both original PDFs are linked; this is not a live coverage lookup.

Deploy the complete `tools/patient-assistance/` directory (including its PDF, CSS, and JavaScript files) and updated `tools/index.html`. Run `node analysis/patient-assistance-check.cjs` for data and simulated-DOM interaction checks. Brand names were read from the logos on all three PDF pages; ingredient captions were cross-checked against extracted text. Rocaltrol's Innovicares ingredient follows the logo spelling, with the caption spelling retained as a search alias. RxHelp ingredient captions are preserved as supplied (some abbreviate combination ingredients); Plaquenil also matches the correctly spelled sulfate. RxHelp's Biaxin entry spans pages 1 and 2 and is counted once. Include rxhelp-data.js when uploading.

## Sig List & Shortcuts

Open `/tools/sigs/` from the Tools directory to add or edit shortcuts, meanings, notes, and comma-separated tags. Search covers all fields; tag buttons filter the list. The bundled `tools/sigs/ls-data.js` contains 568 shortcuts transcribed from all 14 pages of the supplied LS reference, each tagged LS with a source page note. Unusual source wording is preserved, with specific verification notes for G1.5TS and INS1. `analysis/ls-transcription.txt` contains the page-by-page transcription used to build the catalog.

New browsers receive the bundled catalog automatically. Existing browser lists gain missing catalog entries without overwriting matching local shortcuts. A catalog version marker is saved with edits so removed entries stay removed on reload. The CS catalog adds 662 entries from all 17 pages of CO Sigs.pdf, tagged CS; exact matches share tags, and different meanings stay separate (794 combined entries in a fresh library). Existing LDS tags and source references migrate to LS without altering shortcut text. Upload ls-data.js and cs-data.js with the updated sigs.js and index.html. Source copies are included as Sig list LS.pdf and CO Sigs.pdf. Personal edits remain in local browser storage, not synced between devices. Export/import JSON backups to transfer the list; imports combine tags and source notes for identical code/meaning pairs while keeping different meanings separately. Removals have an Undo button until the page reloads or another entry is removed.

Deploy the `tools/sigs/` directory and the updated `tools/index.html`. Run `node analysis/sig-list-check.cjs` for data and simulated-DOM interaction checks.

## Print Preview

The Print Preview below Schedule Overview displays each month on Letter paper, with fit-to-width and percentage zoom controls. The preview and actual printing share `print-calendar.css` and the generated print markup. Include `print-preview.js` and `print-calendar.css` at the site root when deploying.

Run `node analysis/print-preview-check.cjs` to check preview markup, orientation, zoom, and updates. These checks use a simulated DOM and do not verify browser layout or printer settings.

## Interactive Tutorial

The Tutorial button in Taper Settings walks through a sample advanced taper on the actual form. It includes animated entry, field highlighting, Back, Next, Pause/Resume, and Exit. Exit restores the previous inputs; Keep this example retains the demonstration calendar. Include `tutorial.js` at the site root when deploying (and `password-toggle.js` for the Tools password controls).

Run the tutorial interaction and schedule checks with `node analysis/tutorial-check.cjs`. These use a simulated DOM and the real schedule engine; they do not verify browser layout.

## Final Folder Structure

```text
Codex/
â”œâ”€ index.html
â”œâ”€ style.css
â”œâ”€ script.js
â”œâ”€ README.md
â””â”€ analysis/                optional local workbook-analysis files
```

Recommended for deployment:

- upload `index.html`
- upload `style.css`
- upload `script.js`
- upload `README.md`

The `analysis/` folder is not required for the live website. It can stay in the repo for documentation, or you can remove it before publishing if you do not want to include workbook-analysis artifacts.

## Run Locally

You can test the site locally by opening `index.html` in your browser.

Because this is a static site, you do not need to install anything first.

## GitHub Upload Guide

If you are new to GitHub, here is the simplest path.

### Option 1: Upload in the GitHub website

1. Sign in to GitHub.
2. Create a new repository.
3. Give it a name, for example: `prednisone-calendar`.
4. Click `Create repository`.
5. On the new repository page, click `Add file` then `Upload files`.
6. Drag in these files:
   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`
7. Optionally drag in the `analysis` folder too if you want to keep the workbook notes in the repo.
8. Add a commit message like `Initial static site upload`.
9. Click `Commit changes`.

### Option 2: Upload with Git on your computer

Open a terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial static site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

Replace:

- `YOUR-USERNAME`
- `YOUR-REPO-NAME`

with your actual GitHub values.

## Cloudflare Pages Deployment Guide

This site works on Cloudflare Pages without any build command.

### Connect the GitHub repo to Cloudflare Pages

1. Sign in to Cloudflare.
2. Go to `Workers & Pages`.
3. Click `Create application`.
4. Choose `Pages`.
5. Click `Connect to Git`.
6. Authorize GitHub if Cloudflare asks.
7. Select the repository that contains this project.
8. Click `Begin setup`.

### Cloudflare Pages settings

Use these settings:

- **Production branch:** `main`
- **Framework preset:** `None`
- **Build command:** leave blank
- **Build output directory:** leave blank or use `/`
- **Root directory:** leave blank

Then click `Save and Deploy`.

Cloudflare Pages will serve `index.html` from the repository root.

## Important File Name and Path Notes

These files should stay at the project root:

- `index.html`
- `style.css`
- `script.js`

These references must stay consistent:

- `index.html` loads `style.css` with:
  - `<link rel="stylesheet" href="style.css">`
- `index.html` loads `script.js` with:
  - `<script src="script.js"></script>`

If you rename or move these files, you must update those paths in `index.html`.

## No Build Step Needed

This project is intentionally set up so Cloudflare Pages can serve it directly.

That means:

- no `package.json` is required
- no `npm install` is required
- no bundler is required
- no transpiler is required

## Suggested Repo Contents

For a clean deployment repo, keep at least:

- `index.html`
- `style.css`
- `script.js`
- `README.md`

Optional:

- `analysis/`

## Troubleshooting

### The site deploys but looks unstyled

Check that:

- `style.css` is in the repo root
- `index.html` still references `style.css`

### The site loads but the calculator does nothing

Check that:

- `script.js` is in the repo root
- `index.html` still references `script.js`
- the browser console does not show a JavaScript error

### Cloudflare asks for a build command

Use:

- Framework preset: `None`
- Build command: blank
- Output directory: blank

## Beginner Summary

If you want the shortest version:

1. Put `index.html`, `style.css`, `script.js`, and `README.md` in a GitHub repo.
2. Connect that repo to Cloudflare Pages.
3. Choose `None` as the framework.
4. Leave the build command empty.
5. Deploy.

That is enough for this project.

MyRx Care: `tools/patient-assistance/myrxcare-data.js` imports 78 manufacturer-program listings (54 distinct medication names) from the public directory at https://myrx.care/, reviewed October 2, 2026. Each tag links to its manufacturer program. Directory spellings are retained, including Cladrabine with a cladribine search alias; ingredients absent from the directory are not inferred. Include this file in uploads.

## Firebase accounts for sigs

The sig library now uses Firebase browser modules without an npm build. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for console configuration, owner permissions, uploading updated files, browser-list migration and verification. The tools password gate remains separate from account sign-in.
