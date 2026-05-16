import { describe, expect, test } from 'vitest';

import { getContentType } from '../../src/core/mime.js';

describe('getContentType', () => {
  test('maps common image extensions to content types', () => {
    expect(getContentType('demo.PNG')).toBe('image/png');
    expect(getContentType('demo.jpeg')).toBe('image/jpeg');
    expect(getContentType('demo.svg')).toBe('image/svg+xml');
  });

  test('falls back to application/octet-stream when the extension is unknown', () => {
    expect(getContentType('demo.unknown')).toBe('application/octet-stream');
  });
});
