// The guided tour: its steps and where the card goes. The component is components/Tour/Tour.jsx.
// target: the element it points at (data-tour in AppLayout and QuickAddButton). text: the keys tour.steps.<id>.title and .text.
// inMenu: on a phone that element is inside the menu panel, which opens for this step.
export const TOUR_STEPS = [
  { id: 'quickAdd', target: 'quick-add' },
  { id: 'dashboard', target: 'nav:/', inMenu: true },
  { id: 'budgets', target: 'nav:/budgets', inMenu: true },
  { id: 'reports', target: 'nav:/reports', inMenu: true },
  { id: 'settings', target: 'nav:/settings', inMenu: true },
  { id: 'account', target: 'account', inMenu: true },
];

// This browser has seen the tour (or skipped it), so it does not start by itself again
export const TOUR_SEEN_KEY = 'ledgerling.tourSeen';

const GAP = 16; // between the highlighted element and the card
const MARGIN = 12; // the card keeps this distance from the edges of the window

const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

// Where the card goes: on the right of the element, else on the left, below or above; centered when there is no element
// or no room anywhere. target and card have { width, height }, target also { top, left, right, bottom }.
export function placeTourCard(target, card, viewport) {
  const center = {
    top: Math.max(MARGIN, (viewport.height - card.height) / 2),
    left: Math.max(MARGIN, (viewport.width - card.width) / 2),
  };
  if (!target) return center;

  const middleY = target.top + target.height / 2 - card.height / 2;
  const middleX = target.left + target.width / 2 - card.width / 2;
  let place = center;

  if (target.right + GAP + card.width + MARGIN <= viewport.width) place = { top: middleY, left: target.right + GAP };
  else if (target.left - GAP - card.width - MARGIN >= 0) place = { top: middleY, left: target.left - GAP - card.width };
  else if (target.bottom + GAP + card.height + MARGIN <= viewport.height) place = { top: target.bottom + GAP, left: middleX };
  else if (target.top - GAP - card.height - MARGIN >= 0) place = { top: target.top - GAP - card.height, left: middleX };

  return {
    top: clamp(place.top, MARGIN, viewport.height - card.height - MARGIN),
    left: clamp(place.left, MARGIN, viewport.width - card.width - MARGIN),
  };
}
