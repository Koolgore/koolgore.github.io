# Plan: rebuild the Polaroid text as a real film simulation

This file is self-contained so a fresh session can pick the work up.

## Update: text now uses the user's PolaroidTextSim package

The user supplied a ready-made photochemical text engine, vendored in `vendor/polaroid-text-sim/` (engine, shaders and the OFL Caveat font, without the sample photos). `js/emulsion.js` runs one sim per print, stepped in fixed 1/30 s steps from its own start for deterministic renders, and feeds it to the print shader as the image texture. The plan below remains the route to a calibrated, physically derived version if the user wants to go further. Open items:

* the sim draws words with a handwritten font; the user earlier preferred math-built letter strokes, and those could feed the sim's exposure mask instead
* the sim's vertical "roller shaft" streaks could read as flame, so consider lowering `streakStrength`
* a per-frame render cost check
* review of the burn and finale in 9:16

## Where things stood before that

* The scene works end to end and defaults to 9:16 at 1080×1920:
  * stack of prints, light-written words, burn, fire fluid, sparks and ash
  * gust finale with tumbling prints
  * post chain
  * deterministic renderer (`render.mjs`)
* The **text is not good enough yet**. The latest pass (commit `77e5344`) is a hand-tuned approximation:
  * a sigmoid colour curve
  * a noise warp for "chemical" edges
  * a smoothstep development timeline
  * none of it calibrated against anything
* The sung words live only in `js/lyrics.local.js`, which is git-ignored. If the container is new, recreate it from the user's four lines; the shape is the same as `js/lyrics.example.js`. Never commit the lyrics.
* No final video has been rendered. The user asked not to render until the text is right.

## The target (agreed with the user)

Words that look like **intense warm light directly exposed the instant film, so overexposed that the cores burn through to white**. The overflow light spreads into the film around them as an orange-to-red glow.

**Before the burn there must be no flame read at all.** That rules out:

* a visible spark tip
* upward tongues
* flicker

Any irregularity must read as **film and chemistry**.

The reference mockup is `reference/text-mockup.jpg`.

### Measured from the mockup

All measurements are in sRGB 0..1, inside the image square. Distances are in x-heights (xh) from the edge of the white core. Here 1 xh ≈ 6 % of the image width.

| distance from core | mean colour (R, G, B) |
| --- | --- |
| 0 (core) | 0.86, 0.83, 0.79, cream with a faint lavender cast in the brightest spots |
| 0.06 xh | 0.86, 0.79, 0.66 |
| 0.12 xh | 0.84, 0.70, 0.49 |
| 0.20 xh | 0.79, 0.58, 0.36 |
| 0.35 xh | 0.67, 0.42, 0.25 |
| 0.58 xh | 0.45, 0.25, 0.15 |
| 0.80 xh | 0.33, 0.19, 0.12 |
| 1.09 xh | 0.24, 0.14, 0.09 |
| 1.45 xh | 0.18, 0.11, 0.08 |
| 2.0 xh | 0.13, 0.09, 0.07 |
| far background | 0.097, 0.077, 0.067: warm, lifted brown-black, not pure black |

* **Core stroke width** ≈ 0.26 xh.
* **Falloff.** It is smooth and **heavy-tailed**, reaching about 1.5 to 2 xh.
  * Green drops faster than red, and blue fastest: G/R goes from 0.96 to about 0.55 by 0.6 xh.
  * This is the layer-saturation order of warm light on colour film.
* **Edge fog, by side:**
  * left strong (0.51, 0.33, 0.18)
  * bottom moderate (0.28, 0.21, 0.16)
  * top slight (0.21, 0.15, 0.12)
  * right none

## What the research established

Sources are listed at the end.

1. **Scale matters more than anything.** spektrafilm's physical defaults show the scale of real in-film spreading effects:
   * emulsion scatter: Gaussian core σ ≈ 2 µm plus an exponential tail of about 9 µm
   * halation: first σ ≈ 65 µm, 3 bounces, decay 0.5
   * coupler chemical spread: about 20 µm, with a 200 µm tail

   One texel of a 1024² Polaroid image is about 77 µm (the image is 79 mm across), so all of these are **about one texel or less**. The mockup's glow reaches **2 to 4 mm**. Classic halation and chemical spread cannot produce it.
2. **What can produce mm-scale glow: the light's geometry, plus massive overexposure.**
   * A source held a short height *h* above the film delivers irradiance ∝ (1 + (r/h)²)^(-n), with n ≈ 1.5 for a point source and n ≈ 2 for a Lambertian emitter.
   * The tail is heavy (≈ r⁻³), and the film responds to **log** exposure.
   * At 1000× overexposure the visible radius is about 10 h. A pen 0.2 to 0.4 mm above the film gives a 2 to 4 mm glow.
   * Varying the hand height along a stroke varies glow width and core heat. This is the natural, non-flame irregularity.
