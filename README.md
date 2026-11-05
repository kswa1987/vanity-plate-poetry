# Vanity Plate Poetry

Approved members upload photos of vanity license plates. An AI finds the plate in each photo, reads it,
and works out what it means. Once a day the AI writes a poem from at least 5 plates, and the home page
shows it along with each plate and the member who uploaded it.

## How it fits together

- **The website** runs on [Vercel](https://vercel.com) (free "Hobby" plan) and keeps everything, including
  the photos, in a [Neon](https://neon.com) Postgres database (free tier, about 0.5 GB, roughly 1,500 photos).
- **The AI** runs on your own PC with [Ollama](https://ollama.com). A small helper program (`worker/`) checks
  the website every minute for new photos, reads them, and writes the daily poem. Nothing gets read or
  written while your PC or the helper is off; it all catches up when they're back on.
- Optionally, set `LLM_MODE=claude` to have the website use the Claude API instead, so it works without your PC
  (this costs a little per plate and per poem).

### How a photo is checked

1. The photo is shrunk in the browser, then again on the server (max 1568 px).
2. **Find:** the AI looks at the whole photo, says where the plate is, and takes a first read. No plate means rejected.
3. **Crop:** the site cuts the plate out (with a margin) and enlarges it.
4. **Read again:** the AI reads only the cropped plate, says if it's legible and how confident it is, and explains the meaning.
5. **Accept** only if it's legible, not low-confidence, both reads agree (one character of slack when confidence
   is high), and there's a meaning. Otherwise the uploader sees why it was rejected.

Admins see the cropped plate for every photo on the Admin page.

## Setup

### 1. Put the website online

1. Create a free account at [vercel.com](https://vercel.com) using "Continue with GitHub".
2. Click **Add New → Project**, pick the `vanity-plate-poetry` repository, and click **Deploy**.
   The site won't work until the next steps are done.
3. In the project, open **Storage → Create Database → Neon** and connect it. This sets `DATABASE_URL` for you.
4. Open **Settings → Environment Variables** and add:
   - `ADMIN_EMAIL`: the email you'll sign up with. That account becomes the admin automatically.
   - `WORKER_SECRET`: a long random password (for example from a password manager). The PC helper uses it.
   - `SITE_TIMEZONE`: your time zone, for example `America/Chicago` (optional, defaults to New York).
5. Go to **Deployments**, open the latest one, and click **Redeploy**.
6. Visit your site, click **Sign up**, and use the `ADMIN_EMAIL` address. New members who sign up show up
   on the **Admin** page for you to approve.

### 2. Run the AI on your PC

1. Install [Ollama](https://ollama.com/download) and [Node.js](https://nodejs.org) (the "LTS" version).
2. Open a terminal (Command Prompt) and download the two models (about 15 GB total, one time):
   ```
   ollama pull qwen2.5vl:7b
   ollama pull gemma3:12b
   ```
   `qwen2.5vl` reads the plates; `gemma3` writes the poems. Both fit on a 16 GB graphics card.
3. Copy the `worker` folder from this repository to your PC.
4. In that folder, copy `config.example.json` to `config.json` and fill in your site's address and the same
   `WORKER_SECRET` you set in Vercel.
5. Double-click `start-worker.bat` (or run `node worker.mjs`). Leave the window open; it logs each plate and poem.

You can switch models by editing `visionModel` and `poemModel` in `config.json` (any Ollama model with vision
support works for plates).

### Optional: use Claude instead of your PC

In Vercel, set `LLM_MODE=claude`, add `ANTHROPIC_API_KEY` (from [console.anthropic.com](https://console.anthropic.com))
and `CRON_SECRET` (any long random string), then redeploy. Plates are then checked the moment they're uploaded,
and Vercel triggers the poem every day at 12:00 UTC (see `vercel.json`).

## Running it locally (for developers)

```
cp .env.example .env.local   # point DATABASE_URL at a local Postgres
npm install
npm run dev
```

Tables are created automatically on first use.
