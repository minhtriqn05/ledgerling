# Performance on wide screens – lag of the redesign and its fix

Measured on 18–19 November 2026 on branch `fix/desktop-lag`. Laptop: AMD Ryzen 5 5625U (6 cores, 12 threads) with its
Radeon integrated GPU, a 1920 × 1080 screen at 144 Hz, Windows 11 at 150 % scaling. Browsers: Microsoft Edge 157 and the
Chromium of Playwright 1.64.1, each with a clean profile (no extension) and the GPU on (`gpu_compositing: enabled`).

## The problem

Since the beginning of November the app lagged on a computer (wide window) while phones and tablets stayed smooth.
The earlier measurements of the project (`final-review.md`: Lighthouse) are load tests: they do not see what a page
costs while it is open, so there was no earlier number for this.

## Method

- Every number is the work of the whole browser while a page is open: CPU time of the GPU process, the renderer and the
  browser process (Chrome DevTools Protocol `SystemInfo.getProcessInfo`), as **% of one processor core**
  (Task Manager shows the same divided by 12 threads), and the use of the 3D engine of the GPU by the browser
  (Windows counter "GPU Engine"). "Idle" = the page open, no input, 15–30 s.
- Scrolling: 4–8 scroll gestures of 2,400 px at 1,600 px/s (DevTools `Input.synthesizeScrollGesture`), with the mouse over
  the content as a person on a computer has it. Frames are timed with `requestAnimationFrame`; long frames with the
  Long Animation Frames API. Interactions: Event Timing (from the click to the next frame on screen).
- 1440 = a 1440 × 900 window at 1 device pixel per CSS pixel; 390 = a Pixel 7 (touch, 2.625 device pixels).
- First on the live site (only "Try the demo", reading and scrolling), then on the production build (`vite build` +
  `vite preview`) with the end-to-end API and its in-memory database. The measuring scripts were run from outside the
  repository and are not part of it.
