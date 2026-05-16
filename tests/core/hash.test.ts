import { describe, expect, test } from 'vitest';

import { createContentHash } from '../../src/core/hash.js';

describe('createContentHash', () => {
  test('returns an 8-character md5 prefix for the file content', () => {
    expect(createContentHash(Buffer.from('hello'))).toBe('5d41402a');
  });
});
