# Vanity Plate Poetry (local prototype)

A bare-bones version that runs entirely on one Windows PC, to prove the AI steps work before building the full site.

1. **Read:** a vision model (Qwen3-VL) reads the text off each plate photo.
2. **Decode:** a writing model (Gemma 3) works out what each plate says in plain words (LIV2FSH = "live to fish").
3. **Write:** Gemma picks at least 5 plates and puts them in order so the plates themselves, shown one after
   another, read as a poem or sentence. It can't add any words of its own, like magnetic poetry.

The page shows the result as the plate photos in order, with a slideshow.

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
4. Press **1. Read plates**, check the readings (you can type over any of them), then press **2. Write**.

Readings are saved to `plates.json`, so photos are only read once. Tested on an RTX 5080 (16 GB), where reading takes about a second per plate.

## Why a server?

Ollama refuses requests from a page opened straight from disk (`file://`), but allows `localhost`.
`server.ps1` serves this folder, lists the photos at `/api/images`, and saves `plates.json` at `/api/save`.
It only needs the PowerShell that comes with Windows.

## Known issues

- Poems are mostly word salad so far ("Welcome / Death Corp / Fear God / Omg Late / Positive / Pie Life").
  More plates and a stronger writer model should help.
- Some decoded meanings are wrong. Fix them in the second box under each photo.
- The "sentence" option needs work.
# Vanity Plate Poetry
The project: a website that turns photos of vanity license plates into sentences and poems. You upload or pick plate photos, each plate is read as words (e.g. "GR8 DAY" → "great day"), and the plates get arranged into a sentence or poem. It's an art piece, so the visual design matters.