- To find the causes, one CSS rule at a time was added to the open page (for example "no blur on the lights", "logo
  paused") and the same idle cost was measured again (A/B), always with the unchanged page at the start and at the end.

## Is it the code or the browser?

The code. With a clean profile and the GPU on, both browsers showed the problem on the live site:

| Live site, clean profile | Chromium 1440 | Edge 1440 | Chromium 390 | Edge 390 |
|---|---|---|---|---|
| Idle, Dashboard / Transactions / Reports / welcome (% of one core) | 49 / 50 / 52 / 59 | 50 / 46 / 43 / 50 | 61 / 54 / 35 / 56 | 52 / 46 / 30 / 43 |
| Style recalculations while idle | every frame (100 / s) | every frame | every frame | every frame |
| Scroll /welcome: fps, frames > 50 ms, longest | 96.5, 4, 80 ms | 83.7, 22, 100 ms | 100, 0, 11 ms | 100, 0, 11 ms |
| Scroll Transactions / Reports: longest frame | 40 / 30 ms | **130 / 120 ms** | 11 / 11 ms | 11 / 11 ms |
| Opening the transaction drawer (first time) | 160 ms | 152 ms | 128 ms | 152 ms |
| Requests while idle (30 s) | 0–1, and 1–2 socket pings | same | same | same |

The build of 31 October (`c3ee92c`, before the redesign), measured the same way on the production build: idle
**0.2–3.4 %** of one core, GPU 0 %, scrolling at 100 fps with no frame over 11 ms. The cost came with
`1e04a78` (1 November, "premium dark redesign"), which added the aurora, the glass top bar and the animated coin.

## Causes (each one measured before it was changed)

Dashboard, 1440, idle, production build. Each row adds one CSS rule to the open page.

| Variant | % of one core | GPU 3D |
|---|---:|---:|
| Unchanged page | 48–55 | 21–25 % |
| Lights of the aurora without their blur | 42 | – |
| Blur moved inside the moving box (painted once, see fix 1) | 40 | 18 % |
| Band of light of the logo (`sheen`) stopped | 36 | 19 % |
| Only the slow turn of the logo moving (the lights stopped) | **47.5** | 23 % |
| The same turn in 30 steps a second | 28 | 9 % |
| Top bar without its backdrop blur | −4 | −1 % |
| Grain of the aurora without its blend mode | −5 | −4 % |
| Every animation stopped | 0.3–3.9 | 0 % |

1. **A blur on a moving layer is computed again on every frame.** Each hero (`PageHeader`, the landing page, Login) has
   three lights with `filter: blur(64–100px)` on the element that moves (`animation` of `transform`). The GPU made a
   separate blurred image of each light for every frame on screen: a trace of a scroll shows 3.9 such passes per frame
   (1,223 for 317 frames).
2. **The page was drawn again at the full refresh rate, all the time.** The coin turns forever and the lights drift
   forever, so the browser makes a new frame at every refresh of the screen (100 per second on this laptop as measured,
   up to 144 on its screen), and each new frame redraws all the blurred passes, wherever the movement is: a 34 px coin
   turning alone still cost 47.5 % of a core. A wider window means larger blurred areas, a 144 Hz screen 2.4 times more
   frames than 60 Hz, and 150 % scaling 2.25 times more pixels: the integrated GPU of a laptop reaches its limit, and
   scrolling and hovering then wait for it. A phone draws smaller areas at 60 Hz.
3. **The band of light of the coin runs on the main thread.** It is an SVG `<rect>` moved by a CSS animation, which
   browsers do not hand to the GPU: one style recalculation on every frame and a layout and paint on every move
   (main thread 8–13 % busy while idle; 0.2 % without it).
4. **A mask over moving lights** (`mask-image` on the aurora of the landing page, 1440 × 820) was worked out again on
   every frame: GPU 3D 54 % on the idle landing page, 40 % without the mask.
5. **Decoration out of sight kept moving**: the aurora of a hero kept drifting after the page was scrolled down.
6. **Scrolling with the mouse over the page** made it worse on a computer only: cards passing under the mouse start
   their hover effects (soft light, rising card, shadow) while the GPU is already busy. The long frames (100–200 ms)
   came after a few seconds of idle time, when the GPU had lowered its clock.

## Fixes (same picture, less drawing)

1. `components/Aurora/Aurora.module.css`: the moving box (`.blob`) only moves and fades; the blurred circle is its
   `::before`, which does not move by itself, so the blur is painted once and the GPU only slides the picture. The colour
   and the size of the blur come from `--blob-color` and `--blob-blur` (the landing page and Login set 100, 80 and 70 px
   as before).
2. The slow moves change the screen 30 times a second instead of at every refresh: the turn of the coin in 480 steps
   per turn (0.75° each, a fraction of a pixel at its rim), the drift of the lights in steps of 1/30 s along the same
   ease-in-out curve (11 points of the curve, within 0.4 px of it, on a light blurred by 64–100 px). Between two steps
   nothing changes, so nothing is drawn.
3. The band of light keeps its place in the SVG (the logo tests check its structure) and moves at the pace of a 60 Hz
   screen (steps of 1/61 s, the same curve), so a faster screen does not repaint it more often.
4. Landing page: the mask is replaced by a layer of the page colour from transparent to solid over the bottom of the
   aurora. The page behind the hero is plain `--color-bg`, so it is the same picture, painted once.
5. `hooks/usePauseOffscreen.js` (used by `Aurora` and `Logo`): out of the window the element gets `data-offscreen`
   and its CSS pauses the animation; it goes on from the same place when it comes back. A hidden tab already stops
   drawing in every browser.

Not changed, because they are part of the look: the blur of the top bar and of the dialogs, the blend of the grain,
the shadow of the drawer.

## Before and after

Production build, Chromium, same scripts, both builds measured one after the other. % of one core (GPU 3D in brackets).

| Idle | 1440 before | 1440 after | 390 before | 390 after |
|---|---:|---:|---:|---:|
| Dashboard | 74.2 (31 %) | **25.6** (8 %) | 47.6 (15 %) | **26.1** (4 %) |
| Transactions | 49.4 (21 %) | **21.8** (7 %) | 44.9 (15 %) | **19.9** (3 %) |
| Reports | 54.6 (17 %) | **22.4** (5 %) | 44.5 (11 %) | **22.2** (3 %) |
| Landing page (signed out) | 50.1 (49 %) | **21.8** (14 %) | 47.5 (19 %) | **22.2** (4 %) |
| Dashboard, 1280 × 720 at 150 % (this laptop's own window) | 51.0 (21 %) | **27.6** (5 %) | | |
| Dashboard, Edge | 37.6 (21 %) | **22.8** (7 %) | | |
| Main thread busy while idle | 6.8–12.7 % | 5.6–6.5 % | 6.9–8.2 % | 6.0–7.1 % |

In Task Manager terms (12 threads) that is about 4–6 % of the processor before and about 2 % after. What is left is
the three endless decorations that stay on screen (the coin, its band of light, the lights of the hero): with every
animation stopped the same pages cost 0.1–0.3 %. Most of the rest is the band of light (about 10 % of one core), which
the browser has to move on the main thread as long as it is part of the SVG.

| Scrolling, mouse over the page, after 20 s idle (two runs each) | 1440 before | 1440 after |
|---|---|---|
| Dashboard: frames > 50 ms, longest | 8 / 8, 150 / 130 ms | **0 / 0**, 30 / 30 ms |
| Transactions | 13 / 10, 200 / 130 ms | **0 / 0**, 25 / 30 ms |
| Reports | 8 / 9, 130 / 170 ms | **0 / 0**, 20 / 20 ms |
| Long animation frames > 100 ms on these pages | 1–3 per page (longest 126–174 ms) | **0** |
| Scrolling at 390, every page | 100 fps, longest ≤ 33 ms | 100 fps, longest ≤ 33 ms |

| Landing page, first scroll of a new browser (empty GPU caches), 1440 | Before (4 runs) | After (8 runs) |
|---|---|---|
| fps | 82–87 | 88–97 |
| Frames > 50 ms | 14–20 | 3–14 |
| Frames > 100 ms | 0–2 (longest 100–120 ms) | 0–3 (longest 80–190 ms) |
| The same scroll again in a new tab of that browser | 0 frames > 50 ms | 0 frames > 50 ms |

The first scroll after the browser starts pays once for compiling the GPU shaders of the page (three of about 17 ms,
seen in a trace) and for painting each blurred light the first time it shows; these runs vary a lot from one to the
next (the machine was also running other programs). In the same browser, later scrolls of the page had no frame over
50 ms, before and after the fix.

| Interactions (click to next frame) | Before | After |
|---|---|---|
| Opening another page from the menu, 1440 | 24–48 ms | 16–24 ms |
| Opening the transaction drawer, 1440: first time / again | 152–192 / 48–56 ms | 160–192 / 48 ms |
| Opening the transaction drawer, 390: first time / again | 104–168 / 40 ms | 104–128 / 24 ms |
| Moving the mouse over cards (1440) | 100 fps, ≤ 40 ms | 100 fps, ≤ 32 ms |

The first opening of the drawer is the first paint of its panel (a large soft shadow) and of its blurred backdrop,
which the GPU prepares once per page load; every later opening takes under 60 ms.

| Lighthouse 12, first visit, measured the same day | Before | After |
|---|---|---|
| /welcome, desktop | 97 | 97 |
| Dashboard, desktop | 91 (TBT 130 ms) | 94 (TBT 60 ms) |
| /welcome, mobile | 73 (LCP 5.7 s) | 74 (LCP 5.4 s) |
| Dashboard, mobile | 57 (TBT 500 ms) | 59 (TBT 460 ms) |

Lighthouse measures loading, which the fix does not change; the numbers move a few points from one run to the next
and with the load of the machine (`final-review.md` measured 98 / 98 / 77 / 67 on 2 November).

## Same look

Before the fix, 88 screenshots (11 pages × 1440 and 390 × light and dark × two kinds: every animation off with
prefers-reduced-motion, and every animation paused at the same moment of its loop) were taken; after the fix the same
88 again, compared pixel by pixel. Two runs of the unchanged build already differ on 8 of the 88 pictures (pictures
that load late, an entrance animation caught at another moment).

- 26 of 88 are identical; the others differ on 0.0001–0.16 % of their pixels.
- Paused animations: the coin is 0.2° away from where it was (a step of the turn) and the lights less than a pixel
  away; the edges of the letters over the aurora take the colour of that light.
- At 390 (2.625 device pixels per CSS pixel), one row of device pixels at the top edge of each hero, inside its border,
  now takes a little of the light (a third of a CSS pixel).
- Seen side by side, enlarged, no difference shows.

## Checks

Server: lint OK, 672 tests passed, coverage 94.83 % lines / 90.73 % branches. Client: lint OK, 850 tests passed
(98 files, 3 new for `usePauseOffscreen`), coverage 68.47 % lines (`src/utils` 94.01 %, `src/hooks` 100 %), build OK,
i18n OK. End to end on Chrome desktop + Pixel 7: 341 passed, 7 skipped (4 new: `e2e/decoration.spec.js` checks that a
light is blurred inside a box that only moves, that the slow moves go in steps, and that the aurora and the logo wait
out of the window); `@smoke` on Firefox + iPhone Safari: 52 passed. One full run had the WebKit browser fail to start
for one test (before any page was opened); the test passed alone and the whole `@smoke` run passed again.