3. **The colour sequence follows from the film itself.**
   * In Polaroid's integral film, exposed silver halide immobilises the dye developer of its layer. Exposed areas therefore get *less* dye and go white over the white reflecting pigment.
   * Warm light saturates the red-sensitive layer first (blocking cyan), then green (blocking magenta), then blue (blocking yellow).
   * As irradiance falls off, the layers drop out in turn: white, then yellow, then orange, then red, then black. That is exactly the measured table.
   * The Emulating Emulsion SIGGRAPH 2025 poster shows the per-layer response is well modelled by a 4-parameter sigmoid in log exposure: A / (1 + e^(-k(x - x0))) + y0.
4. **Classic halation is weak on Polaroid.**
   * The integral film's emulsion stack sits on an **opaque black** base, which acts as an anti-halation backing.
   * The red, then orange halation ring described for movie film (Dehancer: orange near the overexposed edge, red further out, visible only against dark backgrounds) should be at most a minor contributor here.
   * A plausible extra on this film is light piped sideways inside the clear polyester front sheet: a faint, very long, soft glow.
5. **Instant-film chemistry, and where its irregularity comes from.**
   * Rollers spread a strongly alkaline reagent from a pod at the bottom border. The reagent carries white pigment, opacifying dyes and a thickener.
   * Dyes then diffuse up into the image-receiving layer, **each layer on its own timing**.
   * The opacifier keeps the image dark, then clears over minutes, which is why prints emerge dark and cool.
   * Known irregularities:
     * uneven reagent spread (dirty or misaligned rollers): streaks along the spread direction, blotches, coverage varying away from the pod
     * "blue lightning", where opacifier coverage is thin and light got in
     * slower or faint development in cold
     * colour shifts in heat
   * Physically, the **lateral** dye bleed is tiny (tens of µm). The visible chemical irregularity is *density and development-rate variation* at mm scale, plus fine dye-cloud mottle, not frayed outlines.
6. **Light leaks, procedurally.** Two published approaches:
   * a low-frequency noise "plasma" for luminance (3 octaves), plus 1 octave per colour channel (Wagner)
   * a soft glow stretched along an edge, warped by slow noise and streaked, summed in linear light, then given a tone curve, a faint halation rim and grain (shadcn)

   On film, a leak should be added as **exposure**, so the film curve colours it (orange or red at the edges).
