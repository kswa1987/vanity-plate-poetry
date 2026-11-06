# Vanity Plate Poetry (local prototype)

A bare-bones version that runs entirely on one Windows PC, to prove the AI steps work before building the full site.

1. **Check:** before any AI runs, every photo gets two fingerprints. Exact copies (same file) and near copies
   (the same picture resized or re-sent through a chat app) are set aside, so they're never read.
2. **Read:** a vision model (Qwen3-VL) decides whether the photo shows a readable plate at all, reads its text,
   and finds where the plate is, so the page can crop each photo down to just the plate. Photos with no plate
   (screenshots, memes, scenery) are set aside. When the same plate shows up in several photos, only the one
   where the plate is biggest (usually the clearest) is kept. Each plate is then read a second time from an
   enlarged close-up. If the two reads disagree, Qwen compares them character by character against the
   close-up and picks or corrects one. On a hand-checked sample this cut misreads roughly in half.
3. **Decode:** a reasoning model (gpt-oss 20B) works out what each plate means, sounding it out and thinking
   about slang, memes, car culture and pop culture (D8NG3R = "danger", TOTHLES = "toothless"). It also flags
   ordinary state-issued plates (like TGL 7366), which are left out of poems. On 40 hand-checked plates it got
   about 27 right, against about 21 for Gemma 3 12B.
4. **Write:** Gemma picks at least 5 plates and puts them in order so the plates, shown one after another,
   read as a poem or sentence, like magnetic poetry. It may add at most 2 small connecting words
   ("and", "of my") between plates, and nothing else.

The page is deliberately plain, web 1.0 style: the result is one horizontal line of cropped plates with
any connecting words between them, and the plain-text reading underneath.

## Setup

1. Install [Ollama](https://ollama.com), then download the three models (about 28 GB):

   ```
   ollama pull qwen3-vl:8b-instruct
   ollama pull gpt-oss:20b
   ollama pull gemma3:12b
   ```

   Use the `-instruct` Qwen. The plain `qwen3-vl:8b` "thinks" first, ignores the setting that turns that
   off, and runs out of room before it answers.
2. Put your plate photos (`.jpg`, `.png`, `.webp`) in this folder, next to `index.html`. The photos aren't
   in the repo.
3. Double-click **Start Plate Poems.bat**. It starts a tiny local web server (`server.ps1`) at
   http://localhost:8765 and opens the page.
4. Press **Check & read photos**, look over the table (you can type over any reading, and tick or untick
   "Use" to override what was set aside), then press **Write**.

Readings are saved to `plates.json`, so photos are only read once. Tested on an RTX 5080 (16 GB), where reading takes about a second per plate.

## Why a server?

Ollama refuses requests from a page opened straight from disk (`file://`), but allows `localhost`.
`server.ps1` serves this folder, lists the photos at `/api/images`, and saves `plates.json` at `/api/save`.
It only needs the PowerShell that comes with Windows.

## Known issues

- Poems still don't make much sense ("Danger of Fear God and ATX King to Live 2 Fish but Str Girl Welcome").
  More plates and a stronger writer model should help.
- About a third of meanings are still wrong, mostly memes and inside jokes (V DMUIR = "very demure" is
  missed). Fix them in the "What it means" column. Meanings you type in are kept when you press
  "Work out meanings again".
- Decoding with gpt-oss takes about 4 seconds per plate (roughly 30 minutes for 450 plates), once.
  Results are saved in `plates.json`.
- Two photos of the same plate only count as the same plate if Qwen reads them identically (ignoring spaces
  and symbols). A one-letter misread lets a repeat slip through. Fixing the reading in the table catches it.
# Vanity Plate Poetry
The project: a website that turns photos of vanity license plates into sentences and poems. You upload or pick plate photos, each plate is read as words (e.g. "GR8 DAY" → "great day"), and the plates get arranged into a sentence or poem. It's an art piece, so the visual design matters.