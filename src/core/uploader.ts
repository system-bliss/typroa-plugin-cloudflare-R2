import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

import { PutObjectCommand } from '@aws-sdk/client-s3';

import { FileError, UploadError } from './errors.js';
import { createContentHash } from './hash.js';
import { buildObjectKey } from './keygen.js';
import { getContentType } from './mime.js';
import { buildPublicUrl } from './url.js';
import type { AppConfig, UploadResult } from '../shared/types.js';

export interface UploadSingleImageInput {
  filePath: string;
  config: AppConfig;
  clock?: () => Date;
  s3: {
    send: (command: PutObjectCommand) => Promise<unknown>;
  };
}

export interface UploadManyImagesInput extends Omit<UploadSingleImageInput, 'filePath'> {
  filePaths: string[];
}

async function readImageFile(filePath: string): Promise<Buffer> {
  try {
    return await readFile(filePath);
  } catch (error) {
    throw new FileError(`Image file does not exist or cannot be read: ${filePath}`, { cause: error });
  }
}

function resolveExtension(filePath: string): string {
  return extname(filePath).slice(1).toLowerCase() || 'bin';
}

export async function uploadSingleImage(input: UploadSingleImageInput): Promise<UploadResult> {
  const buffer = await readImageFile(input.filePath);
  const hash = createContentHash(buffer);
  const date = input.clock?.() ?? new Date();
  const objectKey = buildObjectKey({
    keyPrefix: input.config.keyPrefix,
    date,
    originalName: basename(input.filePath),
    hash,
    extension: resolveExtension(input.filePath),
    namingTemplate: input.config.namingTemplate,
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= input.config.retryTimes; attempt += 1) {
    try {
      await input.s3.send(
        new PutObjectCommand({
          Bucket: input.config.bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: getContentType(input.filePath),
          CacheControl: input.config.cacheControl,
        })
      );
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw new UploadError(`Failed to upload image: ${input.filePath}`, { cause: lastError });
  }

  return {
    filePath: input.filePath,
    objectKey,
    url: buildPublicUrl(input.config.publicBaseUrl, objectKey),
  };
}

export interface UploadManyImagesInput extends Omit<UploadSingleImageInput, 'filePath'> {
  filePaths: string[];
  concurrency?: number;
}

async function runConcurrent<T>(
  items: string[],
  concurrency: number,
  fn: (item: string, index: number) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex;
      nextIndex += 1;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function uploadManyImages(input: UploadManyImagesInput): Promise<UploadResult[]> {
  const concurrency = input.concurrency ?? 3;

  return runConcurrent(input.filePaths, concurrency, (filePath) =>
    uploadSingleImage({ ...input, filePath })
  );
}
