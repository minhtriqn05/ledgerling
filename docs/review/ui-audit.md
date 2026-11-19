# Full audit before the presentation – UI, UX, devices, fault tolerance

Audit of 19 November 2026 on branch `fix/full-audit`: every page and main state, on phones, tablets and laptops,
in Chromium, Firefox, WebKit and Microsoft Edge, in the 8 languages, light and dark. Only bugs were fixed: the look
(colours, fonts, style, overall layout), the features, the routes, the API, the database models and the libraries did
not change. Performance numbers: `performance.md` (section "Full audit").

## Method

- **Local production build** (`vite build` + `vite preview`) with the end-to-end API and its in-memory database (the
  demo account of `npm run seed`, the e2e admin, an empty account, and an account with a large data set: 2,000
  transactions over 14 months, amounts up to 999,999,999,999 ₫, the longest names and notes the API accepts, emoji,
  quotes and `<script>` in notes, 32 categories, budgets far over their limit). The live site was only opened with
  "Try the demo", to read and scroll.
- **Automatic checks in the page** for 39 states (every page, the drawer, the dialogs, the menus, Ctrl+K, Quick add,
  an open dropdown, an open calendar, a toast, the 404 page, empty and large accounts) on 10 screens (360, 390, 430,
  844 × 390, 768, 1024, 1366, 1440, 1536 at 125 %, 1920): text, buttons, fields and icons drawn over each other (same layer, neither inside the other),
  text cut by its own box or a parent (an intended "…" is listed apart), sideways scroll, text or controls outside the
  window, open popovers and tooltips outside the window, content under the floating + at the end of a page, layout
  shift (CLS), console errors and failed requests, and axe (serious and critical).
  Runs on the final build: Chromium 3,064 page loads (10 screens × 8 languages, dark) and 766 more in the light theme
  (English, Vietnamese); Firefox and WebKit 804 each (7 screens × English, Vietnamese, German); axe 154 (light and
  dark); the large data set 120. Only the pictures the checks flagged were looked at, plus the demo flow.
- **Real interactions**: the mouse moved across every chart frame by frame (where the tooltip is, how often it hides,
  whether bars are drawn again), taps on a phone (WebKit, touch), the mouse resting on the bottom edge of every card
  that rises on hover, the API answering 500, answering after 30 s, or not at all, the network going away midway, a new
  deploy while the app is open (two builds, service worker on), Vietnam time at the turn of a month in other time zones.
- **Reference pictures** of every state before the fixes (animations off) and the same pictures after them, compared
  pixel by pixel.

## Bugs found and fixed

P0 = broken, or a bug on the demo flow; P1 = clearly visible; P2 = small.

| | Where | What was wrong | Fix |
|---|---|---|---|
| P0 | Dashboard and Reports charts, phones | A tap showed the tooltip beside the finger, over the other bars; it slid 400 ms behind the finger and never went away on an iPhone (a finger has no "mouse leave") | The card stands just above the chart, centred on the bar and held inside the chart; it moves at once; the next touch outside the chart hides it |
| P0 | Spending by category | The tooltip covered the total in the middle of the ring | The card stands above the ring |
| P0 | Charts on a computer (Dashboard, Reports, Admin) | The tooltip glided behind the mouse and flew in from its last place each time the mouse came back | No glide; moved with `transform` only |
| P0 | Cards that rise on hover (Reports and Admin numbers, Budgets, Categories, Goals, Wallets, buttons) | With the mouse on their bottom edge they bounced up and down by themselves (up to 33 times in 1.5 s) | The list item around the card, or a strip under it as tall as its border and its lift, keeps the mouse while it is up |
| P0 | Phone top bar (360–390 px) | The connection status ran under the bell and was cut ("Trực t…") | The status goes under the logo only when it does not fit |
| P1 | Recurring, phones | The Active switch covered the date of the next run | The second line of a rule wraps; the buttons go to a third line when even the date does not fit |
| P1 | Phone top bar while scrolling | The page showed through the gap above the floating bar | The bar stays against the top edge once the page scrolls (8 px from it at the top, as before) |
| P1 | End of a page, wide layout | The floating + covered the last button (the pager of Notifications at 844 × 390) | More room under the footer |
| P1 | Start-up while the server is down or restarting | A valid session was sent to the login page and stayed there | The session is kept and checked again (1, 2, 4, 8, then every 10 s); a "Waiting for the server" screen with "Try again"; the page opens by itself |
| P1 | A page opened for the first time without network, or after a deploy | "Something went wrong", still there when the network came back | The page loads again by itself once the network is there |
| P1 | After a deploy | One reload still showed the old version (the old service worker answered it) | The page reloads once when a new service worker takes over; installed apps check for a new version when they come back on screen |
| P1 | Transactions, Budgets, Wallets, Recurring, Goals, Notifications | The count added to the subtitle after loading moved the buttons to a new line: the whole page jumped (CLS 0.137 in Spanish at 1440) | The room of the count is kept while loading (CLS 0) |
| P1 | Reports (monthly, yearly), CSV preview | In French the whole page scrolled sideways: hidden words of the badges left the scrolling table | The table box holds them (as in the transaction list) |
| P1 | Admin users at 768–844 px | The table made the whole page scroll sideways; buttons and the + were out of the window | The table scrolls inside its card |
| P1 | Large amounts | -990,128,884,000 ₫ left its pane in the hero (sideways scroll on a phone, over the next pane at 1440) | A very large amount breaks only after a group separator; normal amounts do not change |
| P1 | Budgets with a long category name | One long word ran under the edit and delete buttons | The word may break |
| P1 | Categories at 1024–1100 px | The form under the list jumped down when the list arrived (CLS 0.21 with 32 categories) | The form comes with the list |
| P1 | Settings › Profile on a phone (Vietnamese, French, Spanish) | The tabs of the avatar groups were wider than the card: the whole page scrolled sideways (13–58 px) and the selected tab stood outside its track. The demo account has no avatar choices, so only a real account showed it | The row of tabs scrolls inside the card; where it fits, nothing changes |
| P2 | Admin page while it loads | The "Manage users" card stood under the loading cards and was pushed down when the numbers and the charts arrived (CLS 0.17 on a phone, 0.08 on a laptop) | The card comes with the numbers |
| P1 | Every page left open | 33–37 % of one processor core while nobody touches the page (endless decorations) | After 8 s without input the decorations stop where they are and go on with the next input |
| P2 | Transactions filters | "Tất cả danh mục", "Toutes les catégories" cut with "…" | The filter grows a little when its words need it |
| P1 | Breadcrumb on a tablet (768–959 px, sidebar open) | With the search, the theme switch and the bell, about 100 px were left for the trail: it wrapped into a tall bubble, ran under the search box (German, French) and moved the page while loading; cut to one line, the names became single letters ("F › N") and a › was drawn over the next name | There the trail goes above the page, as on a phone, whole; with the sidebar closed or from 960 px it stays in the top bar on one line (every trail of the 8 languages fits there, measured) |
| P2 | Top bar at 768–899 px | "Recherch…": the Ctrl K hint took the room of the word | No key hint at that width |
| P2 | Static pages, German, phones | "Nutzungsbedingungen" made the page scroll sideways | The title breaks the word |
| P2 | Admin at 768 px, German / Spanish | A stat card label left its card | The label may break |
| P2 | Dashboard hero at 360 px | The logo was squeezed and ran under the title | The logo keeps its size |
| P2 | Every page | The page moved 12 px when it replaced its loading screen (CLS 0.008) | The top margin stays inside the app's root |
| P2 | Server waking up | Only "Loading…" for up to a minute | After 5 s: "Starting the server, this can take up to a minute…" |
| P2 | The + on a phone | It stayed turned and raised after a tap | Its hover effect is for a mouse only |
| P1 | Pages with charts, phones (found while measuring) | The first touch anywhere on the page took one frame of about 60 ms on a slow phone (4× CPU): the "touch outside hides the tooltip" of the first fix drew every chart again, although no tooltip was shown | A touch outside a chart changes it only while its card is on screen: no long frame left (12 of 12 runs) |
| P2 | Public pages, search engines (found by Lighthouse on the live site) | The app is one HTML file whose canonical link names the root of the site, so `/welcome`, `/about`, `/privacy`… were declared copies of `/` (SEO 92 on the landing page) | The canonical link follows the open page (SEO 100 on the six public pages) |

