# Pictures, burning — partial lyric video

A short lyric video for the first verse of The Cure's *Pictures of You* (album
version, *Disintegration*, 7:28). It is rendered entirely in WebGL from
procedural shaders: there are no stock images or footage.

* Four blank instant-film prints lie loosely stacked on a dark walnut table under one lamp.
* Each sung word develops on the top print as if light had exposed the film.
  The word starts as a cold cyan latent image, grows out of its stroke centres
  with uneven chemistry and halation, then warms to cream as it develops.
* Each print then catches fire: the paper scorches straw to amber to brown, the
  emulsion blisters and its dyes cook, and a ragged ember front advances. Black
  char curls up and crumbles to ash. Flames come from a 2-D fluid solve seeded
  by the burn front. Through the holes, the next print and its line are revealed.
* On the downbeat of the interlude (2:17.9) the last print bursts into flame
  and is lifted by a gust. Ash, sparks and burning prints tumble past the
  camera, and the scene fades to black before the second verse.

## Words

The sung text is not stored in this repository. Copy `js/lyrics.example.js`
to `js/lyrics.local.js`, which is git-ignored, and fill in your lines: one entry
per print, rows of `[word, syllables]`. Keep the same number of words per
print as the example, because the timing segments index into them. Without
the local file, the placeholder words are shown.

## Timing

All times in `js/timing.js` are **song seconds on the album version**.
Line starts come from four independent community lyric syncs, which agree to
within about 0.05 s. They also sit on a steady 86.13 BPM grid at exactly two
bars per line, and the interlude starts on the bar line at 137.94 s.
Words inside a line are spread by syllable across the sung span of the line.
If anything feels early or late, nudge a line's `t` or `span`.

The video covers song time 1:51.2 → 2:35.6.

## Watch it live (with sound)

Serve this folder with any static server and open `index.html`. For example:

```bash
npx serve .
```

Pick your own copy of the album track in **Song file**, then press **Play**.
The visuals follow the audio clock. **Sync offset** shifts the visuals in
seconds if your copy is a different master.

## Render the video

You need Node 18 or newer, Playwright with Chromium, and ffmpeg. Install the
dependencies first:

```bash
npm install
```

```bash
node render.mjs                                    # out/pictures.mp4, 1920x1080 @ 30 fps, silent
node render.mjs --audio "07 Pictures of You.m4a"   # mux your copy of the album track
node render.mjs --w 960 --h 540                    # quick preview
node render.mjs --stills 114.6,118.9,139.2         # PNG stills at song times
node render.mjs --from 116 --to 121                # a time range only
```

Rendering is deterministic: every frame is stepped at a fixed timestep, so
fire, sparks and ash come out identical on every run. With software WebGL
(SwiftShader) a 1080p frame takes about 4 s.

To add audio to an already rendered silent file:

```bash
ffmpeg -i out/pictures.mp4 -ss 111.2 -i "Pictures of You.m4a" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest pictures_with_audio.mp4
```

## Code map

| file | what |
| --- | --- |
| `js/timing.js` | song timeline: lines, word syllables, burn ignitions, flourish |
| `js/textField.js` | lays out each print's words and builds a signed-distance field plus a per-word index |
| `js/polaroid.js` | print geometry and deformation, plus the develop, burn, char and ember shading; bakes static noise and the burn field |
| `js/fluid.js` | screen-space smoke and fire solver (stable fluids with vorticity confinement) |
| `js/particles.js` | motion-blurred sparks and tumbling ash flakes with ember edges |
| `js/table.js` | walnut tabletop |
| `js/lighting.js` | lamp-pool key light with soft (PCSS) shadows, fire lights, GGX, window reflections |
| `js/post.js` | fire and smoke composite, depth of field, bloom, ACES grade, grain |
| `js/main.js` | scene director: stack, camera, burns, gust, flying prints |
| `render.mjs` | headless frame renderer that pipes into ffmpeg |

Font: Cormorant Garamond (SIL Open Font License), in `fonts/`.
