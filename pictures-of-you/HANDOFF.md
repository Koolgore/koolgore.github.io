# Handoff: render this on a local machine (with a GPU)

This project was built in a cloud session without a GPU, where a frame takes several seconds.
On a normal computer with a graphics card it runs in real time. These steps are for a local
Claude Code session, or for doing it by hand.

## 1. Get the code

```bash
git clone https://github.com/Koolgore/koolgore.github.io.git   # or: git fetch, if already cloned
cd koolgore.github.io
git checkout claude/sweet-turing-wzdkbp
cd pictures-of-you
npm install
npx playwright install chromium     # only if Playwright's Chromium isn't installed yet
```

ffmpeg must be on PATH (`brew install ffmpeg` / `winget install ffmpeg` / `apt install ffmpeg`).

## 2. Add the words (not in the repo on purpose)

Copy `js/lyrics.example.js` to `js/lyrics.local.js` and replace the placeholder words with the
four sung lines, keeping the same structure: one entry per print, rows of `[word, syllables]`,
and the same word count per print. **Ask the user for the lines.** They are deliberately never
committed. `js/lyrics.local.js` is git-ignored.

## 3. Watch it live

```bash
npx serve .            # then open the printed URL in Chrome
```

Pick the album-version track (7:28, *Disintegration*) in **Song file** and press **Play**.
The visuals follow the audio clock. **Sync offset** nudges them.

## 4. Render

```bash
node render.mjs --gpu                                   # 1080x1920, 30 fps -> out/pictures.mp4 (silent)
node render.mjs --gpu --audio "/path/to/Pictures of You.m4a"   # with the song muxed in
node render.mjs --gpu --w 720 --h 1280 --fps 15 --emures 768   # quick preview
node render.mjs --gpu --stills 116.6,121.4,139.2       # PNG stills at song times
```

`--gpu` opens a visible browser window while it renders; leave it alone until it closes.
The script prints the WebGL renderer at startup. It should name the real graphics card, not
"SwiftShader". Rendering is deterministic, so every run gives the same frames.

## 5. Where things stand

* Done:
  * the scene and timing
  * the burn and fire
  * the finale
  * the 9:16 framing
  * the text, from the user's PolaroidTextSim (`vendor/`)
  * a photo under each print (credit in `README.md`: CC BY, Iván Santiesteban)
  * per-print light leaks
* Open decisions for the user:
  * scribbled or original photos (`PHOTO_SET` in `js/main.js`)
  * handwritten font or math-built letters
  * whether to tone down the sim's faint vertical streaks
  * a review of the burn and finale in 9:16 before the final render
* Background: `README.md` (overview), `PLAN-text.md` (research notes on the text), `render.mjs` (options).
