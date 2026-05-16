import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { ConfigError } from '../../src/core/errors.js';
import { loadConfigFile, loadConfigFrom } from '../../src/core/config.js';

describe('loadConfigFrom', () => {
  test('resolves env-backed credentials and trims trailing slash from publicBaseUrl', () => {
    const config = loadConfigFrom(
      {
        bucket: 'docs',
        endpoint: 'https://example.r2.cloudflarestorage.com',
        accessKeyId: 'env:R2_ACCESS_KEY_ID',
        secretAccessKey: 'env:R2_SECRET_ACCESS_KEY',
        publicBaseUrl: 'https://img.example.com/',
      },
      {
        R2_ACCESS_KEY_ID: 'abc',
        R2_SECRET_ACCESS_KEY: 'xyz',
      }
    );

    expect(config.accessKeyId).toBe('abc');
    expect(config.secretAccessKey).toBe('xyz');
    expect(config.publicBaseUrl).toBe('https://img.example.com');
    expect(config.region).toBe('auto');
    expect(config.keyPrefix).toBe('typora/');
  });

  test('throws when an env-backed credential is missing', () => {
    expect(() =>
      loadConfigFrom(
        {
          bucket: 'docs',
          endpoint: 'https://example.r2.cloudflarestorage.com',
          accessKeyId: 'env:R2_ACCESS_KEY_ID',
          secretAccessKey: 'env:R2_SECRET_ACCESS_KEY',
          publicBaseUrl: 'https://img.example.com/',
        },
        {
          R2_ACCESS_KEY_ID: 'abc',
        }
      )
    ).toThrow(/R2_SECRET_ACCESS_KEY/);
  });

  test('loads config from a json file path', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'typora-r2-config-'));
    const configPath = path.join(tempDir, 'config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        bucket: 'docs',
        endpoint: 'https://example.r2.cloudflarestorage.com',
        accessKeyId: 'env:R2_ACCESS_KEY_ID',
        secretAccessKey: 'env:R2_SECRET_ACCESS_KEY',
        publicBaseUrl: 'https://img.example.com/',
      })
    );

    const config = await loadConfigFile(configPath, {
      R2_ACCESS_KEY_ID: 'abc',
      R2_SECRET_ACCESS_KEY: 'xyz',
    });

    expect(config.bucket).toBe('docs');
    expect(config.publicBaseUrl).toBe('https://img.example.com');

    await fs.unlink(configPath);
    await fs.rmdir(tempDir);
  });

  test('wraps a missing config file as ConfigError', async () => {
    await expect(loadConfigFile(path.join(os.tmpdir(), 'typora-r2-nope.json'))).rejects.toBeInstanceOf(
      ConfigError
    );
  });
});
