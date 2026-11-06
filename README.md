# Vanity Plate Poetry (local prototype)

A bare-bones version that runs entirely on one Windows PC, using only local AI models, to prove the AI steps
work before building the full site.

1. **Check:** before any AI runs, every photo gets two fingerprints. Exact copies (same file) and near copies
   (the same picture resized or re-sent through a chat app) are set aside, so they're never read.
2. **Read:** a vision model (Qwen3-VL) decides whether the photo shows a readable plate at all, reads its text,
   and finds where the plate is, so the page can crop each photo down to just the plate. Photos with no plate
   (screenshots, memes, scenery) are set aside. When the same plate shows up in several photos, only the one
   where the plate is biggest (usually the clearest) is kept. Each plate is then read a second time from an
   enlarged close-up. If the two reads disagree, Qwen compares them character by character against the
   close-up and picks or corrects one. On a hand-checked sample this cut misreads roughly in half.
3. **Decode:** a reasoning model (gpt-oss 20B) works out what each plate means, sounding it out and thinking
   about number-for-letter swaps (L1MTL3S = "limitless"), slang, memes, car culture and pop culture
   (D8NG3R = "danger", TOTHLES = "toothless"). A heart is a spacer inside a word or phrase (JOY♥US = "joyous")
   but "loves" between two things (JEZUS♥U = "Jesus loves you"). It flags ordinary state-issued plates
   (like TGL 7366), which are left out, and says how confident it is.
4. **Needs your help:** only the plates the AI is unsure of are listed at the top, because the two reads
   disagreed, the decoder said it was guessing, or the meaning doesn't look like real words. Fix the plate or
   meaning, or press "Looks right". Everything a person checks is kept for good.
5. **Line up:** gpt-oss lines up at least 5 plates like magnetic poetry on a fridge, aiming for something
   funny (an absurd sentence, a weird juxtaposition, an accidental confession) rather than a strict poem.
   It may add at most 2 small glue words ("and", "my", "but") between plates, and nothing else. It only
   uses plates with a clear meaning, offers 4 lineups at a time, and all 4 are shown so a person can pick.

The page is deliberately plain, web 1.0 style: each lineup is one horizontal line of cropped plates with
any glue words between them, and the plain-text reading underneath.

## Setup

1. Install [Ollama](https://ollama.com), then download the two models (about 20 GB):

   ```
   ollama pull qwen3-vl:8b-instruct
   ollama pull gpt-oss:20b
   ```

   Use the `-instruct` Qwen. The plain `qwen3-vl:8b` "thinks" first, ignores the setting that turns that
   off, and runs out of room before it answers. (Gemma 3 12B also works as a decoder or writer if you type
   `gemma3:12b` into the boxes at the top of the plate list, but it did noticeably worse in testing.)
2. Put your plate photos (`.jpg`, `.png`, `.webp`) in this folder, next to `index.html`. The photos aren't
   in the repo.
3. Double-click **Start Plate Poems.bat**. It starts a tiny local web server (`server.ps1`) at
   http://localhost:8765 and opens the page.
4. Press **Check & read photos**. Then help with the short "Needs your help" list (optional, but it makes the
   lineups much better), and press **Line up**.

Everything is saved to `plates.json`, so each step only runs once per photo. Timings on an RTX 5080 (16 GB):
checking and reading about 2 seconds per photo, decoding about 2.5 seconds per plate, and about a minute per
batch of 4 lineups.

## Why a server?

Ollama refuses requests from a page opened straight from disk (`file://`), but allows `localhost`.
`server.ps1` serves this folder, lists the photos at `/api/images`, and saves `plates.json` at `/api/save`.
It only needs the PowerShell that comes with Windows.

## Known issues

- Lineups are hit and miss: some are funny, many are still lists of unrelated things. Fixing the meanings in
  "Needs your help" improves them the most, since garbled meanings can't be lined up into anything.
- Local models miss a lot of memes and inside jokes (V DMUIR = "very demure"), and not every miss gets
  flagged as low confidence. Any meaning can also be fixed in the full plate list.
- Two photos of the same plate only count as the same plate if Qwen reads them identically (ignoring spaces
  and symbols). A one-letter misread lets a repeat slip through. Fixing the reading in the table catches it.

# Vanity Plate Poetry
The project: a website that turns photos of vanity license plates into sentences and poems. You upload or pick plate photos, each plate is read as words (e.g. "GR8 DAY" → "great day"), and the plates get arranged into a sentence or poem. It's an art piece, so the visual design matters.
