# Ledgerling brand

**The name:** ledger + the suffix *-ling* (small, endearing, as in duckling or seedling), so "the little ledger".

All artwork here is drawn by hand as SVG: no stock images, no fonts. The wordmark letters are plain strokes
(`wordmark-path.json`), so no font license is involved. Colors come from the app's hero gradient
(`#2874b5` → `#1b7f86`) plus a light mint (`#a9efcf`).

## The three concepts

| | Concept | Idea | Files |
|---|---|---|---|
| A | **Sprout ledger** | A small book with a seedling on top: ledger + "-ling" as in seedling | `concept-a-*.svg` |
| B | **Ruled L** (chosen) | The letter L, with the ruled lines of a ledger page in its open side | `concept-b-*.svg` |
| C | **Little ledger** | A tiny notebook with a face: the most literal "cute ledger" | `concept-c-*.svg` |

Every concept has a mark (`-mark.svg`), a mark + wordmark (`-full.svg`) and a version for dark backgrounds
(`-full-on-dark.svg`). `preview.html` is the comparison sheet: `comparison.png` shows 16, 32, 64 and 128px on light and
dark, and `comparison-16px.png` shows the real 16px pixels enlarged.

## Comparison

| Criterion | A. Sprout ledger | B. Ruled L | C. Little ledger |
|---|---|---|---|
| Readable at 16px | Weak: the book and leaves merge into a blob | **Best: L and the lines stay separate** | Weak: the face turns into dots |
| Fits the app's colors | Good | **Good: same gradient and mint as the hero card** | Good |
| Simple | Five shapes | **Two shapes** | Four shapes, and needs a dark ink color |
| Memorable | Good, but "book with a plant" is common | **Good: a letter that is also a page** | Very, but reads as a phone or a robot |
| Fits the name | Good: ledger + seedling | **Good: L for Ledgerling, ruled lines for a ledger** | Literal, too childish for a money app |

## Decision: B, Ruled L

It is the only concept that still reads clearly in a browser tab at 16px, which is where people see the logo most often.
It uses just two shapes, works on light and dark without changes, and carries the name's meaning: the L of Ledgerling
holding the lines of a ledger page, in a small soft tile. Its one weakness is that it says "little" less loudly than A or C;
the rounded tile and rounded line ends carry that part.

## Where it is used

- `client/public/favicon.svg`: the mark, source of every PWA icon (`npm run generate-pwa-assets` in `/client`).
- `client/src/components/Logo/Logo.jsx`: the mark + wordmark, in the sidebar, the top bar and on Login / Register.
