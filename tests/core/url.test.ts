import { describe, expect, test } from 'vitest';

import { buildPublicUrl } from '../../src/core/url.js';

describe('buildPublicUrl', () => {
  test('encodes each key segment and joins it to the public base url', () => {
    expect(buildPublicUrl('https://img.example.com/', 'typora/2026/03/27/a b.png')).toBe(
      'https://img.example.com/typora/2026/03/27/a%20b.png'
    );
  });

  test('ignores duplicated slashes in the object key', () => {
    expect(buildPublicUrl('https://img.example.com/', '/typora//2026/03/27/demo.png')).toBe(
      'https://img.example.com/typora/2026/03/27/demo.png'
    );
  });
});
