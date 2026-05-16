import { describe, expect, test } from 'vitest';

import { parseCliArgs } from '../../src/cli/argv.js';

describe('parseCliArgs', () => {
  test('parses --config path followed by image paths', () => {
    expect(parseCliArgs(['--config', 'C:/cfg.json', 'a.png', 'b.png'])).toEqual({
      configPath: 'C:/cfg.json',
      imagePaths: ['a.png', 'b.png'],
    });
  });

  test('parses --config=path form', () => {
    expect(parseCliArgs(['--config=C:/cfg.json', 'a.png'])).toEqual({
      configPath: 'C:/cfg.json',
      imagePaths: ['a.png'],
    });
  });

  test('treats all args as image paths when no config flag is provided', () => {
    expect(parseCliArgs(['a.png', 'b.png'])).toEqual({
      configPath: undefined,
      imagePaths: ['a.png', 'b.png'],
    });
  });
});