## Checked and not a bug

- Text cut at the bottom of the phone menu, of the bell and of Quick add at 360 px and 844 × 390: each is inside a box
  that scrolls.
- Ellipses on long notes and names in narrow columns: intended (the full text is in the drawer, the title and the
  screen reader name).
- Text boxes of Chinese, Japanese and Korean touching by 2 px in the steps of the landing page: the glyph boxes of
  those fonts are taller; nothing touches on screen.
- The list of a Select (the category filter at 1440 × 900) goes below the window: its panel keeps 8 px from the edge and
  scrolls inside; only the list inside the panel is taller than the window.
- At 1024 px the transactions are cards instead of a table (the column next to the sidebar is narrow), so there is no
  trash button on each row: a row is deleted from its details, and Undo works there too (Chromium, Firefox, WebKit).
- A tap on the donut showed no tooltip in one Playwright test: the test had clicked "Try the demo" with the mouse of a
  phone emulation, and Chrome then ignored the hover of the taps. With a tap, the tooltip shows, before and after the fixes.
- With the transaction drawer open at 1024 px in French and Spanish, the trail "Transactions › Détails de la
  transaction" of the top bar runs 12 px under the search button. Both are under the drawer panel and its blurred
  backdrop, where nothing can be read; the drawer shows the same trail, whole, at its top.
- Console of Firefox: only warnings of the measuring script itself (layout shift is not supported there). No console
  error and no failed request in any browser.

## Not fixed (with the reason)

- **First opening of the transaction drawer** on a large laptop screen: 210–375 ms from the click to the next frame
  (later openings 55–150 ms). Most of it is the first paint of the blurred full-screen backdrop by the GPU (part of the
  approved look, kept on purpose by the lag fix), then about 35 ms of rendering and 35 ms of style. Removing the blur
  changes the look; the rest needs a larger change of the Transactions page.
- **Small layout shifts while a page loads**, all under 0.1 (the "good" limit of Lighthouse): the landing page in
  Vietnamese at 1024–1536 px moves its title by a few pixels when the web font arrives (0.013–0.018; 0 with the font
  blocked; a fix needs a fallback font tuned to the same size); Login and Register at 1024 px move their left column in
  about one load of four (0.07); a few pages moved once in one of the 3,064 loads (0.01–0.04) and never again.

## Tests added

`client/e2e/audit-fixes.spec.js` (Chrome desktop and phone; the main ones also on Firefox and iPhone Safari with
`@smoke`) and unit tests for the new helpers (`utils/chartTooltip`, `utils/swUpdate`, `utils/idleDecorations`,
`LoadingState`, the session check of `AuthContext`, the waiting screen of `ProtectedRoute`, the tap-away of the chart
tooltips `useTapAway`, the canonical link `hooks/useCanonicalLink`). Most new end-to-end tests were also run on the build
before the fixes, where they fail (the donut, the hover bounce, the large amount, the long word, the Categories layout
shift, the idle pause, the breadcrumb, the avatar tabs, the canonical link), and pass on the build after them.
