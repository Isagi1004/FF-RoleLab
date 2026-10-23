# FF RoleLab

A responsive, static Free Fire character-combination helper made with **HTML, CSS, and vanilla JavaScript**. No build step, package manager, server, or API key is required.

## Features

- Seven playstyles: Rusher, Support, Sniper, Flanker, IGL / Strategist, Defender / Anchor, and Solo Clutch.
- Filters for Battle Royale, Clash Squad, Lone Wolf, all modes, and weapon style.
- Rule-based ranking and three build options with explanations and fit scores.
- Full 67-entry character roster database in `character-data.js`, including newer releases.
- Character skill library with search and tag filters, plus visible evidence/verification labels.
- Synergy-aware role scoring that builds one active skill plus three passive skills and explains the coverage.
- Rate combinations, save favorites, restore a saved build's settings, and copy build details.
- Responsive dark/cyan UI.
- Favorites and ratings use browser `localStorage`; they stay in the same browser/device and are not shared between visitors.

## Run locally

1. Download and extract the ZIP.
2. Open `index.html` in a modern browser.

Or use VS Code's Live Server extension if you prefer a local preview server. A server is not required for the app itself.

## Publish with GitHub Pages

1. Sign in at https://github.com and create a **public** repository, for example `ff-rolelab`.
2. Upload `index.html`, `style.css`, `script.js`, `character-data.js`, `.nojekyll`, `README.md`, and the included `assets` folder to the repository root (not inside another nested folder).
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**, then click **Save**.
6. Wait for GitHub Pages to finish publishing. Your public URL will look like `https://YOUR-USERNAME.github.io/ff-rolelab/`.

If the site doesn't appear immediately, give Pages a minute and refresh. Every new commit to the selected branch will update the site.

## Important notes

- This is a front-end demo with a transparent rule-based scoring system, **not a trained ML model**. Fit scores describe how well a profile matches selected preferences; they are not win probabilities.
- The roster count is based on a secondary roster reference updated 14 October 2026. The database marks OB55 patch-updated entries separately; other ability summaries are explicitly labelled as needing in-game verification. The official OB55 patch notes are linked in the site. Do not treat unverified descriptions, exact values, or combo scores as official or as win-rate predictions.
- The recommendation layout assumes one active skill plus three passive skills. Confirm your current loadout rules and character availability in-game.
- Ratings and favorites are local to each visitor's browser. Public, cross-device ratings and a shared community database require a backend/database, which this static version intentionally does not include.
- This is a fan-made community project and is not affiliated with Garena or Free Fire.
- The Google Fonts import is optional; if unavailable, system fonts are used.
