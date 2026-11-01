# Inspiration notes: porto-exp.vercel.app

Studied on 2026-10-31 at 1440px and 390px (light and dark theme, scrolled sections, the filter popover, row hover).
The page keeps all its CSS inline in the HTML, so the values below come from that file; there is no separate stylesheet.
We take ideas only. No layout, text, image or asset is copied, and the palette stays Sky & Mint.

## What we learn from it

| # | Observation | What Ledgerling does with it |
|---|---|---|
| 1 | **Floating panels on a tinted canvas.** Sidebar and content are separate rounded panels with a small gap. | Slightly deeper sky-grey canvas; the sidebar becomes a floating white panel on wide screens. |
| 2 | **A soft page banner** holds the title, the key number and the main action. | `PageHeader` becomes a soft sky-to-mint banner with the title on the left and actions on the right. No purple, no glow. |
| 3 | **Rows as pills.** Table rows are rounded tinted bars with gaps instead of hairlines; hover deepens the tint. | The transactions table uses rounded rows on a muted surface, and the whole row is clickable. |
| 4 | **Shadows with a negative spread** (`0 12px 32px -8px rgba(16,24,40,.18)`, `0 24px 60px -20px rgba(15,23,42,.4)`): they stay tight under the element instead of a grey halo. | `--shadow-sm/md/lg` rewritten in the same way, in our navy tint. |
| 5 | **One easing curve, short durations.** `cubic-bezier(.22,.61,.36,1)`, 150–320ms. The detail view slides 24px in .32s (`exDetailIn`), toasts rise 12px in .2s (`toastIn`). | `--ease-out` and `--duration-*` tokens; every transition uses them and stays within 150–400ms. |
| 6 | **Capsule bars on a hatched track**: the diagonal stripes show how much is still free. | The same hatched track on budget and goal progress bars, in a pale sky tone. It fits our capsule charts. |
| 7 | **A lit edge on the primary button** (`inset 0 1px 0`) and a soft pill for the active menu item. | `--shadow-primary` on primary buttons; the active menu pill slides between items. |

## Second look, 2026-11-01: the Noir redesign

The owner asked for a completely new template that feels high-end, with this site as a starting point and better than it.
What changed from the table below: dark comes first now, and the top bar, the right rail and the numbers in the hero come from here.

| Observation | What Ledgerling does with it |
|---|---|
| **Dark, floating panels** with a thin bright edge, and a large soft hero. | Noir: near-black canvas, panels with a lit top edge, one aurora hero per page. |
| **A right rail** beside the main column (insights, trend, breakdown). | The Dashboard has a rail with wallets, budget alerts, goals and insights. |
| **Numbers in the hero** ("This month total"), next to the title. | `PageHeader` takes `stats`: panes of glass with the numbers of the page. |
| **A top bar** with search, theme switch and bell. | The same three in a blurred bar that stays while the page scrolls. |
| **Pastel capsules with a small dash near the top**, glowing on dark. | `Capsule` in the Dashboard chart, on a track, with the amount above each one. |
| **Satoshi**, a tight geometric sans. | Manrope: the same feel, and it has every Vietnamese letter (Satoshi is not on Google Fonts). |

Where it goes further than the reference: emerald and ice instead of the violet "AI" gradient; a pearl primary button instead of a saturated pill; a
fine grain over every gradient; a soft light that follows the mouse over cards; wallets drawn as metal cards; a phone layout that really works
(the reference pushes its content off the screen at 390px); and a full light theme, Porcelain.

## What we do not take

- The purple gradients, glowing "AI" borders, shine loops and the slowly spinning logo: all of them read as "AI-looking".
- ~~Dark-first panels. Ledgerling stays light.~~ Taken after all, see the second look above.
- Its behaviour at 390px: the sidebar never collapses and pushes the content off screen. Our phone layout stays a top bar with a menu.
- Text-only status colours ("Missing receipt" in orange): we keep icons and `+`/`−` so colour is never the only signal.
