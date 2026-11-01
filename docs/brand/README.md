# Ledgerling brand

**The name:** ledger + the suffix *-ling* (small, endearing, as in duckling or seedling), so "the little ledger".

All artwork here is drawn by hand as SVG: no stock images, no fonts. The wordmark letters are plain strokes
(`wordmark-path.json`), so no font license is involved.

## The current logo: the glass coin

An old Vietnamese coin, round outside and square inside, made of four glass L.

| What you see | What it means |
|---|---|
| Round outside, a square hole inside | The old coins of Vietnam, from Thái Bình Hưng Bảo (Đinh dynasty, around 970), usually named as the first one. The shape carries the saying *trời tròn đất vuông* (round heaven, square earth). |
| Four L | Each quarter of the coin is an L, the first letter of the name. Money is what the ledger is made of. |
| Two gold L, two jade L, each opposite its twin | Income and expense in balance. |
| The ring of quarters | It also reads as the donut chart of the Dashboard. |
| Glass, not metal | The light of the aurora of the app, and a coin you can see through: you know where your money goes. |

- **Why it is symmetric:** one L is mirrored along its diagonal, and four of them a quarter turn apart make the coin. The gold
  is drawn first, so the jade lies over it at all four seams. The shape has four mirror lines, and the colors two of them (the diagonals of the L).
- **Why not a letter or a flower:** a single L looks lopsided when it spins. The flower and the clover looked like the logo of porto-exp.
- **Readable at 16px:** a two-color ring around a square.
- **Rejected on the way:** a solid coin (reads as a stop button), a coin with corner brackets (reads as a QR scan icon),
  a coin with ruled lines (reads as a chip), a brilliant cut (a mosaic tile once it was exactly symmetric), a compass rose (too fine when small).

## The motion (`client/src/components/Logo/Logo.module.css`)

| When | What happens | What it says |
|---|---|---|
| Always | One turn in 16 seconds, a band of light crosses the glass every 6 seconds | The money keeps moving |
| Opening a page | It turns in from small | |
| Mouse on the logo, or keyboard focus on its link | One flip around the upright axis, a tilt, the four L slide apart, a light comes on in the hole, a fast turn on top of the slow one | The coin opens and shows what it is made of |
| Mouse leaves | Everything goes back, the slow turn goes on from the same angle | |
| Press or tap | A toss: up with three turns around the level axis, down, one small bounce, a ring at once and another ring with eight small square chips at the landing | The toss of a coin |
| Reduced motion (`global.css`) | The coin stands still and a press does nothing. The mouse still opens it. | |

- **Why several nested groups:** changing `animation-duration` directly would make the logo jump, because the browser works
  out the angle again. So each move has its own group and they add up; the fast turn is only paused or running.
- **Why three pictures of the coin:** a flat picture disappears when it is seen from the side. A front, a darker middle and a
  back, a few pixels apart in 3D (`translateZ`), give it a real thickness.
- **Cost:** the turns are transforms of whole elements, which the graphics card does. On an idle Dashboard the logo adds at most about 0.1% of main thread time (headless Chromium, measured over 6 seconds).

## Where it is used

- `client/public/favicon.svg`: the coin, standing still, source of every PWA icon (`npm run generate-pwa-assets` in `/client`).
- `client/src/components/Logo/Logo.jsx`: the coin + wordmark, in the sidebar, the landing page, the static pages and on
  Login / Register; large in the hero of the Dashboard.

## The earlier concepts

| | Concept | Idea | Files |
|---|---|---|---|
| A | **Sprout ledger** | A small book with a seedling on top | `concept-a-*.svg` |
| B | **Ruled L** (the logo until the spin) | The letter L, with the ruled lines of a ledger page in its open side | `concept-b-*.svg` |
| C | **Little ledger** | A tiny notebook with a face | `concept-c-*.svg` |

Every concept has a mark (`-mark.svg`), a mark + wordmark (`-full.svg`) and a version for dark backgrounds
(`-full-on-dark.svg`). `preview.html` is the comparison sheet.
