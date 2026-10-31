import { describe, expect, it } from 'vitest';
import {
  centeredOffset,
  clampOffset,
  cropRect,
  dataUrlBytes,
  isAcceptedImage,
  photoScale,
  zoomAround,
} from './avatarImage.js';

// A 400 x 200 photo in a 240 px box: the short side (200) must cover the box, so the base scale is 1.2

const box = { width: 400, height: 200, viewSize: 240 };

describe('isAcceptedImage', () => {
  it('accepts JPEG, PNG and WebP only', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(isAcceptedImage({ type })).toBe(true);
    for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', '']) expect(isAcceptedImage({ type })).toBe(false);
    expect(isAcceptedImage(null)).toBe(false);
  });
});

describe('dataUrlBytes', () => {
  it('counts the bytes of the file, not the length of the text', () => {
    // "abc" -> YWJj (3 bytes), "ab" -> YWI= (2 bytes), "a" -> YQ== (1 byte)
    expect(dataUrlBytes('data:image/webp;base64,YWJj')).toBe(3);
    expect(dataUrlBytes('data:image/webp;base64,YWI=')).toBe(2);
    expect(dataUrlBytes('data:image/webp;base64,YQ==')).toBe(1);
    expect(dataUrlBytes('nonsense')).toBe(0);
  });
});

describe('photoScale', () => {
  it('is the size at which the photo just covers the box, times the zoom', () => {
    expect(photoScale({ ...box, zoom: 1 })).toBeCloseTo(1.2);
    expect(photoScale({ ...box, zoom: 2 })).toBeCloseTo(2.4);
    // A tall photo: the width decides
    expect(photoScale({ width: 100, height: 300, viewSize: 240, zoom: 1 })).toBeCloseTo(2.4);
  });
});

describe('centeredOffset and clampOffset', () => {
  it('centers the photo, so the extra width is shared on both sides', () => {
    const { x, y } = centeredOffset({ ...box, zoom: 1 });
    expect(x).toBeCloseTo(-120); // drawn 480 wide in a 240 box
    expect(y).toBeCloseTo(0);
  });

  it('never lets an edge of the photo move inside the box', () => {
    const tooFarRight = clampOffset({ ...box, zoom: 1, x: 50, y: 30 });
    expect(tooFarRight).toEqual({ x: 0, y: 0 });

    const tooFarLeft = clampOffset({ ...box, zoom: 1, x: -999, y: -999 });
    expect(tooFarLeft.x).toBeCloseTo(240 - 480);
    expect(tooFarLeft.y).toBeCloseTo(0); // 200 * 1.2 = 240: no room to move up or down
  });
});

describe('zoomAround', () => {
  it('keeps the middle of the box on the same point of the photo', () => {
    const start = centeredOffset({ ...box, zoom: 1 });
    const before = cropRect({ ...box, zoom: 1, ...start });
    const next = zoomAround({ ...box, zoom: 1, nextZoom: 2, ...start });
    const after = cropRect({ ...box, zoom: 2, ...next });

    const middle = (rect) => [rect.sx + rect.size / 2, rect.sy + rect.size / 2];
    expect(middle(after)[0]).toBeCloseTo(middle(before)[0]);
    expect(middle(after)[1]).toBeCloseTo(middle(before)[1]);
    // And the square that is cut out gets smaller
    expect(after.size).toBeCloseTo(before.size / 2);
  });
});

describe('cropRect', () => {
  it('is the whole short side of the photo at zoom 1', () => {
    const rect = cropRect({ ...box, zoom: 1, ...centeredOffset({ ...box, zoom: 1 }) });
    expect(rect.size).toBeCloseTo(200);
    expect(rect.sx).toBeCloseTo(100); // the middle 200 px of the 400 px width
    expect(rect.sy).toBeCloseTo(0);
  });

  it('follows the photo when it is moved', () => {
    const rect = cropRect({ ...box, zoom: 1, x: 0, y: 0 });
    expect(rect.sx).toBeCloseTo(0);
  });
});
