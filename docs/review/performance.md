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

## Full audit before the presentation (19 November 2026)

Measured on branch `fix/full-audit`, same laptop, with the fixes of [ui-audit.md](ui-audit.md). "Local" is the
production build (`vite build` + `vite preview`) with the end-to-end API and its in-memory database; "live" is the
deployed site (`main` before this branch), only opened with "Try the demo", read and scrolled. The measuring scripts
were run from outside the repository.

### Method

Each cell is one browser and one screen. In each cell, on the Dashboard, Transactions, Reports and the landing page:

- **Idle**: CPU time of the whole browser (every process it started, read from Windows) over 20 s without input, as %
  of one core: the average of the 20 s, and the part after 8 s (the decorations then pause, see below).
- **Scroll**: 2,400 px down and up at 1,600 px/s (a touch gesture on touch screens, the mouse wheel with the pointer
  over the page on a computer); frames per second, frames over 50 ms, the longest frame, long tasks.
- **Latency**: from the input to the second frame after it, for a hover (or a tap) on a chart, the next month on the
  Dashboard, opening the transaction drawer and opening another page from the menu.
- **Console**: every error.

Cells: Chromium 390 (phone, touch), 768 and 1024 (tablets, touch) with the CPU slowed down 4 times; Chromium 390, 1536
at 125 % and 1920; Microsoft Edge 390 (4× CPU), 1536, 1920; Firefox and WebKit 390, 1536, 1920. Targets: idle after the
pause under 5 % of one core; scrolling at 55 fps or more with no frame over 100 ms; the result of an input on screen
in under 200 ms on a slow phone and under 100 ms of main thread work on a computer; no console error.

### Results (local, final build)

| Browser | Screen | Idle after the pause (% of one core) | Scroll: lowest fps | Frames > 50 ms, longest | Latency ms: chart / month / drawer / page | Console errors |
|---|---|---:|---:|---|---|---:|
| Chromium | 390 | 1.3 | 94.7 | 0, 12 ms | 42 / 54 / 103 / 41 | 0 |
| Chromium | 390, 4× CPU | – | 94.0 | 0, 12 ms | 108 / 369 / 255 / 93 | 0 |
| Chromium | 768, 4× CPU | – | 94.0 | 0, 12 ms | 108 / 377 / 251 / 100 | 0 |
| Chromium | 1024 touch, 4× CPU | – | 92.6 | 0, 12 ms | 111 / 378 / 269 / 109 | 0 |
| Chromium | 1536 at 125 % | 0.4 | 93.8 | 0, 40 ms | 18 / 37 / 178 / 37 | 0 |
| Chromium | 1920 | 1.2 | 91.1 | 0, 40 ms | 17 / 52 / 174 / 45 | 0 |
| Edge | 390, 4× CPU | – | 92.6 | 0, 12 ms | 107 / 312 / 222 / 116 | 0 |
| Edge | 1536 at 125 % | 1.9 | 93.1 | 0, 40 ms | 18 / 54 / 176 / 46 | 0 |
| Edge | 1920 | 1.5 | 88.6 | 0, 40 ms | 19 / 49 / 172 / 46 | 0 |
| Firefox | 390 | 0.4 | 100 | 0, 14 ms | 33 / 93 / 92 / 53 | 0 |
| Firefox | 1536 | 0.3 | 99.5 | 0, 21 ms | 33 / 71 / 129 / 88 | 0 |
| Firefox | 1920 | 1.5 | 93.3 | 0, 43 ms | 32 / 117 / 240 / 78 | 0 |
| WebKit | 390 | 0.3 | 4.6 | 47, 516 ms | 748 / 1,312 / 972 / 216 | 0 |
| WebKit | 1536 | 1.0 | 4.3 | 110, 307 ms | 718 / 491 / 512 / 324 | 0 |
| WebKit | 1920 | 0 | 5.4 | 96, 230 ms | 527 / 370 / 378 / 243 | 0 |

