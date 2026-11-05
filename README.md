# Vanity Plate Poetry (local prototype)

A bare-bones version that runs entirely on one Windows PC, to prove the AI steps work before building the full site.

1. **Read:** a vision model (Qwen3-VL) reads the text off each plate photo and finds where the plate is,
   so the page can crop each photo down to just the plate.
2. **Decode:** a writing model (Gemma 3) works out what each plate says in plain words (LIV2FSH = "live to fish").
3. **Write:** Gemma picks at least 5 plates and puts them in order so the plates, shown one after another,
   read as a poem or sentence, like magnetic poetry. It may add at most 2 small connecting words
   ("and", "of my") between plates, and nothing else.

The page is deliberately plain, web 1.0 style: the result is one horizontal line of cropped plates with
any connecting words between them, and the plain-text reading underneath.

## Setup

1. Install [Ollama](https://ollama.com), then download the two models (about 14 GB):

   ```
   ollama pull qwen3-vl:8b-instruct
   ollama pull gemma3:12b
   ```

   Use the `-instruct` Qwen. The plain `qwen3-vl:8b` "thinks" first, ignores the setting that turns that
   off, and runs out of room before it answers.
2. Put your plate photos (`.jpg`, `.png`, `.webp`) in this folder, next to `index.html`. The photos aren't
   in the repo.
3. Double-click **Start Plate Poems.bat**. It starts a tiny local web server (`server.ps1`) at
   http://localhost:8765 and opens the page.
4. Press **Read plates**, check the readings in the table (you can type over any of them), then press **Write**.

Readings are saved to `plates.json`, so photos are only read once. Tested on an RTX 5080 (16 GB), where reading takes about a second per plate.

## Why a server?

Ollama refuses requests from a page opened straight from disk (`file://`), but allows `localhost`.
`server.ps1` serves this folder, lists the photos at `/api/images`, and saves `plates.json` at `/api/save`.
It only needs the PowerShell that comes with Windows.

## Known issues

- Poems still don't make much sense ("Danger of Fear God and ATX King to Live 2 Fish but Str Girl Welcome").
  More plates and a stronger writer model should help.
- Some decoded meanings are wrong. Fix them in the "What it means" column.
# Vanity Plate Poetry
The project: a website that turns photos of vanity license plates into sentences and poems. You upload or pick plate photos, each plate is read as words (e.g. "GR8 DAY" → "great day"), and the plates get arranged into a sentence or poem. It's an art piece, so the visual design matters.