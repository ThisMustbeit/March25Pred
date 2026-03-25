# Prednisone Taper Calendar Generator

A plain static website for generating a prednisone taper schedule, monthly calendar view, tablet breakdown, warnings, and print-friendly output.

This project uses:

- `index.html`
- `style.css`
- `script.js`

There is:

- no framework
- no backend
- no package manager required
- no build step required

It is ready to deploy directly to GitHub and Cloudflare Pages as a static site.

## Final Folder Structure

```text
Codex/
├─ index.html
├─ style.css
├─ script.js
├─ README.md
└─ analysis/                optional local workbook-analysis files
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