7. **Energy-conserving scatter** (spektrafilm's approach): (1 - s)·E + s·[core ⊗ E + tail ⊗ E]. Extra light is redistributed, not added, so cores keep their energy and contrast behaves.

### Honest implication

The mockup's **spiky, licking fringe is not something real film chemistry produces around letters**.

* The physically grounded version is a **smooth, heavy-tailed glow** whose width varies with the hand.
* Its density is broken up by mm-scale reagent unevenness and fine dye mottle.
* If spikes are wanted, they would be a stylisation, and any upward bias reads as flame. This needs the user's call (see "Questions").

## The model to build

Units are the real print: the image area is 79 × 79 mm, simulated at 2048² (≈ 39 µm per texel) and displayed through 1024² mips.

### 1. Exposure from the light pen (per dye layer)

* Keep the stroke alphabet and handwriting kinematics in `js/lightGlyphs.js`. Also emit the pen **height h(t)** per sample: a slow hand drift of ±30 %, slightly lower at stroke starts.
* Light spectrum: warm (≈ 2700 to 3200 K). Per-layer exposure weights S = (S_R, S_G, S_B) are fitted (step 0), expected roughly 1 : 0.45 : 0.12.
* Kernel: K_h(r) ∝ (1 + (r/h)²)^(-n), convolved with a small source disc of radius a. Implement it as a **sum of Gaussians on a pyramid**: σ_k = σ0·2^k, k = 0..7, with weights w_k(h) fitted per h.
  * Splat each sample's dose into **8 scale channels** (two RGBA float targets).
  * Weight channel k by that splat's w_k(h). This gives per-splat kernel width at no extra cost.
  * Blur channel k at σ_k through a mip chain, then sum. Use float targets: the dynamic range must reach about 10⁴ times the threshold.
* Energy-conserving in-film scatter, the polyester light-piping glow, and the weak halation are tiny. Add them as fixed small terms only if the fit asks for them.

### 2. Film response (per dye layer, positive integral film)

* Fraction of dye blocked by layer c: B_c = A_c / (1 + exp(-k_c (log10 E_c - x0_c))) + y0_c.
* Dye remaining for transfer: 1 - B_c, scaled to D_max,c.
* Print reflectance: light passes the dye twice over the white pigment, R(λ) = R_white · 10^(-2·Σ D_c·ε_c(λ)). In RGB this is a 3×3 matrix of dye absorptions, including the unwanted side absorptions.
* Fit D_max and base so the unexposed area lands on the measured warm black (0.097, 0.077, 0.067 sRGB).

### 3. Development as a time simulation (GPU, per print, only while developing)

* **Reagent thickness map** τ(x), generated once per print by a simple spread simulation from the pod edge at the bottom border:
  * roller-gap streaks along the spread axis
  * blotches
  * coverage thinning toward the far edge
  * keep the amplitude modest, and keep streaks subtle, so nothing reads as rising flame
* **Opacifier** transmission O(x, t) = 1 - exp(-(t - t0)/τ_o(x)). It starts dark teal-black and clears unevenly, a little faster where the reagent is thinner.
* **Dye arrival** per layer: D_c(x, t) = D_final,c(x) · (1 - exp(-(t - lag_c)/τ_c(x))), with a different lag and τ per layer. This produces the colour drift during development; the direction needs a reference timelapse.
* **Time compression**: the real 10 to 15 minutes becomes about 2 to 3 s per word. A word "blossoms" because the opacifier clears and the dyes arrive, not because of a scripted fade.
* **Fine dye clouds and grain** at the real scale, multiplying density (not added on top).

### 4. Edge fog and leaks

Add procedural leak **exposure** before the response curve:

* glow along an edge, warped by slow noise, streaked along the edge
* side strengths from the measured table
* one optional soft round spot

It builds while each line is exposed.

### 5. Letters

* Basic stroke alphabet, as now. Spot size is set by h; the core width should land near **0.26 xh**, as in the mockup.
* Letter spacing is wide enough that neighbouring glows merge only slightly.

## Tooling and validation (build these first)

* `tools/fit_profile.py` (offline, numpy and scipy):
  * simulates the 1-D cross-section of a straight stroke through the kernel and response
  * fits h, n, S, the sigmoid parameters and D_max to the table above by least squares in Lab
  * writes the parameters to `js/filmParams.js`
  * **Acceptance:** mean ΔE ≤ 5 across the table, with the G/R and B/R ratio curves matching
* `film-lab.html`, a standalone page rendering **only the image square** at 2048², with:
  * the mockup side by side at the same scale
  * a time scrubber for development
  * test patterns: a single dot; a straight stroke at three pen heights and speeds; crossing strokes; one full line
  * a live radial-profile plot compared with the measured curve
* Fixed review stills: development at t = 0.1, 0.3, 0.6, 1, 2 and 4 s; one full print; one 9:16 frame.
* Performance: film sim ≤ 0.5 s per frame at 2048² on SwiftShader, and nothing recomputed for prints that have finished developing.

## Order of work for the next session

1. Restore the environment.
   * Run `npm install` in `pictures-of-you`.
   * Recreate `js/lyrics.local.js` if missing.
   * spektrafilm is GPL-3: read it for methods only, never copy code. Its source can be re-cloned read-only from `github.com/andreavolpato/spektrafilm`.
   * The research hosts are allowed in the environment, but WebFetch cannot see them; use `curl`.
2. `fit_profile.py` and the fitted parameters.
3. Exposure pyramid with per-splat height, in the film lab.
4. Response and print reflectance model; compare with the table.
5. Development simulation (reagent map, opacifier, dye arrival).
6. Edge fog and dye clouds.
7. **Checkpoint with the user**: film-lab stills next to the mockup, plus a development strip. Do not integrate until approved.
8. Integrate into the scene: the print shader samples the simulated film; remove the old text block.
9. Review the burn, flames, flourish and fade in 9:16 with stills, and fix framing and fluid scale. **Second checkpoint.**
10. Final render, about 1.5 to 2 h in the background. Provide the mux command for the user's copy of the song.

## Questions for the user

1. **Fringe shape.** Go with the physically grounded smooth, heavy-tailed glow broken up by chemistry? Or deliberately stylise spikes like the mockup? Spikes would be non-directional only, never upward.
2. **Light colour.** Warm, tungsten-like, which produces the mockup's white, yellow, orange, red sequence. Confirm.
3. **References.** Wanted:
   * any real Polaroid development timelapse, to set the colour drift and timing
   * any real light painting or strong point light on instant film
   * later, real burning-Polaroid footage

   Upload them, or allow specific image hosts.
4. **Letter weight.** Match the mockup's chunky strokes (core ≈ 0.26 x-height)?

## Sources

* Dehancer, "Halation and its simulation": https://blog.dehancer.com/articles/halation/
* Quick Film Halation Emulation: https://evan-theelectricalengineer.blogspot.com/2024/09/quick-film-halation-emulation.html
* spektrafilm (GPL-3), physical defaults in `runtime/params_schema.py` and the model in `model/diffusion.py`: https://github.com/andreavolpato/spektrafilm, and the darktable docs: https://docs.darktable.org/usermanual/development/en/module-reference/processing-modules/spektrafilm/
* "Emulating Emulsion", SIGGRAPH 2025 poster: https://musicofmusix.github.io/siggraphposters25
* Instant film (structure of integral film, reagent, opacifier, dye diffusion): https://en.wikipedia.org/wiki/Instant_film
* Polaroid support, reagent spread and rollers: https://support.polaroid.com/hc/articles/115012564148
* Retrospekt, opacifier and "blue lightning": https://retrospekt.com/blogs/ask-the-expert/why-are-there-blue-streaks-on-my-polaroid-picture
* Light leaks: https://29a.ch/2015/07/29/light-leaks-in-the-film-emulator and https://www.shadcn.io/shaders/light-leak-shader
