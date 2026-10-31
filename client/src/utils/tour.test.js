import { describe, expect, it } from 'vitest';
import i18n from '../i18n/index.js';
import { placeTourCard, TOUR_STEPS } from './tour.js';

const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
const CARD = { width: 300, height: 200 };
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

describe('placeTourCard', () => {
  it('goes on the right of a link of the sidebar', () => {
    expect(placeTourCard(box(20, 300, 200, 40), CARD, DESKTOP)).toEqual({ top: 220, left: 236 });
  });

  it('goes on the left of the + button in the corner', () => {
    const place = placeTourCard(box(1360, 820, 56, 56), CARD, DESKTOP);
    expect(place.left).toBe(1360 - 16 - 300);
    expect(place.top + CARD.height).toBeLessThanOrEqual(DESKTOP.height - 12);
  });

  it('goes below an element on a phone when it has room there, and above when it has not', () => {
    expect(placeTourCard(box(16, 100, 358, 42), CARD, PHONE)).toEqual({ top: 158, left: 45 });
    expect(placeTourCard(box(16, 700, 358, 42), CARD, PHONE)).toEqual({ top: 484, left: 45 });
  });

  it('is centered without an element', () => {
    expect(placeTourCard(null, CARD, DESKTOP)).toEqual({ top: 350, left: 570 });
  });

  it('always stays inside the window, also in a tiny one', () => {
    const tiny = { width: 320, height: 240 };
    for (const target of [null, box(0, 0, 320, 240), box(10, 10, 40, 40), box(270, 190, 40, 40)]) {
      const place = placeTourCard(target, CARD, tiny);
      expect(place.left).toBeGreaterThanOrEqual(12);
      expect(place.top).toBeGreaterThanOrEqual(12);
    }
  });
});

describe('the steps of the tour', () => {
  it('are 6, and point at Quick add, Dashboard, Budgets, Reports, Settings and the account', () => {
    expect(TOUR_STEPS.map((step) => step.target)).toEqual(['quick-add', 'nav:/', 'nav:/budgets', 'nav:/reports', 'nav:/settings', 'account']);
  });

  it.each(TOUR_STEPS.map((step) => step.id))('%s has a title and a text in every language', (id) => {
    for (const language of Object.keys(i18n.options.resources)) {
      for (const part of ['title', 'text']) {
        expect(i18n.exists(`tour.steps.${id}.${part}`, { lng: language, fallbackLng: false }), `${language} ${part}`).toBe(true);
      }
    }
  });
});
