import { describe, expect, test } from 'vitest';

import { buildObjectKey, renderTemplate, sanitizeFilename } from '../../src/core/keygen.js';

describe('sanitizeFilename', () => {
  test('normalizes spaces and strips unsafe punctuation', () => {
    expect(sanitizeFilename('my report (final)!')).toBe('my-report-final');
  });

  test('drops file extensions before normalizing', () => {
    expect(sanitizeFilename('Screen Shot.PNG')).toBe('screen-shot');
  });
});

describe('buildObjectKey', () => {
  test('uses naming template with prefix, date, filename, and content hash', () => {
    const key = buildObjectKey({
      keyPrefix: 'typora',
      date: new Date('2026-03-27T08:00:00.000Z'),
      originalName: 'Screen Shot.PNG',
      hash: '4fa91c2d',
      extension: 'png',
      namingTemplate: '{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}',
    });

    expect(key).toBe('typora/2026/03/27/screen-shot-4fa91c2d.png');
  });
});

describe('renderTemplate', () => {
  test('replaces known variables in the template', () => {
    const result = renderTemplate('{YYYY}/{MM}/{DD}/{filename}-{hash}.{ext}', {
      YYYY: '2026', MM: '03', DD: '27',
      filename: 'photo', hash: 'abc123', ext: 'jpg',
    });
    expect(result).toBe('2026/03/27/photo-abc123.jpg');
  });

  test('leaves unknown variables unchanged', () => {
    const result = renderTemplate('{year}/{filename}', { filename: 'img' });
    expect(result).toBe('{year}/img');
  });

  test('works with custom naming patterns', () => {
    const result = renderTemplate('{hash8}_{filename}.{ext}', {
      YYYY: '2026', MM: '03', DD: '27',
      filename: 'photo', hash: 'abc123', hash8: 'abc123', ext: 'jpg',
    });
    expect(result).toBe('abc123_photo.jpg');
  });
});
