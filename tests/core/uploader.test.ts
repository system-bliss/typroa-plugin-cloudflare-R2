import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { FileError, UploadError } from '../../src/core/errors.js';
import { uploadManyImages, uploadSingleImage } from '../../src/core/uploader.js';

describe('uploadSingleImage', () => {
  test('uploads a file and returns the public url plus object key', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'typora-r2-'));
    const tempFile = path.join(tempDir, 'sample.png');
    await fs.writeFile(tempFile, Buffer.from('hello'));

    const sent: Array<Record<string, unknown>> = [];

    const result = await uploadSingleImage({
      filePath: tempFile,
      config: {
        bucket: 'docs',
        endpoint: 'https://example.r2.cloudflarestorage.com',
        region: 'auto',
        accessKeyId: 'abc',
        secretAccessKey: 'xyz',
        publicBaseUrl: 'https://img.example.com',
        keyPrefix: 'typora/',
        namingTemplate: '{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}',
        cacheControl: 'public, max-age=31536000, immutable',
        timeoutMs: 20000,
        retryTimes: 0,
      },
      clock: () => new Date('2026-03-27T08:00:00.000Z'),
      s3: {
        send: async (command: { input: Record<string, unknown> }) => {
          sent.push(command.input);
          return {};
        },
      },
    });

    expect(result.objectKey).toBe('typora/2026/03/27/sample-5d41402a.png');
    expect(result.url).toBe('https://img.example.com/typora/2026/03/27/sample-5d41402a.png');
    expect(sent[0]?.Bucket).toBe('docs');
    expect(sent[0]?.Key).toBe('typora/2026/03/27/sample-5d41402a.png');
    expect(sent[0]?.ContentType).toBe('image/png');
    expect(sent[0]?.CacheControl).toBe('public, max-age=31536000, immutable');

    await fs.unlink(tempFile);
    await fs.rmdir(tempDir);
  });

  test('throws FileError when the image does not exist', async () => {
    await expect(
      uploadSingleImage({
        filePath: path.join(os.tmpdir(), 'typora-r2-missing.png'),
        config: {
          bucket: 'docs',
          endpoint: 'https://example.r2.cloudflarestorage.com',
          region: 'auto',
          accessKeyId: 'abc',
          secretAccessKey: 'xyz',
          publicBaseUrl: 'https://img.example.com',
          keyPrefix: 'typora/',
          namingTemplate: '{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}',
          cacheControl: 'public, max-age=31536000, immutable',
          timeoutMs: 20000,
          retryTimes: 0,
        },
        clock: () => new Date('2026-03-27T08:00:00.000Z'),
        s3: {
          send: async () => {
            throw new Error('should not upload');
          },
        },
      })
    ).rejects.toBeInstanceOf(FileError);
  });

  test('wraps upstream send failures as UploadError', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'typora-r2-fail-'));
    const tempFile = path.join(tempDir, 'fail.png');
    await fs.writeFile(tempFile, Buffer.from('hello'));

    await expect(
      uploadSingleImage({
        filePath: tempFile,
        config: {
          bucket: 'docs',
          endpoint: 'https://example.r2.cloudflarestorage.com',
          region: 'auto',
          accessKeyId: 'abc',
          secretAccessKey: 'xyz',
          publicBaseUrl: 'https://img.example.com',
          keyPrefix: 'typora/',
          namingTemplate: '{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}',
          cacheControl: 'public, max-age=31536000, immutable',
          timeoutMs: 20000,
          retryTimes: 0,
        },
        clock: () => new Date('2026-03-27T08:00:00.000Z'),
        s3: {
          send: async () => {
            throw new Error('boom');
          },
        },
      })
    ).rejects.toBeInstanceOf(UploadError);

    await fs.unlink(tempFile);
    await fs.rmdir(tempDir);
  });

  test('retries failed uploads up to retryTimes before succeeding', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'typora-r2-retry-'));
    const tempFile = path.join(tempDir, 'retry.png');
    await fs.writeFile(tempFile, Buffer.from('hello'));

    let attempts = 0;

    const result = await uploadSingleImage({
      filePath: tempFile,
      config: {
        bucket: 'docs',
        endpoint: 'https://example.r2.cloudflarestorage.com',
        region: 'auto',
        accessKeyId: 'abc',
        secretAccessKey: 'xyz',
        publicBaseUrl: 'https://img.example.com',
        keyPrefix: 'typora/',
        namingTemplate: '{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}',
        cacheControl: 'public, max-age=31536000, immutable',
        timeoutMs: 20000,
        retryTimes: 2,
      },
      clock: () => new Date('2026-03-27T08:00:00.000Z'),
      s3: {
        send: async () => {
          attempts += 1;

          if (attempts < 3) {
            throw new Error('temporary');
          }

          return {};
        },
      },
    });

    expect(attempts).toBe(3);
    expect(result.url).toBe('https://img.example.com/typora/2026/03/27/retry-5d41402a.png');

    await fs.unlink(tempFile);
    await fs.rmdir(tempDir);
  });

  test('uploads multiple files in the same order they were provided', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'typora-r2-many-'));
    const fileA = path.join(tempDir, 'a.png');
    const fileB = path.join(tempDir, 'b.png');
    await fs.writeFile(fileA, Buffer.from('hello'));
    await fs.writeFile(fileB, Buffer.from('world'));

    const results = await uploadManyImages({
      filePaths: [fileA, fileB],
      config: {
        bucket: 'docs',
        endpoint: 'https://example.r2.cloudflarestorage.com',
        region: 'auto',
        accessKeyId: 'abc',
        secretAccessKey: 'xyz',
        publicBaseUrl: 'https://img.example.com',
        keyPrefix: 'typora/',
        namingTemplate: '{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}',
        cacheControl: 'public, max-age=31536000, immutable',
        timeoutMs: 20000,
        retryTimes: 0,
      },
      clock: () => new Date('2026-03-27T08:00:00.000Z'),
      s3: {
        send: async () => ({}),
      },
    });

    expect(results.map((result) => result.objectKey)).toEqual([
      'typora/2026/03/27/a-5d41402a.png',
      'typora/2026/03/27/b-7d793037.png',
    ]);

    await fs.unlink(fileA);
    await fs.unlink(fileB);
    await fs.rmdir(tempDir);
  });
});
