import { describe, expect, test, vi } from 'vitest';

import { ConfigError, FileError, UploadError } from '../../src/core/errors.js';
import { runCli } from '../../src/cli/index.js';

describe('runCli', () => {
  test('loads config, uploads every image, and prints one url per line', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const loadConfig = vi.fn().mockResolvedValue({
      bucket: 'docs',
      endpoint: 'https://example.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: 'abc',
      secretAccessKey: 'xyz',
      publicBaseUrl: 'https://img.example.com',
      keyPrefix: 'typora/',
      namingTemplate: 'YYYY/MM/DD/{filename}-{hash8}.{ext}',
      cacheControl: 'public, max-age=31536000, immutable',
      timeoutMs: 20000,
      retryTimes: 0,
    });
    const uploadMany = vi.fn().mockResolvedValue([
      { url: 'https://img.example.com/a.png' },
      { url: 'https://img.example.com/b.png' },
    ]);

    const exitCode = await runCli({
      argv: ['--config', 'C:/cfg.json', 'a.png', 'b.png'],
      moduleUrl: 'file:///C:/project/dist/cli/index.js',
      loadConfig,
      createS3Client: () => ({ send: async () => ({}) }),
      uploadMany,
      writeStdout: (line) => stdout.push(line),
      writeStderr: (line) => stderr.push(line),
    });

    expect(exitCode).toBe(0);
    expect(loadConfig).toHaveBeenCalledWith('C:/cfg.json', process.env);
    expect(uploadMany).toHaveBeenCalledTimes(1);
    expect(stdout).toEqual([
      'https://img.example.com/a.png',
      'https://img.example.com/b.png',
    ]);
    expect(stderr).toEqual([]);
  });

  test('returns 1 when no image paths were provided', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli({
      argv: [],
      writeStdout: (line) => stdout.push(line),
      writeStderr: (line) => stderr.push(line),
    });

    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr[0]).toContain('No image paths');
  });

  test('maps known error classes to stable exit codes', async () => {
    const makeInput = (error: Error) => runCli({
      argv: ['a.png'],
      moduleUrl: 'file:///C:/project/dist/cli/index.js',
      loadConfig: vi.fn().mockRejectedValue(error),
      writeStdout: () => undefined,
      writeStderr: () => undefined,
    });

    await expect(makeInput(new ConfigError('bad config'))).resolves.toBe(2);
    await expect(makeInput(new FileError('missing file'))).resolves.toBe(3);
    await expect(makeInput(new UploadError('upload failed'))).resolves.toBe(4);
  });

  test('returns 5 for unexpected failures', async () => {
    const stderr: string[] = [];

    const exitCode = await runCli({
      argv: ['a.png'],
      moduleUrl: 'file:///C:/project/dist/cli/index.js',
      loadConfig: vi.fn().mockRejectedValue(new Error('boom')),
      writeStdout: () => undefined,
      writeStderr: (line) => stderr.push(line),
    });

    expect(exitCode).toBe(5);
    expect(stderr[0]).toContain('boom');
  });
});