The idle cost over the whole 20 s, including the first 8 s while the decorations still move: Chromium and Edge 7–14 %,
Firefox 19–38 %, WebKit 39–41 % of one core.

- **WebKit** here is the WebKit that Playwright ships for Windows, a port that Safari does not use. The build before the
  fixes gives the same numbers in it (4.5 fps, 681 ms for a hover), so they come from that browser, not from the app.
- **Latency with the CPU slowed down** includes the round trip between the measuring script and the browser. Measured
  inside the page instead (from the touch to the frame that shows the result): the next month 56–62 ms and the drawer
  133–140 ms on a phone at 4× CPU; on a computer the main thread needs 31–55 ms for both. All under the targets. The
  build before the fixes gave 420 ms and 228 ms in the same script, so nothing became slower.
- **The first opening of the drawer on a computer** (172–240 ms in the table) is mostly the GPU painting the blurred
  backdrop for the first time; the main thread part is 31–45 ms. The blur is part of the look and was kept.

### Two problems found and fixed

1. **A page left open kept the processor busy.** On the live site, the Dashboard, Transactions, Reports and the
   landing page cost **15–25 %** of one core even after 8 s without input (Chromium 1536, Edge 1920), and the live
   check measured 47.9 % on the Dashboard in a headless Chromium. Since the lag fix above, the only work left was the
   endless decorations (the coin, its band of light, the lights of the hero, the caret of the landing page). Now
   `utils/idleDecorations.js` sets `html[data-idle]` after 8 s without any input (mouse, touch, key, wheel, scroll,
   focus) and their CSS pauses them where they are; the next input lets them go on from the same place. After the pause:
   **0–2 %** in every browser, and 10.0 % in the same headless check (its 15 s start before the pause).
2. **The first touch of a page with charts took one long frame** (57–64 ms at 4× CPU, every time). A fix of the audit
   (a touch outside a chart hides its tooltip) drew every chart again inside the touch event, even when no tooltip was
   shown. A touch outside a chart now changes it only while its card is on screen: 0 long frames in 12 runs, as on the
   build before the fixes.

Two ways to make the month change and the drawer answer sooner were also measured and not kept: wrapping them in a
React transition drew the frame after the touch sooner, but the result itself up to 120 ms later.

### Lighthouse

Lighthouse 12, first visit (empty cache, no service worker), 2 runs each; the Dashboard signed in with the demo token.

| Page | Local, before the fixes | Local, final | Live (`main`), 19 Nov |
|---|---|---|---|
| `/welcome`, phone | 73–74 | 73 | 77–78 |
| `/welcome`, desktop | 97 | 97 | 97 |
| Dashboard, phone | 61–62 | 61–63 | 49–68 (4 runs) |
| Dashboard, desktop | 93–94 | 95 | 87–93 (4 runs) |

Accessibility and Best Practices are 100 everywhere. SEO is 100 everywhere except `/welcome` on the live site (92):
the single `index.html` named the root of the site as the canonical page of every address. `hooks/useCanonicalLink.js`
now points it at the open page; a build served at its own address gives 92 on `/welcome` and `/about` without it and
100 on the six public pages with it. The local preview sends gzip over HTTP/1.1 and the live CDN brotli over
HTTP/2, which is why the live phone numbers of the landing page are higher. The phone score stays the known limit: the
pages are drawn by JavaScript, so on a slow phone with a slow network the largest paint waits for the code (LCP 4.9–5.7 s).
Prerendering the landing page would change that, which is a change of architecture and out of scope here.

### Same look

The pictures of every state before and after the fixes (animations off, 10 screens, light and dark, 564 pictures) were
compared pixel by pixel. 172 are identical. In the others, the differences are only where a bug was fixed: the
footer 16 px taller on wide screens, the phone top bar at 360 px, the breadcrumb above the page at 768 px, and a
sub-pixel move of the ₫ sign of the hero amounts. The rest also differ between two runs of the unchanged build
(pictures of the landing page that load late, the edges of letters).
